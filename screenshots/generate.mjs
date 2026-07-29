import puppeteer from 'puppeteer-core';
import { writeFileSync, mkdirSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
mkdirSync(__dirname, { recursive: true });

const CHROME = '/nix/store/gasnw5878924jbw6bql257ll29hkm4fd-chromium-123.0.6312.105/bin/chromium';

// App Store 6.5" iPhone: 1284×2778
const W = 1284, H = 2778;

const FONT = `@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');`;

// Brand
const TEAL = '#14C9A0';
const TEAL2 = '#2EDFC8';
const BG = '#07090F';
const SURFACE = '#0E1420';
const BORDER = 'rgba(20,201,160,0.18)';

// ─── PHONE FRAME ────────────────────────────────────────────────────────────
// Inner screen: 520×1060 — we scale content to fit
function phoneFrame(screenHTML, options = {}) {
  const { glowColor = TEAL } = options;
  return `
<div class="phone-wrap">
  <div class="phone-outer">
    <div class="phone-inner">
      <div class="dynamic-island"></div>
      <div class="screen-content">
        ${screenHTML}
      </div>
    </div>
  </div>
  <div class="phone-glow" style="--gc:${glowColor}"></div>
</div>`;
}

const baseCSS = `
  * { margin:0; padding:0; box-sizing:border-box; }
  body {
    width:${W}px; height:${H}px; overflow:hidden;
    background:${BG};
    font-family:'Plus Jakarta Sans',sans-serif;
    color:#fff;
  }
  .phone-wrap {
    position:relative;
    display:flex; align-items:center; justify-content:center;
  }
  .phone-glow {
    position:absolute;
    width:600px; height:600px;
    background:radial-gradient(ellipse, color-mix(in srgb, var(--gc) 28%, transparent) 0%, transparent 70%);
    pointer-events:none; z-index:0;
    border-radius:50%;
    top:50%; left:50%; transform:translate(-50%,-50%);
  }
  .phone-outer {
    position:relative; z-index:1;
    width:344px; height:706px;
    background:linear-gradient(160deg,#1e2433 0%,#0d1018 100%);
    border-radius:54px;
    padding:3px;
    box-shadow:
      0 0 0 1.5px rgba(255,255,255,0.08),
      0 40px 80px rgba(0,0,0,0.7),
      inset 0 1px 0 rgba(255,255,255,0.12);
  }
  .phone-inner {
    width:100%; height:100%;
    background:#0b0e17;
    border-radius:52px;
    overflow:hidden;
    position:relative;
  }
  .dynamic-island {
    position:absolute; top:14px; left:50%; transform:translateX(-50%);
    width:94px; height:30px;
    background:#000;
    border-radius:20px;
    z-index:10;
  }
  .screen-content {
    width:100%; height:100%;
    padding-top:52px;
    overflow:hidden;
  }
  .teal { color:${TEAL}; }
  .badge {
    display:inline-flex; align-items:center; gap:6px;
    padding:5px 13px; border-radius:100px; font-size:12px; font-weight:600;
  }
`;

// ─── SCREEN 1: HERO ──────────────────────────────────────────────────────────
function screen1HTML() {
  const screen = `
    <div style="height:100%;background:linear-gradient(180deg,#0d1520 0%,#070b12 100%);display:flex;flex-direction:column;align-items:center;padding:16px 20px 20px;">
      <!-- header -->
      <div style="width:100%;display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
        <span style="font-size:15px;font-weight:700;color:#fff;letter-spacing:-0.3px;">PepScan</span>
        <span style="font-size:11px;color:${TEAL};font-weight:600;background:rgba(20,201,160,0.12);padding:3px 9px;border-radius:20px;">Pro</span>
      </div>
      <!-- hero icon -->
      <div style="width:110px;height:110px;margin:12px auto 10px;position:relative;">
        <div style="position:absolute;inset:0;background:radial-gradient(circle,rgba(20,201,160,0.25) 0%,transparent 70%);border-radius:50%;"></div>
        <svg width="110" height="110" viewBox="0 0 110 110" fill="none">
          <rect x="22" y="8" width="66" height="94" rx="12" fill="url(#pg1)" stroke="rgba(20,201,160,0.4)" stroke-width="1.5"/>
          <rect x="28" y="16" width="54" height="78" rx="8" fill="#0d1520"/>
          <!-- vial -->
          <rect x="44" y="28" width="22" height="52" rx="4" fill="rgba(20,201,160,0.1)" stroke="${TEAL}" stroke-width="1.5"/>
          <rect x="44" y="58" width="22" height="22" rx="0" rx-bottom-left="4" rx-bottom-right="4" fill="rgba(20,201,160,0.35)"/>
          <!-- scan lines -->
          <line x1="35" y1="52" x2="42" y2="52" stroke="${TEAL}" stroke-width="2" stroke-linecap="round"/>
          <line x1="68" y1="52" x2="75" y2="52" stroke="${TEAL}" stroke-width="2" stroke-linecap="round"/>
          <line x1="35" y1="48" x2="35" y2="56" stroke="${TEAL}" stroke-width="2" stroke-linecap="round"/>
          <line x1="75" y1="48" x2="75" y2="56" stroke="${TEAL}" stroke-width="2" stroke-linecap="round"/>
          <!-- home bar -->
          <rect x="44" y="96" width="22" height="3" rx="1.5" fill="rgba(255,255,255,0.2)"/>
          <defs>
            <linearGradient id="pg1" x1="22" y1="8" x2="88" y2="102" gradientUnits="userSpaceOnUse">
              <stop stop-color="#1a2535"/>
              <stop offset="1" stop-color="#0d1218"/>
            </linearGradient>
          </defs>
        </svg>
      </div>
      <!-- title -->
      <div style="text-align:center;margin-bottom:6px;">
        <div style="font-size:20px;font-weight:800;color:#fff;letter-spacing:-0.5px;line-height:1.2;">Visual QC for<br/>Peptide Vials</div>
        <div style="font-size:11px;color:rgba(255,255,255,0.45);margin-top:5px;line-height:1.5;">Spot contamination, particulates &amp;<br/>reconstitution issues in seconds</div>
      </div>
      <!-- CTA button -->
      <div style="width:100%;background:linear-gradient(135deg,${TEAL} 0%,#0fa882 100%);border-radius:14px;padding:13px;text-align:center;margin:10px 0;box-shadow:0 8px 24px rgba(20,201,160,0.3);">
        <span style="font-size:14px;font-weight:700;color:#fff;">Start New Scan</span>
      </div>
      <!-- quick links -->
      <div style="width:100%;display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:4px;">
        ${['📋  History','⚗️  Calculator','📖  Setup Guide','⭐  Go Pro'].map(t=>`
        <div style="background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.07);border-radius:12px;padding:10px 12px;font-size:11px;color:rgba(255,255,255,0.7);font-weight:500;">${t}</div>`).join('')}
      </div>
      <!-- disclaimer -->
      <div style="margin-top:10px;background:rgba(245,158,11,0.08);border:1px solid rgba(245,158,11,0.2);border-radius:10px;padding:8px 10px;font-size:9.5px;color:rgba(245,158,11,0.8);line-height:1.4;width:100%;">
        ⚠️ Research use only — not a medical device
      </div>
    </div>`;
  return screen;
}

// ─── SCREEN 2: DUAL CAPTURE ──────────────────────────────────────────────────
function screen2HTML() {
  return `
    <div style="height:100%;background:linear-gradient(180deg,#0d1520 0%,#070b12 100%);display:flex;flex-direction:column;padding:16px 18px 20px;">
      <div style="font-size:13px;font-weight:700;color:#fff;margin-bottom:12px;">Step 2 of 4 — Capture</div>
      <!-- progress -->
      <div style="display:flex;gap:4px;margin-bottom:14px;">
        ${[1,2,3,4].map((n,i)=>`<div style="flex:1;height:3px;border-radius:4px;background:${i<2?TEAL:'rgba(255,255,255,0.12)'};"></div>`).join('')}
      </div>
      <!-- white background capture -->
      <div style="background:rgba(255,255,255,0.96);border-radius:14px;padding:10px;margin-bottom:10px;position:relative;">
        <div style="height:90px;display:flex;align-items:center;justify-content:center;position:relative;">
          <div style="width:32px;height:72px;background:linear-gradient(180deg,rgba(20,201,160,0.15) 0%,rgba(20,201,160,0.35) 100%);border-radius:4px;border:1.5px solid rgba(20,201,160,0.6);"></div>
          <!-- scan corners -->
          <div style="position:absolute;top:4px;left:calc(50% - 28px);width:16px;height:16px;border-top:2.5px solid ${TEAL};border-left:2.5px solid ${TEAL};border-radius:2px 0 0 0;"></div>
          <div style="position:absolute;top:4px;right:calc(50% - 28px);width:16px;height:16px;border-top:2.5px solid ${TEAL};border-right:2.5px solid ${TEAL};border-radius:0 2px 0 0;"></div>
          <div style="position:absolute;bottom:4px;left:calc(50% - 28px);width:16px;height:16px;border-bottom:2.5px solid ${TEAL};border-left:2.5px solid ${TEAL};border-radius:0 0 0 2px;"></div>
          <div style="position:absolute;bottom:4px;right:calc(50% - 28px);width:16px;height:16px;border-bottom:2.5px solid ${TEAL};border-right:2.5px solid ${TEAL};border-radius:0 0 2px 0;"></div>
        </div>
        <div style="display:flex;align-items:center;justify-content:space-between;margin-top:6px;">
          <span style="font-size:11px;font-weight:700;color:#1a2535;">☀️  White Background</span>
          <span style="font-size:10px;color:${TEAL};font-weight:600;background:rgba(20,201,160,0.12);padding:2px 8px;border-radius:20px;">Captured ✓</span>
        </div>
      </div>
      <!-- black background capture -->
      <div style="background:#111820;border:1.5px solid ${TEAL};border-radius:14px;padding:10px;position:relative;">
        <div style="height:90px;display:flex;align-items:center;justify-content:center;position:relative;">
          <div style="width:32px;height:72px;background:linear-gradient(180deg,rgba(20,201,160,0.08) 0%,rgba(20,201,160,0.22) 100%);border-radius:4px;border:1.5px solid rgba(20,201,160,0.5);"></div>
          <div style="position:absolute;top:4px;left:calc(50% - 28px);width:16px;height:16px;border-top:2.5px solid ${TEAL};border-left:2.5px solid ${TEAL};border-radius:2px 0 0 0;"></div>
          <div style="position:absolute;top:4px;right:calc(50% - 28px);width:16px;height:16px;border-top:2.5px solid ${TEAL};border-right:2.5px solid ${TEAL};border-radius:0 2px 0 0;"></div>
          <div style="position:absolute;bottom:4px;left:calc(50% - 28px);width:16px;height:16px;border-bottom:2.5px solid ${TEAL};border-left:2.5px solid ${TEAL};border-radius:0 0 0 2px;"></div>
          <div style="position:absolute;bottom:4px;right:calc(50% - 28px);width:16px;height:16px;border-bottom:2.5px solid ${TEAL};border-right:2.5px solid ${TEAL};border-radius:0 0 2px 0;"></div>
          <!-- active pulse ring -->
          <div style="position:absolute;width:50px;height:80px;border:1.5px solid rgba(20,201,160,0.4);border-radius:6px;"></div>
        </div>
        <div style="display:flex;align-items:center;justify-content:space-between;margin-top:6px;">
          <span style="font-size:11px;font-weight:700;color:#fff;">🌑  Black Background</span>
          <span style="font-size:10px;color:rgba(255,255,255,0.5);font-weight:500;">Active</span>
        </div>
      </div>
      <!-- tips -->
      <div style="margin-top:10px;background:rgba(255,255,255,0.04);border-radius:10px;padding:8px 10px;">
        ${['Center vial — fill most of the frame','Use diffused light — no direct flash'].map(t=>`
        <div style="font-size:10px;color:rgba(255,255,255,0.55);margin-bottom:3px;display:flex;gap:5px;align-items:center;"><span style="color:${TEAL};font-size:9px;">●</span>${t}</div>`).join('')}
      </div>
      <!-- capture button -->
      <div style="margin-top:auto;display:flex;justify-content:center;">
        <div style="width:62px;height:62px;border-radius:50%;background:linear-gradient(135deg,${TEAL} 0%,#0fa882 100%);display:flex;align-items:center;justify-content:center;box-shadow:0 0 24px rgba(20,201,160,0.4);">
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
        </div>
      </div>
    </div>`;
}

// ─── SCREEN 3: RESULTS ───────────────────────────────────────────────────────
function screen3HTML() {
  const cats = [
    { name:'Clarity', score:94, color:TEAL },
    { name:'Particulates', score:88, color:TEAL },
    { name:'Color', score:71, color:'#F59E0B' },
    { name:'Fill Level', score:96, color:TEAL },
  ];
  return `
    <div style="height:100%;background:linear-gradient(180deg,#0d1520 0%,#070b12 100%);display:flex;flex-direction:column;padding:14px 18px 18px;overflow:hidden;">
      <!-- triage -->
      <div style="background:linear-gradient(135deg,rgba(20,201,160,0.12) 0%,rgba(20,201,160,0.04) 100%);border:1.5px solid rgba(20,201,160,0.3);border-radius:16px;padding:14px;text-align:center;margin-bottom:12px;">
        <div style="font-size:10px;text-transform:uppercase;letter-spacing:1.5px;color:rgba(255,255,255,0.4);margin-bottom:6px;">Triage Result</div>
        <div style="font-size:26px;font-weight:800;color:${TEAL};letter-spacing:-0.5px;">PASS</div>
        <div style="font-size:10px;color:rgba(255,255,255,0.5);margin-top:4px;">No significant visual anomalies detected</div>
        <div style="margin-top:8px;display:flex;justify-content:center;align-items:center;gap:6px;">
          <div style="font-size:22px;font-weight:800;color:#fff;">78<span style="font-size:13px;color:rgba(255,255,255,0.4);font-weight:500;">%</span></div>
          <div style="font-size:10px;color:rgba(255,255,255,0.4);">confidence</div>
        </div>
      </div>
      <!-- category scores -->
      <div style="font-size:11px;font-weight:600;color:rgba(255,255,255,0.5);text-transform:uppercase;letter-spacing:1px;margin-bottom:8px;">Category Scores</div>
      <div style="display:flex;flex-direction:column;gap:7px;margin-bottom:10px;">
        ${cats.map(c=>`
        <div style="background:rgba(255,255,255,0.04);border-radius:10px;padding:8px 10px;">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:5px;">
            <span style="font-size:11px;font-weight:600;color:#fff;">${c.name}</span>
            <span style="font-size:11px;font-weight:700;color:${c.color};">${c.score}%</span>
          </div>
          <div style="height:3px;background:rgba(255,255,255,0.08);border-radius:4px;">
            <div style="height:100%;width:${c.score}%;background:${c.color};border-radius:4px;"></div>
          </div>
        </div>`).join('')}
      </div>
      <!-- findings -->
      <div style="font-size:11px;font-weight:600;color:rgba(255,255,255,0.5);text-transform:uppercase;letter-spacing:1px;margin-bottom:6px;">What We Found</div>
      <div style="background:rgba(245,158,11,0.08);border:1px solid rgba(245,158,11,0.2);border-radius:10px;padding:8px 10px;font-size:10px;color:rgba(245,158,11,0.9);line-height:1.5;">
        ⚠️  Slight color variation detected — may be normal oxidation. Verify against your expected appearance profile.
      </div>
      <!-- actions row -->
      <div style="display:flex;gap:8px;margin-top:auto;">
        <div style="flex:1;background:rgba(255,255,255,0.06);border-radius:12px;padding:10px;text-align:center;font-size:10px;font-weight:600;color:rgba(255,255,255,0.6);">💾  Save</div>
        <div style="flex:1;background:rgba(255,255,255,0.06);border-radius:12px;padding:10px;text-align:center;font-size:10px;font-weight:600;color:rgba(255,255,255,0.6);">📤  Share</div>
        <div style="flex:1;background:rgba(255,255,255,0.06);border-radius:12px;padding:10px;text-align:center;font-size:10px;font-weight:600;color:rgba(255,255,255,0.6);">📄  PDF</div>
      </div>
    </div>`;
}

// ─── SCREEN 4: HISTORY ───────────────────────────────────────────────────────
function screen4HTML() {
  const items = [
    { name:'BPC-157', date:'Today', triage:'pass', conf:81 },
    { name:'TB-500', date:'Yesterday', triage:'review', conf:64 },
    { name:'Ipamorelin', date:'3d ago', triage:'pass', conf:89 },
    { name:'Sermorelin', date:'1w ago', triage:'do-not-use', conf:72 },
    { name:'Melanotan II', date:'2w ago', triage:'pass', conf:91 },
  ];
  const triageStyle = t => t === 'pass'
    ? `background:rgba(20,201,160,0.15);color:${TEAL};`
    : t === 'do-not-use'
    ? 'background:rgba(220,38,38,0.15);color:#f87171;'
    : 'background:rgba(245,158,11,0.15);color:#fbbf24;';
  const triageLabel = t => t === 'pass' ? 'Pass' : t === 'do-not-use' ? 'DNU' : 'Review';
  return `
    <div style="height:100%;background:linear-gradient(180deg,#0d1520 0%,#070b12 100%);display:flex;flex-direction:column;padding:14px 18px 18px;">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">
        <div style="font-size:15px;font-weight:800;color:#fff;">History</div>
        <div style="display:flex;gap:6px;">
          <div style="background:rgba(255,255,255,0.06);border-radius:8px;padding:5px 10px;font-size:10px;color:rgba(255,255,255,0.5);">List</div>
          <div style="background:rgba(20,201,160,0.15);border-radius:8px;padding:5px 10px;font-size:10px;color:${TEAL};font-weight:600;">By Vial</div>
        </div>
      </div>
      <!-- stats bar -->
      <div style="display:flex;gap:6px;margin-bottom:12px;">
        <div style="flex:1;background:rgba(20,201,160,0.08);border:1px solid rgba(20,201,160,0.15);border-radius:10px;padding:8px;text-align:center;">
          <div style="font-size:16px;font-weight:800;color:${TEAL};">12</div>
          <div style="font-size:9px;color:rgba(255,255,255,0.4);margin-top:1px;">Total Scans</div>
        </div>
        <div style="flex:1;background:rgba(20,201,160,0.08);border:1px solid rgba(20,201,160,0.15);border-radius:10px;padding:8px;text-align:center;">
          <div style="font-size:16px;font-weight:800;color:${TEAL};">9</div>
          <div style="font-size:9px;color:rgba(255,255,255,0.4);margin-top:1px;">Passed</div>
        </div>
        <div style="flex:1;background:rgba(245,158,11,0.08);border:1px solid rgba(245,158,11,0.15);border-radius:10px;padding:8px;text-align:center;">
          <div style="font-size:16px;font-weight:800;color:#fbbf24;">2</div>
          <div style="font-size:9px;color:rgba(255,255,255,0.4);margin-top:1px;">Review</div>
        </div>
        <div style="flex:1;background:rgba(220,38,38,0.08);border:1px solid rgba(220,38,38,0.15);border-radius:10px;padding:8px;text-align:center;">
          <div style="font-size:16px;font-weight:800;color:#f87171;">1</div>
          <div style="font-size:9px;color:rgba(255,255,255,0.4);margin-top:1px;">DNU</div>
        </div>
      </div>
      <!-- list -->
      <div style="display:flex;flex-direction:column;gap:7px;">
        ${items.map(item=>`
        <div style="background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.06);border-radius:12px;padding:10px 12px;display:flex;align-items:center;gap:10px;">
          <div style="width:36px;height:36px;background:rgba(20,201,160,0.1);border:1px solid rgba(20,201,160,0.2);border-radius:8px;display:flex;align-items:center;justify-content:center;">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="${TEAL}" stroke-width="2"><rect x="8" y="2" width="8" height="20" rx="2"/><line x1="8" y1="14" x2="16" y2="14"/></svg>
          </div>
          <div style="flex:1;min-width:0;">
            <div style="font-size:12px;font-weight:700;color:#fff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${item.name}</div>
            <div style="font-size:10px;color:rgba(255,255,255,0.35);margin-top:1px;">${item.date} · ${item.conf}% conf</div>
          </div>
          <div style="font-size:10px;font-weight:700;padding:3px 9px;border-radius:20px;${triageStyle(item.triage)}">${triageLabel(item.triage)}</div>
        </div>`).join('')}
      </div>
    </div>`;
}

// ─── SCREEN 5: PRO ───────────────────────────────────────────────────────────
function screen5HTML() {
  const features = [
    { icon:'🔬', title:'AI Vision Analysis', desc:'Powered by GPT-4o' },
    { icon:'♾️', title:'Unlimited History', desc:'Never lose a record' },
    { icon:'📄', title:'PDF Export', desc:'Share with your team' },
    { icon:'⚗️', title:'Powder Scanning', desc:'Pre &amp; post reconstitution' },
    { icon:'🧬', title:'Specialty Profiles', desc:'GHK-Cu, GLP-1 &amp; more' },
  ];
  return `
    <div style="height:100%;background:linear-gradient(180deg,#0a1018 0%,#070b12 100%);display:flex;flex-direction:column;padding:14px 18px 18px;align-items:center;">
      <!-- crown -->
      <div style="width:52px;height:52px;background:linear-gradient(135deg,rgba(20,201,160,0.2) 0%,rgba(20,201,160,0.05) 100%);border:1.5px solid rgba(20,201,160,0.3);border-radius:16px;display:flex;align-items:center;justify-content:center;margin-bottom:10px;font-size:24px;">⭐</div>
      <div style="font-size:18px;font-weight:800;color:#fff;letter-spacing:-0.3px;margin-bottom:3px;">PepScan Pro</div>
      <div style="font-size:10px;color:rgba(255,255,255,0.4);margin-bottom:14px;text-align:center;">Everything you need for confident vial QC</div>
      <!-- features -->
      <div style="width:100%;display:flex;flex-direction:column;gap:7px;margin-bottom:14px;">
        ${features.map(f=>`
        <div style="background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.07);border-radius:12px;padding:9px 12px;display:flex;align-items:center;gap:10px;">
          <span style="font-size:18px;">${f.icon}</span>
          <div>
            <div style="font-size:12px;font-weight:700;color:#fff;">${f.title}</div>
            <div style="font-size:10px;color:rgba(255,255,255,0.4);">${f.desc}</div>
          </div>
          <div style="margin-left:auto;color:${TEAL};font-size:14px;">✓</div>
        </div>`).join('')}
      </div>
      <!-- price -->
      <div style="width:100%;background:linear-gradient(135deg,${TEAL} 0%,#0fa882 100%);border-radius:16px;padding:14px;text-align:center;box-shadow:0 8px 32px rgba(20,201,160,0.35);">
        <div style="font-size:11px;color:rgba(255,255,255,0.7);margin-bottom:2px;font-weight:500;">Unlock Everything</div>
        <div style="font-size:26px;font-weight:800;color:#fff;">$4.99<span style="font-size:13px;font-weight:500;opacity:0.8;">/yr</span></div>
        <div style="font-size:10px;color:rgba(255,255,255,0.65);margin-top:2px;">Less than a coffee — billed annually</div>
      </div>
      <div style="margin-top:8px;font-size:10px;color:rgba(255,255,255,0.25);">Cancel anytime · Restore purchase</div>
    </div>`;
}

// ─── SCREENSHOT LAYOUTS ───────────────────────────────────────────────────────
const screenshots = [
  {
    file: 'screenshot-1-home.png',
    headline: 'Visual QC in\nYour Pocket',
    sub: 'Scan peptide vials for contamination,\nparticulates & reconstitution issues',
    screenFn: screen1HTML,
    accentColor: TEAL,
  },
  {
    file: 'screenshot-2-capture.png',
    headline: 'Dual-Background\nCapture Protocol',
    sub: 'White + black backgrounds reveal\nparticulates invisible to a single shot',
    screenFn: screen2HTML,
    accentColor: TEAL,
  },
  {
    file: 'screenshot-3-results.png',
    headline: 'Instant AI\nTriage Results',
    sub: 'Pass · Review · Do Not Use\nwith per-category confidence scores',
    screenFn: screen3HTML,
    accentColor: TEAL,
  },
  {
    file: 'screenshot-4-history.png',
    headline: 'Full Vial History.\nEvery Scan.',
    sub: 'Track every vial across every batch —\norganised by peptide name',
    screenFn: screen4HTML,
    accentColor: TEAL,
  },
  {
    file: 'screenshot-5-pro.png',
    headline: 'Go Pro.\n$4.99 a Year.',
    sub: 'AI Vision · PDF Export · Powder Scanning\nUnlimited History · Specialty Profiles',
    screenFn: screen5HTML,
    accentColor: TEAL,
  },
];

async function renderAll() {
  const browser = await puppeteer.launch({
    executablePath: CHROME,
    args: ['--no-sandbox','--disable-setuid-sandbox','--disable-gpu','--disable-dev-shm-usage'],
  });

  for (const s of screenshots) {
    const page = await browser.newPage();
    await page.setViewport({ width: W, height: H, deviceScaleFactor: 1 });

    const screenHTML = s.screenFn();
    const headlineLines = s.headline.split('\n');

    // phone scale: original phone is 344×706, we want it ~730px wide → scale ≈ 2.12
    const PSCALE = 2.12;
    const scaledPW = Math.round(344 * PSCALE); // 730
    const scaledPH = Math.round(706 * PSCALE); // 1497

    const html = `<!DOCTYPE html>
<html><head>
<meta charset="utf-8">
<style>
${FONT}
${baseCSS}
.root {
  width:${W}px; height:${H}px;
  background: radial-gradient(ellipse 120% 55% at 50% 0%, rgba(20,201,160,0.14) 0%, transparent 55%),
              radial-gradient(ellipse 100% 35% at 50% 100%, rgba(20,201,160,0.07) 0%, transparent 60%),
              ${BG};
  display:flex; flex-direction:column; align-items:center;
  position:relative; overflow:hidden;
}
.root::before {
  content:''; position:absolute; inset:0;
  background-image: radial-gradient(circle, rgba(20,201,160,0.055) 1px, transparent 1px);
  background-size: 36px 36px;
  pointer-events:none;
}
.label-pill {
  margin-top:88px;
  background:rgba(20,201,160,0.12);
  border:1px solid rgba(20,201,160,0.28);
  border-radius:100px;
  padding:10px 34px;
  font-size:22px;
  font-weight:600;
  color:${TEAL};
  letter-spacing:2.5px;
  text-transform:uppercase;
}
.headline {
  margin-top:48px;
  font-size:100px;
  font-weight:800;
  color:#fff;
  line-height:1.07;
  letter-spacing:-3px;
  text-align:center;
  padding:0 60px;
}
.headline em {
  font-style:normal;
  background:linear-gradient(135deg, ${TEAL} 0%, ${TEAL2} 100%);
  -webkit-background-clip:text;
  -webkit-text-fill-color:transparent;
}
.sub {
  margin-top:32px;
  font-size:32px;
  font-weight:400;
  color:rgba(255,255,255,0.42);
  line-height:1.5;
  text-align:center;
  padding:0 80px;
}
/* phone scaled via CSS transform so inner HTML stays the same */
.phone-wrap {
  margin-top:72px;
  width:${W}px;
  display:flex;
  align-items:flex-start;
  justify-content:center;
  height:${scaledPH + 100}px;
  flex-shrink:0;
  position:relative;
}
.phone-glow {
  position:absolute;
  width:${scaledPW + 200}px; height:${Math.round(scaledPH * 0.5)}px;
  background:radial-gradient(ellipse, color-mix(in srgb, var(--gc) 22%, transparent) 0%, transparent 70%);
  pointer-events:none; z-index:0;
  border-radius:50%;
  top:${Math.round(scaledPH * 0.55)}px; left:50%; transform:translateX(-50%);
}
.phone-scale-container {
  position:relative; z-index:1;
  width:${scaledPW}px;
  height:${scaledPH}px;
  display:flex;
  justify-content:center;
}
.phone-scale-inner {
  transform: scale(${PSCALE});
  transform-origin: top center;
  width:344px;
  height:706px;
  flex-shrink:0;
}
.phone-outer { width:344px; height:706px; }
.phone-inner { border-radius:52px; }
.dynamic-island { width:94px; height:30px; top:14px; }
.screen-content { padding-top:52px; }
</style>
</head><body>
<div class="root">
  <div class="label-pill">PepScan</div>
  <div class="headline">${headlineLines.map((l,i)=>i===0?`<em>${l}</em>`:l).join('<br>')}</div>
  <div class="sub">${s.sub.replace(/\n/g,'<br>')}</div>
  <div class="phone-wrap">
    <div class="phone-glow" style="--gc:${s.accentColor}"></div>
    <div class="phone-scale-container">
      <div class="phone-scale-inner">
        <div class="phone-outer">
          <div class="phone-inner">
            <div class="dynamic-island"></div>
            <div class="screen-content">${screenHTML}</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</div>
</body></html>`;

    await page.setContent(html, { waitUntil: 'networkidle0', timeout: 30000 });
    await new Promise(r => setTimeout(r, 500));

    const outPath = path.join(__dirname, s.file);
    await page.screenshot({ path: outPath, type: 'png', clip: { x:0, y:0, width:W, height:H } });
    console.log(`✓ ${s.file}`);
    await page.close();
  }

  await browser.close();
  console.log('Done.');
}

renderAll().catch(e => { console.error(e); process.exit(1); });
