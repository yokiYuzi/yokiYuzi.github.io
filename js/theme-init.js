(function () {
  'use strict';
  var theme = 'dark';
  try { theme = localStorage.getItem('orbital-theme') || 'dark'; } catch (_) { /* Private browsing. */ }
  document.documentElement.setAttribute('data-theme', theme === 'light' ? 'light' : 'dark');
})();
