/* =====================================================================
   Jade Veil · 玉幕
   A scroll-driven 3D scene for yokiyuzi.github.io

   Layers (far → near):
     paper sky  ·  dark-jade disc + gold rim  ·  pearl moon + gold orbits
     ·  six hanging jade curtains (cloth folds + flowing veins)  ·  gold threads  ·  gold dust

   Scroll does three things, never a plain zoom:
     1. moves the camera along a spline through the layers (real parallax)
     2. parts / gathers each curtain at its own moment (folds pile up)
     3. scroll *speed* becomes wind on the cloth and current in the veins
   ===================================================================== */
import * as THREE from 'three';

const hex = (h) => new THREE.Vector3(
  parseInt(h.slice(1, 3), 16) / 255, parseInt(h.slice(3, 5), 16) / 255, parseInt(h.slice(5, 7), 16) / 255);

const PAL = {
  paper: '#faf8f2', gold: '#b8904a', goldHi: '#e9cf8f', milk: '#eef4ea',
  pale: '#cfe7da', mint: '#86c7ad', jade: '#3c9a80', deep: '#0f4f43', abyss: '#082f29',
};

/* ---------------- GLSL: 3D simplex noise (Ashima / Gustavson, MIT) ---------------- */
const NOISE = /* glsl */`
vec3 mod289(vec3 x){return x-floor(x*(1.0/289.0))*289.0;}
vec4 mod289(vec4 x){return x-floor(x*(1.0/289.0))*289.0;}
vec4 permute(vec4 x){return mod289(((x*34.0)+1.0)*x);}
vec4 taylorInvSqrt(vec4 r){return 1.79284291400159-0.85373472095314*r;}
float snoise(vec3 v){
  const vec2 C=vec2(1.0/6.0,1.0/3.0); const vec4 D=vec4(0.0,0.5,1.0,2.0);
  vec3 i=floor(v+dot(v,C.yyy)); vec3 x0=v-i+dot(i,C.xxx);
  vec3 g=step(x0.yzx,x0.xyz); vec3 l=1.0-g; vec3 i1=min(g.xyz,l.zxy); vec3 i2=max(g.xyz,l.zxy);
  vec3 x1=x0-i1+C.xxx; vec3 x2=x0-i2+C.yyy; vec3 x3=x0-D.yyy;
  i=mod289(i);
  vec4 p=permute(permute(permute(i.z+vec4(0.0,i1.z,i2.z,1.0))+i.y+vec4(0.0,i1.y,i2.y,1.0))+i.x+vec4(0.0,i1.x,i2.x,1.0));
  float n_=0.142857142857; vec3 ns=n_*D.wyz-D.xzx;
  vec4 j=p-49.0*floor(p*ns.z*ns.z); vec4 x_=floor(j*ns.z); vec4 y_=floor(j-7.0*x_);
  vec4 x=x_*ns.x+ns.yyyy; vec4 y=y_*ns.x+ns.yyyy; vec4 h=1.0-abs(x)-abs(y);
  vec4 b0=vec4(x.xy,y.xy); vec4 b1=vec4(x.zw,y.zw);
  vec4 s0=floor(b0)*2.0+1.0; vec4 s1=floor(b1)*2.0+1.0; vec4 sh=-step(h,vec4(0.0));
  vec4 a0=b0.xzyw+s0.xzyw*sh.xxyy; vec4 a1=b1.xzyw+s1.xzyw*sh.zzww;
  vec3 p0=vec3(a0.xy,h.x); vec3 p1=vec3(a0.zw,h.y); vec3 p2=vec3(a1.xy,h.z); vec3 p3=vec3(a1.zw,h.w);
  vec4 nm=taylorInvSqrt(vec4(dot(p0,p0),dot(p1,p1),dot(p2,p2),dot(p3,p3)));
  p0*=nm.x; p1*=nm.y; p2*=nm.z; p3*=nm.w;
  vec4 m=max(0.6-vec4(dot(x0,x0),dot(x1,x1),dot(x2,x2),dot(x3,x3)),0.0); m=m*m;
  return 42.0*dot(m*m,vec4(dot(p0,x0),dot(p1,x1),dot(p2,x2),dot(p3,x3)));
}
float fbm(vec3 p){ float a=0.5, s=0.0; for(int i=0;i<4;i++){ s+=a*snoise(p); p=p*2.03+vec3(1.7,9.2,3.1); a*=0.5; } return s; }
float fbm3(vec3 p){ float a=0.5, s=0.0; for(int i=0;i<3;i++){ s+=a*snoise(p); p=p*2.03+vec3(1.7,9.2,3.1); a*=0.5; } return s; }
`;

const FOG = /* glsl */`
uniform vec3 uFog; uniform float uFogNear, uFogFar, uFogAmt;
vec3 applyFog(vec3 col, vec3 world){
  float d = length(world - cameraPosition);
  return mix(col, uFog, smoothstep(uFogNear, uFogFar, d) * uFogAmt);
}`;

