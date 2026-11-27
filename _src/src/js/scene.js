// Widget-jelenetek a folyamatábrák elemtárából (proc.js KIT): ugyanaz az ég, horizont, mintázott talaj, gép- és
// emberkészlet, mint a folyamatsorokon – így a laborok, kalkulátorok ábrái és a folyamatsorok egy világot mutatnak.
// Rétegrend: g (jelenet) → ov (erők, nyomásábrák, méretvonalak) → top (feliratok, mindig legfelül).
import { KIT as K } from './proc.js';
import { svg as el, clear } from './core.js';
export { K };
const { v, F, SK, g_, R, P, C, Ln } = K;

/** A gépek (kotró, daru, fúrógép) saját léptéke: kb. 16 px = 1 m. */
export const MS = 16;

/**
 * Jelenet nyitása. fig: a figure() által adott <svg>; o: { W, H, GY, layers: [{ k, y, lab }], gw, hz, ox }.
 * Visszaad: { g, ov, top, M, W, H, fk, tag, txt, dimH, dimV, force, press, gwMark, layerLabs, m }.
 * fk: feliratnagyító keskeny kijelzőre (a tényleges szélességből), hogy a 11 px-es felirat telefonon is olvasható legyen.
 */
export function stage(fig, o) {
  K.defs(); clear(fig);
  const W = o.W, H = o.H;
  fig.setAttribute('viewBox', `0 0 ${W} ${H}`);
  fig.classList.add('pr-svg');
  K.CUR.W = W;
  const cw = fig.getBoundingClientRect().width;
  const fk = cw > 0 ? Math.round(Math.max(1, Math.min(o.fmax ?? 1.7, (9.5 * W) / (11.5 * cw))) * 20) / 20 : 1;
  fig.dataset.fk = fk;
  const M = { H, GY: o.GY, layers: o.layers, gw: o.gw, hz: o.hz, plain: o.plain };
  const g = g_(fig);
  K.backdrop(g, M, o.ox ?? 0, W);
  const ov = g_(fig), top = g_(fig);
  const S = { fig, g, ov, top, M, W, H, fk };
  /** lekerekített hátlapú felirat, o.to: vezetővonal */
  S.tag = (x, y, text, a = {}) => K.tag(a.in ?? top, x, y, text, { ...a, fs: (a.fs ?? 11) * fk });
  /** glóriás szöveg (hátlap nélkül); a.c: szín (pr-változó neve), a.b: félkövér, a.sub: alsó index a szöveg után */
  S.txt = (x, y, text, a = {}) => {
    const t = el('text', { x, y, 'text-anchor': a.anchor ?? 'start', class: 'pr-tx pr-h' + (a.b ? ' pr-b' : '') + (a.mono ? ' pr-m' : ''), style: `font-size:${((a.fs ?? 11.5) * fk).toFixed(1)}px` + (a.c ? `;fill:${v(a.c)}` : '') }, a.in ?? top);
    if (Array.isArray(text)) text.forEach((p) => { if (typeof p === 'string') t.append(document.createTextNode(p)); else el('tspan', { dy: '0.28em', style: 'font-size:.72em', text: p.sub }, t), el('tspan', { dy: '-0.28em', text: ' ' }, t); });
    else t.textContent = text;
    return t;
  };
  /** vízszintes méretvonal, középen felirattal */
  S.dimH = (x1, x2, y, text, a = {}) => {
    const c = a.c ?? 'labline';
    y += (fk - 1) * 13 * (a.up ? -0 : 1);   /* nagyított feliratnál a vonal lejjebb kerül, hogy a szöveg ne lógjon a rajzra */
    Ln(ov, x1, y, x2, y, SK(c, 1.1));
    P(ov, `M${x1} ${y - 4} v8 M${x2} ${y - 4} v8`, SK(c, 1.1));
    if (text) S.txt((x1 + x2) / 2, y - 5 + (a.dy ?? 0), text, { anchor: 'middle', b: true, fs: a.fs ?? 11.5, c: a.tc });
  };
  /** függőleges méretvonal; a.side: -1 = a felirat balra, +1 = jobbra */
  S.dimV = (x, y1, y2, text, a = {}) => {
    const c = a.c ?? 'labline', sd = a.side ?? 1;
    Ln(ov, x, y1, x, y2, SK(c, 1.1));
    P(ov, `M${x - 4} ${y1} h8 M${x - 4} ${y2} h8`, SK(c, 1.1));
    if (text) S.txt(x + sd * 6, a.ly ?? (y1 + y2) / 2 + 4, text, { anchor: sd > 0 ? 'start' : 'end', b: true, fs: a.fs ?? 11.5, c: a.tc });
  };
  /** erőnyíl (egyenes), a.c: szín, a.w: vastagság */
  S.force = (x1, y1, x2, y2, a = {}) => {
    const L = Math.hypot(x2 - x1, y2 - y1) || 1, hs = a.s ?? 8, k = (L - hs * 0.7) / L;
    K.arrowP(a.in ?? ov, `M${x1.toFixed(1)} ${y1.toFixed(1)} L${(x1 + (x2 - x1) * k).toFixed(1)} ${(y1 + (y2 - y1) * k).toFixed(1)}`, { w: a.w ?? 2.4, c: a.c ?? 'push' });
    K.head(a.in ?? ov, x2, y2, (Math.atan2(y2 - y1, x2 - x1) * 180) / Math.PI, { s: hs, c: a.c ?? 'push' });
  };
  /** nyomásábra: kitöltött sokszög kontúrral */
  S.press = (pts, c = 'push', op = 0.2) => {
    const d = 'M' + pts.map((p) => `${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(' L') + 'Z';
    P(ov, d, F(c, op) + `;stroke:${v(c)};stroke-width:1.2;stroke-linejoin:round`);
  };
  /** talajvízszint-jel */
  S.gwMark = (x, y, text) => {
    P(ov, `M${x - 6} ${y - 9} h12 l-6 8z`, F('halo') + `;stroke:${v('water')};stroke-width:1.6`);
    Ln(ov, x - 4, y + 3, x + 4, y + 3, SK('water', 1.2)); Ln(ov, x - 2, y + 6, x + 2, y + 6, SK('water', 1.2));
    if (text) S.txt(x + 10, y - 3, text, { c: 'water', b: true });
  };
  /** rétegnevek (M.layers[].lab) a megadott x-nél */
  S.layerLabs = (x = 8, a = {}) => {
    M.layers.forEach((l, k) => {
      if (!l.lab) return;
      const t0 = k === 0 ? M.GY : l.y, t1 = k + 1 < M.layers.length ? M.layers[k + 1].y : H;
      S.tag(x, l.ly ?? Math.min(t0 + 16 * fk, (t0 + t1) / 2), l.lab, { fs: 10, ...a });
    });
  };
  /** gép a jelenet léptékében: s = px/m; (x, y) körül nagyítva. Használat: const mg = S.m(px, x, GY); K.excavator(mg, M, …) */
  S.m = (px, x, y, parent) => K.scl(parent ?? g, px / MS, x, y);
  /** valós (jelenet-) koordináta → az S.m(px, x, y) csoport saját koordinátája */
  S.inv = (px, x, y) => (X, Y) => [x + ((X - x) * MS) / px, y + ((Y - y) * MS) / px];
  return S;
}

/** Újrarajzolás, ha a jelenet megjelenített szélessége annyit változik, hogy más feliratnagyítás kell. */
export function autoRedraw(fig, draw) {
  if (!('ResizeObserver' in window)) return;
  let last = 0;
  new ResizeObserver(() => {
    const w = Math.round(fig.getBoundingClientRect().width);
    if (!w || Math.abs(w - last) < 24) return;
    const first = !last; last = w;
    if (!first || fig.dataset.fk === '1') draw();
  }).observe(fig);
}

/** Téglafal (falazat) metszetben */
export function brick(g, x, y, w, hh) {
  R(g, x, y, w, hh, F('oldwall') + `;stroke:${v('dark2')};stroke-width:.7`);
  let d = '';
  for (let yy = y + 6, r = 0; yy < y + hh - 1; yy += 6, r++) { d += `M${x} ${yy} h${w} `; for (let xx = x + (r % 2 ? 5 : 10); xx < x + w - 1; xx += 10) d += `M${xx} ${yy - 6} v6 `; }
  P(g, d, SK('dark2', 0.5, 'opacity:.55'));
}
/** Kiálló tüskék (betonacél) egy betonfelületből felfelé */
export function starters(g, x0, x1, y, n = 4, hh = 12) {
  for (let i = 0; i < n; i++) { const x = x0 + ((x1 - x0) * (i + 0.5)) / n; Ln(g, x, y, x, y - hh, SK('rebar', 1.4, 'stroke-linecap:round')); }
}
/** Földdepónia (halom) a terepen, o.k: talajfajta */
export function heap(g, M, x, w, hh, k = 'clay') { K.spoil(g, M, x, w, hh, k); }
/** Vasbeton pillér- vagy sávalap talplemeze + felmenő */
export function footing(g, cx, bot, bw, bh, sw, sh) {
  K.concrete(g, cx - bw / 2, bot - bh, bw, bh, false);
  K.concrete(g, cx - sw / 2, bot - bh - sh, sw, sh, false);
  P(g, `M${cx - bw / 2} ${bot} V${bot - bh} H${cx - sw / 2} V${bot - bh - sh} H${cx + sw / 2} V${bot - bh} H${cx + bw / 2} V${bot}Z`, SK('concedge', 1));
}

/** Léptékhelyes épület oldalnézetben: x (bal szél), GY (terep), w és k px/m; emeletenként 3 m, ablakok, lábazat, párkány. o.base: pinceszint mélysége m-ben. */
export function building(g, x, GY, wm, floors, k, o = {}) {
  const b = g_(g, { class: 'pr-block' }), w = wm * k, fh = 3 * k, hh = floors * fh + 0.5 * k;
  if (o.base) { R(b, x, GY, w, o.base * k, 'fill:url(#pr-concg)'); R(b, x, GY, w, o.base * k, 'fill:url(#pr-p-conc)'); R(b, x, GY, w, o.base * k, SK('concedge', 1) + ';fill:none'); }
  R(b, x, GY - hh, w, hh, F(o.col ?? 'wallh') + `;stroke:${v('wallh2')};stroke-width:.8`);
  R(b, x, GY - 0.5 * k, w, 0.5 * k, F('wallh2', 0.55));
  const n = Math.max(2, Math.round(wm / 2.3)), pw = w / n, ww = Math.min(1.15 * k, pw * 0.56), wh = 1.55 * k;
  for (let f = 0; f < floors; f++) for (let i = 0; i < n; i++) {
    const wx = x + pw * (i + 0.5) - ww / 2, wy = GY - 0.5 * k - (f + 1) * fh + 0.55 * k;
    if (f === 0 && i === (o.door ?? -1)) { R(b, wx, GY - 2.3 * k, ww, 2.3 * k, F('dark2') + `;stroke:${v('wallh2')};stroke-width:.6`); continue; }
    R(b, wx, wy, ww, wh, 'fill:url(#pr-glass)' + `;stroke:${v('wallh2')};stroke-width:.7`);
    if (k > 9) P(b, `M${wx + ww / 2} ${wy} v${wh} M${wx} ${wy + wh * 0.38} h${ww}`, SK('wallh2', 0.6));
    R(b, wx - 1, wy + wh, ww + 2, Math.max(1, 0.1 * k), F('wallh2'));
  }
  for (let f = 1; f < floors; f++) Ln(b, x, GY - 0.5 * k - f * fh, x + w, GY - 0.5 * k - f * fh, SK('wallh2', 0.5, 'opacity:.6'));
  R(b, x - 0.25 * k, GY - hh - 0.3 * k, w + 0.5 * k, 0.32 * k, F('wallh2'));
  return b;
}
