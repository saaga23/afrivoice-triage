# AfriVoice Triage — Submission Checklist (deadline 13:00 WAT today)

## Hard gate — only you can do this
- [ ] Upload `app/public/demo-video/afrivoice-demo-final.mp4` to YouTube as **unlisted or public**
- [ ] Paste the YouTube link into `app/README.md` under `## 🎬 Demo Video` (replace the placeholder)
- [ ] Go to the submission form, log in with `abrahamsunday23@gmail.com` + the access token from your registration email
- [ ] Fill the 8 short questions using `SUBMISSION_ANSWERS.local.md` (copy/paste)
- [ ] Paste the YouTube link in the demo-video field
- [ ] Upload `app/docs/BENCHMARK.pdf` as the benchmark report
- [ ] Optional benchmark audio dataset link (if you want): `https://github.com/saaga23/afrivoice-triage/tree/master/public/data/synthetic-samples`
- [ ] Submit — only one submission per token, so review once then hit submit

## What is already done and live
- Repo: https://github.com/saaga23/afrivoice-triage
- Live app: https://app-phi-one-ah0g1z34ov.vercel.app
- Live benchmark page: https://app-phi-one-ah0g1z34ov.vercel.app/bench
- Live demo video (fallback, not YouTube): https://app-phi-one-ah0g1z34ov.vercel.app/demo-video/afrivoice-demo-final.mp4
- Live benchmark PDF: https://app-phi-one-ah0g1z34ov.vercel.app/docs/BENCHMARK.pdf
- Real-data benchmark JSONLs:
  - https://app-phi-one-ah0g1z34ov.vercel.app/data/benchmark-afriswitch-sahara.jsonl
  - https://app-phi-one-ah0g1z34ov.vercel.app/data/benchmark-afriswitch-opensource.jsonl
  - https://app-phi-one-ah0g1z34ov.vercel.app/data/benchmark-afriswitch-xlsr-cpu.jsonl

## Key numbers to copy if the form asks
- Synthetic 3-model: Sahara 0.347 WER · Whisper large-v3 0.450 · wav2vec2 XLS-R-53 0.604
- Real AfriSwitch N=120 (all 3 models, same data): Sahara 0.603 · Whisper 0.692 · wav2vec2 XLS-R-53 0.853
- Real-data per-language Sahara/Whisper: Hausa 0.371/0.892 · Pidgin 0.390/0.338 · Swahili 0.400/0.525 · Yoruba 0.688/0.959 · Igbo 0.881/0.668 · Shona 0.885/0.773

## If your laptop stays down
- Use a phone or any other device for the YouTube upload and form submission.
- The files you need are in the live GitHub repo (`public/demo-video/afrivoice-demo-final.mp4` and `docs/BENCHMARK.pdf`).
- Once you paste the YouTube link here, I can update the README and push it immediately.

## Post-submission
- [ ] Rotate Sahara API key with Intron (the current key has been used in multiple places)
