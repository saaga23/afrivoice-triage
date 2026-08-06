# Whisper large-v3 + wav2vec2 XLS-R on the SAME 120 real AfriSwitch samples as the Sahara run
# (fair cross-model comparison). GPU kernel. Output: /kaggle/working/benchmark-afriswitch-opensource.jsonl
import json, os, re, subprocess, sys, time, urllib.request, io

subprocess.run([sys.executable, "-m", "pip", "install", "-q", "faster-whisper", "jiwer", "soundfile", "datasets", "transformers", "torch"], check=True)
import numpy as np
import soundfile as sf
import jiwer
from datasets import load_from_disk, Audio

GH = "https://raw.githubusercontent.com/saaga23/afrivoice-triage/master/public/data/afriswitch"
CONFIGS = ["swahili", "yoruba", "hausa", "igbo", "pidgin", "shona"]
FILES = ["data-00000-of-00001.arrow", "dataset_info.json", "state.json"]
UA = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"}

def log(*a): print(*a, flush=True)

def fetch(url, dest, timeout=300):
    req = urllib.request.Request(url, headers=UA)
    with open(dest, "wb") as f:
        f.write(urllib.request.urlopen(req, timeout=timeout).read())

def norm(t):
    t = t.lower()
    t = re.sub(r"[^\w\s]", " ", t)
    return re.sub(r"\s+", " ", t).strip()

def compute_wer(ref, hyp):
    r, h = norm(ref), norm(hyp)
    return jiwer.wer(r, h) if r else None

samples = []
for cfg in CONFIGS:
    d = f"/kaggle/working/data/{cfg}"
    os.makedirs(d, exist_ok=True)
    for fn in FILES:
        fetch(f"{GH}/{cfg}/{fn}", os.path.join(d, fn))
    ds = load_from_disk(d).cast_column("audio", Audio(decode=False))
    log(f"{cfg}: {len(ds)} samples")
    for i in range(len(ds)):
        ex = ds[i]
        try:
            arr, sr = sf.read(io.BytesIO(ex["audio"]["bytes"]), dtype="float32")
            if arr.ndim > 1:
                arr = arr.mean(axis=1)
            if sr != 16000:
                import librosa
                arr = librosa.resample(arr, orig_sr=sr, target_sr=16000)
            samples.append({"id": f"{cfg}-{i}", "language": cfg,
                            "reference": ex["transcription"], "array": arr,
                            "cmi": ex.get("cmi"), "duration": ex.get("duration")})
        except Exception as e:
            log(f"  DECODE FAIL {cfg}-{i}: {str(e)[:100]}")

log(f"total samples: {len(samples)}")
rows = []

def record(model, s, hyp, lat, err=None):
    w = None if err else compute_wer(s["reference"], hyp)
    rows.append({"sample_id": s["id"], "language": s["language"], "model": model,
                 "reference": s["reference"], "hypothesis": hyp, "wer": w,
                 "latency_s": round(lat, 2), "cmi": s.get("cmi"), "duration": s.get("duration"),
                 "error": err})
    log(f"  {model} | {s['id']} | wer={None if w is None else round(w,3)} | {round(lat,1)}s" + (f" | ERR {err}" if err else ""))

log("== faster-whisper large-v3 ==")
try:
    from faster_whisper import WhisperModel
    try:
        wmodel = WhisperModel("large-v3", device="cuda", compute_type="float16")
        log("whisper on cuda fp16")
    except Exception as gpu_err:
        log("cuda load failed, cpu int8 fallback:", str(gpu_err)[:150])
        wmodel = WhisperModel("large-v3", device="cpu", compute_type="int8")
    for s in samples:
        try:
            t0 = time.time()
            segs, info = wmodel.transcribe(s["array"], beam_size=5)
            hyp = " ".join(seg.text for seg in segs).strip()
            record("whisper-large-v3", s, hyp, time.time() - t0)
        except Exception as e:
            record("whisper-large-v3", s, "", 0, err=str(e)[:200])
except Exception as e:
    log("whisper load FAILED:", str(e)[:200])

log("== wav2vec2 xls-r-53 english ==")
try:
    import torch
    from transformers import Wav2Vec2ForCTC, Wav2Vec2Processor
    proc = Wav2Vec2Processor.from_pretrained("jonatasgrosman/wav2vec2-large-xlsr-53-english")
    w2v = Wav2Vec2ForCTC.from_pretrained("jonatasgrosman/wav2vec2-large-xlsr-53-english").eval()
    if torch.cuda.is_available():
        w2v = w2v.cuda()
        log("wav2vec2 on cuda")
    for s in samples:
        try:
            t0 = time.time()
            inp = proc(s["array"], sampling_rate=16000, return_tensors="pt").input_values
            if torch.cuda.is_available():
                inp = inp.cuda()
            with torch.no_grad():
                logits = w2v(inp).logits
            hyp = proc.batch_decode(torch.argmax(logits, dim=-1))[0].strip()
            record("wav2vec2-xlsr-53-en", s, hyp, time.time() - t0)
        except Exception as e:
            record("wav2vec2-xlsr-53-en", s, "", 0, err=str(e)[:200])
except Exception as e:
    log("wav2vec2 load FAILED:", str(e)[:200])

with open("/kaggle/working/benchmark-afriswitch-opensource.jsonl", "w", encoding="utf-8") as f:
    for r in rows:
        f.write(json.dumps(r, ensure_ascii=False) + "\n")

import statistics
for m in sorted(set(r["model"] for r in rows)):
    ws = [r["wer"] for r in rows if r["model"] == m and r["wer"] is not None]
    if ws:
        log(f"DONE {m}: n={len(ws)} meanWER={round(statistics.mean(ws),4)} median={round(statistics.median(ws),4)}")
log("ALL DONE")
