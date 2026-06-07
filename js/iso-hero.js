/**
 * iso-hero.js — Procedural isometric renderer v2
 * Full-canvas background, hollow/wireframe/ghost cubes, maximum disorder.
 */
(function () {
  'use strict';

  /* ═══════════════════════════════════════════════════════════
     CONFIGURATION
  ═══════════════════════════════════════════════════════════ */
  const GRID_W    = 22;   /* columns */
  const GRID_H    = 14;   /* rows */
  const MAX_H     = 7;    /* max stack height */
  const BUILD_SPD = 3.0;  /* build animation speed */
  const FLOAT_AMP = 1.6;  /* float oscillation amplitude px */
  const FLOAT_SPD = 0.48; /* float oscillation frequency */

  /* ═══════════════════════════════════════════════════════════
     COLOUR PALETTES — solid / ghost / wire / frame × light/dark
  ═══════════════════════════════════════════════════════════ */
  const PALETTES = {
    light: {
      bg: ['#eadcbd', '#f4ead2'],
      solid: {
        normal:    { top:'#f0dfb7', left:'#c99a43', right:'#8d5d24' },
        highlight: { top:'#f7e8c4', left:'#d07a31', right:'#7c2f18' },
        accent:    { top:'#fff0c8', left:'#b8862f', right:'#7c0d0d' },
      },
      ghost: {
        normal:    { top:'rgba(201,148,58,0.12)', left:'rgba(141,93,36,0.10)', right:'rgba(90,60,28,0.08)' },
        highlight: { top:'rgba(226,118,45,0.13)', left:'rgba(124,47,24,0.10)', right:'rgba(70,24,14,0.08)' },
        accent:    { top:'rgba(255,240,200,0.16)', left:'rgba(184,134,47,0.13)', right:'rgba(124,13,13,0.10)' },
      },
      wire: {
        normal:    'rgba(154,103,37,0.38)',
        highlight: 'rgba(226,118,45,0.50)',
        accent:    'rgba(201,148,58,0.78)',
      },
      frame: {
        normal:    { top:'rgba(201,148,58,0.05)', left:'rgba(141,93,36,0.04)', right:'rgba(90,60,28,0.03)', edge:'rgba(154,103,37,0.56)' },
        highlight: { top:'rgba(226,118,45,0.06)', left:'rgba(124,47,24,0.05)', right:'rgba(70,24,14,0.04)', edge:'rgba(226,118,45,0.68)' },
        accent:    { top:'rgba(255,240,200,0.08)', left:'rgba(184,134,47,0.06)', right:'rgba(124,13,13,0.05)', edge:'rgba(201,148,58,0.86)' },
      },
      solidEdge: 'rgba(255,245,210,0.34)',
      ghostEdge: 'rgba(154,103,37,0.22)',
      glow:      'rgba(201,148,58,0.38)',
      glowH:     'rgba(226,118,45,0.42)',
    },
    dark: {
      bg: ['#080807', '#16110d'],
      solid: {
        normal:    { top:'#2a2117', left:'#18120d', right:'#0e0b08' },
        highlight: { top:'#3a2118', left:'#22110d', right:'#100807' },
        accent:    { top:'#4b260f', left:'#2d160b', right:'#120807' },
      },
      ghost: {
        normal:    { top:'rgba(201,148,58,0.10)', left:'rgba(201,148,58,0.07)', right:'rgba(201,148,58,0.05)' },
        highlight: { top:'rgba(226,118,45,0.12)', left:'rgba(226,118,45,0.08)', right:'rgba(124,13,13,0.06)' },
        accent:    { top:'rgba(255,225,160,0.14)', left:'rgba(201,148,58,0.10)', right:'rgba(124,13,13,0.08)' },
      },
      wire: {
        normal:    'rgba(201,148,58,0.30)',
        highlight: 'rgba(226,118,45,0.42)',
        accent:    'rgba(215,173,90,0.72)',
      },
      frame: {
        normal:    { top:'rgba(201,148,58,0.04)', left:'rgba(201,148,58,0.03)', right:'rgba(201,148,58,0.02)', edge:'rgba(201,148,58,0.42)' },
        highlight: { top:'rgba(226,118,45,0.05)', left:'rgba(226,118,45,0.04)', right:'rgba(124,13,13,0.03)', edge:'rgba(226,118,45,0.56)' },
        accent:    { top:'rgba(255,225,160,0.07)', left:'rgba(201,148,58,0.05)', right:'rgba(124,13,13,0.04)', edge:'rgba(215,173,90,0.82)' },
      },
      solidEdge: 'rgba(255,245,210,0.08)',
      ghostEdge: 'rgba(201,148,58,0.18)',
      glow:      'rgba(201,148,58,0.42)',
      glowH:     'rgba(226,118,45,0.44)',
    },
  };

  function pal() {
    return PALETTES[document.documentElement.getAttribute('data-theme')] || PALETTES.light;
  }

  /* ═══════════════════════════════════════════════════════════
     STATE
  ═══════════════════════════════════════════════════════════ */
  let canvas, ctx, W, H, DPR = 1;
  let TW, TH, TD;
  let origin = { x: 0, y: 0 };
  let heights = [], tileType = [], tileStyle = [], colPhase = [];
  let cubes = [];
  let startTime = null, raf = null;

  /* ═══════════════════════════════════════════════════════════
     ISOMETRIC MATH
  ═══════════════════════════════════════════════════════════ */
  function project(gx, gy, gz, floatDY) {
    return {
      x: origin.x + (gx - gy) * TW,
      y: origin.y + (gx + gy) * TH - gz * TD - (floatDY || 0),
    };
  }

  /* ═══════════════════════════════════════════════════════════
     CUBE RENDERER — 4 styles: solid / ghost / wire / frame
  ═══════════════════════════════════════════════════════════ */
  function drawCube(gx, gy, gz, type, style, buildFrac, buildRiseY, floatDY) {
    if (buildFrac <= 0) return;
    const { x, y } = project(gx, gy, gz, floatDY - buildRiseY);
    const p  = pal();
    const sD = TD * Math.min(buildFrac, 1);
    const fi = Math.min(1, buildFrac * 2);   /* fade-in alpha */

    /* helper: draw the three faces given fill + stroke colours */
    function faces(topFill, leftFill, rightFill, edgeColor, lw) {
      ctx.lineWidth   = lw;
      ctx.strokeStyle = edgeColor;
      /* top */
      ctx.beginPath();
      ctx.moveTo(x,    y);       ctx.lineTo(x+TW, y+TH);
      ctx.lineTo(x,    y+2*TH);  ctx.lineTo(x-TW, y+TH);
      ctx.closePath();
      ctx.fillStyle = topFill; ctx.fill(); ctx.stroke();
      /* left */
      ctx.beginPath();
      ctx.moveTo(x-TW, y+TH);     ctx.lineTo(x,    y+2*TH);
      ctx.lineTo(x,    y+2*TH+sD); ctx.lineTo(x-TW, y+TH+sD);
      ctx.closePath();
      ctx.fillStyle = leftFill; ctx.fill(); ctx.stroke();
      /* right */
      ctx.beginPath();
      ctx.moveTo(x+TW, y+TH);     ctx.lineTo(x+TW, y+TH+sD);
      ctx.lineTo(x,    y+2*TH+sD); ctx.lineTo(x,    y+2*TH);
      ctx.closePath();
      ctx.fillStyle = rightFill; ctx.fill(); ctx.stroke();
    }

    if (style === 'wire') {
      /* ── Wireframe: edges only, no fill ── */
      const ec = p.wire[type] || p.wire.normal;
      const lw = (type === 'accent') ? 1.6 : (type === 'highlight') ? 1.2 : 0.9;
      ctx.globalAlpha = fi * (type === 'accent' ? 0.88 : type === 'highlight' ? 0.70 : 0.52);
      ctx.shadowColor = type !== 'normal' ? (type === 'accent' ? p.glow : p.glowH) : 'transparent';
      ctx.shadowBlur  = type === 'accent' ? 9 : type === 'highlight' ? 5 : 0;
      faces('rgba(0,0,0,0)', 'rgba(0,0,0,0)', 'rgba(0,0,0,0)', ec, lw);
      ctx.shadowBlur  = 0;

    } else if (style === 'ghost') {
      /* ── Ghost: very transparent fill, thin edge ── */
      const gc = p.ghost[type] || p.ghost.normal;
      ctx.globalAlpha = fi;
      faces(gc.top, gc.left, gc.right, p.ghostEdge, 0.4);

    } else if (style === 'frame') {
      /* ── Frame: minimal fill + glowing bright edge ── */
      const fc = p.frame[type] || p.frame.normal;
      const lw = (type === 'accent') ? 1.9 : (type === 'highlight') ? 1.4 : 1.1;
      ctx.globalAlpha = fi;
      ctx.shadowColor = fc.edge;
      ctx.shadowBlur  = type === 'accent' ? 11 : 6;
      faces(fc.top, fc.left, fc.right, fc.edge, lw);
      ctx.shadowBlur  = 0;

    } else {
      /* ── Solid ── */
      const sc = p.solid[type] || p.solid.normal;
      const isGlow = (type === 'accent' || type === 'highlight') && buildFrac >= 0.8;
      ctx.globalAlpha = fi;
      ctx.shadowColor = isGlow ? (type === 'accent' ? p.glow : p.glowH) : 'transparent';
      ctx.shadowBlur  = isGlow ? 11 : 0;
      faces(sc.top, sc.left, sc.right, p.solidEdge, 0.5);
      ctx.shadowBlur  = 0;
    }

    ctx.globalAlpha = 1;
  }

  /* ═══════════════════════════════════════════════════════════
     GENERATION ALGORITHMS — all include void probability
  ═══════════════════════════════════════════════════════════ */
  function rng(lo, hi) { return lo + Math.floor(Math.random() * (hi - lo + 1)); }

  function classifyH(h) {
    if (h >= MAX_H)                              return 'accent';
    if (h >= MAX_H - 2 && Math.random() > 0.48) return 'highlight';
    return 'normal';
  }

  /* 1. CHAOS — pure disorder */
  function algoChaos() {
    for (let gx = 0; gx < GRID_W; gx++)
      for (let gy = 0; gy < GRID_H; gy++) {
        if (Math.random() < 0.36) { heights[gx][gy] = 0; continue; }
        heights[gx][gy] = rng(1, MAX_H);
        tileType[gx][gy] = classifyH(heights[gx][gy]);
      }
    return 'CHAOS';
  }

  /* 2. SKYLINE — column-based city */
  function algoSkyline() {
    const base = Array.from({length:GRID_W}, () => rng(2, MAX_H - 1));
    for (let gx = 0; gx < GRID_W; gx++)
      for (let gy = 0; gy < GRID_H; gy++) {
        if (Math.random() < 0.30) { heights[gx][gy] = 0; continue; }
        heights[gx][gy] = Math.max(1, Math.min(MAX_H, base[gx] + rng(-2, 2)));
        tileType[gx][gy] = classifyH(heights[gx][gy]);
      }
    return 'SKYLINE';
  }

  /* 3. MOUNTAIN — Gaussian peak with voids */
  function algoMountain() {
    const cx  = GRID_W / 2 + (Math.random() - 0.5) * 5;
    const cy  = GRID_H / 2 + (Math.random() - 0.5) * 3;
    const sig = 2.8 + Math.random() * 2.5;
    for (let gx = 0; gx < GRID_W; gx++)
      for (let gy = 0; gy < GRID_H; gy++) {
        if (Math.random() < 0.24) { heights[gx][gy] = 0; continue; }
        const d2 = ((gx - cx) / sig) ** 2 + ((gy - cy) / (sig * 0.65)) ** 2;
        heights[gx][gy] = Math.max(1, Math.round(MAX_H * Math.exp(-d2)));
        tileType[gx][gy] = classifyH(heights[gx][gy]);
      }
    return 'MOUNTAIN';
  }

  /* 4. WAVE — sinusoidal interference */
  function algoWave() {
    const f1 = 0.38 + Math.random() * 0.52;
    const f2 = 0.38 + Math.random() * 0.52;
    const p1 = Math.random() * Math.PI * 2;
    const p2 = Math.random() * Math.PI * 2;
    for (let gx = 0; gx < GRID_W; gx++)
      for (let gy = 0; gy < GRID_H; gy++) {
        if (Math.random() < 0.22) { heights[gx][gy] = 0; continue; }
        const v = (Math.sin(gx * f1 + p1) + Math.sin(gy * f2 + p2)) * 0.5;
        heights[gx][gy] = Math.max(1, Math.min(MAX_H, Math.round(((v + 1) / 2) * (MAX_H - 1)) + 1));
        tileType[gx][gy] = classifyH(heights[gx][gy]);
      }
    return 'WAVE';
  }

  /* 5. SCATTER — isolated tall towers */
  function algoScatter() {
    for (let gx = 0; gx < GRID_W; gx++)
      for (let gy = 0; gy < GRID_H; gy++) {
        if (Math.random() < 0.50) { heights[gx][gy] = 0; continue; }
        heights[gx][gy] = Math.random() < 0.65 ? rng(1, 2) : 0;
        tileType[gx][gy] = 'normal';
      }
    const count = rng(14, 24);
    for (let i = 0; i < count; i++) {
      const gx = rng(0, GRID_W - 1), gy = rng(0, GRID_H - 1);
      heights[gx][gy]  = rng(MAX_H - 3, MAX_H);
      tileType[gx][gy] = classifyH(heights[gx][gy]);
      for (let dx = -1; dx <= 1; dx++)
        for (let dy = -1; dy <= 1; dy++) {
          const nx = gx + dx, ny = gy + dy;
          if (nx >= 0 && nx < GRID_W && ny >= 0 && ny < GRID_H && (dx || dy)) {
            heights[nx][ny]  = Math.max(heights[nx][ny], rng(2, 4));
            tileType[nx][ny] = 'highlight';
          }
        }
    }
    return 'SCATTER';
  }

  /* 6. TERRACE — concentric rings */
  function algoTerrace() {
    const cx = GRID_W / 2, cy = GRID_H / 2, rings = 4;
    const rMax = Math.min(cx, cy) * 1.1;
    for (let gx = 0; gx < GRID_W; gx++)
      for (let gy = 0; gy < GRID_H; gy++) {
        if (Math.random() < 0.20) { heights[gx][gy] = 0; continue; }
        const d    = Math.sqrt(((gx - cx) * 0.8) ** 2 + ((gy - cy) * 1.2) ** 2);
        const ring = Math.min(rings, Math.floor(d / (rMax / rings)));
        heights[gx][gy] = Math.max(1, Math.min(MAX_H, (rings - ring) * Math.ceil(MAX_H / rings)));
        tileType[gx][gy] = ring === 0 ? 'accent' : ring === 1 ? 'highlight' : 'normal';
      }
    return 'TERRACE';
  }

  /* 7. DRIFT — diagonal gradient with noise */
  function algoDrift() {
    const flip = Math.random() < 0.5;
    for (let gx = 0; gx < GRID_W; gx++)
      for (let gy = 0; gy < GRID_H; gy++) {
        if (Math.random() < 0.28) { heights[gx][gy] = 0; continue; }
        const t = flip
          ? (gx / (GRID_W - 1) + (GRID_H - 1 - gy) / (GRID_H - 1)) / 2
          : (gx / (GRID_W - 1) + gy / (GRID_H - 1)) / 2;
        const noise = (Math.random() - 0.5) * 2.5;
        heights[gx][gy] = Math.max(1, Math.min(MAX_H, Math.round(t * MAX_H + noise)));
        tileType[gx][gy] = classifyH(heights[gx][gy]);
      }
    return 'DRIFT';
  }

  /* ── Assign cube style per tile ── */
  function assignStyles() {
    for (let gx = 0; gx < GRID_W; gx++)
      for (let gy = 0; gy < GRID_H; gy++) {
        if (!heights[gx][gy]) { tileStyle[gx][gy] = 'none'; continue; }
        const t = tileType[gx][gy];
        if (t === 'accent') {
          /* accent tiles: mostly solid or glowing frame */
          tileStyle[gx][gy] = Math.random() < 0.62 ? 'solid' : 'frame';
        } else if (t === 'highlight') {
          /* highlight: mix of solid / frame / wire */
          const r = Math.random();
          tileStyle[gx][gy] = r < 0.40 ? 'solid' : r < 0.68 ? 'frame' : 'wire';
        } else {
          /* normal tiles: full mix with plenty of hollow */
          const r = Math.random();
          if (r < 0.42) tileStyle[gx][gy] = 'solid';
          else if (r < 0.64) tileStyle[gx][gy] = 'ghost';
          else if (r < 0.82) tileStyle[gx][gy] = 'wire';
          else               tileStyle[gx][gy] = 'frame';
        }
      }
  }

  /* ── Run a weighted-random algorithm then add extra disorder ── */
  function generate() {
    heights   = Array.from({length: GRID_W}, () => Array(GRID_H).fill(0));
    tileType  = Array.from({length: GRID_W}, () => Array(GRID_H).fill('normal'));
    tileStyle = Array.from({length: GRID_W}, () => Array(GRID_H).fill('solid'));
    colPhase  = Array.from({length: GRID_W}, () =>
      Array.from({length: GRID_H}, () => Math.random() * Math.PI * 2));

    const algos   = [algoChaos, algoDrift, algoSkyline, algoMountain, algoWave, algoScatter, algoTerrace];
    const weights = [3.0, 2.0, 1.5, 1.2, 1.2, 2.0, 1.0];  /* chaos/drift/scatter weighted higher */
    const total   = weights.reduce((a, b) => a + b, 0);
    let r = Math.random() * total, fi = algos.length - 1;
    for (let i = 0; i < weights.length; i++) { r -= weights[i]; if (r <= 0) { fi = i; break; } }
    const name = algos[fi]();

    /* Extra noise pass: zero out additional tiles for more voids */
    for (let gx = 0; gx < GRID_W; gx++)
      for (let gy = 0; gy < GRID_H; gy++)
        if (heights[gx][gy] > 0 && Math.random() < 0.10)
          heights[gx][gy] = 0;

    assignStyles();

    const lbl = document.getElementById('iso-struct-label');
    if (lbl) lbl.textContent = name;

    cubes = [];
    for (let gx = 0; gx < GRID_W; gx++)
      for (let gy = 0; gy < GRID_H; gy++)
        for (let gz = 0; gz < heights[gx][gy]; gz++)
          cubes.push({
            gx, gy, gz,
            type:  tileType[gx][gy],
            style: tileStyle[gx][gy],
            delay: (gx + gy) * 0.036 + gz * 0.013,
          });

    /* Painter's algorithm: back-to-front */
    cubes.sort((a, b) => ((a.gx + a.gy) - (b.gx + b.gy)) || (a.gz - b.gz));
  }

  /* ═══════════════════════════════════════════════════════════
     RESPONSIVE SIZING — TW fills full canvas width/height
  ═══════════════════════════════════════════════════════════ */
  function computeDims() {
    /* tw_x: tile size so grid spans canvas width */
    const tw_x = W / (GRID_W + GRID_H);
    /* tw_y: tile size so grid spans canvas height
       structure height ≈ TW*[(GRID_W+GRID_H)*0.5 + MAX_H*0.65] */
    const hFactor = (GRID_W + GRID_H) * 0.5 + MAX_H * 0.65;
    const tw_y = H / hFactor;

    /* Use whichever is larger — this guarantees full coverage in both axes */
    TW = Math.round(Math.max(tw_x, tw_y));
    TW = Math.max(14, Math.min(56, TW));
    TH = Math.floor(TW * 0.5);
    TD = Math.floor(TW * 0.65);

    /* Centre the structure horizontally; clip overflow via section overflow:hidden */
    const structW = (GRID_W + GRID_H) * TW;
    const offsetX = Math.floor((W - structW) / 2);
    origin.x = offsetX + GRID_H * TW;

    /* Top of tallest cube sits just at y = 0 */
    origin.y = MAX_H * TD + Math.floor(TH * 0.5);
  }

  /* ═══════════════════════════════════════════════════════════
     RENDER LOOP
  ═══════════════════════════════════════════════════════════ */
  function render(ts) {
    if (!startTime) startTime = ts;
    const t = (ts - startTime) / 1000;

    ctx.clearRect(0, 0, W, H);

    /* Background gradient */
    const p  = pal();
    const bg = ctx.createLinearGradient(0, 0, W, H);
    bg.addColorStop(0, p.bg[0]);
    bg.addColorStop(1, p.bg[1]);
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);

    /* Float offsets — per column so stacked cubes move together */
    const fOff = {};
    for (let gx = 0; gx < GRID_W; gx++)
      for (let gy = 0; gy < GRID_H; gy++)
        fOff[gx + '_' + gy] = Math.sin(t * FLOAT_SPD + colPhase[gx][gy]) * FLOAT_AMP;

    /* Draw cubes back-to-front */
    for (const c of cubes) {
      const age = t - c.delay;
      if (age < 0) continue;
      const buildFrac  = Math.min(1, age * BUILD_SPD);
      const buildRiseY = (1 - buildFrac) * (TD * 2.5);
      const floatDY    = buildFrac >= 1 ? fOff[c.gx + '_' + c.gy] : 0;
      drawCube(c.gx, c.gy, c.gz, c.type, c.style, buildFrac, buildRiseY, floatDY);
    }

    raf = requestAnimationFrame(render);
  }

  /* ═══════════════════════════════════════════════════════════
     INIT
  ═══════════════════════════════════════════════════════════ */
  function init() {
    canvas = document.getElementById('iso-canvas');
    if (!canvas) return;
    ctx = canvas.getContext('2d');

    function resize() {
      const wrap = canvas.parentElement;
      DPR = window.devicePixelRatio || 1;
      W   = wrap.clientWidth;
      H   = wrap.clientHeight;
      canvas.width        = W * DPR;
      canvas.height       = H * DPR;
      canvas.style.width  = W + 'px';
      canvas.style.height = H + 'px';
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
      computeDims();
    }

    resize();
    generate();

    /* Click / tap → regenerate */
    canvas.style.cursor = 'crosshair';
    canvas.addEventListener('click', () => {
      if (raf) cancelAnimationFrame(raf);
      startTime = null;
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
      generate();
      raf = requestAnimationFrame(render);
    });

    let resizeTimer;
    window.addEventListener('resize', () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => { resize(); }, 200);
    });

    if (raf) cancelAnimationFrame(raf);
    raf = requestAnimationFrame(render);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
