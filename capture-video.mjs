import { chromium } from 'playwright';
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const FRAMES_DIR = '/tmp/video-frames';
const OUT_FILE = '/home/runner/workspace/pepscan-demo.mp4';
const VIDEO_URL = 'http://localhost:80/video.html';
// Total video duration: 3+3+5+4+3+3 = 21 seconds. Add 1s buffer.
const DURATION_MS = 22000;
const FPS = 30;

if (fs.existsSync(FRAMES_DIR)) fs.rmSync(FRAMES_DIR, { recursive: true });
fs.mkdirSync(FRAMES_DIR, { recursive: true });

const browser = await chromium.launch({
  headless: true,
  executablePath: '/nix/store/97i48clxaw4l9g4klvfp3l6xks7zyl3v-playwright-chromium/chrome-linux/chrome',
  args: ['--no-sandbox'],
});
const context = await browser.newContext({
  viewport: { width: 414, height: 896 },
});
const page = await context.newPage();

// Skip the recording overlay by auto-clicking "Just watch"
page.on('load', async () => {
  try {
    await page.click('#skip-btn', { timeout: 2000 });
  } catch {}
});

await page.goto(VIDEO_URL, { waitUntil: 'networkidle', timeout: 30000 });

// Try clicking skip button
try { await page.click('#skip-btn', { timeout: 3000 }); } catch {}

// Wait for animations to start
await page.waitForTimeout(1000);

// Capture frames
const frameInterval = Math.round(1000 / FPS);
const totalFrames = Math.ceil(DURATION_MS / frameInterval);
console.log(`Capturing ${totalFrames} frames at ${FPS}fps...`);

for (let i = 0; i < totalFrames; i++) {
  const framePath = path.join(FRAMES_DIR, `frame-${String(i).padStart(5, '0')}.png`);
  await page.screenshot({ path: framePath, type: 'png' });
  if (i % 30 === 0) console.log(`Frame ${i}/${totalFrames}`);
  await page.waitForTimeout(frameInterval);
}

await browser.close();
console.log('Frames captured, running ffmpeg...');

execSync(`ffmpeg -y -framerate ${FPS} -i ${FRAMES_DIR}/frame-%05d.png -c:v libx264 -pix_fmt yuv420p -crf 20 -movflags +faststart ${OUT_FILE}`, { stdio: 'inherit' });

fs.rmSync(FRAMES_DIR, { recursive: true });
console.log('Done:', OUT_FILE);