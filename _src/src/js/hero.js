// Hős-ábra: városi munkagödör metszete – a mélység csúszkával nő, és vele változik a határolás.
import { $, svg, clear, fmt, clamp } from './core.js';

const W = 800, H0 = 112, PX = 15; // terep y-ja, px / m
const XL = 262, XR = 548;          // gödör falai
const GW = 6;                       // talajvíz −6 m
const CLAY = 9;                     // vízzáró agyag teteje −9 m

function stage(H) {
  if (H < 1.2) return { k: 0, wall: 'none', sup: [], title: 'Megtámasztás nélkül – rövid ideig', txt: 'Kötött talajban, talajvíz felett a függőleges földfal ideiglenesen <i>m₀</i> mélységig megáll. Munkavédelmi okból azonban már kis mélységtől dúcolni kell.' };
  if (H < 4.5) return { k: 1, wall: 'berlini', sup: [], title: 'Konzolos, befogott fal', txt: 'Pl. berlini dúcolat vagy hézagos cölöpfal: a kiemelési sík alá befogva, a passzív földellenállás tartja. Konzolosan csak kb. 4–6 m-ig.' };
  if (H < GW) return { k: 2, wall: 'berlini', sup: [{ d: 1.8, t: 'a' }], title: 'Egy szinten horgonyzott fal', txt: 'A fal tetejét talajhorgony fogja vissza – a befogott szakasz az aktív csúszólapon túl dolgozik.' };
  if (H < 9.5) return { k: 3, wall: 'water', sup: [{ d: 2, t: 'a' }], title: 'Vízzáró fal a vízzáró rétegig', txt: 'A talajvíz alá értünk: szádfal, résfal, jet- vagy zagyfal kell, a vízzáró agyagba kötve – különben a gödör megtelik vízzel.' };
  if (H < 14) return { k: 4, wall: 'water', sup: [{ d: 2, t: 'a' }, { d: 6.5, t: 'a' }], title: 'Több szinten horgonyzott fal', txt: 'Két horgonysor. A 15–25 m hosszú horgonyok a szomszéd telek alá nyúlnak – ez jogi kérdés, és közműbe, pincébe ütközhetnek.' };
  return { k: 5, wall: 'water', sup: [{ d: 2.2, t: 's' }, { d: 7.5, t: 's' }, { d: 12.5, t: 's' }], title: 'Csőtámaszok vagy támaszfödém', txt: 'Ha horgonyozni nem lehet, vagy a szomszéd épület mozgása kritikus: acél csőtámaszok, illetve top-down támaszfödémek merev megtámasztása.' };
}