/* ---------------- Curtain: cloth folds in the vertex shader ---------------- */
const CURTAIN_VS = /* glsl */`
uniform float uTime, uOpen, uWind, uSide, uW, uH, uSeed, uFoldFreq, uFoldAmp;
varying vec2 vLocal; varying vec3 vN; varying vec3 vWorld; varying float vCrease; varying vec2 vCut;
${NOISE}

vec3 drape(vec2 q){
  float hang = clamp((uH*0.5 - q.y)/uH, 0.0, 1.0);          // 0 at the rod, 1 at the hem
  float ax = uSide*uW*0.5;                                   // the side the curtain is gathered to
  float d  = q.x - ax, ad = abs(d);
  float g  = mix(1.0, 0.30, uOpen);                          // parting: cloth slides toward its anchor…
  float x  = ax + d*g;
  float amp = uFoldAmp*(1.0 + 1.9*uOpen)*(0.6 + 0.4*hang);   // …and the folds pile up as it goes
  float ph  = uSeed*3.0 + 0.7*sin(q.y*0.33 + uSeed);
  float z = sin(ad*uFoldFreq + ph)*amp + sin(ad*uFoldFreq*2.37 + uSeed)*amp*0.22;
  float t = uTime;
  z += sin(q.y*0.8 - t*0.85 + ad*0.55 + uSeed)*0.08*hang;                 // idle breathing
  z += sin(ad*1.6 + q.y*1.9 - t*3.1 + uSeed)*uWind*0.30*hang;              // scroll gust travels down the cloth
  x += (sin(t*0.42 + uSeed*2.0 + q.y*0.25)*0.07 + uWind*0.22*sin(t*1.25 + uSeed))*hang*hang;
  return vec3(x, q.y, z);
}
void main(){
  vec2 q = position.xy;
  vec3 p  = drape(q);
  vec3 px = drape(q + vec2(0.03, 0.0));
  vec3 py = drape(q + vec2(0.0, 0.03));
  vec3 n  = normalize(cross(px - p, py - p));
  vCrease = n.z;                         // facing the viewer = 1, inside a fold < 1
  // silhouette noise depends on one axis each, so it is computed per vertex, not per pixel
  vCut = vec2(0.28 + 0.24*snoise(vec3(q.y*0.33, uSeed, 0.0)) + 0.09*snoise(vec3(q.y*1.7, uSeed + 3.0, 0.0)),
              0.35 + 0.28*snoise(vec3(q.x*0.42, uSeed + 5.0, 1.0)) + 0.08*snoise(vec3(q.x*2.1, uSeed, 2.0)));
  vLocal = q;
  vec4 wp = modelMatrix*vec4(p, 1.0);
  vWorld = wp.xyz;
  vN = normalize(mat3(modelMatrix)*n);
  gl_Position = projectionMatrix*viewMatrix*wp;
}`;

