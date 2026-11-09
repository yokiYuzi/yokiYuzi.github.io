/* Starts the Jade Veil stage on the home page. Loaded as a module after the page's own scripts. */
import { mountJadeVeil } from './jade-veil.js';

const root = document.documentElement;
const sections = [document.querySelector('.cw-jade'), ...document.querySelectorAll('main > .home-section')].filter(Boolean);

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
    s.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' });
  });
  rail.appendChild(a); return a;
});

let veil = null;
try {
  veil = mountJadeVeil({
    canvas, sections,
    onProgress(p, u) {
      rail.style.setProperty('--p', Math.min(1, u / Math.max(1, sections.length - 1)).toFixed(4));
      const k = Math.round(Math.min(u, sections.length - 1));
      dots.forEach((d, i) => d.classList.toggle('on', i === k));
    },
  });
} catch (e) { console.warn('Jade Veil did not start:', e); }

if (veil) {
  root.classList.add('veil-on');
  document.body.appendChild(rail);
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
