// Technológiai folyamatábrák (panorámasor): minden lépés egy oszlop, az oszlopok égboltja, horizontja és talajrétegei
// összefüggnek, így a sor egyetlen jelenetként olvasható. A könyvtár a Mélyalapozások appból jön (ott: cölöpök, résfal),
// itt munkatéri elemekkel bővült; a lépések a BME Építőmérnöki Kar munkatérhatárolási videóinak ábrái alapján készültek.
// Két nézet: keresztmetszet (gödör, horgony, dúc) és homlokzat a munkatér felől (falszerkezetek készítése).
// Használat: <div class="pr-strip" data-proc="horgony"></div>
import { svg as el, h, EN } from './core.js';

/* ================================================================== alapok */
const v = (n) => `var(--pr-${n})`;
const F = (n, op) => `fill:${v(n)}` + (op != null ? `;fill-opacity:${op}` : '');
const SK = (n, w = 1, extra = '') => `fill:none;stroke:${v(n)};stroke-width:${w}` + (extra ? ';' + extra : '');
const g_ = (p, a = {}) => el('g', a, p);
const R = (p, x, y, w, hh, st, a = {}) => el('rect', { x, y, width: Math.max(0, w), height: Math.max(0, hh), style: st, ...a }, p);
const P = (p, d, st, a = {}) => el('path', { d, style: st, ...a }, p);
const C = (p, cx, cy, r, st, a = {}) => el('circle', { cx, cy, r, style: st, ...a }, p);
const E = (p, cx, cy, rx, ry, st, a = {}) => el('ellipse', { cx, cy, rx, ry, style: st, ...a }, p);
const Ln = (p, x1, y1, x2, y2, st, a = {}) => el('line', { x1, y1, x2, y2, style: st, ...a }, p);
const CUR = { W: 9999 };
const hash = (k) => { const s = Math.sin(k * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };

/* ================================================================== közös definíciók (egyszer) */
function defs() {
  if (document.getElementById('pr-defs')) return;
  const s = el('svg', { id: 'pr-defs', width: 0, height: 0, style: 'position:absolute;width:0;height:0;overflow:hidden', 'aria-hidden': 'true', focusable: 'false' });
  const d = el('defs', {}, s);
  const lg = (id, stops, a = {}) => { const g = el('linearGradient', { id, ...a }, d); stops.forEach(([o, c, op]) => el('stop', { offset: o, style: `stop-color:${c}` + (op != null ? `;stop-opacity:${op}` : '') }, g)); };
  lg('pr-sky', [[0, v('sky1')], [1, v('sky2')]], { x1: 0, y1: 0, x2: 0, y2: 1 });
  lg('pr-cyl', [[0, v('steel3')], [0.3, v('steel1')], [0.62, v('steel2')], [1, v('steel3')]], { x1: 0, y1: 0, x2: 1, y2: 0 });
  lg('pr-cylh', [[0, v('steel1')], [0.45, v('steel2')], [1, v('steel3')]], { x1: 0, y1: 0, x2: 0, y2: 1 });
  lg('pr-mcyl', [[0, v('mach3')], [0.35, v('mach')], [0.7, v('mach2')], [1, v('mach3')]], { x1: 0, y1: 0, x2: 1, y2: 0 });
  lg('pr-glass', [[0, v('glass1')], [1, v('glass2')]], { x1: 0, y1: 0, x2: 1, y2: 1 });
  lg('pr-drum', [[0, v('drum1')], [0.55, v('drum2')], [1, v('drum3')]], { x1: 0, y1: 0, x2: 0, y2: 1 });
  lg('pr-deep', [[0, '#000', 0], [1, '#000', 0.16]], { x1: 0, y1: 0, x2: 0, y2: 1 });
  lg('pr-wet', [[0, v('water'), 0.0], [0.08, v('water'), 0.13], [1, v('water'), 0.2]], { x1: 0, y1: 0, x2: 0, y2: 1 });
  lg('pr-concg', [[0, v('conc1')], [0.5, v('conc2')], [1, v('conc1')]], { x1: 0, y1: 0, x2: 1, y2: 0 });
  lg('pr-freshg', [[0, v('fresh1')], [0.5, v('fresh2')], [1, v('fresh1')]], { x1: 0, y1: 0, x2: 1, y2: 0 });
  lg('pr-slurryg', [[0, v('slurry1')], [1, v('slurry2')]], { x1: 0, y1: 0, x2: 0, y2: 1 });
  lg('pr-groutg', [[0, v('grout2')], [0.5, v('grout1')], [1, v('grout2')]], { x1: 0, y1: 0, x2: 1, y2: 0 });
  lg('pr-cylw', [[0, v('drum3')], [0.3, v('drum1')], [0.7, v('drum2')], [1, v('drum3')]], { x1: 0, y1: 0, x2: 1, y2: 0 });
  lg('pr-pile', [[0, v('conc2')], [0.4, v('conc1')], [1, v('fresh2')]], { x1: 0, y1: 0, x2: 1, y2: 0 });
  lg('pr-mixg', [[0, v('mix1')], [0.5, v('mix3')], [1, v('mix1')]], { x1: 0, y1: 0, x2: 1, y2: 0 });
  // munkatér: gödör, szádpalló, jéghenger, lőttbeton, fapalló
  lg('pr-pitg', [[0, v('sky2')], [1, v('pitb')]], { x1: 0, y1: 0, x2: 0, y2: 1 });
  lg('pr-sheetg', [[0, v('sheet2')], [0.16, v('sheet3')], [0.5, v('sheet')], [0.62, v('sheet2')], [0.84, v('sheet3')], [1, v('sheet2')]], { x1: 0, y1: 0, x2: 1, y2: 0 });
  lg('pr-iceg', [[0, v('ice2'), 0.75], [0.5, v('ice1'), 0.92], [1, v('ice2'), 0.75]], { x1: 0, y1: 0, x2: 1, y2: 0 });
  lg('pr-riverg', [[0, v('water'), 0.5], [1, v('water'), 0.72]], { x1: 0, y1: 0, x2: 0, y2: 1 });
  lg('pr-shotg', [[0, v('conc2')], [1, v('conc1')]], { x1: 0, y1: 0, x2: 1, y2: 0 });
  const pat = (id, w, hh, draw, a = {}) => { const p = el('pattern', { id, width: w, height: hh, patternUnits: 'userSpaceOnUse', ...a }, d); draw(p); };
  // talajminták
  pat('pr-p-sand', 11, 11, (p) => { [[1.5, 2, 0.75], [6.5, 1.2, 0.6], [9.5, 6, 0.7], [3.5, 7.5, 0.65], [7, 9.6, 0.55], [1, 9.8, 0.45]].forEach(([x, y, r]) => C(p, x, y, r, F('dot'))); });
  pat('pr-p-clay', 16, 9, (p) => { P(p, 'M1 2.5h6 M10 2.5h4 M4 7h7', SK('dot', 0.9, 'stroke-linecap:round')); });
  pat('pr-p-silt', 13, 10, (p) => { P(p, 'M1 2.5h4 M8 7.5h4', SK('dot', 0.8, 'stroke-linecap:round')); C(p, 9, 2.6, 0.55, F('dot')); C(p, 3, 7.6, 0.55, F('dot')); });
  pat('pr-p-gravel', 22, 18, (p) => {
    [[4, 4, 2.8, 2.1], [13, 3, 2.2, 1.7], [18, 10, 2.6, 2], [7, 12, 3.2, 2.3], [14, 15.5, 1.8, 1.4], [1, 15, 1.6, 1.2]].forEach(([x, y, rx, ry], i) => E(p, x, y, rx, ry, F('pebble') + `;stroke:${v('dot')};stroke-width:.7`, { transform: `rotate(${i * 37} ${x} ${y})` }));
    C(p, 10, 8, 0.6, F('dot')); C(p, 20, 4, 0.6, F('dot'));
  });
  pat('pr-p-fill', 20, 16, (p) => { E(p, 5, 5, 2.4, 1.6, F('pebble') + `;stroke:${v('dot')};stroke-width:.6`); P(p, 'M11 4h5 M2 12h5', SK('dot', 0.8, 'stroke-linecap:round')); C(p, 15, 12, 0.7, F('dot')); C(p, 9, 14, 0.5, F('dot')); });
  pat('pr-p-peat', 18, 10, (p) => { P(p, 'M0 7 q4.5 -5 9 0 t9 0', SK('dot', 0.9)); P(p, 'M4 2.5h3 M12 3h3', SK('dot', 0.8, 'stroke-linecap:round')); });
  pat('pr-p-rock', 26, 18, (p) => { P(p, 'M0 6h26 M0 15h26 M8 6v9 M19 0v6 M16 15v3', SK('dot', 0.8)); });
  // anyagok
  pat('pr-p-conc', 12, 12, (p) => {
    [[2, 2.5, 1.1, 'agg1'], [7.5, 1.6, 0.8, 'agg2'], [10, 7, 1.2, 'agg2'], [4.4, 8, 0.9, 'agg1'], [8, 10.6, 0.6, 'agg1'], [1.2, 10.8, 0.7, 'agg2']].forEach(([x, y, r, c]) => C(p, x, y, r, F(c)));
  });
  pat('pr-p-slurry', 9, 9, (p) => { C(p, 2, 2, 0.55, F('slurryd')); C(p, 6.5, 6, 0.5, F('slurryd')); });
  pat('pr-p-stone', 16, 14, (p) => {
    [[4, 4, 3.4, 2.7], [11.5, 3.5, 3, 2.4], [8, 10, 3.6, 2.6], [1, 11, 2.2, 2.1], [15, 10.5, 2, 2.2]].forEach(([x, y, rx, ry], i) => E(p, x, y, rx, ry, F('stone') + `;stroke:${v('stone2')};stroke-width:.8`, { transform: `rotate(${i * 50} ${x} ${y})` }));
  });
  pat('pr-p-mix', 18, 14, (p) => { E(p, 5, 4, 3.6, 1.8, F('mix2')); E(p, 13, 10, 3, 1.5, F('mix2')); C(p, 12, 3, 0.7, F('dot')); C(p, 3, 11, 0.6, F('dot')); });
  pat('pr-p-grass', 8, 6, (p) => { P(p, 'M1 6 l1 -4 M4 6 l-0.6 -5 M6.5 6 l1 -3.4', SK('grass2', 0.9, 'stroke-linecap:round')); });
  pat('pr-p-wood', 22, 7, (p) => { P(p, 'M0 2.2 q6 -1 11 0 t11 0 M3 5 q5 0.8 10 0 t9 0', SK('timber2', 0.6, 'opacity:.7')); });
  pat('pr-p-ice', 10, 10, (p) => { P(p, 'M2 3 l2 1.2 M7 7 l1.6 -1.4 M6 2 l0.6 1.6', SK('halo', 0.7, 'opacity:.8')); });
  pat('pr-p-shoe', 5, 4, (p) => { Ln(p, 0.5, 0, 0.5, 4, SK('dark2', 1.6)); });
  (document.body || document.documentElement).prepend(s);
}

/* ================================================================== háttér: ég, horizont, talaj */
const SOIL = {
  sand: ['sand', 'pr-p-sand'], sand2: ['sand2', 'pr-p-sand'], clay: ['clay', 'pr-p-clay'], clay2: ['clay2', 'pr-p-clay'], silt: ['silt', 'pr-p-silt'],
  gravel: ['gravel', 'pr-p-gravel'], fill: ['fill', 'pr-p-fill'], peat: ['peat', 'pr-p-peat'], rock: ['rock', 'pr-p-rock'], hard: ['hard', 'pr-p-clay'],
};
// réteghatár: globális x szerint hullámzik, így az oszlopok között folytonos
const waveY = (y0, x, i) => y0 + 2.6 * Math.sin(x / 47 + i * 1.7) + 1.6 * Math.sin(x / 17 + i * 0.9);

function backdrop(g, M, ox, w) {
  const b = g_(g, { transform: `translate(${-ox} 0)` });
  const x0 = ox - 2, x1 = ox + w + 2, GY = M.hz ?? M.GY;   // M.hz: a horizont (vízfelszín), ha a terep folyómeder
  R(b, x0, 0, x1 - x0, GY + 1, 'fill:url(#pr-sky)');
  // felhők
  for (let k = Math.floor(x0 / 230) - 1; k <= Math.ceil(x1 / 230); k++) {
    const cx = k * 230 + 60 + hash(k) * 90, cy = 26 + hash(k + 9) * 34, s = 0.7 + hash(k + 3) * 0.6;
    if (hash(k + 5) < 0.3) continue;
    const c = g_(b, { style: F('cloud', 0.85) });
    E(c, cx, cy, 22 * s, 7 * s, ''); E(c, cx - 12 * s, cy + 2 * s, 12 * s, 5.5 * s, ''); E(c, cx + 10 * s, cy - 4 * s, 12 * s, 8 * s, '');
  }
  // távoli dombok
  let d = `M${x0} ${GY}`;
  for (let x = x0; x <= x1; x += 6) d += ` L${x} ${(GY - 16 - 9 * Math.sin(x / 83) - 5 * Math.sin(x / 31 + 1)).toFixed(1)}`;
  P(b, d + ` L${x1} ${GY}Z`, F('hill'));
  // távoli épületek (városszél)
  for (let k = Math.floor(x0 / 38) - 1; k <= Math.ceil(x1 / 38); k++) {
    if (hash(k * 3.1) < 0.55) continue;
    const bx = k * 38 + hash(k) * 10, bw = 18 + hash(k + 1) * 16, bh = 16 + hash(k + 2) * 40;
    R(b, bx, GY - bh, bw, bh, F('city'));
    for (let wy = GY - bh + 5; wy < GY - 8; wy += 7) for (let wx = bx + 3.5; wx < bx + bw - 4; wx += 6) R(b, wx, wy, 2.4, 3, F('cityw'));
  }
  // fák
  for (let k = Math.floor(x0 / 57) - 1; k <= Math.ceil(x1 / 57); k++) {
    if (hash(k * 7.7) < 0.45) continue;
    const tx = k * 57 + hash(k + 4) * 30, th = 10 + hash(k + 6) * 9;
    R(b, tx - 0.8, GY - 5, 1.6, 5, F('trunk'));
    E(b, tx, GY - 5 - th * 0.55, th * 0.42, th * 0.6, F('tree'));
  }
  // talajrétegek
  { const GY = M.GY;
  const L = M.layers;
  L.forEach((l, i) => {
    const top = i === 0 ? GY : l.y, bot = i + 1 < L.length ? L[i + 1].y : M.H + 4, nxt = i + 1 < L.length;
    let pd = '';
    if (i === 0) pd = `M${x0} ${GY}H${x1}`;
    else { pd = `M${x0} ${waveY(top, x0, i).toFixed(1)}`; for (let x = x0 + 5; x <= x1 + 5; x += 5) pd += ` L${x} ${waveY(top, x, i).toFixed(1)}`; }
    let pb = '';
    if (nxt) { for (let x = x1 + 5; x >= x0 - 5; x -= 5) pb += ` L${x} ${waveY(bot, x, i + 1).toFixed(1)}`; } else pb = ` L${x1} ${M.H + 4} L${x0} ${M.H + 4}`;
    const [col, pat] = SOIL[l.k];
    P(b, pd + pb + 'Z', F(col));
    P(b, pd + pb + 'Z', `fill:url(#${pat})`);
    if (i > 0) P(b, pd, SK('layer', 1, 'stroke-dasharray:6 4'));
  });
  R(b, x0, GY, x1 - x0, M.H - GY + 4, 'fill:url(#pr-deep)');
  // talajvíz
  if (M.gw) {
    R(b, x0, M.gw, x1 - x0, M.H - M.gw + 4, 'fill:url(#pr-wet)');
    Ln(b, x0, M.gw, x1, M.gw, SK('water', 1.3, 'stroke-dasharray:7 5'));
  }
  // humusz, fű – folyómedernél víz a mederfenék fölött
  if (M.hz != null) {
    R(b, x0, M.hz, x1 - x0, GY - M.hz, 'fill:url(#pr-riverg)');
    for (let k = Math.floor(x0 / 26); k <= Math.ceil(x1 / 26); k++) P(b, `M${k * 26} ${M.hz + 7 + (k % 3) * 9} q5 -2.4 10 0`, SK('halo', 0.9, 'opacity:.55'));
    Ln(b, x0, M.hz, x1, M.hz, SK('water', 1.4));
    R(b, x0, GY - 1, x1 - x0, 3, F('top'));
    Ln(b, x0, GY, x1, GY, SK('ground', 1.2));
  } else {
    R(b, x0, GY - 1.2, x1 - x0, 4.5, F('top'));
    R(b, x0, GY - 4.5, x1 - x0, 4, 'fill:url(#pr-p-grass)');
    Ln(b, x0, GY, x1, GY, SK('ground', 1.4));
  }
  }
}

/* ================================================================== feliratok, nyilak */
function tag(g, x, y, text, o = {}) {
  // felirat lekerekített hátlapon; o.to = [px, py]: vezetővonal a pontig
  const fs = o.fs ?? 10.5, wch = fs * 0.56, tw = text.length * wch + 10, th = fs + 7;
  const anchor = o.anchor ?? 'start';
  let bx = anchor === 'end' ? x - tw : anchor === 'middle' ? x - tw / 2 : x;
  bx = Math.max(3, Math.min(CUR.W - tw - 3, bx));
  const gg = g_(g, { class: 'pr-tag' });
  if (o.to) {
    const [px, py] = o.to, lx = px < bx ? bx : px > bx + tw ? bx + tw : bx + tw / 2;
    Ln(gg, lx, y, px, py, SK('labline', 1));
    C(gg, px, py, 2.1, F('labline'));
  }
  R(gg, bx, y - th / 2, tw, th, F('labbg') + `;stroke:${v('labedge')};stroke-width:.7`, { rx: th / 2 });
  el('text', { x: bx + tw / 2, y: y + fs * 0.36, 'text-anchor': 'middle', class: 'pr-tx', style: `font-size:${fs}px`, text }, gg);
  return gg;
}
function arrowP(g, d, o = {}) {
  // vastag nyíl íves útvonallal, világos glóriával
  const w = o.w ?? 3.2;
  P(g, d, SK('halo', w + 3.2, 'stroke-linecap:round;stroke-linejoin:round;opacity:.85'));
  P(g, d, SK(o.c ?? 'acc', w, 'stroke-linecap:round;stroke-linejoin:round'));
}
function head(g, x, y, ang, o = {}) {
  const s = o.s ?? 9, c = o.c ?? 'acc', a = (ang * Math.PI) / 180;
  const p = (dx, dy) => `${(x + dx * Math.cos(a) - dy * Math.sin(a)).toFixed(1)} ${(y + dx * Math.sin(a) + dy * Math.cos(a)).toFixed(1)}`;
  const d = `M${p(0, 0)} L${p(-s, -s * 0.62)} L${p(-s * 0.72, 0)} L${p(-s, s * 0.62)}Z`;
  P(g, d, F('halo') + `;stroke:${v('halo')};stroke-width:3;stroke-linejoin:round;opacity:.85`);
  P(g, d, F(c));
}
const arrowV = (g, x, y1, y2, o = {}) => { arrowP(g, `M${x} ${y1} L${x} ${y2 + (y2 > y1 ? -6 : 6)}`, o); head(g, x, y2, y2 > y1 ? 90 : -90, o); };
const arrowH = (g, x1, x2, y, o = {}) => { arrowP(g, `M${x1} ${y} L${x2 + (x2 > x1 ? -5 : 5)} ${y}`, o); head(g, x2, y, x2 > x1 ? 0 : 180, o); };
function spin(g, cx, y, r, o = {}) {
  // forgásirány: elliptikus ív a szár körül, nyílheggyel
  const ry = r * 0.3;
  arrowP(g, `M${cx - r} ${y} A${r} ${ry} 0 0 0 ${cx + r * 0.82} ${y + ry * 0.58}`, { w: 2.6, ...o });
  head(g, cx + r * 0.9, y + ry * 0.45, -18, { s: 8, ...o });
}
function pushOut(g, cx, y, half, n = 1, o = {}) {
  // oldalirányú talajkiszorítás (piros nyilak)
  for (let i = 0; i < n; i++) {
    const yy = y + i * 9;
    arrowH(g, cx - half - 2, cx - half - 15, yy, { w: 2, s: 6, c: 'push', ...o });
    arrowH(g, cx + half + 2, cx + half + 15, yy, { w: 2, s: 6, c: 'push', ...o });
  }
}
function badge(g, n) {
  C(g, 15, 15, 10.5, `fill:var(--grp);stroke:${v('halo')};stroke-width:2`);
  el('text', { x: 15, y: 19.6, 'text-anchor': 'middle', class: 'pr-num', text: String(n) }, g);
}

/* ================================================================== ember */
function worker(g, x, o = {}) {
  // láthatósági mellényes munkás, oldalnézetben; o.pose: 'stand' | 'guide' (karja előre, a teher felé) | 'signal'
  const GY = o.GY, s = o.s ?? 1, dir = o.dir ?? -1, pose = o.pose ?? 'stand';
  const w = g_(g, { transform: `translate(${x} ${GY}) scale(${dir * -s} ${s})` });
  // lábak
  P(w, 'M-2.2 -13 L-3.4 0 M2 -13 L3.6 0', SK('trous', 3.4, 'stroke-linecap:round'));
  P(w, 'M-5.6 0 h4.4 M2 0 h4.6', SK('boot', 2.2, 'stroke-linecap:round'));
  Ln(w, -3, -5.5, -2.6, -3.8, SK('refl', 3.6));
  Ln(w, 3.2, -5.5, 3.4, -3.8, SK('refl', 3.6));
  // törzs (mellény)
  P(w, 'M-4.6 -24.5 Q-5.2 -18 -4 -12.4 L4.4 -12.4 Q5.4 -18 4.6 -24.5 Q0 -26.6 -4.6 -24.5Z', F('vest'));
  Ln(w, -4.8, -17.5, 5, -17.5, SK('refl', 1.5));
  Ln(w, -4.6, -14.6, 4.8, -14.6, SK('refl', 1.5));
  // karok
  if (pose === 'guide') P(w, 'M-3.4 -23 L-9.5 -18.2 L-14.5 -20.6', SK('vest', 2.6, 'stroke-linecap:round;stroke-linejoin:round'));
  else if (pose === 'signal') P(w, 'M-3.4 -23.4 L-8.6 -29.5 L-10.4 -35.5', SK('vest', 2.6, 'stroke-linecap:round;stroke-linejoin:round'));
  else P(w, 'M-3.6 -23 L-5.6 -16 L-5 -11.8', SK('vest', 2.6, 'stroke-linecap:round;stroke-linejoin:round'));
  P(w, 'M3.4 -23 L5.6 -16.4 L5.2 -12', SK('vest', 2.6, 'stroke-linecap:round;stroke-linejoin:round'));
  if (pose === 'guide') C(w, -14.8, -20.8, 1.4, F('skin'));
  else if (pose === 'signal') C(w, -10.6, -36, 1.4, F('skin'));
  // fej, sisak
  C(w, 0, -29.2, 3.3, F('skin'));
  P(w, 'M-3.9 -29.6 Q-3.8 -34.4 0.2 -34.6 Q4 -34.4 4 -29.6Z', F('helmet') + `;stroke:${v('helmet2')};stroke-width:.6`);
  Ln(w, -5.2, -29.6, 4.1, -29.6, SK('helmet', 1.4, 'stroke-linecap:round'));
  return w;
}

/* ================================================================== gépek */
/**
 * Lánctalpas fúró-/cölöpözőgép oldalnézetben. A szerszám tengelye x-en, a gép tőle jobbra.
 * o.top: az árboc teteje; o.headY: a forgatófej felső éle (null: nincs fej); o.lattice: rácsos árboc (Franki);
 * o.hoses: hidraulikatömlő-hurok a fejtől az árbocig. Visszaadja a fontos pontokat.
 */
function rig(g, M, x, o = {}) {
  const GY = M.GY, top = o.top ?? 22, mx = x + 15, hy = GY - 19;
  const r = g_(g, { class: 'pr-rig' });
  // árboc-hátsó merevítés és kinematika a gépház mögött
  const stayY = top + (GY - top) * (o.lattice ? 0.22 : 0.4);
  // lánctalp
  const tx0 = x + 26, tl = 94;
  R(r, tx0, GY - 15, tl, 15, F('dark'), { rx: 7.5 });
  R(r, tx0 + 1.5, GY - 15, tl - 3, 2.6, 'fill:url(#pr-p-shoe)');
  R(r, tx0 + 1.5, GY - 2.6, tl - 3, 2.6, 'fill:url(#pr-p-shoe)');
  R(r, tx0 + 4, GY - 11.5, tl - 8, 8, F('dark2'), { rx: 4 });
  for (let i = 0; i < 6; i++) C(r, tx0 + 15 + (i * (tl - 30)) / 5, GY - 6.4, 2.6, F('dark'));
  [tx0 + 8, tx0 + tl - 8].forEach((cx) => { C(r, cx, GY - 7.5, 5.6, F('steel3')); C(r, cx, GY - 7.5, 2.2, F('dark')); });
  R(r, tx0 + 30, GY - 19, 36, 4.5, F('dark'));
  // gépház
  const hx = x + 30, hw = 96;
  P(r, `M${hx} ${hy} V${hy - 22} Q${hx} ${hy - 27} ${hx + 5} ${hy - 27} H${hx + hw - 16} V${hy}Z`, F('mach') + `;stroke:${v('mach3')};stroke-width:.8`);
  R(r, hx, hy - 6, hw - 16, 6, F('mach2'));
  for (let i = 0; i < 7; i++) Ln(r, hx + 44 + i * 4, hy - 21, hx + 44 + i * 4, hy - 10, SK('mach3', 1.1));
  // ellensúly
  P(r, `M${hx + hw - 18} ${hy + 0.5} V${hy - 31} H${hx + hw - 6} Q${hx + hw + 1} ${hy - 31} ${hx + hw + 1} ${hy - 24} V${hy - 5} Q${hx + hw + 1} ${hy + 0.5} ${hx + hw - 6} ${hy + 0.5}Z`, F('mach2') + `;stroke:${v('mach3')};stroke-width:.8`);
  for (let i = 0; i < 4; i++) P(r, `M${hx + hw - 16 + i * 4.4} ${hy - 1} l3 -4.4`, SK('dark', 1.8));
  // korlát
  Ln(r, hx + 36, hy - 34, hx + hw - 20, hy - 34, SK('dark2', 1));
  for (let px = hx + 36; px <= hx + hw - 20; px += 10) Ln(r, px, hy - 34, px, hy - 27, SK('dark2', 0.9));
  // fülke + kezelő
  const cx0 = hx + 3;
  P(r, `M${cx0} ${hy - 26} V${hy - 50} Q${cx0} ${hy - 53} ${cx0 + 3} ${hy - 53} H${cx0 + 22} L${cx0 + 26} ${hy - 26}Z`, F('mach') + `;stroke:${v('mach3')};stroke-width:.8`);
  P(r, `M${cx0 + 3} ${hy - 30} V${hy - 49} H${cx0 + 20.5} L${cx0 + 23.5} ${hy - 30}Z`, 'fill:url(#pr-glass)' + `;stroke:${v('dark')};stroke-width:1`);
  C(r, cx0 + 11, hy - 40.5, 3.1, F('opr'));
  P(r, `M${cx0 + 5.5} ${hy - 30.5} Q${cx0 + 6.5} ${hy - 37} ${cx0 + 11} ${hy - 36.6} Q${cx0 + 15.5} ${hy - 37} ${cx0 + 16.5} ${hy - 30.5}Z`, F('opr'));
  Ln(r, cx0 + 3, hy - 41, cx0 + 21.5, hy - 41, SK('dark', 0.5, 'opacity:.4'));
  // árboc
  const mtop = top, mbot = GY - 7;
  if (o.lattice) {
    R(r, mx - 6, mtop, 2.6, mbot - mtop, F('mach2'));
    R(r, mx + 3.4, mtop, 2.6, mbot - mtop, F('mach2'));
    let zd = `M${mx - 4.7} ${mtop + 2}`;
    for (let y = mtop + 2, s = 1; y < mbot - 6; y += 7, s = -s) zd += ` L${s > 0 ? mx + 4.7 : mx - 4.7} ${y + 7}`;
    P(r, zd, SK('mach3', 1));
  } else {
    R(r, mx - 6, mtop, 12, mbot - mtop, F('mach') + `;stroke:${v('mach3')};stroke-width:.8`);
    R(r, mx - 6, mtop, 3, mbot - mtop, F('mach3'));
    R(r, mx + 2.5, mtop, 1.2, mbot - mtop, F('mach2'));
    for (let y = mtop + 40; y < mbot - 10; y += 42) { Ln(r, mx - 6, y, mx + 6, y, SK('mach3', 1.2)); C(r, mx + 4.2, y - 2.2, 0.8, F('dark')); C(r, mx + 4.2, y + 2.2, 0.8, F('dark')); }
  }
  R(r, mx - 9, GY - 7, 18, 7, F('dark2'), { rx: 1.5 });
  // árbocláb–gép kapcsolat: paralelogramma-karok
  Ln(r, hx + 6, hy - 14, mx + 5, hy - 40, SK('mach2', 6.5, 'stroke-linecap:round'));
  Ln(r, hx + 14, hy - 3, mx + 5, hy - 20, SK('mach2', 5.5, 'stroke-linecap:round'));
  // hátsó kitámasztó hengerek
  const sx = hx + 40, sy = hy - 27;
  const kx = sx + (mx + 6 - sx) * 0.55, ky = sy + (stayY - sy) * 0.55;
  Ln(r, sx, sy, kx, ky, SK('dark', 4.6, 'stroke-linecap:round'));
  Ln(r, kx, ky, mx + 6, stayY, SK('steel1', 2.4, 'stroke-linecap:round'));
  C(r, sx, sy, 2.4, F('dark2'));
  // árboccsúcs, kötélkorongok
  R(r, mx - 14, mtop - 9, 25, 10, F('mach2') + `;stroke:${v('mach3')};stroke-width:.8`, { rx: 2 });
  C(r, x, mtop - 3, 4.2, F('dark')); C(r, x, mtop - 3, 1.5, F('steel1'));
  C(r, mx + 5, mtop - 3, 3.4, F('dark'));
  // forgatófej
  const out = { mx, top: mtop };
  if (o.headY != null) {
    const yH = o.headY;
    Ln(r, x, mtop + 1, x, yH - 6, SK('rope', 1));
    R(r, x - 3, yH - 7, 6, 7, F('dark2'));
    R(r, x + 15, yH + 3, mx - 6 - (x + 15), 17, F('mach2'));
    R(r, x - 17, yH, 34, 24, F('mach') + `;stroke:${v('mach3')};stroke-width:.9`, { rx: 3 });
    R(r, x - 17, yH + 16, 34, 8, F('mach2'), { rx: 2 });
    R(r, x - 13, yH - 6, 8, 6, F('dark2'), { rx: 1 });
    R(r, x + 5, yH - 6, 8, 6, F('dark2'), { rx: 1 });
    Ln(r, x - 14, yH + 6, x + 14, yH + 6, SK('mach3', 1));
    if (o.hoses !== false) {
      const hy2 = Math.min(GY - 30, yH + 46);
      P(r, `M${x + 12} ${yH + 2} C${x + 30} ${yH + 2} ${mx + 4} ${hy2 + 26} ${mx + 7} ${hy2}`, SK('dark', 2.2));
      P(r, `M${x + 12} ${yH + 7} C${x + 27} ${yH + 8} ${mx} ${hy2 + 32} ${mx + 7} ${hy2 + 5}`, SK('dark2', 1.6));
    }
    out.headY = yH; out.headBot = yH + 24;
  }
  return out;
}

/** Lánctalpas daru rácsos gémmel; a horog x-en, a daru tőle jobbra. hookY: a horog magassága. */
function crane(g, M, x, hookY, o = {}) {
  const GY = M.GY, r = g_(g, { class: 'pr-crane' });
  const bx = x + (o.reach ?? 70);
  const tx0 = bx - 30, tl = 84;
  R(r, tx0, GY - 13, tl, 13, F('dark'), { rx: 6.5 });
  R(r, tx0 + 1.5, GY - 13, tl - 3, 2.4, 'fill:url(#pr-p-shoe)');
  R(r, tx0 + 3.5, GY - 10, tl - 7, 7, F('dark2'), { rx: 3.5 });
  for (let i = 0; i < 6; i++) C(r, tx0 + 9 + (i * (tl - 18)) / 5, GY - 6.3, 2.5, F('dark'));
  R(r, tx0 + 24, GY - 17, 34, 4.5, F('dark'));
  const hy = GY - 17;
  P(r, `M${tx0 + 2} ${hy} V${hy - 20} Q${tx0 + 2} ${hy - 25} ${tx0 + 7} ${hy - 25} H${tx0 + 78} V${hy}Z`, F('crane') + `;stroke:${v('crane3')};stroke-width:.8`);
  R(r, tx0 + 66, hy - 30, 18, 30, F('crane2'), { rx: 4 });
  for (let i = 0; i < 6; i++) Ln(r, tx0 + 38 + i * 4, hy - 19, tx0 + 38 + i * 4, hy - 8, SK('crane3', 1));
  P(r, `M${tx0 + 4} ${hy - 25} V${hy - 46} H${tx0 + 22} L${tx0 + 26} ${hy - 25}Z`, F('crane') + `;stroke:${v('crane3')};stroke-width:.8`);
  P(r, `M${tx0 + 6.5} ${hy - 29} V${hy - 43} H${tx0 + 20} L${tx0 + 23} ${hy - 29}Z`, 'fill:url(#pr-glass)' + `;stroke:${v('dark')};stroke-width:1`);
  C(r, tx0 + 13, hy - 36, 2.8, F('opr'));
  P(r, `M${tx0 + 8.5} ${hy - 29.4} Q${tx0 + 9.5} ${hy - 33.5} ${tx0 + 13} ${hy - 33.3} Q${tx0 + 16.5} ${hy - 33.5} ${tx0 + 17.5} ${hy - 29.4}Z`, F('opr'));
  // gém
  const fx = tx0 + 20, fy = hy - 14, tipX = x, tipY = o.tipY ?? 22;
  const len = Math.hypot(tipX - fx, tipY - fy), ux = (tipX - fx) / len, uy = (tipY - fy) / len, nx = -uy * 4.2, ny = ux * 4.2;
  Ln(r, fx + nx, fy + ny, tipX + nx * 0.4, tipY + ny * 0.4, SK('crane2', 1.8));
  Ln(r, fx - nx, fy - ny, tipX - nx * 0.4, tipY - ny * 0.4, SK('crane2', 1.8));
  let zd = `M${fx} ${fy}`;
  for (let t = 0, s = 1; t < len - 6; t += 8, s = -s) { const k = 1 - (t / len) * 0.6; zd += ` L${(fx + ux * (t + 8) + s * nx * k).toFixed(1)} ${(fy + uy * (t + 8) + s * ny * k).toFixed(1)}`; }
  P(r, zd, SK('crane3', 0.8));
  C(r, tipX, tipY, 3.2, F('dark'));
  // gémkötél a gép hátuljáról
  Ln(r, tx0 + 72, hy - 30, tipX + 2, tipY, SK('rope', 0.9));
  // horogkötél, horog
  Ln(r, tipX, tipY + 3, x, hookY - 7, SK('rope', 1));
  R(r, x - 4, hookY - 9, 8, 7, F('crane2'), { rx: 1.5 });
  P(r, `M${x} ${hookY - 2} v3 q0 3.4 -3 3.4`, SK('dark', 1.6));
  return { hook: [x, hookY + 3] };
}

/** Mixer gépkocsi; x: a hátsó vége, dir: 1 = jobbra néz (fülke jobbra) */
function mixer(g, M, x, dir = 1) {
  const GY = M.GY, t = g_(g, { class: 'pr-truck', transform: dir === 1 ? '' : `translate(${2 * x + 112} 0) scale(-1 1)` });
  R(t, x + 2, GY - 23, 106, 6, F('dark'));
  // dob
  const dg = g_(t, { transform: `rotate(-13 ${x + 46} ${GY - 44})` });
  E(dg, x + 46, GY - 44, 41, 17.5, 'fill:url(#pr-drum)' + `;stroke:${v('drum3')};stroke-width:.8`);
  for (let i = -2; i <= 2; i++) P(dg, `M${x + 46 + i * 15 - 6} ${GY - 60} q8 16 0 32`, SK('acc2', 2.6, 'opacity:.85'));
  E(dg, x + 8, GY - 44, 4, 10, F('drum3'));
  // dobtartó, garat, csúszda
  P(t, `M${x + 74} ${GY - 23} L${x + 80} ${GY - 52} L${x + 86} ${GY - 23}`, SK('dark2', 2.2));
  P(t, `M${x + 8} ${GY - 23} L${x + 11} ${GY - 38}`, SK('dark2', 2.2));
  P(t, `M${x + 1} ${GY - 56} l6 -7 h8 l-4 9z`, F('steel2'));
  P(t, `M${x + 3} ${GY - 33} l-10 9`, SK('steel3', 3, 'stroke-linecap:round'));
  // fülke
  P(t, `M${x + 88} ${GY - 21} V${GY - 50} Q${x + 88} ${GY - 54} ${x + 92} ${GY - 54} H${x + 103} Q${x + 112} ${GY - 52} ${x + 113} ${GY - 40} V${GY - 21}Z`, F('truck') + `;stroke:${v('truck2')};stroke-width:.8`);
  P(t, `M${x + 92} ${GY - 38} V${GY - 50} H${x + 103} Q${x + 109.5} ${GY - 49} ${x + 110} ${GY - 38}Z`, 'fill:url(#pr-glass)' + `;stroke:${v('dark')};stroke-width:.9`);
  C(t, x + 99, GY - 43, 2.6, F('opr'));
  R(t, x + 108, GY - 27, 6, 3, F('lamp'), { rx: 1 });
  // kerekek
  [x + 18, x + 34, x + 96].forEach((cx) => { C(t, cx, GY - 8, 8, F('dark')); C(t, cx, GY - 8, 4.2, F('steel2')); C(t, cx, GY - 8, 1.6, F('dark2')); });
  P(t, `M${x + 8} ${GY - 17} q18 -9 36 0 M${x + 86} ${GY - 17} q10 -8 20 0`, SK('dark2', 2));
  return t;
}

/** Utánfutós betonpumpa garattal; az x a pumpa bal széle. Visszaadja a nyomócső kezdőpontját. */
function pump(g, M, x) {
  const GY = M.GY, p = g_(g, { class: 'pr-pump' });
  R(p, x + 2, GY - 15, 46, 4, F('dark'));
  R(p, x + 6, GY - 37, 38, 22, F('pump') + `;stroke:${v('pump3')};stroke-width:.8`, { rx: 3 });
  for (let i = 0; i < 5; i++) Ln(p, x + 24 + i * 3.6, GY - 33, x + 24 + i * 3.6, GY - 21, SK('pump3', 1));
  P(p, `M${x - 4} ${GY - 44} H${x + 16} L${x + 12} ${GY - 33} H${x}Z`, F('steel2') + `;stroke:${v('steel3')};stroke-width:.8`);
  R(p, x + 44, GY - 24, 10, 3, F('dark2'));
  C(p, x + 25, GY - 8, 7, F('dark')); C(p, x + 25, GY - 8, 3.4, F('steel2'));
  R(p, x + 38, GY - 41, 6, 5, F('steel3'));
  return [x + 41, GY - 41];
}

/** Kotrógép (kanál nélküli karvéggel); x: a karvég (horog) helye, a gép jobbra. */
function excavator(g, M, x, tipY, o = {}) {
  const GY = M.GY, e = g_(g, { class: 'pr-exc' });
  const bx = x + (o.reach ?? 64), tx0 = bx - 8, tl = 70;
  R(e, tx0, GY - 13, tl, 13, F('dark'), { rx: 6.5 });
  R(e, tx0 + 1.5, GY - 13, tl - 3, 2.4, 'fill:url(#pr-p-shoe)');
  R(e, tx0 + 3.5, GY - 10, tl - 7, 7, F('dark2'), { rx: 3.5 });
  for (let i = 0; i < 5; i++) C(e, tx0 + 9 + (i * (tl - 18)) / 4, GY - 6.3, 2.4, F('dark'));
  R(e, tx0 + 18, GY - 17, 30, 4.5, F('dark'));
  const hy = GY - 17;
  P(e, `M${tx0 + 8} ${hy} V${hy - 18} H${tx0 + 70} Q${tx0 + 76} ${hy - 18} ${tx0 + 76} ${hy - 10} V${hy}Z`, F('exc') + `;stroke:${v('exc3')};stroke-width:.8`);
  R(e, tx0 + 62, hy - 22, 15, 22, F('exc2'), { rx: 4 });
  P(e, `M${tx0 + 8} ${hy - 18} V${hy - 40} H${tx0 + 24} L${tx0 + 28} ${hy - 18}Z`, F('exc') + `;stroke:${v('exc3')};stroke-width:.8`);
  P(e, `M${tx0 + 10.5} ${hy - 21} V${hy - 37.5} H${tx0 + 22.4} L${tx0 + 25.4} ${hy - 21}Z`, 'fill:url(#pr-glass)' + `;stroke:${v('dark')};stroke-width:1`);
  C(e, tx0 + 16.4, hy - 30, 2.7, F('opr'));
  P(e, `M${tx0 + 12} ${hy - 21.4} Q${tx0 + 13} ${hy - 27.3} ${tx0 + 16.4} ${hy - 27} Q${tx0 + 19.8} ${hy - 27.3} ${tx0 + 20.8} ${hy - 21.4}Z`, F('opr'));
  // gém (két egyenes szakasz), gémhenger, karhenger, kanál; a terhet a kanál horgán lógó lánc tartja
  const b0x = tx0 + 36, b0y = hy - 12;
  const kx = x + 26, ky = tipY - (o.lift ?? 34);                       // könyök (gém–kar csukló)
  const mx2 = b0x - (b0x - kx) * 0.3, my2 = ky - 10;                    // a gém törése
  P(e, `M${b0x} ${b0y} L${mx2} ${my2} L${kx} ${ky}`, SK('exc2', 8, 'stroke-linecap:round;stroke-linejoin:round'));
  P(e, `M${b0x} ${b0y} L${mx2} ${my2} L${kx} ${ky}`, SK('exc', 4.5, 'stroke-linecap:round;stroke-linejoin:round'));
  Ln(e, b0x + 6, b0y + 6, (b0x + mx2) / 2 + 5, (b0y + my2) / 2 + 4, SK('dark', 3, 'stroke-linecap:round'));
  Ln(e, (b0x + mx2) / 2 + 5, (b0y + my2) / 2 + 4, mx2 + 3, my2 + 12, SK('steel1', 1.6, 'stroke-linecap:round'));
  const sx2 = x + 4, sy2 = tipY - (o.tool === 'breaker' ? 46 : o.tool === 'rotary' ? 40 : o.tool === 'vibro' ? 50 : o.tool === 'dig' ? 24 : 18);
  Ln(e, kx, ky, sx2, sy2, SK('exc2', 6, 'stroke-linecap:round'));
  Ln(e, kx, ky, sx2, sy2, SK('exc', 3, 'stroke-linecap:round'));
  Ln(e, mx2 - 2, my2 - 4, kx + 4, ky - 6, SK('dark', 2.4, 'stroke-linecap:round'));
  C(e, kx, ky, 3, F('dark'));
  if (o.tool === 'breaker') {
    // hidraulikus bontókalapács a kar végén
    Ln(e, sx2, sy2, x, tipY - 30, SK('exc2', 5, 'stroke-linecap:round'));
    R(e, x - 6, tipY - 32, 12, 22, F('dark2') + `;stroke:${v('dark')};stroke-width:.8`, { rx: 2 });
    R(e, x - 2, tipY - 10, 4, 10, F('steel2'));
    P(e, `M${x - 2} ${tipY} L${x} ${tipY + 4} L${x + 2} ${tipY}Z`, F('steel3'));
  } else if (o.tool === 'dig') {
    // nyitott kanál fogakkal, benne föld (ásás)
    const d = `M${sx2 + 4} ${sy2 - 2} L${x + 9} ${tipY - 9} L${x + 1} ${tipY + 1} L${x - 12} ${tipY - 5} Q${x - 9} ${sy2 - 1} ${sx2 + 4} ${sy2 - 2}Z`;
    P(e, `M${x - 11} ${tipY - 6} Q${x - 4} ${sy2 - 7} ${x + 7} ${tipY - 11}Z`, F(o.soil ?? 'clay') + `;stroke:${v('layer')};stroke-width:.6`);
    P(e, d, F('exc2') + `;stroke:${v('exc3')};stroke-width:.9`);
    for (let i = 0; i < 3; i++) P(e, `M${x - 9 + i * 4.4} ${tipY - 3.6 + i * 1.6} l1.4 4.4 l2.4 -3.4z`, F('dark2'));
    C(e, sx2, sy2, 2.4, F('dark'));
  } else if (o.tool === 'vibro') {
    // gépre szerelt (függesztett) vibrátor, alul befogó pofával
    Ln(e, sx2, sy2, x, tipY - 40, SK('exc2', 5, 'stroke-linecap:round'));
    R(e, x - 12, tipY - 40, 24, 30, F('mach') + `;stroke:${v('mach3')};stroke-width:.9`, { rx: 3 });
    R(e, x - 12, tipY - 32, 24, 5, F('dark'));
    C(e, x - 5, tipY - 20, 3.4, F('mach2')); C(e, x + 5, tipY - 20, 3.4, F('mach2'));
    R(e, x - 6, tipY - 10, 12, 12, F('dark2') + `;stroke:${v('dark')};stroke-width:.8`, { rx: 1.5 });
  } else if (o.tool === 'rotary') {
    // forgatómotor (talajcsavar behajtása)
    Ln(e, sx2, sy2, x, tipY - 24, SK('exc2', 5, 'stroke-linecap:round'));
    R(e, x - 9, tipY - 26, 18, 20, F('dark2') + `;stroke:${v('dark')};stroke-width:.8`, { rx: 3 });
    R(e, x - 5, tipY - 6, 10, 6, F('steel3'));
  } else {
    // kanál (behúzva) és horog
    P(e, `M${sx2 - 1} ${sy2 - 3} q-12 1 -11 11 q4 6 12 2 z`, F('exc2') + `;stroke:${v('exc3')};stroke-width:.8`);
    P(e, `M${sx2 - 3} ${sy2 + 9} q0 4 -3 4`, SK('dark', 1.4));
    Ln(e, sx2 - 4, sy2 + 12, x, tipY, SK('rope', 1.1));
  }
  return { tip: [x, tipY] };
}

/* ================================================================== szerszámok, anyagok */
function concrete(g, x, y, w, hh, fresh = true) {
  R(g, x, y, w, hh, fresh ? 'fill:url(#pr-freshg)' : 'fill:url(#pr-concg)');
  R(g, x, y, w, hh, 'fill:url(#pr-p-conc)');
}
function holeWall(g, cx, top, bot, half) {
  // a furat fala: vékony sötét vonal és árnyék
  Ln(g, cx - half, top, cx - half, bot, SK('wall', 1.2));
  Ln(g, cx + half, top, cx + half, bot, SK('wall', 1.2));
}
function cage(g, cx, top, bot, half) {
  const c = g_(g, { class: 'pr-cage' });
  const xs = [cx - half + 2, cx - half * 0.35, cx + half * 0.35, cx + half - 2];
  xs.forEach((x, i) => Ln(c, x, top, x, bot, SK('rebar', i === 0 || i === 3 ? 1.8 : 1.2)));
  let d = '';
  for (let y = top + 5; y < bot - 3; y += 8) d += `M${cx - half + 2} ${y} L${cx + half - 2} ${y + 4} `;
  P(c, d, SK('rebar2', 1));
  for (let y = top + 22; y < bot - 10; y += 46) { C(c, cx - half + 1, y, 1.7, F('spacer')); C(c, cx + half - 1, y + 8, 1.7, F('spacer')); }
  return c;
}
/**
 * Folyamatos fúróspirál metszetben: üreges szár, csavarmenetek elöl-hátul; a talajba hatoló részen
 * (soilFrom alatt) a menetek közét talaj tölti ki a furat faláig.
 */
function auger(g, cx, top, bot, half, o = {}) {
  const a = g_(g, { class: 'pr-auger' });
  const pitch = o.pitch ?? 16, soilFrom = o.soilFrom ?? null, soilTo = o.soilTo ?? bot;
  if (soilFrom != null && soilTo > soilFrom) {
    const y0 = Math.max(top, soilFrom);
    R(a, cx - half, y0, half * 2, soilTo - y0, F(o.soil ?? 'clay'));
    R(a, cx - half, y0, half * 2, soilTo - y0, `fill:url(#${o.pat ?? 'pr-p-clay'})`);
  }
  // hátsó menetek (halványan)
  let back = '';
  for (let y = top + 4; y < bot - 8; y += pitch) back += `M${cx + half} ${y + pitch / 2} Q${cx} ${y + pitch * 0.82} ${cx - half} ${y + pitch} `;
  P(a, back, SK('steel3', 1.4, 'opacity:.55'));
  // szár
  R(a, cx - 4, top, 8, bot - top - 2, 'fill:url(#pr-cyl)');
  // elülső menetek
  let fr = '';
  for (let y = top + 4; y < bot - 8; y += pitch) fr += `M${cx - half} ${y} Q${cx} ${y + pitch * 0.18} ${cx + half} ${y + pitch / 2} `;
  P(a, fr, SK('steel3', 3.6, 'stroke-linecap:round'));
  P(a, fr, SK('steel1', 1.6, 'stroke-linecap:round'));
  // csúcs: vágóélek, középső csúcs
  P(a, `M${cx - half + 1} ${bot - 7} L${cx - 3} ${bot} L${cx + 3} ${bot} L${cx + half - 1} ${bot - 7}`, SK('steel3', 2.6, 'stroke-linejoin:round'));
  P(a, `M${cx - 3} ${bot} L${cx} ${bot + 4} L${cx + 3} ${bot}Z`, F('steel3'));
  return a;
}
/** Kiemelt furadék kupaca a terepen */
function spoil(g, M, x, w, hh, k = 'clay') {
  const [col, pat] = SOIL[k], GY = M.GY;
  const d = `M${x} ${GY + 0.5} C${x + w * 0.2} ${GY - hh * 0.9} ${x + w * 0.45} ${GY - hh * 1.05} ${x + w * 0.62} ${GY - hh * 0.8} C${x + w * 0.8} ${GY - hh * 0.55} ${x + w * 0.9} ${GY - hh * 0.2} ${x + w} ${GY + 0.5}Z`;
  P(g, d, F(col) + `;stroke:${v('layer')};stroke-width:.7`);
  P(g, d, `fill:url(#${pat})`);
}


/* ================================================================== további szerszámok és gépek */
/** Béléscső metszetben: két acélfal, belül a furat tere; o.joints: toldások, o.teeth: vágókoszorú, o.inner: a belső tér színe */
function casing(g, cx, top, bot, half, o = {}) {
  const t = o.t ?? 3.6, c = g_(g, { class: 'pr-casing' });
  if (o.inner !== false) R(c, cx - half, top, half * 2, bot - top, F(o.inner ?? 'bore'));
  R(c, cx - half - t, top, t, bot - top, 'fill:url(#pr-cyl)');
  R(c, cx + half, top, t, bot - top, 'fill:url(#pr-cyl)');
  const seg = o.seg ?? 48;
  if (o.joints !== false) for (let y = top + seg; y < bot - 8; y += seg) { R(c, cx - half - t - 1, y - 1.6, t + 1.4, 3.2, F('steel3')); R(c, cx + half - 0.4, y - 1.6, t + 1.4, 3.2, F('steel3')); }
  if (o.teeth) for (const k of [-1, 1]) P(c, `M${cx + k * (half + t / 2) - 2.2} ${bot} l2.2 4.6 l2.2 -4.6z`, F('steel3'));
  if (o.collar) R(c, cx - half - t - 3, top, half * 2 + 2 * t + 6, 6, F('steel3'), { rx: 1.5 });
  return c;
}
/** Furat vagy cső tartalma: víz, zagy, cementtej */
function water(g, x, y, w, hh) { R(g, x, y, w, hh, F('water', 0.32)); Ln(g, x, y, x + w, y, SK('water', 1.2)); }
function slurry(g, x, y, w, hh) { R(g, x, y, w, hh, 'fill:url(#pr-slurryg)'); R(g, x, y, w, hh, 'fill:url(#pr-p-slurry)'); Ln(g, x, y, x + w, y, SK('slurry2', 1.4)); }
/** Teleszkópos kellyrúd */
function kelly(g, cx, top, bot) {
  const L = bot - top;
  R(g, cx - 2.4, top, 4.8, L, 'fill:url(#pr-cyl)');
  R(g, cx - 3.6, top, 7.2, L * 0.62, 'fill:url(#pr-cyl)');
  R(g, cx - 4.8, top, 9.6, L * 0.3, 'fill:url(#pr-cyl)');
  [L * 0.3, L * 0.62].forEach((d, i) => R(g, cx - 5.4 + i * 1.2, top + d - 2, 10.8 - i * 2.4, 3, F('steel3')));
}
/** Dobfúró (nyitható fenéklemezzel, fogakkal) */
function drillBucket(g, cx, bot, half, o = {}) {
  const hh = o.h ?? 34, y0 = bot - hh, b = g_(g, { class: 'pr-bucket' });
  R(b, cx - 4, y0 - 7, 8, 7, F('steel3'));
  R(b, cx - half, y0, half * 2, hh - 4, 'fill:url(#pr-cyl)', { rx: 2 });
  R(b, cx - half, y0, half * 2, 4, F('steel3'));
  if (o.soil) { const [col, pat] = SOIL[o.soil]; R(b, cx - half + 3, y0 + 7, half * 2 - 6, hh - 14, F(col)); R(b, cx - half + 3, y0 + 7, half * 2 - 6, hh - 14, `fill:url(#${pat})`); }
  for (let y = y0 + 10; y < bot - 8; y += 9) Ln(b, cx - half, y, cx + half, y, SK('steel3', 0.8, 'opacity:.6'));
  R(b, cx - half - 1, bot - 5, half * 2 + 2, 3.4, F('steel3'));
  for (let i = 0; i < 5; i++) P(b, `M${cx - half + 2 + (i * (half * 2 - 4)) / 4 - 2} ${bot - 2} l2 5 l2 -5z`, F('dark2'));
  return b;
}
/** Tölcsér és betonozó (kontraktor-) cső */
function tremie(g, cx, top, bot, o = {}) {
  const t = g_(g, { class: 'pr-tremie' });
  R(t, cx - 3.4, top + 16, 6.8, bot - top - 16, 'fill:url(#pr-cyl)');
  for (let y = top + 42; y < bot - 6; y += 30) R(t, cx - 4.6, y, 9.2, 2.4, F('steel3'));
  P(t, `M${cx - 17} ${top} L${cx - 4} ${top + 17} L${cx + 4} ${top + 17} L${cx + 17} ${top}Z`, 'fill:url(#pr-cyl)' + `;stroke:${v('steel3')};stroke-width:.8`);
  if (o.full) P(t, `M${cx - 14} ${top + 3} L${cx - 4} ${top + 15} L${cx + 4} ${top + 15} L${cx + 14} ${top + 3} Q${cx} ${top - 4} ${cx - 14} ${top + 3}Z`, F('fresh1'));
  R(t, cx - 18, top - 2, 36, 3, F('steel3'), { rx: 1 });
  return t;
}
/** Kiszorító fúrófej üreges szárral (csavart / FDP cölöp) */
function dispTool(g, cx, top, tip, half) {
  const d = g_(g, { class: 'pr-disp' });
  R(d, cx - 6, top, 12, tip - top - 40, 'fill:url(#pr-cyl)');
  for (let y = top + 36; y < tip - 46; y += 36) R(d, cx - 7.5, y, 15, 2.6, F('steel3'));
  // kiszorító test: kúpos átmenet, henger, alsó csavarmenet, csúcs
  P(d, `M${cx - 6} ${tip - 42} L${cx - half} ${tip - 30} L${cx - half} ${tip - 18} L${cx - 5} ${tip - 2} L${cx} ${tip + 3} L${cx + 5} ${tip - 2} L${cx + half} ${tip - 18} L${cx + half} ${tip - 30} L${cx + 6} ${tip - 42}Z`, 'fill:url(#pr-cyl)' + `;stroke:${v('steel3')};stroke-width:.9`);
  P(d, `M${cx - half - 2} ${tip - 33} Q${cx} ${tip - 30} ${cx + half + 2} ${tip - 26} M${cx - half + 1} ${tip - 20} Q${cx} ${tip - 16} ${cx + half - 2} ${tip - 12}`, SK('steel3', 3, 'stroke-linecap:round'));
  P(d, `M${cx - 7} ${tip - 52} Q${cx} ${tip - 50} ${cx + 7} ${tip - 46}`, SK('steel3', 2.6, 'stroke-linecap:round'));
  return d;
}
/** Résfal-markoló (két pofás hidraulikus markoló) */
function grab(g, cx, bot, half, open = 0.3) {
  const hh = 50, y0 = bot - hh, b = g_(g, { class: 'pr-grab' });
  R(b, cx - half * 0.62, y0, half * 1.24, 30, F('mach') + `;stroke:${v('mach3')};stroke-width:.8`, { rx: 2 });
  R(b, cx - half * 0.62, y0, half * 1.24, 6, F('mach2'));
  R(b, cx - 2, y0 + 8, 4, 18, F('steel1'));
  const o = open * 10;
  P(b, `M${cx - half * 0.62} ${y0 + 28} L${cx - half - o} ${bot - 6} Q${cx - half * 0.5 - o * 0.5} ${bot + 2} ${cx - 1} ${bot - 1} L${cx - 3} ${y0 + 30}Z`, F('mach2') + `;stroke:${v('mach3')};stroke-width:.8`);
  P(b, `M${cx + half * 0.62} ${y0 + 28} L${cx + half + o} ${bot - 6} Q${cx + half * 0.5 + o * 0.5} ${bot + 2} ${cx + 1} ${bot - 1} L${cx + 3} ${y0 + 30}Z`, F('mach2') + `;stroke:${v('mach3')};stroke-width:.8`);
  for (let i = 0; i < 3; i++) { P(b, `M${cx - half * 0.8 - o + i * 7} ${bot - 2 + i} l2 4 l2 -4z`, F('dark2')); P(b, `M${cx + half * 0.8 + o - i * 7 - 4} ${bot - 2 + i} l2 4 l2 -4z`, F('dark2')); }
  return { top: y0 };
}
/** Siló lábakon (bentonit vagy cement) */
function silo(g, M, x, o = {}) {
  const GY = M.GY, w = o.w ?? 24, hh = o.h ?? 92, top = GY - hh, s = g_(g, { class: 'pr-silo' });
  [x - w / 2 + 2, x + w / 2 - 2].forEach((lx) => Ln(s, lx, GY, lx, GY - 30, SK('steel3', 2.4)));
  Ln(s, x - w / 2 + 2, GY - 8, x + w / 2 - 2, GY - 24, SK('steel3', 1.2));
  P(s, `M${x - w / 2} ${GY - 40} L${x - 3} ${GY - 26} H${x + 3} L${x + w / 2} ${GY - 40}Z`, 'fill:url(#pr-cylw)' + `;stroke:${v('drum3')};stroke-width:.8`);
  R(s, x - w / 2, top + 4, w, hh - 44, 'fill:url(#pr-cylw)' + `;stroke:${v('drum3')};stroke-width:.8`);
  P(s, `M${x - w / 2} ${top + 4} Q${x} ${top - 6} ${x + w / 2} ${top + 4}Z`, F('drum2') + `;stroke:${v('drum3')};stroke-width:.8`);
  for (let y = top + 12; y < GY - 44; y += 6) Ln(s, x + w / 2 - 4, y, x + w / 2 - 1, y, SK('steel3', 0.9));
  if (o.band) R(s, x - w / 2, top + 16, w, 6, F(o.band));
  return { out: [x, GY - 26] };
}
/** Keverő-szivattyú konténer */
function plant(g, M, x, o = {}) {
  const GY = M.GY, w = o.w ?? 50, hh = o.h ?? 26, p = g_(g, { class: 'pr-plant' });
  R(p, x, GY - hh, w, hh, F(o.col ?? 'cont') + `;stroke:${v('cont3')};stroke-width:.8`, { rx: 1.5 });
  for (let i = 4; i < w - 2; i += 4) Ln(p, x + i, GY - hh + 2, x + i, GY - 2, SK('cont3', 0.7, 'opacity:.6'));
  R(p, x + w * 0.62, GY - hh + 5, w * 0.28, hh * 0.45, F('dark2'), { rx: 1 });
  C(p, x + w * 0.76, GY - hh + 5 + hh * 0.22, 3.2, F('steel2'));
  return { out: [x + w, GY - hh + 8], top: GY - hh };
}
/** Tömlő két pont között, belógó ívvel */
function hoseTo(g, x1, y1, x2, y2, sag = 30, cls = 'hose') {
  const d = `M${x1} ${y1} C${x1 + (x2 - x1) * 0.25} ${Math.max(y1, y2) + sag} ${x1 + (x2 - x1) * 0.75} ${Math.max(y1, y2) + sag} ${x2} ${y2}`;
  P(g, d, SK(cls, 3, 'stroke-linecap:round'));
  P(g, d, SK('hose2', 0.9, 'stroke-linecap:round;opacity:.6'));
}
/** Kis, lánctalpas fúrógép (mikrocölöp, jet): a fúrás tengelye x-en, a gép jobbra, a kezelő a pultnál áll */
function smallRig(g, M, x, o = {}) {
  const GY = M.GY, r = g_(g, { class: 'pr-small' }), top = o.top ?? GY - 120, mx = x + 10;
  const tx0 = x + 14, tl = 60;
  R(r, tx0, GY - 11, tl, 11, F('dark'), { rx: 5.5 });
  R(r, tx0 + 1.5, GY - 11, tl - 3, 2.2, 'fill:url(#pr-p-shoe)');
  R(r, tx0 + 3, GY - 8.5, tl - 6, 6, F('dark2'), { rx: 3 });
  for (let i = 0; i < 4; i++) C(r, tx0 + 8 + (i * (tl - 16)) / 3, GY - 5.5, 2.2, F('dark'));
  const hy = GY - 13;
  P(r, `M${tx0 + 4} ${hy} V${hy - 18} Q${tx0 + 4} ${hy - 22} ${tx0 + 8} ${hy - 22} H${tx0 + tl - 2} Q${tx0 + tl + 3} ${hy - 22} ${tx0 + tl + 3} ${hy - 16} V${hy}Z`, F('mach') + `;stroke:${v('mach3')};stroke-width:.8`);
  for (let i = 0; i < 5; i++) Ln(r, tx0 + 30 + i * 4, hy - 17, tx0 + 30 + i * 4, hy - 6, SK('mach3', 1));
  // árboc
  R(r, mx - 4.5, top, 9, GY - 6 - top, F('mach') + `;stroke:${v('mach3')};stroke-width:.8`);
  R(r, mx - 4.5, top, 2.4, GY - 6 - top, F('mach3'));
  R(r, mx - 7, GY - 7, 14, 7, F('dark2'), { rx: 1.5 });
  Ln(r, tx0 + 10, hy - 14, mx + 4, hy - 34, SK('mach2', 5, 'stroke-linecap:round'));
  Ln(r, tx0 + 24, hy - 21, mx + 4, top + (GY - top) * 0.5, SK('dark', 3.2, 'stroke-linecap:round'));
  R(r, mx - 8, top - 6, 16, 7, F('mach2'), { rx: 1.5 });
  // fúrófej (forgató motor) a rúdon
  const hY = o.headY ?? top + 10;
  R(r, x + 4, hY + 3, mx - 4.5 - (x + 4), 10, F('mach2'));
  R(r, x - 9, hY, 18, 16, F('mach') + `;stroke:${v('mach3')};stroke-width:.8`, { rx: 2 });
  R(r, x - 6, hY - 5, 12, 5, F('dark2'), { rx: 1 });
  // kezelőpult és kezelő
  const kx = tx0 + tl + 16;
  R(r, kx - 5, GY - 22, 10, 6, F('dark2'), { rx: 1 });
  Ln(r, kx, GY - 16, kx, GY, SK('dark2', 1.6));
  worker(g, kx + 9, { GY, pose: 'guide', dir: -1 });
  return { headY: hY, headBot: hY + 16, mx };
}
/** Kerekes homlokrakodó, emelt kanállal */
function loader(g, M, x, o = {}) {
  const GY = M.GY, l = g_(g, { class: 'pr-loader' }), lift = o.lift ?? 30;
  R(l, x + 10, GY - 30, 62, 16, F('exc') + `;stroke:${v('exc3')};stroke-width:.8`, { rx: 3 });
  P(l, `M${x + 42} ${GY - 30} V${GY - 56} H${x + 62} L${x + 66} ${GY - 30}Z`, F('exc') + `;stroke:${v('exc3')};stroke-width:.8`);
  P(l, `M${x + 45} ${GY - 33} V${GY - 53} H${x + 60} L${x + 63} ${GY - 33}Z`, 'fill:url(#pr-glass)' + `;stroke:${v('dark')};stroke-width:.9`);
  C(l, x + 53, GY - 43, 2.7, F('opr'));
  R(l, x + 66, GY - 36, 10, 22, F('exc2'), { rx: 3 });
  [x + 22, x + 62].forEach((cx) => { C(l, cx, GY - 11, 11, F('dark')); C(l, cx, GY - 11, 5.4, F('exc2')); C(l, cx, GY - 11, 2, F('dark2')); });
  const ax = x + 2, ay = GY - 26 - lift;
  Ln(l, x + 36, GY - 30, ax + 6, ay + 8, SK('exc2', 6, 'stroke-linecap:round'));
  Ln(l, x + 40, GY - 38, ax + 10, ay + 2, SK('dark', 2.6, 'stroke-linecap:round'));
  P(l, `M${ax + 8} ${ay - 4} L${ax - 14} ${ay - 6} L${ax - 16} ${ay + 10} Q${ax - 4} ${ay + 16} ${ax + 8} ${ay + 10}Z`, F('exc2') + `;stroke:${v('exc3')};stroke-width:.8`);
  if (o.full) P(l, `M${ax - 13} ${ay - 6} Q${ax - 4} ${ay - 13} ${ax + 6} ${ay - 5}Z`, F('stone') + `;stroke:${v('stone2')};stroke-width:.6`);
  return l;
}
/** Hidraulikus kos a vezetőtornyon, cölöpsapkával */
function hammer(g, cx, y, half) {
  const k = g_(g, { class: 'pr-hammer' });
  R(k, cx - half - 3, y, half * 2 + 6, 48, F('mach') + `;stroke:${v('mach3')};stroke-width:.9`, { rx: 3 });
  R(k, cx - half - 3, y + 8, half * 2 + 6, 5, F('dark'));
  R(k, cx - half + 1, y + 16, half * 2 - 2, 24, F('mach2'), { rx: 2 });
  Ln(k, cx, y - 8, cx, y, SK('rope', 1.1));
  R(k, cx - half - 1, y + 48, half * 2 + 2, 9, F('dark2'), { rx: 1 });
  return y + 57;
}
/** Előregyártott vasbeton cölöp csúccsal, toldóval */
function precast(g, cx, top, tip, half, o = {}) {
  const p = g_(g, { class: 'pr-precast' });
  R(p, cx - half, top, half * 2, tip - top - 12, 'fill:url(#pr-pile)' + `;stroke:${v('conc2')};stroke-width:.6`);
  R(p, cx - half, top, half * 2, tip - top - 12, 'fill:url(#pr-p-conc)', { opacity: 0.5 });
  P(p, `M${cx - half} ${tip - 12} L${cx} ${tip} L${cx + half} ${tip - 12}Z`, F('steel3'));
  if (o.rebar) for (const dx of [-half + 3, half - 3]) Ln(p, cx + dx, top - o.rebar, cx + dx, top + 2, SK('rebar', 1.6));
  return p;
}
/** Talajcsavar: acélszár 2–3 csavarlemezzel, kúpos csúcs, fejlemez */
function screwPile(g, cx, top, tip, o = {}) {
  const s = g_(g, { class: 'pr-screw' });
  R(s, cx - 4, top, 8, tip - top - 8, 'fill:url(#pr-cyl)');
  P(s, `M${cx - 4} ${tip - 8} L${cx} ${tip + 2} L${cx + 4} ${tip - 8}Z`, F('steel3'));
  for (let i = 0; i < 3; i++) { const yy = tip - 14 - i * 18; P(s, `M${cx - 13} ${yy - 4} Q${cx} ${yy - 1} ${cx + 13} ${yy + 3}`, SK('steel3', 3.4, 'stroke-linecap:round')); P(s, `M${cx - 13} ${yy - 4} Q${cx} ${yy - 1} ${cx + 13} ${yy + 3}`, SK('steel1', 1.4, 'stroke-linecap:round')); }
  if (o.plate) R(s, cx - 14, top - 3, 28, 4, F('steel3'), { rx: 1 });
  return s;
}
/** Mélyvibrátor (kőoszlop) a vezetőtoronyban: vibrátortest, toldócső, felül anyagtartály (zsilip) */
function vibroflot(g, cx, top, tip, o = {}) {
  const f = g_(g, { class: 'pr-vibro' });
  R(f, cx - 4.5, top + 24, 9, tip - top - 60, 'fill:url(#pr-cyl)');
  R(f, cx + 4.5, top + 24, 4, tip - top - 60, F('steel3'));
  R(f, cx - 7, tip - 40, 14, 38, 'fill:url(#pr-cyl)' + `;stroke:${v('steel3')};stroke-width:.8`, { rx: 3 });
  P(f, `M${cx - 7} ${tip - 4} L${cx} ${tip + 3} L${cx + 7} ${tip - 4}Z`, F('steel3'));
  Ln(f, cx - 7, tip - 28, cx + 7, tip - 28, SK('steel3', 1));
  P(f, `M${cx - 13} ${top} L${cx - 6} ${top + 24} H${cx + 9} L${cx + 15} ${top}Z`, F('mach') + `;stroke:${v('mach3')};stroke-width:.8`);
  if (o.full) P(f, `M${cx - 12} ${top + 2} Q${cx + 1} ${top - 6} ${cx + 14} ${top + 2}Z`, F('stone') + `;stroke:${v('stone2')};stroke-width:.6`);
  return f;
}
/** Jet monitor fúvókával és vágósugárral */
function jetTool(g, cx, top, y, o = {}) {
  const j = g_(g, { class: 'pr-jet' });
  R(j, cx - 3.4, top, 6.8, y - top + 10, 'fill:url(#pr-cyl)');
  R(j, cx - 5, y - 6, 10, 18, F('steel3'), { rx: 2 });
  P(j, `M${cx - 5} ${y + 12} L${cx} ${y + 18} L${cx + 5} ${y + 12}Z`, F('dark2'));
  if (o.jet) {
    const L = o.jet;
    for (const k of [-1, 1]) {
      P(j, `M${cx + k * 5} ${y - 1.2} L${cx + k * L} ${y - 6} Q${cx + k * (L + 5)} ${y} ${cx + k * L} ${y + 6} L${cx + k * 5} ${y + 1.2}Z`, F('halo', 0.9) + `;stroke:${v('water')};stroke-width:.7`);
      Ln(j, cx + k * 5, y, cx + k * (L + 1), y, SK('water', 1.6));
      for (let i = 0; i < 6; i++) C(j, cx + k * (L + 2 + (i % 3) * 3), y + (i - 2.5) * 2.6, 1, F('water', 0.7));
    }
  }
  return j;
}
/** Mélykeverő szerszám: lapátok több szinten, vágóél alul */
function mixTool(g, cx, top, bot, half) {
  const m = g_(g, { class: 'pr-mixtool' });
  R(m, cx - 4, top, 8, bot - top, 'fill:url(#pr-cyl)');
  for (let i = 0; i < 3; i++) {
    const yy = bot - 8 - i * 14;
    P(m, `M${cx - half} ${yy - 3} L${cx + half} ${yy + 3}`, SK('steel3', 3.6, 'stroke-linecap:round'));
    P(m, `M${cx - half * 0.8} ${yy + 4} L${cx + half * 0.8} ${yy - 4}`, SK('steel2', 2.6, 'stroke-linecap:round'));
  }
  P(m, `M${cx - half} ${bot - 2} L${cx + half} ${bot - 2}`, SK('dark2', 3, 'stroke-linecap:round'));
  for (let i = -2; i <= 2; i++) P(m, `M${cx + i * half * 0.45 - 2} ${bot - 1} l2 4 l2 -4z`, F('dark2'));
  return m;
}
/** Kevert (talaj–kötőanyag) vagy jet-oszlop teste */
function column(g, cx, top, bot, half, kind = 'mix') {
  const c = g_(g);
  if (kind === 'jet') {
    R(c, cx - half, top, half * 2, bot - top, 'fill:url(#pr-groutg)', { rx: 4 });
    for (let y = top + 6; y < bot - 4; y += 9) P(c, `M${cx - half + 2} ${y} Q${cx} ${y + 5} ${cx + half - 2} ${y}`, SK('grout2', 1, 'opacity:.8'));
  } else {
    R(c, cx - half, top, half * 2, bot - top, 'fill:url(#pr-mixg)', { rx: 3 });
    R(c, cx - half, top, half * 2, bot - top, 'fill:url(#pr-p-mix)', { rx: 3 });
  }
  return c;
}
/** Kőoszlop: bordás kavicsoszlop */
function stoneCol(g, cx, top, bot, half, o = {}) {
  const c = g_(g, { class: 'pr-stonecol' });
  let d = `M${cx - half} ${top}`;
  const n = Math.max(2, Math.round((bot - top) / 16)), st = (bot - top) / n;
  for (let i = 0; i < n; i++) { const hw = half + (o.bulge && top + (i + 0.5) * st > o.bulge[0] && top + (i + 0.5) * st < o.bulge[1] ? 5 : 0); d += ` Q${cx - hw - 4} ${top + (i + 0.5) * st} ${cx - half} ${top + (i + 1) * st}`; }
  d += ` Q${cx} ${bot + 6} ${cx + half} ${bot}`;
  for (let i = n - 1; i >= 0; i--) { const hw = half + (o.bulge && top + (i + 0.5) * st > o.bulge[0] && top + (i + 0.5) * st < o.bulge[1] ? 5 : 0); d += ` Q${cx + hw + 4} ${top + (i + 0.5) * st} ${cx + half} ${top + i * st}`; }
  d += 'Z';
  P(c, d, F('stone'));
  P(c, d, 'fill:url(#pr-p-stone)');
  P(c, d, SK('stone2', 0.8));
  return c;
}
/** Hullámos felületű Franki-törzs és hagyma */
function wavyShaft(g, cx, top, bot, half) {
  const n = Math.max(2, Math.round((bot - top) / 13)), st = (bot - top) / n;
  let d = `M${cx - half} ${top}`;
  for (let i = 0; i < n; i++) d += ` q-5 ${st / 2} 0 ${st}`;
  d += ` H${cx + half}`;
  for (let i = 0; i < n; i++) d += ` q5 ${-st / 2} 0 ${-st}`;
  P(g, d + 'Z', 'fill:url(#pr-concg)');
  P(g, d + 'Z', 'fill:url(#pr-p-conc)');
}
function bulb(g, cx, cy, rx, ry) {
  const d = `M${cx - rx * 0.5} ${cy - ry} C${cx - rx * 1.2} ${cy - ry * 0.75} ${cx - rx * 1.1} ${cy + ry} ${cx} ${cy + ry} C${cx + rx * 1.1} ${cy + ry} ${cx + rx * 1.2} ${cy - ry * 0.75} ${cx + rx * 0.5} ${cy - ry}Z`;
  P(g, d, 'fill:url(#pr-concg)'); P(g, d, 'fill:url(#pr-p-conc)'); P(g, d, SK('conc2', 0.8));
}
/** Franki ejtőkos a csőben (kötélen) */
function ram(g, cx, ropeTop, y, half) {
  Ln(g, cx, ropeTop, cx, y, SK('rope', 1.1));
  R(g, cx - half + 2, y, half * 2 - 4, 30, 'fill:url(#pr-cyl)' + `;stroke:${v('steel3')};stroke-width:.8`, { rx: 3 });
  R(g, cx - 2.5, y - 4, 5, 5, F('steel3'));
}
/** Betonszállító puttony (Franki) */
function skip(g, cx, y, o = {}) {
  const s = g_(g, { class: 'pr-skip' });
  P(s, `M${cx - 16} ${y} L${cx - 10} ${y + 20} H${cx + 10} L${cx + 16} ${y}Z`, F('steel2') + `;stroke:${v('steel3')};stroke-width:.9`);
  P(s, `M${cx - 14} ${y + 2} Q${cx} ${y - 6} ${cx + 14} ${y + 2}Z`, F('fresh1'));
  return s;
}
/** Egyszerű könnyűszerkezetes ház (talajcsavar) */
function house(g, x, y, w) {
  const hs = g_(g, { class: 'pr-house' });
  R(hs, x, y - 40, w, 40, F('wallh') + `;stroke:${v('wallh2')};stroke-width:.8`);
  P(hs, `M${x - 6} ${y - 40} L${x + w / 2} ${y - 66} L${x + w + 6} ${y - 40}Z`, F('roof') + `;stroke:${v('roof2')};stroke-width:.8`);
  R(hs, x + 8, y - 30, 12, 12, 'fill:url(#pr-glass)' + `;stroke:${v('wallh2')};stroke-width:1`);
  R(hs, x + w - 22, y - 26, 12, 26, F('timber2'));
  return hs;
}

/* ================================================================== módszerek */
// minden módszer: H, GY, rétegek (k: talajfajta, y: a réteg teteje, lab: név), gw: talajvízszint, steps: [{ w, t, d, draw }]

/* ================================================================== munkatér: közös elemek */
const PI180 = Math.PI / 180;
const mir = (g, cx) => g_(g, { transform: `translate(${2 * cx} 0) scale(-1 1)` });          // tükrözés az x = cx tengelyre
const scl = (g, s, x, y) => g_(g, { transform: `translate(${x} ${y}) scale(${s}) translate(${-x} ${-y})` });
const at = (M, gy) => ({ ...M, GY: gy });                                                   // gép a gödör fenekén
const big = (g, x, y, t) => el('text', { x, y, 'text-anchor': 'middle', class: 'pr-tx pr-big', text: t }, g);

/** Kiemelt gödör metszetben: üres tér a talajban. o.sl / o.sr: rézsű vízszintes vetülete a bal / jobb oldalon. */
function pit(g, M, x0, x1, bot, o = {}) {
  const GY = M.GY, sl = o.sl ?? 0, sr = o.sr ?? 0;
  R(g, x0, GY - 4.8, x1 - x0, 4.8, F('hill'));
  P(g, `M${x0} ${GY} L${x0 + sl} ${bot} L${x1 - sr} ${bot} L${x1} ${GY}Z`, 'fill:url(#pr-pitg)');
  R(g, x0 + sl, bot, x1 - sr - x0 - sl, 3, F('top'));
  Ln(g, x0 + sl, bot, x1 - sr, bot, SK('ground', 1.5));
  if (sl) Ln(g, x0, GY, x0 + sl, bot, SK('ground', 1.3));
  if (sr) Ln(g, x1 - sr, bot, x1, GY, SK('ground', 1.3));
}
/** Kiemelési szint homlokzati nézetben: a fal előtti talaj eddig van kiemelve; a fölötte szabaddá vált földfal kissé árnyékos. */
function level(g, x0, x1, y, o = {}) {
  if (o.shade !== false) R(g, x0, o.top ?? 0, x1 - x0, y - (o.top ?? 0), F('dark', 0.1));
  R(g, x0, y, x1 - x0, 3.2, F('top'));
  Ln(g, x0, y, x1, y, SK('ground', 1.5));
}
/** Visszatöltés homlokzati nézetben (rétegenként tömörítve) */
function backfill(g, x0, x1, y0, y1) {
  R(g, x0, y0, x1 - x0, y1 - y0, F('fill'));
  R(g, x0, y0, x1 - x0, y1 - y0, 'fill:url(#pr-p-fill)');
  for (let y = y0 + 12; y < y1 - 2; y += 12) Ln(g, x0, y, x1, y, SK('layer', 0.8, 'stroke-dasharray:5 4'));
  Ln(g, x0, y0, x1, y0, SK('ground', 1.4));
}

/* ---------- acéltartó, palló, heveder */
/** Acél I/H-tartó homlokzatban (az öv síkja látszik); o.hidden: a talajban, a nézet mögött (szaggatott) */
function hbeamF(g, x, top, bot, o = {}) {
  const w = o.w ?? 9, b = g_(g, { class: 'pr-beam', style: o.hidden ? 'opacity:.55' : '' });
  R(b, x - w / 2, top, w, bot - top, 'fill:url(#pr-cyl)');
  Ln(b, x - w / 2, top, x - w / 2, bot, SK('steel3', 0.9, o.hidden ? 'stroke-dasharray:4 3' : ''));
  Ln(b, x + w / 2, top, x + w / 2, bot, SK('steel3', 0.9, o.hidden ? 'stroke-dasharray:4 3' : ''));
  if (!o.hidden) R(b, x - w / 2 - 1, top - 2, w + 2, 3, F('steel3'));
  return b;
}
/** Acéltartó metszetben (a gerinc sávja, két szélén az övek) */
function hbeamS(g, x, top, bot, o = {}) {
  const w = o.w ?? 8;
  R(g, x - w / 2, top, w, bot - top, F('steel2'));
  R(g, x - w / 2, top, 1.8, bot - top, F('steel3'));
  R(g, x + w / 2 - 1.8, top, 1.8, bot - top, F('steel3'));
  R(g, x - w / 2 - 0.5, top - 2, w + 1, 2.5, F('steel3'));
}
/** Vízszintes fapallók két tartó között (homlokzat), alulról felfelé rakva; o.wedge: ékek az öveknél */
function boardsF(g, x0, x1, top, bot, o = {}) {
  const hh = o.h ?? 8, b = g_(g, { class: 'pr-boards' });
  for (let y = top; y < bot - 0.5; y += hh) {
    const y1 = Math.min(bot, y + hh);
    R(b, x0, y + 0.4, x1 - x0, y1 - y - 0.8, F('timber') + `;stroke:${v('timber2')};stroke-width:.6`);
    R(b, x0, y + 0.4, x1 - x0, y1 - y - 0.8, 'fill:url(#pr-p-wood)');
    if (o.wedge !== false) { R(b, x0, y + 1.5, 2.6, y1 - y - 3, F('timber2')); R(b, x1 - 2.6, y + 1.5, 2.6, y1 - y - 3, F('timber2')); }
  }
  return b;
}
/** Függőleges pallók (csatornapalló vagy fa) metszetben: vékony sáv a földfalon; side: a munkatér iránya */
function plankS(g, x, top, bot, side, o = {}) {
  const t = o.t ?? 3.6, x0 = side > 0 ? x : x - t;
  R(g, x0, top, t, bot - top, F(o.col ?? 'steel2') + `;stroke:${v(o.col2 ?? 'steel3')};stroke-width:.7`);
}
/** Heveder metszetben (U-pár vagy gerenda) a fal munkatér felőli oldalán; visszaadja a külső síkot */
function waleS(g, x, y, side, o = {}) {
  const w = o.w ?? 8, hh = o.h ?? 13, x0 = side > 0 ? x : x - w;
  R(g, x0, y - hh / 2, w, hh, F(o.col ?? 'steel2') + `;stroke:${v(o.col2 ?? 'steel3')};stroke-width:.9`);
  Ln(g, x0 + w / 2, y - hh / 2 + 1, x0 + w / 2, y + hh / 2 - 1, SK(o.col2 ?? 'steel3', 1.2));
  return x + side * w;
}
/** Heveder homlokzatban: vízszintes acélgerenda a fal előtt */
function waleF(g, x0, x1, y, o = {}) {
  const hh = o.h ?? 9;
  R(g, x0, y - hh / 2, x1 - x0, hh, 'fill:url(#pr-cylh)' + `;stroke:${v('steel3')};stroke-width:.8`);
  Ln(g, x0, y, x1, y, SK('steel3', 0.8, 'opacity:.7'));
}
/** Horgonyfej homlokzatban (alátétlemez, ékes horgonytárcsa) */
function aheadF(g, x, y) {
  R(g, x - 7, y - 7, 14, 14, F('steel3') + `;stroke:${v('dark')};stroke-width:.7`, { rx: 1 });
  C(g, x, y, 4.2, F('steel1') + `;stroke:${v('dark2')};stroke-width:.8`);
  C(g, x, y, 1.5, F('dark'));
}
/** Acélcső (dúc, csőtámasz) vízszintesen, két végén homloklemezzel */
function pipeH(g, x1, x2, y, o = {}) {
  const r = o.r ?? 5;
  R(g, x1, y - r, x2 - x1, 2 * r, 'fill:url(#pr-cylh)');
  Ln(g, x1, y - r, x2, y - r, SK('steel3', 0.7)); Ln(g, x1, y + r, x2, y + r, SK('steel3', 0.9));
  R(g, x1 - 1.5, y - r - 2.5, 3, 2 * r + 5, F('steel3'));
  R(g, x2 - 1.5, y - r - 2.5, 3, 2 * r + 5, F('steel3'));
  if (o.joint) R(g, o.joint - 1.5, y - r - 2, 3, 2 * r + 4, F('steel3'));
}
/** Csőtámasz vége homlokzatban: körszelvény a heveder előtt */
function pipeEndF(g, x, y, r = 7) {
  C(g, x, y, r + 2, F('steel3'));
  C(g, x, y, r, 'fill:url(#pr-cyl)');
  C(g, x, y, r * 0.62, F('dark2', 0.85));
}
/** Állítható csavaros acéldúc (közműárok) */
function propH(g, x1, x2, y) {
  const m = (x1 + x2) / 2;
  R(g, x1, y - 2.6, x2 - x1, 5.2, 'fill:url(#pr-cylh)');
  R(g, m - 9, y - 3.6, 18, 7.2, F('steel3'), { rx: 1 });
  for (let i = -7; i <= 7; i += 2.4) Ln(g, m + i, y - 3.6, m + i + 1.2, y + 3.6, SK('steel1', 0.6, 'opacity:.7'));
  R(g, x1 - 1, y - 6, 3, 12, F('steel3')); R(g, x2 - 2, y - 6, 3, 12, F('steel3'));
}

/* ---------- vasbeton és acél falak */
/** Vasbeton fal (résfal, cölöpfal) metszetben; x: a fal tengelye */
function wallS(g, x, top, bot, o = {}) {
  const t = o.t ?? 14;
  concrete(g, x - t / 2, top, t, bot - top, false);
  Ln(g, x - t / 2 + 3, top + 4, x - t / 2 + 3, bot - 5, SK('rebar', 1));
  Ln(g, x + t / 2 - 3, top + 4, x + t / 2 - 3, bot - 5, SK('rebar', 1));
  P(g, `M${x - t / 2} ${top} V${bot} H${x + t / 2} V${top}`, SK('conc2', 0.8));
  if (o.cap) { R(g, x - t / 2 - 4, top - 10, t + 8, 12, 'fill:url(#pr-concg)' + `;stroke:${v('conc2')};stroke-width:.8`); R(g, x - t / 2 - 4, top - 10, t + 8, 12, 'fill:url(#pr-p-conc)'); }
}
/** Acél szádfal metszetben (vékony, hullámos lemez élben) */
function sheetS(g, x, top, bot) {
  let d = `M${x} ${top}`;
  for (let y = top; y < bot; y += 12) d += ` L${x + 2.2} ${Math.min(bot, y + 6)} L${x} ${Math.min(bot, y + 12)}`;
  P(g, d, SK('sheet2', 4.4, 'stroke-linejoin:round'));
  P(g, d, SK('sheet3', 1.6, 'stroke-linejoin:round'));
  R(g, x - 2.8, top - 2, 7.8, 3, F('sheet2'));
}
/** Szádpalló(pár) homlokzatban: hullámprofil árnyalással, zárakkal; o.n: hány palló (alap: 2 – gyárilag párosítva) */
function sheetF(g, x, top, bot, o = {}) {
  const pw = o.pw ?? 13, n = o.n ?? 2, s = g_(g, { class: 'pr-sheet' });
  for (let i = 0; i < n; i++) {
    const x0 = x + i * pw;
    R(s, x0, top, pw, bot - top, 'fill:url(#pr-sheetg)');
    Ln(s, x0 + 0.4, top, x0 + 0.4, bot, SK('dark', 0.9, 'opacity:.75'));
    if (i === 0) C(s, x0 + pw * 0.55, top + 6, 1.8, F('dark2'));
  }
  Ln(s, x + n * pw - 0.4, top, x + n * pw - 0.4, bot, SK('dark', 0.9, 'opacity:.75'));
  R(s, x, top, n * pw, 1.6, F('sheet2'));
  return s;
}

/* ---------- horgony, szeg */
/** Pont a horgony tengelyén: (x, y) a fej, ang: lejtés (fok), dir: -1 = balra a talajba; L: távolság a fejtől, n: oldalirányú eltolás */
const axis = (x, y, ang, dir) => { const ux = dir * Math.cos(ang * PI180), uy = Math.sin(ang * PI180); return (L, n = 0) => [x + ux * L - uy * n * dir, y + uy * L + ux * n * dir]; };
const pts = (...ps) => ps.map(([a, b]) => `${a.toFixed(1)} ${b.toFixed(1)}`).join(' L');
/** Horgony-furat béléscsővel (fúrás közben); L0: a fal belső síkja, L: a furat hossza */
function boreA(g, A, L0, L, o = {}) {
  const r = o.r ?? 4;
  P(g, `M${pts(A(L0, -r), A(L, -r), A(L, r), A(L0, r))}Z`, F('bore'));
  P(g, `M${pts(A(L0, -r), A(L, -r))}`, SK('steel3', 1.6)); P(g, `M${pts(A(L0, r), A(L, r))}`, SK('steel3', 1.6));
  P(g, `M${pts(A(L0 - 4, 0), A(L - 2, 0))}`, SK('steel2', 2.4));
  if (o.bit !== false) { const [bx, by] = A(L + 3, 0); C(g, bx, by, r + 0.8, F('dark2')); }
}
/** Feszítőpászmás horgony: szabad szakasz (védőcsőben) és injektált befogott szakasz; o.head: horgonyfej, o.grout: a hagyma kész */
function anchorA(g, A, L0, Lf, Lb, o = {}) {
  const a = g_(g, { class: 'pr-anchor' });
  if (o.grout !== false) {
    // befogott (injektált) szakasz: kissé szabálytalan habarcstest
    const n = 9, up = [], dn = [];
    for (let i = 0; i <= n; i++) { const L = Lf + (Lb * i) / n, w = 5.2 + 1.3 * Math.sin(i * 2.3) + (i === 0 || i === n ? -1.5 : 0); up.push(A(L, -w)); dn.unshift(A(L, w)); }
    P(a, `M${pts(...up, ...dn)}Z`, F('grout2') + `;stroke:${v('grout2')};stroke-width:1.2;stroke-linejoin:round`);
    P(a, `M${pts(...up, ...dn)}Z`, F('grout1', 0.7));
  }
  // védőcső a szabad szakaszon, pászmák végig
  P(a, `M${pts(A(L0, 0), A(Lf, 0))}`, SK('dark2', 3.6, 'stroke-linecap:round'));
  P(a, `M${pts(A(L0 - 2, -0.9), A(Lf + Lb - 3, -0.9))}`, SK('steel1', 0.9));
  P(a, `M${pts(A(L0 - 2, 0.9), A(Lf + Lb - 3, 0.9))}`, SK('steel3', 0.9));
  return a;
}
/** Horgonyfej metszetben: alátétlemez a hevederen, ékes tárcsa, pászmavégek */
function aheadS(g, A) {
  const [x, y] = A(0, 0);
  P(g, `M${pts(A(0, -9), A(-3.5, -9), A(-3.5, 9), A(0, 9))}Z`, F('steel3'));
  P(g, `M${pts(A(-3.5, -5), A(-9, -4), A(-9, 4), A(-3.5, 5))}Z`, F('steel2') + `;stroke:${v('dark2')};stroke-width:.6`);
  P(g, `M${pts(A(-9, -1.5), A(-14, -1.5))} M${pts(A(-9, 1.5), A(-13, 1.5))}`, SK('steel1', 1));
  return [x, y];
}
/** Talajszeg: betonacél injektált furatban, fejlemezzel */
function nailA(g, A, L, o = {}) {
  P(g, `M${pts(A(0, -2.6), A(L, -2.6), A(L + 2, 0), A(L, 2.6), A(0, 2.6))}Z`, F('grout2') + `;stroke:${v('grout2')};stroke-width:.6`);
  P(g, `M${pts(A(-3, 0), A(L, 0))}`, SK('rebar', 1.4));
  if (o.plate !== false) P(g, `M${pts(A(-1, -6), A(-3, -6), A(-3, 6), A(-1, 6))}Z`, F('steel3'));
}

/* ---------- gépek a munkatérben */
/**
 * Horgonyfúró (lánctalpas) a gödör fenekén; (x, y): a fúrás kezdőpontja a falon, ang: a furat lejtése; a gép jobbra áll.
 * o.head: a fúrófej helye az árbocon (0 = a fal mellett, 1 = hátul). Visszaadja az árboc pontjait.
 */
function anchorRig(g, M, x, y, ang, o = {}) {
  const GY = M.GY, r = g_(g, { class: 'pr-arig' }), Lm = o.Lm ?? 118, A = axis(x, y, ang, -1);
  const mp = (L, n = 0) => A(-6 - L, n);                    // pont az árbocon (a fal felől hátrafelé)
  // lánctalp és felsővázas test
  const tx0 = x + 34, tl = 70;
  R(r, tx0, GY - 11, tl, 11, F('dark'), { rx: 5.5 });
  R(r, tx0 + 1.5, GY - 11, tl - 3, 2.2, 'fill:url(#pr-p-shoe)');
  R(r, tx0 + 3, GY - 8.5, tl - 6, 6, F('dark2'), { rx: 3 });
  for (let i = 0; i < 4; i++) C(r, tx0 + 9 + (i * (tl - 18)) / 3, GY - 5.5, 2.2, F('dark'));
  const hy = GY - 13;
  P(r, `M${tx0 + 8} ${hy} V${hy - 15} Q${tx0 + 8} ${hy - 19} ${tx0 + 12} ${hy - 19} H${tx0 + tl - 2} Q${tx0 + tl + 2} ${hy - 19} ${tx0 + tl + 2} ${hy - 14} V${hy}Z`, F('mach') + `;stroke:${v('mach3')};stroke-width:.8`);
  for (let i = 0; i < 5; i++) Ln(r, tx0 + 40 + i * 4, hy - 15, tx0 + 40 + i * 4, hy - 5, SK('mach3', 1));
  // árboctartó kar és henger
  const [ax1, ay1] = mp(Lm * 0.42), [ax2, ay2] = mp(Lm * 0.7);
  Ln(r, tx0 + 14, hy - 17, ax1, ay1 + 6, SK('mach2', 6, 'stroke-linecap:round'));
  Ln(r, tx0 + 34, hy - 18, ax2, ay2 + 5, SK('dark', 3.2, 'stroke-linecap:round'));
  // árboc (a furat tengelyében)
  P(r, `M${pts(mp(0, -5), mp(Lm, -5), mp(Lm, 5), mp(0, 5))}Z`, F('mach') + `;stroke:${v('mach3')};stroke-width:.8`);
  P(r, `M${pts(mp(0, -5), mp(Lm, -5), mp(Lm, -2.6), mp(0, -2.6))}Z`, F('mach3'));
  // elülső befogó a falnál, hátsó kötélkorong
  P(r, `M${pts(mp(-2, -8), mp(8, -8), mp(8, 8), mp(-2, 8))}Z`, F('dark2'));
  const [ex, ey] = mp(Lm + 2); C(r, ex, ey, 4, F('dark2'));
  // fúrófej (forgató-ütő motor) az árbocon
  const hp = o.head ?? 0.8, L = Lm * hp;
  P(r, `M${pts(mp(L - 2, -9), mp(L + 16, -9), mp(L + 16, 9), mp(L - 2, 9))}Z`, F('mach2') + `;stroke:${v('mach3')};stroke-width:.8`);
  P(r, `M${pts(mp(L + 16, -6), mp(L + 22, -6), mp(L + 22, 6), mp(L + 16, 6))}Z`, F('dark2'));
  if (o.rod !== false) P(r, `M${pts(mp(L - 2, 0), mp(-6, 0))}`, SK('steel2', 2.6));
  // tömlők a fejtől a géptestig
  const [hx, hy2] = mp(L + 8, -9);
  P(r, `M${hx} ${hy2} C${hx + 4} ${hy2 - 22} ${tx0 + 58} ${hy - 40} ${tx0 + 58} ${hy - 19}`, SK('dark', 1.8));
  // kezelőpult és kezelő
  const kx = tx0 + tl + 14;
  R(r, kx - 5, GY - 22, 10, 6, F('dark2'), { rx: 1 });
  Ln(r, kx, GY - 16, kx, GY, SK('dark2', 1.6));
  if (o.worker !== false) worker(g, kx + 9, { GY, pose: 'guide', dir: -1 });
  return { A };
}
/** Hidraulikus feszítősajtó a horgonyfejen, nyomásmérős szivattyúval */
function jackA(g, M, A, px) {
  P(g, `M${pts(A(-9, -8), A(-34, -8), A(-34, 8), A(-9, 8))}Z`, 'fill:url(#pr-mcyl)' + `;stroke:${v('mach3')};stroke-width:.8`);
  P(g, `M${pts(A(-34, -5), A(-40, -5), A(-40, 5), A(-34, 5))}Z`, F('dark2'));
  const [hx, hy] = A(-24, -8);
  const GY = M.GY;
  R(g, px - 12, GY - 18, 24, 18, F('cont') + `;stroke:${v('cont3')};stroke-width:.8`, { rx: 2 });
  C(g, px, GY - 24, 5, F('halo') + `;stroke:${v('dark2')};stroke-width:1.2`);
  Ln(g, px, GY - 24, px + 3, GY - 27, SK('acc', 1.2));
  Ln(g, px, GY - 19, px, GY - 18, SK('dark2', 1.4));
  P(g, `M${hx} ${hy} C${hx + 10} ${hy - 26} ${px - 30} ${GY + 2} ${px - 12} ${GY - 8}`, SK('hose', 2.2));
}
/** Injektáló keverő–szivattyú egység; visszaadja a kimenet helyét */
function groutUnit(g, M, x) {
  const GY = M.GY, u = g_(g, { class: 'pr-grout' });
  R(u, x, GY - 16, 40, 16, F('cont') + `;stroke:${v('cont3')};stroke-width:.8`, { rx: 1.5 });
  P(u, `M${x + 4} ${GY - 16} L${x + 7} ${GY - 32} H${x + 21} L${x + 24} ${GY - 16}Z`, 'fill:url(#pr-cylw)' + `;stroke:${v('drum3')};stroke-width:.8`);
  R(u, x + 28, GY - 24, 9, 8, F('dark2'), { rx: 1 });
  for (let i = 0; i < 4; i++) Ln(u, x + 26 + i * 3, GY - 13, x + 26 + i * 3, GY - 3, SK('cont3', 0.7));
  return [x + 2, GY - 8];
}
/** Lőttbetonozó munkás: fúvóka a felület felé, permetkúp; (tx, ty) a célpont */
function nozzle(g, M, x, tx, ty, o = {}) {
  const GY = M.GY;
  worker(g, x, { GY, pose: 'guide', dir: tx < x ? -1 : 1 });
  const k = tx < x ? -1 : 1, hx = x + k * 14.8, hy = GY - 20.8;
  Ln(g, hx - k * 2, hy + 1, hx + k * 9, hy - 1, SK('dark2', 2.6, 'stroke-linecap:round'));
  P(g, `M${hx + k * 9} ${hy - 1.4} L${tx} ${ty - 9} L${tx} ${ty + 9}Z`, F('conc2', 0.55));
  for (let i = 0; i < 7; i++) C(g, hx + k * (12 + i * ((Math.abs(tx - hx) - 14) / 7)), hy - 1 + (i % 3 - 1) * (1 + i * 0.9), 0.9, F('conc1'));
  P(g, `M${hx - k * 2} ${hy + 1} C${hx - k * 14} ${hy + 4} ${x + k * 6} ${GY - 2} ${x - k * (o.hose ?? 30)} ${GY}`, SK('hose', 2.4));
}
/** Daruról függesztett vibrátor, alul befogó pofával; (cx, y): a befogott palló teteje */
function vibroH(g, cx, y) {
  const v_ = g_(g, { class: 'pr-vib' });
  R(v_, cx - 13, y - 44, 26, 32, F('mach') + `;stroke:${v('mach3')};stroke-width:.9`, { rx: 3 });
  R(v_, cx - 13, y - 36, 26, 5, F('dark'));
  C(v_, cx - 5.5, y - 23, 3.6, F('mach2')); C(v_, cx + 5.5, y - 23, 3.6, F('mach2'));
  R(v_, cx - 7, y - 12, 14, 14, F('dark2') + `;stroke:${v('dark')};stroke-width:.8`, { rx: 1.5 });
  P(v_, `M${cx - 9} ${y - 44} L${cx} ${y - 54} L${cx + 9} ${y - 44}`, SK('rope', 1.1));
  return y - 54;
}
/** Szivattyú tömlővel a gödörből a felszínre */
function sump(g, x, bot, x2, gy) {
  R(g, x - 5, bot - 13, 10, 13, F('cont') + `;stroke:${v('cont3')};stroke-width:.8`, { rx: 2 });
  P(g, `M${x} ${bot - 13} C${x} ${bot - 60} ${x2 - 6} ${gy - 30} ${x2} ${gy - 3}`, SK('hose', 2.4));
  P(g, `M${x2} ${gy - 3} q10 2 16 -2`, SK('hose', 2.4));
  for (let i = 0; i < 4; i++) C(g, x2 + 19 + i * 2.4, gy - 4 + i * 1.6, 1, F('water', 0.8));
}
/** Vasbeton lemez (alaplemez, födém) metszetben */
function slab(g, x0, x1, y, t, o = {}) {
  concrete(g, x0, y, x1 - x0, t, o.fresh ?? false);
  Ln(g, x0 + 2, y + 2.5, x1 - 2, y + 2.5, SK('rebar', 0.9));
  Ln(g, x0 + 2, y + t - 2.5, x1 - 2, y + t - 2.5, SK('rebar', 0.9));
  P(g, `M${x0} ${y} H${x1} V${y + t} H${x0}Z`, SK('conc2', 0.8));
}
/** Kis autó az utcán (top-down) */
function car(g, x, y, col = 'acc2') {
  const c = g_(g, { class: 'pr-car' });
  P(c, `M${x} ${y - 4} V${y - 10} Q${x} ${y - 12} ${x + 3} ${y - 12} H${x + 8} L${x + 12} ${y - 18} H${x + 24} L${x + 29} ${y - 12} H${x + 33} Q${x + 36} ${y - 12} ${x + 36} ${y - 9} V${y - 4}Z`, F(col) + `;stroke:${v('dark2')};stroke-width:.7`);
  P(c, `M${x + 13} ${y - 13} L${x + 15.5} ${y - 16.5} H${x + 22.5} L${x + 26} ${y - 13}Z`, 'fill:url(#pr-glass)');
  [x + 8, x + 28].forEach((cx) => { C(c, cx, y - 4, 4, F('dark')); C(c, cx, y - 4, 1.6, F('steel2')); });
}
/** Többszintes épület (szomszéd vagy felépítmény) */
function block(g, x, y, w, floors, o = {}) {
  const fh = o.fh ?? 17, b = g_(g, { class: 'pr-block' }), hh = floors * fh;
  R(b, x, y - hh, w, hh, F(o.col ?? 'wallh') + `;stroke:${v('wallh2')};stroke-width:.8`);
  for (let f = 0; f < floors; f++) for (let wx = x + 6; wx < x + w - 10; wx += 15) R(b, wx, y - hh + f * fh + 4, 9, fh - 8, 'fill:url(#pr-glass)' + `;stroke:${v('wallh2')};stroke-width:.6`);
  R(b, x - 2, y - hh - 3, w + 4, 3.5, F('wallh2'));
  return b;
}


/* ================================================================== munkatér: módszerek */
const PROC = {};

/* ---------------- Berlini (Siemens-) dúcolat – homlokzati nézet a munkatér felől */
const BX = [34, 92, 150, 208];
function bBeams(g, M, n, lev, o = {}) {
  // tartók furatban: a kiemelési szint alatt sovány beton veszi körül (befogás)
  BX.slice(0, n).forEach((x) => {
    R(g, x - 10, o.emb ?? 252, 20, 322 - (o.emb ?? 252), F('conc1')); R(g, x - 10, o.emb ?? 252, 20, 322 - (o.emb ?? 252), 'fill:url(#pr-p-conc)');
    Ln(g, x - 10, lev, x - 10, 322, SK('wall', 1)); Ln(g, x + 10, lev, x + 10, 322, SK('wall', 1)); Ln(g, x - 10, 322, x + 10, 322, SK('wall', 1));
    hbeamF(g, x, M.GY - 6, 318);
  });
}
PROC.berlini = {
  H: 360, GY: 130, layers: [{ k: 'fill', y: 130, lab: 'feltöltés' }, { k: 'sand', y: 156, lab: 'homokos kavics' }, { k: 'clay', y: 262, lab: EN ? 'clay' : 'agyag' }],
  steps: [
    { w: 264, t: 'Tartók furatba', d: 'Az acél I/H- vagy összekapcsolt U-tartókat sűrűn, 1,5–2,5 m-enként juttatják le: veréssel, vibrálással vagy – ma inkább csendesen – furatba helyezve és kibetonozva. A leendő gödörfenék alatt ott dolgozik a befogás.', draw(g, M) {
      bBeams(g, M, 2, M.GY);
      const x = 150, r = rig(g, M, x, { top: 14, headY: 70 });
      auger(g, x, r.headBot, 300, 10, { soilFrom: M.GY, soilTo: 296, soil: 'sand', pat: 'pr-p-sand' });
      holeWall(g, x, M.GY, 300, 10);
      spoil(g, M, x - 46, 26, 8, 'sand');
      tag(g, 34, 92, 'acéltartó', { anchor: 'middle', to: [34, 124] });
      tag(g, 70, 300, 'sovány beton', { anchor: 'middle', to: [88, 290] });
    } },
    { w: 252, t: 'Kiemelés, pallózás', d: 'Fogásonként kiemelik a földet, és a tartók közé párhuzamosan fa- vagy betonpallókat helyeznek; a fapallókat hevedergerendák és ékek feszítik a tartók közé. A szabadon álló földfal legfeljebb 0,5–1 m lehet.', draw(g, M) {
      const lev = 182;
      level(g, 0, 252, lev, { top: M.GY });
      bBeams(g, M, 4, lev);
      [[34, 92], [92, 150]].forEach(([a, b]) => boardsF(g, a + 4.5, b - 4.5, M.GY + 2, lev - 10));
      boardsF(g, 154.5, 203.5, M.GY + 2, lev - 26);
      excavator(g, at(M, lev), 120, lev + 2, { tool: 'dig', reach: 60, lift: 30, soil: 'sand' });
      tag(g, 62, 146, 'fapalló', { anchor: 'middle', to: [62, 160] });
      tag(g, 182, lev - 10, '≤ 0,5 m', { anchor: 'middle', fs: 9.5 });
    } },
    { w: 252, t: EN ? 'Waling, anchors' : 'Mellgerenda, horgony', d: 'Ha a fal konzolként már nem állna meg, a tartókat mellgerendával fogják össze, és horgonyokkal vagy dúcokkal támasztják meg.', draw(g, M) {
      const lev = 222, wy = 196;
      level(g, 0, 252, lev, { top: M.GY });
      bBeams(g, M, 4, lev);
      BX.slice(0, 3).forEach((a, i) => boardsF(g, a + 4.5, BX[i + 1] - 4.5, M.GY + 2, lev - 8));
      boardsF(g, 212.5, 252, M.GY + 2, lev - 8, { wedge: false });
      waleF(g, 0, 252, wy, { h: 11 });
      BX.forEach((x) => aheadF(g, x, wy));
      worker(g, 120, { GY: lev, pose: 'signal' });
      tag(g, 182, wy - 24, 'mellgerenda + horgonyfej', { anchor: 'middle', to: [208, wy - 6] });
    } },
    { w: 252, t: 'Gödörfenékig', d: 'A kiemelés és a pallózás lépésről lépésre, egymással lépést tartva halad a végleges gödörfenékig.', draw(g, M) {
      const lev = 252, wy = 196;
      level(g, 0, 252, lev, { top: M.GY });
      bBeams(g, M, 4, lev);
      BX.slice(0, 3).forEach((a, i) => boardsF(g, a + 4.5, BX[i + 1] - 4.5, M.GY + 2, lev - 6));
      boardsF(g, 212.5, 252, M.GY + 2, lev - 6, { wedge: false });
      waleF(g, 0, 252, wy, { h: 11 });
      BX.forEach((x) => aheadF(g, x, wy));
      excavator(g, at(M, lev), 74, lev + 2, { tool: 'dig', reach: 58, lift: 26, soil: 'clay' });
      tag(g, 150, 290, 'befogás', { anchor: 'middle', to: [150, 270] });
    } },
    { w: 264, t: 'Visszatöltés, bontás', d: 'A pallókat alulról felfelé, a rétegenként tömörített visszatöltéssel lépést tartva szedik ki; végül a tartókat kihúzzák – újra felhasználhatók.', draw(g, M) {
      const fy = 168;
      bBeams(g, M, 4, 252);
      backfill(g, 0, 264, fy, 252);
      [[34, 92], [150, 208]].forEach(([a, b]) => boardsF(g, a + 4.5, b - 4.5, M.GY + 2, fy - 1));
      boardsF(g, 212.5, 264, M.GY + 2, fy - 1, { wedge: false });
      // a középső mező pallói már kint, a tartót kihúzzák
      R(g, 96.5, M.GY, 49, fy - M.GY, F('dark', 0.1));
      R(g, 140, 292, 20, 30, F('sand')); R(g, 140, 292, 20, 30, 'fill:url(#pr-p-sand)');
      hbeamF(g, 92, M.GY - 6, 318);
      const top = vibroH(g, 150, 54);
      hbeamF(g, 150, 54, 290);
      crane(g, M, 150, top, { reach: 74, tipY: 14 });
      worker(g, 64, { GY: fy, pose: 'guide', dir: 1 });
      tag(g, 34, 216, 'visszatöltés', { anchor: 'middle' });
      arrowV(g, 176, 150, 110);
    } },
  ],
};

/* ---------------- Talajhorgony – metszet */
const HW = 128;                                       // a fal tengelye
function hWall(g, M, lev, o = {}) {
  pit(g, M, HW + 7, o.W ?? 300, lev);
  wallS(g, HW, M.GY, 330, { cap: true });
  block(g, 6, M.GY - 10, 84, 3);
  R(g, 0, M.GY - 10, 100, 10, F('wallh2'));
}
const hA = (y) => axis(HW + 15, y, 20, -1);           // a horgony tengelye (fej a hevederen)
PROC.horgony = {
  H: 360, GY: 120, layers: [{ k: 'fill', y: 120, lab: 'feltöltés' }, { k: 'sand', y: 146, lab: EN ? 'sand' : 'homok' }, { k: 'clay', y: 236, lab: EN ? 'clay' : 'agyag' }],
  steps: [
    { w: 290, t: 'Kiemelés a sor alá', d: 'A kiemelés csak kb. 0,5 m-rel mehet a horgonysor szintje alá – mélyebbre addig nem, amíg a horgony nem dolgozik.', draw(g, M) {
      const lev = 192;
      hWall(g, M, lev, { W: 290 });
      excavator(g, at(M, lev), 160, lev + 2, { tool: 'dig', reach: 56, lift: 30, soil: 'sand' });
      Ln(g, HW + 7, 178, 290, 178, SK('acc', 1.2, 'stroke-dasharray:5 4'));
      tag(g, 236, 168, EN ? 'anchor row' : 'horgonysor', { anchor: 'middle', fs: 9.5 });
      tag(g, 60, 288, 'cölöpfal vagy résfal', { anchor: 'middle', to: [HW - 4, 280] });
    } },
    { w: 300, t: 'Fúrás béléscsővel', d: 'A horgonyfúró 15–30°-os lejtéssel, béléscső védelmében fúr a fal mögé – akár a szomszéd telek alá is.', draw(g, M) {
      const lev = 192, A = hA(178);
      hWall(g, M, lev);
      boreA(g, A, 22, 132);
      anchorRig(g, at(M, lev), HW + 7, 178, 20, { head: 0.55 });
      tag(g, 40, 246, 'béléscső', { anchor: 'middle', to: A(100, 3) });
    } },
    { w: 290, t: 'Pászmák, injektálás', d: 'A feszítőpászmákat a furatba tolják, a befogott szakaszt cementhabarccsal injektálják, a béléscsövet kihúzzák; szükség esetén utóinjektálnak.', draw(g, M) {
      const lev = 192, A = hA(178);
      hWall(g, M, lev, { W: 290 });
      anchorA(g, A, 0, 76, 58);
      waleS(g, HW + 7, 178, 1);
      aheadS(g, A);
      const [ox, oy] = groutUnit(g, at(M, lev), 214);
      const [hx, hy] = A(-10, 0);
      P(g, `M${hx} ${hy} C${hx + 30} ${hy + 10} ${ox - 30} ${oy} ${ox} ${oy}`, SK('hose', 2.4));
      worker(g, 186, { GY: lev, pose: 'stand' });
      tag(g, 36, 300, 'befogott szakasz', { anchor: 'middle', to: A(108, 4) });
      tag(g, 106, 156, 'szabad szakasz', { anchor: 'middle', to: A(44, -2) });
    } },
    { w: 290, t: 'Feszítés, lekötés', d: 'A habarcs 8–12 nap alatt szilárdul. Ezután a horgonyt sajtóval próbaterhelik, és a tervezett erő 80–90%-ára lekötik.', draw(g, M) {
      const lev = 192, A = hA(178);
      hWall(g, M, lev, { W: 290 });
      anchorA(g, A, 0, 76, 58);
      waleS(g, HW + 7, 178, 1);
      aheadS(g, A);
      jackA(g, at(M, lev), A, 236);
      worker(g, 266, { GY: lev, pose: 'stand' });
      tag(g, 196, 140, 'feszítősajtó', { anchor: 'middle', to: A(-26, -8) });
      arrowP(g, `M${A(-44, 14).join(' ')} L${A(-74, 14).join(' ')}`, { w: 2.6 }); head(g, ...A(-78, 14), -20);
    } },
    { w: 290, t: 'Következő sor', d: 'A lekötött horgonysor alatt folytatódik a kiemelés a következő sor alá – a ciklus soronként ismétlődik a gödörfenékig.', draw(g, M) {
      const lev = 290;
      hWall(g, M, lev, { W: 290 });
      [178, 254].forEach((y) => { const A = hA(y); anchorA(g, A, 0, y > 200 ? 68 : 76, 54); waleS(g, HW + 7, y, 1); aheadS(g, A); });
      excavator(g, at(M, lev), 176, lev + 2, { tool: 'dig', reach: 52, lift: 24, soil: 'clay' });
      tag(g, 236, 236, EN ? '2nd anchor row' : '2. horgonysor', { anchor: 'middle', fs: 9.5 });
    } },
  ],
};


/* ---------- további munkatéri elemek */
/** Gödör tetszőleges sokszöggel (földpadka, lépcső): pts = [[x, y], …] a bal felső terepponttól a jobb felső terepig */
function pitP(g, M, ps) {
  const GY = M.GY, x0 = ps[0][0], x1 = ps[ps.length - 1][0];
  R(g, x0, GY - 4.8, x1 - x0, 4.8, F('hill'));
  P(g, `M${pts(...ps)}Z`, 'fill:url(#pr-pitg)');
  P(g, `M${pts(...ps.slice(1, -1))}`, SK('ground', 1.5, 'stroke-linejoin:round'));
}
/** Ferde acélcső (ferde dúc) két pont között */
function pipeL(g, x1, y1, x2, y2, r = 4.5) {
  const L = Math.hypot(x2 - x1, y2 - y1), ux = (x2 - x1) / L, uy = (y2 - y1) / L, nx = -uy * r, ny = ux * r;
  P(g, `M${pts([x1 + nx, y1 + ny], [x2 + nx, y2 + ny], [x2 - nx, y2 - ny], [x1 - nx, y1 - ny])}Z`, F('steel2') + `;stroke:${v('steel3')};stroke-width:.9`);
  Ln(g, x1 + nx * 0.4, y1 + ny * 0.4, x2 + nx * 0.4, y2 + ny * 0.4, SK('steel1', 1.2, 'opacity:.8'));
  for (const [x, y] of [[x1, y1], [x2, y2]]) P(g, `M${pts([x + nx * 1.7, y + ny * 1.7], [x - nx * 1.7, y - ny * 1.7])}`, SK('steel3', 3));
}
/** Vasbeton közműcső vagy acélcső keresztmetszetben */
function conduit(g, cx, cy, r) {
  C(g, cx, cy, r, 'fill:url(#pr-concg)' + `;stroke:${v('conc2')};stroke-width:1`);
  C(g, cx, cy, r * 0.74, F('dark2', 0.8));
  P(g, `M${cx - r * 0.5} ${cy + r * 0.45} Q${cx} ${cy + r * 0.62} ${cx + r * 0.5} ${cy + r * 0.45}`, SK('water', 1.2, 'opacity:.7'));
}
/** Lapvibrátor (döngölő) a kezelővel */
function rammer(g, x, gy) {
  R(g, x - 10, gy - 4, 20, 4, F('steel3'));
  R(g, x - 8, gy - 13, 14, 9, F('mach') + `;stroke:${v('mach3')};stroke-width:.8`, { rx: 2 });
  Ln(g, x + 4, gy - 12, x + 16, gy - 24, SK('dark2', 1.6, 'stroke-linecap:round'));
  worker(g, x + 24, { GY: gy, pose: 'guide', dir: -1 });
}
/** Dúcolódoboz (táblás dúcolat) metszetben: két acéltábla, köztük két támasz */
function tbox(g, x0, x1, top, bot) {
  for (const x of [x0, x1 - 8]) { R(g, x, top, 8, bot - top, 'fill:url(#pr-cyl)' + `;stroke:${v('steel3')};stroke-width:.9`); Ln(g, x + 4, top + 4, x + 4, bot - 4, SK('steel3', 0.8, 'opacity:.7')); }
  [top + (bot - top) * 0.22, top + (bot - top) * 0.62].forEach((y) => pipeH(g, x0 + 8, x1 - 8, y, { r: 3.4 }));
  P(g, `M${x0 + 4} ${top} V${top - 7} M${x1 - 4} ${top} V${top - 7}`, SK('steel3', 2));
  C(g, x0 + 4, top - 8, 2.2, SK('steel3', 1.2)); C(g, x1 - 4, top - 8, 2.2, SK('steel3', 1.2));
  return [x0 + 4, top - 10, x1 - 4];
}
/** Szádfal vezetőkerete homlokzatban: két vízszintes gerenda oszlopokon */
function guideF(g, x0, x1, y, o = {}) {
  [x0 + 10, x1 - 10].forEach((x) => { R(g, x - 3, y - 4, 6, o.gy - y + 4, F('steel3')); });
  [y, y + 13].forEach((yy) => R(g, x0, yy - 3.5, x1 - x0, 7, 'fill:url(#pr-cylh)' + `;stroke:${v('steel3')};stroke-width:.8`));
}
/** CSM marófej: két pár ellentétesen forgó marókerék keretben, felette kellyrúd; (cx, bot): a kerekek alja */
function csm(g, cx, bot, o = {}) {
  const c = g_(g, { class: 'pr-csm' }), w = o.w ?? 46;
  R(c, cx - 5, (o.top ?? bot - 200), 10, bot - 30 - (o.top ?? bot - 200), 'fill:url(#pr-cyl)');
  R(c, cx - w / 2 + 4, bot - 46, w - 8, 22, F('mach') + `;stroke:${v('mach3')};stroke-width:.9`, { rx: 2 });
  R(c, cx - w / 2 + 4, bot - 46, w - 8, 5, F('mach2'));
  for (const k of [-1, 1]) {
    const wx = cx + k * (w / 4 + 1.5), wy = bot - 12;
    C(c, wx, wy, 11.5, F('steel3'));
    for (let i = 0; i < 10; i++) { const a = (i / 10) * Math.PI * 2 + k * 0.3; P(c, `M${wx + Math.cos(a) * 10.5} ${wy + Math.sin(a) * 10.5} L${wx + Math.cos(a + 0.18) * 14} ${wy + Math.sin(a + 0.18) * 14} L${wx + Math.cos(a + 0.36) * 10.5} ${wy + Math.sin(a + 0.36) * 10.5}Z`, F('dark2')); }
    C(c, wx, wy, 6, F('steel2')); C(c, wx, wy, 2, F('dark'));
  }
  if (o.spin) for (const k of [-1, 1]) { const wx = cx + k * (w / 4 + 1.5); arrowP(c, `M${wx - k * 7} ${bot - 30} A 9 9 0 0 ${k > 0 ? 0 : 1} ${wx + k * 9} ${bot - 18}`, { w: 2 }); }
  return c;
}
/** Uszály (ponton) a vízen; visszaadja a fedélzet magasságát */
function barge(g, x0, x1, wl) {
  const b = g_(g, { class: 'pr-barge' }), dk = wl - 8;
  P(b, `M${x0} ${dk} H${x1} L${x1 - 8} ${wl + 9} H${x0 + 6}Z`, F('dark2') + `;stroke:${v('dark')};stroke-width:.8`);
  R(b, x0, dk - 2, x1 - x0, 3, F('steel3'));
  R(b, x0 + 4, wl - 1, x1 - x0 - 12, 3, F('acc', 0.85));
  return dk - 2;
}
/** Fagyasztócső (kettős cső) a talajban */
function freezePipe(g, cx, top, bot) {
  R(g, cx - 2.6, top, 5.2, bot - top, 'fill:url(#pr-cyl)');
  Ln(g, cx, top + 3, cx, bot - 3, SK('water', 0.9, 'opacity:.8'));
  R(g, cx - 3.6, top - 3, 7.2, 4, F('steel3'));
}
/** Fagyott talajtest (jéghenger vagy összefüggő jégfal) */
function ice(g, cx, top, bot, half) {
  R(g, cx - half, top, half * 2, bot - top, 'fill:url(#pr-iceg)', { rx: Math.min(half, 10) });
  R(g, cx - half, top, half * 2, bot - top, 'fill:url(#pr-p-ice)', { rx: Math.min(half, 10) });
  R(g, cx - half, top, half * 2, bot - top, SK('ice2', 0.9), { rx: Math.min(half, 10) });
}
/** Hűtőgép-konténer (sólé) ventilátorokkal; visszaadja az előremenő vezeték kezdőpontját */
function freezePlant(g, M, x) {
  const GY = M.GY, p = g_(g, { class: 'pr-freeze' });
  R(p, x, GY - 26, 56, 26, F('cont') + `;stroke:${v('cont3')};stroke-width:.8`, { rx: 1.5 });
  for (let i = 4; i < 54; i += 4) Ln(p, x + i, GY - 24, x + i, GY - 2, SK('cont3', 0.7, 'opacity:.55'));
  [x + 14, x + 34].forEach((cx) => { C(p, cx, GY - 30, 7, F('steel2') + `;stroke:${v('steel3')};stroke-width:.8`); P(p, `M${cx - 5} ${GY - 30} H${cx + 5} M${cx} ${GY - 35} V${GY - 25}`, SK('dark2', 1.4)); });
  R(p, x + 44, GY - 34, 8, 8, F('halo') + `;stroke:${v('dark2')};stroke-width:.8`);
  return [x, GY - 18];
}
/** Vasbeton pillér metszetben (zsalu nélkül) */
function pier(g, cx, base, top, half) {
  concrete(g, cx - half, top, half * 2, base - top, false);
  P(g, `M${cx - half} ${base} V${top} H${cx + half} V${base}`, SK('conc2', 0.9));
  for (const k of [-1, 1]) Ln(g, cx + k * (half - 3), top - 8, cx + k * (half - 3), base - 3, SK('rebar', 1.1));
}

/** Függőleges méretvonal felirattal */
function dimV(g, x, y1, y2, label, o = {}) {
  Ln(g, x, y1, x, y2, SK('labline', 1));
  P(g, `M${x - 3} ${y1} h6 M${x - 3} ${y2} h6`, SK('labline', 1));
  if (label) tag(g, x + (o.dx ?? -6), o.ly ?? (y1 + y2) / 2, label, { anchor: o.anchor ?? 'end', fs: 9.5 });
}

/* ---------------- Munkaárok dúcolása – keresztmetszet */
const AL = 96, AR = 150;
function arokPlanks(g, M, bot) { plankS(g, AL, M.GY - 6, bot, 1); plankS(g, AR, M.GY - 6, bot, -1); }
function arokRow(g, y) { const a = waleS(g, AL + 3.6, y, 1, { w: 7, h: 12 }), b = waleS(g, AR - 3.6, y, -1, { w: 7, h: 12 }); propH(g, a, b, y); }
PROC.arok = {
  H: 330, GY: 120, layers: [{ k: 'fill', y: 120, lab: 'feltöltés' }, { k: 'clay', y: 142, lab: EN ? 'silty clay' : 'iszapos agyag', ly: 200 }, { k: 'silt', y: 262, lab: EN ? 'silt' : 'iszap' }],
  steps: [
    { w: 236, t: 'Első fogás', d: 'Az árkot először csak addig mélyítik, ameddig a földfal megtámasztás nélkül biztosan megáll (m₀).', draw(g, M) {
      pit(g, M, AL, AR, 166);
      spoil(g, M, 14, 56, 15);
      excavator(g, M, 123, 164, { tool: 'dig', reach: 50, lift: 58 });
      dimV(g, AL - 8, M.GY, 166, 'm₀', { ly: 156 });
    } },
    { w: 236, t: 'Pallózás, dúcolás', d: 'A földfalakat pallókkal terítik be, ezeket hevederek fogják össze, a hevedereket csavaros acéldúcok feszítik szembe.', draw(g, M) {
      pit(g, M, AL, AR, 166);
      spoil(g, M, 14, 56, 15);
      arokPlanks(g, M, 166);
      arokRow(g, 142);
      worker(g, 123, { GY: 166, pose: 'guide', dir: 1 });
      tag(g, 46, 186, 'palló', { anchor: 'middle', to: [AL + 2, 180] });
      tag(g, 200, 104, 'csavaros dúc', { anchor: 'middle', to: [123, 140] });
    } },
    { w: 236, t: 'Mélyítés, utánhajtás', d: 'Lépcsőnként mélyítenek, a pallókat utánhajtják, és újabb heveder–dúc sort építenek be.', draw(g, M) {
      pit(g, M, AL, AR, 240);
      spoil(g, M, 10, 64, 20);
      arokPlanks(g, M, 240);
      arokRow(g, 142); arokRow(g, 200);
      excavator(g, M, 123, 238, { tool: 'dig', reach: 50, lift: 120 });
      arrowV(g, AL - 10, 118, 150, { w: 2.4, s: 7 }); arrowV(g, AR + 10, 118, 150, { w: 2.4, s: 7 });
    } },
    { w: 236, t: 'Csőfektetés', d: 'A vezetéket a dúcsorok közötti szabad térben engedik le, és ágyazatra fektetik. A dúcokon átjárni vagy állni tilos.', draw(g, M) {
      pit(g, M, AL, AR, 240);
      arokPlanks(g, M, 240);
      R(g, AL + 3.6, 230, AR - AL - 7.2, 10, F('gravel')); R(g, AL + 3.6, 230, AR - AL - 7.2, 10, 'fill:url(#pr-p-gravel)');
      conduit(g, 130, 216, 14);
      arokRow(g, 142); arokRow(g, 186);
      worker(g, 106, { GY: 230, pose: 'guide', dir: 1, s: 0.9 });
      excavator(g, M, 130, 200, { reach: 52, lift: 76 });
      tag(g, 46, 214, 'ágyazat', { anchor: 'middle', to: [AL + 6, 234] });
    } },
    { w: 236, t: 'Visszatöltés, bontás', d: 'Rétegenként (15–20 cm) tömörítve töltenek vissza; a dúcokat alulról felfelé bontják – egy dúc csak akkor jöhet ki, ha alatta már föld támaszt.', draw(g, M) {
      pit(g, M, AL, AR, 240);
      arokPlanks(g, M, 240);
      backfill(g, AL + 3.6, AR - 3.6, 178, 240);
      conduit(g, 130, 216, 14);
      arokRow(g, 142);
      rammer(g, 112, 178);
      tag(g, 200, 214, 'visszatöltés', { anchor: 'middle', to: [AR - 6, 214] });
    } },
  ],
};

/* ---------------- Táblás dúcolat (dúcolódoboz) – keresztmetszet */
const TL = 92, TR = 160;
PROC.tablas = {
  H: 330, GY: 120, layers: [{ k: 'fill', y: 120, lab: 'feltöltés' }, { k: 'sand', y: 140, lab: EN ? 'sand' : 'homok' }, { k: 'clay', y: 270, lab: EN ? 'clay' : 'agyag' }],
  steps: [
    { w: 250, t: 'A doboz behelyezése', d: 'Az előre kiemelt árokba a kotrógép láncon beemeli a dúcolódobozt: két acéltábla, köztük állítható támaszok.', draw(g, M) {
      pit(g, M, TL, TR, 176);
      spoil(g, M, 10, 60, 16, 'sand');
      const [lx, ly, rx] = tbox(g, TL + 3, TR - 3, 104, 184);
      P(g, `M${lx} ${ly} L${(lx + rx) / 2} ${ly - 30} L${rx} ${ly}`, SK('rope', 1.1));
      excavator(g, M, (lx + rx) / 2, ly - 30, { reach: 50, lift: 30 });
    } },
    { w: 250, t: 'Ásás és süllyesztés', d: 'A dobozon belül ásnak, legfeljebb kb. 0,5 m-rel előre, majd a dobozt a kanállal lenyomják – a kettő felváltva halad.', draw(g, M) {
      pit(g, M, TL, TR, 214);
      spoil(g, M, 10, 64, 20, 'sand');
      tbox(g, TL + 1, TR - 1, M.GY - 6, 196);
      R(g, TL, 196, TR - TL, 18, F('dark', 0.06));
      excavator(g, M, 126, 212, { tool: 'dig', reach: 56, lift: 116, soil: 'sand' });
      dimV(g, TL - 8, 196, 214, '≤ 0,5 m');
      arrowV(g, TL - 2, 82, 108, { w: 2.4, s: 7 }); arrowV(g, TR + 2, 82, 108, { w: 2.4, s: 7 });
    } },
    { w: 250, t: 'Csőfektetés', d: 'A tervezett mélységben a munkások a doboz védelmében fektetik le a vezetéket.', draw(g, M) {
      pit(g, M, TL, TR, 252);
      tbox(g, TL + 1, TR - 1, M.GY - 6, 250);
      R(g, TL + 9, 242, TR - TL - 18, 10, F('gravel')); R(g, TL + 9, 242, TR - TL - 18, 10, 'fill:url(#pr-p-gravel)');
      conduit(g, 134, 228, 14);
      worker(g, 106, { GY: 242, pose: 'guide', dir: 1, s: 0.9 });
      tag(g, 210, 200, 'dúcolódoboz', { anchor: 'middle', to: [TR - 4, 200] });
    } },
    { w: 250, t: 'Előrehúzás, visszatöltés', d: 'A dobozt az árok mentén előrehúzzák vagy szakaszonként kiemelik; mögötte rétegenként tömörítve visszatöltenek.', draw(g, M) {
      pit(g, M, TL, TR, 252);
      backfill(g, TL, TR, 200, 252);
      conduit(g, 134, 228, 14);
      const [lx, ly, rx] = tbox(g, TL + 1, TR - 1, 106, 200);
      P(g, `M${lx} ${ly} L${(lx + rx) / 2} ${ly - 26} L${rx} ${ly}`, SK('rope', 1.1));
      excavator(g, M, (lx + rx) / 2, ly - 26, { reach: 52, lift: 26 });
      arrowV(g, TL - 12, 150, 118, { w: 2.4, s: 7 });
      tag(g, 42, 226, 'visszatöltés', { anchor: 'middle', to: [TL + 6, 226] });
    } },
  ],
};

/* ---------------- Ferde dúcok a gödör aljára – keresztmetszet */
const FW = 40;
function fBeam(g, M) { R(g, FW - 9, 250, 18, 70, F('conc1')); R(g, FW - 9, 250, 18, 70, 'fill:url(#pr-p-conc)'); hbeamS(g, FW, M.GY - 6, 316); }
PROC.ferde = {
  H: 340, GY: 120, layers: [{ k: 'fill', y: 120, lab: 'feltöltés' }, { k: 'sand', y: 144, lab: EN ? 'sand' : 'homok' }, { k: 'clay', y: 228, lab: EN ? 'clay' : 'agyag' }],
  steps: [
    { w: 270, t: 'Földpadka', d: 'A fal mellett rézsűs földpadkát hagynak, a gödör közepét pedig a végleges mélységig kiemelik.', draw(g, M) {
      pitP(g, M, [[FW + 4, M.GY], [FW + 4, 150], [66, 150], [160, 250], [270, 250], [270, M.GY]]);
      fBeam(g, M);
      excavator(g, at(M, 250), 182, 252, { tool: 'dig', reach: 44, lift: 26 });
      tag(g, 84, 214, 'földpadka', { anchor: 'middle' });
    } },
    { w: 260, t: 'Alaplemez középen', d: 'A gödör közepén – a padka lábán túl – elkészül az alaplemez belső része.', draw(g, M) {
      pitP(g, M, [[FW + 4, M.GY], [FW + 4, 150], [66, 150], [160, 250], [260, 250], [260, M.GY]]);
      fBeam(g, M);
      slab(g, 168, 260, 238, 12);
      worker(g, 214, { GY: 238, pose: 'stand' });
      tag(g, 214, 274, EN ? 'base slab' : 'alaplemez', { anchor: 'middle', to: [214, 250] });
    } },
    { w: 260, t: 'Ferde dúcok', d: 'A falat hevederrel és ferde acéldúcokkal a kész lemezre támasztják. A dúc függőleges összetevője emeli a falat – laposnak kell lennie.', draw(g, M) {
      pitP(g, M, [[FW + 4, M.GY], [FW + 4, 150], [66, 150], [160, 250], [260, 250], [260, M.GY]]);
      fBeam(g, M);
      slab(g, 168, 260, 238, 12);
      R(g, 170, 224, 16, 14, F('conc1') + `;stroke:${v('conc2')};stroke-width:.8`);
      waleS(g, FW + 4, 140, 1, { w: 8, h: 14 });
      pipeL(g, FW + 14, 141, 176, 226, 4.6);
      tag(g, 150, 166, 'ferde dúc', { anchor: 'middle', to: [118, 186] });
    } },
    { w: 260, t: 'A padka bontása', d: 'A padkát szakaszosan, mezőnként bontják el a dúcok alatt – a többi mezőben addig a föld támaszt.', draw(g, M) {
      pitP(g, M, [[FW + 4, M.GY], [FW + 4, 230], [62, 250], [260, 250], [260, M.GY]]);
      fBeam(g, M);
      slab(g, 168, 260, 238, 12);
      R(g, 170, 224, 16, 14, F('conc1') + `;stroke:${v('conc2')};stroke-width:.8`);
      waleS(g, FW + 4, 140, 1, { w: 8, h: 14 });
      pipeL(g, FW + 14, 141, 176, 226, 4.6);
      excavator(g, at(M, 250), 66, 252, { tool: 'dig', reach: 40, lift: 20 });
    } },
    { w: 260, t: 'Lemez és pincefal', d: 'A peremen elkészül a lemez és a pincefal; a ferde dúc csak ezután, a pincei szerkezet elkészültével bontható.', draw(g, M) {
      pit(g, M, FW + 4, 260, 250);
      fBeam(g, M);
      slab(g, FW + 4, 260, 238, 12);
      concrete(g, 64, 150, 12, 88, true);
      P(g, `M64 238 V150 H76 V238`, SK('conc2', 0.8));
      slab(g, 64, 260, 150, 9, { fresh: true });
      worker(g, 200, { GY: 150, pose: 'stand' });
      tag(g, 160, 200, EN ? 'basement wall' : 'pincefal', { anchor: 'middle', to: [76, 200] });
    } },
  ],
};

/* ---------------- Jet-grouting fal – homlokzat */
const JP = [34, 86, 138, 190], JS = [60, 112, 164], JH = 15;
function jcol(g, x, top = 130, bot = 300, o = {}) {
  column(g, x, top, bot, JH, 'jet');
  if (o.beam) hbeamF(g, x, top - 8, bot - 10, { w: 7, hidden: !o.show });
}
PROC.jet = {
  H: 360, GY: 130, gw: 214, layers: [{ k: 'fill', y: 130, lab: 'feltöltés' }, { k: 'sand', y: 152, lab: EN ? 'sand' : 'homok' }, { k: 'gravel', y: 250, lab: EN ? 'gravel' : 'kavics' }],
  steps: [
    { w: 236, t: 'Fúrás', d: 'A kis fúrógép kb. 10–15 cm-es furatot mélyít a tervezett oszlop aljáig.', draw(g, M) {
      jcol(g, 34, M.GY, 300, { beam: true });
      const x = 86, r = smallRig(g, M, x, { top: M.GY - 116, headY: M.GY - 92 });
      jetTool(g, x, r.headBot, 288);
      holeWall(g, x, M.GY, 300, 4);
      tag(g, 34, 330, 'kész oszlop', { anchor: 'middle', to: [34, 300] });
    } },
    { w: 252, t: 'Jetelés', d: 'Forgatva, 25–35 cm/perc sebességgel húzva a 350–400 bar nyomású cementhabarcs-sugár felaprózza és kötőanyaggal keveri a talajt: 50–120 cm-es talajbeton oszlop készül, a felesleg visszafolyó cementhabarcsként jön fel.', draw(g, M) {
      jcol(g, 34, M.GY, 300, { beam: true });
      const x = 86, y = 228;
      column(g, x, y + 6, 300, JH, 'jet');
      R(g, x - 4, M.GY, 8, y - M.GY, 'fill:url(#pr-slurryg)');
      const r = smallRig(g, M, x, { top: M.GY - 116, headY: M.GY - 60 });
      jetTool(g, x, r.headBot, y, { jet: 22 });
      spin(g, x, y - 26, 16);
      arrowV(g, x + 26, 274, 242, { w: 2.4, s: 7 });
      spoil(g, M, x - 40, 30, 7, 'silt');
      tag(g, 112, 168, 'visszafolyó habarcs', { anchor: 'start', to: [x + 4, 176] });
    } },
    { w: 236, t: 'Acéltag', d: 'A még folyós oszlopba – a fúrószárral átjárt tengelyébe – acél I/H-szelvényt engednek.', draw(g, M) {
      jcol(g, 34, M.GY, 300, { beam: true });
      jcol(g, 86, M.GY, 300);
      hbeamF(g, 86, 194, 290, { w: 7, hidden: true });
      hbeamF(g, 86, 60, 194, { w: 7 });
      P(g, `M82 60 L86 46 L90 60`, SK('rope', 1.1));
      crane(g, M, 86, 46, { reach: 82, tipY: 12 });
      worker(g, 106, { GY: M.GY, pose: 'guide' });
      arrowV(g, 64, 76, 112, { w: 2.4, s: 7 });
    } },
    { w: 252, t: 'Közbenső oszlopok', d: 'A primer oszlopok közé szekunder oszlopok kerülnek; az összemetszés zárja a falat, így az kvázi vízzáró.', draw(g, M) {
      JP.forEach((x) => jcol(g, x, M.GY, 300, { beam: true }));
      jcol(g, 60, M.GY, 300);
      const x = 112, y = 212;
      column(g, x, y + 6, 300, JH + 1, 'jet');
      R(g, x - 4, M.GY, 8, y - M.GY, 'fill:url(#pr-slurryg)');
      const r = smallRig(g, M, x, { top: M.GY - 116, headY: M.GY - 70 });
      jetTool(g, x, r.headBot, y, { jet: 22 });
      tag(g, 60, 330, EN ? 'secondary' : 'szekunder', { anchor: 'middle', to: [60, 300] });
      tag(g, 190, 330, EN ? 'primary' : 'primer', { anchor: 'middle', to: [190, 300] });
    } },
    { w: 252, t: 'Kiemelés, megtámasztás', d: 'Szilárdulás után kiemelnek; a falat mellgerendával és horgonyokkal támasztják meg. Pallózás nem kell, az acélt szilárd talajbeton veszi körül.', draw(g, M) {
      const lev = 244;
      level(g, 0, 252, lev, { top: M.GY, shade: false });
      [...JS, 216].forEach((x) => jcol(g, x, M.GY, 300));
      JP.forEach((x) => jcol(g, x, M.GY, 300, { beam: true }));
      waleF(g, 0, 252, 186, { h: 11 });
      JP.forEach((x) => aheadF(g, x, 186));
      excavator(g, at(M, lev), 90, lev + 2, { tool: 'dig', reach: 52, lift: 22, soil: 'gravel' });
      sump(g, 234, lev, 236, lev - 1);
    } },
  ],
};

/* ---------------- Erősített önszilárduló zagyfal – homlokzat */
const ZB = [40, 70, 100], ZP1 = [22, 118], ZP2 = [118, 214];
function zGuide(g, M, x1) { R(g, 10, M.GY - 3, x1 - 10, 14, 'fill:url(#pr-concg)' + `;stroke:${v('conc2')};stroke-width:.7`); }
function zPanel(g, M, [a, b], kind, bot = 300) {
  const top = M.GY + 11;
  if (kind === 'slurry') slurry(g, a, top, b - a, bot - top);
  else { R(g, a, M.GY + 2, b - a, bot - M.GY - 2, 'fill:url(#pr-groutg)'); R(g, a, M.GY + 2, b - a, bot - M.GY - 2, 'fill:url(#pr-p-slurry)'); }
  Ln(g, a, top, a, bot, SK('wall', 1)); Ln(g, b, top, b, bot, SK('wall', 1)); Ln(g, a, bot, b, bot, SK('wall', 1));
}
PROC.zagyfal = {
  H: 360, GY: 130, gw: 196, layers: [{ k: 'fill', y: 130, lab: 'feltöltés' }, { k: 'sand', y: 152, lab: EN ? 'sand' : 'homok' }, { k: 'clay2', y: 268, lab: EN ? 'clay' : 'agyag' }],
  steps: [
    { w: 250, t: 'Markolás zagy alatt', d: 'A rést résvezető gerendák között réselőgéppel (markolóval) – kisebb mélységnél hidraulikus kotróval – emelik ki; a kiemeléssel együtt önszilárduló zagy (bentonitzagy + cement) tölti ki és támasztja meg.', draw(g, M) {
      zGuide(g, M, 140);
      zPanel(g, M, ZP1, 'slurry');
      const gr = grab(g, 70, 286, 18, 0.4);
      crane(g, M, 70, gr.top - 4, { reach: 108, tipY: 14 });
      tag(g, 196, 250, EN ? 'cement–bentonite slurry' : 'cement–bentonit zagy', { anchor: 'middle', to: [112, 250] });
    } },
    { w: 250, t: 'Acélszelvények', d: 'A folyékony zagyba sűrűn, 1–2 m-enként acél I/H-gerendákat állítanak, és a résvezetőn rögzítik: ezek adják a nyomatéki teherbírást.', draw(g, M) {
      zGuide(g, M, 140);
      zPanel(g, M, ZP1, 'slurry');
      [40, 70].forEach((x) => hbeamF(g, x, M.GY - 8, 292, { w: 8 }));
      hbeamF(g, 100, 98, 260, { w: 8 });
      R(g, ZP1[0] + 1, M.GY + 12, ZP1[1] - ZP1[0] - 2, 300 - M.GY - 13, 'fill:url(#pr-slurryg)', { opacity: 0.5 });
      hbeamF(g, 100, 98, M.GY + 12, { w: 8 });
      P(g, `M96 98 L100 84 L104 98`, SK('rope', 1.1));
      crane(g, M, 100, 84, { reach: 84, tipY: 14 });
      worker(g, 136, { GY: M.GY - 3, pose: 'guide' });
      tag(g, 40, 70, 'acélszelvény', { anchor: 'middle', to: [40, 122] });
    } },
    { w: 250, t: 'Szilárdulás', d: 'Beton nem kerül a résbe: a cementtartalmú zagy magától megszilárdul (egyfázisú eljárás). Közben a szomszédos panel készül.', draw(g, M) {
      zGuide(g, M, 236);
      zPanel(g, M, ZP1, 'hard');
      ZB.forEach((x) => hbeamF(g, x, M.GY - 8, 292, { w: 8, hidden: true }));
      zPanel(g, M, ZP2, 'slurry');
      const gr = grab(g, 166, 270, 18, 0.2);
      crane(g, M, 166, gr.top - 4, { reach: 64, tipY: 14 });
      tag(g, 70, 330, 'szilárduló zagy', { anchor: 'middle', to: [70, 300] });
    } },
    { w: 250, t: 'Kiemelés', d: 'A kiemelés 2–4 hét múlva kezdődhet. A szilárd zagy boltozatként adja át a földnyomást az acélgerendáknak; a szabad felületet fólia védi. Ideiglenes fal: később elbontható.', draw(g, M) {
      const lev = 238;
      zPanel(g, M, ZP1, 'hard'); zPanel(g, M, ZP2, 'hard'); zPanel(g, M, [214, 260], 'hard');
      level(g, 0, 250, lev, { top: M.GY, shade: false });
      [...ZB, 130, 160, 190, 220].forEach((x) => hbeamF(g, x, M.GY - 8, 292, { w: 8, hidden: true }));
      R(g, 0, M.GY + 2, 250, lev - M.GY - 2, F('halo', 0.16));
      waleF(g, 0, 250, 176, { h: 11 });
      [40, 100, 160, 220].forEach((x) => pipeEndF(g, x, 176));
      excavator(g, at(M, lev), 96, lev + 2, { tool: 'dig', reach: 48, lift: 22 });
      tag(g, 70, 152, 'mellgerenda + dúc', { anchor: 'middle', to: [100, 170] });
    } },
  ],
};

/* ---------------- Mélykevert (CSM) fal – homlokzat */
const CP1 = [20, 72], CP2 = [124, 176], CS1 = [66, 130];
function cPanel(g, M, [a, b], o = {}) {
  const top = o.top ?? M.GY + 2, bot = o.bot ?? 300;
  R(g, a, top, b - a, bot - top, 'fill:url(#pr-mixg)', { opacity: o.op ?? 1 });
  R(g, a, top, b - a, bot - top, 'fill:url(#pr-p-mix)');
  Ln(g, a, top, a, bot, SK('wall', 1)); Ln(g, b, top, b, bot, SK('wall', 1)); Ln(g, a, bot, b, bot, SK('wall', 1));
}
PROC.dsm = {
  H: 360, GY: 130, gw: 210, layers: [{ k: 'fill', y: 130, lab: 'feltöltés' }, { k: 'sand', y: 152, lab: EN ? 'sand' : 'homok' }, { k: 'silt', y: 246, lab: EN ? 'silt' : 'iszap' }],
  steps: [
    { w: 252, t: 'Lefelé: marás', d: 'A marófej két pár, ellentétesen forgó kereke lefelé menet aprítja a talajt, közben zagyot adagolnak.', draw(g, M) {
      const x = 46, bot = 232;
      R(g, 14, M.GY - 2, 70, 10, F('bore'));
      cPanel(g, M, CP1, { bot: bot - 20, op: 0.55 });
      const r = rig(g, M, x, { top: 12, headY: 40 });
      csm(g, x, bot, { top: r.headBot, spin: true });
      arrowV(g, x - 34, 160, 214, { w: 2.4, s: 7 });
      silo(g, M, 222, { h: 76, band: 'acc2' });
      tag(g, 128, 286, 'marókerekek', { anchor: 'middle', to: [x + 14, bot - 10] });
    } },
    { w: 252, t: 'Felfelé: keverés', d: 'A talpon a kerekek visszafordulnak, és felfelé menet homogén talajbetonná keverik a táblát – csak kötőanyagot visznek be, a helyi talajt keverik át.', draw(g, M) {
      const x = 46, bot = 206;
      R(g, 14, M.GY - 2, 70, 10, F('bore'));
      cPanel(g, M, CP1, { top: M.GY + 2, bot: bot - 40, op: 0.55 });
      cPanel(g, M, CP1, { top: bot - 6, bot: 300 });
      const r = rig(g, M, x, { top: 12, headY: 14 });
      csm(g, x, bot, { top: r.headBot });
      arrowV(g, x - 34, 214, 166, { w: 2.4, s: 7 });
      silo(g, M, 222, { h: 76, band: 'acc2' });
      tag(g, 128, 320, EN ? 'soil concrete' : 'talajbeton', { anchor: 'middle', to: [52, 300] });
    } },
    { w: 236, t: 'Acélgerenda', d: 'A friss keverékbe acél I/H-szelvényeket állítanak; a következő primer panel már készülhet.', draw(g, M) {
      cPanel(g, M, CP1);
      hbeamF(g, 34, M.GY - 8, 290, { w: 8, hidden: true });
      hbeamF(g, 58, 166, 290, { w: 8, hidden: true });
      hbeamF(g, 58, 40, 166, { w: 8 });
      P(g, `M54 40 L58 26 L62 40`, SK('rope', 1.1));
      crane(g, M, 58, 26, { reach: 96, tipY: 8 });
      worker(g, 18, { GY: M.GY, pose: 'guide', dir: 1 });
    } },
    { w: 252, t: EN ? 'Secondary panel' : 'Szekunder panel', d: 'Előbb a primer, aztán a közéjük belemaró szekunder panelek készülnek – így a fal folytonos és vízzáró.', draw(g, M) {
      const x = 98, bot = 262;
      cPanel(g, M, CP1); cPanel(g, M, CP2);
      [34, 58, 138, 162].forEach((xx) => hbeamF(g, xx, M.GY - 8, 290, { w: 8, hidden: true }));
      cPanel(g, M, CS1, { bot: bot - 24, op: 0.55 });
      const r = rig(g, M, x, { top: 12, headY: 54 });
      csm(g, x, bot, { top: r.headBot, w: 60, spin: true });
      big(g, 46, 316, 'P'); big(g, 150, 316, 'P'); big(g, 98, 330, 'S');
    } },
    { w: 252, t: 'Kiemelés', d: 'Szilárdulás után kiemelnek, a falat mellgerendával és horgonyokkal vagy dúcokkal támasztják meg.', draw(g, M) {
      const lev = 240;
      [CP1, CP2, [176, 252]].forEach((p) => cPanel(g, M, p));
      [CS1, [170, 234]].forEach((p) => cPanel(g, M, p));
      level(g, 0, 252, lev, { top: M.GY, shade: false });
      [34, 58, 98, 138, 162, 202, 226].forEach((xx) => hbeamF(g, xx, M.GY - 8, 290, { w: 8, hidden: true }));
      waleF(g, 0, 252, 184, { h: 11 });
      [34, 98, 162, 226].forEach((x) => aheadF(g, x, 184));
      excavator(g, at(M, lev), 118, lev + 2, { tool: 'dig', reach: 48, lift: 22, soil: 'silt' });
    } },
  ],
};

/* ---------------- Acél szádfal – homlokzat */
const SZ = (i) => 6 + i * 26;
PROC.szad = {
  H: 360, GY: 150, gw: 206, layers: [{ k: 'fill', y: 150, lab: 'feltöltés' }, { k: 'sand', y: 172, lab: EN ? 'sand' : 'homok' }, { k: 'gravel', y: 262, lab: EN ? 'gravel' : 'kavics' }],
  steps: [
    { w: 250, t: 'Vezetőkeret, beállítás', d: 'A pallókat – többnyire gyárilag párosítva – vezetőkeretbe állítják, hogy a fal egyenes és függőleges legyen.', draw(g, M) {
      guideF(g, 0, 250, 116, { gy: M.GY });
      [0, 1, 2, 3].forEach((i) => sheetF(g, SZ(i), [70, 62, 66, 58][i], [M.GY + 72, M.GY + 80, M.GY + 76, M.GY + 84][i]));
      sheetF(g, SZ(4), 34, 140);
      P(g, `M${SZ(4) + 13} 34 L${SZ(4) + 13} 22`, SK('rope', 1.1));
      crane(g, M, SZ(4) + 13, 22, { reach: 84, tipY: 6 });
      worker(g, SZ(5) + 30, { GY: M.GY, pose: 'guide' });
      tag(g, 44, 136, 'vezetőkeret', { anchor: 'middle', to: [64, 118] });
    } },
    { w: 250, t: 'Lehajtás vibrálással', d: 'A vibrátor ellentétesen forgó excentertömegei „elfolyósítják” a szemcsés talajt a palló mentén. A táblákat lépcsősen, egyesével vagy 2–4 elemet összefogva hajtják le.', draw(g, M) {
      guideF(g, 0, 250, 116, { gy: M.GY });
      [0, 1, 2, 3, 4, 5].forEach((i) => sheetF(g, SZ(i), [140, 140, 140, 96, 70, 58][i], [300, 300, 300, 256, 230, 218][i]));
      excavator(g, M, SZ(4) + 13, 70, { tool: 'vibro', reach: 72, lift: 34 });
      arrowV(g, SZ(4) - 10, 150, 196, { w: 2.4, s: 7 });
      tag(g, 46, 330, 'szádpalló-pár', { anchor: 'middle', to: [SZ(1) + 13, 300] });
    } },
    { w: 252, t: 'Kiemelés, megtámasztás', d: 'A vízzáró fal védelmében kiemelnek; a mellgerendára támaszkodó acél csőtámaszok (vagy horgonyok) a fal tetejét és közepét fogják meg.', draw(g, M) {
      const lev = 256;
      for (let i = 0; i < 10; i++) sheetF(g, SZ(i), M.GY - 10, 306);
      level(g, 0, 252, lev, { top: M.GY, shade: false });
      waleF(g, 0, 252, 194, { h: 12 });
      [42, 128, 214].forEach((x) => pipeEndF(g, x, 194, 8));
      excavator(g, at(M, lev), 86, lev + 2, { tool: 'dig', reach: 48, lift: 22, soil: 'gravel' });
      sump(g, 228, lev, 230, lev - 1);
      tag(g, 128, 168, 'csőtámasz', { anchor: 'middle', to: [128, 186] });
    } },
    { w: 252, t: 'Visszatöltés, kihúzás', d: 'A végleges szerkezet elkészülte után visszatöltenek, és a pallókat vibrátorral kihúzzák – újra felhasználhatók.', draw(g, M) {
      for (let i = 0; i < 10; i++) if (i !== 4 && i !== 5) sheetF(g, SZ(i), M.GY - 10, 306);
      backfill(g, 0, 252, M.GY + 18, 256);
      R(g, SZ(4), 256, 52, 50, F('gravel')); R(g, SZ(4), 256, 52, 50, 'fill:url(#pr-p-gravel)');
      sheetF(g, SZ(4), 60, 216);
      const top = vibroH(g, SZ(4) + 13, 60);
      crane(g, M, SZ(4) + 13, top, { reach: 76, tipY: 8 });
      arrowV(g, SZ(4) - 8, 150, 108, { w: 2.4, s: 7 });
      tag(g, 48, 220, 'visszatöltés', { anchor: 'middle' });
    } },
  ],
};

/* ---------------- Összemetsző cölöpfal – homlokzat */
const CPr = [24, 72, 120, 168, 216], CSe = [48, 96, 144, 192], CH = 15;
function cpile(g, x, kind, o = {}) {
  const top = o.top ?? 130, bot = o.bot ?? 304;
  R(g, x - CH, top, CH * 2, bot - top, kind === 'P' ? 'fill:url(#pr-pile)' : o.fresh ? 'fill:url(#pr-freshg)' : 'fill:url(#pr-concg)');
  R(g, x - CH, top, CH * 2, bot - top, 'fill:url(#pr-p-conc)', { opacity: kind === 'P' ? 0.45 : 1 });
  P(g, `M${x - CH} ${top} V${bot} H${x + CH} V${top}`, SK('conc2', 0.8));
  if (kind === 'S' && o.cage !== false) { const c = cage(g, x, top + 6, bot - 6, CH - 3); c.setAttribute('opacity', o.cageOp ?? 0.5); }
}
function cGuide(g, M, x1 = 250) {
  R(g, 0, M.GY - 3, x1, 16, 'fill:url(#pr-concg)' + `;stroke:${v('conc2')};stroke-width:.8`);
  R(g, 0, M.GY - 3, x1, 16, 'fill:url(#pr-p-conc)');
}
PROC.colop = {
  H: 360, GY: 130, layers: [{ k: 'fill', y: 130, lab: 'feltöltés' }, { k: 'sand', y: 150, lab: EN ? 'sand' : 'homok' }, { k: 'clay', y: 250, lab: EN ? 'clay' : 'agyag' }],
  steps: [
    { w: 236, t: 'Vezetőgerenda', d: 'Felül beton vezetőgerenda készül: kijelöli a cölöpök helyét, vezeti a fúrást, és biztosítja a cölöpfejek pontos helyét.', draw(g, M) {
      cGuide(g, M, 150);
      R(g, 150, M.GY - 2, 86, 16, F('bore'));
      CPr.slice(0, 3).forEach((x) => { Ln(g, x - CH, M.GY - 3, x - CH, M.GY + 13, SK('conc2', 1.2)); Ln(g, x + CH, M.GY - 3, x + CH, M.GY + 13, SK('conc2', 1.2)); });
      CSe.slice(0, 3).forEach((x) => { Ln(g, x - CH, M.GY - 3, x - CH, M.GY + 13, SK('conc2', 0.8, 'stroke-dasharray:3 2')); Ln(g, x + CH, M.GY - 3, x + CH, M.GY + 13, SK('conc2', 0.8, 'stroke-dasharray:3 2')); });
      excavator(g, M, 176, M.GY + 12, { tool: 'dig', reach: 30, lift: 34 });
      tag(g, 74, 186, 'vezetőgerenda', { anchor: 'middle', to: [74, M.GY + 8] });
    } },
    { w: 252, t: 'Primer cölöpök', d: 'Először minden második cölöp készül el, vasalás nélkül, szándékosan gyengébb betonnal (CFA- vagy béléscsöves fúrással).', draw(g, M) {
      [24, 72].forEach((x) => cpile(g, x, 'P'));
      cGuide(g, M, 252);
      const x = 120, tip = 236;
      concrete(g, x - CH, tip, CH * 2, 304 - tip);
      holeWall(g, x, M.GY, 304, CH);
      const r = rig(g, M, x, { top: 12, headY: tip - 150 });
      auger(g, x, r.headBot, tip, CH, { soilFrom: M.GY + 13, soilTo: tip - 4, soil: 'sand', pat: 'pr-p-sand' });
      arrowV(g, x - 30, 214, 176, { w: 2.4, s: 7 });
      tag(g, 72, 330, 'primer (vasalatlan)', { anchor: 'middle', to: [72, 304] });
    } },
    { w: 252, t: 'Szekunder cölöp', d: 'Néhány órával később a primerek közé fúrják a szekunder cölöpöt: a fúró 10–12 cm-t „belevág” a szomszédos primerekbe.', draw(g, M) {
      CPr.slice(0, 4).forEach((x) => cpile(g, x, 'P'));
      cGuide(g, M, 252);
      const x = 96, tip = 300;
      R(g, x - CH, M.GY + 13, CH * 2, tip - M.GY - 13, F('bore'));
      holeWall(g, x, M.GY, tip, CH);
      const r = rig(g, M, x, { top: 12, headY: tip - 230 });
      auger(g, x, r.headBot, tip, CH, { soilFrom: M.GY + 13, soilTo: tip - 4, soil: 'sand', pat: 'pr-p-sand' });
      spin(g, x, r.headBot + 32, 22);
      tag(g, 40, 220, 'átfúrás', { anchor: 'middle', to: [x - CH + 2, 220] });
    } },
    { w: 236, t: 'Vasalás', d: 'A frissen betonozott szekunder cölöpbe vasalási armatúrát süllyesztenek – ezek a vasalt cölöpök viszik a nyomatékot.', draw(g, M) {
      CPr.slice(0, 4).forEach((x) => cpile(g, x, 'P'));
      cpile(g, 48, 'S');
      cpile(g, 96, 'S', { fresh: true, cage: false });
      cGuide(g, M, 236);
      const ctop = 76;
      cage(g, 96, ctop, 250, CH - 3);
      R(g, 96 - CH + 2, ctop - 3, CH * 2 - 4, 3, F('steel3'));
      P(g, `M${96 - CH + 3} ${ctop - 2} L96 ${ctop - 20} L${96 + CH - 3} ${ctop - 2}`, SK('rope', 1.1));
      crane(g, M, 96, ctop - 20, { reach: 98, tipY: 10 });
      arrowV(g, 64, 92, 126, { w: 2.4, s: 7 });
      tag(g, 48, 330, 'szekunder (vasalt)', { anchor: 'middle', to: [48, 304] });
    } },
    { w: 252, t: 'Fejgerenda, kiemelés', d: 'A cölöpfejeket vasbeton fejgerenda fogja össze; a kiemeléssel lépést tartva mellgerenda és horgonyok (vagy dúcok) készülnek.', draw(g, M) {
      const lev = 244;
      [...CPr, 264].forEach((x) => cpile(g, x, 'P'));
      [...CSe, 240].forEach((x) => cpile(g, x, 'S', { cageOp: 0.35 }));
      level(g, 0, 252, lev, { top: M.GY, shade: false });
      R(g, 0, M.GY - 8, 252, 20, 'fill:url(#pr-concg)' + `;stroke:${v('conc2')};stroke-width:.8`); R(g, 0, M.GY - 8, 252, 20, 'fill:url(#pr-p-conc)');
      R(g, 0, 186, 252, 14, 'fill:url(#pr-concg)' + `;stroke:${v('conc2')};stroke-width:.8`);
      [48, 144, 240].forEach((x) => aheadF(g, x, 193));
      excavator(g, at(M, lev), 90, lev + 2, { tool: 'dig', reach: 48, lift: 22 });
      tag(g, 180, 104, EN ? 'capping beam' : 'fejgerenda', { anchor: 'middle', to: [180, M.GY - 2] });
      tag(g, 96, 172, EN ? 'waling beam' : 'mellgerenda', { anchor: 'middle', to: [96, 188] });
    } },
  ],
};

/* ---------------- Passzív hátrahorgonyzás – keresztmetszet */
const PW = 196, PA = 44, PY = 140;
function pWalls(g, M, o = {}) {
  sheetS(g, PW, M.GY - 6, 322);
  sheetS(g, PA, M.GY - 4, 206);
  if (o.wedge !== false) {
    P(g, `M${PW - 2} 284 L130 ${M.GY}`, SK('acc', 1.2, 'stroke-dasharray:6 4;opacity:.8'));
    P(g, `M${PA + 4} 206 L104 ${M.GY}`, SK('acc2', 1.2, 'stroke-dasharray:6 4;opacity:.8'));
  }
}
function pRod(g, M) {
  Ln(g, PA - 6, PY, PW + 9, PY, SK('steel3', 2.6));
  waleS(g, PW + 4, PY, 1, { w: 7, h: 12 }); waleS(g, PA - 1, PY, -1, { w: 7, h: 12 });
  R(g, PW + 11, PY - 4, 4, 8, F('dark2')); R(g, PA - 12, PY - 4, 4, 8, F('dark2'));
  R(g, 118, PY - 3.5, 16, 7, F('steel2') + `;stroke:${v('steel3')};stroke-width:.8`, { rx: 1.5 });
}
PROC.passziv = {
  H: 340, GY: 120, layers: [{ k: 'fill', y: 120, lab: 'feltöltés' }, { k: 'sand', y: 142, lab: EN ? 'sand' : 'homok' }, { k: 'clay', y: 252, lab: EN ? 'clay' : 'agyag' }],
  steps: [
    { w: 270, t: 'Fal és horgonyfal', d: 'Leverik a fő falat, és a mögötte kialakuló aktív éken kívül a horgonyfalat (levert I-tartót, rövid szádfalat vagy cölöpsort).', draw(g, M) {
      pWalls(g, M);
      tag(g, 160, 236, 'aktív ék', { anchor: 'middle' });
      tag(g, 70, 186, 'passzív ék', { anchor: 'middle' });
      tag(g, 44, 98, EN ? 'anchor wall' : 'horgonyfal', { anchor: 'middle', to: [PA, M.GY - 4] });
      tag(g, 210, 98, 'szádfal', { anchor: 'middle', to: [PW, M.GY - 6] });
    } },
    { w: 260, t: 'Horgonyrúd', d: 'A felszín alatt 0,8–1,0 m-re keskeny árokban fektetik le a rudat, és a két fal hevederéhez kötik. Nem feszítik elő: csak a lazaságot veszik ki.', draw(g, M) {
      pitP(g, M, [[PA + 3, M.GY], [PA + 3, PY + 9], [PW - 2, PY + 9], [PW - 2, M.GY]]);
      pWalls(g, M, { wedge: false });
      pRod(g, M);
      spoil(g, M, 216, 40, 10, 'sand');
      worker(g, 140, { GY: PY + 9, pose: 'guide', dir: -1, s: 0.9 });
      tag(g, 112, 176, 'horgonyrúd', { anchor: 'middle', to: [100, PY] });
    } },
    { w: 250, t: 'Visszatöltés', d: 'Az árkot homokkal, rétegenként tömörítve visszatöltik; a rúd a talajban marad.', draw(g, M) {
      pWalls(g, M, { wedge: false });
      backfill(g, PA + 3, PW - 2, M.GY, PY + 9);
      pRod(g, M);
      rammer(g, 100, M.GY);
    } },
    { w: 300, t: 'Kiemelés', d: 'Kiemeléskor a fal néhány centimétert elmozdul, a rúd megfeszül, és a horgonyfal előtt kialakul a passzív földellenállás.', draw(g, M) {
      pit(g, M, PW + 2, 300, 238);
      pWalls(g, M);
      pRod(g, M);
      excavator(scl(g, 0.72, 250, 238), at(M, 238), 222, 240, { tool: 'dig', reach: 30, lift: 22 });
      for (let y = 150; y <= 196; y += 15) arrowH(g, PA + 22, PA + 6, y, { w: 2, s: 6, c: 'acc2' });
      arrowH(g, 150, 176, PY - 12, { w: 2.2, s: 7 });
      tag(g, 96, 300, 'passzív földellenállás', { anchor: 'middle', to: [PA + 14, 196] });
    } },
  ],
};

/* ---------------- Acél csőtámasz – keresztmetszet */
const CL = 30, CR = 200, CY = 152;
function cWalls(g, M, lev) {
  pit(g, M, CL + 7, CR - 7, lev);
  wallS(g, CL, M.GY, 330, { cap: true }); wallS(g, CR, M.GY, 330, { cap: true });
}
function cStrut(g, y, o = {}) {
  const a = waleS(g, CL + 7, y, 1, { w: 9, h: 16 }), b = waleS(g, CR - 7, y, -1, { w: 9, h: 16 });
  if (o.strut !== false) pipeH(g, a + (o.jack ? 0 : 0), b - (o.jack ? 14 : 0), y, { r: 6, joint: (a + b) / 2 });
  if (o.jack) { R(g, b - 14, y - 5, 14, 10, 'fill:url(#pr-mcyl)' + `;stroke:${v('mach3')};stroke-width:.8`); R(g, b - 4, y - 7, 4, 14, F('dark2')); }
}
PROC.cso = {
  H: 340, GY: 120, gw: 236, layers: [{ k: 'fill', y: 120, lab: 'feltöltés' }, { k: 'sand', y: 146, lab: EN ? 'sand' : 'homok' }, { k: 'clay', y: 252, lab: EN ? 'clay' : 'agyag' }],
  steps: [
    { w: 290, t: 'Első fogás', d: 'A falak elkészülte után a tervezett támaszszint alá kb. 0,5 m-rel kiemelnek.', draw(g, M) {
      cWalls(g, M, 170);
      excavator(g, at(M, 170), 70, 172, { tool: 'dig', reach: 50, lift: 26 });
      Ln(g, CL + 7, CY, CR - 7, CY, SK('acc', 1.2, 'stroke-dasharray:5 4'));
      tag(g, 250, 210, 'résfal', { anchor: 'middle', to: [CR + 6, 210] });
    } },
    { w: 290, t: 'Heveder, csőtámasz', d: 'A falakra acél hevedert (mellgerendát) szerelnek, és daruval beemelik a csőtámaszt.', draw(g, M) {
      cWalls(g, M, 170);
      cStrut(g, CY, { strut: false });
      pipeH(g, CL + 18, CR - 18, 128, { r: 6 });
      P(g, `M${CL + 40} 122 L115 92 L${CR - 40} 122`, SK('rope', 1.1));
      excavator(g, M, 115, 92, { reach: 118, lift: 24 });
      worker(g, 90, { GY: 170, pose: 'guide', dir: -1 });
      tag(g, 120, 210, EN ? 'waling' : 'heveder', { anchor: 'middle', to: [CL + 14, CY + 4] });
    } },
    { w: 290, t: 'Előfeszítés', d: 'A csőtámaszt hidraulikus sajtóval előfeszítik, és acélékekkel rögzítik – így a fal kevésbé mozdul el.', draw(g, M) {
      cWalls(g, M, 170);
      cStrut(g, CY, { jack: true });
      const px = 236;
      R(g, px - 12, M.GY - 18, 24, 18, F('cont') + `;stroke:${v('cont3')};stroke-width:.8`, { rx: 2 });
      C(g, px, M.GY - 24, 5, F('halo') + `;stroke:${v('dark2')};stroke-width:1.2`); Ln(g, px, M.GY - 24, px + 3, M.GY - 27, SK('acc', 1.2));
      P(g, `M${CR - 21} ${CY - 5} C${CR - 30} ${CY - 50} ${px - 40} ${M.GY - 40} ${px - 12} ${M.GY - 10}`, SK('hose', 2.2));
      arrowH(g, 132, 112, CY - 16, { w: 2.2, s: 7 }); arrowH(g, 140, 160, CY - 16, { w: 2.2, s: 7 });
      tag(g, 150, 196, 'sajtó', { anchor: 'middle', to: [CR - 21, CY + 4] });
      worker(g, 256, { GY: M.GY, pose: 'stand' });
    } },
    { w: 290, t: 'Továbbmélyítés', d: 'A támaszok alatt folytatódik a kiemelés; mély gödörnél újabb támaszsorok következnek.', draw(g, M) {
      cWalls(g, M, 270);
      cStrut(g, CY); cStrut(g, 222);
      excavator(g, at(M, 270), 70, 272, { tool: 'dig', reach: 50, lift: 22 });
      sump(g, 180, 270, 236, M.GY);
    } },
    { w: 290, t: 'Alaplemez, bontás', d: 'A támaszt csak akkor bontják, ha a végleges szerkezet (alaplemez, födém) már átveszi a terhet.', draw(g, M) {
      cWalls(g, M, 270);
      slab(g, CL + 7, CR - 7, 254, 16);
      cStrut(g, CY);
      waleS(g, CL + 7, 222, 1, { w: 9, h: 16 }); waleS(g, CR - 7, 222, -1, { w: 9, h: 16 });
      pipeH(g, CL + 26, CR - 26, 196, { r: 6 });
      P(g, `M${CL + 46} 190 L115 172 L${CR - 46} 190`, SK('rope', 1.1));
      P(g, `M115 172 L115 ${CY + 8}`, SK('rope', 1.1));
      worker(g, 70, { GY: 254, pose: 'signal' });
      arrowV(g, 160, 184, 160, { w: 2.2, s: 7 });
      tag(g, 250, 290, EN ? 'base slab' : 'alaplemez', { anchor: 'middle', to: [CR - 14, 262] });
    } },
  ],
};

/* ---------------- Top-down (milánói) módszer – keresztmetszet */
const TDL = 22, TDR = 268, TDC = 145;
function tdWalls(g, M) { wallS(g, TDL, M.GY, 334); wallS(g, TDR, M.GY, 334); }
function tdCol(g, M, top = M.GY + 8) {
  concrete(g, TDC - 12, 290, 24, 50, false); P(g, `M${TDC - 12} 290 V340 M${TDC + 12} 290 V340`, SK('conc2', 0.8));
  hbeamS(g, TDC, top, 312, { w: 10 });
}
function tdTop(g, M) {
  slab(g, TDL + 7, 180, M.GY + 6, 13); slab(g, 214, TDR - 7, M.GY + 6, 13);
  R(g, TDL - 10, M.GY - 2, TDR - TDL + 20, 8, F('dark2')); R(g, 180, M.GY - 2, 34, 8, F('steel3'));
  Ln(g, 0, M.GY - 2, 290, M.GY - 2, SK('ground', 1.2));
}
PROC.topdown = {
  H: 350, GY: 120, gw: 236, layers: [{ k: 'fill', y: 120, lab: 'feltöltés' }, { k: 'sand', y: 146, lab: EN ? 'sand' : 'homok' }, { k: 'clay', y: 252, lab: EN ? 'clay' : 'agyag' }],
  steps: [
    { w: 290, t: 'Határoló falak', d: 'Először a felszínről elkészülnek a határoló résfalak (vagy cölöpfalak).', draw(g, M) {
      wallS(g, TDR, M.GY, 334);
      slurry(g, TDL - 8, M.GY + 4, 16, 330);
      R(g, TDL - 14, M.GY - 3, 28, 10, 'fill:url(#pr-concg)');
      const gr = grab(g, TDL, 300, 9, 0.2);
      crane(g, M, TDL, gr.top - 4, { reach: 108, tipY: 14 });
      tag(g, 214, 260, 'résfal', { anchor: 'middle', to: [TDR - 6, 260] });
    } },
    { w: 290, t: 'Közbenső pillér', d: 'Felülről elkészül a közbenső támasz fúrt cölöpe, és a friss betonba beállítják az acél pillért.', draw(g, M) {
      tdWalls(g, M);
      concrete(g, TDC - 12, 290, 24, 50); holeWall(g, TDC, M.GY, 340, 12);
      R(g, TDC - 12, M.GY, 24, 170, F('bore'));
      const r = rig(g, M, TDC, { top: 4, headY: 22 });
      hbeamS(g, TDC, r.headBot, 312, { w: 10 });
      tag(g, 70, 316, 'fúrt cölöp', { anchor: 'middle', to: [TDC - 12, 316] });
      tag(g, 70, 220, 'acél pillér', { anchor: 'middle', to: [TDC - 6, 220] });
    } },
    { w: 290, t: 'Felső födém', d: 'Kis kiemelés után a felső födém földzsalun, a talajra betonozva készül, földkiadó nyílással. Ez tárcsaként támasztja a falakat, és a forgalom hamar visszatérhet.', draw(g, M) {
      tdWalls(g, M); tdCol(g, M);
      tdTop(g, M);
      car(g, 34, M.GY - 2, 'acc'); car(g, 226, M.GY - 2, 'acc2');
      tag(g, 197, 166, 'földkiadó nyílás', { anchor: 'middle', to: [197, M.GY + 6] });
      tag(g, 82, 166, 'felső födém', { anchor: 'middle', to: [82, M.GY + 18] });
    } },
    { w: 290, t: 'Kiemelés a födém alatt', d: 'A födém alatt, szűk térben, kis gépekkel emelnek ki; a földet a nyíláson át szállítják ki. Közben a felszínen zavartalan a forgalom.', draw(g, M) {
      pit(g, M, TDL + 7, TDR - 7, 214);
      tdWalls(g, M); tdCol(g, M);
      tdTop(g, M);
      car(g, 40, M.GY - 2, 'acc2');
      excavator(scl(g, 0.8, 92, 214), at(M, 214), 52, 216, { tool: 'dig', reach: 40, lift: 18 });
      skip(g, 197, 150);
      Ln(g, 197, 58, 197, 150, SK('rope', 1.1));
      [174, 220].forEach((x) => Ln(g, x, M.GY - 2, x, 52, SK('steel3', 3)));
      R(g, 168, 48, 58, 6, F('steel3')); R(g, 190, 53, 14, 6, F('mach2'), { rx: 1 });
      arrowV(g, 226, 170, 132, { w: 2.2, s: 7 });
    } },
    { w: 290, t: 'Födém, alaplemez', d: 'Lefelé haladva elkészül a közbenső födém, majd az alaplemez. Épületnél közben a felépítmény felfelé is épülhet.', draw(g, M) {
      pit(g, M, TDL + 7, TDR - 7, 300);
      tdWalls(g, M); tdCol(g, M);
      tdTop(g, M);
      slab(g, TDL + 7, 180, 212, 12); slab(g, 214, TDR - 7, 212, 12);
      slab(g, TDL + 7, TDR - 7, 286, 16, { fresh: true });
      car(g, 40, M.GY - 2, 'acc'); car(g, 226, M.GY - 2, 'acc2');
      worker(g, 92, { GY: 286, pose: 'stand' });
      tag(g, 82, 244, 'közbenső födém', { anchor: 'middle', to: [82, 224] });
    } },
  ],
};

/* ---------------- Talajszegezés – keresztmetszet */
const NW = 112, nA = (y) => axis(NW, y, 15, -1);
function nRows(g, ys, o = {}) { ys.forEach((y) => nailA(g, nA(y), o.L ?? 96)); }
function nFace(g, top, bot) {
  R(g, NW, top, 8, bot - top, 'fill:url(#pr-shotg)' + `;stroke:${v('conc2')};stroke-width:.8`);
  for (let y = top + 4; y < bot; y += 6) Ln(g, NW + 2, y, NW + 6, y, SK('rebar', 0.7, 'opacity:.6'));
}
PROC.szeg = {
  H: 340, GY: 120, layers: [{ k: 'fill', y: 120, lab: 'feltöltés' }, { k: 'clay', y: 140, lab: 'kötött talaj' }, { k: 'clay2', y: 258, lab: 'kemény agyag' }],
  steps: [
    { w: 250, t: 'Fogás kiemelése', d: 'Fogásonként 1–2 m-t emelnek ki; ennyi ideig a földfalnak magától meg kell állnia.', draw(g, M) {
      pit(g, M, NW, 250, 160);
      excavator(g, at(M, 160), 150, 162, { tool: 'dig', reach: 44, lift: 26 });
      dimV(g, NW + 8, M.GY, 160, '1–2 m', { dx: 6, anchor: 'start' });
    } },
    { w: 260, t: 'Szegek', d: 'A szegeket 10–20°-os lejtéssel befúrják (vagy beverik), és habarccsal kiinjektálják.', draw(g, M) {
      pit(g, M, NW, 260, 160);
      boreA(g, nA(144), 0, 96, { r: 3 });
      anchorRig(g, at(M, 160), NW, 144, 15, { Lm: 92, head: 0.35 });
    } },
    { w: 260, t: 'Háló, lőttbeton', d: 'A felületre betonacél háló kerül, a szegfejeket rögzítik, és 8–15 cm vastag lőttbetonnal borítják; mögé felületszivárgó.', draw(g, M) {
      pit(g, M, NW, 260, 160);
      nFace(g, M.GY, 160);
      nRows(g, [144]);
      nozzle(g, at(M, 160), 170, NW + 9, 140, { hose: 40 });
      tag(g, 60, 190, EN ? 'nail' : 'szeg', { anchor: 'middle', to: nA(144)(60, 2) });
      tag(g, 160, 104, 'lőttbeton', { anchor: 'middle', to: [NW + 6, 128] });
    } },
    { w: 260, t: 'Következő fogás', d: 'A következő fogás csak akkor jöhet, ha a lőttbeton legalább 72 órás (vagy elérte a kb. 10,5 MPa-t).', draw(g, M) {
      pit(g, M, NW, 260, 200);
      nFace(g, M.GY, 162);
      nRows(g, [144, 184]);
      excavator(g, at(M, 200), 150, 202, { tool: 'dig', reach: 44, lift: 26 });
    } },
    { w: 260, t: 'Kész fal', d: 'A szegek „összevarrják” a talajt: a megerősített tömb súlytámfalként dolgozik. A szegeknek túl kell nyúlniuk a csúszólapon.', draw(g, M) {
      pit(g, M, NW, 260, 282);
      nFace(g, M.GY, 282);
      nRows(g, [144, 184, 224, 264], { L: 100 });
      P(g, `M${NW} 282 L48 ${M.GY}`, SK('acc', 1.3, 'stroke-dasharray:6 4'));
      [150, 190, 230, 270].forEach((y) => Ln(g, NW + 8, y, NW + 16, y + 2, SK('water', 2)));
      tag(g, 34, 300, 'csúszólap', { anchor: 'middle', to: [70, 220] });
      worker(g, 180, { GY: 282, pose: 'stand' });
    } },
  ],
};

/* ---------------- Fagyasztott fal – keresztmetszet */
const FL = 64, FR = 188, FB = 304;
function fHeader(g, M, px, py) {
  P(g, `M${px} ${py} C${px + 20} ${py} ${FL - 20} ${M.GY - 22} ${FL} ${M.GY - 10} M${FL} ${M.GY - 10} H${FR} V${M.GY - 3}`, SK('steel3', 2.4));
  Ln(g, FL, M.GY - 10, FL, M.GY - 3, SK('steel3', 2.4));
}
PROC.fagy = {
  H: 340, GY: 120, gw: 150, layers: [{ k: 'fill', y: 120, lab: 'feltöltés' }, { k: 'sand', y: 138, lab: 'víztartó homok' }, { k: 'clay2', y: 288, lab: 'vízzáró agyag' }],
  steps: [
    { w: 250, t: 'Fagyasztócsövek', d: 'A kiemelés körvonalán kb. 1 m-enként fagyasztócsöveket fúrnak le, a vízzáró rétegig.', draw(g, M) {
      freezePipe(g, FR, M.GY - 2, FB);
      const r = smallRig(g, M, FL, { top: M.GY - 112, headY: M.GY - 84 });
      jetTool(g, FL, r.headBot, FB - 12);
      holeWall(g, FL, M.GY, FB, 4);
      tag(g, 222, 250, 'fagyasztócső', { anchor: 'middle', to: [FR + 3, 250] });
    } },
    { w: 250, t: 'Hűtés', d: 'A csövekben −30 °C-os sólé (vagy −196 °C-os folyékony nitrogén) kering: a pórusvíz megfagy, a csövek körül jéghengerek nőnek.', draw(g, M) {
      [FL, FR].forEach((x) => { ice(g, x, M.GY + 18, FB - 4, 9); freezePipe(g, x, M.GY - 3, FB); });
      const [px, py] = freezePlant(g, M, 190);
      fHeader(g, M, 190, py);
      P(g, `M190 ${py} C176 ${py} ${FR + 14} ${M.GY - 16} ${FR} ${M.GY - 10}`, SK('steel3', 2.4));
      tag(g, 126, 236, 'jéghenger', { anchor: 'middle', to: [FL + 9, 236] });
      tag(g, 218, 64, 'hűtőgép', { anchor: 'middle' });
    } },
    { w: 250, t: 'Összefagyás', d: 'A szomszédos jéghengerek összenőnek: zárt, vízzáró és teherbíró jégfal alakul ki. Hőmérőcsövek igazolják.', draw(g, M) {
      [FL, FR].forEach((x) => { ice(g, x, M.GY + 8, FB + 4, 22); freezePipe(g, x, M.GY - 3, FB); });
      const [, py] = freezePlant(g, M, 190);
      fHeader(g, M, 190, py);
      Ln(g, FL + 30, M.GY - 6, FL + 30, 260, SK('acc', 1.6)); C(g, FL + 30, M.GY - 8, 3, F('halo') + `;stroke:${v('acc')};stroke-width:1.2`);
      tag(g, 126, 274, 'zárt jégfal', { anchor: 'middle', to: [FR - 18, 274] });
      tag(g, 126, 196, 'hőmérőcső', { anchor: 'middle', to: [FL + 30, 196] });
    } },
    { w: 260, t: 'Kiemelés', d: 'A jégfal védelmében kiemelnek, a felületet lőttbetonnal védik; a fagyasztást közben fenntartják.', draw(g, M) {
      [FL, FR].forEach((x) => { ice(g, x, M.GY + 8, FB + 4, 22); freezePipe(g, x, M.GY - 3, FB); });
      pit(g, M, FL + 22, FR - 22, 276);
      R(g, FL + 22, M.GY, 6, 156, 'fill:url(#pr-shotg)'); R(g, FR - 28, M.GY, 6, 156, 'fill:url(#pr-shotg)');
      const [, py] = freezePlant(g, M, 196);
      fHeader(g, M, 196, py);
      excavator(scl(g, 0.8, 120, 276), at(M, 276), 104, 278, { tool: 'dig', reach: 36, lift: 20 });
    } },
    { w: 260, t: 'Felengedés', d: 'A végleges szerkezet elkészülte után leállítják a hűtést, és a talaj lassan felenged.', draw(g, M) {
      [FL, FR].forEach((x) => { ice(g_(g, { style: 'opacity:.45' }), x, M.GY + 40, FB - 10, 12); freezePipe(g, x, M.GY - 3, FB); });
      pit(g, M, FL + 22, FR - 22, 276);
      concrete(g, FL + 22, M.GY, 12, 156, false); concrete(g, FR - 34, M.GY, 12, 156, false);
      slab(g, FL + 22, FR - 22, 262, 14);
      worker(g, 126, { GY: 262, pose: 'stand' });
      tag(g, 126, 300, 'végleges szerkezet', { anchor: 'middle', to: [126, 270] });
    } },
  ],
};

/* ---------------- Szádfalgát hídpillérhez folyóban – keresztmetszet */
const GL = 72, GRr = 148, GC = 110;
function gWalls(g, M, o = {}) {
  sheetS(g, GL, o.top ?? 104, o.bot ?? 318);
  if (o.right !== false) sheetS(g, GRr, o.topR ?? o.top ?? 104, o.botR ?? o.bot ?? 318);
}
function gFrame(g) { R(g, GL + 4, 108, 8, 12, F('steel2') + `;stroke:${v('steel3')};stroke-width:.9`); R(g, GRr - 8, 108, 8, 12, F('steel2') + `;stroke:${v('steel3')};stroke-width:.9`); pipeH(g, GL + 12, GRr - 8, 114, { r: 3.6 }); }
function gBarge(g, M) { return barge(g, 160, 250, M.hz); }
PROC.gat = {
  H: 350, GY: 190, hz: 120, layers: [{ k: 'sand2', y: 190, lab: EN ? 'riverbed sand' : 'mederhomok' }, { k: 'gravel', y: 238, lab: EN ? 'gravel' : 'kavics' }, { k: 'clay', y: 300, lab: EN ? 'clay' : 'agyag' }],
  steps: [
    { w: 240, t: 'Vezetőkeret', d: 'Uszályról vezetőcölöpöket vernek, és rájuk szerelik a merevítő keretet – ez a szádfalverés sablonja.', draw(g, M) {
      [GL + 8, GRr - 4].forEach((x) => hbeamS(g, x, 98, 262, { w: 6 }));
      gFrame(g);
      const dk = gBarge(g, M);
      crane(g, at(M, dk), GC, 60, { reach: 80, tipY: 12 });
      R(g, GC - 18, 60, 36, 6, F('steel3'));
      tag(g, 150, 300, 'vezetőcölöp', { anchor: 'middle', to: [GRr - 4, 250] });
    } },
    { w: 240, t: 'Szádfalverés', d: 'A keret mentén – középről két irányba haladva – körbeverik a szádfalat.', draw(g, M) {
      gFrame(g);
      gWalls(g, M, { topR: 40, botR: 254 });
      const dk = gBarge(g, M);
      const top = vibroH(g, GRr + 1, 40);
      crane(g, at(M, dk), GRr + 1, top, { reach: 41, tipY: 4 });
      arrowV(g, GRr - 16, 60, 96, { w: 2.4, s: 7 });
    } },
    { w: 240, t: 'Kotrás víz alatt', d: 'A szádfalon belül víz alatt, markolóval kotorják ki a földet a tervezett mélységig.', draw(g, M) {
      R(g, GL + 3, M.GY - 2, GRr - GL - 6, 254 - M.GY + 2, 'fill:url(#pr-riverg)');
      Ln(g, GL + 3, 254, GRr - 3, 254, SK('ground', 1.4));
      gFrame(g); gWalls(g, M);
      const gr = grab(g, GC, 250, 16, 0.5);
      const dk = gBarge(g, M);
      crane(g, at(M, dk), GC, gr.top - 4, { reach: 80, tipY: 10 });
    } },
    { w: 240, t: 'Betondugó', d: 'Kontraktorcsővel víz alatti betondugót készítenek: a súlya tart ellen alulról a víznyomásnak.', draw(g, M) {
      R(g, GL + 3, M.GY - 2, GRr - GL - 6, 254 - M.GY + 2, 'fill:url(#pr-riverg)');
      concrete(g, GL + 3, 226, GRr - GL - 6, 28);
      Ln(g, GL + 3, 226, GRr - 3, 226, SK('conc2', 1));
      gFrame(g); gWalls(g, M);
      tremie(g, GC, 70, 244, { full: true });
      const dk = gBarge(g, M);
      P(g, `M${GC + 6} 76 L${GC + 6} 66 L${GC} 60`, SK('rope', 1.1));
      crane(g, at(M, dk), GC, 60, { reach: 80, tipY: 10 });
      tag(g, 196, 274, 'betondugó', { anchor: 'middle', to: [GRr - 8, 244] });
    } },
    { w: 240, t: 'Leszivattyúzás', d: 'A vizet kiszivattyúzzák, és a betondugóra szárazon megépítik a pillért.', draw(g, M) {
      R(g, GL + 3, 102, GRr - GL - 6, 124, 'fill:url(#pr-pitg)');
      concrete(g, GL + 3, 226, GRr - GL - 6, 28);
      gFrame(g); gWalls(g, M);
      pier(g, GC, 226, 82, 18);
      sump(g, GL + 16, 226, GL - 6, 100);
      worker(g, GRr - 18, { GY: 226, pose: 'stand' });
      tag(g, 196, 200, 'hídpillér', { anchor: 'middle', to: [GC + 18, 170] });
    } },
    { w: 240, t: 'Elárasztás, bontás', d: 'A munkateret elárasztják, a szádfalat kihúzzák; a betondugó a pillér alatt marad.', draw(g, M) {
      concrete(g, GL + 3, 226, GRr - GL - 6, 28);
      R(g, GL + 3, M.GY - 2, GRr - GL - 6, 226 - M.GY + 2, 'fill:url(#pr-riverg)');
      pier(g, GC, 226, 82, 18);
      gWalls(g, M, { right: false });
      sheetS(g, GRr, 24, 238);
      const dk = gBarge(g, M);
      const top = vibroH(g, GRr + 1, 24);
      crane(g, at(M, dk), GRr + 1, top, { reach: 41, tipY: 2 });
      arrowV(g, GRr - 14, 96, 60, { w: 2.4, s: 7 });
    } },
  ],
};

/* ---------------- Víz alatti betonlemez lehorgonyzással – keresztmetszet */
const UL = 22, UR = 228, UB = 250, UWL = 134;
const UX = [54, 90, 126, 162, 198];
function uWalls(g, M) { sheetS(g, UL, M.GY - 8, 304); sheetS(g, UR, M.GY - 8, 304); }
function uLake(g, M, o = {}) {
  R(g, UL + 3, M.GY - 4, UR - UL - 5, UB - M.GY + 4, 'fill:url(#pr-pitg)');
  if (o.water !== false) { R(g, UL + 3, UWL, UR - UL - 5, UB - UWL, 'fill:url(#pr-riverg)'); Ln(g, UL + 3, UWL, UR - 2, UWL, SK('water', 1.4)); }
  R(g, UL + 3, UB, UR - UL - 5, 3, F('top'));
  Ln(g, UL + 3, UB, UR - 2, UB, SK('ground', 1.4));
}
function uAnchors(g, n, top = UB) { UX.slice(0, n).forEach((x) => { R(g, x - 3.2, top, 6.4, 330 - top, 'fill:url(#pr-groutg)', { rx: 2 }); Ln(g, x, top - 8, x, 328, SK('steel3', 1.8)); }); }
function uPontoon(g, x0, x1) { return barge(g, x0, x1, UWL); }
PROC.vizalatti = {
  H: 350, GY: 120, gw: 134, layers: [{ k: 'gravel', y: 120, lab: 'homokos kavics' }, { k: 'clay2', y: 330, lab: 'vízzáró réteg', ly: 340 }],
  steps: [
    { w: 250, t: 'Körbezárás', d: 'Vízzáró szádfal (vagy résfal) zárja körbe a gödröt – a mélyen fekvő vízzáró rétegig azonban nem ér le.', draw(g, M) {
      sheetS(g, UL, M.GY - 8, 304);
      sheetS(g, UR, 40, 224);
      const top = vibroH(g, UR + 1, 40);
      crane(mir(g, UR + 1), M, UR + 1, top, { reach: 104, tipY: 6 });
      tag(g, 132, 290, 'a vízzáró réteg mélyen van', { anchor: 'middle' });
    } },
    { w: 250, t: 'Nedves kiemelés', d: 'A talajvizet nem süllyesztik le: a földet víz alól kotorják ki, a gödörből „mesterséges tó” lesz.', draw(g, M) {
      uLake(g, M); uWalls(g, M);
      const gr = grab(g, 90, 246, 16, 0.5);
      const dk = uPontoon(g, 136, 222);
      crane(g, at(M, dk), 90, gr.top - 4, { reach: 82, tipY: 10 });
    } },
    { w: 250, t: 'Horgonyzás', d: 'Pontonról sűrű, 2,5–3,5 m-es rácsban húzott cölöpöket (GEWI-rudat, mikrocölöpöt) fúrnak és injektálnak a gödörfenék alá.', draw(g, M) {
      uLake(g, M); uAnchors(g, 4); uWalls(g, M);
      const dk = uPontoon(g, 92, 224);
      const x = 198, r = smallRig(mir(g, x), at(M, dk), x, { top: dk - 96, headY: dk - 80 });
      jetTool(g, x, r.headBot, 316);
      tag(g, 108, 300, 'húzott cölöp', { anchor: 'middle', to: [90, 290] });
    } },
    { w: 250, t: 'Víz alatti betonozás', d: 'A horgonyfejeket búvárok tisztítják meg; a lemezt kontraktorcsővel betonozzák, a cső vége végig a friss betonban marad.', draw(g, M) {
      uLake(g, M); uAnchors(g, 5);
      concrete(g, UL + 3, 222, 126, 28); concrete(g, 151, 236, UR - 153, 14);
      uWalls(g, M);
      const dk = uPontoon(g, 122, 222);
      tremie(g, 142, dk - 28, 238, { full: true });
      tag(g, 72, 196, 'víz alatti beton', { anchor: 'middle', to: [72, 232] });
    } },
    { w: 250, t: 'Leszivattyúzás', d: 'A vizet fokozatosan kiszivattyúzzák. Alulról a víznyomás emeli a lemezt – a lemez súlya és a horgonyok húzóereje tartja lent.', draw(g, M) {
      uLake(g, M, { water: false }); uAnchors(g, 5, 222);
      slab(g, UL + 3, UR - 2, 222, 28);
      uWalls(g, M);
      sump(g, 200, 222, UR + 10, M.GY);
      [76, 156].forEach((x) => arrowV(g, x, 286, 256, { w: 2.4, s: 7, c: 'acc2' }));
      tag(g, 136, 318, 'víznyomás', { anchor: 'middle' });
    } },
    { w: 250, t: 'Végleges szerkezet', d: 'Szárazon rögzítik a horgonyvégeket, és a víz alatti lemezre megépül a végleges alaplemez és a szerkezet.', draw(g, M) {
      uLake(g, M, { water: false }); uAnchors(g, 5, 222);
      slab(g, UL + 3, UR - 2, 222, 28);
      slab(g, UL + 3, UR - 2, 206, 16, { fresh: true });
      concrete(g, UL + 3, 140, 12, 66, false); concrete(g, UR - 14, 140, 12, 66, false);
      uWalls(g, M);
      worker(g, 136, { GY: 206, pose: 'stand' });
      tag(g, 176, 178, EN ? 'base slab' : 'alaplemez', { anchor: 'middle', to: [176, 210] });
    } },
  ],
};

/*@@MT@@*/

/* ---------------- Résfal: szakaszos réselés (hosszmetszet) */
const RF = { P1: [22, 98], S1: [98, 134], P2: [134, 210] };
function rfBase(g, M, n) {
  // résvezető gerenda a rés két oldalán (a metszet mögött)
  R(g, 14, M.GY - 3, n >= 1 ? 206 : 0, 14, 'fill:url(#pr-concg)' + `;stroke:${v('conc2')};stroke-width:.7`);
}
function rfPanel(g, M, k, kind, o = {}) {
  const [a, b] = RF[k], bot = 318, top = M.GY + 11;
  if (kind === 'slurry') slurry(g, a, top, b - a, bot - top);
  else if (kind === 'conc') concrete(g, a, M.GY + 2, b - a, bot - M.GY - 2, o.fresh ?? false);
  Ln(g, a, top, a, bot, SK('wall', 1)); Ln(g, b, top, b, bot, SK('wall', 1)); Ln(g, a, bot, b, bot, SK('wall', 1));
  if (o.lab) el('text', { x: (a + b) / 2, y: bot - 8, 'text-anchor': 'middle', class: 'pr-tx pr-big', text: o.lab }, g);
}
PROC.resfal = {
  H: 360, GY: 178, gw: 216, layers: [{ k: 'fill', y: 178, lab: 'feltöltés' }, { k: 'sand', y: 200, lab: EN ? 'sand' : 'homok' }, { k: 'clay2', y: 272, lab: EN ? 'clay' : 'agyag' }],
  steps: [
    { w: 240, t: 'Résvezető gerenda', d: 'A rés két oldalán 1,0–1,5 m magas, 20–25 cm széles vasbeton gerendapár készül: vezeti a réskanalat, megtámasztja a felső laza talajt, és ez a kitűzési alapbázis.', draw(g, M) {
      R(g, 14, M.GY - 3, 110, 14, 'fill:url(#pr-concg)' + `;stroke:${v('conc2')};stroke-width:.7`);
      R(g, 124, M.GY, 70, 12, F('bore'));
      spoil(g, M, 196, 30, 8, 'fill');
      excavator(g, M, 150, M.GY + 6, { reach: 56, lift: 46 });
      tag(g, 68, M.GY - 30, 'résvezető gerenda', { anchor: 'middle', to: [68, M.GY - 2] });
    } },
    { w: 240, t: 'Primer harapások', d: 'Szakaszos réselésnél minden második (primer) tábla készül először: két szélét kiharapják, a kiemelt föld helyét folyamatosan bentonitos résiszap tölti ki.', draw(g, M) {
      rfBase(g, M, 1);
      slurry(g, 22, M.GY + 11, 30, 318 - M.GY - 11); slurry(g, 68, M.GY + 11, 30, 318 - M.GY - 11);
      [22, 52, 68, 98].forEach((xx) => Ln(g, xx, M.GY + 11, xx, 318, SK('wall', 1)));
      const gr = grab(g, 83, 300, 14, 0.5);
      crane(g, M, 83, gr.top - 4, { reach: 104, tipY: 18 });
      el('text', { x: 60, y: 310, 'text-anchor': 'middle', class: 'pr-tx pr-big', text: 'P' }, g);
    } },
    { w: 240, t: 'A tábla közepe', d: 'A középső harapás után a primer tábla teljes hosszában nyitva áll – zagy alatt.', draw(g, M) {
      rfBase(g, M, 1);
      rfPanel(g, M, 'P1', 'slurry', { lab: 'P' });
      const gr = grab(g, 60, 276, 14, 0.2);
      crane(g, M, 60, gr.top - 4, { reach: 110, tipY: 18 });
      tag(g, 140, 246, EN ? 'slurry' : 'zagy', { to: [92, 246] });
    } },
    { w: 240, t: 'Vasalás, betonozás', d: 'A tábla végére szakaszoló palló, a résbe a vasalási armatúra (hossztól függően 1–3 db) kerül, majd két betonozócsővel alulról betonoznak.', draw(g, M) {
      rfBase(g, M, 1);
      rfPanel(g, M, 'P1', 'slurry');
      concrete(g, 22, 250, 76, 68);
      for (let xx = 30; xx < 92; xx += 9) Ln(g, xx, M.GY - 10, xx, 314, SK('rebar', 1));
      for (let yy = M.GY; yy < 314; yy += 12) Ln(g, 28, yy, 92, yy, SK('rebar2', 0.9));
      tremie(g, 42, 96, 300, { full: true }); tremie(g, 78, 96, 300, { full: true });
      mixer(g, M, 132, 1);
      P(g, `M${134} ${M.GY - 34} L${95} ${97}`, SK('steel3', 3.4, 'stroke-linecap:round'));
      el('text', { x: 60, y: 238, 'text-anchor': 'middle', class: 'pr-tx pr-big', text: 'P' }, g);
      tag(g, 124, 286, EN ? 'fresh concrete' : 'friss beton', { to: [98, 286] });
    } },
    { w: 240, t: 'Közbenső tábla', d: 'Két kész primer tábla között kiharapják a közbenső (szekunder) táblát.', draw(g, M) {
      rfBase(g, M, 1);
      rfPanel(g, M, 'P1', 'conc', { lab: 'P' }); rfPanel(g, M, 'P2', 'conc', { lab: 'P' }); rfPanel(g, M, 'S1', 'slurry', { lab: 'S' });
      const gr = grab(g, 116, 290, 15, 0.3);
      crane(g, M, 116, gr.top - 4, { reach: 84, tipY: 18 });
    } },
    { w: 240, t: 'Vasalás, betonozás', d: 'A közbenső tábla vasalása és betonozása után a táblák összefüggő falat alkotnak.', draw(g, M) {
      rfBase(g, M, 1);
      rfPanel(g, M, 'P1', 'conc', { lab: 'P' }); rfPanel(g, M, 'P2', 'conc', { lab: 'P' }); rfPanel(g, M, 'S1', 'conc', { lab: 'S', fresh: true });
      worker(g, 160, { GY: M.GY - 3, pose: 'stand' });
    } },
  ],
};



/* ================================================================== megjelenítés */
function drawStep(M, i, ox) {
  const st = M.steps[i], W = st.w, H = M.H;
  CUR.W = W;
  const s = el('svg', { viewBox: `0 0 ${W} ${H}`, class: 'pr-svg', role: 'img', 'aria-label': `${i + 1}. ${st.t}` });
  const g = g_(s);
  backdrop(g, M, ox, W);
  st.draw(g, M);
  if (i === 0) {
    M.layers.forEach((l, k) => {
      const t0 = k === 0 ? M.GY : l.y, t1 = k + 1 < M.layers.length ? M.layers[k + 1].y : M.H;
      if (l.lab) tag(g, 6, l.ly ?? Math.min(t0 + 18, (t0 + t1) / 2), l.lab, { fs: 9.5 });
    });
  }
  if (M.gw) {
    const gx = W - 18, gy = M.gw;
    P(g, `M${gx - 6} ${gy - 9} h12 l-6 8z`, F('halo') + `;stroke:${v('water')};stroke-width:1.6`);
    Ln(g, gx - 4, gy + 3, gx + 4, gy + 3, SK('water', 1.2));
    Ln(g, gx - 2, gy + 6, gx + 2, gy + 6, SK('water', 1.2));
  }
  badge(g, i + 1);
  return s;
}

function render(el0) {
  const M = PROC[el0.dataset.proc]; if (!M) return;
  defs();
  el0.classList.add('pr-strip');
  el0.style.setProperty('--n', M.steps.length);
  el0.dataset.n = M.steps.length;
  el0.style.gridTemplateColumns = M.steps.map((s) => `minmax(0, ${s.w}fr)`).join(' ');
  let ox = 0;
  M.steps.forEach((st, i) => {
    el0.append(h('figure', { class: 'pr-col', style: `--w:${st.w}` }, drawStep(M, i, ox), h('figcaption', {}, h('b', {}, h('i', {}, String(i + 1)), st.t), h('span', {}, st.d))));
    ox += st.w;
  });
}

function init() { document.querySelectorAll('[data-proc]').forEach(render); }
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
