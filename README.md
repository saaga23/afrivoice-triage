# AfriVoice Triage — Agentic Voice AI for African Healthcare

**Submission for:** MLC (Africa) × Intron Agentic Voice AI Challenge 2026

## 🚀 Quick Start

1. Clone the repo
2. Install dependencies: `npm install`
3. Set up environment variables: Copy `.env.local.example` to `.env.local` and add your Sahara API keys
4. Run development server: `npm run dev`
5. Open http://localhost:3000

## 🏗️ Stack

- **Frontend:** Next.js 14, TypeScript, Tailwind CSS v4, shadcn/ui
- **Backend:** Next.js API Routes
- **AI:** LangChain + LangGraph for agentic reasoning, Intron Sahara v2 for STT/TTS
- **Database:** (planned) PostgreSQL + Prisma

## 📁 Structure

```
app/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   └── chat/
│   │   │       └── route.ts       # Chat endpoint
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

Benchmarks ≥3 models on code-switched audio:
1. **Intron Sahara v2** (primary)
2. OpenAI **Whisper Large v3**
3. OpenAI **GPT-4o Audio**

Metrics: WER, Code-switch accuracy, Latency, Cost
Dataset: AfriSwitch (20.40 hours, 5 language pairs)

## 🏆 Judging Criteria

- Real-world impact (35%) — Healthcare triage for 1B+ Africans
- Code-switching performance (25%) — Agentic use on mixed-language speech
- Product quality (20%) — Polished UI, clear workflow
- Technical execution (15%) — Reliable, low-latency pipeline
- Ethics/safety (5%) — Privacy-first, consent, no diagnoses

## 📝 Deliverables

- [x] Solution code (this repo)
- [ ] Demo video
- [ ] Benchmark report
- [ ] Ethics/inclusion note
- [ ] Audio samples with metadata

## 🔗 Resources

- Challenge: https://intron.io/compete
- Sahara Docs: https://docs.voice.intron.io/
- AfriSwitch Dataset: https://huggingface.co/datasets/intronhealth/AfriSwitch
- ML Collective: https://mlcollective.org
