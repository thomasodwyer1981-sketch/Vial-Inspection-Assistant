/**
 * VialScreen — Molecular Background Pattern
 *
 * Renders a peptide backbone SVG as a full-bleed background texture.
 * Pattern depicts: N-Cα-C(=O) repeating backbone, aromatic ring
 * (Phe/Tyr residue), alpha-carbon nodes, and NH hydrogens —
 * stylised from standard chemistry line-drawing convention.
 *
 * Designed to tile seamlessly at 320×200px.
 */

interface MolecularPatternProps {
  /** Stroke and fill color — defaults to currentColor */
  color?: string;
  /** Overall opacity 0-1 */
  opacity?: number;
  className?: string;
}

// ── Hex ring helper (6-vertex regular polygon) ───────────────
function hexPoints(cx: number, cy: number, r: number): string {
  return Array.from({ length: 6 }, (_, i) => {
    const angle = (Math.PI / 3) * i - Math.PI / 2;
    return `${cx + r * Math.cos(angle)},${cy + r * Math.sin(angle)}`;
  }).join(' ');
}

// ── Backbone nodes & derived geometry ────────────────────────
// Zigzag: 8 steps × 40px = 320px wide, amplitude ±22px around y=115
const STEP = 40;
const MID_Y = 115;
const AMP = 22;
const BACKBONE = Array.from({ length: 9 }, (_, i) => ({
  x: i * STEP,
  y: MID_Y + (i % 2 === 0 ? AMP : -AMP),
}));

// Carbonyl branches: off each "up" node (odd index = y=MID_Y-AMP)
const CARBONYLS = BACKBONE.filter((_, i) => i % 2 === 1 && i < 8).map((pt) => ({
  cx: pt.x,
  cy: pt.y,
  ox: pt.x + 12,
  oy: pt.y - 18,
}));

// NH branches: off each "down" node (even index, skip 0 and 8)
const NH_BRANCHES = BACKBONE.filter((_, i) => i % 2 === 0 && i > 0 && i < 8).map((pt) => ({
  cx: pt.x,
  cy: pt.y,
  nx: pt.x - 12,
  ny: pt.y + 18,
}));

// Aromatic ring — Phe residue hanging off Cα at index 3 (x=120, y=93)
const RING_CX = 108;
const RING_CY = 60;
const RING_R = 17;
const RING_CA = BACKBONE[3]; // x=120, y=93 — the alpha carbon

export default function MolecularPattern({
  color = 'currentColor',
  opacity = 0.07,
  className = '',
}: MolecularPatternProps) {
  return (
    <div
      className={`absolute inset-0 overflow-hidden pointer-events-none select-none ${className}`}
      aria-hidden="true"
    >
      <svg
        width="100%"
        height="100%"
        xmlns="http://www.w3.org/2000/svg"
        style={{ opacity }}
      >
        <defs>
          <pattern
            id="peptide-tile"
            x="0"
            y="0"
            width="320"
            height="200"
            patternUnits="userSpaceOnUse"
          >
            <g
              stroke={color}
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            >
              {/* ── Backbone zigzag ──────────────────────── */}
              <polyline
                points={BACKBONE.map((p) => `${p.x},${p.y}`).join(' ')}
                strokeWidth="1.8"
              />

              {/* ── Carbonyl C=O branches ────────────────── */}
              {CARBONYLS.map((c, i) => (
                <g key={`co-${i}`}>
                  {/* Single bond to carbonyl C */}
                  <line x1={c.cx} y1={c.cy} x2={c.ox} y2={c.oy} />
                  {/* Double bond — parallel line 3px offset */}
                  <line
                    x1={c.cx - 3}
                    y1={c.cy - 1}
                    x2={c.ox - 3}
                    y2={c.oy - 1}
                    strokeWidth="1"
                    strokeOpacity="0.6"
                  />
                  {/* Oxygen atom circle */}
                  <circle cx={c.ox} cy={c.oy} r="3" fill={color} />
                </g>
              ))}

              {/* ── N–H branches ─────────────────────────── */}
              {NH_BRANCHES.map((n, i) => (
                <g key={`nh-${i}`}>
                  <line x1={n.cx} y1={n.cy} x2={n.nx} y2={n.ny} />
                  {/* H terminal */}
                  <circle cx={n.nx} cy={n.ny} r="2" fill={color} fillOpacity="0.5" />
                </g>
              ))}

              {/* ── Alpha-carbon nodes ───────────────────── */}
              {BACKBONE.slice(1, 8).map((pt, i) => (
                <circle
                  key={`ca-${i}`}
                  cx={pt.x}
                  cy={pt.y}
                  r="3.5"
                  fill={color}
                  fillOpacity="0.5"
                />
              ))}

              {/* ── Aromatic ring (Phe residue) ──────────── */}
              {/* Cβ bond: from Cα to ring bottom */}
              <line
                x1={RING_CA.x}
                y1={RING_CA.y}
                x2={RING_CX}
                y2={RING_CY + RING_R + 2}
              />

              {/* Ring outline */}
              <polygon
                points={hexPoints(RING_CX, RING_CY, RING_R)}
                strokeWidth="1.6"
              />

              {/* Alternate double bonds inside ring (lines at 70% radius) */}
              {[0, 2, 4].map((i) => {
                const a1 = (Math.PI / 3) * i - Math.PI / 2;
                const a2 = (Math.PI / 3) * (i + 1) - Math.PI / 2;
                const innerR = RING_R * 0.65;
                return (
                  <line
                    key={`db-${i}`}
                    x1={RING_CX + innerR * Math.cos(a1)}
                    y1={RING_CY + innerR * Math.sin(a1)}
                    x2={RING_CX + innerR * Math.cos(a2)}
                    y2={RING_CY + innerR * Math.sin(a2)}
                    strokeWidth="1"
                    strokeOpacity="0.55"
                  />
                );
              })}

              {/* ── Terminal nitrogen nodes ──────────────── */}
              <circle cx={BACKBONE[0].x} cy={BACKBONE[0].y} r="4" fill={color} fillOpacity="0.7" />
              <circle cx={BACKBONE[8].x} cy={BACKBONE[8].y} r="4" fill={color} fillOpacity="0.7" />
            </g>

            {/* ── Amino acid single-letter watermarks ─────── */}
            {[
              { letter: 'G', x: 22, y: 185, size: 44, rot: -12 },
              { letter: 'K', x: 260, y: 30, size: 38, rot: 8 },
              { letter: 'P', x: 148, y: 190, size: 50, rot: 0 },
              { letter: 'W', x: 50, y: 48, size: 36, rot: -6 },
              { letter: 'Y', x: 288, y: 160, size: 42, rot: 14 },
            ].map(({ letter, x, y, size, rot }) => (
              <text
                key={letter}
                x={x}
                y={y}
                fontSize={size}
                fontFamily="'Spline Sans Mono', 'Courier New', monospace"
                fontWeight="700"
                fill={color}
                fillOpacity="0.35"
                transform={`rotate(${rot}, ${x}, ${y})`}
                letterSpacing="-1"
              >
                {letter}
              </text>
            ))}
          </pattern>
        </defs>

        {/* Fill entire surface with the repeating tile */}
        <rect width="100%" height="100%" fill="url(#peptide-tile)" />
      </svg>
    </div>
  );
}
