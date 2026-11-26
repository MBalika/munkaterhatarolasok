// Hős-ábra: dúcolt résfalas városi munkagödör építésének sorrendje.
// Előbb a résfal készül el teljes mélységig (résvezető gerenda → réselés résiszap alatt →
// vasalási armatúra → betonozás alulról → fejgerenda), csak utána kezdődik a kiemelés,
// fogásonként: mindig kicsivel a következő dúcsor alá, majd beépítik a dúcsort.
import { $, svg, fmt, clamp, lerp, smooth, EN } from './core.js';

const W = 800, VH = 424, H0 = 120, PX = 14;       // terep y-ja, px / m
const XL = 272, XR = 532, TW = 11;                 // a gödör belső falsíkjai, falvastagság (0,8 m)
const XCL = XL - TW / 2, XCR = XR + TW / 2, XM = (XL + XR) / 2;
const FILL = 2.0, GW = 4.5, CLAY = 9.0, TOE = 19.0; // rétegek, talajvíz, falláb (m)
const STRUT = [2.0, 6.5, 11.0];                    // dúcsorok szintje (m)
const DIG = [2.8, 7.3, 11.8, 15.0];                // kiemelési fogások alja (m)
const SLAB = 1.0;                                  // alaplemez vastagsága (m)
const y = (d) => H0 + d * PX;
const CAGE_T = 0.25, CAGE_B = TOE - 0.15;          // armatúra teteje, alja (m)

// idővonal (s)
const P = {
  guide: [0, 1.6],
  tL: [1.6, 5.0], cL: [5.0, 6.4], bL: [6.4, 8.4],
  tR: [8.4, 10.6], cR: [10.6, 11.6], bR: [11.6, 13.2],
  cap: [13.2, 15.2],
  d1: [15.2, 18.4], s1: [18.4, 21.4],
  d2: [21.4, 24.8], s2: [24.8, 27.8],
  d3: [27.8, 31.2], s3: [31.2, 34.2],
  d4: [34.2, 37.6], slab: [37.6, 40.4],
};
const END = P.slab[1];
const DPH = ['d1', 'd2', 'd3', 'd4'], SPH = ['s1', 's2', 's3'];
const u = (t, ph) => clamp((t - P[ph][0]) / (P[ph][1] - P[ph][0]), 0, 1);
const inP = (t, ph) => t >= P[ph][0] && t < P[ph][1];

// lépések (a csúszka melletti számláló és a leírás)
const STEPS = [
  { at: 0, n: 1, title: 'Résvezető gerenda', txt: 'Először a rés két oldalán 1,0–1,5 m magas vasbeton gerendapár készül: ez vezeti a markolót, és megtámasztja a felső, laza talajt.' },
  { at: P.tL[0], n: 2, title: 'Réselés bentonitos résiszap alatt', txt: 'A markológép a tervezett mélységig, a vízzáró agyagba kiemeli a rést. A kiemelt föld helyét folyamatosan bentonitos résiszap tölti ki – ez támasztja meg a rés falát.' },
  { at: P.cL[0], n: 2, title: 'Vasalási armatúra', txt: 'A daru a résiszappal teli résbe engedi a vasalási armatúrát.' },
  { at: P.bL[0], n: 2, title: 'Betonozás alulról', txt: 'Betonozócsövön át, alulról felfelé betonoznak: a nehezebb beton kiszorítja a résiszapot, amelyet visszavezetnek a keverőtelepre.' },
  { at: P.tR[0], n: 3, title: 'A szemközti fal', txt: 'A túloldalon ugyanígy, táblánként készül a résfal. A fal körbezárja a munkagödröt, mielőtt egy lapát földet is kiemelnének belőle.' },
  { at: P.cap[0], n: 4, title: 'Kész a résfal', txt: 'A táblák tetejét vasbeton fejgerenda fogja össze. A fal teljes mélységben elkészült, és a vízzáró agyagba köt – csak most kezdődik a kiemelés.' },
  { at: P.d1[0], n: 5, title: 'Kiemelés az 1. dúcsor alá', txt: 'A földet csak kicsivel az első dúcsor szintje alá emelik ki: addig a fal a befogásával, konzolként áll.' },
  { at: P.s1[0], n: 6, title: '1. dúcsor', txt: 'A falakra acél mellgerenda kerül, a daru a helyére emeli a csőtámaszt, és sajtóval előfeszítik. Csak ezután szabad tovább mélyíteni.' },
  { at: P.d2[0], n: 7, title: 'Kiemelés a 2. dúcsor alá', txt: 'A következő fogás a második dúcsor alá ér. A talajvízszint alatt a falak által körbezárt vizet szivattyúval kiemelik – kívül a talajvíz a helyén marad.' },
  { at: P.s2[0], n: 8, title: '2. dúcsor', txt: 'Mellgerenda, csőtámasz, előfeszítés – ugyanúgy, mint fölötte.' },
  { at: P.d3[0], n: 9, title: 'Kiemelés a 3. dúcsor alá', txt: 'A gödör már a vízzáró agyagban mélyül: alulról sem jut be víz, mert a fal a vízzáró rétegbe köt.' },
  { at: P.s3[0], n: 10, title: '3. dúcsor', txt: 'A legalsó dúcsor kapja a legnagyobb erőt: a földnyomás a mélységgel nő.' },
  { at: P.d4[0], n: 11, title: 'Kiemelés a végleges szintig', txt: 'Az utolsó fogással a gödör eléri a tervezett alapozási síkot. A kitermelt földet a daru emeli ki a dúcok között.' },
  { at: P.slab[0], n: 12, title: 'Alaplemez', txt: 'A daru kiemeli a kotrót, és elkészül a szerelőbeton és a vasbeton alaplemez. Ezután épülnek a pinceszintek; a dúcokat a födémek elkészültével, alulról felfelé haladva bontják vissza.' },
];
const NSTEP = 12;

// kiemelési mélység az idő függvényében
function depth(t) {
  let H = 0;
  DPH.forEach((ph, i) => {
    const a = i ? DIG[i - 1] : 0;
    if (t >= P[ph][0]) H = lerp(a, DIG[i], smooth(u(t, ph)));
  });
  return H;
}

const MONO = 'JetBrains Mono, ui-monospace, monospace';
const COND = 'Barlow Condensed, Arial Narrow, sans-serif';

