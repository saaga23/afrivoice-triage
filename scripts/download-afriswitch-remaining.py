import os
from datasets import load_dataset

OUTPUT_DIR = 'C:\\Users\\USER\\Downloads\\mlc hackathon\\app\\public\\data\\afriswitch'

configs = ['hausa', 'igbo', 'pidgin', 'shona']

for config in configs:
    try:
        print(f"\nLoading AfriSwitch config: {config}...")
        dataset = load_dataset("intronhealth/AfriSwitch", config, split="test", trust_remote_code=False)
        print(f"Loaded {config}: {len(dataset)} samples")
        
        subset = dataset.select(range(min(20, len(dataset))))
        subset.save_to_disk(os.path.join(OUTPUT_DIR, config))
        print(f"Saved {config} to {OUTPUT_DIR}/{config}")
    except Exception as e:
        print(f"FAILED {config}: {e}")

print("\nDone.")
