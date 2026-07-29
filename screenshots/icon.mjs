import puppeteer from 'puppeteer-core';
import { writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CHROME = '/nix/store/gasnw5878924jbw6bql257ll29hkm4fd-chromium-123.0.6312.105/bin/chromium';
const SIZE = 1024;

const html = `<!DOCTYPE html><html><head><meta charset="utf-8">
<style>
* { margin:0; padding:0; box-sizing:border-box; }
body { width:${SIZE}px; height:${SIZE}px; overflow:hidden; background:#000; }
</style></head><body>
<svg width="${SIZE}" height="${SIZE}" viewBox="0 0 1024 1024" fill="none" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <!-- Background gradient -->
    <linearGradient id="bgGrad" x1="0" y1="0" x2="1024" y2="1024" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#0C1220"/>
      <stop offset="100%" stop-color="#070A10"/>
    </linearGradient>
    <!-- Teal gradient for vial liquid -->
    <linearGradient id="liquidGrad" x1="0" y1="0" x2="0" y2="1" gradientUnits="objectBoundingBox">
      <stop offset="0%" stop-color="#1FE8B8" stop-opacity="0.6"/>
      <stop offset="100%" stop-color="#14C9A0" stop-opacity="0.95"/>
    </linearGradient>
    <!-- Vial glass gradient -->
    <linearGradient id="glassGrad" x1="0" y1="0" x2="1" y2="0" gradientUnits="objectBoundingBox">
      <stop offset="0%" stop-color="#1a2840"/>
      <stop offset="40%" stop-color="#0f1c30"/>
      <stop offset="100%" stop-color="#162235"/>
    </linearGradient>
    <!-- Teal glow -->
    <radialGradient id="glowGrad" cx="50%" cy="65%" r="45%">
      <stop offset="0%" stop-color="#14C9A0" stop-opacity="0.18"/>
      <stop offset="100%" stop-color="#14C9A0" stop-opacity="0"/>
    </radialGradient>
    <!-- Scan line gradient -->
    <linearGradient id="scanLine" x1="0" y1="0" x2="1" y2="0" gradientUnits="objectBoundingBox">
      <stop offset="0%" stop-color="#14C9A0" stop-opacity="0"/>
      <stop offset="30%" stop-color="#14C9A0" stop-opacity="1"/>
      <stop offset="70%" stop-color="#14C9A0" stop-opacity="1"/>
      <stop offset="100%" stop-color="#14C9A0" stop-opacity="0"/>
    </linearGradient>
    <!-- Clip for vial inner -->
    <clipPath id="vialClip">
      <rect x="390" y="280" width="244" height="490" rx="20"/>
    </clipPath>
    <!-- Drop shadow filter -->
    <filter id="vialShadow" x="-20%" y="-10%" width="140%" height="120%">
      <feDropShadow dx="0" dy="8" stdDeviation="20" flood-color="#14C9A0" flood-opacity="0.25"/>
    </filter>
    <filter id="cornerGlow" x="-50%" y="-50%" width="200%" height="200%">
      <feDropShadow dx="0" dy="0" stdDeviation="6" flood-color="#14C9A0" flood-opacity="0.9"/>
    </filter>
  </defs>

  <!-- Background -->
  <rect width="1024" height="1024" fill="url(#bgGrad)"/>
  
  <!-- Subtle dot grid -->
  <pattern id="dots" x="0" y="0" width="40" height="40" patternUnits="userSpaceOnUse">
    <circle cx="20" cy="20" r="1.2" fill="#14C9A0" opacity="0.08"/>
  </pattern>
  <rect width="1024" height="1024" fill="url(#dots)"/>

  <!-- Radial teal glow behind vial -->
  <ellipse cx="512" cy="560" rx="280" ry="260" fill="url(#glowGrad)"/>

  <!-- ── VIAL ── -->
  <!-- Vial stopper/cap at top -->
  <rect x="432" y="256" width="160" height="48" rx="8" fill="#1a2840" stroke="#2a3f5c" stroke-width="1.5"/>
  <rect x="452" y="262" width="120" height="36" rx="6" fill="#0f1820"/>
  <!-- Cap highlight -->
  <rect x="452" y="262" width="120" height="10" rx="4" fill="rgba(255,255,255,0.06)"/>

  <!-- Vial body glass -->
  <rect x="390" y="280" width="244" height="490" rx="22" fill="url(#glassGrad)" filter="url(#vialShadow)" stroke="rgba(20,201,160,0.20)" stroke-width="1.5"/>
  
  <!-- Glass left edge highlight -->
  <rect x="390" y="292" width="18" height="466" rx="9" fill="rgba(255,255,255,0.04)"/>
  <!-- Glass right edge subtle -->
  <rect x="616" y="292" width="18" height="466" rx="9" fill="rgba(0,0,0,0.15)"/>

  <!-- Liquid fill (clipped to vial) -->
  <g clip-path="url(#vialClip)">
    <!-- Liquid background teal -->
    <rect x="390" y="530" width="244" height="240" fill="url(#liquidGrad)"/>
    <!-- Liquid surface wave effect -->
    <ellipse cx="512" cy="532" rx="122" ry="10" fill="#1FE8B8" opacity="0.5"/>
    <!-- Liquid shimmer -->
    <rect x="410" y="545" width="30" height="200" rx="15" fill="rgba(255,255,255,0.07)"/>
    <!-- Bubble -->
    <circle cx="470" cy="600" r="6" fill="rgba(255,255,255,0.12)" stroke="rgba(255,255,255,0.2)" stroke-width="1"/>
    <circle cx="550" cy="660" r="4" fill="rgba(255,255,255,0.1)" stroke="rgba(255,255,255,0.18)" stroke-width="1"/>
  </g>

  <!-- Vial bottom rounded cap -->
  <ellipse cx="512" cy="770" rx="122" ry="22" fill="#0d1520" stroke="rgba(20,201,160,0.15)" stroke-width="1.5"/>

  <!-- Volume graduation marks -->
  <line x1="620" y1="520" x2="638" y2="520" stroke="rgba(20,201,160,0.5)" stroke-width="2" stroke-linecap="round"/>
  <line x1="620" y1="580" x2="634" y2="580" stroke="rgba(20,201,160,0.3)" stroke-width="1.5" stroke-linecap="round"/>
  <line x1="620" y1="640" x2="638" y2="640" stroke="rgba(20,201,160,0.5)" stroke-width="2" stroke-linecap="round"/>
  <line x1="620" y1="700" x2="634" y2="700" stroke="rgba(20,201,160,0.3)" stroke-width="1.5" stroke-linecap="round"/>

  <!-- ── SCAN BRACKETS ── -->
  <!-- Top-left corner bracket -->
  <path d="M310 370 L310 320 L360 320" stroke="#14C9A0" stroke-width="10" stroke-linecap="round" stroke-linejoin="round" fill="none" filter="url(#cornerGlow)"/>
  <!-- Top-right corner bracket -->
  <path d="M714 370 L714 320 L664 320" stroke="#14C9A0" stroke-width="10" stroke-linecap="round" stroke-linejoin="round" fill="none" filter="url(#cornerGlow)"/>
  <!-- Bottom-left corner bracket -->
  <path d="M310 660 L310 710 L360 710" stroke="#14C9A0" stroke-width="10" stroke-linecap="round" stroke-linejoin="round" fill="none" filter="url(#cornerGlow)"/>
  <!-- Bottom-right corner bracket -->
  <path d="M714 660 L714 710 L664 710" stroke="#14C9A0" stroke-width="10" stroke-linecap="round" stroke-linejoin="round" fill="none" filter="url(#cornerGlow)"/>

  <!-- ── SCAN LINE sweeping across liquid level ── -->
  <rect x="310" y="526" width="404" height="3" rx="1.5" fill="url(#scanLine)" opacity="0.85"/>
  <!-- Scan line side ticks -->
  <rect x="308" y="518" width="3" height="18" rx="1.5" fill="#14C9A0" opacity="0.7"/>
  <rect x="713" y="518" width="3" height="18" rx="1.5" fill="#14C9A0" opacity="0.7"/>
</svg>
</body></html>`;

async function render() {
  const browser = await puppeteer.launch({
    executablePath: CHROME,
    args: ['--no-sandbox','--disable-setuid-sandbox','--disable-gpu','--disable-dev-shm-usage'],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: SIZE, height: SIZE, deviceScaleFactor: 1 });
  await page.setContent(html, { waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 300));
  const out = path.join(__dirname, 'AppIcon-1024.png');
  await page.screenshot({ path: out, type: 'png', clip: { x:0, y:0, width:SIZE, height:SIZE } });
  console.log('Icon saved:', out);
  await browser.close();
}

render().catch(e => { console.error(e); process.exit(1); });