/* ---------------- Curtain: flowing jade in the fragment shader ---------------- */
const CURTAIN_FS = /* glsl */`
uniform float uTime, uFlow, uSeed, uSide, uW, uH, uDrop, uVeins;
uniform vec3 uPale, uMid, uDeep, uMilk, uGold, uGoldHi, uLight;
varying vec2 vLocal; varying vec3 vN; varying vec3 vWorld; varying float vCrease; varying vec2 vCut;
${NOISE}
${FOG}
void main(){
  /* silhouette: the free edge is torn like a slice of stone, the hem waves */
  float s  = vLocal.x/uW + 0.5;
  float ew = (uSide > 0.0 ? s : 1.0 - s)*uW;                        // world distance from free edge
  float e1 = ew - vCut.x;
  float hb = vLocal.y + uH*0.5;                                     // distance from hem
  float e2 = hb - vCut.y;
  /* intro: the cloth unrolls from the rod, a gold seam leading */
  float fromRod = uH*0.5 - vLocal.y;
  float e3 = uDrop*1.15*uH - fromRod + 0.18*sin(vLocal.x*2.6 + uSeed*4.0);   // > 0 where already unrolled
  float edge = min(min(e1, e2), e3);
  if (edge < 0.0) discard;

  /* jade: domain-warped noise that keeps flowing */
  vec2 uv = vLocal*0.085;
  float fl = uFlow;
  vec3 p = vec3(uv, uSeed);
  vec2 q = vec2(fbm3(p + vec3(0.0, fl*0.06, fl*0.035)), fbm3(p + vec3(5.2, 1.3 - fl*0.05, -fl*0.03)));
  vec2 r = vec2(fbm3(vec3(uv + 1.5*q + vec2(1.7, 9.2 + fl*0.04), uSeed + 2.0)),
                fbm3(vec3(uv + 1.5*q + vec2(8.3, 2.8), uSeed + 4.0 + fl*0.025)));
  float f = fbm(vec3(uv + 1.7*r, uSeed + 7.0 + fl*0.01));
  float m = clamp(0.5 + 0.7*f, 0.0, 1.0);
  vec3 col = mix(uDeep, uMid, smoothstep(0.05, 0.55, m));                  // deep green pockets
  col = mix(col, uPale, smoothstep(0.45, 0.95, m + 0.18*length(q)));     // pale celadon body
  float cloud = smoothstep(0.42, 0.95, fbm(vec3(uv*2.0 + 1.6*r, uSeed + 11.0 + fl*0.03))*0.5 + 0.5);
  col = mix(col, uMilk, cloud*0.55);                                      // milky clouds inside the stone
  float dark = snoise(vec3(uv*2.2 + 1.8*q, uSeed + 31.0));                 // a few fine green fissures
  col = mix(col, uDeep*0.9, (1.0 - smoothstep(0.0, fwidth(dark)*1.5 + 0.02, abs(dark)))*0.14*smoothstep(0.1,0.5,f));

  /* gold veins (kintsugi) — only where a slow mask allows, so they read as veins, not contours */
  float vn = snoise(vec3(uv*1.1 + 1.5*r, uSeed + 21.0));
  float vw = fwidth(vn)*1.2 + 0.011;
  float vmask = smoothstep(0.0, 0.4, fbm3(vec3(uv*0.6, uSeed + 41.0 + fl*0.02))) * uVeins;
  float vein = (1.0 - smoothstep(0.0, vw, abs(vn)))*vmask;

  /* light: soft wrap, a glaze highlight, silk sheen at grazing angles */
  vec3 N = normalize(vN); if (!gl_FrontFacing) N = -N;
  vec3 V = normalize(cameraPosition - vWorld);
  vec3 L = normalize(uLight);
  float wrap = clamp((dot(N, L) + 0.45)/1.45, 0.0, 1.0);
  float spec = pow(max(dot(N, normalize(L + V)), 0.0), 56.0);
  float fres = pow(1.0 - abs(dot(N, V)), 3.0);
  col *= 0.60 + 0.48*wrap;
  col *= mix(0.70, 1.0, smoothstep(0.25, 0.97, vCrease));                   // shadow in the valleys of folds
  col += spec*0.22 + fres*0.20*uMilk;
  vec3 gold = mix(uGold, uGoldHi, 0.35 + 0.65*spec + 0.3*wrap);
  col = mix(col, gold, vein*0.92);

  /* gold rim on every cut edge */
  float rw = 0.045;
  float rim = 1.0 - smoothstep(rw*0.5, rw + fwidth(edge), edge);
  col = mix(col, mix(uGold, uGoldHi, 0.4 + 0.6*wrap), rim);

  col = applyFog(col, vWorld);
  gl_FragColor = vec4(col, 1.0);
}`;

/* ---------------- Gold thread / orbit ---------------- */
const THREAD_VS = /* glsl */`
varying float vU; varying vec3 vN; varying vec3 vWorld;
void main(){
  vU = uv.x;
  vec4 wp = modelMatrix*vec4(position, 1.0); vWorld = wp.xyz;
  vN = normalize(mat3(modelMatrix)*normal);
  gl_Position = projectionMatrix*viewMatrix*wp;
}`;
const THREAD_FS = /* glsl */`
uniform float uTime, uFlow, uDraw, uPulse;
uniform vec3 uGold, uGoldHi, uLight;
varying float vU; varying vec3 vN; varying vec3 vWorld;
${FOG}
void main(){
  if (vU > uDraw) discard;
  float near = smoothstep(3.0, 9.0, length(vWorld - cameraPosition));
  if (near < 0.01) discard;
  vec3 N = normalize(vN), V = normalize(cameraPosition - vWorld), L = normalize(uLight);
  float wrap = clamp((dot(N, L) + 0.5)/1.5, 0.0, 1.0);
  float spec = pow(max(dot(N, normalize(L + V)), 0.0), 24.0);
  vec3 col = mix(uGold*0.82, uGoldHi, 0.25*wrap + 0.6*spec);
  float pulse = pow(0.5 + 0.5*sin((vU*5.0 - uTime*0.12 - uFlow*0.25)*6.2831), 14.0);
  col = mix(col, uGoldHi, pulse*uPulse*0.75);
  col = mix(col, vec3(1.0, 0.97, 0.88), smoothstep(uDraw - 0.025, uDraw, vU)*step(uDraw, 0.999)*0.8);
  col = applyFog(col, vWorld);
  gl_FragColor = vec4(col, near);
}`;

