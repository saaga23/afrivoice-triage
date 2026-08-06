# AfriVoice Triage — Submission Form Answers (Draft)

MLC (Africa) × Intron Agentic Voice AI Challenge 2026 — Health category
Rubric alignment: impact 20% · benchmark quality 30% · product/agentic fit 25% · technical execution 15% · ethics 10%

---

## 1. About your solution

AfriVoice Triage is an agentic voice pipeline for African healthcare triage — not a transcription demo. A patient speaks in any mix of English, Swahili, Yoruba, Hausa, Igbo, Pidgin, Shona, or Kinyarwanda; Intron Sahara v2 transcribes the code-switched speech, a LangGraph agent classifies intent and urgency, and the system replies with voice plus a structured triage handoff card (low / moderate / high / emergency). A multilingual emergency keyword safety net across all eight languages escalates danger symptoms even when the LLM misses them. The project ships with a measured benchmark, not a claim: Sahara v2 scored 0.347 WER on synthetic code-switched health audio vs 0.450 for Whisper large-v3 and 0.604 for XLS-R-53, plus an N=120 validation run on real AfriSwitch test-split speech (0.603 overall, full per-language breakdown published).

## 2. The problem it addresses

A billion-plus Africans access healthcare through speech, often in low-literacy, low-bandwidth settings, and they rarely speak one language at a time — a patient says "Ina dauwa da zazzaɓar jiki… my temperature is very high." General-purpose ASR breaks exactly there: in our benchmark, Whisper large-v3 silently deleted the entire Hausa segment of an urgent-care utterance — the symptom simply never reached the agent. In triage, a silent deletion is worse than a wrong word. English-only voice interfaces exclude precisely the patients who need voice-first access most. The problem AfriVoice addresses is the gap between how African patients actually speak (code-switched, accented, noisy) and what health technology can reliably understand — and it measures that gap per language instead of hiding it behind a single accuracy number.

## 3. Target users

Primary users are patients in English-plus-local-language communities across West, East, and Southern Africa — especially low-literacy users for whom a voice interface is the only usable interface, and anyone whose symptom description naturally mixes languages. The eight supported languages (English, Swahili, Yoruba, Hausa, Igbo, Pidgin, Shona, Kinyarwanda) cover hundreds of millions of speakers. Secondary users are clinics and telehealth providers receiving the structured triage handoff card — urgency level plus a compact symptom summary — which cuts intake time and standardizes escalation. The system is honest about who it serves well today: our N=120 real-speech benchmark shows Sahara is strong on Hausa (0.371), Pidgin (0.390), and Swahili (0.400) code-switching, but weak on Igbo (0.881) and Shona (0.885), which flags where deployment needs a fallback or fine-tune first.

## 4. How it solves the problem

The pipeline is: voice in → Sahara v2 STT with a per-language ASR hint (en/sw/yo/ha/ig/pcm/sn/rw, selected in the UI) → LangGraph agent for intent + urgency classification → structured handoff card + Sahara TTS voice reply. Three design decisions come straight from measurement. First, Sahara v2 as primary STT because it beat Whisper large-v3 by ~23% WER on code-switched audio and never deleted a language segment. Second, a deterministic multilingual emergency keyword net — because an LLM classifier alone can miss "chest pain" said in Yoruba. Third, explicit consent, no storage, and "not a diagnosis — see a professional" framing in every response. On the benchmark side, we didn't stop at synthetic audio: we ran 120 real AfriSwitch test-split utterances and published the uncomfortable per-language numbers, including Sahara's 0.88 WER on Igbo/Shona.

## 5. Code-switching support

Code-switching is the core case, not an edge case. The agent accepts intra-utterance language mixing across eight languages and responds in the language mix the patient uses. The multilingual emergency safety net detects symptom and danger keywords across en/sw/ha/yo/ig/pcm/sn/rw with ASCII-folded matching, so escalation never depends on the patient speaking English. Benchmark evidence is code-switch-specific: on synthetic code-switched health utterances Sahara v2 scored 0.347 WER vs 0.450 (Whisper large-v3) and 0.604 (XLS-R-53), and all three models transcribed English spans well but separated sharply on African-language spans — exactly the failure mode this challenge targets. On 120 real AfriSwitch utterances, Sahara held 0.37–0.40 WER on Hausa/Pidgin/Swahili code-switching on unscripted podcast/YouTube speech. A voice language selector feeds Sahara's per-language ASR codes end-to-end.

## 6. Sahara API usage

