/* Shared navigation, appearance controls and accessible progressive enhancement. */
(function () {
  'use strict';
  function init() {
    var html = document.documentElement;
    var main = document.querySelector('main');
    if (main && !main.id) main.id = 'main-content';
    if (main && !document.querySelector('.skip-link')) {
      var skip = document.createElement('a');
      skip.className = 'skip-link'; skip.href = '#' + main.id; skip.textContent = 'Skip to content';
      document.body.prepend(skip);
    }
    var links = document.querySelector('.nav-links');
    if (links) {
      links.id = 'site-navigation'; links.setAttribute('aria-label', 'Main navigation');
      var path = location.pathname.replace(/index\.html$/, '');
      links.querySelectorAll('a').forEach(function (a) {
        var href = a.getAttribute('href');
        if (href === '/' ? path === '/' : path.indexOf(href) === 0) {
          a.classList.add('nav-active'); a.setAttribute('aria-current', 'page');
        }
      });
      var menu = document.createElement('button');
      menu.type = 'button'; menu.className = 'menu-toggle'; menu.textContent = 'Menu';
      menu.setAttribute('aria-controls', links.id); menu.setAttribute('aria-expanded', 'false');
      links.before(menu);
      function closeMenu() { menu.setAttribute('aria-expanded', 'false'); links.classList.remove('is-open'); }
      menu.addEventListener('click', function () {
        var expanded = menu.getAttribute('aria-expanded') === 'true';
        menu.setAttribute('aria-expanded', String(!expanded)); links.classList.toggle('is-open', !expanded);
      });
      document.addEventListener('keydown', function (event) {
        if (event.key === 'Escape' && menu.getAttribute('aria-expanded') === 'true') { closeMenu(); menu.focus(); }
      });
      links.addEventListener('click', function (event) { if (event.target.closest('a')) closeMenu(); });
      document.addEventListener('click', function (event) {
        if (!event.target.closest('.nav') && menu.getAttribute('aria-expanded') === 'true') closeMenu();
      });
      html.classList.add('js-nav');
    }
    if (!document.body.classList.contains('home-jade')) {
      if (!document.getElementById('orbital-canvas')) {
        var world = document.createElement('div'); world.className = 'orbital-world'; world.setAttribute('aria-hidden', 'true');
        var canvas = document.createElement('canvas'); canvas.id = 'orbital-canvas';
        world.appendChild(canvas); document.body.prepend(world);
      }
      var toolbar = document.createElement('div'); toolbar.className = 'field-tools';
      toolbar.setAttribute('role', 'group'); toolbar.setAttribute('aria-label', 'Appearance and animation');
      var pause = document.createElement('button'); pause.type = 'button'; pause.id = 'motion-toggle';
      pause.disabled = true; pause.setAttribute('aria-label', 'Animation unavailable');
      pause.innerHTML = '<span class="tool-icon" aria-hidden="true">Ⅱ</span><span class="tool-label">Still</span>';
      pause.addEventListener('click', function () { document.dispatchEvent(new CustomEvent('orbital:toggle-motion')); });
      document.addEventListener('orbital:motion', function (event) {
        var stopped = event.detail.paused;
        pause.disabled = false; pause.setAttribute('aria-pressed', String(stopped));
        pause.setAttribute('aria-label', stopped ? 'Resume animation' : 'Pause animation');
        pause.querySelector('.tool-icon').textContent = stopped ? '▷' : 'Ⅱ';
        pause.querySelector('.tool-label').textContent = stopped ? 'Play' : 'Pause';
      });
      var themeButton = document.createElement('button'); themeButton.type = 'button'; themeButton.id = 'theme-toggle';
      themeButton.innerHTML = '<span class="tool-icon" aria-hidden="true"></span><span class="tool-label"></span>';
      function updateThemeButton() {
        var dark = html.getAttribute('data-theme') !== 'light';
        themeButton.querySelector('.tool-icon').textContent = dark ? '☼' : '◐';
        themeButton.querySelector('.tool-label').textContent = dark ? 'Dawn' : 'Dusk';
        themeButton.setAttribute('aria-label', dark ? 'Switch to light theme' : 'Switch to dark theme');
      }
      themeButton.addEventListener('click', function () {
        var next = html.getAttribute('data-theme') === 'light' ? 'dark' : 'light';
        html.setAttribute('data-theme', next);
        try { localStorage.setItem('orbital-theme', next); } catch (_) {}
        updateThemeButton(); document.dispatchEvent(new CustomEvent('orbital:theme'));
      });
      toolbar.append(pause, themeButton); document.body.appendChild(toolbar); updateThemeButton();
    }
    var footer = document.querySelector('footer .container');
    if (footer) footer.innerHTML = '<span>© ' + new Date().getFullYear() + ' Chang Wang <span class="footer-note">/ A personal orbit.</span></span><div class="footer-links"><a href="https://github.com/yokiYuzi" target="_blank" rel="noopener">GitHub ↗</a><a href="mailto:changw11@unlv.nevada.edu">Email ↗</a><a href="/guestbook/">Leave a note ↗</a></div>';
  }
  if (document.body) init(); else document.addEventListener('DOMContentLoaded', init, { once: true });
})();
