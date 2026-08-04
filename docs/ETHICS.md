# Ethics & Inclusion Note

## Privacy
No patient data is stored. Audio is processed temporarily in memory and discarded after the session ends. No recordings are persisted, logged, or used for any purpose beyond the immediate triage response.

## Consent
Explicit consent is required before any voice recording begins. Users must actively agree via a consent modal that explains voice processing, temporary storage, and the non-diagnostic nature of the system. Users may decline and still access the text-based interface.

## Safety
AfriVoice Triage does not provide definitive diagnoses. It recommends next steps and advises users to consult qualified healthcare professionals. Emergency symptoms trigger HIGH urgency classification with explicit instructions to seek immediate care.

## Cultural Awareness
The system is designed for code-switched speech across English, Swahili, Yoruba, Hausa, Amharic, Zulu, and Kinyarwanda. It does not impose Western-language bias and responds in the language mix the patient uses.

## Accessibility
Voice-first design prioritizes low-literacy populations and users with limited access to digital interfaces. The interface works on basic smartphones and low-bandwidth connections.

## Dataset Ethics
Benchmarking uses the AfriSwitch dataset (CC BY NC SA 4.0), which contains simulated consultations. All samples are used in accordance with the license terms. No real patient data is included in submitted audio samples without explicit consent.

## Bias Mitigation
The benchmark evaluates per-language and per-accent WER to surface disparities. Models are tested across the full diversity of African speech patterns, not just dominant varieties.

## Data Deletion
No persistent storage exists. Audio, transcriptions, and session data are held in volatile memory only and are unrecoverable after the session ends.
