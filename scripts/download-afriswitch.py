import os
from datasets import load_dataset

OUTPUT_DIR = 'C:\\Users\\USER\\Downloads\\mlc hackathon\\app\\public\\data\\afriswitch'

os.makedirs(OUTPUT_DIR, exist_ok=True)

print("Loading AfriSwitch dataset...")
dataset = load_dataset("intronhealth/AfriSwitch", split="train", trust_remote_code=True)

print(f"Dataset loaded: {len(dataset)} samples")
print(f"Features: {dataset.features}")

limit = 50
subset = dataset.select(range(min(limit, len(dataset))))

subset.save_to_disk(OUTPUT_DIR)

print(f"Saved {len(subset)} samples to {OUTPUT_DIR}")
