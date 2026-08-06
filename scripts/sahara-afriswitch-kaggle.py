# Sahara v2 on real AfriSwitch (N=120) — pulls arrow data from GitHub raw, calls Sahara API
# Output: /kaggle/working/benchmark-afriswitch-sahara.jsonl
import json, os, re, subprocess, sys, time, urllib.request, io

subprocess.run([sys.executable, "-m", "pip", "install", "-q", "jiwer", "soundfile", "datasets"], check=True)
import jiwer
from datasets import load_from_disk, Audio

# Set SAHARA_API_KEY in a Kaggle secret / env var — never commit the key.
SAHARA_KEY = os.environ["SAHARA_API_KEY"]
BASE = "https://infer.voice.intron.io"
GH = "https://raw.githubusercontent.com/saaga23/afrivoice-triage/master/public/data/afriswitch"
CONFIGS = ["swahili", "yoruba", "hausa", "igbo", "pidgin", "shona"]
LANG_CODE = {"swahili": "sw", "yoruba": "yo", "hausa": "ha", "igbo": "ig", "pidgin": "pcm", "shona": "sn"}
FILES = ["data-00000-of-00001.arrow", "dataset_info.json", "state.json"]
UA = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"}

def log(*a): print(*a, flush=True)

def fetch(url, dest=None, timeout=300):
    req = urllib.request.Request(url, headers=UA)
    data = urllib.request.urlopen(req, timeout=timeout).read()
    if dest:
        with open(dest, "wb") as f: f.write(data)
    return data

def norm(t):
    t = t.lower()
    t = re.sub(r"[^\w\s]", " ", t)
    return re.sub(r"\s+", " ", t).strip()

def sahara(wav_bytes, name, lang):
    t0 = time.time()
    boundary = "----benchboundary"
    body = f"--{boundary}\r\nContent-Disposition: form-data; name=\"audio_file_name\"\r\n\r\n{name}\r\n".encode()
    body += f"--{boundary}\r\nContent-Disposition: form-data; name=\"use_language_asr_input\"\r\n\r\n{lang}\r\n".encode()
    body += f"--{boundary}\r\nContent-Disposition: form-data; name=\"audio_file_blob\"; filename=\"audio.wav\"\r\nContent-Type: audio/wav\r\n\r\n".encode() + wav_bytes + f"\r\n--{boundary}--\r\n".encode()
    req = urllib.request.Request(f"{BASE}/file/v1/upload", data=body,
        headers={"Authorization": f"Bearer {SAHARA_KEY}", "Content-Type": f"multipart/form-data; boundary={boundary}", **UA})
    fid = json.load(urllib.request.urlopen(req, timeout=120))["data"]["file_id"]
    for _ in range(30):
        time.sleep(3)
        req = urllib.request.Request(f"{BASE}/file/v1/status/{fid}", headers={"Authorization": f"Bearer {SAHARA_KEY}", **UA})
        st = json.load(urllib.request.urlopen(req, timeout=60))["data"]
        if st.get("processing_status") == "FILE_TRANSCRIBED":
            return st.get("audio_transcript", ""), time.time() - t0
        if st.get("processing_status") == "FILE_TRANSCRIPTION_FAILED":
            raise RuntimeError(st.get("error_message", "failed"))
    raise TimeoutError("poll timeout")

rows = []
for cfg in CONFIGS:
    try:
        d = f"/kaggle/working/data/{cfg}"
        os.makedirs(d, exist_ok=True)
        for fn in FILES:
            fetch(f"{GH}/{cfg}/{fn}", os.path.join(d, fn))
        ds = load_from_disk(d).cast_column("audio", Audio(decode=False))
        log(f"{cfg}: {len(ds)} samples")
        for i in range(len(ds)):
            ex = ds[i]
            sid = f"{cfg}-{i}"
            try:
                hyp, lat = sahara(ex["audio"]["bytes"], sid, LANG_CODE[cfg])
                ref = ex["transcription"]
                r, h = norm(ref), norm(hyp)
                w = jiwer.wer(r, h) if r else None
                rows.append({"sample_id": sid, "language": cfg, "reference": ref, "hypothesis": hyp,
                             "wer": w, "latency_s": round(lat, 2), "cmi": ex.get("cmi"), "duration": ex.get("duration")})
                log(f"  {sid} wer={round(w,3) if w is not None else None} {round(lat,1)}s")
            except Exception as e:
                rows.append({"sample_id": sid, "language": cfg, "error": str(e)[:200]})
                log(f"  {sid} ERROR {str(e)[:100]}")
    except Exception as e:
        log(f"LOAD FAIL {cfg}: {e}")

with open("/kaggle/working/benchmark-afriswitch-sahara.jsonl", "w", encoding="utf-8") as f:
    for r in rows:
        f.write(json.dumps(r, ensure_ascii=False) + "\n")

ok = [r for r in rows if r.get("wer") is not None]
import statistics
if ok:
    log(f"DONE ok={len(ok)}/{len(rows)} meanWER={round(statistics.mean(r['wer'] for r in ok),4)}")
else:
    log(f"DONE ok=0/{len(rows)}")
