# AfriVoice Triage — Agentic Voice AI for African Healthcare

**An agentic voice pipeline, not a transcription demo:** patients speak in any mix of English, Swahili, Yoruba, Hausa, Igbo, Pidgin, Shona, or Kinyarwanda — Sahara transcribes the code-switched speech, a LangGraph agent classifies intent and urgency (with a multilingual emergency safety net), and responds with voice plus a structured triage handoff card.

**Submission for:** MLC (Africa) × Intron Agentic Voice AI Challenge 2026

🎬 [Demo video](#-demo-video) · 🌐 [Live app](https://app-phi-one-ah0g1z34ov.vercel.app) · 📊 [Benchmark report](docs/BENCHMARK.md) · 🧪 [Live benchmark runner](https://app-phi-one-ah0g1z34ov.vercel.app/bench)

### Headline benchmark result (WER, lower is better — code-switched health audio)

| Model | WER |
|---|---|
| **Intron Sahara v2** | **0.347** |
| Whisper large-v3 | 0.450 |
| wav2vec2 XLS-R-53 | 0.604 |

> On Hausa–English speech, Whisper large-v3 **silently deleted the entire Hausa segment** of an urgent-care utterance — in triage, a silent deletion is worse than a wrong word. Sahara kept both language spans. Full methodology: [docs/BENCHMARK.md](docs/BENCHMARK.md).

## 🚀 Quick Start

1. Clone the repo
2. Install dependencies: `npm install`
3. Set up environment variables: Copy `.env.local.example` to `.env.local` and add your Sahara API keys
4. Run development server: `npm run dev`
5. Open http://localhost:3000

## 🎬 Demo Video

- **`public/demo-video/afrivoice-live-demo-narrated.mp4`** (60s, narrated) — a **real screen recording of the live production app**, not a mock: consent modal → a code-switched Swahili–English symptom report is triaged with intent + urgency badges and a structured **triage handoff card** → an emergency message ("severe chest pain… cannot breathe") triggers the red **emergency urgency** badge with seek-immediate-care guidance and a handoff card → the benchmark methodology page. Narration: Sahara TTS voiceover.
- `public/demo-video/afrivoice-live-demo.mp4` — same recording without narration.
- YouTube: **(link to be added — upload `afrivoice-live-demo-narrated.mp4` as unlisted and paste the URL here)**
- Older narrated slideshow: `public/demo-video/afrivoice-demo.mp4` (superseded by the live recording).

## 🏗️ Stack

- **Frontend:** Next.js 14, TypeScript, Tailwind CSS v4, shadcn/ui
- **Backend:** Next.js API Routes
- **AI:** LangChain + LangGraph for agentic reasoning, Intron Sahara v2 for STT/TTS, OpenAI (Whisper, GPT-4o Transcribe, LLM fallback)

## 📁 Structure

```
app/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── chat/
│   │   │   │   └── route.ts       # Chat endpoint (STT → agent → TTS)
│   │   │   └── bench/
│   │   │       └── route.ts       # 3-model benchmark endpoint
│   │   ├── bench/
│   │   │   └── page.tsx           # Benchmark page
│   │   ├── globals.css
│   │   ├── layout.tsx
│   │   └── page.tsx               # Main triage page
│   ├── components/
│   │   └── voice-ui.tsx           # Voice recording + chat UI
│   └── lib/
│       ├── agent.ts               # LangGraph agent
│       ├── sahara.ts              # Intron Sahara API client
│       └── utils.ts               # cn helper
├── .env.local.example
└── package.json
```

## 🎯 Vertical: Health

Builds a voice-driven patient **triage assistant** that:
- Collects symptoms via voice (English, Swahili, Yoruba, Hausa, code-switching supported)
- Classifies urgency (low, moderate, high, emergency)
- Recommends next steps (self-care, telehealth, in-person visit)
- Demonstrates true **agentic capability** — not just transcription

**Why this matters (concrete):** a community clinic in Nigeria receives a patient who says
*"Ina dauwa da zazzaɓar jiki… my temperature is very high."* In our benchmark, Whisper
large-v3 silently deleted the Hausa segment — the fever complaint never reached the agent.
In a real intake queue that is a missed fever. AfriVoice exists so the symptom survives the
transcription, gets an urgency tier, and lands on a clinician's desk as a structured
handoff card — in the language mix the patient actually speaks.

## 📊 Benchmark

Three-way benchmark on code-switched audio (see `docs/BENCHMARK.md` for the full report):
1. **Intron Sahara v2** (primary, API)
2. **Whisper large-v3** (faster-whisper, open-source)
3. **wav2vec2 XLS-R-53** (open-source)

The live `/bench` page also offers an in-browser runner against Sahara v2, OpenAI `whisper-1`, and `gpt-4o-transcribe` (requires API keys).

Metrics: WER, Latency, Cost
Dataset: AfriSwitch (54.41 hours, 14 language pairs, 16,602 utterances) + 6 synthetic code-switched health samples

## 🏆 Judging Criteria

- Real-world impact (20%) — Healthcare triage for 1B+ Africans
- Code-switching benchmark quality (30%) — 3-model WER comparison on synthetic + real AfriSwitch data
- Product quality & fit (25%) — Agentic pipeline, UX, workflow fit
- Technical execution (15%) — Architecture, latency, robustness, privacy
- Ethics, safety & inclusion (10%) — Consent, privacy-first, bias awareness, no diagnoses

## 📝 Deliverables

- [x] Solution code (this repo)
- [x] Demo video (`public/demo-video/afrivoice-live-demo-narrated.mp4` — live-app recording; YouTube link pending upload)
- [x] Benchmark report (`docs/BENCHMARK.md`)
- [x] Ethics/inclusion note (`docs/ETHICS.md`)
- [x] Audio samples with metadata (`public/data/`)

## 🔗 Live Demo

- App: https://app-phi-one-ah0g1z34ov.vercel.app
- Benchmark page: https://app-phi-one-ah0g1z34ov.vercel.app/bench

## 🛣️ Continuation

AfriVoice Triage does not end with this submission: it is the foundation of our entry into the **Sahara Switch Africa Challenge (starting Oct 1)**, where the same code-switched agentic pipeline will be extended to more languages, more verticals (fintech, agri, legal), and on-device deployment for low-bandwidth clinics.

## 🔗 Resources

- Challenge: https://intron.io/compete
- Sahara Docs: https://docs.voice.intron.io/
- AfriSwitch Dataset: https://huggingface.co/datasets/intronhealth/AfriSwitch
- ML Collective: https://mlcollective.org
