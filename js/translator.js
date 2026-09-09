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

  const sleep = ms => new Promise(r => setTimeout(r, ms));

  // Single in-flight request at a time, with a floor on the gap between
  // requests. Google's unofficial gtx endpoint treats concurrent/bursty
  // traffic as abuse and starts returning a hard block page (not just a
  // 429) — after which every subsequent request fails until the block
  // lifts. Serializing requests keeps us under that threshold.
  let chain = Promise.resolve();
  const MIN_GAP_MS = 220;
  let lastRequestAt = 0;

  function enqueue(task) {
    const result = chain.then(async () => {
      const wait = lastRequestAt + MIN_GAP_MS - Date.now();
      if (wait > 0) await sleep(wait);
      lastRequestAt = Date.now();
      return task();
    });
    // Swallow rejections in the chain itself so one failure doesn't
    // permanently wedge every request queued after it.
    chain = result.catch(() => {});
    return result;
  }

  async function translateOnce(k) {
    const url =
      'https://translate.googleapis.com/translate_a/single' +
      '?client=gtx&sl=en&tl=zh-CN&dt=t&q=' +
      encodeURIComponent(k);
    const res = await fetch(url);
    if (!res.ok) throw new Error('translate http ' + res.status);
    const ct = res.headers.get('content-type') || '';
    if (!ct.includes('json')) throw new Error('translate non-json response (blocked?)');
    const d = await res.json();
    const t = (d[0] || []).map(seg => (seg && seg[0]) || '').join('');
    return t || k;
  }

  async function fetchZh(text) {
    const k = text.trim();
    if (!k || k.length < 2) return text;
    if (cache.has(k)) return cache.get(k);

    const attempts = [0, 500, 1500]; // retry backoff in ms before each attempt
    let lastErr;
    for (const delay of attempts) {
      if (delay) await sleep(delay);
      try {
        const result = await enqueue(() => translateOnce(k));
        cache.set(k, result);
        return result;
      } catch (e) {
        lastErr = e;
      }
    }
    console.warn('translator: giving up on segment after retries', lastErr);
    return text;
  }

  async function run(btn) {
    const body = document.querySelector('.post-body');
    if (!body) return;

    btn.disabled = true;

    const nodes = getTextNodes(body);
    backups = nodes.map(n => ({ node: n, original: n.textContent }));

    let done = 0;
    for (const n of nodes) {
      try { n.textContent = await fetchZh(n.textContent); } catch (_) {}
      done++;
      btn.textContent = `TRANSLATING... ${done}/${nodes.length}`;
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