/* ---------------- Pearl moon ---------------- */
const MOON_VS = /* glsl */`
varying vec3 vObj; varying vec3 vN; varying vec3 vWorld;
void main(){
  vObj = position; vN = normalize(mat3(modelMatrix)*normal);
  vec4 wp = modelMatrix*vec4(position, 1.0); vWorld = wp.xyz;
  gl_Position = projectionMatrix*viewMatrix*wp;
}`;
const MOON_FS = /* glsl */`
uniform float uTime, uFlow; uniform vec3 uLight, uGold;
varying vec3 vObj; varying vec3 vN; varying vec3 vWorld;
${NOISE}
${FOG}
void main(){
  vec3 o = normalize(vObj)*1.35;
  vec3 w = vec3(fbm(o + vec3(0.0, 0.0, uFlow*0.01)), fbm(o + vec3(3.1, 7.7, 1.0)), fbm(o + vec3(9.4, 2.2, 5.0)));
  float f = fbm(o*1.6 + 2.2*w);
  vec3 a = vec3(0.965, 0.945, 0.900), b = vec3(0.870, 0.835, 0.760), c = vec3(0.905, 0.925, 0.890);
  vec3 col = mix(b, a, smoothstep(-0.45, 0.45, f));
  col = mix(col, c, smoothstep(0.2, 0.8, w.x)*0.5);
  float vn = snoise(o*2.2 + 1.7*w);
  col = mix(col, uGold, (1.0 - smoothstep(0.0, fwidth(vn)*1.2 + 0.01, abs(vn)))*0.32*smoothstep(-0.1, 0.4, w.y));
  vec3 N = normalize(vN), V = normalize(cameraPosition - vWorld), L = normalize(uLight);
  float wrap = clamp((dot(N, L) + 0.6)/1.6, 0.0, 1.0);
  float fres = pow(1.0 - max(dot(N, V), 0.0), 2.5);
  col *= 0.78 + 0.28*wrap;
  col += pow(max(dot(N, normalize(L + V)), 0.0), 30.0)*0.12;
  col = mix(col, vec3(0.99, 0.98, 0.95), fres*0.35);
  gl_FragColor = vec4(applyFog(col, vWorld), 1.0);
}`;

/* ---------------- Dark jade disc ---------------- */
const DISC_VS = /* glsl */`
varying vec2 vP; varying vec3 vWorld;
void main(){ vP = position.xy; vec4 wp = modelMatrix*vec4(position, 1.0); vWorld = wp.xyz; gl_Position = projectionMatrix*viewMatrix*wp; }`;
const DISC_FS = /* glsl */`
uniform float uTime, uFlow, uR; uniform vec3 uAbyss, uDeep, uJade;
varying vec2 vP; varying vec3 vWorld;
${NOISE}
${FOG}
void main(){
  vec2 uv = vP/uR*1.6;
  vec2 q = vec2(fbm(vec3(uv, 1.0 + uFlow*0.015)), fbm(vec3(uv + 4.0, 2.0 - uFlow*0.012)));
  float f = fbm(vec3(uv*1.4 + 2.5*q, 3.0));
  vec3 col = mix(uAbyss, uDeep, smoothstep(-0.5, 0.35, f));
  col = mix(col, uJade, smoothstep(0.2, 0.8, f + 0.3*q.y)*0.55);
  float spot = smoothstep(0.55, 0.9, fbm(vec3(uv*3.5 + q*2.0, 9.0))*0.5 + 0.5);
  col = mix(col, uAbyss*0.7, spot*0.5);
  col *= 0.92 + 0.12*smoothstep(1.0, 0.2, length(vP)/uR);
  gl_FragColor = vec4(applyFog(col, vWorld), 1.0);
}`;

/* ---------------- Gold dust ---------------- */
const DUST_VS = /* glsl */`
uniform float uTime, uPx, uWind; attribute float aSeed; varying float vTw;
void main(){
  vec3 p = position;
  p.y += sin(uTime*0.25 + aSeed*20.0)*0.35 + uWind*sin(aSeed*50.0 + uTime)*0.4;
  p.x += cos(uTime*0.18 + aSeed*31.0)*0.35;
  vec4 mv = modelViewMatrix*vec4(p, 1.0);
  gl_Position = projectionMatrix*mv;
  gl_PointSize = uPx*(0.6 + aSeed*1.4)*(14.0/-mv.z);
  vTw = 0.55 + 0.45*sin(uTime*(0.8 + aSeed*2.0) + aSeed*40.0);
}`;
const DUST_FS = /* glsl */`
uniform vec3 uGold, uGoldHi; varying float vTw;
void main(){
  float d = length(gl_PointCoord - 0.5);
  float a = smoothstep(0.5, 0.0, d);
  gl_FragColor = vec4(mix(uGold, uGoldHi, a*vTw), a*0.85*vTw);
}`;

/* ======================================================================== */

const smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