export function initHero() {
  const box = $('#heroViz'); if (!box) return;
  const s = svg('svg', { viewBox: `0 0 ${W} 470`, role: 'img', 'aria-label': 'Munkagödör metszete a mélységgel változó határolással' });
  box.prepend(s);
  const defs = svg('defs', {}, s);
  defs.innerHTML = `
    <linearGradient id="hsky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1b2633"/><stop offset="1" stop-color="#2b3540"/></linearGradient>
    <pattern id="hdots" width="9" height="9" patternUnits="userSpaceOnUse"><circle cx="2" cy="2" r="0.9" fill="#000" opacity=".25"/><circle cx="6.5" cy="6" r="0.7" fill="#000" opacity=".18"/></pattern>
    <pattern id="hclay" width="10" height="10" patternUnits="userSpaceOnUse" patternTransform="rotate(35)"><line x1="0" y1="0" x2="0" y2="10" stroke="#000" stroke-width="1" opacity=".16"/></pattern>
    <pattern id="hlag" width="6" height="7" patternUnits="userSpaceOnUse"><rect width="6" height="6" fill="#b88449"/><rect y="6" width="6" height="1" fill="#6d4a22"/></pattern>
    <pattern id="hconc" width="8" height="8" patternUnits="userSpaceOnUse"><rect width="8" height="8" fill="#a9a59c"/><circle cx="2" cy="3" r=".8" fill="#7e7a72"/><circle cx="6" cy="6.5" r=".6" fill="#7e7a72"/></pattern>`;
  const gStatic = svg('g', {}, s), gDyn = svg('g', {}, s), gTop = svg('g', {}, s);

  // ég + városkép
  svg('rect', { x: 0, y: 0, width: W, height: H0, fill: 'url(#hsky)' }, gStatic);
  for (let i = 0; i < 40; i++) svg('circle', { cx: (i * 97) % W, cy: 8 + ((i * 37) % 60), r: i % 3 ? 0.7 : 1.1, fill: '#fff', opacity: 0.35 }, gStatic);
  const sky = [[0, 70, 40], [44, 58, 36], [84, 76, 30], [120, 48, 44], [168, 66, 34], [205, 80, 24]];
  for (const [x, y, w] of sky) svg('rect', { x, y, width: w, height: H0 - y, fill: '#263039' }, gStatic);
  // szomszéd épület (jobbra) pincével
  const bx = 590, bw = 190;
  svg('rect', { x: bx, y: 18, width: bw, height: H0 - 18 + 46, fill: '#3a3f46' }, gStatic);
  for (let r = 0; r < 5; r++) for (let c = 0; c < 6; c++) svg('rect', { x: bx + 14 + c * 29, y: 28 + r * 16, width: 15, height: 9, fill: (r * 7 + c * 3) % 5 ? '#f0c27a' : '#59616b', opacity: 0.85 }, gStatic);
  svg('rect', { x: bx, y: H0, width: bw, height: 46, fill: '#2b3036' }, gStatic);
  svg('text', { x: bx + bw / 2, y: H0 + 28, 'text-anchor': 'middle', fill: '#c9c2b4', 'font-size': 12, 'font-family': 'Barlow Condensed, Arial Narrow, sans-serif', 'font-weight': 700, 'letter-spacing': '0.06em', text: 'SZOMSZÉD PINCE' }, gStatic);
  // utca balra
  svg('rect', { x: 0, y: H0 - 6, width: XL - 18, height: 6, fill: '#3b3f44' }, gStatic);
  for (let x = 12; x < XL - 30; x += 34) svg('rect', { x, y: H0 - 4, width: 16, height: 2, fill: '#d9d2c4', opacity: 0.6 }, gStatic);
  svg('text', { x: 18, y: H0 - 14, fill: '#a8a297', 'font-size': 11, 'font-family': 'JetBrains Mono, monospace', text: 'UTCA · KÖZMŰVEK' }, gStatic);
  svg('circle', { cx: 120, cy: H0 + 26, r: 8, fill: 'none', stroke: '#6aa6d6', 'stroke-width': 3 }, gStatic);
  svg('circle', { cx: 170, cy: H0 + 20, r: 5, fill: 'none', stroke: '#d0b26a', 'stroke-width': 3 }, gStatic);

  const draw = (H) => {
    clear(gDyn); clear(gTop);
    const st = stage(H);
    const y = (d) => H0 + d * PX;
    // talajrétegek a gödrön kívül és belül (a gödör kivágva)
    const layer = (d0, d1, fill, pat) => {
      for (const [x0, x1] of [[0, XL], [XR, W]]) {
        svg('rect', { x: x0, y: y(d0), width: x1 - x0, height: y(d1) - y(d0), fill }, gDyn);
        svg('rect', { x: x0, y: y(d0), width: x1 - x0, height: y(d1) - y(d0), fill: `url(#${pat})` }, gDyn);
      }
      const t = Math.max(d0, H);
      if (t < d1) { svg('rect', { x: XL, y: y(t), width: XR - XL, height: y(d1) - y(t), fill }, gDyn); svg('rect', { x: XL, y: y(t), width: XR - XL, height: y(d1) - y(t), fill: `url(#${pat})` }, gDyn); }
    };
    layer(0, 2.2, '#7c766a', 'hdots');
    layer(2.2, CLAY, '#b49a6c', 'hdots');
    layer(CLAY, 24, '#7b5b3e', 'hclay');
    // a szomszéd pince takarja a talajt
    svg('rect', { x: bx, y: H0, width: bw, height: 46, fill: '#2b3036' }, gDyn);
    // rétegnevek
    const lab = (d, t) => svg('text', { x: 10, y: y(d) + 15, fill: '#efe9dd', opacity: 0.8, 'font-size': 11.5, 'font-family': 'JetBrains Mono, monospace', text: t }, gDyn);
    lab(0, 'feltöltés'); lab(2.2, 'homok, kavics'); lab(CLAY, 'vízzáró agyag');
    // talajvíz
    for (const [x0, x1] of [[0, XL], [XR, W]]) {
      svg('rect', { x: x0, y: y(GW), width: x1 - x0, height: y(CLAY) - y(GW), fill: '#3d8fd1', opacity: 0.28 }, gDyn);
      svg('line', { x1: x0, y1: y(GW), x2: x1, y2: y(GW), stroke: '#6fb8f0', 'stroke-width': 1.5, 'stroke-dasharray': '7 5' }, gDyn);
    }
    svg('path', { d: `M ${XR + 30} ${y(GW) - 11} l 12 0 l -6 9 z`, fill: '#6fb8f0' }, gDyn);
    svg('text', { x: XR + 48, y: y(GW) - 3, fill: '#8fcaf5', 'font-size': 11, 'font-family': 'JetBrains Mono, monospace', text: 'talajvíz −6 m' }, gDyn);
    // gödör belseje
    if (H > 0.05) {
      svg('rect', { x: XL, y: H0, width: XR - XL, height: H * PX, fill: '#14171b' }, gDyn);
      // víz a gödörben, ha nem vízzáró a fal és a víz alá értünk
      if (st.wall !== 'water' && H > GW) svg('rect', { x: XL, y: y(GW), width: XR - XL, height: (H - GW) * PX, fill: '#3d8fd1', opacity: 0.5 }, gDyn);
    }
    // aktív csúszólap (szaggatott) a jobb fal lábától
    if (st.k >= 2) {
      const a = (60 * Math.PI) / 180, toe = y(H);
      const dx = (H * PX) / Math.tan(a);
      svg('path', { d: `M ${XR} ${toe} L ${XR + dx} ${H0}`, stroke: '#f2705c', 'stroke-width': 1.6, 'stroke-dasharray': '6 5', fill: 'none', opacity: 0.9 }, gTop);
      svg('text', { x: XR + dx * 0.55 + 6, y: (toe + H0) / 2, fill: '#f2a090', 'font-size': 10.5, 'font-family': 'JetBrains Mono, monospace', text: 'csúszólap' }, gTop);
    }
    // falak
    if (st.wall !== 'none') {
      const emb = st.wall === 'water' ? Math.max(CLAY + 2 - H, Math.max(2.5, 0.45 * H)) : Math.max(1.8, 0.6 * H);
      const yb = y(H + emb);
      for (const xw of [XL, XR]) {
        const x0 = xw === XL ? xw - 9 : xw;
        if (st.wall === 'berlini') {
          svg('rect', { x: x0, y: H0 - 4, width: 9, height: yb - H0 + 4, fill: 'url(#hlag)' }, gTop);
          svg('rect', { x: x0 + (xw === XL ? 0 : 6), y: H0 - 6, width: 3, height: yb - H0 + 6, fill: '#8ea7bb' }, gTop);
        } else {
          svg('rect', { x: x0, y: H0 - 4, width: 9, height: yb - H0 + 4, fill: 'url(#hconc)' }, gTop);
          svg('rect', { x: x0, y: H0 - 7, width: 9, height: 6, fill: '#cfc9bc' }, gTop);
        }
      }
      svg('text', { x: XL - 14, y: yb + 14, 'text-anchor': 'middle', fill: '#cfc9bc', 'font-size': 10.5, 'font-family': 'JetBrains Mono, monospace', text: st.wall === 'berlini' ? 'befogás' : 'vízzáró fal' }, gTop);
    }
    // megtámasztás
    for (const sp of st.sup) {
      if (sp.d > H - 0.4) continue;
      const yy = y(sp.d);
      if (sp.t === 'a') {
        const ang = (22 * Math.PI) / 180, L = 17 * PX, Lf = 7 * PX;
        for (const side of [-1, 1]) {
          const x0 = side < 0 ? XL - 9 : XR + 9;
          const x1 = x0 + side * Math.cos(ang) * L, y1 = yy + Math.sin(ang) * L;
          const xf = x0 + side * Math.cos(ang) * (L - Lf), yf = yy + Math.sin(ang) * (L - Lf);
          svg('line', { x1: x0, y1: yy, x2: xf, y2: yf, stroke: '#d9d2c4', 'stroke-width': 2 }, gTop);
          svg('line', { x1: xf, y1: yf, x2: x1, y2: y1, stroke: '#cfc9ba', 'stroke-width': 7, 'stroke-linecap': 'round' }, gTop);
          svg('line', { x1: xf, y1: yf, x2: x1, y2: y1, stroke: '#9a958a', 'stroke-width': 2 }, gTop);
          svg('rect', { x: (side < 0 ? XL : XR) - 4, y: yy - 4, width: 8, height: 8, fill: '#f0a33a' }, gTop);
          if (side > 0 && x1 > bx) {
            svg('rect', { x: bx, y: Math.min(yf, y1) - 12, width: Math.min(x1, W) - bx, height: Math.abs(y1 - yf) + 24, fill: 'none', stroke: '#f0a33a', 'stroke-width': 1.2, 'stroke-dasharray': '3 3', opacity: 0.8 }, gTop);
          }
        }
      } else {
        svg('rect', { x: XL, y: yy - 5, width: XR - XL, height: 10, rx: 5, fill: '#c0503a' }, gTop);
        svg('rect', { x: XL, y: yy - 5, width: XR - XL, height: 3, rx: 1.5, fill: '#e27a62' }, gTop);
        svg('rect', { x: XL, y: yy - 12, width: 10, height: 24, fill: '#cfc9bc' }, gTop);
        svg('rect', { x: XR - 10, y: yy - 12, width: 10, height: 24, fill: '#cfc9bc' }, gTop);
      }
    }
    if (st.k >= 4 && st.sup[0].t === 'a') svg('text', { x: bx + 8, y: y(10.8), fill: '#f0b65c', 'font-size': 11, 'font-family': 'JetBrains Mono, monospace', text: 'horgony a szomszéd telek alatt!' }, gTop);
    // kotró a gödör alján
    if (H > 2.5) {
      const gx = XL + 70 + Math.min(80, H * 4), gy = y(H);
      const g = svg('g', { transform: `translate(${gx} ${gy})` }, gTop);
      svg('rect', { x: -26, y: -16, width: 52, height: 10, rx: 3, fill: '#f0a33a' }, g);
      svg('rect', { x: -10, y: -30, width: 26, height: 15, rx: 2, fill: '#f0a33a' }, g);
      svg('rect', { x: 0, y: -27, width: 12, height: 9, fill: '#2a3340' }, g);
      svg('rect', { x: -28, y: -7, width: 56, height: 7, rx: 3.5, fill: '#2d2d2d' }, g);
      svg('path', { d: 'M -10 -24 L -44 -46 L -62 -20', stroke: '#e0952a', 'stroke-width': 5, fill: 'none', 'stroke-linecap': 'round' }, g);
      svg('path', { d: 'M -66 -24 l 10 -2 l 2 12 l -12 2 z', fill: '#666' }, g);
    }
    // mélység-méret
    if (H > 0.4) {
      const xd = XL + 22;
      svg('line', { x1: xd, y1: H0, x2: xd, y2: y(H), stroke: '#f0a33a', 'stroke-width': 1.4 }, gTop);
      svg('line', { x1: xd - 6, y1: H0, x2: xd + 6, y2: H0, stroke: '#f0a33a', 'stroke-width': 1.4 }, gTop);
      svg('line', { x1: xd - 6, y1: y(H), x2: xd + 6, y2: y(H), stroke: '#f0a33a', 'stroke-width': 1.4 }, gTop);
      svg('text', { x: xd + 9, y: Math.max(H0 + 14, (H0 + y(H)) / 2 + 4), fill: '#f6c27a', 'font-size': 14, 'font-weight': 700, 'font-family': 'JetBrains Mono, monospace', text: `H = ${fmt(H, 1)} m` }, gTop);
    }
    // terepvonal
    svg('line', { x1: 0, y1: H0, x2: W, y2: H0, stroke: '#d9d2c4', 'stroke-width': 1.5, opacity: 0.7 }, gTop);
    $('#heroVerdict').innerHTML = `<b>${st.title}</b>${st.txt}`;
  };

  const rng = $('#heroDepth'), out = $('#heroDepthVal');
  const set = (v) => { rng.value = v; out.textContent = fmt(+v, 1) + ' m'; rng.style.setProperty('--p', (v / rng.max) * 100 + '%'); draw(+v); };
  rng.addEventListener('input', () => { anim = false; set(rng.value); });
  let anim = true;
  set(0);
  // bevezető animáció: kiássa a gödröt 11 m-ig
  const t0 = performance.now();
  const step = (t) => {
    if (!anim) return;
    const k = clamp((t - t0 - 500) / 5200, 0, 1);
    set((11 * (1 - Math.pow(1 - k, 2.2))).toFixed(1));
    if (k < 1) requestAnimationFrame(step);
  };
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) set(11); else requestAnimationFrame(step);
  $('#heroPlay')?.addEventListener('click', () => {
    anim = true; const s0 = performance.now();
    const st2 = (t) => { if (!anim) return; const k = clamp((t - s0) / 9000, 0, 1); set((19.5 * k).toFixed(1)); if (k < 1) requestAnimationFrame(st2); };
    requestAnimationFrame(st2);
  });
}
