/** Rebuild editable jade artwork and the small browser assets. Node 22+.
 * npm install --prefix <tools-directory> sharp @resvg/resvg-js
 * node tools/build_home_art.mjs <tools-directory>/node_modules
 * The ordinary site build does not need these art-authoring dependencies.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(path.resolve(process.argv[2] || 'node_modules', '_art.cjs'));
const sharp = require('sharp');
const {Resvg} = require('@resvg/resvg-js');
const source = path.join(root, 'design/homepage/source');
const output = path.join(root, 'assets/art');
await fs.mkdir(output, {recursive: true});
const names = ['jade-deep', 'jade-front', 'pearl'];
for (const name of names) {
  await sharp(path.join(source, name + '.png')).resize({width: name === 'pearl' ? 880 : 1600, withoutEnlargement: true})
    .webp({quality: name === 'pearl' ? 74 : 77, effort: 6}).toFile(path.join(output, name + '.webp'));
}

const desktop = {
  width: 1672, height: 872,
  deep: 'M837 742 C813 515 969 204 1237 62 C1330 12 1390 -8 1450 -23 L1720 -23 L1720 920 L837 920 Z',
  front: 'M478 903 C533 873 564 851 600 834 L625 816 L648 805 L677 800 L692 793 L715 792 L735 779 L753 777 L777 758 L798 745 L815 723 L830 717 L838 689 L850 681 L855 666 L879 656 L890 641 L908 635 L923 620 L949 615 L966 598 L980 582 L1000 579 L1018 564 L1040 560 L1058 549 L1081 545 L1093 532 L1115 538 L1137 523 L1156 506 L1173 501 L1185 484 L1203 490 L1221 476 L1243 456 L1258 454 L1273 427 L1297 419 L1316 404 L1334 398 L1344 372 L1365 359 L1381 344 L1402 346 L1419 338 L1438 319 L1453 301 L1472 281 L1491 275 L1500 265 L1517 244 L1528 225 L1540 218 L1543 199 L1564 181 L1581 179 L1591 165 L1610 156 L1617 138 L1643 128 L1657 128 L1694 106 L1720 920 L460 920 Z',
  orbit: 'M760 294 C1020 47 1391 -128 1694 197',
  moon: [1268, 417, 230],
  deepBox: [788, -35, 950, 950], frontBox: [460, 72, 1260, 1260],
  seams: ['M922 903 L954 860 L970 819 L1000 804 L1025 764 L1042 757 L1070 717 L1090 700 L1124 656 L1141 649 L1170 609 L1202 585 L1220 556 L1258 538 L1289 496 L1322 480 L1353 447 L1380 434 L1415 390 L1443 369 L1479 335 L1510 318 L1540 285 L1571 270 L1600 229 L1644 211 L1699 164', 'M1274 905 L1271 864 L1300 827 L1308 798 L1345 775 L1367 741 L1400 728 L1423 695 L1460 675 L1477 645 L1508 623 L1522 592 L1560 568 L1581 528 L1608 510 L1631 469 L1668 442 L1712 407'],
  flecks: 'M823 711l8-11 4 6-6 8z M832 691l6-10 5 3-4 12z M844 672l5-8 7 4-8 6z M811 727l7-4 1 6-6 5z M852 657l7-7 2 7-6 5z M805 742l5-4 4 5-8 3z'
};
const mobile = {
  width: 780, height: 560,
  deep: 'M130 583 C136 258 338 21 592 -38 L820 -38 L820 590 Z',
  front: 'M-25 575 L29 529 L65 513 L88 483 L113 477 L139 456 L160 460 L187 438 L210 432 L223 406 L251 398 L266 384 L294 383 L314 365 L341 362 L365 345 L393 344 L420 325 L443 330 L470 315 L496 300 L514 280 L533 276 L547 250 L571 237 L585 212 L611 209 L631 189 L652 181 L668 153 L692 142 L701 117 L723 109 L745 84 L772 73 L820 33 L820 590 L-25 590 Z',
  orbit: 'M-14 230 C247 6 620 -46 806 173',
  moon: [478, 245, 177],
  deepBox: [100, -40, 760, 760], frontBox: [-30, 20, 900, 900],
  seams: ['M185 590 L212 553 L250 535 L270 500 L303 486 L320 451 L355 434 L385 400 L410 395 L442 365 L476 344 L502 315 L539 295 L568 258 L599 246 L625 218 L653 203 L680 170 L714 154 L742 123 L791 109', 'M485 590 L500 557 L528 541 L543 514 L574 500 L593 469 L619 455 L641 426 L680 407 L703 373 L739 361 L757 333 L810 305'],
  flecks: 'M220 405l6-9 5 4-6 7z M210 419l7-6 2 6-8 5z M232 393l5-8 5 3-7 7z'
};
// Round the small mineral breaks while retaining their irregular contour.
function softenPolyline(d, closed=false) {
  const values=d.match(/-?\d+(?:\.\d+)?/g).map(Number);
  const points=[];
  for(let i=0;i<values.length;i+=2) points.push([values[i],values[i+1]]);
  let result='M'+points[0].join(' ');
  for(let i=1;i<points.length-1;i++) {
    const p=points[i], next=points[i+1];
    result+=` Q${p[0]} ${p[1]} ${(p[0]+next[0])/2} ${(p[1]+next[1])/2}`;
  }
  return result+' L'+points.at(-1).join(' ')+(closed?' Z':'');
}
for(const comp of [desktop,mobile]) {
  comp.front=softenPolyline(comp.front,true);
  comp.seams=comp.seams.map(d=>softenPolyline(d));
}
function svg(comp, inline = false, tablet = false) {
  const prefix = (inline ? 'hero' : 'jade') + (tablet ? '-tablet' : '');
  const width=tablet?1024:comp.width, height=tablet?440:comp.height;
  const viewBox=tablet?'-220 25 1024 440':`0 0 ${width} ${height}`;
  const [cx, cy, r] = comp.moon;
  const edge = id => `<use href="#${prefix}-${id}" fill="none" stroke="#886537" stroke-width="2.5" vector-effect="non-scaling-stroke"/><use href="#${prefix}-${id}" fill="none" stroke="#D6B674" stroke-width="1.2" vector-effect="non-scaling-stroke"/>`;
  const texture = (name, box, clip) => `<image ${inline ? 'data-src="/assets/art/' + name + '.webp"' : 'href="source/' + name + '.png"'} x="${box[0]}" y="${box[1]}" width="${box[2]}" height="${box[3]}" preserveAspectRatio="xMidYMid slice" clip-path="url(#${prefix}-${clip}-clip)"/>`;
  const layer = (id, name, content) => `<g id="${prefix}-${id}-layer" inkscape:groupmode="layer" inkscape:label="${name}">${content}</g>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" xmlns:inkscape="http://www.inkscape.org/namespaces/inkscape" viewBox="${viewBox}" width="${width}" height="${height}"${inline ? ` class="home-hero__svg home-hero__svg--${tablet?'tablet':'desktop'}" aria-hidden="true" focusable="false" preserveAspectRatio="xMidYMid slice"` : ''}>
  <title>Jade and pearl — ${tablet?'tablet':comp === desktop ? 'desktop' : 'mobile'} composition</title>
  <defs>
    <path id="${prefix}-deep" d="${comp.deep}"/>
    <path id="${prefix}-front" d="${comp.front}"/>
    <circle id="${prefix}-moon" cx="${cx}" cy="${cy}" r="${r}"/>
    <path id="${prefix}-orbit" d="${comp.orbit}"/>
    <clipPath id="${prefix}-deep-clip"><use href="#${prefix}-deep"/></clipPath>
    <clipPath id="${prefix}-front-clip"><use href="#${prefix}-front"/></clipPath>
    <clipPath id="${prefix}-moon-clip"><use href="#${prefix}-moon"/></clipPath>
  </defs>
  ${inline ? '' : layer('paper', '01 · Warm paper', `<rect x="${tablet?-220:0}" y="${tablet?25:0}" width="${width}" height="${height}" fill="#FAF8F2"/>`)}
  ${layer('deep', '02 · Deep jade / shared clipping boundary', `<use href="#${prefix}-deep" fill="#12584E"/>${texture('jade-deep', comp.deepBox, 'deep')}${edge('deep')}`)}
  ${layer('orbit', '03 · Geometric gold orbit', edge('orbit'))}
  ${layer('moon', '04 · Pearl moon', `<use href="#${prefix}-moon" fill="#F1EDDF"/>${texture('pearl', [cx-r, cy-r, r*2, r*2], 'moon')}<use href="#${prefix}-moon" fill="none" stroke="#F5E4B4" stroke-width="1.2" vector-effect="non-scaling-stroke"/>`)}
  ${layer('front', '05 · Foreground jade / shared clipping boundary', `<use href="#${prefix}-front" fill="#B9D7C2"/>${texture('jade-front', comp.frontBox, 'front')}${edge('front')}`)}
  ${layer('mineral-seams', '06 · Fine mineral seams', `<g clip-path="url(#${prefix}-front-clip)">${comp.seams.map(d=>`<path d="${d}" fill="none" stroke="#886537" stroke-width="1.5" vector-effect="non-scaling-stroke"/><path d="${d}" fill="none" stroke="#D6B674" stroke-width=".8" vector-effect="non-scaling-stroke"/>`).join('')}</g>`)}
  ${layer('flecks', '07 · Local gold flecks', `<path d="${comp.flecks}" fill="#D6B674" stroke="#886537" stroke-width=".4"/>`)}
</svg>`.replace(/[ \t]+$/gm, '');
}
// Independent mobile layout keeps the full moon and seam in a short art panel.
for (const [name, comp] of [['desktop', desktop], ['mobile', mobile]]) {
  await fs.writeFile(path.join(root, 'design/homepage', name + '-master.svg'), svg(comp));
}
await fs.writeFile(path.join(root,'design/homepage/tablet-master.svg'),svg(mobile,false,true));
let mobileSource = svg(mobile);
for (const name of names) {
  const bytes = await fs.readFile(path.join(source, name + '.png'));
  mobileSource = mobileSource.replace(`href="source/${name}.png"`, `href="data:image/png;base64,${bytes.toString('base64')}"`);
}
const png = new Resvg(mobileSource).render().asPng();
await sharp(png).webp({quality: 82, effort: 6}).toFile(path.join(output, 'hero-mobile.webp'));
// One canonical set of paths: the authoring file and actual page cannot drift.
const homeFile = path.join(root, 'index.html');
const home = await fs.readFile(homeFile, 'utf8');
if (!home.includes('<!-- HOME_ART_START -->')) throw new Error('Homepage art markers are missing.');
await fs.writeFile(homeFile, home.replace(/<!-- HOME_ART_START -->[\s\S]*?<!-- HOME_ART_END -->/, `<!-- HOME_ART_START -->\n${svg(desktop, true)}\n${svg(mobile,true,true)}\n          <!-- HOME_ART_END -->`));
for (const name of [...names, 'hero-mobile']) {
  console.log(`${name}.webp: ${(await fs.stat(path.join(output, name + '.webp'))).size} bytes`);
}
