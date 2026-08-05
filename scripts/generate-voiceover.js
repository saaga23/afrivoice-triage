/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');

const SAHARA_API_KEY = 'HE1hzy5i4-S1h8qdTgvAtzQe7MDi7Who2h_wAV1xxDAetU9BGygfb8MGGyXuBNwfQmtYi_EQeMnEUG8eL5MCzg';
const OUTPUT_DIR = 'C:\\Users\\USER\\Downloads\\mlc hackathon\\app\\public\\demo-video\\audio';
const INTRON_VOICE_BASE = 'https://infer.voice.intron.io';

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

function httpGet(url, headers = {}) {
  return new Promise((resolve, reject) => {
    const mod = url.startsWith('https') ? https : http;
    const req = mod.get(url, { headers }, (res) => {
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => resolve({ status: res.statusCode, buffer: Buffer.concat(chunks) }));
    });
    req.on('error', reject);
  });
}

async function generateTTS(text, outputPath) {
  const body = JSON.stringify({
    text,
    voice_accent: 'swahili',
    voice_gender: 'female',
    voice_language: 'en',
  });

  const response = await fetch(`${INTRON_VOICE_BASE}/tts/v1/generate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${SAHARA_API_KEY}`,
    },
    body,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Sahara TTS failed: ${response.status} ${errorText}`);
  }

  const result = await response.json();
  const audioPath = result.data?.audio_path;
  const textId = result.data?.text_id;

  if (!audioPath && !textId) {
    throw new Error(`Sahara TTS missing audio_path/text_id: ${JSON.stringify(result)}`);
  }

  let finalAudioPath = audioPath;
  if (!finalAudioPath && textId) {
    finalAudioPath = await pollTTSAudio(textId);
  }

  const { buffer } = await httpGet(finalAudioPath);
  fs.writeFileSync(outputPath, buffer);
  console.log(`Generated: ${outputPath}`);
}

function pollTTSAudio(textId) {
  return new Promise((resolve, reject) => {
    let attempts = 0;
    const maxAttempts = 20;
    const intervalMs = 3000;

    async function poll() {
      attempts++;
      const { status, buffer } = await httpGet(`${INTRON_VOICE_BASE}/tts/v1/status/${encodeURIComponent(textId)}`, {
        'Authorization': `Bearer ${SAHARA_API_KEY}`,
      });

      const result = JSON.parse(buffer.toString());
      const processingStatus = result.data?.processing_status;

      if (processingStatus === 'TTS_TEXT_AUDIO_GENERATED') {
        const audioPath = result.data?.audio_path;
        if (!audioPath) {
          return reject(new Error(`TTS status missing audio_path: ${JSON.stringify(result)}`));
        }
        resolve(audioPath);
        return;
      }

      if (processingStatus === 'TTS_TEXT_AUDIO_PROCESSING_FAILED') {
        return reject(new Error(`TTS failed: ${result.data?.error_message || 'processing failed'}`));
      }

      if (attempts >= maxAttempts) {
        return reject(new Error('Sahara TTS timed out waiting for audio generation'));
      }

      setTimeout(poll, intervalMs);
    }

    poll();
  });
}

async function main() {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  for (const scene of scenes) {
    const outputPath = path.join(OUTPUT_DIR, `${scene.id}.wav`);
    try {
      await generateTTS(scene.text, outputPath);
    } catch (error) {
      console.error(`Failed to generate audio for ${scene.id}:`, error.message);
    }
  }

  console.log('All audio generation complete!');
}

main().catch(console.error);
