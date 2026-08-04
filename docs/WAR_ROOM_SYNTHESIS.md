# WAR ROOM SYNTHESIS — AfriVoice Triage

**Date:** August 3, 2026  
**Deadline:** August 6, 2026  
**Time Remaining:** ~72 hours (~42 productive hours)  
**Overall Verdict:** KEEP_IDEA → PIVOT_EXECUTION → 72H_SURVIVAL_MODE

---

## EXECUTIVE SUMMARY

The idea is **strong**. The execution is **broken**. The submission is currently **at risk of disqualification**. The project has 72 hours to transform from a non-functional mock into a credible hackathon entry. This is achievable but requires ruthless prioritization and immediate action on external dependencies.

---

## AGENT FINDINGS AGGREGATE

### 1. Rules-Compliance-Auditor
**Verdict:** AT_RISK → likely DISQUALIFIED  
**Score:** 1/4 mandatory requirements met

| Requirement | Status | Severity |
|-------------|--------|----------|
| Voice achieves downstream task (agentic) | PARTIAL | MEDIUM |
| Benchmark ≥3 models with Sahara | FAIL — mock data | CRITICAL |
| Target specific vertical | PASS — Health | OK |
| Submit code-switched audio with metadata | FAIL — none collected | HIGH |

**Killers:** Sahara API key not obtained; benchmark page fabricates results; no demo video; no audio samples.

### 2. End-to-End-Architect
**Verdict:** BROKEN  
**Score:** Pipeline cannot function as-is

**Critical broken links:**
1. `voice-ui.tsx` sends `{ message: "" }` to API — audio base64 is **never included** in the POST body. STT never runs.
2. `sahara.ts` defines `synthesizeSpeech()` but it is **never called**. No TTS. No voice output.
3. LangGraph `toolCalls` reducer is broken (`[] ?? ["triage"]` returns `[]`). Agent routing is dead code.
4. `agent.ts` has a runtime bug: `this.graph` referenced before class field initializer.
5. `@langchain/langgraph` is missing from `package.json` (transitive only).

**Demo killers:** Voice input produces no STT. No voice output. `MediaRecorder` fails on iOS Safari.

### 3. Benchrigor-Reviewer
**Verdict:** NEEDS_WORK  
**Score:** Conceptually strong, practically broken

**Strengths:**
- Correct model trio (specialised vs open vs closed)
- Correct dataset choice (AfriSwitch)
- Healthcare vertical is judge-friendly

**Critical issues:**
- `bench/page.tsx` uses **hardcoded mockResults** — fabricated WER/latency numbers
- Outdated dataset stats (20.4h vs real 54.4h; 5 langs vs 14)
- GPT-4o model name wrong (`gpt-4o-audio-preview` vs `gpt-4o-transcribe`)
- Missing metrics: CER, per-language WER, latency percentiles, hallucination rate, entity accuracy
- No statistical significance testing, no confounder control
- Sahara pricing is fabricated ($0.05/min — not publicly available)

### 4. Harsh-Judge
**Verdict:** 3.5/10 overall — ~6th of 10 teams

| Criterion | Score | Weight | Weighted |
|-----------|-------|--------|----------|
| Real-world impact | 4/10 | 35% | 1.40 |
| Code-switching | 2/10 | 25% | 0.50 |
| Product quality | 5/10 | 20% | 1.00 |
| Technical execution | 3/10 | 15% | 0.45 |
| Ethics | 3/10 | 5% | 0.15 |
| **TOTAL** | | | **3.50** |

**Kill weakness:** Fabricated benchmark = instant disqualification risk  
**Win strength:** Healthcare triage vertical for African multilingual populations

### 5. Ethics-Inclusion-Auditor
**Verdict:** NEEDS_WORK  
**Score:** Superficial to non-existent

**Critical gaps:**
- No consent flow
- No privacy policy
- No medical disclaimer in UI
- No emergency escalation protocol
- AfriSwitch CC BY NC SA 4.0 license risk not documented
- No bias testing per language/accent
- No data deletion mechanism

### 6. Risk-Analyst
**Verdict:** PROCEED_WITH_MITIGATIONS  
**Score:** 72-hour window is survivable ONLY if Sahara key arrives within 12h

**Hours required:** 27–43 (excluding API key wait)  
**Hours available:** ~42 productive hours  
**Margin:** −1 to +15 hours

**Kill criteria (STOP immediately if any trigger):**
1. Sahara API key not received within 12 hours
2. AfriSwitch dataset is gated/unavailable after 8h of attempts
3. LangGraph + core combination produces unrecoverable runtime error after 4h
4. <4 hours remain before deadline with deliverables unrecorded
5. Two+ critical bugs unfixed at 24h mark AND Sahara key still missing

### 7. Competitive-Intelligence
**Verdict:** PIVOT confirmed  
**Differentiation score:** Conceptually strong, execution weak

**Finding:** No one has built agentic voice triage for African code-switching, but the current execution makes it indistinguishable from a transcription demo. The agentic layer must be real, not claimed.

### 8. Visibility-GTM-Agent
**Verdict:** NEEDS_STORY_WORK  
**Score:** Weak story arc, needs sharp demo moment