Sahara v2 is the primary STT and TTS path — not a checkbox integration. For STT we call the Intron Voice API (file upload + polling) with the correct `use_language_asr_input` code per language; this came from a real bug — our first N=120 benchmark run omitted the hint and Sahara's default-English ASR returned empty transcripts for 107/119 non-English-dominant samples, which prompted the language selector now shipped in the product. TTS generates the spoken reply and our demo narration; when Intron's TTS queue stalled during development, we added AbortSignal timeouts and a 12-second cap with text-only fallback so a provider outage never hangs the chat. All Sahara calls are server-side; the benchmark endpoint is sanitized (no key or upstream-error leakage). Mean API latency measured at 7.4 s/utterance on the N=120 run.

## 7. Agentic behavior

This is an agent, not an ASR wrapper. After transcription, a LangGraph agent classifies the patient's intent (symptom report, appointment, medication question, emergency), assigns an urgency tier (low / moderate / high / emergency), and produces a structured triage handoff card with a summary and recommended next step — self-care, telehealth, in-person visit, or seek immediate care. Intent and urgency render as visible badges in the UI, and tool calls are deduplicated and labeled so judges can see the agent's reasoning steps, not just final text. The safety-critical escalation path is hybrid: the LLM classifies, but a deterministic multilingual emergency keyword net acts as an independent floor — "severe chest pain, cannot breathe" triggers the red emergency badge regardless of classifier confidence, in any of the eight languages. Every response is non-diagnostic and routes to a qualified professional.

## 8. Technical overview + ethics/inclusion

Stack: Next.js 14 + TypeScript frontend, API-route backend, LangChain/LangGraph agent, Intron Sahara v2 for STT/TTS, live deployed with a public `/bench` runner. Robustness is engineered from incidents: per-language ASR hints after the empty-transcript bug, fetch timeouts and TTS fallback after the provider stall, sanitized error surfaces. Benchmark methodology is reproducible: jiwer WER after normalization, Kaggle GPU kernel, all samples + metadata + per-sample JSONL in the repo. Ethics: explicit consent modal before any recording (text interface works if declined), zero persistent storage — audio and transcripts live in memory only and are discarded, TLS to processors, no diagnoses, multilingual emergency escalation, per-language bias reporting that publicly exposes where the ASR is weak (Igbo/Shona 0.88 WER) rather than averaging it away. AfriSwitch used under CC BY-NC-SA 4.0; synthetic samples generated with Sahara TTS and labeled as such.

---

## Solution description (problem · users · solution · key technical decisions)

**Problem.** African patients speak code-switched, accented, often noisy speech; general ASR fails hardest exactly there. Measured proof: Whisper large-v3 silently deleted an entire Hausa symptom segment in an urgent-care utterance — a patient-safety hazard in any triage product. English-first voice tools exclude the low-literacy patients who most need voice-first care.

**Target users.** Patients across eight languages (English, Swahili, Yoruba, Hausa, Igbo, Pidgin, Shona, Kinyarwanda), prioritizing low-literacy and low-bandwidth users; and clinics/telehealth providers who receive the structured triage handoff card for faster, standardized intake.

**Solution.** An agentic voice triage pipeline: Sahara v2 transcribes code-switched speech, a LangGraph agent classifies intent + urgency and emits a handoff card, Sahara TTS speaks the reply, and a deterministic multilingual emergency net guarantees escalation. Measured benchmark: 0.347 WER (Sahara) vs 0.450 (Whisper large-v3) vs 0.604 (XLS-R-53) on synthetic code-switched health audio; N=120 real AfriSwitch validation at 0.603 overall with per-language results from Hausa 0.371 to Shona 0.885 — published in full, disparities included.

**Key technical decisions.**
- Sahara v2 as primary STT/TTS — best code-switched WER by ~23%, no segment deletion; architecture permits an offline Whisper fallback with a visible accuracy caveat.
- Per-language ASR hints (`use_language_asr_input`) driven by a UI language selector — fixed a bug where 107/119 non-English samples transcribed empty.
- Hybrid escalation: LLM urgency classification + deterministic multilingual keyword floor, so emergencies never depend on English or on classifier confidence.
- Defense in depth for provider failures: AbortSignal timeouts, 12 s TTS cap with text-only fallback, sanitized benchmark API (no key/upstream leakage).
- Honest benchmarking as a feature: synthetic-set circularity disclosed (Sahara TTS-generated references favor Sahara ASR), real-data run treated as the more trustworthy evidence, invalid first run documented rather than buried.

(~230 words — trim to form limit if needed)
