/* =====================================================================
   Jade Veil · 玉幕  — v3「风 · 夜 · 印」
   A scroll-driven 3D scene for yokiyuzi.github.io

   Layers (far → near):
     paper sky · dark-jade disc (its rim crumbling into gold) · moon halo · pearl moon + double orbits
     · six hanging jade curtains (folds, flowing veins, broken-gold crust on every torn edge,
       light through the jade, silk sheen) · gold-outlined mist banks · brush-stroke line bundles
     · tumbling gold leaf · glitter

   Scroll does three things, never a plain zoom:
     1. moves the camera along a spline through the layers (real parallax)
     2. parts / gathers each curtain at its own moment, draws each line bundle in turn
     3. scroll *speed* becomes wind: cloth ripples, lines undulate, veins run, gold leaf spins
   The cursor is a breeze: rings spread on the silk where it passes, lines tremble, gold leaf whirls after it.
   Night: the paper turns to ink-dark, the moon lights the jade from behind, stars come out.
   ===================================================================== */
import * as THREE from 'three';

const hex = (h) => new THREE.Vector3(
  parseInt(h.slice(1, 3), 16) / 255, parseInt(h.slice(3, 5), 16) / 255, parseInt(h.slice(5, 7), 16) / 255);

const PAL = {
  paper: '#faf8f2', gold: '#b8904a', goldHi: '#efd697', bronze: '#93703a', milk: '#eef4ea',
  pale: '#cfe7da', mint: '#86c7ad', jade: '#3c9a80', deep: '#0f4f43', abyss: '#082f29',
  glow: '#bfead4', mist: '#f5f6f0', halo: '#f3e7c6',
  night: '#0a1512', nightMist: '#1c2f2a', nightHalo: '#dcefe3',
};

