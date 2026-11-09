/* =====================================================================
   Jade Veil · 朱砂落款 — a cinnabar seal pressed onto the picture at the end.
   The seal is carved procedurally on a canvas: a cinnabar block, the characters cut out of it (白文),
   ink that takes unevenly, edges chipped like stone. The inscription beside it gives the current
   year in the sexagenary cycle and the season, so it stays true every time someone visits.
   Glyphs: subsets of Noto Serif CJK SC (SIL OFL 1.1), embedded below — no font request.
   ===================================================================== */

const SEAL_FONT = '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';
const NOTE_FONT = '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';

let fontsReady = null;
export function loadFonts() {
  if (fontsReady) return fontsReady;
  const face = (name, b64, weight) => {
    const bin = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
    const f = new FontFace(name, bin.buffer, { weight, display: 'block' });
    document.fonts.add(f);
    return f.load();
  };
  fontsReady = Promise.all([face('Jade Veil Seal', SEAL_FONT, '900'), face('Jade Veil Note', NOTE_FONT, '600')]).catch(() => null);
  return fontsReady;
}

/* 丙午冬: the year by the sexagenary cycle (turning at 立春, about 4 February) and the season by the solar terms. */
export function inscription(date = new Date()) {
  const STEM = '甲乙丙丁戊己庚辛壬癸', BRANCH = '子丑寅卯辰巳午未申酉戌亥';
  const m = date.getMonth() + 1, d = date.getDate(), md = m * 100 + d;
  const y = date.getFullYear() - (md < 204 ? 1 : 0);
  const season = md >= 204 && md < 505 ? '春' : md >= 505 && md < 807 ? '夏' : md >= 807 && md < 1107 ? '秋' : '冬';
  return STEM[((y - 4) % 10 + 10) % 10] + BRANCH[((y - 4) % 12 + 12) % 12] + season;
}

/* small deterministic noise for the carving */
function hash(x, y) { let h = (x * 374761393 + y * 668265263) | 0; h = (h ^ (h >>> 13)) * 1274126177 | 0; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; }
function vnoise(x, y) {
  const xi = Math.floor(x), yi = Math.floor(y), tx = x - xi, ty = y - yi, sx = tx * tx * (3 - 2 * tx), sy = ty * ty * (3 - 2 * ty);
  const a = hash(xi, yi), b = hash(xi + 1, yi), c = hash(xi, yi + 1), d = hash(xi + 1, yi + 1);
  return a + (b - a) * sx + (c - a) * sy + (a - b - c + d) * sx * sy;
}

function carve(text, px) {
  const chars = [...text];
  const cols = chars.length >= 4 ? 2 : 1, rows = chars.length >= 4 ? 2 : chars.length;
  const W = cols === 1 && rows > 1 ? Math.round(px * 0.62) : px, H = px;
  const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
  const g = cv.getContext('2d');
  /* the cinnabar block: a slightly irregular rounded square */
  const pad = px * 0.035, jag = px * 0.009, ex = 2 / 9;          // a superellipse: a square with softened corners
  const ra = W / 2 - pad, rb = H / 2 - pad, steps = 260;
  g.beginPath();
  for (let i = 0; i < steps; i++) {
    const t = i / steps * Math.PI * 2, c = Math.cos(t), s = Math.sin(t);
    const n = (vnoise(i * 0.31, 3.1) - 0.5) * 2 * jag + (vnoise(i * 1.7, 8.3) - 0.5) * jag * 0.6;
    const x = W / 2 + Math.sign(c) * Math.pow(Math.abs(c), ex) * (ra + n);
    const y = H / 2 + Math.sign(s) * Math.pow(Math.abs(s), ex) * (rb + n);
    i ? g.lineTo(x, y) : g.moveTo(x, y);
  }
  g.closePath();
  g.fillStyle = '#b3302a';
  g.fill();
  /* the characters are cut out of the block (白文), read right column first, top to bottom */
  g.globalCompositeOperation = 'destination-out';
  g.fillStyle = '#000'; g.textAlign = 'center'; g.textBaseline = 'middle';
  const inner = px * 0.155, cw = (W - inner * 2) / cols, ch = (H - inner * 2) / rows;
  g.font = `900 ${Math.min(cw, ch) * 0.98}px "Jade Veil Seal", "Noto Serif SC", "Songti SC", "STSong", serif`;
  chars.slice(0, cols * rows).forEach((c, i) => {
    const col = cols - 1 - Math.floor(i / rows), row = i % rows;
    g.save();
    g.translate(inner + cw * (col + 0.5), inner + ch * (row + 0.5) + ch * 0.02);
    g.scale(cw / ch * 1.04, 1.06);
    g.fillText(c, 0, 0);
    g.restore();
  });
  /* stone and ink: uneven take-up, a lighter corner where the press was weaker, chips along the edges */
  const img = g.getImageData(0, 0, W, H), a = img.data, A = (x, y) => (x < 0 || y < 0 || x >= W || y >= H ? 0 : a[(y * W + x) * 4 + 3]);
  const edge = new Uint8Array(W * H), R = Math.max(2, Math.round(px * 0.012));
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    if (!A(x, y)) continue;
    if (!A(x - R, y) || !A(x + R, y) || !A(x, y - R) || !A(x, y + R)) edge[y * W + x] = 1;
  }
  const press = Math.random() * 6.28;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = (y * W + x) * 4; if (!a[i + 3]) continue;
    const n1 = vnoise(x / (px * 0.018), y / (px * 0.018)), n2 = vnoise(x / (px * 0.12) + 9, y / (px * 0.12) + 4);
    const corner = 0.5 + 0.5 * Math.cos(press + Math.atan2(y - H / 2, x - W / 2)) * Math.min(1, Math.hypot(x - W / 2, y - H / 2) / (W * 0.6));
    let k = 0.9 + 0.1 * n1 - 0.16 * corner * n2;
    if (edge[y * W + x] && n1 * 0.6 + hash(x, y) * 0.4 > 0.7) k = 0;                // chipped edges
    if (hash(x * 3 + 7, y * 5 + 1) > 0.996 && n2 > 0.45) k *= 0.15;                    // specks where the ink did not take
    a[i + 3] = Math.max(0, Math.min(255, a[i + 3] * k));
    const tone = 0.94 + 0.08 * n2; a[i] = Math.min(255, 179 * tone); a[i + 1] = 48 * tone; a[i + 2] = 42 * tone;
  }
  g.putImageData(img, 0, 0);
  return cv;
}

/* createSeal → { el, stamp(), lift(), centre() }   Placed at the end of the last chapter, like a seal after the text of a scroll. */
export async function createSeal({ text = '格物致知', note = inscription(), size = 92, mount = document.body } = {}) {   // text: 1, 2 or 4 characters
  await loadFonts();
  const el = document.createElement('div');
  el.className = 'veil-seal'; el.setAttribute('aria-hidden', 'true');
  const n = document.createElement('div'); n.className = 'veil-seal__note'; n.textContent = note;
  const cv = carve(text, Math.round(size * 2.6));
  cv.className = 'veil-seal__stone';
  cv.style.width = Math.round(cv.width / 2.6) + 'px'; cv.style.height = Math.round(cv.height / 2.6) + 'px';
  el.append(n, cv);
  mount.appendChild(el);
  let down = false;
  return {
    el,
    stamp() { if (down) return false; down = true; el.classList.add('is-stamped'); return true; },
    lift() { if (!down) return; down = false; el.classList.remove('is-stamped'); },
    centre() { const r = cv.getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; },
  };
}
