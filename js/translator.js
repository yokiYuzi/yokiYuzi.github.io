// EN → ZH-CN page translator
// Skips KaTeX math, code blocks, nav, and UI badges.
// Uses Google Translate (unofficial client=gtx endpoint — no API key required).

const Translator = (function () {
  let active = false;
  const cache = new Map();
  let backups = [];

  function shouldSkip(node) {
    let el = node.parentElement;
    while (el) {
      const tag = el.tagName;
      const cls = typeof el.className === 'string' ? el.className : '';
      if (tag === 'SCRIPT' || tag === 'STYLE' || tag === 'CODE' || tag === 'PRE') return true;
      if (
        cls.includes('katex') ||
        cls.includes('prob-badge') ||
        cls.includes('back-link') ||
        tag === 'HEADER' ||
        tag === 'FOOTER' ||
        tag === 'NAV'
      ) return true;
      el = el.parentElement;
    }
    return false;
  }

  function getTextNodes(root) {
    const result = [];
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    let n;
    while ((n = walker.nextNode())) {
      if (n.textContent.trim().length > 1 && !shouldSkip(n)) result.push(n);
    }
    return result;
  }

  async function fetchZh(text) {
    const k = text.trim();
    if (!k || k.length < 2) return text;
    if (cache.has(k)) return cache.get(k);
    const url =
      'https://translate.googleapis.com/translate_a/single' +
      '?client=gtx&sl=en&tl=zh-CN&dt=t&q=' +
      encodeURIComponent(k);
    const d = await (await fetch(url)).json();
    const t = (d[0] || []).map(seg => (seg && seg[0]) || '').join('');
    const result = t || k;
    cache.set(k, result);
    return result;
  }

  async function run(btn) {
    const body = document.querySelector('.post-body');
    if (!body) return;

    btn.disabled = true;
    btn.textContent = 'TRANSLATING...';

    const nodes = getTextNodes(body);
    backups = nodes.map(n => ({ node: n, original: n.textContent }));

    for (let i = 0; i < nodes.length; i += 6) {
      await Promise.all(
        nodes.slice(i, i + 6).map(async n => {
          try { n.textContent = await fetchZh(n.textContent); } catch (_) {}
        })
      );
      if (i + 6 < nodes.length) await new Promise(r => setTimeout(r, 120));
    }

    active = true;
    btn.classList.add('active');
    btn.textContent = '[ZH → EN]';
    btn.disabled = false;
  }

  function restore(btn) {
    backups.forEach(({ node, original }) => { node.textContent = original; });
    active = false;
    btn.classList.remove('active');
    btn.textContent = '[EN → ZH]';
  }

  function init() {
    if (!document.querySelector('.post-body')) return;

    const btn = document.createElement('button');
    btn.id = 'translate-btn';
    btn.textContent = '[EN → ZH]';
    btn.addEventListener('click', () => (active ? restore : run)(btn));

    const backLink = document.querySelector('.back-link');
    if (backLink) backLink.after(btn);
  }

  return { init };
})();

document.addEventListener('DOMContentLoaded', () => Translator.init());
