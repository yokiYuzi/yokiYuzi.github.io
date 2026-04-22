/**
 * iso-hero.js — Procedural isometric structure generator
 * Renders a randomised 3D cube landscape on the homepage hero canvas.
 * Six generation algorithms, smooth build + float animation, dark-mode aware.
 */
(function () {
  'use strict';

  /* ═══════════════════════════════════════════════════════════
     CONFIGURATION
  ═══════════════════════════════════════════════════════════ */
  const GRID_W    = 14;    // columns (gx)
  const GRID_H    = 9;     // rows    (gy)
  const MAX_H     = 9;     // max stack height in cubes
  const BUILD_SPD = 4.5;   // cubes per second (build-up speed)
  const FLOAT_AMP = 1.4;   // float oscillation amplitude (px)
  const FLOAT_SPD = 0.55;  // float oscillation frequency (rad/s)

  /* ═══════════════════════════════════════════════════════════
     COLOUR PALETTES
  ═══════════════════════════════════════════════════════════ */
  const PALETTES = {
    light: {
      bg:  ['#dbeeff', '#edf6ff'],   /* canvas background gradient */
      normal:    { top: '#daeeff', left: '#4a84cc', right: '#265899' },
      highlight: { top: '#c0e8ff', left: '#0099cc', right: '#006688' },
      accent:    { top: '#ffffff', left: '#1a6fe8', right: '#0044bb' },
      edge:  'rgba(255,255,255,0.28)',
      glow:  'rgba(0,87,231,0.32)',
      glowH: 'rgba(0,180,216,0.40)',
    },
    dark: {
      bg:  ['#050c18', '#0a1625'],
      normal:    { top: '#142f4e', left: '#0c1f38', right: '#060e1d' },
      highlight: { top: '#004466', left: '#002d44', right: '#001522' },
      accent:    { top: '#1e4d99', left: '#0d3065', right: '#071630' },
      edge:  'rgba(255,255,255,0.07)',
      glow:  'rgba(74,158,255,0.40)',
      glowH: 'rgba(0,212,255,0.45)',
    },
  };

  function pal() {
    const t = document.documentElement.getAttribute('data-theme') || 'light';
    return PALETTES[t] || PALETTES.light;
  }

  /* ═══════════════════════════════════════════════════════════
     STATE
  ═══════════════════════════════════════════════════════════ */
  let canvas, ctx, W, H, DPR = 1;
  let TW, TH, TD;          /* tile half-width, half-height, depth */
  let origin = {x:0, y:0}; /* screen origin for (gx=0,gy=0,gz=0) */

  let heights = [];         /* [GRID_W][GRID_H] — target stack heights */
  let tileType = [];        /* [GRID_W][GRID_H] — 'normal'|'highlight'|'accent' */
  let cubes   = [];         /* sorted draw list: {gx,gy,gz,type,delay,phase} */
  let colPhase = [];        /* [GRID_W][GRID_H] — float phase per column */

  let startTime = null;
  let raf = null;

  /* ═══════════════════════════════════════════════════════════
     ISOMETRIC MATH
  ═══════════════════════════════════════════════════════════ */
  /* Project grid (gx,gy,gz) → screen (x,y).
     floatDY = vertical float offset applied per column (px). */
  function project(gx, gy, gz, floatDY) {
    return {
      x: origin.x + (gx - gy) * TW,
      y: origin.y + (gx + gy) * TH - gz * TD - (floatDY || 0)
    };
  }

  /* ═══════════════════════════════════════════════════════════
     CUBE RENDERER
  ═══════════════════════════════════════════════════════════ */
  /* Draw one cube.
     buildFrac [0,1]: fraction of side height visible (build animation).
     buildRiseY: extra downward offset during build (rises upward as → 1). */
  function drawCube(gx, gy, gz, type, buildFrac, buildRiseY, floatDY) {
    if (buildFrac <= 0) return;
    const {x, y} = project(gx, gy, gz, floatDY - buildRiseY);
    const p   = pal();
    const c   = p[type] || p.normal;
    const sD  = TD * Math.min(buildFrac, 1);  /* scaled depth */
    const a   = Math.min(1, buildFrac * 2);   /* alpha fades in */

    ctx.globalAlpha = a;

    /* glow for accent / highlight */
    const isGlow = (type === 'accent' || type === 'highlight') && buildFrac >= 0.8;
    if (isGlow) {
      ctx.shadowColor = (type === 'accent') ? p.glow : p.glowH;
      ctx.shadowBlur  = 10;
    } else {
      ctx.shadowBlur = 0;
    }

    ctx.lineWidth   = 0.5;
    ctx.strokeStyle = p.edge;

    /* ── Top face (rhombus) ── */
    ctx.beginPath();
    ctx.moveTo(x,      y);
    ctx.lineTo(x + TW, y + TH);
    ctx.lineTo(x,      y + 2*TH);
    ctx.lineTo(x - TW, y + TH);
    ctx.closePath();
    ctx.fillStyle = c.top;
    ctx.fill();
    ctx.stroke();

    /* ── Left face ── */
    ctx.beginPath();
    ctx.moveTo(x - TW, y + TH);
    ctx.lineTo(x,      y + 2*TH);
    ctx.lineTo(x,      y + 2*TH + sD);
    ctx.lineTo(x - TW, y + TH   + sD);
    ctx.closePath();
    ctx.fillStyle = c.left;
    ctx.fill();
    ctx.stroke();

    /* ── Right face ── */
    ctx.beginPath();
    ctx.moveTo(x + TW, y + TH);
    ctx.lineTo(x + TW, y + TH   + sD);
    ctx.lineTo(x,      y + 2*TH + sD);
    ctx.lineTo(x,      y + 2*TH);
    ctx.closePath();
    ctx.fillStyle = c.right;
    ctx.fill();
    ctx.stroke();

    ctx.shadowBlur  = 0;
    ctx.globalAlpha = 1;
  }

  /* ═══════════════════════════════════════════════════════════
     GENERATION ALGORITHMS
  ═══════════════════════════════════════════════════════════ */
  function rng(lo, hi) { return lo + Math.floor(Math.random() * (hi - lo + 1)); }

  /* Classify height into cube type */
  function classifyH(h) {
    if (h >= MAX_H)       return 'accent';
    if (h >= MAX_H - 2 && Math.random() > 0.45) return 'highlight';
    return 'normal';
  }

  /* 1. SKYLINE — city-like towers, clustered heights */
  function algoSkyline() {
    const baseCols = [];
    for (let gx = 0; gx < GRID_W; gx++)
      baseCols.push(rng(2, MAX_H - 1));          /* each column has a "base" height */
    for (let gx = 0; gx < GRID_W; gx++) {
      for (let gy = 0; gy < GRID_H; gy++) {
        const jitter = rng(-2, 2);
        const skip   = Math.random() < 0.12;
        heights[gx][gy] = skip ? 0 : Math.max(1, Math.min(MAX_H, baseCols[gx] + jitter));
        tileType[gx][gy] = classifyH(heights[gx][gy]);
      }
    }
    return 'SKYLINE';
  }

  /* 2. MOUNTAIN — Gaussian-ish peak from centre */
  function algoMountain() {
    const cx  = GRID_W / 2 + (Math.random() - 0.5) * 3;
    const cy  = GRID_H / 2 + (Math.random() - 0.5) * 2;
    const sig = 2.5 + Math.random() * 2;
    for (let gx = 0; gx < GRID_W; gx++) {
      for (let gy = 0; gy < GRID_H; gy++) {
        const d2 = ((gx-cx)/sig)**2 + ((gy-cy)/(sig*0.65))**2;
        const h  = Math.round(MAX_H * Math.exp(-d2));
        heights[gx][gy] = Math.max(1, h);
        tileType[gx][gy] = classifyH(heights[gx][gy]);
      }
    }
    return 'MOUNTAIN';
  }

  /* 3. TERRACE — concentric stepped rings */
  function algoTerrace() {
    const cx    = GRID_W / 2, cy = GRID_H / 2;
    const rings = 4;
    const rMax  = Math.min(cx, cy) * 1.05;
    for (let gx = 0; gx < GRID_W; gx++) {
      for (let gy = 0; gy < GRID_H; gy++) {
        const d    = Math.sqrt(((gx-cx)*0.8)**2 + ((gy-cy)*1.2)**2);
        const ring = Math.min(rings, Math.floor(d / (rMax / rings)));
        const h    = Math.max(1, (rings - ring) * Math.ceil(MAX_H / rings));
        heights[gx][gy] = Math.min(MAX_H, h);
        tileType[gx][gy] = ring === 0 ? 'accent' : ring === 1 ? 'highlight' : 'normal';
      }
    }
    return 'TERRACE';
  }

  /* 4. WAVE — sinusoidal interference pattern */
  function algoWave() {
    const f1  = 0.45 + Math.random() * 0.45;
    const f2  = 0.45 + Math.random() * 0.45;
    const ph  = Math.random() * Math.PI * 2;
    const ph2 = Math.random() * Math.PI * 2;
    for (let gx = 0; gx < GRID_W; gx++) {
      for (let gy = 0; gy < GRID_H; gy++) {
        const v = (Math.sin(gx * f1 + ph) + Math.sin(gy * f2 + ph2)) * 0.5;
        const h = Math.round(((v + 1) / 2) * (MAX_H - 1)) + 1;
        heights[gx][gy] = Math.max(1, Math.min(MAX_H, h));
        tileType[gx][gy] = classifyH(heights[gx][gy]);
      }
    }
    return 'WAVE';
  }

  /* 5. SCATTER — isolated tall towers over a low base */
  function algoScatter() {
    /* low base */
    for (let gx = 0; gx < GRID_W; gx++)
      for (let gy = 0; gy < GRID_H; gy++) {
        heights[gx][gy] = Math.random() < 0.6 ? rng(1, 2) : 0;
        tileType[gx][gy] = 'normal';
      }
    /* tall towers */
    const count = rng(10, 18);
    for (let i = 0; i < count; i++) {
      const gx = rng(1, GRID_W - 2), gy = rng(1, GRID_H - 2);
      heights[gx][gy]  = rng(MAX_H - 3, MAX_H);
      tileType[gx][gy] = classifyH(heights[gx][gy]);
      /* small halo around each tower */
      for (let dx = -1; dx <= 1; dx++)
        for (let dy = -1; dy <= 1; dy++) {
          const nx = gx+dx, ny = gy+dy;
          if (nx >= 0 && nx < GRID_W && ny >= 0 && ny < GRID_H && (dx||dy)) {
            heights[nx][ny]  = Math.max(heights[nx][ny], rng(2,4));
            tileType[nx][ny] = 'highlight';
          }
        }
    }
    return 'SCATTER';
  }

  /* 6. DIAGONAL — staircase ridge across the grid */
  function algoDiagonal() {
    const flip = Math.random() < 0.5;
    for (let gx = 0; gx < GRID_W; gx++) {
      for (let gy = 0; gy < GRID_H; gy++) {
        const diag = flip ? (gx + gy) : (gx + (GRID_H - 1 - gy));
        const maxD = GRID_W + GRID_H - 2;
        /* ridge near the middle diagonal */
        const mid  = maxD / 2;
        const dist = Math.abs(diag - mid);
        const h    = Math.round(MAX_H * Math.max(0, 1 - dist / (maxD * 0.45)));
        heights[gx][gy] = Math.max(1, Math.min(MAX_H, h + rng(-1,1)));
        tileType[gx][gy] = classifyH(heights[gx][gy]);
      }
    }
    return 'DIAGONAL';
  }

  /* ── Run a random algorithm ── */
  function generate() {
    heights  = Array.from({length:GRID_W}, () => Array(GRID_H).fill(0));
    tileType = Array.from({length:GRID_W}, () => Array(GRID_H).fill('normal'));
    colPhase = Array.from({length:GRID_W}, () =>
      Array.from({length:GRID_H}, () => Math.random() * Math.PI * 2));

    const algos = [algoSkyline, algoMountain, algoTerrace, algoWave, algoScatter, algoDiagonal];
    const fn    = algos[Math.floor(Math.random() * algos.length)];
    const name  = fn();

    /* Update label */
    const lbl = document.getElementById('iso-struct-label');
    if (lbl) lbl.textContent = name;

    /* Build painter-sorted cube list */
    cubes = [];
    for (let gx = 0; gx < GRID_W; gx++) {
      for (let gy = 0; gy < GRID_H; gy++) {
        for (let gz = 0; gz < heights[gx][gy]; gz++) {
          cubes.push({
            gx, gy, gz,
            type:  tileType[gx][gy],
            delay: (gx + gy) * 0.055 + gz * 0.018,  /* build stagger */
          });
        }
      }
    }

    /* Painter's algorithm: back-to-front (smaller gx+gy drawn first)
       Within same column, lower gz drawn first. */
    cubes.sort((a, b) => ((a.gx+a.gy) - (b.gx+b.gy)) || (a.gz - b.gz));
  }

  /* ═══════════════════════════════════════════════════════════
     RESPONSIVE SIZING
  ═══════════════════════════════════════════════════════════ */
  function computeDims() {
    /* W, H are logical (CSS) pixels — set by resize() */

    /* Scale tile to fit the grid inside the canvas */
    const maxTWbyX = Math.floor(W / (GRID_W + GRID_H + 2));
    const maxTWbyY = Math.floor((H * 0.82) / ((GRID_W + GRID_H) * 0.5 + MAX_H * 0.65));
    TW = Math.min(44, Math.max(16, Math.min(maxTWbyX, maxTWbyY)));
    TH = Math.floor(TW / 2);
    TD = Math.floor(TW * 0.62);

    /* Position origin so structure sits in the right 55% of canvas,
       leaving left space for the text overlay. */
    const structSpanX = (GRID_W + GRID_H) * TW;
    const structSpanY = (GRID_W + GRID_H) * TH + MAX_H * TD;
    const cx = W * 0.64;  /* horizontal centre of structure */
    const cy = H * 0.52;  /* vertical  centre of structure */

    origin = {
      x: cx + (GRID_H - 1) * TW - structSpanX / 2,
      y: cy + MAX_H * TD       - structSpanY / 2,
    };
  }

  /* ═══════════════════════════════════════════════════════════
     RENDER LOOP
  ═══════════════════════════════════════════════════════════ */
  function render(ts) {
    if (!startTime) startTime = ts;
    const t = (ts - startTime) / 1000;   /* elapsed seconds */

    ctx.clearRect(0, 0, W, H);

    /* Background gradient */
    const p  = pal();
    const bg = ctx.createLinearGradient(0, 0, W, H);
    bg.addColorStop(0, p.bg[0]);
    bg.addColorStop(1, p.bg[1]);
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);

    /* Pre-compute float offsets per column (all cubes in a column move together) */
    const fOff = {};
    for (let gx = 0; gx < GRID_W; gx++)
      for (let gy = 0; gy < GRID_H; gy++)
        fOff[gx+'_'+gy] = Math.sin(t * FLOAT_SPD + colPhase[gx][gy]) * FLOAT_AMP;

    /* Draw cubes */
    for (const c of cubes) {
      const age = t - c.delay;
      if (age < 0) continue;

      const buildFrac  = Math.min(1, age * BUILD_SPD);
      const buildRiseY = (1 - buildFrac) * (TD * 2.5);  /* rises from below */
      const floatDY    = buildFrac >= 1 ? fOff[c.gx+'_'+c.gy] : 0;

      drawCube(c.gx, c.gy, c.gz, c.type, buildFrac, buildRiseY, floatDY);
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
      W = wrap.clientWidth;
      H = wrap.clientHeight;
      canvas.width  = W * DPR;
      canvas.height = H * DPR;
      canvas.style.width  = W + 'px';
      canvas.style.height = H + 'px';
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
      computeDims();
    }

    resize();
    generate();

    /* Click or touch → regenerate a new structure */
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
