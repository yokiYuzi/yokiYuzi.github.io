/* The jade design uses one consistent paper palette across the site. */
(function () {
  'use strict';
  document.documentElement.setAttribute('data-theme', 'light');
  // Match the homepage: reserve the collapsed menu layout before the first paint.
  document.documentElement.classList.add('js-nav');
})();
