import puppeteer from 'puppeteer-core';
import { mkdirSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
mkdirSync(__dirname, { recursive: true });

const CHROME = '/nix/store/gasnw5878924jbw6bql257ll29hkm4fd-chromium-123.0.6312.105/bin/chromium';

// App Store 13" iPad Pro: 2048×2732
const W = 2048, H = 2732;

const TEAL = '#14C9A0';
const TEAL2 = '#2EDFC8';
const BG = '#07090F';

const FONT = `@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');`;

const baseCSS = `
  * { margin:0; padding:0; box-sizing:border-box; }
  body { width:${W}px; height:${H}px; overflow:hidden; background:${BG};
         font-family:'Plus Jakarta Sans',sans-serif; color:#fff; }
`;

// ─── SCREEN CONTENT (same as iPhone but slightly more padding) ────────────────

function screen1HTML() {
  return `<div style="height:100%;background:linear-gradient(180deg,#0d1520 0%,#070b12 100%);display:flex;flex-direction:column;align-items:center;padding:32px 40px 40px;">
    <div style="width:100%;display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;">
      <span style="font-size:28px;font-weight:700;color:#fff;letter-spacing:-0.5px;">PepScan</span>
      <span style="font-size:20px;color:${TEAL};font-weight:600;background:rgba(20,201,160,0.12);padding:6px 18px;border-radius:20px;">Pro</span>
    </div>
    <div style="width:180px;height:180px;margin:20px auto 18px;position:relative;">
      <div style="position:absolute;inset:0;background:radial-gradient(circle,rgba(20,201,160,0.25) 0%,transparent 70%);border-radius:50%;"></div>
      <svg width="180" height="180" viewBox="0 0 110 110" fill="none">
        <rect x="22" y="8" width="66" height="94" rx="12" fill="#1a2535" stroke="rgba(20,201,160,0.4)" stroke-width="1.5"/>
        <rect x="28" y="16" width="54" height="78" rx="8" fill="#0d1520"/>
        <rect x="44" y="28" width="22" height="52" rx="4" fill="rgba(20,201,160,0.1)" stroke="${TEAL}" stroke-width="1.5"/>
        <rect x="44" y="58" width="22" height="22" fill="rgba(20,201,160,0.35)"/>
        <line x1="35" y1="52" x2="42" y2="52" stroke="${TEAL}" stroke-width="2" stroke-linecap="round"/>
        <line x1="68" y1="52" x2="75" y2="52" stroke="${TEAL}" stroke-width="2" stroke-linecap="round"/>
        <line x1="35" y1="48" x2="35" y2="56" stroke="${TEAL}" stroke-width="2" stroke-linecap="round"/>
        <line x1="75" y1="48" x2="75" y2="56" stroke="${TEAL}" stroke-width="2" stroke-linecap="round"/>
      </svg>
    </div>
    <div style="text-align:center;margin-bottom:14px;">
      <div style="font-size:36px;font-weight:800;color:#fff;letter-spacing:-0.5px;line-height:1.2;">Visual QC for Peptide Vials</div>
      <div style="font-size:20px;color:rgba(255,255,255,0.45);margin-top:10px;line-height:1.5;">Spot contamination, particulates &amp; reconstitution issues in seconds</div>
    </div>
    <div style="width:100%;background:linear-gradient(135deg,${TEAL} 0%,#0fa882 100%);border-radius:20px;padding:22px;text-align:center;margin:16px 0;box-shadow:0 8px 24px rgba(20,201,160,0.3);">
      <span style="font-size:26px;font-weight:700;color:#fff;">Start New Scan</span>
    </div>
    <div style="width:100%;display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-top:10px;">
      ${['📋  History','⚗️  Calculator','📖  Setup Guide','⭐  Go Pro'].map(t=>`
      <div style="background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.07);border-radius:18px;padding:18px 20px;font-size:20px;color:rgba(255,255,255,0.7);font-weight:500;">${t}</div>`).join('')}
    </div>
    <div style="margin-top:18px;background:rgba(245,158,11,0.08);border:1px solid rgba(245,158,11,0.2);border-radius:14px;padding:14px 18px;font-size:18px;color:rgba(245,158,11,0.8);line-height:1.4;width:100%;">
      ⚠️ Research use only — not a medical device
    </div>
  </div>`;
}

function screen2HTML() {
  return `<div style="height:100%;background:linear-gradient(180deg,#0d1520 0%,#070b12 100%);display:flex;flex-direction:column;padding:32px 36px 40px;">
    <div style="font-size:24px;font-weight:700;color:#fff;margin-bottom:20px;">Step 2 of 4 — Capture</div>
    <div style="display:flex;gap:8px;margin-bottom:26px;">
      ${[1,2,3,4].map((n,i)=>`<div style="flex:1;height:5px;border-radius:4px;background:${i<2?TEAL:'rgba(255,255,255,0.12)'};"></div>`).join('')}
    </div>
    <div style="background:rgba(255,255,255,0.96);border-radius:22px;padding:18px;margin-bottom:18px;">
      <div style="height:160px;display:flex;align-items:center;justify-content:center;position:relative;">
        <div style="width:56px;height:130px;background:linear-gradient(180deg,rgba(20,201,160,0.15) 0%,rgba(20,201,160,0.35) 100%);border-radius:6px;border:2px solid rgba(20,201,160,0.6);"></div>
        <div style="position:absolute;top:8px;left:calc(50% - 50px);width:28px;height:28px;border-top:4px solid ${TEAL};border-left:4px solid ${TEAL};border-radius:3px 0 0 0;"></div>
        <div style="position:absolute;top:8px;right:calc(50% - 50px);width:28px;height:28px;border-top:4px solid ${TEAL};border-right:4px solid ${TEAL};border-radius:0 3px 0 0;"></div>
        <div style="position:absolute;bottom:8px;left:calc(50% - 50px);width:28px;height:28px;border-bottom:4px solid ${TEAL};border-left:4px solid ${TEAL};border-radius:0 0 0 3px;"></div>
        <div style="position:absolute;bottom:8px;right:calc(50% - 50px);width:28px;height:28px;border-bottom:4px solid ${TEAL};border-right:4px solid ${TEAL};border-radius:0 0 3px 0;"></div>
      </div>
      <div style="display:flex;align-items:center;justify-content:space-between;margin-top:10px;">
        <span style="font-size:20px;font-weight:700;color:#1a2535;">☀️  White Background</span>
        <span style="font-size:18px;color:${TEAL};font-weight:600;background:rgba(20,201,160,0.12);padding:4px 14px;border-radius:20px;">Captured ✓</span>
      </div>
    </div>
    <div style="background:#111820;border:2px solid ${TEAL};border-radius:22px;padding:18px;">
      <div style="height:160px;display:flex;align-items:center;justify-content:center;position:relative;">
        <div style="width:56px;height:130px;background:linear-gradient(180deg,rgba(20,201,160,0.08) 0%,rgba(20,201,160,0.22) 100%);border-radius:6px;border:2px solid rgba(20,201,160,0.5);"></div>
        <div style="position:absolute;top:8px;left:calc(50% - 50px);width:28px;height:28px;border-top:4px solid ${TEAL};border-left:4px solid ${TEAL};border-radius:3px 0 0 0;"></div>
        <div style="position:absolute;top:8px;right:calc(50% - 50px);width:28px;height:28px;border-top:4px solid ${TEAL};border-right:4px solid ${TEAL};border-radius:0 3px 0 0;"></div>
        <div style="position:absolute;bottom:8px;left:calc(50% - 50px);width:28px;height:28px;border-bottom:4px solid ${TEAL};border-left:4px solid ${TEAL};border-radius:0 0 0 3px;"></div>
        <div style="position:absolute;bottom:8px;right:calc(50% - 50px);width:28px;height:28px;border-bottom:4px solid ${TEAL};border-right:4px solid ${TEAL};border-radius:0 0 3px 0;"></div>
        <div style="position:absolute;width:80px;height:140px;border:2px solid rgba(20,201,160,0.4);border-radius:8px;"></div>
      </div>
      <div style="display:flex;align-items:center;justify-content:space-between;margin-top:10px;">
        <span style="font-size:20px;font-weight:700;color:#fff;">🌑  Black Background</span>
        <span style="font-size:18px;color:rgba(255,255,255,0.5);">Active</span>
      </div>
    </div>
    <div style="margin-top:18px;background:rgba(255,255,255,0.04);border-radius:14px;padding:14px 18px;">
      ${['Center vial — fill most of the frame','Use diffused light — no direct flash'].map(t=>`
      <div style="font-size:18px;color:rgba(255,255,255,0.55);margin-bottom:6px;display:flex;gap:8px;align-items:center;"><span style="color:${TEAL};font-size:14px;">●</span>${t}</div>`).join('')}
    </div>
    <div style="margin-top:auto;display:flex;justify-content:center;">
      <div style="width:100px;height:100px;border-radius:50%;background:linear-gradient(135deg,${TEAL} 0%,#0fa882 100%);display:flex;align-items:center;justify-content:center;box-shadow:0 0 40px rgba(20,201,160,0.4);">
        <svg width="42" height="42" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
      </div>
    </div>
  </div>`;
}

function screen3HTML() {
  const cats = [
    { name:'Clarity', score:94, color:TEAL },
    { name:'Particulates', score:88, color:TEAL },
    { name:'Color', score:71, color:'#F59E0B' },
    { name:'Fill Level', score:96, color:TEAL },
  ];
  return `<div style="height:100%;background:linear-gradient(180deg,#0d1520 0%,#070b12 100%);display:flex;flex-direction:column;padding:28px 36px 36px;overflow:hidden;">
    <div style="background:linear-gradient(135deg,rgba(20,201,160,0.12) 0%,rgba(20,201,160,0.04) 100%);border:2px solid rgba(20,201,160,0.3);border-radius:24px;padding:24px;text-align:center;margin-bottom:20px;">
      <div style="font-size:18px;text-transform:uppercase;letter-spacing:2px;color:rgba(255,255,255,0.4);margin-bottom:10px;">Triage Result</div>
      <div style="font-size:48px;font-weight:800;color:${TEAL};letter-spacing:-0.5px;">PASS</div>
      <div style="font-size:18px;color:rgba(255,255,255,0.5);margin-top:8px;">No significant visual anomalies detected</div>
      <div style="margin-top:12px;font-size:38px;font-weight:800;color:#fff;">78<span style="font-size:22px;color:rgba(255,255,255,0.4);font-weight:500;">% confidence</span></div>
    </div>
    <div style="font-size:18px;font-weight:600;color:rgba(255,255,255,0.5);text-transform:uppercase;letter-spacing:1.5px;margin-bottom:12px;">Category Scores</div>
    <div style="display:flex;flex-direction:column;gap:12px;margin-bottom:18px;">
      ${cats.map(c=>`
      <div style="background:rgba(255,255,255,0.04);border-radius:16px;padding:14px 18px;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
          <span style="font-size:20px;font-weight:600;color:#fff;">${c.name}</span>
          <span style="font-size:20px;font-weight:700;color:${c.color};">${c.score}%</span>
        </div>
        <div style="height:5px;background:rgba(255,255,255,0.08);border-radius:4px;">
          <div style="height:100%;width:${c.score}%;background:${c.color};border-radius:4px;"></div>
        </div>
      </div>`).join('')}
    </div>
    <div style="background:rgba(245,158,11,0.08);border:1px solid rgba(245,158,11,0.2);border-radius:14px;padding:14px 18px;font-size:18px;color:rgba(245,158,11,0.9);line-height:1.5;">
      ⚠️  Slight color variation detected — may be normal oxidation. Verify against your expected appearance profile.
    </div>
    <div style="display:flex;gap:14px;margin-top:auto;">
      ${['💾  Save','📤  Share','📄  PDF'].map(t=>`
      <div style="flex:1;background:rgba(255,255,255,0.06);border-radius:18px;padding:18px;text-align:center;font-size:18px;font-weight:600;color:rgba(255,255,255,0.6);">${t}</div>`).join('')}
    </div>
  </div>`;
}

function screen4HTML() {
  const items = [
    { name:'BPC-157', date:'Today', triage:'pass', conf:81 },
    { name:'TB-500', date:'Yesterday', triage:'review', conf:64 },
    { name:'Ipamorelin', date:'3d ago', triage:'pass', conf:89 },
    { name:'Sermorelin', date:'1w ago', triage:'do-not-use', conf:72 },
    { name:'Melanotan II', date:'2w ago', triage:'pass', conf:91 },
  ];
  const ts = t => t==='pass'?`background:rgba(20,201,160,0.15);color:${TEAL};`:t==='do-not-use'?'background:rgba(220,38,38,0.15);color:#f87171;':'background:rgba(245,158,11,0.15);color:#fbbf24;';
  const tl = t => t==='pass'?'Pass':t==='do-not-use'?'DNU':'Review';
  return `<div style="height:100%;background:linear-gradient(180deg,#0d1520 0%,#070b12 100%);display:flex;flex-direction:column;padding:28px 36px 36px;">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;">
      <div style="font-size:28px;font-weight:800;color:#fff;">History</div>
      <div style="display:flex;gap:10px;">
        <div style="background:rgba(255,255,255,0.06);border-radius:12px;padding:8px 18px;font-size:18px;color:rgba(255,255,255,0.5);">List</div>
        <div style="background:rgba(20,201,160,0.15);border-radius:12px;padding:8px 18px;font-size:18px;color:${TEAL};font-weight:600;">By Vial</div>
      </div>
    </div>
    <div style="display:flex;gap:10px;margin-bottom:20px;">
      ${[['12','Total Scans',TEAL,'rgba(20,201,160,0.08)','rgba(20,201,160,0.15)'],['9','Passed',TEAL,'rgba(20,201,160,0.08)','rgba(20,201,160,0.15)'],['2','Review','#fbbf24','rgba(245,158,11,0.08)','rgba(245,158,11,0.15)'],['1','DNU','#f87171','rgba(220,38,38,0.08)','rgba(220,38,38,0.15)']].map(([n,l,c,bg,bd])=>`
      <div style="flex:1;background:${bg};border:1px solid ${bd};border-radius:14px;padding:14px;text-align:center;">
        <div style="font-size:28px;font-weight:800;color:${c};">${n}</div>
        <div style="font-size:15px;color:rgba(255,255,255,0.4);margin-top:2px;">${l}</div>
      </div>`).join('')}
    </div>
    <div style="display:flex;flex-direction:column;gap:12px;">
      ${items.map(item=>`
      <div style="background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.06);border-radius:18px;padding:18px 22px;display:flex;align-items:center;gap:18px;">
        <div style="width:56px;height:56px;background:rgba(20,201,160,0.1);border:1px solid rgba(20,201,160,0.2);border-radius:14px;display:flex;align-items:center;justify-content:center;">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="${TEAL}" stroke-width="2"><rect x="8" y="2" width="8" height="20" rx="2"/><line x1="8" y1="14" x2="16" y2="14"/></svg>
        </div>
        <div style="flex:1;">
          <div style="font-size:20px;font-weight:700;color:#fff;">${item.name}</div>
          <div style="font-size:16px;color:rgba(255,255,255,0.35);margin-top:2px;">${item.date} · ${item.conf}% confidence</div>
        </div>
        <div style="font-size:16px;font-weight:700;padding:6px 16px;border-radius:20px;${ts(item.triage)}">${tl(item.triage)}</div>
      </div>`).join('')}
    </div>
  </div>`;
}

function screen5HTML() {
  const features = [
    { icon:'🔬', title:'AI Vision Analysis', desc:'Powered by GPT-4o' },
    { icon:'♾️', title:'Unlimited History', desc:'Never lose a record' },
    { icon:'📄', title:'PDF Export', desc:'Share with your team' },
    { icon:'⚗️', title:'Powder Scanning', desc:'Pre & post reconstitution' },
    { icon:'🧬', title:'Specialty Profiles', desc:'GHK-Cu, GLP-1 & more' },
  ];
  return `<div style="height:100%;background:linear-gradient(180deg,#0a1018 0%,#070b12 100%);display:flex;flex-direction:column;padding:28px 36px 36px;align-items:center;">
    <div style="width:80px;height:80px;background:linear-gradient(135deg,rgba(20,201,160,0.2) 0%,rgba(20,201,160,0.05) 100%);border:2px solid rgba(20,201,160,0.3);border-radius:24px;display:flex;align-items:center;justify-content:center;margin-bottom:16px;font-size:38px;">⭐</div>
    <div style="font-size:32px;font-weight:800;color:#fff;letter-spacing:-0.3px;margin-bottom:6px;">PepScan Pro</div>
    <div style="font-size:18px;color:rgba(255,255,255,0.4);margin-bottom:22px;text-align:center;">Everything you need for confident vial QC</div>
    <div style="width:100%;display:flex;flex-direction:column;gap:12px;margin-bottom:22px;">
      ${features.map(f=>`
      <div style="background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.07);border-radius:18px;padding:16px 20px;display:flex;align-items:center;gap:18px;">
        <span style="font-size:28px;">${f.icon}</span>
        <div>
          <div style="font-size:20px;font-weight:700;color:#fff;">${f.title}</div>
          <div style="font-size:16px;color:rgba(255,255,255,0.4);">${f.desc}</div>
        </div>
        <div style="margin-left:auto;color:${TEAL};font-size:22px;">✓</div>
      </div>`).join('')}
    </div>
    <div style="width:100%;background:linear-gradient(135deg,${TEAL} 0%,#0fa882 100%);border-radius:24px;padding:22px;text-align:center;box-shadow:0 8px 32px rgba(20,201,160,0.35);">
      <div style="font-size:18px;color:rgba(255,255,255,0.7);margin-bottom:4px;font-weight:500;">Unlock Everything</div>
      <div style="font-size:44px;font-weight:800;color:#fff;">$4.99<span style="font-size:22px;font-weight:500;opacity:0.8;">/yr</span></div>
      <div style="font-size:16px;color:rgba(255,255,255,0.65);margin-top:4px;">Less than a coffee — billed annually</div>
    </div>
    <div style="margin-top:14px;font-size:16px;color:rgba(255,255,255,0.25);">Cancel anytime · Restore purchase</div>
  </div>`;
}

const screenshots = [
  { file:'ipad-1-home.png',    headline:'Visual QC in\nYour Pocket',         sub:'Scan peptide vials for contamination,\nparticulates & reconstitution issues',                screenFn:screen1HTML },
  { file:'ipad-2-capture.png', headline:'Dual-Background\nCapture Protocol',  sub:'White + black backgrounds reveal\nparticulates invisible to a single shot',              screenFn:screen2HTML },
  { file:'ipad-3-results.png', headline:'Instant AI\nTriage Results',         sub:'Pass · Review · Do Not Use\nwith per-category confidence scores',                       screenFn:screen3HTML },
  { file:'ipad-4-history.png', headline:'Full Vial History.\nEvery Scan.',    sub:'Track every vial across every batch —\norganised by peptide name',                       screenFn:screen4HTML },
  { file:'ipad-5-pro.png',     headline:'Go Pro.\n$4.99 a Year.',             sub:'AI Vision · PDF Export · Powder Scanning\nUnlimited History · Specialty Profiles',       screenFn:screen5HTML },
];

// iPad frame dimensions for layout
const IPAD_W = 900, IPAD_H = 1200;
const PSCALE = 1.8;

async function renderAll() {
  const browser = await puppeteer.launch({
    executablePath: CHROME,
    args: ['--no-sandbox','--disable-setuid-sandbox','--disable-gpu','--disable-dev-shm-usage'],
  });

  for (const s of screenshots) {
    const page = await browser.newPage();
    await page.setViewport({ width: W, height: H, deviceScaleFactor: 1 });

    const screenHTML = s.screenFn();
    const [line1, line2] = s.headline.split('\n');
    const scaledW = Math.round(IPAD_W * PSCALE);
    const scaledH = Math.round(IPAD_H * PSCALE);

    const html = `<!DOCTYPE html><html><head><meta charset="utf-8">
<style>
${FONT}
${baseCSS}
.root {
  width:${W}px; height:${H}px;
  background: radial-gradient(ellipse 120% 50% at 50% 0%, rgba(20,201,160,0.14) 0%, transparent 55%),
              radial-gradient(ellipse 100% 30% at 50% 100%, rgba(20,201,160,0.07) 0%, transparent 60%),
              ${BG};
  display:flex; flex-direction:column; align-items:center;
  position:relative; overflow:hidden;
}
.root::before {
  content:''; position:absolute; inset:0;
  background-image:radial-gradient(circle, rgba(20,201,160,0.05) 1.5px, transparent 1.5px);
  background-size:48px 48px; pointer-events:none;
}
.label-pill {
  margin-top:120px;
  background:rgba(20,201,160,0.12); border:1px solid rgba(20,201,160,0.28);
  border-radius:100px; padding:14px 48px;
  font-size:30px; font-weight:600; color:${TEAL};
  letter-spacing:3px; text-transform:uppercase;
}
.headline {
  margin-top:60px; font-size:130px; font-weight:800; color:#fff;
  line-height:1.07; letter-spacing:-4px; text-align:center; padding:0 80px;
}
.headline em { font-style:normal; background:linear-gradient(135deg,${TEAL} 0%,${TEAL2} 100%);
  -webkit-background-clip:text; -webkit-text-fill-color:transparent; }
.sub {
  margin-top:40px; font-size:40px; font-weight:400;
  color:rgba(255,255,255,0.42); line-height:1.5;
  text-align:center; padding:0 100px;
}
.device-wrap {
  margin-top:80px; position:relative;
  width:${W}px; display:flex; align-items:flex-start; justify-content:center;
  height:${scaledH + 80}px; flex-shrink:0;
}
.device-glow {
  position:absolute;
  width:${scaledW + 200}px; height:${Math.round(scaledH * 0.45)}px;
  background:radial-gradient(ellipse, rgba(20,201,160,0.2) 0%, transparent 70%);
  border-radius:50%;
  top:${Math.round(scaledH * 0.5)}px; left:50%; transform:translateX(-50%);
  pointer-events:none; z-index:0;
}
.device-scale-container {
  position:relative; z-index:1;
  width:${scaledW}px; height:${scaledH}px;
  display:flex; justify-content:center;
}
.device-scale-inner {
  transform:scale(${PSCALE}); transform-origin:top center;
  width:${IPAD_W}px; height:${IPAD_H}px; flex-shrink:0;
}
.ipad-outer {
  width:${IPAD_W}px; height:${IPAD_H}px;
  background:linear-gradient(160deg,#1e2433 0%,#0d1018 100%);
  border-radius:50px; padding:4px;
  box-shadow: 0 0 0 2px rgba(255,255,255,0.07),
              0 60px 120px rgba(0,0,0,0.7),
              inset 0 1px 0 rgba(255,255,255,0.1);
}
.ipad-inner {
  width:100%; height:100%; background:#0b0e17;
  border-radius:47px; overflow:hidden; position:relative;
}
.ipad-camera {
  position:absolute; top:50%; left:18px; transform:translateY(-50%);
  width:14px; height:14px; background:#111;
  border-radius:50%; border:2px solid #222; z-index:10;
}
.ipad-screen { width:100%; height:100%; padding-left:46px; overflow:hidden; }
</style>
</head><body>
<div class="root">
  <div class="label-pill">PepScan</div>
  <div class="headline"><em>${line1}</em><br>${line2}</div>
  <div class="sub">${s.sub.replace(/\n/g,'<br>')}</div>
  <div class="device-wrap">
    <div class="device-glow"></div>
    <div class="device-scale-container">
      <div class="device-scale-inner">
        <div class="ipad-outer">
          <div class="ipad-inner">
            <div class="ipad-camera"></div>
            <div class="ipad-screen">${screenHTML}</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</div>
</body></html>`;

    await page.setContent(html, { waitUntil:'networkidle0', timeout:30000 });
    await new Promise(r => setTimeout(r, 500));
    const outPath = path.join(__dirname, s.file);
    await page.screenshot({ path:outPath, type:'png', clip:{ x:0, y:0, width:W, height:H } });
    console.log(`✓ ${s.file}`);
    await page.close();
  }

  await browser.close();
  console.log('Done.');
}

renderAll().catch(e => { console.error(e); process.exit(1); });
