/* Static art. A mobile visit never requests the three desktop textures. */
(function () {
  'use strict';
  var desktop = window.matchMedia('(min-width: 1100px)');
  var tablet = window.matchMedia('(min-width: 768px) and (max-width: 1099px)');
  var images = document.querySelectorAll('.home-hero__svg image[data-src]');
  images.forEach(function (image) {
    image.addEventListener('error', function () {
      // Remove the browser's broken-image tile and reveal the solid SVG layer.
      image.removeAttribute('href');
    });
  });
  function updateArt() {
    images.forEach(function (image) {
      var active = image.closest('.home-hero__svg--tablet') ? tablet.matches : desktop.matches;
      if (active) image.setAttribute('href', image.getAttribute('data-src'));
      else image.removeAttribute('href');
    });
  }
  updateArt();
  [desktop, tablet].forEach(function (query) {
    if (query.addEventListener) query.addEventListener('change', updateArt);
    else query.addListener(updateArt);
  });
  var mobileImage = document.querySelector('.home-hero__mobile img');
  if (mobileImage) {
    mobileImage.addEventListener('error', function () { mobileImage.hidden = true; });
    mobileImage.addEventListener('load', function () { mobileImage.hidden = false; });
    if (mobileImage.complete && !mobileImage.naturalWidth) mobileImage.hidden = true;
  }
})();
