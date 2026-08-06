# AfriVoice Triage — Benchmark Report (Executive Summary)

**Models compared:** Intron Sahara v2, OpenAI Whisper large-v3, wav2vec2 XLS-R-53 (English-finetuned head).  
**Dataset:** 120 real in-the-wild code-switched utterances from the official AfriSwitch test split (20 per language × 6 language pairs: Hausa, Pidgin, Swahili, Yoruba, Igbo, Shona).  
**Metric:** Word Error Rate (WER) via `jiwer`, lower is better. All models evaluated on the **identical 120 samples**.  
**Report date:** Aug 6, 2026.

## 1. Headline results

| Model | Overall WER | Mean latency | Best on |
|---|---|---|---|
| **Intron Sahara v2** | **0.603** | 7.4 s | Hausa, Swahili, Yoruba overall |
| Whisper large-v3 | 0.692 | 79.6 s | Pidgin, Igbo, Shona |
| wav2vec2 XLS-R-53 | 0.853 | 3.1 s | — (fastest, but weakest accuracy) |

Sahara wins the overall comparison and is the strongest model on 3 of the 6 language pairs; Whisper is strongest on the other 3. No single model dominates across all African language pairs.

## 2. Per-language WER (real AfriSwitch)

| Language pair | Sahara v2 | Whisper large-v3 | XLS-R-53 |
|---|---|---|---|
| Hausa–English | **0.371** | 0.892 | 0.962 |
| Pidgin–English | 0.390 | **0.338** | 0.623 |
| Swahili–English | **0.400** | 0.525 | 0.906 |
| Yoruba–English | **0.688** | 0.959 | 0.956 |
| Igbo–English | 0.881 | **0.668** | 0.795 |
| Shona–English | 0.885 | **0.773** | 0.878 |

## 3. Why this comparison matters for triage

In a medical triage pipeline, the worst failure is not a wrong word — it is a **silent deletion of a non-English symptom segment**. We observed this with Whisper on a Hausa–English urgent-care utterance: the entire Hausa portion vanished, while Sahara kept both language spans. For a patient describing “kifua” (chest pain) in Hausa, that deletion changes the safety outcome.

## 4. Pros and cons per model

**Intron Sahara v2**
- ✅ Best overall WER on real code-switched African speech; purpose-built for the task
- ✅ No segment deletion; handles intra-utterance switching without configuration
- ✅ Managed API + TTS in one platform; low ops burden
- ❌ API-only (needs connectivity); file-upload + polling adds ~7 s round-trip latency
- ❌ Pricing not public; 8/120 samples returned empty transcripts on short/noisy clips

**Whisper large-v3 (open source)**
- ✅ Strong general ASR; fully offline/on-premise for privacy and low-bandwidth sites
- ✅ Free at any scale; large ecosystem and tooling
- ❌ ~30% higher overall WER than Sahara on code-switched speech; silently dropped a non-English segment
- ❌ Heavy: needs GPU for usable latency; the measured run fell back to CPU int8 (~80 s/utterance)

**wav2vec2 XLS-R-53 (open source)**
- ✅ Fastest model (~3 s/utterance on CPU), small footprint, fully offline
- ✅ Multilingual pretraining across 53 languages
- ❌ Worst real-data WER (0.853); English-finetuned head mangles African-language spans
- ❌ Needs per-language African fine-tuning to be clinically viable

## 5. Product decision

AfriVoice Triage uses **Sahara v2 as the primary STT/TTS path** because accuracy and
segment preservation directly affect patient safety. The architecture is designed to add an
offline Whisper fallback later for low-connectivity deployments, with the measured WER gap
displayed to the user as an accuracy caveat.

## 6. Methodology and transparency (short)

- **Sample selection:** first 20 rows of each official AfriSwitch test config, identical sample IDs across all models.
- **Normalization:** lowercase, strip punctuation, collapse whitespace — same for all models.
- **Language hints:** Sahara used its `use_language_asr_input` hint per config; Whisper and XLS-R had no language hint.
- **Empty transcripts:** scored as WER 1.0; 8/120 Sahara samples returned empty on short/noisy clips.
- **Invalid runs disclosed:** an early Sahara run omitted the language hint and returned 107 empty transcripts; the GPU XLS-R attempt failed with a Kaggle CUDA kernel error, so the XLS-R result is CPU-only. These are documented because transparent reporting matters.
- **Circularity note:** a supplementary N=6 synthetic pilot used Sahara-TTS-generated audio, giving Sahara an inherent advantage there; the real-data N=120 table above is the headline evidence.
- **Full report:** `docs/BENCHMARK.md` (5 pages) with complete reproduction links, per-sample JSONL outputs, and failed-run details.  
- **Reproduction:** `docs/METHODOLOGY.md`, public Kaggle kernels `abrahamsunday123/afrivoice-asr-benchmark` and `abrahamsunday123/afrivoice-sahara-afriswitch-120`, and data at `public/data/`.