export function initHero() {
  const box = $('#heroViz'); if (!box) return;
  const s = svg('svg', { viewBox: `0 0 ${W} ${VH}`, role: 'img', 'aria-label': 'Dúcolt résfalas munkagödör építésének sorrendje' });
  box.prepend(s);
  const defs = svg('defs', {}, s);
  defs.innerHTML = `
    <linearGradient id="hxSky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0e1724"/><stop offset=".72" stop-color="#22303f"/><stop offset="1" stop-color="#3d3a3a"/></linearGradient>
    <radialGradient id="hxGlow" cx=".5" cy="1" r=".9"><stop offset="0" stop-color="#f0a33a" stop-opacity=".28"/><stop offset="1" stop-color="#f0a33a" stop-opacity="0"/></radialGradient>
    <radialGradient id="hxMoon" cx=".5" cy=".5" r=".5"><stop offset=".55" stop-color="#f4ecd6"/><stop offset="1" stop-color="#f4ecd6" stop-opacity="0"/></radialGradient>
    <linearGradient id="hxPit" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#151a20"/><stop offset="1" stop-color="#0b0e12"/></linearGradient>
    <linearGradient id="hxBeam" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffd98a" stop-opacity=".22"/><stop offset="1" stop-color="#ffd98a" stop-opacity="0"/></linearGradient>
    <linearGradient id="hxPipe" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f08a5c"/><stop offset=".35" stop-color="#d4573a"/><stop offset="1" stop-color="#8e2f1f"/></linearGradient>
    <linearGradient id="hxSilo" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#8d969f"/><stop offset=".4" stop-color="#d6dbe0"/><stop offset="1" stop-color="#7a838c"/></linearGradient>
    <linearGradient id="hxSlurry" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#7d9a9a"/><stop offset="1" stop-color="#4f6869"/></linearGradient>
    <pattern id="hxFill" width="14" height="12" patternUnits="userSpaceOnUse"><rect width="14" height="12" fill="#6b645a"/><rect x="2" y="3" width="3" height="2" fill="#544e46"/><circle cx="10" cy="8" r="1.3" fill="#8a8273"/><rect x="8" y="1" width="2" height="1.5" fill="#7e776b"/></pattern>
    <pattern id="hxSand" width="12" height="10" patternUnits="userSpaceOnUse"><rect width="12" height="10" fill="#b39b6c"/><circle cx="2" cy="2" r="1.1" fill="#8f7a52"/><circle cx="8" cy="6" r="1.5" fill="#c9b384"/><circle cx="5" cy="8.5" r=".7" fill="#8f7a52"/><circle cx="10.5" cy="1.5" r=".6" fill="#7d6a46"/></pattern>
    <pattern id="hxClay" width="16" height="9" patternUnits="userSpaceOnUse"><rect width="16" height="9" fill="#77573c"/><path d="M0 4.5h7M9 2h6M3 7.5h9" stroke="#5f442e" stroke-width="1"/></pattern>
    <pattern id="hxConc" width="8" height="8" patternUnits="userSpaceOnUse"><rect width="8" height="8" fill="#b3ada2"/><circle cx="2" cy="3" r=".8" fill="#8a857c"/><circle cx="6" cy="6.5" r=".6" fill="#8a857c"/><circle cx="5.5" cy="1.5" r=".5" fill="#cfc9be"/></pattern>
    <pattern id="hxBack" x="${XL}" y="${H0}" width="58" height="40" patternUnits="userSpaceOnUse"><rect width="58" height="40" fill="#4a4842"/><rect width="2" height="40" fill="#2c2b27"/><rect x="2" width="1" height="40" fill="#5d5a53"/><circle cx="14" cy="9" r=".9" fill="#3a3934"/><circle cx="37" cy="27" r="1.1" fill="#3a3934"/><circle cx="47" cy="12" r=".7" fill="#605d56"/><circle cx="24" cy="33" r=".8" fill="#605d56"/><path d="M8 20 q 6 2 10 0" stroke="#3e3c37" stroke-width=".6" fill="none"/></pattern>
    <linearGradient id="hxShade" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0b0e12" stop-opacity=".25"/><stop offset="1" stop-color="#0b0e12" stop-opacity=".82"/></linearGradient>
    <linearGradient id="hxCone" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffe0a0" stop-opacity=".34"/><stop offset="1" stop-color="#ffe0a0" stop-opacity=".04"/></linearGradient>
    <radialGradient id="hxLamp" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#fff3cf"/><stop offset=".35" stop-color="#ffd98a" stop-opacity=".7"/><stop offset="1" stop-color="#ffd98a" stop-opacity="0"/></radialGradient>
    <linearGradient id="hxSoilShade" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".35"/></linearGradient>
    <pattern id="hxLat" width="8" height="10" patternUnits="userSpaceOnUse"><path d="M0 10 L4 0 L8 10" stroke="#e8b23e" stroke-width="1" fill="none"/></pattern>`;

  const G = () => svg('g', {}, s);
  const gSky = G(), gTown = G(), gSoil = G(), gWin = G(), gPit = G(), gWall = G(), gSlab = G(), gExc = G(), gLoad = G(), gStrut = G(), gCrane = G(), gRig = G(), gTruck = G(), gLab = G();

  // ---------------------------------------------------------------- statikus háttér
  svg('rect', { x: 0, y: 0, width: W, height: H0, fill: 'url(#hxSky)' }, gSky);
  for (let i = 0; i < 46; i++) svg('circle', { cx: (i * 89 + 17) % W, cy: 6 + ((i * 41) % 66), r: i % 4 ? 0.6 : 1.1, fill: '#fff', opacity: i % 3 ? 0.35 : 0.6 }, gSky);
  svg('circle', { cx: 700, cy: 22, r: 16, fill: 'url(#hxMoon)', opacity: 0.9 }, gSky);
  svg('ellipse', { cx: XM, cy: H0 + 4, rx: 360, ry: 70, fill: 'url(#hxGlow)' }, gSky);
  // távoli városkép
  const far = [[0, 64, 30], [28, 50, 26], [52, 74, 22], [72, 42, 34], [104, 60, 26], [128, 36, 18], [144, 70, 30], [176, 56, 24], [198, 80, 30], [228, 66, 26], [252, 50, 20], [270, 72, 34], [302, 58, 26], [326, 84, 30], [354, 62, 22], [374, 76, 30], [402, 54, 28], [428, 70, 24], [450, 60, 30], [478, 80, 26], [502, 66, 34], [534, 74, 28], [560, 58, 30]];
  for (const [x, yy, w] of far) {
    svg('rect', { x, y: yy, width: w, height: H0 - yy, fill: '#1f2833' }, gTown);
    for (let r = yy + 6; r < H0 - 8; r += 9) for (let c = x + 4; c < x + w - 4; c += 7) if ((r * 7 + c * 3) % 11 === 0) svg('rect', { x: c, y: r, width: 3, height: 3, fill: '#f0c27a', opacity: 0.55 }, gTown);
  }
  // szomszéd épület pincével
  const bx = 598, bw = 202, btop = 52;
  svg('rect', { x: bx, y: btop, width: bw, height: H0 - btop, fill: '#39404a' }, gTown);
  svg('rect', { x: bx - 3, y: btop - 5, width: bw + 6, height: 6, fill: '#4a525d' }, gTown);
  for (let r = 0; r < 4; r++) for (let c = 0; c < 7; c++) {
    const lit = (r * 5 + c * 3) % 4 !== 0;
    svg('rect', { x: bx + 12 + c * 27, y: btop + 8 + r * 15, width: 15, height: 9, rx: 1, fill: lit ? '#f3c77d' : '#4f5863', opacity: lit ? 0.92 : 1 }, gTown);
  }
  svg('rect', { x: bx + 86, y: H0 - 16, width: 22, height: 16, fill: '#2a2f36' }, gTown);
  // utca
  svg('rect', { x: 0, y: H0 - 5, width: 224, height: 5, fill: '#3a3e44' }, gTown);
  svg('rect', { x: 196, y: H0 - 7, width: 28, height: 7, fill: '#55595f' }, gTown);
  for (let x = 10; x < 190; x += 30) svg('rect', { x, y: H0 - 3.5, width: 14, height: 1.6, fill: '#d9d2c4', opacity: 0.55 }, gTown);
  for (const lx of [30, 186]) {
    svg('path', { d: `M ${lx} ${H0 - 6} V ${H0 - 50} q 0 -6 8 -6 h 6`, stroke: '#5b6067', 'stroke-width': 2.2, fill: 'none' }, gTown);
    svg('ellipse', { cx: lx + 14, cy: H0 - 54, rx: 5, ry: 2.2, fill: '#ffe2a8' }, gTown);
    svg('path', { d: `M ${lx + 9} ${H0 - 53} L ${lx - 6} ${H0 - 6} L ${lx + 36} ${H0 - 6} L ${lx + 19} ${H0 - 53} Z`, fill: '#ffe2a8', opacity: 0.08 }, gTown);
  }
  // kerítés (palánk)
  for (const [x0, x1] of [[226, 250], [574, 596]]) {
    svg('rect', { x: x0, y: H0 - 22, width: x1 - x0, height: 22, fill: '#2d3238' }, gTown);
    for (let x = x0; x < x1; x += 8) svg('path', { d: `M ${x} ${H0 - 22} l 4 0 l -4 5 z`, fill: '#f0a33a' }, gTown);
  }

  // talajrétegek
  const lay = (d0, d1, fill) => svg('rect', { x: 0, y: y(d0), width: W, height: y(d1) - y(d0), fill }, gSoil);
  lay(0, FILL, 'url(#hxFill)'); lay(FILL, CLAY, 'url(#hxSand)'); lay(CLAY, (VH - H0) / PX + 1, 'url(#hxClay)');
  svg('rect', { x: 0, y: H0, width: W, height: VH - H0, fill: 'url(#hxSoilShade)' }, gSoil);
  svg('line', { x1: 0, y1: y(FILL), x2: W, y2: y(FILL), stroke: '#4a443c', 'stroke-width': 1 }, gSoil);
  svg('line', { x1: 0, y1: y(CLAY), x2: W, y2: y(CLAY), stroke: '#4d3826', 'stroke-width': 1.2 }, gSoil);
  // talajvíz a falakon kívül
  for (const [x0, x1] of [[0, XL], [XR, W]]) {
    svg('rect', { x: x0, y: y(GW), width: x1 - x0, height: y(CLAY) - y(GW), fill: '#3d8fd1', opacity: 0.26 }, gSoil);
    const wl = svg('line', { x1: x0, y1: y(GW), x2: x1, y2: y(GW), stroke: '#7cc0f2', 'stroke-width': 1.6, 'stroke-dasharray': '8 6' }, gSoil);
    svg('animate', { attributeName: 'stroke-dashoffset', from: 0, to: -28, dur: '2.4s', repeatCount: 'indefinite' }, wl);
  }
  // közművek az utca alatt
  svg('circle', { cx: 30, cy: y(1.2), r: 7, fill: '#22272d', stroke: '#6aa6d6', 'stroke-width': 3 }, gSoil);
  svg('circle', { cx: 58, cy: y(0.9), r: 4.5, fill: '#22272d', stroke: '#d0b26a', 'stroke-width': 2.5 }, gSoil);
  svg('rect', { x: 74, y: y(0.6), width: 16, height: 9, rx: 2, fill: '#22272d', stroke: '#9a8fd0', 'stroke-width': 2 }, gSoil);
  // szomszéd pince és alap
  svg('rect', { x: bx, y: H0, width: bw, height: 3.2 * PX, fill: '#262b31' }, gSoil);
  svg('rect', { x: bx - 6, y: y(3.2), width: bw + 12, height: 0.6 * PX, fill: 'url(#hxConc)' }, gSoil);
  svg('text', { x: bx + 14, y: H0 + 27, fill: '#c9c2b4', 'font-size': 13, 'font-family': COND, 'font-weight': 700, 'letter-spacing': '0.06em', text: 'SZOMSZÉD PINCE' }, gSoil);
  // daru alapteste
  svg('rect', { x: 546, y: H0, width: 26, height: 2.2 * PX, fill: 'url(#hxConc)' }, gSoil);

  // ---------------------------------------------------------------- dinamikus elemek
  const A = (el, a) => { for (const k in a) el.setAttribute(k, a[k]); return el; };
  const show = (el, on) => { el.style.display = on ? '' : 'none'; };

  // belső víz (a falak között) – szivattyúzáskor a kiemelési sík alá süllyed
  const winBand = svg('rect', { x: XL, width: XR - XL, fill: '#3d8fd1', opacity: 0.26 }, gWin);
  const winLine = svg('line', { x1: XL, x2: XR, stroke: '#7cc0f2', 'stroke-width': 1.4, 'stroke-dasharray': '6 5' }, gWin);

  // gödör (kiemelt tér), munkafény
  const pit = svg('rect', { x: XL, y: H0, width: XR - XL, height: 0, fill: 'url(#hxBack)' }, gPit);
  const pitShade = svg('rect', { x: XL, y: H0, width: XR - XL, height: 0, fill: 'url(#hxShade)' }, gPit);
  const floor = svg('rect', { x: XL, width: XR - XL, height: 3, fill: '#8f7a55', opacity: 0.55 }, gPit);
  const cones = [svg('path', { fill: 'url(#hxCone)' }, gPit), svg('path', { fill: 'url(#hxCone)' }, gPit)];
  const pile = svg('path', { fill: '#7a5f40' }, gPit);

  // falak: résiszap, beton, armatúra, résvezető, fejgerenda
  const mkWall = (xc) => {
    const x = xc - TW / 2;
    const o = {};
    o.slurry = svg('rect', { x, width: TW, fill: 'url(#hxSlurry)' }, gWall);
    o.conc = svg('rect', { x, width: TW, fill: 'url(#hxConc)' }, gWall);
    o.edge = svg('rect', { x, width: TW, fill: 'none', stroke: '#6d685f', 'stroke-width': 0.8 }, gWall);
    o.cage = svg('g', {}, gWall);
    for (const dx of [-3, 3]) svg('line', { x1: xc + dx, y1: 0, x2: xc + dx, y2: (CAGE_B - CAGE_T) * PX, stroke: '#c8874a', 'stroke-width': 1 }, o.cage);
    for (let k = 6; k < (CAGE_B - CAGE_T) * PX; k += 9) svg('line', { x1: xc - 3, y1: k, x2: xc + 3, y2: k, stroke: '#c8874a', 'stroke-width': 0.8 }, o.cage);
    o.guide = svg('g', {}, gWall);
    for (const gx of [x - 5, x + TW]) svg('rect', { x: gx, y: H0 - 2, width: 5, height: 1.2 * PX + 2, fill: '#c1bbae', stroke: '#8a857c', 'stroke-width': 0.6 }, o.guide);
    o.cap = svg('rect', { x: x - 3, y: H0 - 9, width: TW + 6, height: 1.3 * PX + 9, rx: 1.5, fill: '#c4beb1', stroke: '#8a857c', 'stroke-width': 0.8 }, gWall);
    o.tremie = svg('g', {}, gWall);
    o.tpipe = svg('line', { x1: xc, x2: xc, y1: H0 - 22, stroke: '#9aa3ad', 'stroke-width': 2.6 }, o.tremie);
    svg('path', { d: `M ${xc - 9} ${H0 - 34} L ${xc + 9} ${H0 - 34} L ${xc + 2} ${H0 - 22} L ${xc - 2} ${H0 - 22} Z`, fill: '#9aa3ad', stroke: '#6b737c', 'stroke-width': 0.8 }, o.tremie);
    svg('path', { d: `M ${xc - 7} ${H0 - 33} L ${xc + 7} ${H0 - 33} L ${xc + 4} ${H0 - 29} L ${xc - 4} ${H0 - 29} Z`, fill: '#b3ada2' }, o.tremie);
    return o;
  };
  const WL = mkWall(XCL), WR = mkWall(XCR);
  // toldat: falláb-felirat
  const toeLab = svg('g', {}, gWall);
  svg('path', { d: `M ${XL + 8} ${y(17.2)} L ${XL + 2} ${y(TOE) - 8} M ${XR - 8} ${y(17.2)} L ${XR - 2} ${y(TOE) - 8}`, stroke: '#e9e3d6', 'stroke-width': 1, fill: 'none', opacity: 0.8 }, toeLab);
  svg('text', { x: XM, y: y(17.2) + 4, 'text-anchor': 'middle', fill: '#f1ece2', 'font-size': 13, 'font-family': MONO, text: 'a résfal a vízzáró agyagba köt' }, toeLab);

  // alaplemez
  const lean = svg('rect', { x: XL, width: XR - XL, height: 2.5, fill: '#9c978e' }, gSlab);
  const slab = svg('rect', { x: XL, width: XR - XL, fill: 'url(#hxConc)', stroke: '#8a857c', 'stroke-width': 0.8 }, gSlab);
  const slabLab = svg('text', { x: XM, 'text-anchor': 'middle', fill: '#2a2620', 'font-size': 12, 'font-weight': 700, 'font-family': MONO, text: 'alaplemez' }, gSlab);

  // kotró (balra néz), pályára állítva a gödör alján
  const exc = svg('g', {}, gExc);
  svg('rect', { x: -30, y: -9, width: 60, height: 9, rx: 4.5, fill: '#2a2a2a' }, exc);
  for (const wx of [-23, -11.5, 0, 11.5, 23]) svg('circle', { cx: wx, cy: -4.5, r: 2.8, fill: '#5a5a5a' }, exc);
  svg('rect', { x: -21, y: -23, width: 46, height: 13, rx: 2, fill: '#f0a33a' }, exc);
  svg('rect', { x: 14, y: -24, width: 14, height: 13, rx: 2, fill: '#c98326' }, exc);
  svg('rect', { x: -20, y: -38, width: 17, height: 16, rx: 2, fill: '#f0a33a' }, exc);
  svg('rect', { x: -18, y: -35, width: 11, height: 9, rx: 1, fill: '#9fc6de', opacity: 0.85 }, exc);
  const mkArm = (animated) => {
    const arm = svg('g', {}, exc);
    svg('path', { d: 'M -13 -24 L -44 -54', stroke: '#e0952a', 'stroke-width': 6.5, 'stroke-linecap': 'round', fill: 'none' }, arm);
    const stick = svg('g', {}, arm);
    svg('path', { d: 'M -44 -54 L -64 -16', stroke: '#d48a24', 'stroke-width': 4.5, 'stroke-linecap': 'round', fill: 'none' }, stick);
    svg('path', { d: 'M -70 -20 l 11 -3 l 3 12 q -8 4 -15 -2 z', fill: '#6a6a6a', stroke: '#444', 'stroke-width': 0.8 }, stick);
    if (animated) {
      svg('animateTransform', { attributeName: 'transform', type: 'rotate', values: '0 -13 -24; 9 -13 -24; -5 -13 -24; 0 -13 -24', keyTimes: '0; 0.4; 0.75; 1', dur: '2.6s', repeatCount: 'indefinite' }, arm);
      svg('animateTransform', { attributeName: 'transform', type: 'rotate', values: '0 -44 -54; -22 -44 -54; 10 -44 -54; 0 -44 -54', keyTimes: '0; 0.4; 0.75; 1', dur: '2.6s', repeatCount: 'indefinite' }, stick);
    }
    return arm;
  };
  const armStill = mkArm(false), armDig = mkArm(true);
  const excHook = svg('g', {}, exc);   // emeléskor a horog függesztékei
  svg('path', { d: 'M -18 -38 L 2 -62 L 22 -24', stroke: '#d9d2c4', 'stroke-width': 1, fill: 'none' }, excHook);

  // szivattyú és tömlő
  const pump = svg('g', {}, gExc);
  const pumpBox = svg('rect', { width: 14, height: 9, rx: 2, fill: '#3f7fb8', stroke: '#9cc6e8', 'stroke-width': 0.8 }, pump);
  const hose = svg('path', { fill: 'none', stroke: '#2c5f8c', 'stroke-width': 2.4 }, pump);
  const hoseFlow = svg('path', { fill: 'none', stroke: '#9cd2f7', 'stroke-width': 1, 'stroke-dasharray': '3 7' }, pump);
  svg('animate', { attributeName: 'stroke-dashoffset', from: 0, to: -20, dur: '0.9s', repeatCount: 'indefinite' }, hoseFlow);

  // daruteher: konténer (föld), kötél
  const skip = svg('g', {}, gLoad);
  svg('path', { d: 'M -12 -13 L 12 -13 L 9 0 L -9 0 Z', fill: '#7d8792', stroke: '#4f565e', 'stroke-width': 0.8 }, skip);
  const skipSoil = svg('path', { d: 'M -11 -13 Q 0 -21 11 -13 Z', fill: '#8c7250' }, skip);
  svg('path', { d: 'M -10 -13 L 0 -26 L 10 -13', stroke: '#d9d2c4', 'stroke-width': 0.9, fill: 'none' }, skip);

  // dúcsorok: mellgerendák, csőtámasz, sajtó
  const struts = STRUT.map((d, i) => {
    const o = { d };
    o.wale = svg('g', {}, gStrut);
    for (const x of [XL, XR - 7]) {
      svg('rect', { x, y: y(d) - 7, width: 7, height: 14, fill: '#3d4752', stroke: '#8a97a4', 'stroke-width': 0.8 }, o.wale);
      svg('line', { x1: x + 3.5, y1: y(d) - 7, x2: x + 3.5, y2: y(d) + 7, stroke: '#8a97a4', 'stroke-width': 0.8 }, o.wale);
    }
    o.tube = svg('g', {}, gStrut);
    const L = XR - XL - 14;
    svg('rect', { x: XL + 7, y: -5.5, width: L, height: 11, rx: 5.5, fill: 'url(#hxPipe)' }, o.tube);
    svg('rect', { x: XL + 12, y: -4, width: L - 10, height: 2, rx: 1, fill: '#ffb08a', opacity: 0.55 }, o.tube);
    for (const x of [XL + 7, XR - 10]) svg('rect', { x, y: -8, width: 3, height: 16, fill: '#59626c' }, o.tube);
    svg('rect', { x: XR - 26, y: -7, width: 12, height: 14, rx: 1.5, fill: '#2f353c', stroke: '#8a97a4', 'stroke-width': 0.7 }, o.tube);
    o.sling = svg('path', { d: `M ${XM - 70} -5 L ${XM} -30 L ${XM + 70} -5`, stroke: '#d9d2c4', 'stroke-width': 1, fill: 'none' }, o.tube);
    o.glow = svg('g', {}, o.tube);
    for (const x of [XL + 8, XR - 9]) svg('circle', { cx: x, cy: 0, r: 9, fill: '#ffcf6a', opacity: 0.5 }, o.glow);
    svg('path', { d: `M ${XR - 40} -12 l 12 0 m -5 -4 l 5 4 l -5 4`, stroke: '#ffcf6a', 'stroke-width': 1.6, fill: 'none' }, o.glow);
    o.badge = svg('g', {}, gStrut);
    svg('circle', { cx: XL + 22, cy: y(d) - 15, r: 8, fill: '#f0a33a' }, o.badge);
    svg('text', { x: XL + 22, y: y(d) - 11, 'text-anchor': 'middle', fill: '#1a1408', 'font-size': 11, 'font-weight': 800, 'font-family': MONO, text: String(i + 1) }, o.badge);
    return o;
  });

  // toronydaru (jobbra, a szomszéd felé eső oldalon), gém a gödör és az utca fölött
  const MX = 558, JT = 24, JB = 34;
  svg('rect', { x: MX - 6, y: 30, width: 12, height: H0 - 30, fill: 'url(#hxLat)', stroke: '#e8b23e', 'stroke-width': 1.2 }, gCrane);
  svg('path', { d: `M 104 ${JB} L ${MX} ${JB} L ${MX} ${JT} L 112 ${JT} Z`, fill: 'none', stroke: '#e8b23e', 'stroke-width': 1.3 }, gCrane);
  let zz = `M 106 ${JB}`; for (let x = 112; x <= MX; x += 12) zz += ` L ${x} ${(x - 112) % 24 ? JB : JT}`;
  svg('path', { d: zz, fill: 'none', stroke: '#e8b23e', 'stroke-width': 0.9 }, gCrane);
  svg('path', { d: `M ${MX} ${JT + 2} L 642 ${JT + 4} L 642 ${JB} L ${MX} ${JB}`, fill: 'none', stroke: '#e8b23e', 'stroke-width': 1.3 }, gCrane);
  svg('rect', { x: 612, y: JB, width: 28, height: 15, fill: '#9a958a', stroke: '#6b665e', 'stroke-width': 0.8 }, gCrane);
  svg('path', { d: `M ${MX} ${JT} L ${MX} 4 M ${MX} 4 L 116 ${JT} M ${MX} 4 L 640 ${JT + 4}`, stroke: '#cfc8b5', 'stroke-width': 0.8, fill: 'none' }, gCrane);
  svg('rect', { x: MX - 20, y: JB, width: 14, height: 12, rx: 1.5, fill: '#f0a33a' }, gCrane);
  svg('rect', { x: MX - 18, y: JB + 2, width: 8, height: 6, fill: '#9fc6de', opacity: 0.85 }, gCrane);
  svg('circle', { cx: MX, cy: 6, r: 1.8, fill: '#ff4a3a' }, gCrane);
  const trolley = svg('rect', { y: JB, width: 12, height: 5, fill: '#c9c2b4' }, gCrane);
  const cable = svg('line', { stroke: '#d9d2c4', 'stroke-width': 1 }, gCrane);
  const hook = svg('path', { fill: 'none', stroke: '#e8b23e', 'stroke-width': 1.8 }, gCrane);

  // résfalmarkoló (lánctalpas daru markolóval) és bentonitkeverő telep
  const rig = svg('g', {}, gRig);
  const rigIn = svg('g', {}, rig);
  const RB = 336;
  svg('rect', { x: RB - 30, y: H0 - 10, width: 62, height: 10, rx: 5, fill: '#2a2a2a' }, rigIn);
  for (const wx of [-22, -8, 6, 20]) svg('circle', { cx: RB + wx, cy: H0 - 5, r: 3, fill: '#5a5a5a' }, rigIn);
  svg('rect', { x: RB - 24, y: H0 - 29, width: 52, height: 18, rx: 2, fill: '#d8643a' }, rigIn);
  svg('rect', { x: RB + 18, y: H0 - 27, width: 14, height: 15, fill: '#a9472a' }, rigIn);
  svg('rect', { x: RB - 24, y: H0 - 42, width: 17, height: 15, rx: 2, fill: '#d8643a' }, rigIn);
  svg('rect', { x: RB - 22, y: H0 - 39, width: 11, height: 8, fill: '#9fc6de', opacity: 0.85 }, rigIn);
  const bpx = RB - 12, bpy = H0 - 26, tipx = XCL, tipy = 34;
  const nx = -(tipy - bpy), ny = tipx - bpx, nl = Math.hypot(nx, ny), ox = (nx / nl) * 3.2, oy = (ny / nl) * 3.2;
  svg('path', { d: `M ${bpx + ox} ${bpy + oy} L ${tipx + ox} ${tipy + oy} M ${bpx - ox} ${bpy - oy} L ${tipx - ox} ${tipy - oy}`, stroke: '#e07a4c', 'stroke-width': 1.5 }, rigIn);
  let bz = ''; for (let k = 0; k <= 10; k++) { const f = k / 10, px = lerp(bpx, tipx, f), py = lerp(bpy, tipy, f), sg = k % 2 ? 1 : -1; bz += `${k ? 'L' : 'M'} ${px + ox * sg} ${py + oy * sg} `; }
  svg('path', { d: bz, stroke: '#e07a4c', 'stroke-width': 0.9, fill: 'none' }, rigIn);
  svg('path', { d: `M ${RB + 14} ${H0 - 30} L ${RB + 4} ${H0 - 58} L ${tipx} ${tipy}`, stroke: '#cfc8b5', 'stroke-width': 0.8, fill: 'none' }, rigIn);
  svg('circle', { cx: tipx, cy: tipy, r: 2.5, fill: '#cfc8b5' }, rigIn);
  const gcable = svg('line', { x1: tipx, x2: tipx, y1: tipy, stroke: '#d9d2c4', 'stroke-width': 0.9 }, rigIn);
  const grab = svg('g', {}, rigIn);
  svg('rect', { x: tipx - 4.5, y: 0, width: 9, height: 20, rx: 1, fill: '#5e6a76', stroke: '#2e353c', 'stroke-width': 0.7 }, grab);
  svg('path', { d: `M ${tipx - 4.5} 20 L ${tipx - 5.5} 28 L ${tipx - 1} 26 Z M ${tipx + 4.5} 20 L ${tipx + 5.5} 28 L ${tipx + 1} 26 Z`, fill: '#3f474f' }, grab);
  const silo = svg('g', {}, gRig);
  svg('rect', { x: XM - 10, y: H0 - 80, width: 20, height: 52, rx: 2, fill: 'url(#hxSilo)' }, silo);
  svg('path', { d: `M ${XM - 10} ${H0 - 28} L ${XM + 10} ${H0 - 28} L ${XM + 3} ${H0 - 16} L ${XM - 3} ${H0 - 16} Z`, fill: '#8d969f' }, silo);
  svg('path', { d: `M ${XM - 9} ${H0 - 28} L ${XM - 11} ${H0} M ${XM + 9} ${H0 - 28} L ${XM + 11} ${H0}`, stroke: '#6b737c', 'stroke-width': 1.6 }, silo);
  svg('rect', { x: XM + 12, y: H0 - 12, width: 18, height: 12, rx: 2, fill: '#4b6b7a' }, silo);
  svg('text', { x: XM + 14, y: H0 - 58, fill: '#c9d3da', 'font-size': 11, 'font-family': MONO, text: EN ? 'bentonite' : 'bentonit' }, silo);
  const slHose = svg('path', { fill: 'none', stroke: '#5f8f96', 'stroke-width': 2.2 }, gRig);
  const mixer = svg('g', {}, gRig);
  const MX0 = XCL + 22;
  svg('rect', { x: MX0, y: H0 - 14, width: 84, height: 5, fill: '#2b2f34' }, mixer);
  const clip = svg('clipPath', { id: 'hxDrumClip' }, defs);
  svg('ellipse', { cx: MX0 + 34, cy: H0 - 30, rx: 30, ry: 15 }, clip);
  svg('ellipse', { cx: MX0 + 34, cy: H0 - 30, rx: 30, ry: 15, fill: '#d7d9dc', stroke: '#8d939a', 'stroke-width': 1 }, mixer);
  const drumC = svg('g', { 'clip-path': 'url(#hxDrumClip)' }, mixer);
  const drum = svg('g', {}, drumC);
  for (let k = -40; k <= 40; k += 12) svg('path', { d: `M ${MX0 + 34 + k} ${H0 - 46} q 9 16 0 32`, stroke: '#e07a4c', 'stroke-width': 2.4, fill: 'none' }, drum);
  svg('animateTransform', { attributeName: 'transform', type: 'translate', values: '0 0; -12 0', dur: '0.9s', repeatCount: 'indefinite' }, drum);
  svg('ellipse', { cx: MX0 + 26, cy: H0 - 38, rx: 16, ry: 4, fill: '#fff', opacity: 0.25 }, mixer);
  svg('rect', { x: MX0 + 66, y: H0 - 40, width: 20, height: 26, rx: 2, fill: '#e2e0da' }, mixer);
  svg('rect', { x: MX0 + 70, y: H0 - 37, width: 13, height: 9, rx: 1, fill: '#9fc6de', opacity: 0.85 }, mixer);
  svg('path', { d: `M ${MX0 + 4} ${H0 - 26} L ${XCL + 9} ${H0 - 32}`, stroke: '#8d939a', 'stroke-width': 3.2, 'stroke-linecap': 'round' }, mixer);
  for (const wx of [MX0 + 12, MX0 + 40, MX0 + 74]) { svg('circle', { cx: wx, cy: H0 - 6, r: 6, fill: '#1e1e1e' }, mixer); svg('circle', { cx: wx, cy: H0 - 6, r: 2.3, fill: '#777' }, mixer); }

  // díszvilágítás: két reflektor a gödör szélén
  const lampL = [258, H0 - 60], lampR = [548, 70];
  svg('path', { d: `M 254 ${H0} V ${H0 - 58} l 6 -3`, stroke: '#5b6067', 'stroke-width': 2.4, fill: 'none' }, gLab);
  for (const [lx, ly] of [lampL, lampR]) { svg('circle', { cx: lx, cy: ly, r: 11, fill: 'url(#hxLamp)' }, gLab); svg('rect', { x: lx - 3.5, y: ly - 2.5, width: 7, height: 5, rx: 1, fill: '#fff3cf' }, gLab); }

  // tehergépkocsi az utcán (a kitermelt föld)
  const TX = 112;
  svg('rect', { x: TX + 30, y: H0 - 29, width: 74, height: 18, rx: 1.5, fill: '#5f6d7a', stroke: '#3e4954', 'stroke-width': 0.8 }, gTruck);
  const tload = svg('path', { fill: '#8c7250' }, gTruck);
  svg('path', { d: `M ${TX} ${H0 - 11} L ${TX} ${H0 - 26} Q ${TX} ${H0 - 32} ${TX + 6} ${H0 - 32} L ${TX + 26} ${H0 - 32} L ${TX + 28} ${H0 - 11} Z`, fill: '#e2e0da' }, gTruck);
  svg('rect', { x: TX + 4, y: H0 - 29, width: 13, height: 8, rx: 1, fill: '#9fc6de', opacity: 0.85 }, gTruck);
  svg('rect', { x: TX, y: H0 - 13, width: 106, height: 4, fill: '#2b2f34' }, gTruck);
  for (const wx of [TX + 15, TX + 66, TX + 88]) { svg('circle', { cx: wx, cy: H0 - 6, r: 6.5, fill: '#1e1e1e' }, gTruck); svg('circle', { cx: wx, cy: H0 - 6, r: 2.5, fill: '#777' }, gTruck); }
  svg('circle', { cx: TX + 1, cy: H0 - 17, r: 1.6, fill: '#ffe2a8' }, gTruck);

  // feliratok
  const lab = (d, t) => svg('text', { x: XL - TW - 8, y: y(d) + 16, 'text-anchor': 'end', fill: '#efe9dd', opacity: 0.88, 'font-size': 12.5, 'font-family': MONO, text: t }, gLab);
  lab(0.55, 'feltöltés'); lab(FILL + 0.1, EN ? 'sand, gravel' : 'homok, kavics'); lab(CLAY + 0.3, 'vízzáró agyag');
  const streetLab = svg('text', { x: 8, y: y(2.0) + 14, fill: '#c9c2b4', 'font-size': 11, 'font-family': MONO, text: 'UTCA · KÖZMŰVEK' }, gLab);
  svg('path', { d: `M ${XR + 20} ${y(GW) - 13} l 12 0 l -6 9 z`, fill: '#7cc0f2' }, gLab);
  svg('text', { x: XR + 22, y: y(GW) + 17, fill: '#9fd2f7', 'font-size': 12.5, 'font-family': MONO, text: 'talajvíz −4,5 m' }, gLab);
  const dimG = svg('g', {}, gLab);
  const dimL = svg('path', { stroke: '#f6c27a', 'stroke-width': 1.4, fill: 'none' }, dimG);
  const dimT = svg('text', { 'text-anchor': 'end', fill: '#f6c27a', 'font-size': 15, 'font-weight': 700, 'font-family': MONO, stroke: '#121519', 'stroke-width': 3, 'paint-order': 'stroke' }, dimG);
  svg('line', { x1: 0, y1: H0, x2: W, y2: H0, stroke: '#d9d2c4', 'stroke-width': 1.3, opacity: 0.6 }, gLab);

  // ---------------------------------------------------------------- állapot rajzolása
  const PARK = 344, IDLE = 66;
  const wallState = (t, tr, cg, bt) => {
    const dT = t < P[tr][0] ? 0 : TOE * u(t, tr);
    const cT = t < P[bt][0] ? null : lerp(TOE, 0, smooth(u(t, bt)));
    const kc = u(t, cg);
    const cageY = t < P[cg][0] + 0.15 * (P[cg][1] - P[cg][0]) ? null : lerp(JB + 22, y(CAGE_T), smooth((kc - 0.22) / 0.78));
    const cageOp = smooth((kc - 0.15) / 0.1);
    return { dT, cT, cageY, cageOp };
  };
  const drawWall = (o, st, guideOp, capOp, xc, t, bt) => {
    const top = y(0.2);
    // résiszap a beton fölött
    const sBot = st.cT === null ? st.dT : st.cT;
    A(o.slurry, { y: top, height: Math.max(0, (sBot - 0.2) * PX) }); show(o.slurry, st.dT > 0.05 && sBot > 0.25);
    const cTop = st.cT === null ? TOE : st.cT;
    A(o.conc, { y: y(cTop), height: Math.max(0, (TOE - cTop) * PX) }); show(o.conc, st.cT !== null);
    A(o.edge, { y: top, height: Math.max(0, (st.dT - 0.2) * PX) }); show(o.edge, st.dT > 0.05);
    if (st.cageY === null) show(o.cage, false);
    else { show(o.cage, true); A(o.cage, { transform: `translate(0 ${st.cageY})`, opacity: st.cT !== null && st.cT < 0.3 ? 0.35 : st.cageOp }); }
    A(o.guide, { opacity: guideOp }); show(o.guide, guideOp > 0.01);
    A(o.cap, { opacity: capOp }); show(o.cap, capOp > 0.01);
    const tr = inP(t, bt);
    show(o.tremie, tr);
    if (tr) A(o.tpipe, { y2: y(st.cT) + 10 });
  };

  const draw = (t) => {
    const H = depth(t);
    // falak
    const guideOp = smooth(clamp(t / 1.2, 0, 1)) * (1 - smooth(clamp((t - P.cap[0]) / 0.7, 0, 1)));
    const capOp = smooth(clamp((t - P.cap[0] - 0.3) / 1.0, 0, 1));
    const sL = wallState(t, 'tL', 'cL', 'bL'), sR = wallState(t, 'tR', 'cR', 'bR');
    drawWall(WL, sL, guideOp, capOp, XCL, t, 'bL');
    drawWall(WR, sR, guideOp, capOp, XCR, t, 'bR');
    show(toeLab, t >= P.cap[0] + 0.5);

    // gödör
    A(pit, { height: H * PX }); show(pit, H > 0.02); A(pitShade, { height: H * PX }); show(pitShade, H > 0.02);
    A(floor, { y: y(H) - 1.5 }); show(floor, H > 0.2);
    cones.forEach((c) => show(c, H > 0.4));
    if (H > 0.4) {
      A(cones[0], { d: `M ${lampL[0]} ${lampL[1]} L ${XL + 2} ${y(H)} L ${XL + 175} ${y(H)} Z` });
      A(cones[1], { d: `M ${lampR[0]} ${lampR[1]} L ${XR - 2} ${y(H)} L ${XR - 175} ${y(H)} Z` });
    }
    // belső víz
    const pumping = H > GW - 0.6;
    const wIn = pumping ? Math.max(GW, H + 0.6) : GW;
    const wTop = Math.max(wIn, H);
    show(winBand, wTop < CLAY); show(winLine, wTop < CLAY);
    if (wTop < CLAY) { A(winBand, { y: y(wTop), height: (CLAY - wTop) * PX }); A(winLine, { y1: y(wTop), y2: y(wTop) }); }
    show(pump, pumping && !(t >= P.slab[0] && u(t, 'slab') > 0.45));
    if (pumping) {
      const px = XR - 30, py = y(H) - 9;
      A(pumpBox, { x: px, y: py });
      const d = `M ${px + 7} ${py} L ${px + 7} ${py - 6} Q ${XR - 8} ${py - 8} ${XR - 8} ${py - 24} L ${XR - 8} ${H0 - 14} Q ${XR - 8} ${H0 - 22} ${XR + 4} ${H0 - 22} L ${XR + 22} ${H0 - 22} L ${XR + 22} ${H0 - 4}`;
      A(hose, { d }); A(hoseFlow, { d });
    }

    // alaplemez
    const ex = 418;
    let excY = y(H), excOp = t >= P.d1[0] ? 1 : 0, lifting = false;
    if (t >= P.slab[0]) {
      const k = u(t, 'slab');
      const lk = smooth(clamp((k - 0.12) / 0.3, 0, 1));
      excY = lerp(y(H), H0 - 30, lk); lifting = k < 0.46; excOp = 1 - smooth(clamp((k - 0.38) / 0.08, 0, 1));
      const sk = smooth(clamp((k - 0.45) / 0.5, 0, 1));
      show(gSlab, k > 0.45);
      A(lean, { y: y(DIG[3]) - 2.5 });
      A(slab, { y: y(DIG[3] - SLAB * sk) - 2.5, height: SLAB * sk * PX });
      A(slabLab, { y: y(DIG[3] - SLAB / 2) + 2, opacity: sk > 0.8 ? 1 : 0 });
    } else show(gSlab, false);
    // kotró
    show(exc, excOp > 0.01);
    A(exc, { transform: `translate(${ex} ${excY})`, opacity: excOp });
    const digging = DPH.some((ph) => inP(t, ph));
    show(armDig, digging); show(armStill, !digging); show(excHook, lifting);
    // kupac a kotró előtt
    show(pile, digging && H > 0.6);
    if (digging && H > 0.6) A(pile, { d: `M ${ex - 92} ${y(H)} Q ${ex - 74} ${y(H) - 12} ${ex - 56} ${y(H)} Z` });

    // dúcsorok
    struts.forEach((o, i) => {
      const ph = SPH[i], a = P[ph][0], b = P[ph][1], dur = b - a;
      const waleOp = smooth(clamp((t - a) / (0.22 * dur), 0, 1));
      show(o.wale, t >= a); A(o.wale, { opacity: waleOp });
      const lk = smooth(clamp((t - a - 0.22 * dur) / (0.48 * dur), 0, 1));
      const on = t >= a + 0.2 * dur;
      show(o.tube, on);
      if (on) A(o.tube, { transform: `translate(0 ${lerp(IDLE + 30, y(o.d), lk)})` });
      show(o.sling, t < a + 0.74 * dur);
      const g = clamp((t - a - 0.72 * dur) / (0.28 * dur), 0, 1);
      show(o.glow, g > 0 && g < 1); A(o.glow, { opacity: Math.sin(g * Math.PI) });
      show(o.badge, t >= a + 0.72 * dur);
    });

    // daru: kocsi, kötél, teher
    let tx = PARK, hy = IDLE;
    const mv = (a, b, k) => lerp(a, b, smooth(clamp(k, 0, 1)));
    const cageHook = (ph, st, xFrom, xTo) => {
      const k = u(t, ph);
      tx = mv(xFrom, xTo, k / 0.15);
      hy = k < 0.15 ? mv(IDLE, JB + 16, k / 0.15) : (st.cageY ?? JB + 22) - 6;
    };
    if (inP(t, 'cL')) cageHook('cL', sL, PARK, XCL);
    else if (t >= P.cL[1] && t < P.cR[0]) { tx = XCL; hy = mv(y(CAGE_T) - 6, IDLE, (t - P.cL[1]) / 0.6); }
    else if (inP(t, 'cR')) cageHook('cR', sR, XCL, XCR);
    else if (t >= P.cR[1] && t < P.d1[0]) { hy = mv(y(CAGE_T) - 6, IDLE, (t - P.cR[1]) / 0.6); tx = mv(XCR, PARK, (t - P.cR[1] - 0.6) / 1.2); }
    const dph = DPH.find((ph) => inP(t, ph));
    show(skip, !!dph);
    if (dph) {
      const k = u(t, dph) * 2, c = k % 1, cyc = Math.floor(k);
      const lx = PARK, ly = y(H) - 1, top = IDLE + 26, trX = TX + 66, trY = H0 - 32;
      let sx = lx, sy = top, rot = 0, full = 0;
      if (c < 0.1) sy = mv(top, ly, c / 0.1);
      else if (c < 0.22) { sy = ly; full = (c - 0.1) / 0.12; }
      else if (c < 0.38) { sy = mv(ly, top, (c - 0.22) / 0.16); full = 1; }
      else if (c < 0.56) { sx = mv(lx, trX, (c - 0.38) / 0.18); full = 1; }
      else if (c < 0.64) { sx = trX; sy = mv(top, trY, (c - 0.56) / 0.08); full = 1; }
      else if (c < 0.72) { sx = trX; sy = trY; rot = -Math.sin(((c - 0.64) / 0.08) * Math.PI) * 55; full = 1 - (c - 0.64) / 0.08; }
      else if (c < 0.8) { sx = trX; sy = mv(trY, top, (c - 0.72) / 0.08); }
      else sx = mv(trX, lx, (c - 0.8) / 0.2);
      A(skip, { transform: `translate(${sx} ${sy}) rotate(${rot})` });
      A(skipSoil, { opacity: clamp(full, 0, 1) });
      tx = sx; hy = sy - 26;
      const dumps = cyc + (c > 0.72 ? 1 : 0);
      const lv = 3 + dumps * 4;
      A(tload, { d: `M ${TX + 32} ${H0 - 29} Q ${TX + 67} ${H0 - 29 - lv * 1.6} ${TX + 102} ${H0 - 29} Z` });
    } else A(tload, { d: `M ${TX + 32} ${H0 - 29} Q ${TX + 67} ${H0 - 33} ${TX + 102} ${H0 - 29} Z` });
    const sph = SPH.findIndex((ph) => inP(t, ph));
    if (sph >= 0) {
      const ph = SPH[sph], a = P[ph][0], dur = P[ph][1] - a, k = (t - a) / dur;
      const lk = smooth(clamp((k - 0.22) / 0.48, 0, 1));
      if (k < 0.2) { tx = mv(PARK, XM, k / 0.2); hy = IDLE; }
      else if (k < 0.74) { tx = XM; hy = lerp(IDLE + 30, y(STRUT[sph]), lk) - 30; }
      else if (k < 0.8) { tx = XM; hy = mv(y(STRUT[sph]) - 30, IDLE, (k - 0.74) / 0.06); }
      else { tx = mv(XM, PARK, (k - 0.8) / 0.2); hy = IDLE; }
    }
    if (t >= P.slab[0]) {
      const k = u(t, 'slab');
      if (k < 0.12) { tx = mv(PARK, ex + 2, k / 0.12); hy = mv(IDLE, y(H) - 62, k / 0.12); }
      else if (k < 0.44) { tx = ex + 2; hy = excY - 62; }
      else { tx = mv(ex + 2, PARK, (k - 0.5) / 0.12); hy = mv(excY - 62, IDLE, (k - 0.44) / 0.06); }
    }
    A(trolley, { x: tx - 6 }); A(cable, { x1: tx, y1: JB + 5, x2: tx, y2: hy });
    A(hook, { d: `M ${tx} ${hy} q 0 5 -4 5 q -3 0 -3 -3` });

    // résfalmarkoló és telep
    const side = t < P.tR[0] ? 'L' : 'R';
    const rigOp = side === 'L' ? smooth(clamp((t - 0.3) / 0.9, 0, 1)) * (1 - smooth(clamp((t - P.tL[1]) / 0.4, 0, 1)))
      : smooth(clamp((t - P.tR[0]) / 0.5, 0, 1)) * (1 - smooth(clamp((t - P.tR[1]) / 0.4, 0, 1)));
    show(rig, rigOp > 0.01);
    A(rig, { opacity: rigOp, transform: side === 'L' ? '' : `translate(${2 * XM} 0) scale(-1 1)` });
    const tph = side === 'L' ? 'tL' : 'tR', st = side === 'L' ? sL : sR;
    let gd = -1;
    if (inP(t, tph)) {
      const k = u(t, tph) * 3, c = k % 1;
      const f = c < 0.4 ? smooth(c / 0.4) : c < 0.6 ? 1 : 1 - smooth((c - 0.6) / 0.4);
      gd = st.dT * f;
    }
    const gy = gd < 0 ? 58 : y(gd) - 28;
    A(grab, { transform: `translate(0 ${gy})` }); A(gcable, { y2: gy });
    const siloOp = smooth(clamp((t - 0.4) / 0.8, 0, 1)) * (1 - smooth(clamp((t - P.cap[0]) / 0.7, 0, 1)));
    show(silo, siloOp > 0.01); A(silo, { opacity: siloOp });
    const hx = side === 'L' ? XCL + 8 : XCR - 8, hs = side === 'L' ? 1 : -1;
    show(slHose, siloOp > 0.01 && (inP(t, 'tL') || inP(t, 'bL') || inP(t, 'tR') || inP(t, 'bR')));
    // mixer a betonozáshoz
    const bph = t < P.tR[0] ? 'bL' : 'bR';
    const mixOp = smooth(clamp((t - P[bph][0] + 0.4) / 0.4, 0, 1)) * (1 - smooth(clamp((t - P[bph][1]) / 0.4, 0, 1)));
    show(mixer, mixOp > 0.01);
    A(mixer, { opacity: mixOp, transform: bph === 'bL' ? '' : `translate(${2 * XM} 0) scale(-1 1)` });
    A(slHose, { d: `M ${XM - 4 * hs} ${H0 - 3} Q ${(XM + hx) / 2} ${H0 + 2} ${hx} ${H0 - 3}`, opacity: siloOp });

    // mélységméret
    show(dimG, H > 0.3);
    if (H > 0.3) {
      const xd = XR - 44;
      A(dimL, { d: `M ${xd - 5} ${H0} h 10 M ${xd} ${H0} V ${y(H)} M ${xd - 5} ${y(H)} h 10` });
      A(dimT, { x: xd + 6, y: H0 - 9 });
      dimT.textContent = `H = ${fmt(H, 1)} m`;
    }
  };

  // ---------------------------------------------------------------- vezérlés
  const rng = $('#heroDepth'), out = $('#heroDepthVal'), btn = $('#heroPlay'), verdict = $('#heroVerdict');
  rng.min = 0; rng.max = Math.round(END * 10); rng.step = 1;
  let cur = -1, last = -1;
  const set = (t) => {
    t = clamp(t, 0, END);
    cur = t;
    rng.value = Math.round(t * 10);
    rng.style.setProperty('--p', (t / END) * 100 + '%');
    draw(t);
    let st = STEPS[0]; for (const x of STEPS) if (t >= x.at) st = x;
    if (st !== last) { last = st; out.textContent = `${st.n} / ${NSTEP}`; verdict.innerHTML = `<b>${st.title}</b>${st.txt}`; }
  };
  const PLAY = '▶ Lejátszás', PAUSE = '❚❚ Szünet';
  let playing = false, visible = true, raf = 0, t0 = 0, from = 0, auto = false;
  const loop = (now) => {
    if (!playing || !visible) { raf = 0; return; }
    const t = from + (now - t0) / 1000;
    set(t);
    if (t >= END) { stop(); return; }
    raf = requestAnimationFrame(loop);
  };
  const run = () => { if (raf || !playing || !visible) return; t0 = performance.now(); from = cur >= END ? 0 : cur; raf = requestAnimationFrame(loop); };
  const play = () => { playing = true; if (btn) btn.textContent = PAUSE; run(); };
  function stop() { playing = false; if (raf) cancelAnimationFrame(raf); raf = 0; if (btn) btn.textContent = PLAY; }
  rng.addEventListener('input', () => { auto = false; stop(); set(+rng.value / 10); });
  btn?.addEventListener('click', () => { auto = false; if (playing) stop(); else { if (cur >= END) set(0); play(); } });
  if (btn) btn.textContent = PLAY;
  // csak látható állapotban fut (nem pörög a háttérben)
  if ('IntersectionObserver' in window) {
    new IntersectionObserver((ents) => {
      visible = ents[0].isIntersecting;
      if (visible && playing) run();
      else if (!visible && auto) { auto = false; stop(); }   // a magától induló bemutató görgetéskor megáll
      else if (!visible && raf) { cancelAnimationFrame(raf); raf = 0; from = cur; }
    }, { threshold: 0.15 }).observe(box);
  }
  // kis képernyőn a gödörre vágott nézet
  const fit = () => { const narrow = box.clientWidth && box.clientWidth < 560; s.setAttribute('viewBox', narrow ? `92 0 608 ${VH}` : `0 0 ${W} ${VH}`); show(streetLab, !narrow); };
  if ('ResizeObserver' in window) new ResizeObserver(fit).observe(box); fit();

  if (matchMedia('(prefers-reduced-motion: reduce)').matches) set(END);
  else { set(0); auto = true; play(); }
}
