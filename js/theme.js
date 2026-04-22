(function () {
  'use strict';

  /* ── Apply saved theme before first paint (called from inline <head> script) ── */
  var html  = document.documentElement;
  var saved = localStorage.getItem('theme') || 'light';
  html.setAttribute('data-theme', saved);

  /* ── Page-scan animation on toggle ── */
  function triggerPageScan() {
    var old = document.getElementById('theme-scan');
    if (old) old.parentNode.removeChild(old);

    var line = document.createElement('div');
    line.id = 'theme-scan';
    document.body.appendChild(line);

    setTimeout(function () {
      if (line.parentNode) line.parentNode.removeChild(line);
    }, 800);
  }

  /* ── Update button icon + label ── */
  function updateBtn(theme) {
    var icon = document.getElementById('theme-toggle-icon');
    var lbl  = document.getElementById('theme-toggle-lbl');
    if (icon) icon.textContent = theme === 'dark' ? '◎' : '◑';
    if (lbl)  lbl.textContent  = theme === 'dark' ? 'LIGHT' : 'DARK';
  }

  /* ── Core toggle ── */
  function toggle() {
    var curr = html.getAttribute('data-theme') || 'light';
    var next = curr === 'light' ? 'dark' : 'light';
    var btn  = document.getElementById('theme-toggle');

    /* spin the icon */
    if (btn) {
      btn.classList.remove('spinning');
      void btn.offsetWidth;
      btn.classList.add('spinning');
      setTimeout(function () { btn.classList.remove('spinning'); }, 600);
    }

    triggerPageScan();

    html.classList.add('theme-switching');
    setTimeout(function () {
      html.setAttribute('data-theme', next);
      localStorage.setItem('theme', next);
      updateBtn(next);
    }, 220);

    setTimeout(function () {
      html.classList.remove('theme-switching');
    }, 750);
  }

  /* ── Highlight the active nav link ── */
  function highlightNav() {
    var path = window.location.pathname;
    var links = document.querySelectorAll('.nav-links a');
    for (var i = 0; i < links.length; i++) {
      var a = links[i];
      var href = a.getAttribute('href');
      var match = href === '/'
        ? path === '/'
        : path === href || path.indexOf(href) === 0;
      if (match) {
        a.classList.add('nav-active');
        a.setAttribute('aria-current', 'page');
      }
    }
  }

  /* ── Enhance footer with contact links ── */
  function enhanceFooter() {
    var f = document.querySelector('footer .container');
    if (!f) return;
    f.innerHTML =
      '\u00a9 2026 Chang Wang' +
      ' \u00a0\u00b7\u00a0 ' +
      '<a href="https://github.com/yokiYuzi" target="_blank" rel="noopener">GitHub</a>' +
      ' \u00a0\u00b7\u00a0 ' +
      '<a href="mailto:changw11@unlv.nevada.edu">Email</a>';
  }

  /* ── Inject theme-toggle button ── */
  function injectButton() {
    if (document.getElementById('theme-toggle')) return;

    var btn = document.createElement('button');
    btn.id = 'theme-toggle';
    btn.setAttribute('aria-label', 'Toggle dark / light mode');
    btn.title = 'Toggle dark / light mode';

    var icon = document.createElement('span');
    icon.id = 'theme-toggle-icon';
    icon.textContent = saved === 'dark' ? '◎' : '◑';

    var lbl = document.createElement('span');
    lbl.id = 'theme-toggle-lbl';
    lbl.textContent = saved === 'dark' ? 'LIGHT' : 'DARK';

    btn.appendChild(icon);
    btn.appendChild(lbl);
    btn.addEventListener('click', toggle);
    document.body.appendChild(btn);

    highlightNav();
    enhanceFooter();
  }

  /* ── Boot ── */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', injectButton);
  } else {
    injectButton();
  }
})();