function mulberry32(a) { return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

/* ---------------- GLSL: 3D simplex noise (Ashima / Gustavson, MIT) + cellular ---------------- */
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
vec2 hash22(vec2 p){ p=vec2(dot(p,vec2(127.1,311.7)),dot(p,vec2(269.5,183.3))); return fract(sin(p)*43758.5453); }
/* cellular: x = distance to nearest seed, y = gap to the second nearest (0 on a crack), z = a random id for the cell */
vec3 cells(vec2 x){
  vec2 n=floor(x), f=fract(x); float F1=8.0, F2=8.0; vec2 id=vec2(0.0);
  for(int j=-1;j<=1;j++) for(int i=-1;i<=1;i++){
    vec2 g=vec2(float(i),float(j)); vec2 r=g+hash22(n+g)-f; float d=dot(r,r);
    if(d<F1){ F2=F1; F1=d; id=n+g; } else if(d<F2){ F2=d; }
  }
  F1=sqrt(F1); F2=sqrt(F2);
  return vec3(F1, F2-F1, fract(sin(dot(id,vec2(12.9898,78.233)))*43758.5453));
}
`;

const FOG = /* glsl */`
uniform vec3 uFog; uniform float uFogNear, uFogFar, uFogAmt;
vec3 applyFog(vec3 col, vec3 world){
  float d = length(world - cameraPosition);
  return mix(col, uFog, smoothstep(uFogNear, uFogFar, d) * uFogAmt);
}`;

/* the cursor as a breeze: rings that spread from where it passed, and a soft give right under it */
const BREEZE = /* glsl */`
uniform vec3 uImpO[6]; uniform vec3 uImpD[6]; uniform float uImpT[6]; uniform float uImpS[6];
uniform vec3 uCurO, uCurD; uniform float uHover;
float rayDist(vec3 p, vec3 o, vec3 d){ vec3 v = p - o; return length(v - d*dot(v, d)); }
float stir(vec3 w, out float hover){
  float s = 0.0;
  for (int i = 0; i < 6; i++){
    if (uImpS[i] <= 0.0) continue;
    float age = uImpT[i];
    float d = rayDist(w, uImpO[i], uImpD[i]) - age*2.4;
    s += sin(d*5.5)*exp(-d*d/0.35)*uImpS[i]*exp(-age*1.2);
  }
  float dc = rayDist(w, uCurO, uCurD);
  hover = exp(-dc*dc/1.4)*uHover;
  return s;
}`;

/* shared look of gold leaf: dark bronze in shadow, bright where a flake faces the light, a white spark at the peak */
const LEAF = /* glsl */`
vec3 goldLeaf(vec3 n, vec3 L, vec3 V, vec3 gold, vec3 goldHi, vec3 bronze, float crinkle){
  vec3 H = normalize(L + V);
  float wrap = clamp((dot(n, L) + 0.35)/1.35, 0.0, 1.0);
  float g = pow(max(dot(n, H), 0.0), 34.0);
  vec3 c = mix(bronze, gold, wrap)*crinkle;
  return c + goldHi*g*1.15 + vec3(1.0, 0.97, 0.9)*pow(g, 7.0)*0.9;
}`;

/* ---------------- Curtain: cloth folds in the vertex shader ---------------- */
const CURTAIN_VS = /* glsl */`
uniform float uTime, uOpen, uWind, uSide, uW, uH, uSeed, uFoldFreq, uFoldAmp;
varying vec2 vLocal; varying vec3 vN; varying vec3 vWorld; varying float vCrease; varying vec3 vCut; varying vec3 vTan; varying vec2 vSlow;
${NOISE}
${BREEZE}
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
  float hv; float st = stir((modelMatrix*vec4(x, q.y, z, 1.0)).xyz, hv);
  z += st*0.17 - hv*0.30;                                                     // the cursor's breeze
  return vec3(x, q.y, z);
}
void main(){
  vec2 q = position.xy;
  vec3 p  = drape(q);
  vec3 px = drape(q + vec2(0.03, 0.0));
  vec3 py = drape(q + vec2(0.0, 0.03));
  vec3 n  = normalize(cross(px - p, py - p));
  vCrease = n.z;
  vLocal = q;
  vCut = vec3(0.28 + 0.24*snoise(vec3(q.y*0.33, uSeed, 0.0)) + 0.09*snoise(vec3(q.y*1.7, uSeed + 3.0, 0.0)),
              0.35 + 0.28*snoise(vec3(q.x*0.42, uSeed + 5.0, 1.0)) + 0.08*snoise(vec3(q.x*2.1, uSeed, 2.0)),
              0.16 + 0.10*snoise(vec3(q.y*0.5, uSeed + 8.0, 4.0)) + 0.05*snoise(vec3(q.y*2.3, uSeed + 2.0, 5.0)));   // the gathered side is torn too
  vec4 wp = modelMatrix*vec4(p, 1.0);
  vWorld = wp.xyz;
  vN = normalize(mat3(modelMatrix)*n);
  vTan = normalize(mat3(modelMatrix)*normalize(py - p));
  // slow fields (where gold gathers on the edge; how wide a vein runs) are smooth enough to compute per vertex
  vSlow = vec2(snoise(vec3(q*0.45, uSeed + 50.0)), snoise(vec3(q*0.255, uSeed + 61.0)));
  gl_Position = projectionMatrix*viewMatrix*wp;
}`;

/* ---------------- Curtain: flowing jade, broken gold, light through stone ---------------- */
const CURTAIN_FS = /* glsl */`
uniform float uTime, uFlow, uSeed, uSide, uW, uH, uDrop, uVeins, uLeaf, uNight;
uniform vec3 uPale, uMid, uDeep, uMilk, uGold, uGoldHi, uBronze, uGlow, uLight, uMoon;
varying vec2 vLocal; varying vec3 vN; varying vec3 vWorld; varying float vCrease; varying vec3 vCut; varying vec3 vTan; varying vec2 vSlow;
${NOISE}
${FOG}
${LEAF}
void main(){
  /* silhouette: torn free edge, wavy hem, and (on arrival) the unrolling front */
  float s  = vLocal.x/uW + 0.5;
  float ew = (uSide > 0.0 ? s : 1.0 - s)*uW;
  float e1 = ew - vCut.x;
  float e2 = (vLocal.y + uH*0.5) - vCut.y;
  float fromRod = uH*0.5 - vLocal.y;
  float e3 = uDrop*1.15*uH - fromRod + 0.18*sin(vLocal.x*2.6 + uSeed*4.0);
  float e4 = (uSide > 0.0 ? 1.0 - s : s)*uW - vCut.z;
  float edge = min(min(e1, e2), min(e3, e4));
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
  vec3 col = mix(uDeep, uMid, smoothstep(0.05, 0.55, m));
  col = mix(col, uPale, smoothstep(0.45, 0.95, m + 0.18*length(q)));
  float cloud = smoothstep(0.42, 0.95, fbm(vec3(uv*2.0 + 1.6*r, uSeed + 11.0 + fl*0.03))*0.5 + 0.5);
  col = mix(col, uMilk, cloud*0.55);
  float dark = snoise(vec3(uv*2.2 + 1.8*q, uSeed + 31.0));
  col = mix(col, uDeep*0.9, (1.0 - smoothstep(0.0, fwidth(dark)*1.5 + 0.02, abs(dark)))*0.14*smoothstep(0.1, 0.5, f));

  /* gold veins: width breathes along the vein, so they read as hand-laid kintsugi rather than contour lines */
  float vn = snoise(vec3(uv*1.1 + 1.5*r, uSeed + 21.0));
  float vwid = 0.006 + 0.012*smoothstep(-0.3, 0.6, vSlow.y);
  float vw = fwidth(vn)*1.1 + vwid;
  float vmask = smoothstep(0.0, 0.4, fbm3(vec3(uv*0.6, uSeed + 41.0 + fl*0.02)))*uVeins;
  float vein = (1.0 - smoothstep(0.0, vw, abs(vn)))*vmask;

  /* light */
  vec3 N = normalize(vN); if (!gl_FrontFacing) N = -N;
  vec3 V = normalize(cameraPosition - vWorld);
  vec3 L = normalize(uLight);
  vec3 H = normalize(L + V);
  float wrap = clamp((dot(N, L) + 0.45)/1.45, 0.0, 1.0);
  float spec = pow(max(dot(N, H), 0.0), 56.0);
  float fres = pow(1.0 - abs(dot(N, V)), 3.0);
  col *= 0.60 + 0.48*wrap;
  col *= mix(0.70, 1.0, smoothstep(0.25, 0.97, vCrease));
  col += spec*0.20 + fres*0.18*uMilk;
  /* night: the stone darkens and cools */
  col = mix(col, col*vec3(0.30, 0.42, 0.39), uNight);
  /* silk sheen: a long highlight that runs down each fold */
  vec3 T = normalize(vTan);
  vec3 Ns = normalize(N - T*dot(N, T)*0.92);
  col += pow(max(dot(Ns, H), 0.0), 20.0)*0.11*uMilk;
  /* light through the stone: where the moon sits behind the cloth, the jade glows */
  float back = pow(max(dot(normalize(uMoon - vWorld), -V), 0.0), 6.0);
  col += uGlow*back*(0.10 + 0.30*cloud + 0.15*(1.0 - m))*(1.0 + 2.4*uNight);
  col += uGlow*cloud*0.05*uNight;                                         // at night the milky clouds hold a little light

  col = mix(col, goldLeaf(N, L, V, uGold, uGoldHi, uBronze, 1.0), vein*0.92);

  /* 碎金 broken gold: a crust of leaf on the torn edges, gathering in some places, almost absent in others,
     cracking into flakes as it reaches into the stone; and flecks spilled along the veins */
  float leaf = 0.0; vec3 leafN = N; float crink = 1.0;
  float patchN = vSlow.x;
  float band = (0.05 + 0.50*smoothstep(-0.25, 0.65, patchN))*uLeaf;
  float dens = pow(1.0 - smoothstep(0.0, band, edge), 0.75);
  float nearVein = (1.0 - smoothstep(0.0, vw*7.0, abs(vn)))*vmask;
  if (dens > 0.02 || nearVein > 0.06) {
    vec2 lp = vLocal*15.0 + 0.45*vec2(snoise(vec3(vLocal*2.6, uSeed)), snoise(vec3(vLocal*2.6, uSeed + 9.0)));
    vec3 c1 = cells(lp);
    float big = step(c1.z, dens*1.12 - 0.06)*smoothstep(0.025, 0.075, c1.y);
    vec3 c2 = cells(lp*2.4 + 7.0);
    float crumb = step(c2.z, max(dens*0.62 - 0.08, nearVein*0.42))*smoothstep(0.03, 0.09, c2.y);
    leaf = max(big, crumb);
    vec3 rnd = fract(vec3(c1.z*13.1, c1.z*71.7, c1.z*37.3) + c2.z*crumb) - 0.5;
    leafN = normalize(N + rnd*1.35);
    crink = 0.82 + 0.32*snoise(vec3(vLocal*55.0, uSeed));
  }
  col = mix(col, goldLeaf(leafN, L, V, uGold, uGoldHi, uBronze, crink), leaf);

  /* double rim: a gold edge and a hairline just inside it, like the two rings of the logo */
  float aa = fwidth(edge);
  float rim = 1.0 - smoothstep(0.024, 0.024 + aa, edge);
  float hair = (1.0 - smoothstep(0.004, 0.004 + aa*1.2, abs(edge - 0.085)))*(1.0 - leaf)*0.8;
  col = mix(col, goldLeaf(N, L, V, uGold, uGoldHi, uBronze, 1.0), max(rim, hair));

  col = applyFog(col, vWorld);
  gl_FragColor = vec4(col, 1.0);
}`;

/* ---------------- Lines: brush-stroke ribbons that live ----------------
   Each strand is a camera-facing ribbon along a curve. Its width swells and tapers like a brush;
   it ripples along its own normal; strands of one bundle fan out and gather like water lines. */
const LINE_VS = /* glsl */`
attribute vec3 aTan; attribute vec3 aNor; attribute vec3 aBin; attribute float aT; attribute float aSide;
uniform float uTime, uWind, uPx, uWidth, uAmp, uFreq, uPhase, uSpread, uNodes, uTaper, uOrbit, uTail;
uniform vec2 uLane; uniform vec3 uCenter;
varying float vT; varying float vSide; varying vec3 vWorld; varying float vNear; varying float vTailG;
${BREEZE}
void main(){
  float t = aT;
  float env = uTaper > 0.5 ? sin(3.14159*t) : 1.0;
  float spread = uSpread*(0.18 + 0.82*pow(abs(sin(3.14159*t*uNodes + uPhase*0.4)), 1.3));
  vec3 p = position + (aNor*uLane.x + aBin*uLane.y)*spread;
  float a = uAmp*(1.0 + 1.8*uWind)*env;
  float sp = 1.0 + 1.5*uWind;
  p += aNor*sin(t*uFreq - uTime*0.55*sp + uPhase)*a + aBin*cos(t*uFreq*0.63 - uTime*0.4*sp + uPhase*1.7)*a*0.7;
  float hv; float st = stir((modelMatrix*vec4(p, 1.0)).xyz, hv);
  p += aNor*st*0.16 + (aNor*sin(t*uFreq*1.8 - uTime*3.2 + uPhase) + aBin*cos(t*uFreq*1.4 - uTime*2.6 + uPhase))*hv*0.22*env;
  vec4 wp = modelMatrix*vec4(p, 1.0);
  vec3 T = normalize(mat3(modelMatrix)*aTan);
  vec3 V = normalize(cameraPosition - wp.xyz);
  vec3 S = normalize(cross(T, V) + 1e-5);
  /* brush profile: taper at both ends, swell and thin along the way */
  float taper = uTaper > 0.5 ? pow(clamp(sin(3.14159*t), 0.0, 1.0), 0.6) : 1.0;
  float swell = 1.0 + 0.6*sin(t*uFreq*1.31 + uPhase*2.0)*sin(t*5.0 + uPhase);
  float w = uWidth*taper*max(0.25, swell);
  if (uOrbit > 0.5) w *= mix(0.45, 1.55, 0.5 + 0.5*dot(normalize(wp.xyz - uCenter), normalize(cameraPosition - uCenter)));
  float tail = uTail >= 0.0 ? smoothstep(0.14, 0.0, fract(uTail - t)) : 0.0;
  w *= 1.0 + 1.6*tail;
  float dist = length(cameraPosition - wp.xyz);
  float px = dist*uPx;                            // world size of one CSS pixel here
  w = clamp(w, px*0.55, px*4.0);                  // hairlines never vanish, near lines never turn into bars
  wp.xyz += S*aSide*w;
  vT = t; vSide = aSide; vWorld = wp.xyz; vTailG = tail;
  vNear = smoothstep(2.5, 6.5, dist);
  gl_Position = projectionMatrix*viewMatrix*wp;
}`;
const LINE_FS = /* glsl */`
uniform float uTime, uFlow, uDraw, uPulse, uAlpha, uPhase, uDry, uNight;
uniform vec3 uColA, uColB, uGoldHi;
varying float vT; varying float vSide; varying vec3 vWorld; varying float vNear; varying float vTailG;
${NOISE}
${FOG}
void main(){
  if (vT > uDraw) discard;
  float aa = 1.0 - smoothstep(0.35, 1.0, abs(vSide));
  float dry = 1.0;
  if (uDry > 0.0) {                                     /* 飞白 dry brush: the stroke breaks into streaks */
    float s = snoise(vec3(vT*28.0, vSide*1.4, uPhase));
    dry = mix(1.0, smoothstep(-0.35, 0.25, s), uDry*smoothstep(0.35, 0.95, vT));
  }
  vec3 col = mix(uColA, uColB, 0.5 + 0.5*sin(vT*5.0 + uPhase));
  float p1 = pow(0.5 + 0.5*sin((vT*2.6 - uTime*0.09 - uFlow*0.16 + uPhase)*6.2831), 26.0);
  float p2 = pow(0.5 + 0.5*sin((vT*6.5 + uTime*0.045 + uPhase*2.0)*6.2831), 44.0);
  col = mix(col, uGoldHi, p1*0.85*uPulse) + vec3(1.0, 0.96, 0.86)*p2*0.3*uPulse;
  col = mix(col, uGoldHi, vTailG*0.9);
  col = mix(col, uGoldHi, 0.2*uNight);
  float head = smoothstep(uDraw - 0.035, uDraw, vT)*step(uDraw, 0.999);
  col = mix(col, vec3(1.0, 0.98, 0.9), head*0.85);
  col = applyFog(col, vWorld);
  float a = aa*dry*uAlpha*vNear*(1.0 + head*0.4)*(1.0 + 0.3*uNight);
  if (a < 0.01) discard;
  gl_FragColor = vec4(col, min(a, 1.0));
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
uniform float uTime, uFlow, uNight; uniform vec3 uLight, uGold;
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
  col *= mix(0.78 + 0.28*wrap, 1.02 + 0.04*wrap, uNight);              // at night the moon is the light
  col += pow(max(dot(N, normalize(L + V)), 0.0), 30.0)*0.12;
  col = mix(col, vec3(0.99, 0.98, 0.95), fres*0.35);
  col = mix(col, col*vec3(0.98, 1.0, 0.98) + vec3(0.015, 0.025, 0.02), uNight);
  gl_FragColor = vec4(mix(applyFog(col, vWorld), col, uNight), 1.0);
}`;

/* ---------------- Moon halo: a soft bloom and a fine ring (月晕) ---------------- */
const BILL_VS = /* glsl */`
uniform vec2 uSize; uniform float uUpright;
varying vec2 vUv; varying vec3 vWorld;
void main(){
  vec3 c = (modelMatrix*vec4(0.0, 0.0, 0.0, 1.0)).xyz;
  vec3 toCam = normalize(cameraPosition - c);
  vec3 up = vec3(0.0, 1.0, 0.0);
  vec3 right = normalize(cross(up, toCam));
  vec3 u2 = uUpright > 0.5 ? up : normalize(cross(toCam, right));
  vec3 wp = c + right*position.x*uSize.x + u2*position.y*uSize.y;
  vUv = uv; vWorld = wp;
  gl_Position = projectionMatrix*viewMatrix*vec4(wp, 1.0);
}`;
const HALO_FS = /* glsl */`
uniform float uR, uSpan, uTime, uAlpha, uNight; uniform vec3 uHalo, uNightHalo, uGoldHi;
varying vec2 vUv; varying vec3 vWorld;
void main(){
  float r = length(vUv - 0.5)*2.0*uSpan;           // world distance from the moon's centre
  float bloom = exp(-pow(max(r - uR, 0.0)/(0.85 + 1.7*uNight), 1.4))*smoothstep(uR*0.96, uR*1.02, r);
  float ring = 1.0 - smoothstep(0.0, 0.035, abs(r - uR*1.34));
  float ring2 = (1.0 - smoothstep(0.0, 0.02, abs(r - uR*1.62)))*(0.5 + 0.5*sin(atan(vUv.y - 0.5, vUv.x - 0.5)*24.0 + uTime*0.2));
  float a = (bloom*(0.30 + 0.30*uNight) + ring*(0.40 + 0.15*uNight) + ring2*0.22)*uAlpha;
  if (a < 0.004) discard;
  gl_FragColor = vec4(mix(mix(uHalo, uNightHalo, uNight), uGoldHi, ring*0.7 + ring2*0.5), a);
}`;

/* ---------------- Mist banks (云) with a broken gold outline ---------------- */
const MIST_FS = /* glsl */`
uniform sampler2D uNoise; uniform float uTime, uFlow, uOpacity, uSeed, uRim, uNight; uniform vec3 uTint, uNightTint, uGold, uGoldHi;
varying vec2 vUv; varying vec3 vWorld;
${FOG}
void main(){
  float drift = uTime*0.004 + uFlow*0.006 + uSeed;
  float prof = texture2D(uNoise, vec2(vUv.x*0.30 + drift, uSeed*0.37)).r;
  float prof2 = texture2D(uNoise, vec2(vUv.x*0.85 - drift*1.7, uSeed*0.61 + 0.5)).g;
  float top = 0.55 + (prof - 0.5)*0.75 + (prof2 - 0.5)*0.16;         // billowing upper contour
  float body = texture2D(uNoise, vUv*vec2(1.5, 2.6) + vec2(drift*1.5, -uTime*0.003)).g;   // stretched: drifting bands, not puffs
  float side = smoothstep(0.0, 0.2, vUv.x)*smoothstep(1.0, 0.8, vUv.x);
  float d = top - vUv.y;
  float a = smoothstep(0.0, 0.22, d)*smoothstep(0.0, 0.3, vUv.y)*side;
  a *= 0.45 + 0.7*smoothstep(0.36, 0.74, body);
  a *= 0.75 + 0.25*sin(vUv.y*26.0 + body*6.0);                       // faint layered strata inside the cloud
  a *= uOpacity*smoothstep(2.0, 6.0, length(vWorld - cameraPosition));
  float aa = fwidth(d);
  float line = (1.0 - smoothstep(aa*0.6, aa*2.0, abs(d - 0.006)))*side*uRim;
  line *= smoothstep(0.42, 0.6, texture2D(uNoise, vec2(vUv.x*3.0 + drift, 0.77)).r);  // the outline breaks
  a *= 1.0 - 0.2*uNight;
  vec3 col = mix(mix(uTint, uNightTint, uNight), mix(uGold, uGoldHi, 0.4 + 0.3*uNight), line);
  float alpha = max(a, line*0.85*smoothstep(2.0, 6.0, length(vWorld - cameraPosition)));
  if (alpha < 0.004) discard;
  gl_FragColor = vec4(applyFog(col, vWorld), alpha);
}`;

/* ---------------- Dark jade disc, its rim crumbling into gold ---------------- */
const DISC_VS = /* glsl */`
varying vec2 vP; varying vec3 vWorld; varying vec3 vN;
void main(){ vP = position.xy; vec4 wp = modelMatrix*vec4(position, 1.0); vWorld = wp.xyz; vN = normalize(mat3(modelMatrix)*vec3(0.0,0.0,1.0)); gl_Position = projectionMatrix*viewMatrix*wp; }`;
const DISC_FS = /* glsl */`
uniform float uTime, uFlow, uR, uNight; uniform vec3 uAbyss, uDeep, uJade, uGold, uGoldHi, uBronze, uLight;
varying vec2 vP; varying vec3 vWorld; varying vec3 vN;
${NOISE}
${FOG}
${LEAF}
void main(){
  float rr = length(vP);
  vec3 N = normalize(vN), V = normalize(cameraPosition - vWorld), L = normalize(uLight);
  if (rr > uR) {                                        // beyond the rim: flakes of gold breaking away
    float ang = atan(vP.y, vP.x);
    float patchy = smoothstep(-0.1, 0.6, snoise(vec3(cos(ang)*2.0, sin(ang)*2.0, 3.0)));
    float dens = (1.0 - smoothstep(0.0, 0.25 + 0.65*patchy, rr - uR))*patchy;
    vec3 c = cells(vP*6.5);
    float leaf = step(c.z, dens*0.85)*smoothstep(0.03, 0.09, c.y);
    if (leaf < 0.5) discard;
    vec3 n = normalize(N + (fract(vec3(c.z*13.1, c.z*71.7, c.z*37.3)) - 0.5)*1.4);
    gl_FragColor = vec4(applyFog(goldLeaf(n, L, V, uGold, uGoldHi, uBronze, 1.0), vWorld), 1.0);
    return;
  }
  vec2 uv = vP/uR*1.6;
  vec2 q = vec2(fbm(vec3(uv, 1.0 + uFlow*0.015)), fbm(vec3(uv + 4.0, 2.0 - uFlow*0.012)));
  float f = fbm(vec3(uv*1.4 + 2.5*q, 3.0));
  vec3 col = mix(uAbyss, uDeep, smoothstep(-0.5, 0.35, f));
  col = mix(col, uJade, smoothstep(0.2, 0.8, f + 0.3*q.y)*0.55);
  float spot = smoothstep(0.55, 0.9, fbm(vec3(uv*3.5 + q*2.0, 9.0))*0.5 + 0.5);
  col = mix(col, uAbyss*0.7, spot*0.5);
  col *= (0.92 + 0.12*smoothstep(1.0, 0.2, rr/uR))*(1.0 + 0.18*uNight);
  /* a few specks of gold suspended in the dark stone, and a crust along the inside of the rim */
  vec3 c = cells(vP*4.2 + 11.0);
  float inner = 1.0 - smoothstep(0.0, 0.5, uR - rr);
  float speck = step(c.z, 0.012 + inner*0.35*smoothstep(-0.2, 0.5, snoise(vec3(vP*0.5, 7.0))))*smoothstep(0.05, 0.12, c.y)*step(c.x, 0.26);
  vec3 n = normalize(N + (fract(vec3(c.z*13.1, c.z*71.7, c.z*37.3)) - 0.5)*1.4);
  col = mix(col, goldLeaf(n, L, V, uGold, uGoldHi, uBronze, 1.0), speck);
  gl_FragColor = vec4(applyFog(col, vWorld), 1.0);
}`;

/* ---------------- Gold leaf in the air: torn flakes that tumble and flash ---------------- */
const FLAKE_VS = /* glsl */`
attribute vec3 aBase; attribute vec4 aRnd;
uniform float uTime, uWind, uFlow, uSwirl; uniform vec3 uBoxMin, uBoxSize, uWakeP;
varying vec2 vUv; varying vec3 vN; varying vec3 vWorld; varying vec4 vRnd;
mat3 rotAxis(vec3 a, float r){ float s=sin(r), c=cos(r), oc=1.0-c;
  return mat3(oc*a.x*a.x+c, oc*a.x*a.y+a.z*s, oc*a.z*a.x-a.y*s,
              oc*a.x*a.y-a.z*s, oc*a.y*a.y+c, oc*a.y*a.z+a.x*s,
              oc*a.z*a.x+a.y*s, oc*a.y*a.z-a.x*s, oc*a.z*a.z+c); }
