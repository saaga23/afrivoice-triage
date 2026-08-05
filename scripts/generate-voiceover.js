/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');

const SAHARA_API_KEY = process.env.SAHARA_API_KEY;
if (!SAHARA_API_KEY) throw new Error('Set SAHARA_API_KEY env var');
const OUTPUT_DIR = 'C:\\Users\\USER\\Downloads\\mlc hackathon\\app\\public\\demo-video\\audio';
const INTRON_VOICE_BASE = 'https://infer.voice.intron.io';

const scenes = [
  { id: '01-intro', text: 'AfriVoice Triage. Agentic voice AI for African healthcare.', duration: 5 },
  { id: '02-problem', text: 'Across Africa, patients describe symptoms by code-switching between English and their local language. Generic speech AI fails them.', duration: 8 },
  { id: '03-consent', text: 'Privacy first. Explicit consent before any recording. Audio is processed transiently, never stored.', duration: 7 },
  { id: '04-voice', text: 'A patient speaks in code-switched Swahili and English. Intron Sahara transcribes it in real time.', duration: 8 },
  { id: '05-agent', text: 'The LangGraph agent classifies intent, detects emergencies across seven languages, and produces a structured triage handoff card. Not a diagnosis — a next step.', duration: 11 },
  { id: '06-codeswitch', text: 'On Hausa-English code-switching, Whisper large-v3 silently deleted the entire Hausa segment of an urgent utterance. Sahara kept both language spans.', duration: 9 },
  { id: '07-benchmark', text: 'On code-switched health audio, Sahara v2 scores a 0.347 word error rate. Whisper, 0.450. XLS-R, 0.604. Built for Africa, by Africa.', duration: 10 },
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

  if (!response.ok && response.status !== 503) {
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
    const maxAttempts = 100; // TTS queue can back up; allow ~5 min per clip
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
