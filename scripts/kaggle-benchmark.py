# AfriVoice Triage — 3-model code-switching ASR benchmark (Sahara v2 vs Whisper large-v3 vs wav2vec2 XLS-R)
# Runs on Kaggle GPU. Outputs /kaggle/working/benchmark-results.json
import json, os, re, subprocess, sys, time, urllib.request

subprocess.run([sys.executable, "-m", "pip", "install", "-q", "faster-whisper", "jiwer", "soundfile", "librosa"], check=True)

import numpy as np
import soundfile as sf

SAHARA_KEY = os.environ.get("SAHARA_API_KEY", "")
if not SAHARA_KEY:
    raise RuntimeError("Set SAHARA_API_KEY env var (or use Kaggle Secrets)")
INTRON_BASE = "https://infer.voice.intron.io"
GH_RAW = "https://raw.githubusercontent.com/saaga23/afrivoice-triage/master/public/data/synthetic-samples"
AFRISWITCH_CONFIGS = ["swahili", "yoruba", "hausa", "igbo", "pidgin", "shona"]
N_PER_LANG = 5

def log(*a):
    print(*a, flush=True)

def norm(t):
    t = t.lower()
    t = re.sub(r"[^\w\s]", " ", t)
    return re.sub(r"\s+", " ", t).strip()

def wer(ref, hyp):
    import jiwer
    r, h = norm(ref), norm(hyp)
    if not r:
        return None
    return jiwer.wer(r, h)

# ---------------- data ----------------
samples = []  # {id, source, language, reference, array(16k float32), wav_bytes}

log("== downloading synthetic samples from GitHub ==")
for sid in ["sample-01", "sample-03", "sample-04", "sample-05", "sample-06", "sample-07"]:
    try:
        meta = json.load(urllib.request.urlopen(f"{GH_RAW}/{sid}.json", timeout=60))
        wav_bytes = urllib.request.urlopen(f"{GH_RAW}/{sid}.wav", timeout=120).read()
        import io
        arr, sr = sf.read(io.BytesIO(wav_bytes), dtype="float32")
        if arr.ndim > 1:
            arr = arr.mean(axis=1)
        if sr != 16000:
            import librosa
            arr = librosa.resample(arr, orig_sr=sr, target_sr=16000)
        samples.append({"id": sid, "source": "synthetic", "language": meta["language"],
                        "reference": meta["text"], "array": arr, "wav_bytes": wav_bytes})
        log(" ok", sid)
    except Exception as e:
        log(" FAIL", sid, e)

log("== downloading AfriSwitch from HuggingFace ==")
from datasets import load_dataset, Audio
for cfg in AFRISWITCH_CONFIGS:
    try:
        ds = load_dataset("intronhealth/AfriSwitch", cfg, split="test")
        ds = ds.cast_column("audio", Audio(sampling_rate=16000))
        for i in range(min(N_PER_LANG, len(ds))):
            ex = ds[i]
            arr = np.asarray(ex["audio"]["array"], dtype="float32")
            import io
            buf = io.BytesIO()
            sf.write(buf, arr, 16000, format="WAV")
            samples.append({"id": f"afriswitch-{cfg}-{i}", "source": "afriswitch", "language": cfg,
                            "reference": ex["transcription"], "array": arr, "wav_bytes": buf.getvalue()})
        log(" ok", cfg)
    except Exception as e:
        log(" FAIL", cfg, e)

log(f"total samples: {len(samples)}")

per_sample = []

def record(model, s, hyp, latency, err=None):
    w = None if err else wer(s["reference"], hyp)
    per_sample.append({"sample_id": s["id"], "source": s["source"], "language": s["language"],
                       "model": model, "reference": s["reference"], "hypothesis": hyp,
                       "wer": w, "latency_s": round(latency, 2), "error": err})
    log(f"  {model} | {s['id']} | wer={w if w is None else round(w,3)} | {round(latency,1)}s" + (f" | ERR {err}" if err else ""))

# ---------------- Sahara v2 ----------------
def sahara_transcribe(wav_bytes, name):
    import requests
    t0 = time.time()
    r = requests.post(f"{INTRON_BASE}/file/v1/upload",
                      headers={"Authorization": f"Bearer {SAHARA_KEY}"},
                      files={"audio_file_blob": ("audio.wav", wav_bytes, "audio/wav")},
                      data={"audio_file_name": name}, timeout=120)
    r.raise_for_status()
    fid = r.json()["data"]["file_id"]
    for _ in range(30):
        time.sleep(3)
        st = requests.get(f"{INTRON_BASE}/file/v1/status/{fid}",
                          headers={"Authorization": f"Bearer {SAHARA_KEY}"}, timeout=60).json()["data"]
        if st.get("processing_status") == "FILE_TRANSCRIBED":
            return st.get("audio_transcript", ""), time.time() - t0
        if st.get("processing_status") == "FILE_TRANSCRIPTION_FAILED":
            raise RuntimeError(st.get("error_message", "transcription failed"))
    raise TimeoutError("sahara poll timeout")

