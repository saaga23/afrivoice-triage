const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const FFMPEG = 'C:\\Users\\USER\\AppData\\Local\\Temp\\kilo\\ffmpeg\\ffmpeg-9.0-essentials_build\\bin\\ffmpeg.exe';
const FRAMES_DIR = 'C:\\Users\\USER\\Downloads\\mlc hackathon\\app\\public\\demo-frames';
const OUTPUT_DIR = 'C:\\Users\\USER\\Downloads\\mlc hackathon\\app\\public\\demo-video';

const segments = [
  { file: '01-hero.png', duration: 5 },
  { file: '02-scrolled.png', duration: 3 },
  { file: '03-bottom.png', duration: 3 },
  { file: '04-demo-section.png', duration: 4 },
  { file: '05-chat-empty.png', duration: 4 },
  { file: '06-chat-response.png', duration: 6 },
  { file: '07-benchmark.png', duration: 5 },
  { file: '08-benchmark-mid.png', duration: 5 },
];

const segmentFiles = [];

for (let i = 0; i < segments.length; i++) {
  const seg = segments[i];
  const inputPath = path.join(FRAMES_DIR, seg.file);
  const outputPath = path.join(OUTPUT_DIR, `seg-${String(i + 1).padStart(2, '0')}.mp4`);
  segmentFiles.push(outputPath);

  // Simple slideshow: loop image for duration, no text overlay
  const cmd = `"${FFMPEG}" -loop 1 -i "${inputPath}" -c:v libx264 -t ${seg.duration} -pix_fmt yuv420p -vf "fps=30,scale=1280:720:force_original_aspect_ratio=decrease,pad=1280:720:-1:-1:color=black" -y "${outputPath}"`;
  
  console.log(`Creating segment ${i + 1}/${segments.length}: ${seg.file}`);
  try {
    execSync(cmd, { stdio: 'pipe' });
  } catch (e) {
    console.error(`Failed to create segment ${i + 1}:`, e.message);
  }
}

// Create concat list
const concatList = segmentFiles.map(f => `file '${f.replace(/\\/g, '/')}'`).join('\n');
const concatListPath = path.join(OUTPUT_DIR, 'concat-list.txt');
fs.writeFileSync(concatListPath, concatList);

// Concatenate segments with audio
const concatCmd = `"${FFMPEG}" -f concat -safe 0 -i "${concatListPath}" -i "${OUTPUT_DIR.replace(/\\/g, '/')}/audio/background-tone.mp3" -c:v copy -c:a aac -shortest -y "${OUTPUT_DIR.replace(/\\/g, '/')}/afrivoice-demo.mp4"`;
console.log('Concatenating segments...');
try {
  execSync(concatCmd, { stdio: 'pipe' });
  console.log('Video created successfully!');
  console.log('Output: ' + path.join(OUTPUT_DIR, 'afrivoice-demo.mp4'));
} catch (e) {
  console.error('Failed to concatenate:', e.message);
}