**Required:** The aha moment must be visible within 10 seconds — a code-switched utterance producing a visible `Intent: triage` + `Urgency: high` badge. The benchmark page must show real data, not mocks.

---

## CONSOLIDATED VERDICT: KEEP → PIVOT → 72H_SURVIVAL

### KEEP (Idea is strong)
- Healthcare vertical for African code-switching is high-impact, underserved, and judge-friendly
- Agentic voice approach differentiates from transcription-only competitors
- Open Source + Fresh Team aligns with workshop ethos
- AfriSwitch dataset is the right choice
- Model trio (Sahara + Whisper + GPT-4o) is the right comparison

### PIVOT (Execution must change radically)
The current codebase is a **mock with broken pipeline**. It must be transformed into a **working agentic demo with real benchmarks**.

### 72H_SURVIVAL_MODE (If Sahara key arrives within 12h)

**Phase 1: Fix Pipeline (0–8h)**
1. Fix `voice-ui.tsx` audio sending (1.5h)
2. Fix `sahara.ts` baseURL (1h)
3. Fix `agent.ts` graph initialization + toolCalls reducer (2h)
4. Wire TTS into pipeline + frontend playback (3h)
5. Add `@langchain/langgraph` to `package.json` (1h)

**Phase 2: External Dependencies (0–12h, parallel)**
6. Obtain Sahara API key (email Intron + self-service signup)
7. Download AfriSwitch dataset
8. Obtain OpenAI API key (or use local Whisper)
9. Sign up for Vercel deployment

**Phase 3: Real Benchmark (8–20h)**
10. Replace mock benchmark with real API calls
11. Compute WER/CER on AfriSwitch samples (start with N=50)
12. Add per-language breakdowns, latency percentiles
13. Document methodology honestly (even if small sample)

**Phase 4: Demo & Docs (20–36h)**
14. Record end-to-end demo video (3-min max)
15. Deploy to Vercel
16. Write benchmark report
17. Write ethics/inclusion note
18. Collect 5–10 code-switched audio samples with metadata
19. Add consent flow + privacy notice

**Phase 5: Final QA (36–42h)**
20. Test on mobile browsers
21. Verify all deliverables
22. Submit

### KILL (If any kill criteria trigger)

**Trigger 1: Sahara key not in 12h →** Pivot to local Whisper STT + gpt-4o-mini LLM. Keep agentic architecture. Demo becomes text-first with optional voice. Submit honest partial benchmark.

**Trigger 2: AfriSwitch gated →** Use 5–10 synthetic code-switched samples. Label as "pilot study." Submit with transparency note.

**Trigger 3: LangGraph incompatible →** Replace with simple function-calling agent (OpenAI tools API). Faster to implement, less risk.

**Trigger 4: <4h before deadline with broken pipeline →** Submit text-only demo + static benchmark report + ethics note. Better to submit something credible than a broken video.

---

## CRITICAL ACTION ITEMS (NEXT 2 HOURS)

| Priority | Action | Owner | Timebox |
|----------|--------|-------|---------|
| P0 | Email Intron support requesting Sahara API key for hackathon | Solo dev | 30 min |
| P0 | Sign up at voice.intron.io self-service portal | Solo dev | 30 min |
| P0 | Fix `voice-ui.tsx` audio sending bug | Solo dev | 1.5h |
| P0 | Fix `sahara.ts` baseURL bug | Solo dev | 1h |
| P1 | Verify `@langchain/langgraph` install | Solo dev | 2h |
| P1 | Download AfriSwitch dataset from HuggingFace | Solo dev | 2h |
| P1 | Sign up for OpenAI API key (fallback/benchmark) | Solo dev | 30 min |

---

## FILES TO MODIFY

| File | Changes Required |
|------|------------------|
| `src/components/voice-ui.tsx` | Fix audio sending; add TTS playback; add iOS fallback |
| `src/lib/sahara.ts` | Fix baseURL; add error handling |
| `src/lib/agent.ts` | Fix graph initialization; fix toolCalls reducer; add real tool execution |
| `src/app/api/chat/route.ts` | Wire TTS into response; fix audio handling |
| `src/app/bench/page.tsx` | Replace mockResults with real API integration |
| `src/app/page.tsx` | Add consent modal; add medical disclaimer |
| `package.json` | Add `@langchain/langgraph` as direct dependency |
| `docs/CHALLENGE_RULES.md` | Already saved — reference during development |

---

## WHAT THE JUDGES WILL SEE

**In 30 seconds:**
1. Open app → clean UI, medical theme, mic button prominent
2. Click mic → speak code-switched utterance
3. See transcription + Intent badge + Urgency badge + tool call badge
4. Hear voice response (TTS)
5. Navigate to Bench → see real WER comparison across 3 models

**If broken:**
1. Open app → click mic → no response → 500 error
2. Bench page → click "Run" → hardcoded fake numbers appear
3. Judge closes tab, moves to next submission

---

*War room convened: August 3, 2026*  
*Agents deployed: 9 (Rules, E2E, Benchrigor, Judge, Ethics, Risk, Competitive, Visibility, Problem)*  
*Synthesis: KEEP_IDEA → PIVOT_EXECUTION → 72H_SURVIVAL_MODE*
