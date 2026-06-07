(function () {
  'use strict';

  var reduceMotion = window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function initLoader() {
    var loader = document.getElementById('arcane-loader');
    if (!loader) return;

    var done = false;
    function exit() {
      if (done) return;
      done = true;
      document.documentElement.classList.add('page-ready');
      loader.classList.add('is-exiting');
      window.setTimeout(function () {
        if (loader.parentNode) loader.parentNode.removeChild(loader);
      }, reduceMotion ? 20 : 760);
    }

    if (reduceMotion) {
      exit();
      return;
    }

    window.addEventListener('load', function () {
      window.setTimeout(exit, 820);
    }, { once: true });

    window.setTimeout(exit, 2200);
  }

  function initReveal() {
    var items = Array.prototype.slice.call(document.querySelectorAll('[data-reveal]'));
    if (!items.length) return;

    if (reduceMotion || !('IntersectionObserver' in window)) {
      items.forEach(function (item) { item.classList.add('is-visible'); });
      return;
    }

    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      });
    }, {
      threshold: 0.18,
      rootMargin: '0px 0px -8% 0px'
    });

    items.forEach(function (item) { observer.observe(item); });
  }

  function initTilt() {
    if (reduceMotion) return;

    var cards = Array.prototype.slice.call(document.querySelectorAll('[data-tilt]'));
    var maxTilt = 4.2;

    cards.forEach(function (card) {
      card.addEventListener('pointermove', function (event) {
        var rect = card.getBoundingClientRect();
        var px = (event.clientX - rect.left) / rect.width;
        var py = (event.clientY - rect.top) / rect.height;
        var tiltY = (px - 0.5) * maxTilt * 2;
        var tiltX = (0.5 - py) * maxTilt * 2;

        card.style.setProperty('--tilt-x', tiltX.toFixed(2) + 'deg');
        card.style.setProperty('--tilt-y', tiltY.toFixed(2) + 'deg');
        card.style.setProperty('--mx', (px * 100).toFixed(1) + '%');
        card.style.setProperty('--my', (py * 100).toFixed(1) + '%');
      });

      card.addEventListener('pointerleave', function () {
        card.style.setProperty('--tilt-x', '0deg');
        card.style.setProperty('--tilt-y', '0deg');
        card.style.setProperty('--mx', '50%');
        card.style.setProperty('--my', '40%');
      });
    });
  }

  function initRipple() {
    if (reduceMotion) return;

    var buttons = Array.prototype.slice.call(document.querySelectorAll('[data-ripple]'));
    buttons.forEach(function (button) {
      button.addEventListener('click', function (event) {
        var rect = button.getBoundingClientRect();
        var ripple = document.createElement('span');
        ripple.className = 'ripple';
        ripple.style.left = (event.clientX - rect.left) + 'px';
        ripple.style.top = (event.clientY - rect.top) + 'px';
        button.appendChild(ripple);
        ripple.addEventListener('animationend', function () {
          if (ripple.parentNode) ripple.parentNode.removeChild(ripple);
        }, { once: true });
      });
    });
  }

  function initAmbientStars() {
    var canvas = document.getElementById('ambient-stars');
    if (!canvas || reduceMotion) return;

    var ctx = canvas.getContext('2d');
    if (!ctx) return;

    var width = 0;
    var height = 0;
    var dpr = 1;
    var stars = [];
    var raf = 0;
    var running = true;

    function countForWidth() {
      if (window.innerWidth < 640) return 28;
      if (window.innerWidth < 1100) return 42;
      return 58;
    }

    function makeStar() {
      return {
        x: Math.random() * width,
        y: Math.random() * height,
        r: Math.random() * 1.15 + 0.25,
        a: Math.random() * 0.45 + 0.12,
        speed: Math.random() * 0.055 + 0.015,
        phase: Math.random() * Math.PI * 2
      };
    }

    function resize() {
      dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      canvas.style.width = width + 'px';
      canvas.style.height = height + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      stars = Array.from({ length: countForWidth() }, makeStar);
    }

    function draw(time) {
      if (!running) return;
      ctx.clearRect(0, 0, width, height);

      stars.forEach(function (star) {
        star.y += star.speed;
        if (star.y > height + 4) {
          star.y = -4;
          star.x = Math.random() * width;
        }

        var twinkle = Math.sin(time * 0.001 + star.phase) * 0.16;
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.r, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(147, 94, 34, ' + Math.max(0, star.a + twinkle) + ')';
        ctx.fill();
      });

      raf = requestAnimationFrame(draw);
    }

    function setRunning() {
      running = !document.hidden;
      if (running && !raf) raf = requestAnimationFrame(draw);
      if (!running && raf) {
        cancelAnimationFrame(raf);
        raf = 0;
      }
    }

    resize();
    raf = requestAnimationFrame(draw);
    window.addEventListener('resize', resize, { passive: true });
    document.addEventListener('visibilitychange', setRunning);
  }

  initLoader();
  initReveal();
  initTilt();
  initRipple();
  initAmbientStars();
})();
