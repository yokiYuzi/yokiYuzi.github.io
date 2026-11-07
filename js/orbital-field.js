/* A procedural scene sampled onto an ASCII grid. No images, WebGL or dependencies. */
(function () {
  'use strict';
  var canvas = document.getElementById('orbital-canvas');
  if (!canvas) return;
  var ctx = canvas.getContext('2d', { alpha: true });
  var source = document.createElement('canvas');
  var paint = source.getContext('2d', { willReadFrequently: true });
  if (!ctx || !paint) return;

  var world = canvas.parentElement;
  var home = document.body.classList.contains('home');
  var motion = window.matchMedia('(prefers-reduced-motion: reduce)');
  var finePointer = window.matchMedia('(pointer: fine)');
  var characters = '.:;-=+*ox%#@';
  var scenes = [
    { sphere: .57, band: .87, offset: .14, tilt: -.24, flat: .28, phase: 0 },
    { sphere: .25, band: .69, offset: .02, tilt: .15, flat: .78, phase: .3 },
    { sphere: .85, band: 1.1, offset: -.12, tilt: -.55, flat: .64, phase: 1 }
  ];
  var paletteDark = [
    ['#102c25', '#174236', '#215544', '#2b6a54', '#397f65', '#51947b', '#72ab90', '#98c1a7', '#c1d5b8'],
    ['#2b3020', '#45452a', '#62603b', '#827949', '#a19458', '#bbab6b', '#d1bf80', '#e2d096', '#eee0b4']
  ];
  var paletteLight = [
    ['#d6decc', '#bdcdb6', '#9fbba0', '#80a88d', '#649379', '#467b62', '#2f644d', '#204c3a', '#163e2f'],
    ['#d4d4bd', '#bfbea1', '#aaa781', '#939062', '#827a47', '#726532', '#685626', '#59461d', '#493916']
  ];
  var width = 0, height = 0, cols = 0, rows = 0, cw = 7, ch = 11, dpr = 1;
  var atlas, tileW, tileH, cells = [], dust = [];
  var raf = 0, last = 0, time = 8, lastDraw = 0, transition = 1;
  var scene = 0, from = Object.assign({}, scenes[0]);
  var pointer = { x: -1000, y: -1000, active: false };
  var paused = false, reduced = motion.matches, printing = false, slowFrames = 0, quality = 0;
  var scrollFade = 1, hero = document.querySelector('.orbital-hero');
  try { paused = localStorage.getItem('orbital-paused') === 'true'; } catch (_) {}

  function mix(a, b, t) { return a + (b - a) * t; }
  function hash(n) { var x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); }
  function ease(t) { return t * t * (3 - 2 * t); }
  function currentScene() {
    var result = {}, target = scenes[scene], progress = ease(transition);
    Object.keys(target).forEach(function (key) { result[key] = mix(from[key], target[key], progress); });
    return result;
  }
  function makeAtlas() {
    var colors = document.documentElement.getAttribute('data-theme') === 'light' ? paletteLight : paletteDark;
    tileW = Math.ceil(cw * dpr); tileH = Math.ceil(ch * dpr);
    atlas = document.createElement('canvas');
    atlas.width = tileW * characters.length; atlas.height = tileH * 18;
    var a = atlas.getContext('2d');
    a.font = (Math.max(9, ch * .92) * dpr) + 'px Consolas, monospace';
    a.textBaseline = 'middle'; a.textAlign = 'center';
    colors.forEach(function (family, f) {
      family.forEach(function (color, level) {
        a.fillStyle = color;
        for (var i = 0; i < characters.length; i++) {
          a.fillText(characters[i], (i + .5) * tileW, (f * 9 + level + .48) * tileH);
        }
      });
    });
  }
  function resize() {
    width = window.innerWidth; height = window.innerHeight;
    dpr = Math.min(window.devicePixelRatio || 1, 1.75);
    cw = (width < 700 ? 6 : 7) + quality * 1.5;
    // Bound the grid on large displays; retain the natural character aspect ratio.
    cw = Math.max(cw, width / 240);
    ch = cw * 1.5;
    cols = Math.ceil(width / cw); rows = Math.ceil(height / ch);
    canvas.width = Math.round(width * dpr); canvas.height = Math.round(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    source.width = cols; source.height = rows;
    cells = new Float32Array(cols * rows);
    for (var i = 0; i < cells.length; i++) cells[i] = hash(i + 19);
    dust = Array.from({ length: width < 700 ? 60 : 150 }, function (_, i) {
      return { x: hash(i + 500), y: hash(i + 970), phase: hash(i + 1330) * 6.28 };
    });
    makeAtlas(); updateScroll(); render();
  }
  function ring(x, y, rx, ry, rotation, start, end, alpha, lineWidth) {
    paint.beginPath();
    paint.ellipse(x, y, Math.max(rx, 1), Math.max(ry, 1), rotation, start, end);
    paint.strokeStyle = 'rgba(214,190,119,' + alpha + ')';
    paint.lineWidth = lineWidth; paint.stroke();
  }
  function drawScene() {
    paint.setTransform(1, 0, 0, 1, 0, 0); paint.clearRect(0, 0, cols, rows);
    paint.setTransform(1 / cw, 0, 0, 1 / ch, 0, 0);
    var p = currentScene(), mobile = width < 700;
    var radius = mobile ? Math.min(width * .39, height * .24) : Math.min(width * .28, height * .39);
    var cx = width * (mobile ? .53 : .755), cy = height * (mobile ? .76 : .50);
    if (mobile && home && hero) {
      var copy = document.querySelector('.hero-copy');
      var copyBottom = copy ? copy.getBoundingClientRect().bottom : height * .5;
      cy = Math.min(height * .86, Math.max(height * .73, copyBottom + radius * .88));
    }
    var breathing = 1 + Math.sin(time * .48) * .012;
    radius *= breathing;
    cx += Math.sin(time * .08) * radius * .025;
    cy += Math.cos(time * .1) * radius * .018;
    var ox = cx + radius * .02, oy = cy + radius * p.offset;

    // Large interrupted orbits and coordinate axes reach beyond the viewport.
    ring(cx - radius * .12, cy - radius * .45, radius * 1.62, radius * 1.62, 0, time * .016, time * .016 + 4.9, .36, 2.2);
    ring(cx + radius * .12, cy + radius * .1, radius * 1.46, radius * 1.46, 0, 1.2 - time * .012, 5.8 - time * .012, .5, 2.6);
    paint.strokeStyle = 'rgba(146,160,112,.2)'; paint.lineWidth = 1.8;
    paint.beginPath(); paint.moveTo(cx, 120); paint.lineTo(cx, height - 80);
    paint.moveTo(width * .36, oy); paint.lineTo(width, oy); paint.stroke();

    // Closely spaced rings resemble engraved grooves, with coherent traveling gaps.
    var ringCount = mobile ? 16 : 23;
    for (var j = 0; j < ringCount; j++) {
      var r = radius * (p.band + j * .020);
      var start = -.4 + time * .024 + j * .045;
      ring(ox, oy, r, r * (.92 + .05 * Math.sin(time * .035)), 0, start, start + 5.65,
        .36 + .25 * (.5 + .5 * Math.sin(j * .29 + time * .35)), 2.2 + (j % 4 === 0 ? .6 : 0));
    }

    // Back half of the inclined equatorial ring is occluded by the sphere.
    for (j = 0; j < 5; j++) {
      ring(cx, cy, radius * (1.18 + j * .025), radius * (p.flat + j * .012), p.tilt, Math.PI, Math.PI * 2, .45, 2.7);
    }
    var sr = radius * p.sphere, sx = cx - radius * .06, sy = cy - radius * .05;
    var light = paint.createRadialGradient(sx - sr * .35 + Math.sin(time * .12) * sr * .16, sy - sr * .5, 0, sx, sy, sr * 1.06);
    light.addColorStop(0, '#c7d5a7'); light.addColorStop(.24, '#94b38e');
    light.addColorStop(.55, '#4c9175'); light.addColorStop(.82, '#205747'); light.addColorStop(1, '#0a2923');
    paint.save(); paint.beginPath(); paint.arc(sx, sy, sr, 0, Math.PI * 2); paint.clip();
    paint.fillStyle = light; paint.fillRect(sx - sr, sy - sr, sr * 2, sr * 2);
    // Slowly drifting atmospheric striations, sampled into individual glyphs.
    for (j = 0; j < 9; j++) {
      paint.beginPath();
      var yy = sy - sr + j * sr * .27;
      paint.moveTo(sx - sr, yy);
      paint.bezierCurveTo(sx - sr * .4, yy + sr * .2 * Math.sin(time * .1 + j), sx + sr * .3, yy + sr * .55, sx + sr, yy + sr * .3);
      paint.strokeStyle = 'rgba(8,44,33,.15)'; paint.lineWidth = sr * .10; paint.stroke();
    }
    // The eclipse scene introduces a crisp, moving half-lit disc.
    if (p.phase > .01) {
      paint.fillStyle = 'rgba(4,25,21,' + p.phase * .65 + ')';
      paint.fillRect(sx + Math.sin(time * .08) * sr * .16, sy - sr, sr * 1.3, sr * 2);
    }
    paint.restore();
    ring(sx, sy, sr * 1.015, sr * 1.015, 0, 3.45, 5.5, .63, 2.8);
    for (j = 0; j < 5; j++) {
      ring(cx, cy, radius * (1.18 + j * .025), radius * (p.flat + j * .012), p.tilt, 0, Math.PI, .64, 2.7);
    }
    // Small orbiting satellites.
    for (j = 0; j < 3; j++) {
      var angle = time * (.025 + j * .009) + j * 2.1;
      var satelliteR = radius * (1.28 + j * .09);
      paint.fillStyle = 'rgba(229,204,141,.85)'; paint.beginPath();
      paint.arc(cx + Math.cos(angle) * satelliteR, cy + Math.sin(angle) * satelliteR, j === 0 ? 5 : 3.5, 0, Math.PI * 2); paint.fill();
    }
    dust.forEach(function (star) {
      var x = star.x * width, y = (star.y * height + time * 1.6) % height;
      paint.fillStyle = 'rgba(154,179,142,' + (.15 + .13 * Math.sin(time * .3 + star.phase)) + ')';
      paint.fillRect(x, y, 3, 3);
    });
  }
  function render() {
    if (!width || printing) return;
    drawScene();
    var pixels = paint.getImageData(0, 0, cols, rows).data;
    ctx.clearRect(0, 0, width, height);
    for (var y = 0; y < rows; y++) {
      for (var x = 0; x < cols; x++) {
        var cell = y * cols + x, i = cell * 4, seed = cells[cell];
        var alpha = pixels[i + 3] / 255;
        var r = pixels[i], g = pixels[i + 1], b = pixels[i + 2];
        var lum = (r * .30 + g * .59 + b * .11) / 255 * alpha;
        if (lum < .028) {
          // Sparse, stationary low-contrast stippling extends the field to all four edges.
          if (seed < .982) continue;
          lum = .03 + seed * .03; r = 25; g = 60; b = 40;
        }
        lum *= .67 + seed * .5 + .08 * Math.sin(x * .13 + y * .11 + time * .15);
        var px = x * cw, py = y * ch;
        var shiftX = 0, shiftY = 0;
        if (pointer.active && !reduced && !paused) {
          var dx = px - pointer.x, dy = py - pointer.y, d2 = dx * dx + dy * dy;
          if (d2 < 18000) {
            var force = (1 - d2 / 18000) * .065;
            shiftX = dx * force; shiftY = dy * force; lum += force * .9;
          }
        }
        var gold = r > g * 1.12 && r > b * 1.3 ? 1 : 0;
        // Restore the fine linework's energy after sub-pixel grid sampling.
        // Otherwise thin gold rings become almost invisible at desktop sizes.
        lum = gold ? Math.sqrt(lum) * 1.12 : Math.pow(lum, .88) * 1.06;
        var level = Math.min(8, Math.max(0, Math.floor(lum * 11)));
        var glyph = Math.min(characters.length - 1, Math.floor(lum * 12 + seed * 2));
        ctx.drawImage(atlas, glyph * tileW, (gold * 9 + level) * tileH, tileW, tileH,
          px + shiftX, py + shiftY, cw, ch);
      }
    }
    world.classList.add('is-ready');
  }
  function shouldRun() { return !paused && !reduced && !document.hidden && !printing; }
  function loop(now) {
    raf = 0;
    if (!shouldRun()) return;
    var interval = home && scrollFade > .5 ? (width < 700 ? 50 : 33.3) : 83.3;
    if (now - lastDraw >= interval) {
      var dt = last ? Math.min((now - last) / 1000, .1) : 0;
      time += dt; transition = Math.min(1, transition + dt / 1.6);
      last = now; lastDraw = now;
      var started = performance.now(); render();
      if (performance.now() - started > 38) slowFrames++; else slowFrames = Math.max(0, slowFrames - 1);
      if (slowFrames > 28 && quality < 2) { quality++; slowFrames = 0; resize(); }
    }
    raf = requestAnimationFrame(loop);
  }
  function sync() {
    if (raf) cancelAnimationFrame(raf);
    raf = 0; last = 0; lastDraw = 0;
    var stopped = paused || reduced;
    document.dispatchEvent(new CustomEvent('orbital:motion', { detail: { paused: stopped, reduced: reduced } }));
    if (shouldRun()) raf = requestAnimationFrame(loop); else if (!document.hidden) render();
  }
  function updateScroll() {
    scrollFade = home ? Math.max(.13, 1 - window.scrollY / Math.max(1, height * .85)) : 1;
    canvas.style.opacity = String(scrollFade);
  }
  document.querySelectorAll('[data-scene]').forEach(function (button) {
    button.disabled = false;
    button.addEventListener('click', function () {
      var next = Number(button.dataset.scene);
      if (!scenes[next] || next === scene) return;
      from = currentScene(); scene = next; transition = shouldRun() ? 0 : 1;
      document.querySelectorAll('[data-scene]').forEach(function (item) {
        item.setAttribute('aria-pressed', item === button ? 'true' : 'false');
      });
      var caption = document.getElementById('scene-caption');
      if (caption) caption.textContent = ['I / Orbital study', 'II / Resonance study', 'III / Eclipse study'][scene];
      render();
    });
  });
  document.addEventListener('orbital:toggle-motion', function () {
    if (reduced) { reduced = false; paused = false; } else { paused = !paused; }
    try { localStorage.setItem('orbital-paused', String(paused)); } catch (_) {}
    sync();
  });
  document.addEventListener('orbital:theme', function () { makeAtlas(); render(); });
  document.addEventListener('visibilitychange', sync);
  motion.addEventListener('change', function (event) { reduced = event.matches; sync(); });
  window.addEventListener('pointermove', function (event) {
    if (!finePointer.matches) return;
    pointer.x = event.clientX; pointer.y = event.clientY; pointer.active = true;
  }, { passive: true });
  document.addEventListener('pointerleave', function () { pointer.active = false; });
  window.addEventListener('scroll', updateScroll, { passive: true });
  var resizeTimer;
  window.addEventListener('resize', function () { clearTimeout(resizeTimer); resizeTimer = setTimeout(resize, 120); }, { passive: true });
  window.addEventListener('beforeprint', function () { printing = true; sync(); });
  window.addEventListener('afterprint', function () { printing = false; sync(); });
  window.addEventListener('pagehide', function () { if (raf) cancelAnimationFrame(raf); raf = 0; });
  window.addEventListener('pageshow', sync);
  resize(); sync();
})();
