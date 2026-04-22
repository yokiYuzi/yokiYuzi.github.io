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
      void btn.offsetWidth;          /* reflow → restart animation */
      btn.classList.add('spinning');
      setTimeout(function () { btn.classList.remove('spinning'); }, 600);
    }

    /* scan line sweeps across page */
    triggerPageScan();

    /* add transition class, swap theme at scan midpoint */
    html.classList.add('theme-switching');
    setTimeout(function () {
      html.setAttribute('data-theme', next);
      localStorage.setItem('theme', next);
      updateBtn(next);
    }, 220);

    /* remove transition class after animation completes */
    setTimeout(function () {
      html.classList.remove('theme-switching');
    }, 750);
  }

  /* ── Inject the button into <body> ── */
  function injectButton() {
    if (document.getElementById('theme-toggle')) return;  /* already injected */

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
  }

  /* ── Boot ── */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', injectButton);
  } else {
    injectButton();
  }
})();
