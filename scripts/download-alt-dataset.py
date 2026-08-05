import os
from datasets import load_dataset

OUTPUT_DIR = 'C:\\Users\\USER\\Downloads\\mlc hackathon\\app\\public\\data\\afrispeech-200'

os.makedirs(OUTPUT_DIR, exist_ok=True)

datasets_to_try = [
    "intronhealth/afrispeech-200",
    "afrivox/afrivox-v2",
    "afrivox/afrivox-transcribe",
]

for ds_name in datasets_to_try:
    try:
        print(f"Trying {ds_name}...")
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
