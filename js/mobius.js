(function () {
  var overlay = document.getElementById('loading-overlay');
  var canvas  = document.getElementById('mobius-canvas');
  if (!overlay || !canvas) return;

  var ctx  = canvas.getContext('2d');
  var size = Math.min(window.innerWidth * 0.5, window.innerHeight * 0.5, 300);
  size = Math.max(size, 180);
  canvas.width  = size;
  canvas.height = size;

  var cx    = size / 2;
  var cy    = size / 2;
  var R     = size * 0.29;   // major radius
  var hw    = size * 0.095;  // half-width of strip
  var N     = 120;            // segments along loop
  var M     = 18;             // segments across width

  var angle     = 0;
  var startTime = null;
  var SHOW_MS   = 2600;       // ms before fade begins

  function mobiusPoint(u, v) {
    var cu2 = Math.cos(u / 2), su2 = Math.sin(u / 2);
    var cu  = Math.cos(u),     su  = Math.sin(u);
    return {
      x: (R + v * cu2) * cu,
      y: (R + v * cu2) * su,
      z: v * su2
    };
  }

  function project(p, rx, ry) {
    /* rotate X */
    var y1 = p.y * Math.cos(rx) - p.z * Math.sin(rx);
    var z1 = p.y * Math.sin(rx) + p.z * Math.cos(rx);
    /* rotate Y */
    var x2 = p.x * Math.cos(ry) + z1 * Math.sin(ry);
    var z2 = -p.x * Math.sin(ry) + z1 * Math.cos(ry);
    return { sx: cx + x2, sy: cy + y1, z: z2 };
  }

  function draw(ts) {
    if (!startTime) startTime = ts;
    var elapsed = ts - startTime;

    ctx.clearRect(0, 0, size, size);
    angle += 0.013;

    var rx = 0.42;
    var ry = angle;

    /* build all quads */
    var quads = [];
    for (var i = 0; i < N; i++) {
      var u0 = (i       / N) * Math.PI * 2;
      var u1 = ((i + 1) / N) * Math.PI * 2;
      for (var j = 0; j < M; j++) {
        var v0 = -hw + (j       / M) * 2 * hw;
        var v1 = -hw + ((j + 1) / M) * 2 * hw;

        var q00 = project(mobiusPoint(u0, v0), rx, ry);
        var q10 = project(mobiusPoint(u1, v0), rx, ry);
        var q11 = project(mobiusPoint(u1, v1), rx, ry);
        var q01 = project(mobiusPoint(u0, v1), rx, ry);

        var avgZ = (q00.z + q10.z + q11.z + q01.z) / 4;
        var t    = i / N;  /* 0..1 position along loop */
        quads.push({ q00: q00, q10: q10, q11: q11, q01: q01, avgZ: avgZ, t: t });
      }
    }

    /* painter's algorithm — back to front */
    quads.sort(function (a, b) { return a.avgZ - b.avgZ; });

    /* draw */
    ctx.shadowColor = 'rgba(0, 87, 231, 0.45)';
    ctx.shadowBlur  = 10;

    for (var k = 0; k < quads.length; k++) {
      var q = quads[k];
      /* hue sweeps 205→240 (cyan-blue → electric blue) around the loop */
      var hue   = 205 + q.t * 35;
      /* depth normalised 0..1 for the visible z range */
      var depth = Math.max(0, Math.min(1, (q.avgZ + R + hw) / (2 * (R + hw))));
      var light = 38 + depth * 28;   /* darker far, lighter near */
      var alpha = 0.82 + depth * 0.18;

      ctx.beginPath();
      ctx.moveTo(q.q00.sx, q.q00.sy);
      ctx.lineTo(q.q10.sx, q.q10.sy);
      ctx.lineTo(q.q11.sx, q.q11.sy);
      ctx.lineTo(q.q01.sx, q.q01.sy);
      ctx.closePath();

      ctx.fillStyle   = 'hsla(' + hue + ', 82%, ' + light + '%, ' + alpha + ')';
      ctx.fill();
      ctx.strokeStyle = 'hsla(' + hue + ', 60%, ' + (light + 18) + '%, 0.35)';
      ctx.lineWidth   = 0.4;
      ctx.stroke();
    }

    ctx.shadowBlur = 0;

    if (elapsed < SHOW_MS) {
      requestAnimationFrame(draw);
    } else {
      /* fade out */
      overlay.style.transition = 'opacity 0.65s ease';
      overlay.style.opacity    = '0';
      document.documentElement.classList.add('page-ready');
      setTimeout(function () { overlay.remove(); }, 700);
    }
  }

  requestAnimationFrame(draw);
})();
