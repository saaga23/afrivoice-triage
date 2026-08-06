# Benchmark Methodology — AfriVoice Triage

How the 3-model code-switching benchmark in `docs/BENCHMARK.md` was produced, end to end,
with everything needed to reproduce it. Results are quoted in `BENCHMARK.md`; this file
documents *how* they were measured.

## 1. Task and metric

- **Task:** automatic speech recognition (ASR) on code-switched African speech.
- **Metric:** Word Error Rate (WER) via [`jiwer`](https://github.com/jongsma/jiwer), computed
  per sample and averaged (macro over samples).
- **Normalization (identical for all models):** lowercase → strip punctuation → collapse
  whitespace (the `norm()` helper in each kernel script).
- **Empty-hypothesis policy:** a model that returns an empty transcript for a sample is
  scored **WER 1.0** for that sample (8/120 for Sahara — disclosed in the report).
- **Latency:** wall-clock seconds per utterance. For Sahara this is the full API round trip
  (file upload + status polling until `FILE_TRANSCRIBED`); for the open-source models it is
  local inference time only. These are not like-for-like and are labeled as such.

## 2. Dataset

- **Source:** [`intronhealth/AfriSwitch`](https://huggingface.co/collections/intronhealth/code-switching)
  on Hugging Face — in-the-wild conversational speech from public YouTube videos and
  podcasts, license **CC BY-NC-SA 4.0**, 54.41 hours / 16,602 utterances / 14 language pairs.
- **Split:** official **test** split of each config used:
  Swahili (650), Yoruba (1,877), Hausa (1,515), Igbo (1,848), Pidgin (1,801), Shona (1,155).
- **Sample selection:** the **first 20 rows of each config's test split**
  (`dataset.select(range(20))` in `scripts/download-afriswitch.py`), giving **N=120**
  (6 languages × 20). The **identical sample IDs** (`{config}-{i}`) were evaluated for all
  three models — this is a paired comparison, not three independent samples.
- **Local copies:** the exact subsets used ship in this repo under `public/data/afriswitch/`
  (HF `datasets` arrow format) so runs are byte-reproducible without re-downloading.

## 3. Models and configurations

| Model | Version / checkpoint | Settings | Language hint |
|---|---|---|---|
| Intron Sahara v2 | API, `https://infer.voice.intron.io` (file upload + poll) | default API settings | **yes** — per-language `use_language_asr_input` (sw/yo/ha/ig/pcm/sn) |
| Whisper large-v3 | `faster-whisper` large-v3 | `beam_size=5`; GPU fp16 requested, automatic CPU int8 fallback (`scripts/opensource-afriswitch-kaggle.py:68-78`) | no |
| wav2vec2 XLS-R-53 | `jonatasgrosman/wav2vec2-large-xlsr-53-english` (HF) | transformers, CPU fp32 | n/a (English-finetuned head) |

The language-hint asymmetry is deliberate and disclosed: the hint mirrors how each system
would actually be deployed (Sahara exposes the hint as a product feature; Whisper was left
to auto-detect). A judge-simulation reviewer pressed on this — the answer and the
home-field-advantage discussion (Sahara evaluated on Intron's own dataset) are in
`submission/JUDGE_QA.md` §Benchmark.

## 4. Runs (all on Kaggle notebooks, Aug 5–6 2026)

| Run | Script (this repo) | Output (this repo) | Result |
|---|---|---|---|
| Sahara N=120 | `scripts/sahara-afriswitch-kaggle.py` | `public/data/benchmark-afriswitch-sahara.jsonl` | WER **0.603**, 7.4 s/utt |
| Whisper N=120 | `scripts/opensource-afriswitch-kaggle.py` | `public/data/benchmark-afriswitch-opensource.jsonl` | WER **0.692**, 79.6 s/utt |
| XLS-R N=120 | `scripts/xlsr-afriswitch-cpu.py` | `public/data/benchmark-afriswitch-xlsr-cpu.jsonl` | WER **0.853**, 3.1 s/utt |
| Synthetic pilot N=6 | `scripts/kaggle-benchmark.py` | `public/data/benchmark-results.json` | 0.347 / 0.450 / 0.604 |

Kaggle kernels: `abrahamsunday123/afrivoice-asr-benchmark`,
`abrahamsunday123/afrivoice-sahara-afriswitch-120`.

### Failed/invalid runs (documented for transparency)

- **Aug 5, invalid Sahara run:** omitted the language hint → Sahara's default English ASR
  returned empty transcripts for 107/119 non-English-dominant samples. Discarded.
- **Aug 6, Intron outage:** a rerun collided with a multi-hour Intron-side STT/TTS outage
  (empty transcripts even on previously-working files, verified by direct probe). Retried
  after recovery.
- **wav2vec2 GPU attempt:** failed with a Kaggle CUDA kernel-image error → CPU-only run.

## 5. Synthetic pilot (N=6) and its circularity

Six health-domain code-switched samples were synthesized with **Sahara TTS itself**
(`public/data/synthetic-samples/`, per-sample metadata JSON: language pair, domain, accent,
device, noise). Because the references are Sahara's own voice, Sahara ASR has an inherent
advantage on this set — **disclosed in the report** — which is why the N=120 real-data run
is the headline evidence and the pilot is labeled "synthetic" wherever its numbers appear.
(Note: synthetic files are numbered 01, 03–07; sample-02 was dropped during recording QA.)

## 6. Reproduction steps

1. `python scripts/download-afriswitch.py` — fetches the 6 test-split subsets into
   `public/data/afriswitch/` (or use the copies already committed there).
2. Run each N=120 script (they pull the arrow data from this repo's raw GitHub URLs, so they
   work standalone on Kaggle or locally):
   - Sahara: set `SAHARA_API_KEY` env var, then `python scripts/sahara-afriswitch-kaggle.py`
   - Whisper: `python scripts/opensource-afriswitch-kaggle.py`
   - XLS-R: `python scripts/xlsr-afriswitch-cpu.py`
3. Compare outputs against the committed JSONLs — recomputing the means from those files
   yields exactly 0.6025 / 0.6924 / 0.8534 (rounded to 0.603 / 0.692 / 0.853 in the report).
4. Live spot-check: the `/bench` page on the deployed app transcribes any uploaded clip with
   Sahara (plus OpenAI models when a key is configured) and computes WER with the same
   normalization against a pasted reference.

## 7. Known limitations

- **N=120, first-20 selection:** subsets are a deterministic prefix of each test config, not
  a random sample — chosen for reproducibility; per-language cells are n=20, so treat
  per-language gaps as directional.
- **No significance testing in the report:** means only. A paired bootstrap on the published
  JSONLs gives a 95% CI for the Sahara−Whisper gap of roughly [−0.16, −0.02] — the overall
  difference is significant; per-language differences (n=20) are not all so.
- **Home-field caveat:** AfriSwitch is published by Intron Health; Sahara is Intron's model.
  Mitigations: official test split used, and Sahara's advantage is not uniform (Whisper wins
  Igbo, Shona, and Pidgin) — inconsistent with trivial memorization.
- **Latency asymmetry:** Sahara latency includes network round trip; open-source latencies
  are local inference (Whisper's 79.6 s reflects the CPU int8 fallback, not GPU).
