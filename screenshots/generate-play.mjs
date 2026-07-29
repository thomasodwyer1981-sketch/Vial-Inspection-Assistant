import puppeteer from 'puppeteer-core';
import { mkdirSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
mkdirSync(__dirname, { recursive: true });

const CHROME = '/nix/store/gasnw5878924jbw6bql257ll29hkm4fd-chromium-123.0.6312.105/bin/chromium';

// Play Store phone: 1080×1920 (16:9 portrait, within 1:2 limit)
const W = 1080, H = 1920;

// Brand
const TEAL  = '#14C9A0';
const TEAL2 = '#2EDFC8';
const BG    = '#07090F';

// ─── PHONE FRAME ────────────────────────────────────────────────────────────
// Base phone: 320×650 — scaled up in final layout
function phoneScreen(contentHTML) {
  return `
<div class="phone-outer">
  <div class="phone-inner">
    <div class="dyn-island"></div>
    <div class="screen-wrap">${contentHTML}</div>
  </div>
</div>`;
}

// ─── SHARED BASE CSS ─────────────────────────────────────────────────────────
const base = (extra = '') => `
* { margin:0; padding:0; box-sizing:border-box; }
@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:ital,wght@0,400;0,500;0,600;0,700;0,800;0,900&display=swap');
body {
  width:${W}px; height:${H}px; overflow:hidden;
  font-family:'Plus Jakarta Sans',system-ui,sans-serif;
  background:${BG}; color:#fff;
}
.root {
  width:${W}px; height:${H}px; position:relative; overflow:hidden;
  display:flex; flex-direction:column; align-items:center;
}
/* dot grid */
.root::before {
  content:''; position:absolute; inset:0; z-index:0;
  background-image:radial-gradient(circle, rgba(20,201,160,0.05) 1.5px, transparent 1.5px);
  background-size:40px 40px;
  pointer-events:none;
}
/* radial light top */
.glow-top {
  position:absolute; top:-200px; left:50%; transform:translateX(-50%);
  width:900px; height:600px;
  background:radial-gradient(ellipse, rgba(20,201,160,0.18) 0%, transparent 65%);
  pointer-events:none; z-index:0;
}
.glow-bot {
  position:absolute; bottom:-100px; left:50%; transform:translateX(-50%);
  width:700px; height:400px;
  background:radial-gradient(ellipse, rgba(20,201,160,0.09) 0%, transparent 65%);
  pointer-events:none; z-index:0;
}
/* ── phone frame ── */
.phone-outer {
  width:320px; height:650px;
  background:linear-gradient(160deg,#1e2433 0%,#0d1018 100%);
  border-radius:48px; padding:3px;
  box-shadow: 0 0 0 1.5px rgba(255,255,255,0.08),
              0 40px 90px rgba(0,0,0,0.75),
              inset 0 1px 0 rgba(255,255,255,0.1);
}
.phone-inner {
  width:100%; height:100%;
  background:#0b0e17; border-radius:46px;
  overflow:hidden; position:relative;
}
.dyn-island {
  position:absolute; top:13px; left:50%; transform:translateX(-50%);
  width:88px; height:28px; background:#000; border-radius:18px; z-index:10;
}
.screen-wrap { width:100%; height:100%; padding-top:49px; overflow:hidden; }
${extra}
`;

// ─── CALLOUT BUBBLE ──────────────────────────────────────────────────────────
function bubble(text, x, y, dir = 'right') {
  const arrowR = dir === 'right' ? `border-left:10px solid rgba(20,201,160,0.8);border-top:6px solid transparent;border-bottom:6px solid transparent;right:-10px;top:50%;transform:translateY(-50%);` : `border-right:10px solid rgba(20,201,160,0.8);border-top:6px solid transparent;border-bottom:6px solid transparent;left:-10px;top:50%;transform:translateY(-50%);`;
  return `<div style="position:absolute;left:${x}px;top:${y}px;background:rgba(20,201,160,0.15);border:1.5px solid rgba(20,201,160,0.8);border-radius:12px;padding:7px 14px;font-size:20px;font-weight:700;color:${TEAL};white-space:nowrap;z-index:20;">
    ${text}
    <div style="position:absolute;width:0;height:0;${arrowR}"></div>
  </div>`;
}

// ═══════════════════════════════════════════════════════════════════════════
// SCREENSHOT 1 — HERO: "Is your peptide vial safe?"
// ═══════════════════════════════════════════════════════════════════════════
function s1() {
  const screen = `
<div style="height:100%;background:linear-gradient(180deg,#0d1520 0%,#070b12 100%);display:flex;flex-direction:column;align-items:center;padding:14px 16px 16px;gap:7px;">
  <div style="width:100%;display:flex;justify-content:space-between;align-items:center;">
    <span style="font-size:13px;font-weight:800;color:#fff;">PepScan</span>
    <span style="font-size:10px;color:${TEAL};background:rgba(20,201,160,0.12);padding:2px 8px;border-radius:20px;font-weight:600;">Pro ✓</span>
  </div>
  <!-- vial icon -->
  <div style="margin:6px 0;position:relative;">
    <div style="width:56px;height:100px;background:linear-gradient(180deg,rgba(20,201,160,0.12) 0%,rgba(20,201,160,0.3) 100%);border-radius:6px;border:1.5px solid rgba(20,201,160,0.6);position:relative;">
      <div style="position:absolute;inset:0;background:linear-gradient(180deg,transparent 50%,rgba(20,201,160,0.4) 100%);border-radius:5px;"></div>
    </div>
    <!-- scan corners -->
    <div style="position:absolute;top:-8px;left:-8px;width:18px;height:18px;border-top:2.5px solid ${TEAL};border-left:2.5px solid ${TEAL};border-radius:2px 0 0 0;"></div>
    <div style="position:absolute;top:-8px;right:-8px;width:18px;height:18px;border-top:2.5px solid ${TEAL};border-right:2.5px solid ${TEAL};border-radius:0 2px 0 0;"></div>
    <div style="position:absolute;bottom:-8px;left:-8px;width:18px;height:18px;border-bottom:2.5px solid ${TEAL};border-left:2.5px solid ${TEAL};border-radius:0 0 0 2px;"></div>
    <div style="position:absolute;bottom:-8px;right:-8px;width:18px;height:18px;border-bottom:2.5px solid ${TEAL};border-right:2.5px solid ${TEAL};border-radius:0 0 2px 0;"></div>
  </div>
  <div style="font-size:17px;font-weight:800;color:#fff;text-align:center;line-height:1.2;">Visual QC for<br/>Peptide Vials</div>
  <div style="font-size:10px;color:rgba(255,255,255,0.45);text-align:center;line-height:1.5;">Spot contamination, particulates &<br/>reconstitution issues in seconds</div>
  <div style="width:100%;background:linear-gradient(135deg,${TEAL} 0%,#0fa882 100%);border-radius:12px;padding:11px;text-align:center;box-shadow:0 6px 20px rgba(20,201,160,0.3);">
    <span style="font-size:13px;font-weight:700;color:#fff;">▶  Start New Scan</span>
  </div>
  <div style="width:100%;display:grid;grid-template-columns:1fr 1fr;gap:6px;">
    ${['📋  History','⚗️  Calculator','📖  Setup Guide','⭐  Go Pro'].map(t=>`<div style="background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.07);border-radius:10px;padding:8px 10px;font-size:10px;color:rgba(255,255,255,0.65);font-weight:500;">${t}</div>`).join('')}
  </div>
  <div style="width:100%;background:rgba(245,158,11,0.08);border:1px solid rgba(245,158,11,0.2);border-radius:8px;padding:7px 9px;font-size:9px;color:rgba(245,158,11,0.8);line-height:1.4;">⚠️ Research use only — not a medical device</div>
</div>`;

  return { screen, pill:'THE PEPTIDE QC APP', headline:'Is Your\nVial Safe\nto Use?', sub:'Scan it and know — in under 30 seconds' };
}

// ═══════════════════════════════════════════════════════════════════════════
// SCREENSHOT 2 — CAPTURE: Dual background protocol
// ═══════════════════════════════════════════════════════════════════════════
function s2() {
  const screen = `
<div style="height:100%;background:linear-gradient(180deg,#0d1520 0%,#070b12 100%);display:flex;flex-direction:column;padding:14px 16px 16px;gap:10px;">
  <div style="font-size:12px;font-weight:700;color:#fff;">Step 2 of 4 — Capture</div>
  <div style="display:flex;gap:4px;">
    ${[1,2,3,4].map((_,i)=>`<div style="flex:1;height:3px;border-radius:3px;background:${i<2?TEAL:'rgba(255,255,255,0.1)'};"></div>`).join('')}
  </div>
  <!-- white background -->
  <div style="background:rgba(255,255,255,0.95);border-radius:12px;padding:10px;position:relative;">
    <div style="height:80px;display:flex;align-items:center;justify-content:center;position:relative;">
      <div style="width:28px;height:64px;background:linear-gradient(180deg,rgba(20,201,160,0.15) 0%,rgba(20,201,160,0.35) 100%);border-radius:3px;border:1.5px solid rgba(20,201,160,0.6);"></div>
      <div style="position:absolute;top:2px;left:calc(50% - 26px);width:14px;height:14px;border-top:2px solid ${TEAL};border-left:2px solid ${TEAL};border-radius:2px 0 0 0;"></div>
      <div style="position:absolute;top:2px;right:calc(50% - 26px);width:14px;height:14px;border-top:2px solid ${TEAL};border-right:2px solid ${TEAL};border-radius:0 2px 0 0;"></div>
      <div style="position:absolute;bottom:2px;left:calc(50% - 26px);width:14px;height:14px;border-bottom:2px solid ${TEAL};border-left:2px solid ${TEAL};border-radius:0 0 0 2px;"></div>
      <div style="position:absolute;bottom:2px;right:calc(50% - 26px);width:14px;height:14px;border-bottom:2px solid ${TEAL};border-right:2px solid ${TEAL};border-radius:0 0 2px 0;"></div>
    </div>
    <div style="display:flex;justify-content:space-between;align-items:center;margin-top:4px;">
      <span style="font-size:10px;font-weight:700;color:#1a2535;">☀️ White Background</span>
      <span style="font-size:9px;color:${TEAL};background:rgba(20,201,160,0.15);padding:2px 7px;border-radius:20px;font-weight:600;">Captured ✓</span>
    </div>
  </div>
  <!-- black background (active) -->
  <div style="background:#111820;border:1.5px solid ${TEAL};border-radius:12px;padding:10px;position:relative;">
    <div style="height:80px;display:flex;align-items:center;justify-content:center;position:relative;">
      <div style="width:28px;height:64px;background:linear-gradient(180deg,rgba(20,201,160,0.08) 0%,rgba(20,201,160,0.22) 100%);border-radius:3px;border:1.5px solid rgba(20,201,160,0.5);"></div>
      <div style="position:absolute;inset:0;border:1.5px solid rgba(20,201,160,0.3);border-radius:6px;"></div>
      <div style="position:absolute;top:2px;left:calc(50% - 26px);width:14px;height:14px;border-top:2px solid ${TEAL};border-left:2px solid ${TEAL};border-radius:2px 0 0 0;"></div>
      <div style="position:absolute;top:2px;right:calc(50% - 26px);width:14px;height:14px;border-top:2px solid ${TEAL};border-right:2px solid ${TEAL};border-radius:0 2px 0 0;"></div>
      <div style="position:absolute;bottom:2px;left:calc(50% - 26px);width:14px;height:14px;border-bottom:2px solid ${TEAL};border-left:2px solid ${TEAL};border-radius:0 0 0 2px;"></div>
      <div style="position:absolute;bottom:2px;right:calc(50% - 26px);width:14px;height:14px;border-bottom:2px solid ${TEAL};border-right:2px solid ${TEAL};border-radius:0 0 2px 0;"></div>
    </div>
    <div style="display:flex;justify-content:space-between;align-items:center;margin-top:4px;">
      <span style="font-size:10px;font-weight:700;color:#fff;">🌑 Black Background</span>
      <span style="font-size:9px;color:rgba(255,255,255,0.4);font-weight:500;">Ready</span>
    </div>
  </div>
  <div style="background:rgba(255,255,255,0.04);border-radius:8px;padding:7px 9px;display:flex;flex-direction:column;gap:3px;">
    ${['Center vial — fill most of the frame','Diffused light only — no direct flash'].map(t=>`<div style="font-size:9px;color:rgba(255,255,255,0.5);display:flex;gap:5px;align-items:center;"><span style="color:${TEAL};">●</span>${t}</div>`).join('')}
  </div>
  <div style="display:flex;justify-content:center;margin-top:auto;">
    <div style="width:56px;height:56px;border-radius:50%;background:linear-gradient(135deg,${TEAL} 0%,#0fa882 100%);display:flex;align-items:center;justify-content:center;box-shadow:0 0 22px rgba(20,201,160,0.4);">
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
    </div>
  </div>
</div>`;

  return { screen, pill:'DUAL-BACKGROUND SCAN', headline:'Catch What\nthe Naked\nEye Misses', sub:'White + black backgrounds reveal particulates invisible to a single shot' };
}

// ═══════════════════════════════════════════════════════════════════════════
// SCREENSHOT 3 — RESULTS
// ═══════════════════════════════════════════════════════════════════════════
function s3() {
  const cats = [
    { name:'Clarity',      score:94, c:TEAL },
    { name:'Particulates', score:88, c:TEAL },
    { name:'Colour',       score:71, c:'#F59E0B' },
    { name:'Fill Level',   score:96, c:TEAL },
  ];
  const screen = `
<div style="height:100%;background:linear-gradient(180deg,#0d1520 0%,#070b12 100%);display:flex;flex-direction:column;padding:12px 16px 14px;overflow:hidden;">
  <!-- verdict -->
  <div style="background:linear-gradient(135deg,rgba(20,201,160,0.14) 0%,rgba(20,201,160,0.04) 100%);border:1.5px solid rgba(20,201,160,0.3);border-radius:14px;padding:12px;text-align:center;margin-bottom:10px;">
    <div style="font-size:9px;text-transform:uppercase;letter-spacing:1.5px;color:rgba(255,255,255,0.35);margin-bottom:4px;">Triage Result</div>
    <div style="font-size:28px;font-weight:900;color:${TEAL};letter-spacing:-0.5px;">PASS</div>
    <div style="font-size:9px;color:rgba(255,255,255,0.45);margin-top:3px;">No significant visual anomalies detected</div>
    <div style="margin-top:6px;font-size:20px;font-weight:800;color:#fff;">78<span style="font-size:11px;color:rgba(255,255,255,0.35);font-weight:400;">% confidence</span></div>
  </div>
  <!-- scores -->
  <div style="font-size:10px;font-weight:600;color:rgba(255,255,255,0.4);text-transform:uppercase;letter-spacing:1px;margin-bottom:6px;">Category Scores</div>
  <div style="display:flex;flex-direction:column;gap:6px;margin-bottom:9px;">
    ${cats.map(c=>`
    <div style="background:rgba(255,255,255,0.04);border-radius:9px;padding:7px 9px;">
      <div style="display:flex;justify-content:space-between;margin-bottom:4px;">
        <span style="font-size:10px;font-weight:600;color:#fff;">${c.name}</span>
        <span style="font-size:10px;font-weight:700;color:${c.c};">${c.score}%</span>
      </div>
      <div style="height:3px;background:rgba(255,255,255,0.08);border-radius:3px;">
        <div style="height:100%;width:${c.score}%;background:${c.c};border-radius:3px;"></div>
      </div>
    </div>`).join('')}
  </div>
  <!-- finding -->
  <div style="font-size:10px;font-weight:600;color:rgba(255,255,255,0.4);text-transform:uppercase;letter-spacing:1px;margin-bottom:5px;">What We Found</div>
  <div style="background:rgba(245,158,11,0.08);border:1px solid rgba(245,158,11,0.2);border-radius:9px;padding:7px 9px;font-size:9px;color:rgba(245,158,11,0.9);line-height:1.5;">⚠️ Slight colour variation — may be normal oxidation. Verify against your appearance profile.</div>
  <!-- actions -->
  <div style="display:flex;gap:6px;margin-top:auto;">
    ${['💾 Save','📤 Share','📄 PDF'].map(t=>`<div style="flex:1;background:rgba(255,255,255,0.06);border-radius:10px;padding:9px;text-align:center;font-size:9px;font-weight:600;color:rgba(255,255,255,0.6);">${t}</div>`).join('')}
  </div>
</div>`;

  return { screen, pill:'INSTANT AI ANALYSIS', headline:'Pass.\nReview.\nDo Not Use.', sub:'Confidence scores across 4 quality categories — in seconds' };
}

// ═══════════════════════════════════════════════════════════════════════════
// SCREENSHOT 4 — HISTORY
// ═══════════════════════════════════════════════════════════════════════════
function s4() {
  const items = [
    { name:'BPC-157',     date:'Today',      t:'pass',       conf:81 },
    { name:'TB-500',      date:'Yesterday',  t:'review',     conf:64 },
    { name:'Ipamorelin',  date:'3d ago',     t:'pass',       conf:89 },
    { name:'Sermorelin',  date:'1w ago',     t:'do-not-use', conf:72 },
    { name:'Melanotan II',date:'2w ago',     t:'pass',       conf:91 },
  ];
  const ts = t => t==='pass' ? `background:rgba(20,201,160,0.15);color:${TEAL};` : t==='do-not-use' ? 'background:rgba(220,38,38,0.15);color:#f87171;' : 'background:rgba(245,158,11,0.15);color:#fbbf24;';
  const tl = t => t==='pass' ? 'Pass' : t==='do-not-use' ? 'DNU' : 'Review';
  const screen = `
<div style="height:100%;background:linear-gradient(180deg,#0d1520 0%,#070b12 100%);display:flex;flex-direction:column;padding:12px 16px 14px;gap:8px;">
  <div style="display:flex;justify-content:space-between;align-items:center;">
    <div style="font-size:14px;font-weight:800;color:#fff;">History</div>
    <div style="background:rgba(20,201,160,0.15);border-radius:8px;padding:4px 9px;font-size:9px;color:${TEAL};font-weight:600;">By Vial</div>
  </div>
  <div style="display:flex;gap:5px;">
    ${[['12','Total',TEAL],['9','Passed',TEAL],['2','Review','#fbbf24'],['1','DNU','#f87171']].map(([n,l,c])=>`
    <div style="flex:1;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.07);border-radius:9px;padding:6px;text-align:center;">
      <div style="font-size:14px;font-weight:800;color:${c};">${n}</div>
      <div style="font-size:8px;color:rgba(255,255,255,0.35);margin-top:1px;">${l}</div>
    </div>`).join('')}
  </div>
  <div style="display:flex;flex-direction:column;gap:6px;">
    ${items.map(item=>`
    <div style="background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.06);border-radius:10px;padding:8px 10px;display:flex;align-items:center;gap:8px;">
      <div style="width:30px;height:30px;background:rgba(20,201,160,0.1);border:1px solid rgba(20,201,160,0.2);border-radius:7px;display:flex;align-items:center;justify-content:center;flex-shrink:0;">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="${TEAL}" stroke-width="2"><rect x="8" y="2" width="8" height="20" rx="2"/><line x1="8" y1="14" x2="16" y2="14"/></svg>
      </div>
      <div style="flex:1;min-width:0;">
        <div style="font-size:11px;font-weight:700;color:#fff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${item.name}</div>
        <div style="font-size:9px;color:rgba(255,255,255,0.3);margin-top:1px;">${item.date} · ${item.conf}% conf.</div>
      </div>
      <div style="font-size:9px;font-weight:700;padding:2px 8px;border-radius:20px;${ts(item.t)}">${tl(item.t)}</div>
    </div>`).join('')}
  </div>
</div>`;

  return { screen, pill:'COMPLETE AUDIT TRAIL', headline:'Every Vial.\nEvery Batch.\nEvery Result.', sub:'Track your entire peptide library — organised by compound name' };
}

// ═══════════════════════════════════════════════════════════════════════════
// SCREENSHOT 5 — PRO
// ═══════════════════════════════════════════════════════════════════════════
function s5() {
  const features = [
    { icon:'🔬', title:'AI Vision Analysis',  desc:'Powered by GPT-4o Vision' },
    { icon:'♾️', title:'Unlimited History',   desc:'Never lose a scan record' },
    { icon:'📄', title:'PDF Export',          desc:'One-tap shareable reports' },
    { icon:'⚗️', title:'Powder Scanning',     desc:'Pre & post reconstitution' },
    { icon:'🧬', title:'Specialty Profiles',  desc:'GHK-Cu, GLP-1 & more' },
  ];
  const screen = `
<div style="height:100%;background:linear-gradient(180deg,#0a1018 0%,#070b12 100%);display:flex;flex-direction:column;padding:12px 16px 14px;align-items:center;gap:8px;">
  <div style="width:44px;height:44px;background:linear-gradient(135deg,rgba(20,201,160,0.22) 0%,rgba(20,201,160,0.06) 100%);border:1.5px solid rgba(20,201,160,0.35);border-radius:14px;display:flex;align-items:center;justify-content:center;font-size:20px;">⭐</div>
  <div style="font-size:16px;font-weight:800;color:#fff;letter-spacing:-0.3px;">PepScan Pro</div>
  <div style="font-size:9px;color:rgba(255,255,255,0.35);text-align:center;">Everything you need for confident vial QC</div>
  <div style="width:100%;display:flex;flex-direction:column;gap:5px;">
    ${features.map(f=>`
    <div style="background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.07);border-radius:10px;padding:7px 10px;display:flex;align-items:center;gap:8px;">
      <span style="font-size:15px;">${f.icon}</span>
      <div style="flex:1;min-width:0;">
        <div style="font-size:10px;font-weight:700;color:#fff;">${f.title}</div>
        <div style="font-size:9px;color:rgba(255,255,255,0.35);">${f.desc}</div>
      </div>
      <div style="color:${TEAL};font-size:12px;">✓</div>
    </div>`).join('')}
  </div>
  <div style="width:100%;background:linear-gradient(135deg,${TEAL} 0%,#0fa882 100%);border-radius:14px;padding:12px;text-align:center;box-shadow:0 8px 28px rgba(20,201,160,0.35);margin-top:auto;">
    <div style="font-size:10px;color:rgba(255,255,255,0.7);margin-bottom:2px;font-weight:500;">Unlock Everything</div>
    <div style="font-size:24px;font-weight:800;color:#fff;">$4.99<span style="font-size:12px;font-weight:500;opacity:0.8;">/yr</span></div>
    <div style="font-size:9px;color:rgba(255,255,255,0.6);margin-top:2px;">Less than a coffee — billed annually</div>
  </div>
  <div style="font-size:9px;color:rgba(255,255,255,0.2);">Cancel anytime · Restore purchase</div>
</div>`;

  return { screen, pill:'PEPSCAN PRO', headline:'Research-\nGrade QC.\nCoffee Price.', sub:'AI Vision · PDF Reports · Powder Scanning · Unlimited History' };
}

// ─── RENDER ENGINE ────────────────────────────────────────────────────────────
const PSCALE = 1.88; // phone 320→601px wide
const scaledPW = Math.round(320 * PSCALE);  // 601
const scaledPH = Math.round(650 * PSCALE);  // 1222

async function renderAll() {
  const browser = await puppeteer.launch({
    executablePath: CHROME,
    args: ['--no-sandbox','--disable-setuid-sandbox','--disable-gpu','--disable-dev-shm-usage'],
  });

  const shots = [
    { file:'play-1-hero.png',    ...s1() },
    { file:'play-2-capture.png', ...s2() },
    { file:'play-3-results.png', ...s3() },
    { file:'play-4-history.png', ...s4() },
    { file:'play-5-pro.png',     ...s5() },
  ];

  for (const s of shots) {
    const page = await browser.newPage();
    await page.setViewport({ width: W, height: H, deviceScaleFactor: 1 });

    const headLines = s.headline.split('\n');

    const html = `<!DOCTYPE html>
<html><head>
<meta charset="utf-8">
<style>
${base(`
/* layout zones */
.top-zone {
  position:relative; z-index:1;
  display:flex; flex-direction:column; align-items:center;
  padding-top:80px; padding-bottom:0; width:100%;
}
.pill {
  background:rgba(20,201,160,0.12);
  border:1px solid rgba(20,201,160,0.3);
  border-radius:100px;
  padding:9px 28px;
  font-size:18px; font-weight:700; color:${TEAL};
  letter-spacing:2.5px; text-transform:uppercase;
  margin-bottom:40px;
}
.headline {
  font-size:96px; font-weight:900; line-height:1.05;
  letter-spacing:-4px; text-align:center;
  padding:0 50px;
  color:#fff;
}
.headline .accent {
  background:linear-gradient(135deg,${TEAL} 0%,${TEAL2} 100%);
  -webkit-background-clip:text; -webkit-text-fill-color:transparent;
}
.sub {
  margin-top:28px;
  font-size:28px; font-weight:400; color:rgba(255,255,255,0.4);
  text-align:center; line-height:1.5; padding:0 70px;
}
/* phone section */
.phone-section {
  position:relative; z-index:1;
  margin-top:50px;
  width:${W}px;
  display:flex; align-items:flex-start; justify-content:center;
  height:${scaledPH + 80}px; flex-shrink:0;
}
.phone-glow {
  position:absolute;
  width:${scaledPW + 200}px; height:400px;
  background:radial-gradient(ellipse, rgba(20,201,160,0.2) 0%, transparent 65%);
  top:${Math.round(scaledPH * 0.5)}px; left:50%; transform:translateX(-50%);
  border-radius:50%; pointer-events:none; z-index:0;
}
.phone-scale {
  position:relative; z-index:1;
  width:${scaledPW}px; height:${scaledPH}px;
  display:flex; justify-content:center;
}
.phone-scale-inner {
  transform:scale(${PSCALE});
  transform-origin:top center;
  width:320px; height:650px; flex-shrink:0;
}
`)}
</style>
</head><body>
<div class="root">
  <div class="glow-top"></div>
  <div class="glow-bot"></div>
  <div class="top-zone">
    <div class="pill">${s.pill}</div>
    <div class="headline">
      <span class="accent">${headLines[0]}</span>${headLines.slice(1).map(l=>`<br>${l}`).join('')}
    </div>
    <div class="sub">${s.sub}</div>
  </div>
  <div class="phone-section">
    <div class="phone-glow"></div>
    <div class="phone-scale">
      <div class="phone-scale-inner">
        <div class="phone-outer">
          <div class="phone-inner">
            <div class="dyn-island"></div>
            <div class="screen-wrap">${s.screen}</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</div>
</body></html>`;

    await page.setContent(html, { waitUntil: 'networkidle0', timeout: 30000 });
    await new Promise(r => setTimeout(r, 600));

    const outPath = path.join(__dirname, s.file);
    await page.screenshot({ path: outPath, type: 'png', clip: { x:0, y:0, width:W, height:H } });
    console.log(`✓ ${s.file}`);
    await page.close();
  }

  await browser.close();
  console.log('All done.');
}

renderAll().catch(e => { console.error(e); process.exit(1); });
