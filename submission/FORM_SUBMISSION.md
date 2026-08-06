# Form Submission Copy — AfriVoice Triage

Use this file to copy-paste answers into the Intron submission form.
All fields are written in a direct, human tone from the project’s actual numbers and code.
Last updated: just before submission.

---

**Website:** https://app-phi-one-ah0g1z34ov.vercel.app

**Solution Title:** AfriVoice Triage

---

## 1. Problem your app addresses (~50 words)

Across Africa, most patients describe symptoms in a mix of English and a local language, but telehealth tools and hospital triage systems are built for single-language English input. That mismatch means nurses, community health workers, and hotlines miss the first sign of danger, and low-literacy patients are locked out of digital care.

## 2. Target user(s) and potential impact (~50 words)

Primary users: community health workers and low-literacy patients in African clinics and hotlines. The need is immediate — Africa has 1.3 billion people, hundreds of millions code-switch daily, and health systems are short-staffed. A voice-first triage layer that understands Swahili, Yoruba, Hausa, Igbo, Pidgin, Shona, and Kinyarwanda can extend basic triage to any basic smartphone.

## 3. How your app solves the user problem (~50 words)

A patient speaks naturally in any language mix. Sahara transcribes the code-switched speech, a LangGraph agent classifies intent and urgency, and the app replies with a voice message plus a structured triage handoff card. It turns a raw voice utterance into a clear next step: emergency care, clinic visit, or self-care monitoring.

## 4. Does your solution support code-switching?

**Yes.** The app is designed for intra-utterance code-switching. The UI accepts voice in English, Swahili, Yoruba, Hausa, Igbo, Pidgin, Shona, and Kinyarwanda, and the benchmark explicitly tests six code-switched language pairs (Hausa–English, Yoruba–English, Igbo–English, Swahili–English, Pidgin–English, Shona–English).

## 5. Does your solution use the Sahara APIs?

**Yes.** Sahara v2 is the production STT and TTS engine. It transcribes the patient’s voice, powers the voice reply, and is the primary model in the 3-model benchmark (Sahara 0.603 vs Whisper 0.692 vs wav2vec2 XLS-R 0.853 WER on 120 real AfriSwitch utterances).

## 6. How is the solution agentic? What downstream task does the code-switched transcript enable? (~50 words)

This is not a transcription demo. The transcript is the input to a triage agent that classifies intent, escalates urgency across an 8-language emergency safety net, and produces a structured triage handoff card (symptoms, urgency, recommended action, not-a-diagnosis disclaimer) for a health worker to act on.

## 7. High-level technical overview: key design decisions and tradeoffs (~250 words)

**Architecture:** Next.js 14 + TypeScript on Vercel. API layer (`/api/chat`) receives audio or text, calls Sahara STT if needed, runs a LangGraph state machine (`classify_intent → route_to_tool → generate_response`), then synthesizes the reply via Sahara TTS. The entire graph is stateless: conversation history is sent by the client each turn, so no patient data persists on the server.

**Decision 1 — Sahara as the primary STT/TTS path.** We benchmarked Whisper large-v3 and wav2vec2 XLS-R-53 on 120 real AfriSwitch code-switched samples (identical samples for all three models). Sahara won overall WER (0.603 vs 0.692 vs 0.853), and it never silently deleted a non-English segment — a failure Whisper showed on a Hausa–English urgent utterance. Tradeoff: Sahara is API-only, so the app needs connectivity; we accept that for accuracy and safety.

**Decision 2 — Rule-based safety layer with optional LLM.** The deployed app has no OpenAI key, so the agent falls back to a deterministic rule-based intent/urgency classifier across 8 languages and an emergency keyword net. This keeps the emergency safety net working even if the LLM path is unavailable or slow, which is critical for a triage use case. Tradeoff: responses are less conversational than a full LLM, but the medical logic is transparent and auditable.

**Decision 3 — Stateless, transient audio handling.** Audio is uploaded, transcribed, and discarded; no patient audio or transcript is stored server-side. This protects privacy and keeps the app lightweight. Tradeoff: we lose the ability to audit sessions after the fact, but for a sensitive health tool that is the right default.

**Decision 4 — Mobile-first, responsive UI.** The chat card is viewport-aware (68dvh on mobile) so the mic and text input stay on screen after the agent replies, and the conversation can continue without scrolling. This matters because the primary user is on a basic smartphone.

## 8. Ethics / Inclusion / Privacy / Safety (~100 words)

Explicit voice consent before recording. Audio is transient: uploaded, transcribed, and discarded with no server-side storage. A clear “Not a diagnosis — consult a healthcare professional” disclaimer runs on every response. The emergency safety net covers English, Swahili, Yoruba, Hausa, Igbo, Pidgin, Shona, and Kinyarwanda. Benchmarking uses the public, licensed AfriSwitch dataset (CC BY-NC-SA 4.0) and synthetic samples generated with Sahara TTS; we disclose that the synthetic set has an inherent circular advantage, which is why the real AfriSwitch N=120 results are the headline evidence.

---

## Demo

**Demo Video URL:** PASTE_YOUTUBE_LINK_HERE

(86s, unlisted. Shows the live production app: consent → real code-switched Swahili–English voice input via Sahara STT → clarifying question → follow-up escalation to high urgency with an accumulated triage handoff card → emergency safety net → N=120 benchmark results.)

## Benchmark Report

**Benchmark Report Link (submit this one — 2 pages, within the 3-page limit):** https://app-phi-one-ah0g1z34ov.vercel.app/docs/BENCHMARK_EXECUTIVE.pdf

(The full 5-page report with every detail, per-sample JSONL links, and failed-run transparency is also live at `docs/BENCHMARK.pdf` / `docs/BENCHMARK.md`.)

## Benchmark Audios (optional)

**Benchmark Audios Link:** https://github.com/saaga23/afrivoice-triage/tree/master/public/data/synthetic-samples

(6 synthetic code-switched health samples with sidecar JSON metadata: language pair, domain, accent, gender, device, noise conditions, and code-mixing index. The real benchmark used the public `intronhealth/AfriSwitch` test split, linked in the report.)

---

**Quick check before you hit Submit:**
- [ ] YouTube link is unlisted or public, not private
- [ ] Benchmark PDF link opens in an incognito tab
- [ ] Kaggle kernels are public (https://www.kaggle.com/code/abrahamsunday123/afrivoice-asr-benchmark and /afrivoice-sahara-afriswitch-120)
