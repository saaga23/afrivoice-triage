# wav2vec2 XLS-R-53 on AfriSwitch N=120 (CPU) — complements whisper-large-v3 GPU run
import json, os, re, subprocess, sys, time, urllib.request, io, statistics, collections
subprocess.run([sys.executable, "-m", "pip", "install", "-q", "jiwer", "soundfile", "datasets", "transformers", "torch"], check=True)
import numpy as np, soundfile as sf, jiwer
from datasets import load_from_disk, Audio

GH = "https://raw.githubusercontent.com/saaga23/afrivoice-triage/master/public/data/afriswitch"
CONFIGS = ["swahili", "yoruba", "hausa", "igbo", "pidgin", "shona"]
FILES = ["data-00000-of-00001.arrow", "dataset_info.json", "state.json"]
UA = {"User-Agent": "Mozilla/5.0"}

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
            if arr.ndim > 1: arr = arr.mean(axis=1)
            if sr != 16000:
                import librosa
                arr = librosa.resample(arr, orig_sr=sr, target_sr=16000)
            samples.append({"id": f"{cfg}-{i}", "language": cfg,
                            "reference": ex["transcription"], "array": arr,
                            "cmi": ex.get("cmi"), "duration": ex.get("duration")})
        except Exception as e:
            log(f"  DECODE FAIL {cfg}-{i}: {str(e)[:80]}")

log(f"total samples: {len(samples)}")
rows = []

log("== wav2vec2 xls-r-53 english (CPU) ==")
try:
    import torch
    from transformers import Wav2Vec2ForCTC, Wav2Vec2Processor
    proc = Wav2Vec2Processor.from_pretrained("jonatasgrosman/wav2vec2-large-xlsr-53-english")
    w2v = Wav2Vec2ForCTC.from_pretrained("jonatasgrosman/wav2vec2-large-xlsr-53-english").eval().to('cpu')
    log("model loaded on CPU")
    for s in samples:
        try:
            t0 = time.time()
            inp = proc(s["array"], sampling_rate=16000, return_tensors="pt").input_values.to('cpu')
            with torch.no_grad():
                logits = w2v(inp).logits
            hyp = proc.batch_decode(torch.argmax(logits, dim=-1))[0].strip()
            w = compute_wer(s["reference"], hyp)
            rows.append({"sample_id": s["id"], "language": s["language"], "model": "wav2vec2-xlsr-53-en",
                         "reference": s["reference"], "hypothesis": hyp, "wer": w,
                         "latency_s": round(time.time()-t0, 2)})
            log(f"  {s['id']} wer={round(w,3)} {round(time.time()-t0,1)}s")
        except Exception as e:
            log(f"  ERROR {s['id']}: {str(e)[:120]}")
except Exception as e:
    log("load failed:", str(e)[:200])

with open("/kaggle/working/benchmark-afriswitch-xlsr-cpu.jsonl", "w", encoding="utf-8") as f:
    for r in rows:
        f.write(json.dumps(r, ensure_ascii=False) + "\n")

if rows:
    ws = [r["wer"] for r in rows]
    by_lang = collections.defaultdict(list)
    for r in rows: by_lang[r["language"]].append(r["wer"])
    log(f"DONE xlsr: n={len(ws)} mean={statistics.mean(ws):.4f} median={statistics.median(ws):.4f}")
    for lang, ls in sorted(by_lang.items()):
        log(f"  {lang}: mean={statistics.mean(ls):.3f}")