log("== Sahara v2 ==")
for s in samples:
    try:
        hyp, lat = sahara_transcribe(s["wav_bytes"], s["id"])
        record("sahara-v2", s, hyp, lat)
    except Exception as e:
        record("sahara-v2", s, "", 0, err=str(e)[:200])

# ---------------- faster-whisper large-v3 ----------------
log("== faster-whisper large-v3 ==")
try:
    from faster_whisper import WhisperModel
    try:
        wmodel = WhisperModel("large-v3", device="cuda", compute_type="float16")
        log("whisper on cuda fp16")
    except Exception as gpu_err:
        log("cuda load failed, falling back to cpu int8:", gpu_err)
        wmodel = WhisperModel("large-v3", device="cpu", compute_type="int8")
    for s in samples:
        try:
            t0 = time.time()
            segs, _ = wmodel.transcribe(s["array"], beam_size=5)
            hyp = " ".join(seg.text for seg in segs).strip()
            record("whisper-large-v3", s, hyp, time.time() - t0)
        except Exception as e:
            record("whisper-large-v3", s, "", 0, err=str(e)[:200])
except Exception as e:
    log("whisper model load FAILED:", e)

# ---------------- wav2vec2 XLS-R ----------------
log("== wav2vec2 xls-r-53 english (cpu) ==")
try:
    import torch
    from transformers import Wav2Vec2ForCTC, Wav2Vec2Processor
    proc = Wav2Vec2Processor.from_pretrained("jonatasgrosman/wav2vec2-large-xlsr-53-english")
    w2v = Wav2Vec2ForCTC.from_pretrained("jonatasgrosman/wav2vec2-large-xlsr-53-english").eval()
    for s in samples:
        try:
            t0 = time.time()
            inp = proc(s["array"], sampling_rate=16000, return_tensors="pt").input_values
            with torch.no_grad():
                logits = w2v(inp).logits
            hyp = proc.batch_decode(torch.argmax(logits, dim=-1))[0].strip()
            record("wav2vec2-xlsr-53-en", s, hyp, time.time() - t0)
        except Exception as e:
            record("wav2vec2-xlsr-53-en", s, "", 0, err=str(e)[:200])
except Exception as e:
    log("wav2vec2 model load FAILED:", e)

# ---------------- summary ----------------
import statistics
summary, per_language = [], []
models = sorted(set(p["model"] for p in per_sample))
for m in models:
    rows = [p for p in per_sample if p["model"] == m and p["wer"] is not None]
    if rows:
        wers = [p["wer"] for p in rows]
        lats = [p["latency_s"] for p in rows]
        summary.append({"model": m, "n": len(rows), "mean_wer": round(statistics.mean(wers), 4),
                        "median_wer": round(statistics.median(wers), 4),
                        "mean_latency_s": round(statistics.mean(lats), 2),
                        "errors": len([p for p in per_sample if p["model"] == m and p["error"]])})
for m in models:
    langs = sorted(set(p["language"] for p in per_sample if p["model"] == m))
    for lg in langs:
        rows = [p for p in per_sample if p["model"] == m and p["language"] == lg and p["wer"] is not None]
        if rows:
            per_language.append({"model": m, "language": lg, "n": len(rows),
                                 "mean_wer": round(statistics.mean(p["wer"] for p in rows), 4)})

examples = []
for s in samples[:4]:
    triple = {"sample_id": s["id"], "language": s["language"], "reference": s["reference"]}
    for p in per_sample:
        if p["sample_id"] == s["id"]:
            triple[p["model"]] = p["hypothesis"]
    examples.append(triple)

out = {"generated_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
       "runner": "kaggle-gpu", "models_run": models,
       "summary": summary, "per_language": per_language,
       "examples": examples, "per_sample": per_sample}
with open("/kaggle/working/benchmark-results.json", "w") as f:
    json.dump(out, f, indent=2)
log("DONE -> /kaggle/working/benchmark-results.json")
log(json.dumps(summary, indent=2))