void main(){
  float t = uTime;
  vec3 p = aBase + vec3(sin(t*0.13 + aRnd.x*30.0)*0.7 + uFlow*0.22*(0.4 + aRnd.y),
                        -t*(0.04 + 0.09*aRnd.z) + sin(t*0.3 + aRnd.w*12.0)*0.2,
                        cos(t*0.11 + aRnd.y*20.0)*0.5);
  p = uBoxMin + mod(p - uBoxMin, uBoxSize);
  /* an eddy round the line of sight through the cursor's wake: near leaves are wound round it, then let go */
  vec3 vd = normalize(uWakeP - cameraPosition);
  vec3 rel = p - cameraPosition; float along = dot(rel, vd);
  vec3 cp = cameraPosition + vd*along; vec3 off = p - cp; float dc = length(off);
  float eddy = exp(-dc*dc/5.5)*smoothstep(2.0, 5.0, along)*uSwirl;
  p = cp + rotAxis(vd, eddy*(1.0 + 1.6*exp(-dc*dc/1.2)))*off*(1.0 + 0.12*eddy);
  vec3 axis = normalize(aRnd.xyz - 0.5 + vec3(0.001));
  float ang = t*(0.35 + 1.3*aRnd.w)*(1.0 + 2.0*uWind) + uFlow*0.6*aRnd.w + aRnd.x*6.28 + eddy*3.0;
  mat3 R = rotAxis(axis, ang);
  vec3 lp = position*vec3(1.0, 0.45 + 0.55*aRnd.y, 1.0);
  float kx = 9.0 + aRnd.z*6.0, ky = 7.0 + aRnd.x*5.0;
  lp.z = (sin(lp.x*kx + aRnd.y*20.0) + cos(lp.y*ky + aRnd.z*10.0))*0.06;          // crumpled foil
  vec3 nl = normalize(vec3(-cos(lp.x*kx + aRnd.y*20.0)*kx*0.06, sin(lp.y*ky + aRnd.z*10.0)*ky*0.06, 1.0));
  float size = 0.04 + 0.10*pow(aRnd.w, 2.6);
  float dist = length(cameraPosition - p);
  size *= smoothstep(2.0, 6.0, dist);
  vec3 wp = p + R*(lp*size);
  vUv = uv; vN = R*nl; vWorld = wp; vRnd = aRnd;
  gl_Position = projectionMatrix*viewMatrix*vec4(wp, 1.0);
}`;
const FLAKE_FS = /* glsl */`
uniform vec3 uGold, uGoldHi, uBronze, uLight;
varying vec2 vUv; varying vec3 vN; varying vec3 vWorld; varying vec4 vRnd;
${FOG}
${LEAF}
void main(){
  vec2 c = vUv - 0.5; float r = length(c)*2.0, a = atan(c.y, c.x);
  float e = 0.74 + 0.13*sin(a*3.0 + vRnd.x*30.0) + 0.08*sin(a*5.0 + vRnd.y*20.0) + 0.06*sin(a*11.0 + vRnd.z*40.0);
  if (r > e) discard;                                    // a torn, irregular shard
  vec3 N = normalize(vN); if (!gl_FrontFacing) N = -N;
  vec3 V = normalize(cameraPosition - vWorld);
  vec3 col = goldLeaf(N, normalize(uLight), V, uGold, uGoldHi, uBronze, 0.9 + 0.2*sin(vUv.x*40.0 + vRnd.x*9.0));
  gl_FragColor = vec4(applyFog(col, vWorld), 1.0);
}`;

/* ---------------- The cursor's own whirl of gold leaf ---------------- */
const WAKE_VS = /* glsl */`
attribute vec4 aRnd;
uniform float uTime, uWake; uniform vec3 uWakeP;
varying vec2 vUv; varying vec3 vN; varying vec3 vWorld; varying vec4 vRnd;
mat3 rotAxis(vec3 a, float r){ float s=sin(r), c=cos(r), oc=1.0-c;
  return mat3(oc*a.x*a.x+c, oc*a.x*a.y+a.z*s, oc*a.z*a.x-a.y*s,
              oc*a.x*a.y-a.z*s, oc*a.y*a.y+c, oc*a.y*a.z+a.x*s,
              oc*a.z*a.x+a.y*s, oc*a.y*a.z-a.x*s, oc*a.z*a.z+c); }
