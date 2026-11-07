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
    var footer = document.querySelector('footer .container');
    if (footer) footer.innerHTML = '<span>© ' + new Date().getFullYear() + ' Chang Wang <span class="footer-note">/ A personal orbit.</span></span><div class="footer-links"><a href="https://github.com/yokiYuzi" target="_blank" rel="noopener">GitHub ↗</a><a href="mailto:changw11@unlv.nevada.edu">Email ↗</a><a href="/guestbook/">Leave a note ↗</a></div>';
  }
  if (document.body) init(); else document.addEventListener('DOMContentLoaded', init, { once: true });
})();
