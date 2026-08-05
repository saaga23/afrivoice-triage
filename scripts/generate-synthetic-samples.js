const fs = require('fs');
const path = require('path');
const https = require('https');

const SAHARA_API_KEY = 'HE1hzy5i4-S1h8qdTgvAtzQe7MDi7Who2h_wAV1xxDAetU9BGygfb8MGGyXuBNwfQmtYi_EQeMnEUG8eL5MCzg';
const OUTPUT_DIR = 'C:\\Users\\USER\\Downloads\\mlc hackathon\\app\\public\\data\\synthetic-samples';
const INTRON_VOICE_BASE = 'https://infer.voice.intron.io';

const samples = [
  {
    id: 'sample-01',
    text: 'Ninahisi maumivu ya kichwa na joto la mwili. I think I need to see a doctor immediately.',
    language: 'swahili-english',
    gender: 'female',
    accent: 'swahili',
    metadata: { language: 'swahili', code_switch: 'en', cmi: 0.35, duration_estimate: 8 }
  },
  {
    id: 'sample-02',
    text: 'Mo head dey pain me well well. I don\'t know if it\'s malaria or just stress from work.',
    language: 'pidgin-english',
    gender: 'male',
    accent: 'nigerian',
    metadata: { language: 'pidgin', code_switch: 'en', cmi: 0.25, duration_estimate: 9 }
  },
  {
    id: 'sample-03',
    text: 'O ni iru ori. Mo fe lo si dokita bayi. Can you help me find a clinic nearby?',
    language: 'yoruba-english',
    gender: 'female',
    accent: 'yoruba',
    metadata: { language: 'yoruba', code_switch: 'en', cmi: 0.40, duration_estimate: 10 }
  },
  {
    id: 'sample-04',
    text: 'Ina dauwa da zazzaɓar jiki. Please I need urgent care, my temperature is very high.',
    language: 'hausa-english',
    gender: 'male',
    accent: 'hausa',
    metadata: { language: 'hausa', code_switch: 'en', cmi: 0.30, duration_estimate: 9 }
  },
  {
    id: 'sample-05',
    text: 'Umariko nkuru numwe. Ndinotoda kuenda kuna dokotira nhasi. Where is the nearest hospital?',
    language: 'shona-english',
    gender: 'female',
    accent: 'shona',
    metadata: { language: 'shona', code_switch: 'en', cmi: 0.35, duration_estimate: 10 }
  },
  {
    id: 'sample-06',
    text: 'Ndi flu. Ndinokuvara mumusoro. I need some pain relievers, can you recommend something?',
    language: 'shona-english',
    gender: 'male',
    accent: 'shona',
    metadata: { language: 'shona', code_switch: 'en', cmi: 0.28, duration_estimate: 10 }
  },
  {
    id: 'sample-07',
    text: 'Ndebwe n\'induru. Please help me, I need medicine for my headache.',
    language: 'kinyarwanda-english',
    gender: 'female',
    accent: 'kinyarwanda',
    metadata: { language: 'kinyarwanda', code_switch: 'en', cmi: 0.22, duration_estimate: 8 }
  },
  {
    id: 'sample-08',
    text: 'Kulumbe ndikwete nkhope yofanana. I think this is an allergic reaction to something I ate.',
    language: 'chichewa-english',
    gender: 'male',
    accent: 'malawian',
    metadata: { language: 'chichewa', code_switch: 'en', cmi: 0.30, duration_estimate: 10 }
  },
];

function httpGet(url, headers = {}) {
  return new Promise((resolve, reject) => {
    const mod = url.startsWith('https') ? https : require('http');
    const req = mod.get(url, { headers }, (res) => {
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => resolve({ status: res.statusCode, buffer: Buffer.concat(chunks) }));
    });
    req.on('error', reject);
  });
}

async function generateSample(sample) {
  const body = JSON.stringify({
    text: sample.text,
    voice_accent: sample.accent,
    voice_gender: sample.gender,
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
    throw new Error(`TTS failed for ${sample.id}: ${response.status} ${errorText}`);
  }

  const result = await response.json();
  let audioPath = result.data?.audio_path;
  const textId = result.data?.text_id;

  if (!audioPath && textId) {
    audioPath = await pollTTSAudio(textId);
  }

  if (!audioPath) {
    throw new Error(`TTS missing audio_path for ${sample.id}`);
  }

  const { buffer } = await httpGet(audioPath);
  const audioFilename = `${sample.id}.wav`;
  const audioPathLocal = path.join(OUTPUT_DIR, audioFilename);
  fs.writeFileSync(audioPathLocal, buffer);

  const metadata = {
    id: sample.id,
    text: sample.text,
    language: sample.language,
    gender: sample.gender,
    accent: sample.accent,
    audio_file: audioFilename,
    generated_by: 'Sahara TTS (Intron Voice API)',
    generated_at: new Date().toISOString(),
    ...sample.metadata
  };

  const metadataPath = path.join(OUTPUT_DIR, `${sample.id}.json`);
  fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2));

  console.log(`Generated: ${sample.id} (${sample.language})`);
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

  const manifest = {
    dataset_name: 'AfriVoice Synthetic Code-Switched Samples',
    description: 'Synthetic code-switched audio samples generated using Intron Sahara TTS for demo and benchmarking purposes.',
    total_samples: samples.length,
    languages: [...new Set(samples.map(s => s.language))],
    generated_at: new Date().toISOString(),
    samples: []
  };

  for (const sample of samples) {
    try {
      await generateSample(sample);
      manifest.samples.push({
        id: sample.id,
        language: sample.language,
        text: sample.text
      });
    } catch (error) {
      console.error(`Failed to generate ${sample.id}:`, error.message);
    }
  }

  fs.writeFileSync(path.join(OUTPUT_DIR, 'manifest.json'), JSON.stringify(manifest, null, 2));
  console.log(`\nGenerated ${manifest.samples.length} samples`);
  console.log(`Manifest saved to ${path.join(OUTPUT_DIR, 'manifest.json')}`);
}

main().catch(console.error);
