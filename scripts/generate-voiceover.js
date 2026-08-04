const fs = require('fs');
const path = require('path');

const SAHARA_API_KEY = 'HE1hzy5i4-S1h8qdTgvAtzQe7MDi7Who2h_wAV1xxDAetU9BGygfb8MGGyXuBNwfQmtYi_EQeMnEUG8eL5MCzg';
const OUTPUT_DIR = 'C:\\Users\\USER\\Downloads\\mlc hackathon\\app\\public\\demo-video\\audio';
const FRAMES_DIR = 'C:\\Users\\USER\\Downloads\\mlc hackathon\\app\\public\\demo-frames';

const scenes = [
  { id: '01-title', text: 'AfriVoice Triage: Agentic Voice AI for African Healthcare', duration: 8 },
  { id: '02-hero', text: 'Voice-driven symptom triage that understands code-switched speech. Built on Intron Sahara, powered by LangGraph reasoning.', duration: 10 },
  { id: '03-demo', text: 'Speak or type symptoms in English, Swahili, Yoruba, Hausa, and more. Our agent will triage your case.', duration: 8 },
  { id: '04-consent', text: 'Privacy first. This application records voice for medical triage purposes. Audio is processed temporarily and not stored.', duration: 8 },
  { id: '05-input', text: 'Patient describes symptoms in Swahili: "Ninahisi maumivu ya kichwa na joto la mwili."', duration: 7 },
  { id: '06-agent', text: 'The AI agent classifies intent as triage, assesses urgency as high, and recommends next steps.', duration: 8 },
  { id: '07-benchmark', text: 'Benchmarking Sahara v2 against Whisper Large v3 and GPT-4o Audio on code-switched African languages.', duration: 10 },
  { id: '08-closing', text: 'Built for Africa, by Africa. AfriVoice Triage — MLC Africa times Intron Agentic Voice AI Challenge 2026.', duration: 10 },
];

async function generateTTS(text, outputPath) {
  const response = await fetch('https://app.saharaai.com/developer/api/compute/v1/audio/speech', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': SAHARA_API_KEY,
    },
    body: JSON.stringify({
      model: 'sahara-v2-tts',
      input: text,
      voice: 'alloy',
      speed: 1.0,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Sahara TTS failed: ${response.status} ${errorText}`);
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  fs.writeFileSync(outputPath, buffer);
  console.log(`Generated: ${outputPath}`);
}

async function main() {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  for (const scene of scenes) {
    const outputPath = path.join(OUTPUT_DIR, `${scene.id}.mp3`);
    try {
      await generateTTS(scene.text, outputPath);
    } catch (error) {
      console.error(`Failed to generate audio for ${scene.id}:`, error.message);
    }
  }

  console.log('All audio generation complete!');
}

main().catch(console.error);
