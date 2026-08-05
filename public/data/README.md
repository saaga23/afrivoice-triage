# Benchmark Data

## Real Samples (AfriSwitch)

Intron-provided code-switching benchmark dataset. Local copies are 20-sample
subsets of each official test split, saved in Hugging Face `datasets` format
(`.arrow`) with audio, transcription, code-mixing index (CMI), and switch-point
metadata.

| Config | Local Subset | Source Test Split | Features |
|--------|--------------|-------------------|----------|
| Swahili–English | 20 | 650 | audio, transcription, CMI, switch points |
| Yoruba–English | 20 | 1,877 | same |
| Hausa–English | 20 | 1,515 | same |
| Igbo–English | 20 | 1,848 | same |
| Pidgin–English | 20 | 1,801 | same |
| Shona–English | 20 | 1,155 | same |

Full dataset: AfriSwitch — 54.41 hours, 14 language pairs, 16,602 utterances.  
Source: [intronhealth/AfriSwitch](https://huggingface.co/datasets/intronhealth/AfriSwitch) (Intron Health)  
License: [CC BY NC SA 4.0](https://creativecommons.org/licenses/by-nc-sa/4.0/) (used for non-commercial benchmark evaluation only)

## Synthetic Samples

Generated via Sahara TTS for supplementary demo/benchmark coverage. Each sample
ships with a JSON sidecar carrying the required submission metadata:
language pair, domain (health), accent, gender, device type (synthetic/studio),
noise conditions (clean), and code-mixing index.

| Sample | Language Pair | Accent | Gender |
|--------|---------------|--------|--------|
| sample-01 | Swahili–English | swahili | female |
| sample-03 | Yoruba–English | yoruba | female |
| sample-04 | Hausa–English | hausa | male |
| sample-05 | Shona–English | shona | female |
| sample-06 | Shona–English | shona | male |
| sample-07 | Kinyarwanda–English | kinyarwanda | male |

**Note:** Synthetic samples are clearly labeled in metadata and are
supplementary only. Real AfriSwitch samples are the primary benchmark source.
sample-02 was dropped during generation (6 samples total).
