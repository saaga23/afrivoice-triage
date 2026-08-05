# AfriVoice Triage — Agentic Voice AI for African Healthcare

**Submission for:** MLC (Africa) × Intron Agentic Voice AI Challenge 2026

## 🚀 Quick Start

1. Clone the repo
2. Install dependencies: `npm install`
3. Set up environment variables: Copy `.env.local.example` to `.env.local` and add your Sahara API keys
4. Run development server: `npm run dev`
5. Open http://localhost:3000

## 🎬 Demo Video

- **`public/demo-video/afrivoice-live-demo-narrated.mp4`** (81s, narrated) — a **real screen recording of the live production app**, not a mock: a code-switched Swahili–English voice message is transcribed by Sahara STT in real time, the LangGraph agent classifies intent, an emergency utterance ("severe chest pain… cannot breathe") triggers the red `high urgency` triage badge with seek-immediate-care guidance, and the benchmark page is shown. Narration: Sahara TTS voiceover.
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

## 📊 Benchmark

Benchmarks 3 models on code-switched audio (see `docs/BENCHMARK.md` for the full report):
1. **Intron Sahara v2** (primary)
2. OpenAI **Whisper** (`whisper-1`)
3. OpenAI **GPT-4o Transcribe**

Metrics: WER, Latency, Cost
Dataset: AfriSwitch (54.41 hours, 14 language pairs, 16,602 utterances) + 6 synthetic code-switched health samples

## 🏆 Judging Criteria

- Real-world impact (35%) — Healthcare triage for 1B+ Africans
- Code-switching performance (25%) — Agentic use on mixed-language speech
- Product quality (20%) — Polished UI, clear workflow
- Technical execution (15%) — Reliable, low-latency pipeline
- Ethics/safety (5%) — Privacy-first, consent, no diagnoses

## 📝 Deliverables

- [x] Solution code (this repo)
- [x] Demo video (`public/demo-video/afrivoice-live-demo-narrated.mp4` — live-app recording; YouTube link pending upload)
- [x] Benchmark report (`docs/BENCHMARK.md`)
- [x] Ethics/inclusion note (`docs/ETHICS.md`)
- [x] Audio samples with metadata (`public/data/`)

## 🔗 Live Demo

- App: https://app-phi-one-ah0g1z34ov.vercel.app
- Benchmark page: https://app-phi-one-ah0g1z34ov.vercel.app/bench

## 🔗 Resources

- Challenge: https://intron.io/compete
- Sahara Docs: https://docs.voice.intron.io/
- AfriSwitch Dataset: https://huggingface.co/datasets/intronhealth/AfriSwitch
- ML Collective: https://mlcollective.org