void main(){
  vec3 ax = normalize(uWakeP - cameraPosition);
  vec3 u = normalize(cross(ax, vec3(0.0, 1.0, 0.0))); vec3 v = cross(u, ax);
  float r = 0.12 + 0.75*pow(aRnd.x, 0.9);
  float ang = uTime*(1.7 - 1.1*aRnd.x)*(0.8 + 0.4*aRnd.z) + aRnd.y*6.2831;   // the inner ring turns faster
  float fall = 1.0 - uWake;
  vec3 c = uWakeP + (u*cos(ang) + v*sin(ang))*r*(1.0 + fall*0.9) + ax*(aRnd.z - 0.5)*0.9;
  c.y -= fall*fall*0.7*(0.5 + aRnd.w);                                         // as the breeze dies they drift down
  float show = smoothstep(aRnd.w*0.55, aRnd.w*0.55 + 0.25, uWake);
  float size = (0.026 + 0.055*pow(aRnd.w, 1.5))*show;
  mat3 R = rotAxis(normalize(aRnd.zxy - 0.5 + vec3(0.001)), uTime*(1.2 + 2.0*aRnd.w) + aRnd.x*6.28);
  vec3 lp = position*vec3(1.0, 0.5 + 0.5*aRnd.y, 1.0);
  vUv = uv; vN = R*vec3(0.0, 0.0, 1.0); vWorld = c + R*(lp*size); vRnd = aRnd;
  gl_Position = projectionMatrix*viewMatrix*vec4(vWorld, 1.0);
}`;

/* ---------------- Stars (night only) ---------------- */
const STAR_VS = /* glsl */`
attribute float aSeed; uniform float uTime, uNight, uDpr; varying float vA; varying float vS;
void main(){
  gl_Position = projectionMatrix*modelViewMatrix*vec4(position, 1.0);
  gl_PointSize = (1.1 + 2.4*aSeed*aSeed*aSeed)*uDpr;
  vA = uNight*(0.3 + 0.7*pow(0.5 + 0.5*sin(uTime*(0.5 + aSeed*2.2) + aSeed*80.0), 2.0));
  vS = aSeed;
}`;
const STAR_FS = /* glsl */`
varying float vA; varying float vS;
void main(){
  float d = length(gl_PointCoord - 0.5);
  float a = smoothstep(0.5, 0.05, d)*vA;
  if (a < 0.01) discard;
  gl_FragColor = vec4(mix(vec3(0.88, 0.95, 0.91), vec3(0.95, 0.86, 0.62), step(0.82, vS)), a);
}`;

/* ---------------- Glitter: the finest gold dust ---------------- */
const DUST_VS = /* glsl */`
uniform float uTime, uPx, uWind; attribute float aSeed; varying float vTw;
void main(){
  vec3 p = position;
  p.y += sin(uTime*0.25 + aSeed*20.0)*0.35 + uWind*sin(aSeed*50.0 + uTime)*0.4;
  p.x += cos(uTime*0.18 + aSeed*31.0)*0.35;
  vec4 mv = modelViewMatrix*vec4(p, 1.0);
  gl_Position = projectionMatrix*mv;
  gl_PointSize = uPx*(0.5 + aSeed*1.0)*(12.0/-mv.z);
  vTw = pow(0.5 + 0.5*sin(uTime*(1.0 + aSeed*3.0) + aSeed*40.0), 3.0);
}`;
const DUST_FS = /* glsl */`
uniform vec3 uGold, uGoldHi; uniform float uNight; varying float vTw;
void main(){
  float d = length(gl_PointCoord - 0.5);
  float a = smoothstep(0.5, 0.0, d);
  gl_FragColor = vec4(mix(uGold, uGoldHi, a*vTw), min(1.0, a*(0.3 + 0.7*vTw)*(1.0 + 0.6*uNight)));
}`;

/* ======================================================================== */

const smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

/* Camera stops: one per page section. [eye, target, fov, lens shift]. */
const STOPS = [
  [[-2.0, 0.8, 14.0], [0.0, 1.4, 0.0], 40, 0.00],     // hero — the stage: moon framed by curtains
  [[1.5, 0.4, 8.5], [4.5, 1.2, -6.0], 42, 0.10],      // 01 — slip past the first curtain as it parts
  [[4.5, -0.3, 1.5], [10.0, 0.6, -8.0], 50, 0.22],    // 02 — inside the layers: a corridor of silk
  [[6.0, 5.6, 2.5], [10.5, -2.0, -8.5], 50, 0.18],    // 03 — rise for a high three-quarter view of the hems
  [[2.0, 2.4, 0.0], [7.6, 3.0, -15.5], 38, 0.20],     // 04 — turn toward the moon; the orbits draw
  [[4.0, 2.8, -4.0], [7.6, 3.0, -15.5], 40, 0.22],    // end — near the moon, everything at rest
];

/* A tileable two-channel value-noise texture, made once: cheap soft noise for the mist. */
function noiseTexture(size = 256) {
  const rng = mulberry32(11);
  const channel = () => {
    const out = new Float32Array(size * size); let total = 0;
    for (let o = 0, f = 4, amp = 1; o < 5; o++, f *= 2, amp *= 0.5) {
      const Lt = new Float32Array(f * f); for (let i = 0; i < f * f; i++) Lt[i] = rng();
      for (let y = 0; y < size; y++) {
        const fy = y / size * f, y0 = Math.floor(fy), ty = fy - y0, sy = ty * ty * (3 - 2 * ty), y1 = (y0 + 1) % f;
        for (let x = 0; x < size; x++) {
          const fx = x / size * f, x0 = Math.floor(fx), tx = fx - x0, sx = tx * tx * (3 - 2 * tx), x1 = (x0 + 1) % f;
          const a = Lt[y0 * f + x0], b = Lt[y0 * f + x1], c = Lt[y1 * f + x0], d = Lt[y1 * f + x1];
          const top = a + (b - a) * sx, bot = c + (d - c) * sx;
          out[y * size + x] += amp * (top + (bot - top) * sy);
        }
      }
      total += amp;
    }
    let lo = 1e9, hi = -1e9; for (const v of out) { lo = Math.min(lo, v); hi = Math.max(hi, v); }
    return out.map((v) => (v - lo) / (hi - lo));       // stretch to the full 0–1 range
  };
  const r = channel(), g = channel();
  const data = new Uint8Array(size * size * 4);
  for (let i = 0; i < size * size; i++) { data[i * 4] = r[i] * 255; data[i * 4 + 1] = g[i] * 255; data[i * 4 + 3] = 255; }
  const tex = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.magFilter = THREE.LinearFilter; tex.minFilter = THREE.LinearMipmapLinearFilter; tex.generateMipmaps = true;
  tex.needsUpdate = true;
  return tex;
}

/* A ribbon along a curve: two vertices per sample, each carrying the curve's frame. */
function ribbonGeometry(curve, seg, closed) {
  const fr = curve.computeFrenetFrames(seg, closed), n = seg + 1;
  const P = new Float32Array(n * 6), Tn = new Float32Array(n * 6), Nn = new Float32Array(n * 6), Bn = new Float32Array(n * 6);
  const Ts = new Float32Array(n * 2), Sd = new Float32Array(n * 2), idx = [];
  const v = new THREE.Vector3();
  for (let i = 0; i < n; i++) {
    const u = i / seg; curve.getPointAt(closed ? u % 1 : u, v);
    const k = Math.min(i, fr.tangents.length - 1);
    for (let s = 0; s < 2; s++) {
      const j = i * 2 + s;
      P.set([v.x, v.y, v.z], j * 3);
      Tn.set(fr.tangents[k].toArray(), j * 3); Nn.set(fr.normals[k].toArray(), j * 3); Bn.set(fr.binormals[k].toArray(), j * 3);
      Ts[j] = u; Sd[j] = s ? 1 : -1;
    }
    if (i < seg) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(P, 3));
  g.setAttribute('aTan', new THREE.BufferAttribute(Tn, 3));
  g.setAttribute('aNor', new THREE.BufferAttribute(Nn, 3));
  g.setAttribute('aBin', new THREE.BufferAttribute(Bn, 3));
  g.setAttribute('aT', new THREE.BufferAttribute(Ts, 1));
  g.setAttribute('aSide', new THREE.BufferAttribute(Sd, 1));
  g.setIndex(idx);
  return g;
}

export function mountJadeVeil({ canvas, sections = [], onProgress = () => {}, quality = 1, night = false } = {}) {
  const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const SMALL = matchMedia('(max-width: 700px)').matches;
  THREE.ColorManagement.enabled = false;               // colours below are authored in sRGB
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: 'high-performance' });
  } catch (e) { return null; }
  renderer.outputColorSpace = THREE.LinearSRGBColorSpace;
  const DAY = new THREE.Color(PAL.paper), NIGHT = new THREE.Color(PAL.night), sky = new THREE.Color();
  renderer.setClearColor(night ? NIGHT : DAY, 1);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 220);
  const MOON_C = new THREE.Vector3(7.6, 3.0, -15.5);
  const MOON_R = 3.3;

  const U = {
    uTime: { value: 0 }, uFlow: { value: 0 }, uWind: { value: 0 }, uPx: { value: 0.001 },
    uFog: { value: hex(night ? PAL.night : PAL.paper) }, uFogNear: { value: 12 }, uFogFar: { value: 46 },
    uLight: { value: new THREE.Vector3(-0.45, 0.75, 0.55).normalize() },
    uGold: { value: hex(PAL.gold) }, uGoldHi: { value: hex(PAL.goldHi) }, uBronze: { value: hex(PAL.bronze) },
    uMilk: { value: hex(PAL.milk) }, uGlow: { value: hex(PAL.glow) }, uMoon: { value: MOON_C.clone() },
    uNight: { value: night ? 1 : 0 }, uDpr: { value: 1 },
    /* the breeze: six spreading rings, the cursor's line of sight, how hard it is moving */
    uImpO: { value: Array.from({ length: 6 }, () => new THREE.Vector3()) }, uImpD: { value: Array.from({ length: 6 }, () => new THREE.Vector3(0, 0, -1)) },
    uImpT: { value: new Array(6).fill(99) }, uImpS: { value: new Array(6).fill(0) },
    uCurO: { value: new THREE.Vector3() }, uCurD: { value: new THREE.Vector3(0, 0, -1) }, uHover: { value: 0 },
    uSwirl: { value: 0 }, uWake: { value: 0 }, uWakeP: { value: new THREE.Vector3(0, 0, -50) },
  };
  const BREEZE_U = 'uImpO uImpD uImpT uImpS uCurO uCurD uHover';
  const V3 = (a) => new THREE.Vector3(...a);
  const cr = (pts, closed = false) => new THREE.CatmullRomCurve3(pts.map(V3), closed, 'centripetal');
  const noiseTex = noiseTexture(256);

  /* ---------- backdrop: disc (rim crumbling into gold), halo, moon ---------- */
  const DISC_R = 9.0;
  const disc = new THREE.Mesh(new THREE.CircleGeometry(DISC_R + 1.0, 180), new THREE.ShaderMaterial({
    uniforms: { ...pick(U, 'uTime uFlow uFog uFogNear uFogFar uGold uGoldHi uBronze uLight uNight'), uFogAmt: { value: 0.35 }, uR: { value: DISC_R },
      uAbyss: { value: hex(PAL.abyss) }, uDeep: { value: hex(PAL.deep) }, uJade: { value: hex(PAL.jade) } },
    vertexShader: DISC_VS, fragmentShader: DISC_FS,
  }));
  disc.position.set(8.8, 2.4, -19.5); disc.rotation.y = -0.42;
  scene.add(disc);
  disc.updateMatrixWorld();

  const halo = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.ShaderMaterial({
    uniforms: { ...pick(U, 'uTime uGoldHi uNight'), uSize: { value: new THREE.Vector2(MOON_R * 4.4, MOON_R * 4.4) }, uUpright: { value: 0 },
      uR: { value: MOON_R }, uSpan: { value: MOON_R * 2.2 }, uAlpha: { value: 1 }, uHalo: { value: hex(PAL.halo) }, uNightHalo: { value: hex(PAL.nightHalo) } },
    vertexShader: BILL_VS, fragmentShader: HALO_FS, transparent: true, depthWrite: false,
  }));
  halo.position.copy(MOON_C); halo.frustumCulled = false; halo.renderOrder = -1;
  scene.add(halo);

  const moon = new THREE.Mesh(new THREE.SphereGeometry(MOON_R, 96, 64), new THREE.ShaderMaterial({
    uniforms: { ...pick(U, 'uTime uFlow uLight uGold uFog uFogNear uFogFar uNight'), uFogAmt: { value: 0.25 } },
    vertexShader: MOON_VS, fragmentShader: MOON_FS,
  }));
  moon.position.copy(MOON_C);
  scene.add(moon);

  /* ---------- lines ---------- */
  const lines = [];
  const lineMat = (o) => new THREE.ShaderMaterial({
    uniforms: {
      ...pick(U, 'uTime uFlow uWind uPx uGoldHi uFog uFogNear uFogFar uNight ' + BREEZE_U),
      uFogAmt: { value: o.fog ?? 0.5 }, uDraw: { value: 0 }, uPulse: { value: o.pulse ?? 1 }, uAlpha: { value: o.alpha ?? 1 },
      uWidth: { value: o.width }, uAmp: { value: o.amp ?? 0.12 }, uFreq: { value: o.freq ?? 9 }, uPhase: { value: o.phase ?? 0 },
      uSpread: { value: o.spread ?? 0 }, uNodes: { value: o.nodes ?? 2 }, uLane: { value: new THREE.Vector2(...(o.lane ?? [0, 0])) },
      uTaper: { value: o.taper === false ? 0 : 1 }, uOrbit: { value: o.orbit ? 1 : 0 }, uCenter: { value: MOON_C.clone() },
      uTail: { value: -1 }, uDry: { value: o.dry ?? 0 },
      uColA: { value: hex(o.colA ?? PAL.gold) }, uColB: { value: hex(o.colB ?? '#d9bb78') },
    },
    vertexShader: LINE_VS, fragmentShader: LINE_FS, transparent: true, depthWrite: false, side: THREE.DoubleSide,
  });
  function strand(curve, o) {
    const mesh = new THREE.Mesh(ribbonGeometry(curve, o.seg ?? 520, !!o.closed), lineMat(o));
    mesh.frustumCulled = false; mesh.renderOrder = 2;
    scene.add(mesh);
    const L = { mesh, mat: mesh.material, o };
    lines.push(L);
    return L;
  }
  /* A bundle: one brush stroke and its hairlines, fanning out and gathering like painted water lines. */
  function bundle(points, { n = 6, gap = 0.2, width = 0.05, draw = [0, 1], intro = false, seed = 1, nodes = 2.2, amp = 0.14, freq = 9, dry = 0.0, fog = 0.5 }) {
    const curve = cr(points), rnd = mulberry32(seed * 977);
    for (let i = 0; i < n; i++) {
      const lane = i - (n - 1) / 2, main = i === Math.floor(n / 2);
      strand(curve, {
        width: main ? width : width * (0.14 + 0.32 * rnd()),
        alpha: main ? 1 : 0.5 + 0.45 * rnd(),
        lane: [lane * gap, (rnd() - 0.5) * gap * 1.6], spread: 1, nodes,
        amp: amp * (0.6 + 0.8 * rnd()), freq: freq * (0.75 + 0.5 * rnd()), phase: rnd() * 6.28,
        dry: main ? dry : dry * rnd(), fog, pulse: main ? 1 : 0.6,
        colA: main ? PAL.gold : (rnd() < 0.5 ? '#c9a45e' : '#a7864b'), colB: main ? '#e3c682' : '#ead8a8',
        drawRange: [draw[0] + i * 0.035, draw[1] + i * 0.035], intro, introDelay: i * 0.05,
      });
    }
  }
  // the long sweeping arc of the original artwork — a brush stroke with two hairlines
  bundle([[-9, 9.5, -22], [-2, 10.5, -21], [6, 10.2, -20], [13, 7.5, -19.5], [17, 2, -19], [16.5, -6, -18.5]],
    { n: 3, gap: 0.32, width: 0.11, intro: true, seed: 2, nodes: 1.5, amp: 0.25, freq: 6, dry: 0.5, fog: 0.4 });
  // water lines low across the front of the stage (on arrival), through the corridor, and high over the hems
  bundle([[-7, -3.2, 4.5], [-2, -2.4, 3], [3, -3.3, 1.2], [8, -2.3, -0.6], [13, -3.0, -2.2], [17, -2.2, -3.5]],
    { n: 7, gap: 0.16, width: 0.05, intro: true, seed: 3, nodes: 2.6, amp: 0.16, freq: 10, dry: 0.35 });
  bundle([[2, 1.5, -3], [6, 0.4, -5.5], [10, 1.9, -6.5], [14, 0.8, -7.5], [18, 2.0, -8.5]],
    { n: 6, gap: 0.15, width: 0.045, draw: [0.85, 1.9], seed: 5, nodes: 2.0, amp: 0.15, freq: 11 });
  bundle([[0, 4.0, -3], [4, 3.2, -6], [8, 4.3, -8.5], [12, 3.0, -10], [16, 4.0, -12]],
    { n: 8, gap: 0.14, width: 0.045, draw: [1.85, 2.9], seed: 7, nodes: 3.0, amp: 0.13, freq: 9, dry: 0.3 });

  // the disc's rim: a gold ring and a hairline outside it
  {
    const ring = (R) => { const pts = []; const m = disc.matrixWorld, v = new THREE.Vector3();
      for (let i = 0; i < 180; i++) { const a = i / 180 * Math.PI * 2; v.set(Math.cos(a) * R, Math.sin(a) * R, 0.03).applyMatrix4(m); pts.push(v.toArray()); }
      return cr(pts, true); };
    strand(ring(DISC_R), { width: 0.06, taper: false, closed: true, amp: 0.0, intro: true, fog: 0.35, pulse: 0.7, seg: 540 });
    strand(ring(DISC_R + 0.32), { width: 0.016, taper: false, closed: true, amp: 0.0, intro: true, introDelay: 0.2, fog: 0.35, alpha: 0.75, pulse: 0.4, seg: 540 });
  }
  // orbits round the moon (the logo, in three dimensions): each a gold line with a pale hairline beside it
  const orbits = [];
  function orbit(rx, rz, tiltX, tiltZ, draw) {
    const e = new THREE.Euler(tiltX, 0.35, tiltZ), v = new THREE.Vector3();
    const mk = (s) => { const pts = []; for (let i = 0; i < 200; i++) { const a = i / 200 * Math.PI * 2; v.set(Math.cos(a) * rx * s, 0, Math.sin(a) * rz * s).applyEuler(e).add(MOON_C); pts.push(v.toArray()); } return cr(pts, true); };
    const curve = mk(1);
    const a = strand(curve, { width: 0.05, taper: false, closed: true, orbit: true, amp: 0.02, freq: 14, fog: 0.3, drawRange: draw, seg: 640 });
    strand(mk(1.045), { width: 0.014, taper: false, closed: true, orbit: true, amp: 0.02, freq: 14, fog: 0.3, alpha: 0.7, colA: '#e6cf98', colB: '#f2e3bb', drawRange: [draw[0] + 0.15, draw[1] + 0.15], seg: 640, pulse: 0.3 });
    orbits.push({ curve, line: a });
  }
  orbit(6.4, 2.6, 0.18, -0.46, [3.1, 4.0]);
  orbit(5.5, 2.15, -0.12, -0.38, [3.45, 4.35]);
  const bead = new THREE.Mesh(new THREE.SphereGeometry(0.2, 24, 16), new THREE.ShaderMaterial({
    uniforms: { ...pick(U, 'uLight uGold') },
    vertexShader: MOON_VS, fragmentShader: /* glsl */`uniform vec3 uGold, uLight; varying vec3 vN; varying vec3 vWorld; varying vec3 vObj;
      void main(){ vec3 N=normalize(vN),V=normalize(cameraPosition-vWorld); float w=clamp((dot(N,normalize(uLight))+0.5)/1.5,0.,1.);
      vec3 c=uGold*(0.7+0.5*w)+pow(max(dot(N,normalize(normalize(uLight)+V)),0.),20.)*0.6; gl_FragColor=vec4(c,1.);}`,
  }));
  scene.add(bead);

  /* ---------- curtains ---------- */
  const C = (h) => ({ value: hex(h) });
  const curtains = [];
  function curtain(o) {
    const w = o.w, h = o.h ?? 15;
    const geo = new THREE.PlaneGeometry(w, h, Math.round(w * 30 * quality), Math.round(h * 9 * quality));
    const mat = new THREE.ShaderMaterial({
      uniforms: {
        ...pick(U, 'uTime uFlow uWind uFog uFogNear uFogFar uLight uGold uGoldHi uBronze uMilk uGlow uMoon uNight ' + BREEZE_U),
        uFogAmt: { value: o.fog ?? 0.7 }, uOpen: { value: 0 }, uDrop: { value: RM ? 1 : 0 }, uSide: { value: o.side },
        uW: { value: w }, uH: { value: h }, uSeed: { value: o.seed }, uVeins: { value: o.veins ?? 1 }, uLeaf: { value: o.leaf ?? 1 },
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
  curtain({ x: -3.2, z: -1.0, w: 6.0, rot: 0.18, side: -1, seed: 2.7, pale: '#d8ece1', mid: '#76bca2', deep: '#1f6a57', open: [0.9, 1.85], slide: [-2.0, 0, 0], delay: 0.12, leaf: 0.7 });
  curtain({ x: 10.6, z: -4.0, w: 6.0, rot: -0.30, side: 1, seed: 4.1, pale: '#cde6d8', mid: '#5aa98d', deep: '#145a4a', open: [1.7, 2.6], slide: [2.2, 0, 0], delay: 0.22 });
  curtain({ x: -1.3, z: -7.0, w: 7.0, rot: 0.26, side: -1, seed: 5.9, pale: '#d4eadf', mid: '#62b195', deep: '#125646', open: [2.3, 3.3], slide: [-2.8, 0, 0], delay: 0.3 });
  curtain({ x: 13.8, z: -9.5, w: 7.0, rot: -0.35, side: 1, seed: 7.3, pale: '#c6e0d0', mid: '#46997e', deep: '#0c4b3f', open: [9, 9], slide: [0, 0, 0], delay: 0.38, fog: 0.6 });
  curtain({ x: -8.0, z: -11.0, w: 8.0, rot: 0.45, side: -1, seed: 8.8, pale: '#e2f1e8', mid: '#9ad3bc', deep: '#2b7e66', open: [9, 9], slide: [0, 0, 0], delay: 0.45, fog: 0.6, veins: 0.6, leaf: 0.6 });

  /* ---------- mist banks: clouds round the moon's foot and under the hems ---------- */
  const mists = [];
  function mist(x, y, z, w, h, o = {}) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.ShaderMaterial({
      uniforms: { ...pick(U, 'uTime uFlow uFog uFogNear uFogFar uGold uGoldHi uNight'), uFogAmt: { value: 0.3 }, uNightTint: { value: hex(PAL.nightMist) },
        uNoise: { value: noiseTex }, uSize: { value: new THREE.Vector2(w, h) }, uUpright: { value: 1 },
        uOpacity: { value: o.opacity ?? 0.6 }, uSeed: { value: o.seed ?? 0.1 }, uRim: { value: o.rim ?? 1 }, uTint: { value: hex(o.tint ?? PAL.mist) } },
      vertexShader: BILL_VS, fragmentShader: MIST_FS, transparent: true, depthWrite: false,
    }));
    m.position.set(x, y, z); m.frustumCulled = false; m.renderOrder = 1;
    scene.add(m); mists.push({ m, base: new THREE.Vector3(x, y, z), drift: o.drift ?? 0.4 });
  }
  mist(7.6, -0.6, -12.6, 17, 5.5, { opacity: 0.75, seed: 0.13, tint: '#f6f6ef' });       // clouds at the foot of the moon
  mist(3.5, -4.0, 1.8, 18, 4.6, { opacity: 0.55, seed: 0.41 });
  mist(9.5, -3.9, -6.2, 16, 5.0, { opacity: 0.6, seed: 0.67, tint: '#eef4ee' });
  mist(-1.0, -4.1, -9.2, 15, 4.2, { opacity: 0.55, seed: 0.83, rim: 0.6 });
  mist(12.0, 6.8, -12.5, 12, 3.4, { opacity: 0.35, seed: 0.29, rim: 0.5 });

  /* ---------- gold leaf in the air ---------- */
  const NF = SMALL ? 150 : 340;
  const BOX_MIN = new THREE.Vector3(-7, -4.5, -18), BOX_SIZE = new THREE.Vector3(25, 13, 27);
  {
    const plane = new THREE.PlaneGeometry(1, 1, 4, 4);
    const g = new THREE.InstancedBufferGeometry();
    g.index = plane.index; g.setAttribute('position', plane.attributes.position); g.setAttribute('uv', plane.attributes.uv);
    const base = new Float32Array(NF * 3), rnd4 = new Float32Array(NF * 4), r = mulberry32(1234);
    for (let i = 0; i < NF; i++) {
      base[i * 3] = BOX_MIN.x + r() * BOX_SIZE.x; base[i * 3 + 1] = BOX_MIN.y + r() * BOX_SIZE.y; base[i * 3 + 2] = BOX_MIN.z + r() * BOX_SIZE.z;
      rnd4.set([r(), r(), r(), r()], i * 4);
    }
    g.setAttribute('aBase', new THREE.InstancedBufferAttribute(base, 3));
    g.setAttribute('aRnd', new THREE.InstancedBufferAttribute(rnd4, 4));
    g.instanceCount = NF;
    const flakes = new THREE.Mesh(g, new THREE.ShaderMaterial({
      uniforms: { ...pick(U, 'uTime uWind uFlow uGold uGoldHi uBronze uLight uFog uFogNear uFogFar uSwirl uWakeP'), uFogAmt: { value: 0.45 },
        uBoxMin: { value: BOX_MIN }, uBoxSize: { value: BOX_SIZE } },
      vertexShader: FLAKE_VS, fragmentShader: FLAKE_FS, side: THREE.DoubleSide,
    }));
    flakes.frustumCulled = false;
    scene.add(flakes);
    /* the cursor's own whirl */
    const NW = SMALL ? 0 : 72;
    if (NW) {
      const gw = new THREE.InstancedBufferGeometry();
      gw.index = plane.index; gw.setAttribute('position', plane.attributes.position); gw.setAttribute('uv', plane.attributes.uv);
      const rw = new Float32Array(NW * 4); for (let i = 0; i < NW * 4; i++) rw[i] = r();
      gw.setAttribute('aRnd', new THREE.InstancedBufferAttribute(rw, 4)); gw.instanceCount = NW;
      const wake = new THREE.Mesh(gw, new THREE.ShaderMaterial({
        uniforms: { ...pick(U, 'uTime uGold uGoldHi uBronze uLight uFog uFogNear uFogFar uWake uWakeP'), uFogAmt: { value: 0.2 } },
        vertexShader: WAKE_VS, fragmentShader: FLAKE_FS, side: THREE.DoubleSide,
      }));
      wake.frustumCulled = false;
      scene.add(wake);
    }
  }
  /* ---------- stars (night) ---------- */
  const stars = (() => {
    const n = SMALL ? 180 : 360, pos = new Float32Array(n * 3), sd = new Float32Array(n), r = mulberry32(77);
    for (let i = 0; i < n; i++) { pos.set([-60 + r() * 130, -15 + r() * 60, -75 + r() * 20], i * 3); sd[i] = r(); }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('aSeed', new THREE.BufferAttribute(sd, 1));
    const m = new THREE.Points(g, new THREE.ShaderMaterial({ uniforms: pick(U, 'uTime uNight uDpr'), vertexShader: STAR_VS, fragmentShader: STAR_FS, transparent: true, depthWrite: false }));
    m.frustumCulled = false; scene.add(m); return m;
  })();
  /* ---------- glitter ---------- */
  const N = SMALL ? 70 : 150;
  const dpos = new Float32Array(N * 3), dseed = new Float32Array(N);
  for (let i = 0; i < N; i++) {
    dpos[i * 3] = -6 + Math.random() * 22; dpos[i * 3 + 1] = -4 + Math.random() * 11; dpos[i * 3 + 2] = -16 + Math.random() * 24;
    dseed[i] = Math.random();
  }
  const dgeo = new THREE.BufferGeometry();
  dgeo.setAttribute('position', new THREE.BufferAttribute(dpos, 3));
  dgeo.setAttribute('aSeed', new THREE.BufferAttribute(dseed, 1));
  const dust = new THREE.Points(dgeo, new THREE.ShaderMaterial({
    uniforms: { ...pick(U, 'uTime uWind uGold uGoldHi uNight'), uPx: { value: 3 } },
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
    camera.updateProjectionMatrix();
    dust.material.uniforms.uPx.value = 3 * dpr; U.uDpr.value = dpr;
    measure();
  }
  addEventListener('resize', fit, { passive: true });
  new ResizeObserver(measure).observe(document.body);
  fit();

  /* ---------- pointer parallax ---------- */
  const ptr = { x: 0, y: 0, sx: 0, sy: 0, px: 0, py: 0, lx: 0, ly: 0, on: false, fresh: true };
  addEventListener('pointermove', (e) => {
    ptr.x = e.clientX / innerWidth * 2 - 1; ptr.y = e.clientY / innerHeight * 2 - 1;
    ptr.px = e.clientX; ptr.py = e.clientY;
    if (!ptr.on) { ptr.on = true; ptr.fresh = true; }
  }, { passive: true });
  document.documentElement.addEventListener('pointerleave', () => { ptr.on = false; });

  /* ---------- breeze state ---------- */
  const ndc = new THREE.Vector3(), rayO = new THREE.Vector3(), rayD = new THREE.Vector3(), wakeTgt = new THREE.Vector3();
  let imp = 0, travel = 0, hover = 0, swirl = 0, wake = 0, wakeBoost = 0, nightTarget = night ? 1 : 0;
  function rayAt(cx, cy, O, D) {
    ndc.set(cx / vw * 2 - 1, -(cy / vh * 2 - 1), 0.5).unproject(camera);
    O.copy(camera.position); D.copy(ndc).sub(O).normalize();
  }
  function addImpulse(O, D, s) {
    U.uImpO.value[imp].copy(O); U.uImpD.value[imp].copy(D); U.uImpT.value[imp] = 0; U.uImpS.value[imp] = s;
    imp = (imp + 1) % 6;
  }

  /* ---------- loop ---------- */
  let cur = scrollToU(scrollY), prevCur = cur, vel = 0, wind = 0, intro = RM ? 1 : 0, last = performance.now(), visible = true, raf = 0;
  let frozen = null, introHeld = false, fixedDt = 0; // debug hooks
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
    const idle = Math.abs(vel) < 0.002 && wind < 0.02 && intro >= 1 && hover < 0.01 && U.uWake.value < 0.01 && swirl < 0.02
      && Math.abs(nightTarget - U.uNight.value) < 0.001 && !U.uImpS.value.some((x, i) => x > 0 && U.uImpT.value[i] < 3);
    if (idle && !fixedDt && now - last < 30) return;        // at rest the veins still flow, at half the frame rate
    let dt = fixedDt || Math.min(0.05, (now - last) / 1000); last = now;

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
    /* day ↔ night */
    const nv = U.uNight.value, nn = RM ? nightTarget : nv + (nightTarget - nv) * (1 - Math.exp(-dt * 2.0));
    if (Math.abs(nn - nv) > 1e-5 || nn !== nightTarget && Math.abs(nn - nightTarget) < 0.002) {
      U.uNight.value = Math.abs(nn - nightTarget) < 0.002 ? nightTarget : nn;
      sky.copy(DAY).lerp(NIGHT, U.uNight.value); renderer.setClearColor(sky, 1); U.uFog.value.set(sky.r, sky.g, sky.b);
    }
    stars.visible = U.uNight.value > 0.01;
    if (!introHeld) intro = Math.min(1, intro + dt / 2.6);
    const ei = 1 - Math.pow(1 - intro, 3);

    for (const c of curtains) {
      const o = c.o, mu = c.mat.uniforms;
      mu.uDrop.value = RM ? 1 : smooth(o.delay, o.delay + 0.55, ei);
      const op = smooth(o.open[0], o.open[1], cur);
      mu.uOpen.value = op;
      c.mesh.position.set(c.base.x + o.slide[0] * op, c.base.y + o.slide[1] * op, c.base.z + o.slide[2] * op);
    }
    for (const l of lines) {
      const o = l.o;
      const d = o.intro ? smooth(0.12 + (o.introDelay ?? 0), 1, ei) : o.drawRange ? smooth(o.drawRange[0], o.drawRange[1], cur) : 1;
      l.mat.uniforms.uDraw.value = d >= 0.999 ? 1.001 : d;
    }
    for (const m of mists) m.m.position.x = m.base.x + Math.sin(U.uTime.value * 0.05 + m.base.z) * m.drift;
    moon.rotation.y = U.uTime.value * 0.03 + cur * 0.35;
    const bt = ((U.uTime.value * 0.02 + cur * 0.18) % 1 + 1) % 1;
    orbits[0].curve.getPointAt(bt, bead.position);
    const showBead = smooth(3.1, 4.0, cur);
    bead.visible = showBead > 0.98;
    orbits[0].line.mat.uniforms.uTail.value = bead.visible ? bt : -1;

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
    if (!RM && intro < 1) { const lift = (1 - ei) * 2.2; eye.y += lift; tgt.y += lift * 0.6; }
    camera.position.copy(eye); camera.fov = fov; camera.lookAt(tgt);
    camera.updateProjectionMatrix(); camera.updateMatrixWorld();

    /* the breeze */
    for (let i = 0; i < 6; i++) { U.uImpT.value[i] += dt; if (U.uImpT.value[i] > 4) U.uImpS.value[i] = 0; }
    if (!RM) {
      if (ptr.fresh) { ptr.lx = ptr.px; ptr.ly = ptr.py; ptr.fresh = false; }
      const moved = Math.hypot(ptr.px - ptr.lx, ptr.py - ptr.ly); ptr.lx = ptr.px; ptr.ly = ptr.py;
      const stirT = ptr.on ? Math.min(1, moved / Math.max(dt, 1e-3) / 1100) : 0;
      if (ptr.on) { rayAt(ptr.px, ptr.py, rayO, rayD); U.uCurO.value.copy(rayO); U.uCurD.value.copy(rayD); }
      hover += (stirT - hover) * (1 - Math.exp(-dt * (stirT > hover ? 7 : 1.6)));
      travel += moved;
      if (travel > 70 && stirT > 0.08) { travel = 0; addImpulse(rayO, rayD, 0.55 + 0.8 * stirT); }
      swirl = Math.min(3.2, swirl + stirT * dt * 5) * Math.exp(-dt * 0.75);
      const reading = portrait ? 1 : smooth(0.36, 0.5, ptr.px / vw);          // stay quiet over the reading column
      const wT = stirT > 0.06 ? reading : 0;
      wake += (wT - wake) * (1 - Math.exp(-dt * (wT > wake ? 4 : 0.8)));
      wakeBoost *= Math.exp(-dt * 0.7);
      if (ptr.on && wakeBoost < 0.3) { wakeTgt.copy(rayO).addScaledVector(rayD, 7); U.uWakeP.value.lerp(wakeTgt, 1 - Math.exp(-dt * 3.5)); }
      U.uHover.value = hover; U.uSwirl.value = Math.max(swirl, wakeBoost * 2.4); U.uWake.value = Math.max(wake, wakeBoost);
    }
    U.uPx.value = 2 * Math.tan(fov * Math.PI / 360) / vh;

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
    setFixedDt(v) { fixedDt = v; },                    // for tests: advance the simulation by a fixed step per frame
    /* day ↔ night, eased over a second or so (instant with reduced motion) */
    setNight(on, instant = false) {
      nightTarget = on ? 1 : 0;
      if (instant) { U.uNight.value = nightTarget; sky.copy(DAY).lerp(NIGHT, nightTarget); renderer.setClearColor(sky, 1); U.uFog.value.set(sky.r, sky.g, sky.b); }
    },
    /* a press at a point on the screen: rings run through silk and lines, gold leaf whirls round it */
    pulse(cx, cy, s = 1.6) {
      if (RM) return;
      rayAt(cx, cy, rayO, rayD); addImpulse(rayO, rayD, s);
      U.uWakeP.value.copy(rayO).addScaledVector(rayD, 7); wakeBoost = 1;
    },
    destroy() { cancelAnimationFrame(raf); renderer.dispose(); },
  };
}

function pick(U, names) { const o = {}; for (const n of names.split(' ')) o[n] = U[n]; return o; }
