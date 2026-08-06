# MLC (Africa) × Intron Agentic Voice AI Challenge — Official Rules & Registration Metadata

## Official Rules (from ml-collective-africa.github.io/dl-indaba-2026/workshop-challenge)

### The Task
Build an **agentic voice application** — voice drives a downstream task or action, not just transcribe speech.

### Mandatory Requirements
1. Voice achieves a downstream task (the agentic component), not simply convert speech to text.
2. Benchmark performance on code-switched audio input across **at least three speech models**, including an Intron Sahara API, and at least two other models of the team's choice (global, local, open-source, or commercial).
3. Target a **specific vertical or use case** (see categories below).
4. Where permitted, submit code-switched audio samples used for testing, with basic metadata (language pair, domain, accent/country, device type, noise conditions).

### Categories
- Health
- Fintech/Telco Call Center
- Agriculture & Education
- Legal & Public Services
- Other high-impact use cases (humanitarian response, accessibility, media, transport, commerce, civic engagement, etc.)

### Deliverables
1. **Solution Description** — short description of the problem, target users, solution, technical overview highlighting key design decisions.
2. **Demo** — short demo video of a working prototype or integrated application — link to unlisted/public YouTube video.
3. **Docs** — technical documentation (integrations into proprietary applications from startups or enterprises do not need to submit confidential docs).
4. **Benchmark Report** — results comparing at least three speech models (including Sahara), with pros and cons of using each.
5. **Ethics / Inclusion** — brief note on privacy, consent, safety, responsible data use.
6. **Benchmark Audios (optional)** — consented, de-identified code-switched audio samples used for benchmarking in selected category, with metadata.

### Judging Criteria (official organizer brief, Aug 3 email — supersedes the earlier scraped table)
| Criterion | Weight | What it asks |
|-----------|--------|--------------|
| Real-world impact | 20% | Genuine user need for a meaningful/large enough target group |
| Code-switching benchmark quality | 30% | Quality and fairness of the cross-model comparison — highest weight; a rigorous report beats a polished pitch |
| Product quality & fit | 25% | Is it agentic? Appropriate for the target user? UX and workflow fit |
| Technical execution | 15% | Architecture, design, integration, latency, robustness, privacy/security |
| Ethics, safety & inclusion | 10% | Consent, privacy, bias awareness, user dignity |

**One submission per access token** — no second entry, everything must be ready before submitting.
**Submission form:** 8 short questions (solution, problem, target users, how it solves the problem, code-switching support, Sahara API usage, agentic behavior, technical overview + ethics/inclusion) + demo video link + **benchmark report PDF** + optional benchmark audio dataset link. Answers drafted in `SUBMISSION_ANSWERS.local.md` (workspace root, not in repo).

**Bonus consideration for:** strong benchmark design, low-resource language coverage, offline/low-bandwidth readiness, clear potential to continue into full Sahara Switch Africa Challenge.

### Timeline
- **3rd August 2026** — Registration opens
- **6th August 2026, 1:00pm WAT** — Submission deadline
- **7th August 2026** — Finalists announced at the workshop (Main Plenary Hall)
- Same day / later online — Winner(s) announced

### Extended Challenge
Teams can carry over into Intron's full Sahara CodeSwitch Africa Challenge (build period through mid-September, winners announced October 1).

### Prizes
- 1st place: $1,200
- 2nd place: $800

### Resources Provided by Intron
- Access to Sahara code-switching APIs across supported language pairs (we integrate **Sahara v2** via the Intron Voice API)
- Access to AfriSwitch benchmark dataset with code-switching samples in **14 language pairs** (per the official HF dataset card)
- Public benchmarking framework for comparing model performance

---

## Registration Metadata

| Field | Value |
|-------|-------|
| **Email** | abrahamsunday23@gmail.com |
| **Category** | Health |
| **Registration Type** | Individual |
| **Solution Access Type** | Open Source |
| **Solution Owner** | Individual |
| **Team Name** | N/A — individual participant |
| **Phone** | (not recorded in local files) |
| **Country** | Nigeria (implied from context) |

---

## Key Interpretation Notes
1. "Agentic" is the **core requirement** — transcription-only solutions will likely be filtered out.
2. Benchmark must include **≥3 models**: Sahara + 2 others (Whisper, GPT-4o Audio, etc.)
3. Audio samples with metadata are **mandatory where permitted** — consent flow is critical.
4. The challenge explicitly values **low-resource language coverage** and **offline readiness**.
5. "Fresh Team" is a strong signal — judges expect raw innovation over polished enterprise product.
6. Open Source is required/encouraged — all code should be public.
7. The extended challenge (Oct 1) is a major opportunity — design should show clear continuation path.

---

*Document compiled: August 3, 2026*
