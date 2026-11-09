/* Starts the Jade Veil stage on the home page. Loaded as a module after the page's own scripts. */
import { mountJadeVeil } from './jade-veil.js';
import { createSeal, loadFonts } from './jade-seal.js';

/* ---- settings ---- */
const NIGHT_DEFAULT = 'day';        // 'day' | 'night' | 'system' (follow the visitor's OS) | 'clock' (night from 19:00 to 06:00)
const SEAL_TEXT = '格物致知';        // 1, 2 or 4 characters; read right column first, as a seal is read

const root = document.documentElement;
const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
const marked = document.querySelectorAll('[data-veil-section]');
const sections = (marked.length ? [...marked] : [document.querySelector('.cw-jade'), ...document.querySelectorAll('main > .home-section')]).filter(Boolean);
loadFonts();

const canvas = document.createElement('canvas');
canvas.id = 'veil'; canvas.setAttribute('aria-hidden', 'true');
const wash = document.createElement('div');
wash.className = 'veil-wash'; wash.setAttribute('aria-hidden', 'true');
document.body.prepend(canvas, wash);

/* progress rail */
const rail = document.createElement('nav');
rail.className = 'veil-rail'; rail.setAttribute('aria-label', 'Sections'); rail.innerHTML = '<i></i>';
const dots = sections.map((s, i) => {
  const a = document.createElement('a');
  a.href = s.id ? '#' + s.id : '#';
  a.style.top = (i / Math.max(1, sections.length - 1) * 100) + '%';
  a.setAttribute('aria-label', (s.querySelector('h1,h2,.section-label') || {}).textContent || 'Section ' + i);
  a.addEventListener('click', (e) => {
    e.preventDefault();
    s.scrollIntoView({ behavior: RM ? 'instant' : 'smooth' });
  });
  rail.appendChild(a); return a;
});

/* ---- day / night ---- */
function startNight() {
  let saved = null; try { saved = localStorage.getItem('veil-night'); } catch (e) { /* storage may be off */ }
  if (saved === '1' || saved === '0') return saved === '1';
  if (NIGHT_DEFAULT === 'night') return true;
  if (NIGHT_DEFAULT === 'system') return matchMedia('(prefers-color-scheme: dark)').matches;
  if (NIGHT_DEFAULT === 'clock') { const h = new Date().getHours(); return h >= 19 || h < 6; }
  return false;
}
let night = startNight();
const themeMeta = document.querySelector('meta[name="theme-color"]');
function paintNight() {
  root.classList.toggle('veil-night', night);
  if (themeMeta) themeMeta.setAttribute('content', night ? '#071E1A' : '#FAF8F2');
  modeBtn.setAttribute('aria-pressed', String(night));
}
const modeBtn = document.createElement('button');
modeBtn.type = 'button'; modeBtn.className = 'veil-mode';
modeBtn.setAttribute('aria-label', 'Night view'); modeBtn.title = '昼 / 夜';
modeBtn.innerHTML = '<span lang="zh-Hans">昼</span><i aria-hidden="true"></i><span lang="zh-Hans">夜</span>';

let veil = null;
let seal = null;
try {
  veil = mountJadeVeil({
    canvas, sections, night,
    onProgress(p, u) {
      rail.style.setProperty('--p', Math.min(1, u / Math.max(1, sections.length - 1)).toFixed(4));
      const k = Math.round(Math.min(u, sections.length - 1));
      dots.forEach((d, i) => d.classList.toggle('on', i === k));
      /* 落款: when the last chapter has settled, the seal is pressed onto the picture */
      if (!seal) return;
      const end = sections.length - 0.5;
      if (u > end) {
        if (seal.stamp()) setTimeout(() => { const [x, y] = seal.centre(); veil.pulse(x, y, 1.8); rail.classList.add('veil-sealed'); }, RM ? 0 : 320);
      } else if (u < end - 0.3) { seal.lift(); rail.classList.remove('veil-sealed'); }
    },
  });
} catch (e) { console.warn('Jade Veil did not start:', e); }

if (veil) {
  root.classList.add('veil-on');
  document.body.appendChild(rail);
  paintNight();
  modeBtn.addEventListener('click', () => {
    night = !night; paintNight(); veil.setNight(night, RM);
    try { localStorage.setItem('veil-night', night ? '1' : '0'); } catch (e) { /* fine */ }
  });
  const nav = document.querySelector('header .nav') || document.querySelector('header');
  const links = nav && nav.querySelector('.nav-links');
  if (links) links.after(modeBtn); else if (nav) nav.appendChild(modeBtn);
  const last = sections[sections.length - 1];
  createSeal({ text: SEAL_TEXT, mount: last.querySelector('.chapter__inner') || last }).then((s) => { seal = s; }).catch(() => {});

  /* chapter text reveal */
  sections.slice(1).forEach((s) => {
    s.querySelectorAll('h2, .about-copy > *, .home-post, .knowledge-copy > *, .home-index > a, .utility-link, .section-heading > a')
      .forEach((el, i) => { el.classList.add('veil-rv'); el.style.setProperty('--d', (i * 0.07).toFixed(2) + 's'); });
  });
  const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) e.target.classList.add('veil-in'); }), { threshold: 0.15 });
  sections.forEach((s) => io.observe(s));
  /* the post list is filled in later by home.js — tag the new rows too */
  const list = document.getElementById('home-blog-list');
  if (list) new MutationObserver(() => list.querySelectorAll('.home-post:not(.veil-rv)').forEach((el, i) => {
    el.classList.add('veil-rv'); el.style.setProperty('--d', (0.1 + i * 0.07).toFixed(2) + 's');
  })).observe(list, { childList: true });
  window.__veil = veil;
} else {
  canvas.remove(); wash.remove();
}
