import os
from datasets import load_dataset

OUTPUT_DIR = 'C:\\Users\\USER\\Downloads\\mlc hackathon\\app\\public\\data\\afrispeech-public'

os.makedirs(OUTPUT_DIR, exist_ok=True)

datasets_to_try = [
    "AfriSpeech/african-speech-public_v1",
    "mozilla-foundation/common_voice_20_0",
    "google/fleurs",
]

for ds_name in datasets_to_try:
    try:
        print(f"Trying {ds_name}...")
        if ds_name == "mozilla-foundation/common_voice_20_0":
            dataset = load_dataset(ds_name, "en", split="train", trust_remote_code=False, streaming=True)
            samples = []
            for i, sample in enumerate(dataset):
                if i >= 20:
                    break
                samples.append(sample)
            print(f"SUCCESS: {ds_name} loaded {len(samples)} samples")
            break
        elif ds_name == "google/fleurs":
            dataset = load_dataset(ds_name, "all", split="test", trust_remote_code=False, streaming=True)
            samples = []
            for i, sample in enumerate(dataset):
                if i >= 20:
                    break
                samples.append(sample)
            print(f"SUCCESS: {ds_name} loaded {len(samples)} samples")
            break
        else:
            dataset = load_dataset(ds_name, split="train", trust_remote_code=False)
            print(f"SUCCESS: {ds_name} loaded with {len(dataset)} samples")
            print(f"Features: {dataset.features}")
            
            limit = 50
            subset = dataset.select(range(min(limit, len(dataset))))
            subset.save_to_disk(OUTPUT_DIR)
            print(f"Saved to {OUTPUT_DIR}")
            break
    except Exception as e:
        print(f"FAILED: {ds_name} - {e}")
