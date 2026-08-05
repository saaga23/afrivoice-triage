/* eslint-disable @typescript-eslint/no-require-imports */
const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const FFMPEG = 'C:\\Users\\USER\\AppData\\Local\\Temp\\kilo\\ffmpeg\\ffmpeg-9.0-essentials_build\\bin\\ffmpeg.exe';
const FRAMES_DIR = 'C:\\Users\\USER\\Downloads\\mlc hackathon\\app\\public\\demo-frames';
const AUDIO_DIR = 'C:\\Users\\USER\\Downloads\\mlc hackathon\\app\\public\\demo-video\\audio';
const OUTPUT_DIR = 'C:\\Users\\USER\\Downloads\\mlc hackathon\\app\\public\\demo-video';

const segments = [
  { file: '01-hero.png', audio: '01-title.wav', duration: 8 },
  { file: '02-scrolled.png', audio: '02-hero.wav', duration: 10 },
  { file: '03-bottom.png', audio: '03-demo.wav', duration: 8 },
  { file: '04-demo-section.png', audio: '04-consent.wav', duration: 8 },
  { file: '05-chat-empty.png', audio: '05-input.wav', duration: 7 },
  { file: '06-chat-response.png', audio: '06-agent.wav', duration: 8 },
  { file: '07-benchmark.png', audio: '07-benchmark.wav', duration: 10 },
  { file: '08-benchmark-mid.png', audio: '08-closing.wav', duration: 10 },
];

const segmentFiles = [];

for (let i = 0; i < segments.length; i++) {
  const seg = segments[i];
  const inputPath = path.join(FRAMES_DIR, seg.file);
  const audioPath = path.join(AUDIO_DIR, seg.audio);
  const outputPath = path.join(OUTPUT_DIR, `seg-${String(i + 1).padStart(2, '0')}.mp4`);
  segmentFiles.push(outputPath);

  const cmd = `"${FFMPEG}" -loop 1 -i "${inputPath}" -i "${audioPath}" -c:v libx264 -t ${seg.duration} -pix_fmt yuv420p -vf "fps=30,scale=1280:720:force_original_aspect_ratio=decrease,pad=1280:720:-1:-1:color=black" -c:a aac -shortest -y "${outputPath}"`;

  console.log(`Creating segment ${i + 1}/${segments.length}: ${seg.file} + ${seg.audio}`);
  try {
    execSync(cmd, { stdio: 'pipe' });
  } catch (e) {
    console.error(`Failed to create segment ${i + 1}:`, e.message);
  }
}

const concatList = segmentFiles.map(f => `file '${f.replace(/\\/g, '/')}'`).join('\n');
const concatListPath = path.join(OUTPUT_DIR, 'concat-list.txt');
fs.writeFileSync(concatListPath, concatList);

const concatCmd = `"${FFMPEG}" -f concat -safe 0 -i "${concatListPath}" -c:v copy -c:a aac -shortest -y "${OUTPUT_DIR.replace(/\\/g, '/')}/afrivoice-demo.mp4"`;
console.log('Concatenating segments...');
try {
  execSync(concatCmd, { stdio: 'pipe' });
  console.log('Video created successfully!');
  console.log('Output: ' + path.join(OUTPUT_DIR, 'afrivoice-demo.mp4'));
} catch (e) {
  console.error('Failed to concatenate:', e.message);
}