/* Camera stops: one per page section. [eye, target, fov]. Index k is reached when section k sits in the reading band. */
const STOPS = [
  //  eye                 target               fov  lens shift (keeps the left column calm)
  [[-2.0, 0.8, 14.0], [0.0, 1.4, 0.0], 40, 0.00],     // hero — the stage: moon framed by curtains
  [[1.5, 0.4, 8.5], [4.5, 1.2, -6.0], 42, 0.10],      // 01 — slip past the first curtain as it parts
  [[4.5, -0.3, 1.5], [10.0, 0.6, -8.0], 50, 0.22],    // 02 — inside the layers: a corridor of silk
  [[6.0, 5.6, 2.5], [10.5, -2.0, -8.5], 50, 0.18],    // 03 — rise for a high three-quarter view of the hems
  [[2.0, 2.4, 0.0], [7.6, 3.0, -15.5], 38, 0.20],     // 04 — turn toward the moon; the orbits draw
  [[4.0, 2.8, -4.0], [7.6, 3.0, -15.5], 40, 0.22],    // end — near the moon, everything at rest
];
/* Portrait screens: same path, wider lens. */

export function mountJadeVeil({ canvas, sections = [], onProgress = () => {}, quality = 1 } = {}) {
  const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
  THREE.ColorManagement.enabled = false;               // colours below are authored in sRGB
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: 'high-performance' });
  } catch (e) { return null; }
  renderer.outputColorSpace = THREE.LinearSRGBColorSpace;
  renderer.setClearColor(PAL.paper, 1);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 220);

  const U = {
    uTime: { value: 0 }, uFlow: { value: 0 }, uWind: { value: 0 },
    uFog: { value: hex(PAL.paper) }, uFogNear: { value: 12 }, uFogFar: { value: 46 },
    uLight: { value: new THREE.Vector3(-0.45, 0.75, 0.55).normalize() },
    uGold: { value: hex(PAL.gold) }, uGoldHi: { value: hex(PAL.goldHi) }, uMilk: { value: hex(PAL.milk) },
  };

  /* ---------- backdrop: disc, rim, moon ---------- */
  const MOON_C = new THREE.Vector3(7.6, 3.0, -15.5);
  const disc = new THREE.Mesh(new THREE.CircleGeometry(9.0, 160), new THREE.ShaderMaterial({
    uniforms: { ...pick(U, 'uTime uFlow uFog uFogNear uFogFar'), uFogAmt: { value: 0.35 }, uR: { value: 9.0 },
      uAbyss: { value: hex(PAL.abyss) }, uDeep: { value: hex(PAL.deep) }, uJade: { value: hex(PAL.jade) } },
    vertexShader: DISC_VS, fragmentShader: DISC_FS,
  }));
  disc.position.set(8.8, 2.4, -19.5); disc.rotation.y = -0.42;
  scene.add(disc);

  const moon = new THREE.Mesh(new THREE.SphereGeometry(3.3, 96, 64), new THREE.ShaderMaterial({
    uniforms: { ...pick(U, 'uTime uFlow uLight uGold uFog uFogNear uFogFar'), uFogAmt: { value: 0.25 } },
    vertexShader: MOON_VS, fragmentShader: MOON_FS,
  }));
  moon.position.copy(MOON_C);
  scene.add(moon);

  /* ---------- threads & orbits ---------- */
  const threads = [];
  function thread(curve, { r = 0.02, draw = [0, 0], intro = false, pulse = 1, seg = 700, closed = false, fog = 0.5 }) {
    const mat = new THREE.ShaderMaterial({
      uniforms: { ...pick(U, 'uTime uFlow uGold uGoldHi uLight uFog uFogNear uFogFar'),
        uFogAmt: { value: fog }, uDraw: { value: 0 }, uPulse: { value: pulse } },
      vertexShader: THREAD_VS, fragmentShader: THREAD_FS, transparent: true,
    });
    const mesh = new THREE.Mesh(new THREE.TubeGeometry(curve, seg, r, 7, closed), mat);
    scene.add(mesh);
    threads.push({ mat, draw, intro });
    return mesh;
  }
  const V3 = (a) => new THREE.Vector3(...a);
  const cr = (pts, closed = false) => new THREE.CatmullRomCurve3(pts.map(V3), closed, 'centripetal');
  // the long sweeping arc of the original artwork
  thread(cr([[-9, 9.5, -22], [-2, 10.5, -21], [6, 10.2, -20], [13, 7.5, -19.5], [17, 2, -19], [16.5, -6, -18.5]]), { r: 0.045, intro: true, draw: [0, 0] });
  // rim of the disc
  {
    const pts = []; for (let i = 0; i < 160; i++) { const a = i / 160 * Math.PI * 2; pts.push([Math.cos(a) * 9.05, Math.sin(a) * 9.05, 0.02]); }
    const m = thread(cr(pts, true), { r: 0.05, intro: true, closed: true, seg: 480, fog: 0.35 });
    m.position.copy(disc.position); m.rotation.copy(disc.rotation);
  }
  // silk threads drifting between curtains — each appears with its section
  thread(cr([[-6, -1.5, 6], [-1, -0.6, 3], [3.5, -1.4, 0.5], [7, 0.2, -2], [11, -0.8, -5], [15, 0.6, -8]]), { r: 0.016, draw: [0.35, 1.25] });
  thread(cr([[14, 3.2, 2], [9, 2.4, -1.5], [5, 3.4, -4], [1, 2.2, -6.5], [-4, 3.0, -9]]), { r: 0.016, draw: [1.2, 2.2] });
  thread(cr([[-3, 0.2, -2], [1.5, -0.4, -4], [5.5, 0.8, -7], [9.5, -0.6, -9.5], [13, 0.4, -12]]), { r: 0.018, draw: [2.1, 3.1] });
  // orbits round the moon (the logo, in three dimensions)
  function orbit(rx, rz, tiltX, tiltZ, draw, r = 0.03) {
    const pts = []; const e = new THREE.Euler(tiltX, 0.35, tiltZ); const v = new THREE.Vector3();
    for (let i = 0; i < 180; i++) { const a = i / 180 * Math.PI * 2; v.set(Math.cos(a) * rx, 0, Math.sin(a) * rz).applyEuler(e).add(MOON_C); pts.push(v.toArray()); }
    return thread(cr(pts, true), { r, draw, closed: true, seg: 600, fog: 0.3 });
  }
  orbit(6.4, 2.6, 0.18, -0.46, [3.1, 4.0]);
  orbit(5.6, 2.2, -0.12, -0.38, [3.5, 4.4], 0.022);
  const bead = new THREE.Mesh(new THREE.SphereGeometry(0.22, 24, 16), new THREE.ShaderMaterial({
    uniforms: { ...pick(U, 'uTime uFlow uLight uGold uFog uFogNear uFogFar'), uFogAmt: { value: 0.2 } },
    vertexShader: MOON_VS, fragmentShader: /* glsl */`uniform vec3 uGold, uLight; varying vec3 vN; varying vec3 vWorld; varying vec3 vObj;
      void main(){ vec3 N=normalize(vN),V=normalize(cameraPosition-vWorld); float w=clamp((dot(N,normalize(uLight))+0.5)/1.5,0.,1.);
      vec3 c=uGold*(0.7+0.5*w)+pow(max(dot(N,normalize(normalize(uLight)+V)),0.),20.)*0.5; gl_FragColor=vec4(c,1.);}`,
  }));
  scene.add(bead);
  const beadOrbit = { rx: 6.4, rz: 2.6, e: new THREE.Euler(0.18, 0.35, -0.46) };

  /* ---------- curtains ---------- */
  const C = (h) => ({ value: hex(h) });
  const curtains = [];
  function curtain(o) {
    const w = o.w, h = o.h ?? 15;
    const geo = new THREE.PlaneGeometry(w, h, Math.round(w * 30 * quality), Math.round(h * 9 * quality));
    const mat = new THREE.ShaderMaterial({
      uniforms: {
        ...pick(U, 'uTime uFlow uWind uFog uFogNear uFogFar uLight uGold uGoldHi uMilk'),
        uFogAmt: { value: o.fog ?? 0.7 }, uOpen: { value: 0 }, uDrop: { value: RM ? 1 : 0 }, uSide: { value: o.side },
        uW: { value: w }, uH: { value: h }, uSeed: { value: o.seed }, uVeins: { value: o.veins ?? 1 },
        uFoldFreq: { value: o.freq ?? 4.0 }, uFoldAmp: { value: o.amp ?? 0.24 },
        uPale: C(o.pale), uMid: C(o.mid), uDeep: C(o.deep),
      },
      vertexShader: CURTAIN_VS, fragmentShader: CURTAIN_FS, side: THREE.DoubleSide,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(o.x, o.y ?? 2.5, o.z); mesh.rotation.y = o.rot ?? 0;
    mesh.frustumCulled = false;
    scene.add(mesh);
    curtains.push({ mesh, mat, base: mesh.position.clone(), o });
  }
  // side +1: gathered to the right, free edge on the left;  side -1: the mirror.
  curtain({ x: 7.3, z: 3.5, w: 5.5, rot: -0.22, side: 1, seed: 1.3, pale: '#e3f1e8', mid: '#9fd2bd', deep: '#3f8f78', open: [0.10, 0.95], slide: [3.0, 0, 0], delay: 0.0 });
  curtain({ x: -3.2, z: -1.0, w: 6.0, rot: 0.18, side: -1, seed: 2.7, pale: '#d8ece1', mid: '#76bca2', deep: '#1f6a57', open: [0.9, 1.85], slide: [-2.0, 0, 0], delay: 0.12 });
  curtain({ x: 10.6, z: -4.0, w: 6.0, rot: -0.30, side: 1, seed: 4.1, pale: '#cde6d8', mid: '#5aa98d', deep: '#145a4a', open: [1.7, 2.6], slide: [2.2, 0, 0], delay: 0.22 });
  curtain({ x: -1.3, z: -7.0, w: 7.0, rot: 0.26, side: -1, seed: 5.9, pale: '#d4eadf', mid: '#62b195', deep: '#125646', open: [2.3, 3.3], slide: [-2.8, 0, 0], delay: 0.3 });
  curtain({ x: 13.8, z: -9.5, w: 7.0, rot: -0.35, side: 1, seed: 7.3, pale: '#c6e0d0', mid: '#46997e', deep: '#0c4b3f', open: [9, 9], slide: [0, 0, 0], delay: 0.38, fog: 0.6 });
  curtain({ x: -8.0, z: -11.0, w: 8.0, rot: 0.45, side: -1, seed: 8.8, pale: '#e2f1e8', mid: '#9ad3bc', deep: '#2b7e66', open: [9, 9], slide: [0, 0, 0], delay: 0.45, fog: 0.6, veins: 0.6 });

  /* ---------- gold dust ---------- */
  const N = matchMedia('(max-width: 700px)').matches ? 110 : 240;
  const dpos = new Float32Array(N * 3), dseed = new Float32Array(N);
  for (let i = 0; i < N; i++) {
    dpos[i * 3] = -6 + Math.random() * 22; dpos[i * 3 + 1] = -4 + Math.random() * 11; dpos[i * 3 + 2] = -16 + Math.random() * 24;
    dseed[i] = Math.random();
  }
  const dgeo = new THREE.BufferGeometry();
  dgeo.setAttribute('position', new THREE.BufferAttribute(dpos, 3));
  dgeo.setAttribute('aSeed', new THREE.BufferAttribute(dseed, 1));
  const dust = new THREE.Points(dgeo, new THREE.ShaderMaterial({
    uniforms: { ...pick(U, 'uTime uWind uGold uGoldHi'), uPx: { value: 3 } },
    vertexShader: DUST_VS, fragmentShader: DUST_FS, transparent: true, depthWrite: false,
  }));
  scene.add(dust);

  /* ---------- camera path ---------- */
  const eyeCurve = cr(STOPS.map((s) => s[0]));
  const tgtCurve = cr(STOPS.map((s) => s[1]));
  const NS = STOPS.length - 1;
  const lerpStop = (u, i) => {
    const k = Math.min(NS - 1, Math.floor(u)), t = u - k, a = STOPS[k][i], b = STOPS[k + 1][i];
    return a + (b - a) * (t * t * (3 - 2 * t));
  };

  /* ---------- scroll → u (piecewise, anchored to sections) ---------- */
  let anchors = [], maxScroll = 1;
  function measure() {
    const vh = innerHeight;
    maxScroll = Math.max(1, document.documentElement.scrollHeight - vh);
    // stop k is reached when section k's middle meets the middle of the screen
    anchors = sections.map((el, i) => i === 0 ? 0 : Math.max(0, el.getBoundingClientRect().top + scrollY + el.offsetHeight / 2 - vh / 2));
    anchors.push(maxScroll);
    while (anchors.length < STOPS.length) anchors.push(maxScroll);
    anchors = anchors.slice(0, STOPS.length);
    for (let i = 1; i < anchors.length; i++) anchors[i] = Math.max(anchors[i], anchors[i - 1] + 1);
  }
  function scrollToU(y) {
    for (let i = 0; i < anchors.length - 1; i++) {
      if (y <= anchors[i + 1]) return i + Math.max(0, (y - anchors[i]) / (anchors[i + 1] - anchors[i]));
    }
    return NS;
  }

  /* ---------- size ---------- */
  let dpr = Math.min(devicePixelRatio || 1, 1.75), portrait = false;
  let vw = innerWidth, vh = innerHeight;
  function fit() {
    const w = innerWidth, h = innerHeight; vw = w; vh = h;
    portrait = w < h * 0.9;
    renderer.setPixelRatio(dpr);
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    // keep the left column calm on wide screens: shift the lens so the stage sits right of centre
    camera.filmOffset = 0;
    camera.updateProjectionMatrix();
    dust.material.uniforms.uPx.value = 3 * dpr;
    measure();
  }
  addEventListener('resize', fit, { passive: true });
  new ResizeObserver(measure).observe(document.body);
  fit();

  /* ---------- pointer parallax ---------- */
  const ptr = { x: 0, y: 0, sx: 0, sy: 0 };
  addEventListener('pointermove', (e) => { ptr.x = e.clientX / innerWidth * 2 - 1; ptr.y = e.clientY / innerHeight * 2 - 1; }, { passive: true });

  /* ---------- loop ---------- */
  let cur = scrollToU(scrollY), prevCur = cur, vel = 0, wind = 0, intro = RM ? 1 : 0, last = performance.now(), visible = true, raf = 0;
  let frozen = null, introHeld = false; // debug hooks
  const eye = new THREE.Vector3(), tgt = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0), side = new THREE.Vector3();
  const frameTimes = []; let qualityStep = 0;

  document.addEventListener('visibilitychange', () => {
    visible = !document.hidden;
    cancelAnimationFrame(raf);
    if (visible) { last = performance.now(); loop(); }
  });

  function loop() {
    if (!visible) return;
    raf = requestAnimationFrame(loop);
    const now = performance.now();
    const idle = Math.abs(vel) < 0.002 && wind < 0.02 && intro >= 1;
    if (idle && now - last < 30) return;                    // at rest the veins still flow, at half the frame rate
    let dt = Math.min(0.05, (now - last) / 1000); last = now;

    const target = frozen ?? scrollToU(scrollY);
    const k = RM ? 1 : 1 - Math.exp(-dt * 4.2);            // inertia: the scene follows the wheel, never jumps
    prevCur = cur; cur += (target - cur) * k;
    if (frozen != null && Math.abs(target - cur) < 1e-4) cur = target;
    const v = dt > 0 ? (cur - prevCur) / dt : 0;
    vel += (v - vel) * (1 - Math.exp(-dt * 8));
    const wTarget = Math.min(1.4, Math.abs(vel) * 2.2);
    wind += (wTarget - wind) * (1 - Math.exp(-dt * (wTarget > wind ? 5 : 1.4)));   // gusts rise fast, settle slowly

    if (!RM) {
      U.uTime.value += dt;
      U.uFlow.value += dt * (0.35 + vel * 6.0);              // the veins drift, and run with your scroll
    }
    U.uWind.value = RM ? 0 : wind;
    if (!introHeld) intro = Math.min(1, intro + dt / 2.6);
    const ei = 1 - Math.pow(1 - intro, 3);

    // curtains: unroll on arrival, then part at their own moment
    for (const c of curtains) {
      const o = c.o, mu = c.mat.uniforms;
      mu.uDrop.value = RM ? 1 : smooth(o.delay, o.delay + 0.55, ei);
      const op = smooth(o.open[0], o.open[1], cur);
      mu.uOpen.value = op;
      c.mesh.position.set(c.base.x + o.slide[0] * op, c.base.y + o.slide[1] * op, c.base.z + o.slide[2] * op);
    }
    // threads: draw in with their section; the hero's lines draw in on arrival
    for (const t of threads) t.mat.uniforms.uDraw.value = t.intro ? smooth(0.15, 1, ei) : smooth(t.draw[0], t.draw[1], cur) * 1.001;
    // moon turns slowly; a bead rides the first orbit
    moon.rotation.y = U.uTime.value * 0.03 + cur * 0.35;
    const ba = U.uTime.value * 0.18 + cur * 1.2;
    bead.position.set(Math.cos(ba) * beadOrbit.rx, 0, Math.sin(ba) * beadOrbit.rz).applyEuler(beadOrbit.e).add(MOON_C);
    bead.visible = smooth(3.1, 4.0, cur) > 0.98;

    // camera
    const t = Math.min(1, Math.max(0, cur / NS));
    eyeCurve.getPoint(t, eye); tgtCurve.getPoint(t, tgt);
    const uc = Math.min(NS - 1e-4, Math.max(0, cur));
    let fov = lerpStop(uc, 2);
    if (portrait) fov = Math.min(78, fov * 1.42);
    const shift = portrait ? 0 : lerpStop(uc, 3);
    camera.setViewOffset(vw, vh, -vw * shift, 0, vw, vh);
    ptr.sx += (ptr.x - ptr.sx) * (1 - Math.exp(-dt * 2.5)); ptr.sy += (ptr.y - ptr.sy) * (1 - Math.exp(-dt * 2.5));
    side.subVectors(tgt, eye).cross(up).normalize();
    if (!RM) eye.addScaledVector(side, ptr.sx * 0.35).addScaledVector(up, -ptr.sy * 0.22);
    // arrival: the stage settles from slightly above
    if (!RM && intro < 1) { const lift = (1 - ei) * 2.2; eye.y += lift; tgt.y += lift * 0.6; }
    camera.position.copy(eye); camera.fov = fov; camera.lookAt(tgt);
    camera.updateProjectionMatrix();

    renderer.render(scene, camera);
    onProgress(cur / NS, cur);

    // adaptive quality: if frames run long, render fewer pixels rather than drop frames
    // The intentional 30 fps idle limit is not a sign of GPU pressure.
    if (!idle) frameTimes.push(dt);
    if (frameTimes.length > 50) {
      const avg = frameTimes.reduce((a, b) => a + b, 0) / frameTimes.length; frameTimes.length = 0;
      if (avg > 1 / 42 && dpr > 0.8 && qualityStep < 4) { dpr = Math.max(0.8, dpr * 0.82); qualityStep++; renderer.setPixelRatio(dpr); renderer.setSize(innerWidth, innerHeight, false); }
    }
  }
  loop();

  return {
    measure,
    freeze(u) { frozen = u; if (u != null) { cur = prevCur = u; vel = 0; wind = 0; } },   // for screenshots / debugging
    skipIntro() { intro = 1; },
    setIntro(v) { intro = v; introHeld = v < 1; },     // for screenshots of the arrival
    destroy() { cancelAnimationFrame(raf); renderer.dispose(); },
  };
}

function pick(U, names) { const o = {}; for (const n of names.split(' ')) o[n] = U[n]; return o; }
