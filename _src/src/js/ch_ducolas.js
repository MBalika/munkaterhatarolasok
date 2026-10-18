// 02 Munkaárok dúcolása + 03 Széles munkagödör dúcolása – widgetek és kvízek
import { register, shell, slider, seg, toggle, select, stat, verdict, svg, figure, clear, h, fmt, clamp, lerp, pathD, rad, onTheme } from './core.js';
import { defineQuiz } from './ui.js';

/* ================================================================ segédek */
const V = (n) => `var(--${n})`;
const ST = (fill, stroke = 'none', sw = 1, extra = '') => `fill:${fill};stroke:${stroke};stroke-width:${sw}${extra ? ';' + extra : ''}`;
function txt(p, x, y, t, cls = 't-lab', a = {}) { return svg('text', { x, y, class: cls, text: t, ...a }, p); }
/** Nyíl explicit színnel (a fej is ugyanolyan színű) */
function arr(p, x1, y1, x2, y2, color, w = 2, hd = 7, extra = {}) {
  const g = svg('g', extra, p);
  const a = Math.atan2(y2 - y1, x2 - x1);
  svg('line', { x1, y1, x2: x2 - Math.cos(a) * hd * 0.75, y2: y2 - Math.sin(a) * hd * 0.75, style: `stroke:${color};stroke-width:${w};stroke-linecap:round` }, g);
  const pts = [[x2, y2], [x2 - Math.cos(a - 0.42) * hd, y2 - Math.sin(a - 0.42) * hd], [x2 - Math.cos(a + 0.42) * hd, y2 - Math.sin(a + 0.42) * hd]];
  svg('path', { d: pathD(pts, true), style: `fill:${color}` }, g);
  return g;
}
function rect(p, x, y, w, hh, style, a = {}) { return svg('rect', { x, y, width: Math.max(0, w), height: Math.max(0, hh), style, ...a }, p); }
const reduced = () => window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;

/**
 * Lépésenként léptethető, folytonosan animált folyamat.
 * draw(s) – s ∈ [0, n] folytonos; texts[i] az i+1. lépés szövege; intro a 0. állapotban.
 */
function stepper(parent, { n, texts, intro, draw, speed = 1.1 }) {
  const txtBox = h('div', { class: 'steptext' });
  const prev = h('button', { type: 'button', 'aria-label': 'Előző lépés' }, '◀');
  const next = h('button', { type: 'button' }, 'Következő lépés ▶');
  const play = h('button', { type: 'button' }, '▶ Lejátszás');
  const reset = h('button', { type: 'button', 'aria-label': 'Elölről' }, '↺');
  const prog = h('div', { class: 'dc-prog' });
  parent.append(h('div', { class: 'stepbtns' }, prev, next, play, reset), prog, txtBox);
  let s = 0, target = 0, raf = 0, last = 0, playing = false, N = n, T = texts, I = intro;
  const paintText = () => {
    const k = Math.round(target);
    txtBox.innerHTML = k === 0 ? (I || '') : `<b class="dc-sh">${k}. lépés / ${N}</b>${T[k - 1] || ''}`;
    prev.disabled = target <= 0; next.disabled = target >= N;
    prog.innerHTML = '';
    for (let i = 1; i <= N; i++) prog.append(h('i', { class: i <= k ? 'on' : '' }));
    play.textContent = playing ? '❚❚ Szünet' : '▶ Lejátszás';
  };
  const tick = (t) => {
    const dt = last ? Math.min(0.05, (t - last) / 1000) : 0.016; last = t;
    const d = target - s;
    if (Math.abs(d) < 1e-3 || reduced()) s = target; else s += Math.sign(d) * Math.min(Math.abs(d), speed * dt * (Math.abs(d) > 1.5 ? 3 : 1));
    draw(s);
    if (s === target) {
      raf = 0; last = 0;
      if (playing) { if (target < N) setTimeout(() => { if (playing) go(target + 1); }, 650); else { playing = false; paintText(); } }
    } else raf = requestAnimationFrame(tick);
  };
  const go = (t) => { target = clamp(Math.round(t), 0, N); paintText(); if (!raf) { last = 0; raf = requestAnimationFrame(tick); } };
  prev.addEventListener('click', () => { playing = false; go(target - 1); });
  next.addEventListener('click', () => { playing = false; go(target + 1); });
  reset.addEventListener('click', () => { playing = false; s = 0; go(0); draw(0); });
  play.addEventListener('click', () => { playing = !playing; if (playing) { if (target >= N) { s = 0; target = 0; } go(target + 1); } paintText(); });
  paintText(); draw(0);
  return {
    reset(nn, tt, ii) { playing = false; N = nn ?? N; T = tt ?? T; I = ii ?? I; s = 0; target = 0; if (raf) { cancelAnimationFrame(raf); raf = 0; } paintText(); draw(0); },
    redraw() { draw(s); },
    get s() { return s; },
  };
}

/* ================================================================ 1. A dúcolás elemei (axonometrikus, szétszedhető) */
register('duc-elemek', (root) => {
  const { ctrls, viz } = shell(root, { out: false });
  const mat = seg(ctrls, { label: 'Anyag', options: [{ v: 'fa', t: 'Hagyományos fa' }, { v: 'acel', t: 'Mai acél' }], value: 'fa' });
  const hez = toggle(ctrls, { label: 'Hézagos pallózás (kötött talaj)', value: false });
  const load = toggle(ctrls, { label: 'Teherút megjelenítése', value: false });
  const expBtn = h('button', { type: 'button', class: 'btn btn-line btn-sm' }, '⇲ Szétszedés');
  ctrls.append(expBtn);
  const partBox = h('div', { class: 'dc-parts' });
  ctrls.append(h('div', { class: 'ctl-lab' }, 'Elemek – koppints rájuk az ábrán is'), partBox);
  const info = h('div', { class: 'dc-info' });
  const s = figure(viz, 600, 380);
  viz.append(info);

  const INFO = {
    fa: {
      pallo: ['Palló', 'A földfalat terítik be vele. Hagyományosan fenyőpalló, ún. <b>2 colos (48 mm)</b> vastagsággal, 5–6 m hosszban; a végét acélpánt védi a hasadástól. Állékony, kötött talajban <b>hézagos pallózás</b> is lehet: kb. minden második palló elmarad.'],
      heveder: ['Heveder', 'A pallókat fogja össze, és a rájuk jutó földnyomást a dúcoknak adja át. Fagerenda, <b>12–24 cm</b> oldalhosszal. Függőleges pallózásnál vízszintes, vízszintes pallózásnál függőleges.'],
      duc: ['Dúc', 'Nyomott elem: a két szemközti heveder közé feszítve <b>szembetámasztja</b> a földfalakat – a két oldal földnyomása „kioltja” egymást. Gömbfa, <b>12–16 cm</b> átmérővel; nyomásra és <b>kihajlásra</b> kell ellenőrizni.'],
      ek: ['Ék', 'Keményfa ékpár a dúc vége és a heveder között – ezzel feszítik be a dúcot. Minden műszak előtt utána kell ütni.'],
      kapocs: ['Ácskapocs', 'U alakú acélkapocs a dúc és a heveder között: megakadályozza, hogy a dúc kiessen (1,5 m-nél szélesebb ároknál kötelező).'],
    },
    acel: {
      pallo: ['Acél csatornapalló', 'Vékony falú (3–6 mm), 25–30 cm hasznos szélességű, profilos acéllemez: <b>Pátria</b>- és <b>Union</b>-szádlemez, illetve CS hullámlemez. Az elemek kapcsolata <b>nem vízzáró</b> – dúcolásra valók, víztelenítésre nem. Leverhetők, levibrálhatók, visszahúzhatók.'],
      heveder: ['Acél heveder', 'Leggyakrabban melegen hengerelt <b>I- vagy U-szelvény</b>; ez fogja össze a pallókat, és adja át a terhet a dúcoknak.'],
      duc: ['Csavaros (orsós) acéldúc', 'Állítható hosszúságú dúc: a középső csövet elforgatva a két végén lévő <b>bal- és jobbmenetes orsó</b> egyszerre nyúlik ki, így a dúc befeszíthető. Lehet I-tartó vagy cső is.'],
      fej: ['Dúcolófej', 'A csavaros dúc végén lévő fejlemez: ezzel szorul a hevederhez, és ezen adódik át a nyomóerő.'],
    },
  };
  let sel = null, e = 0, eT = 0, raf = 0;
  const S = 64, ox = 205, oy = 66, kx = 0.5, ky = 0.3;
  const P = (x, y, z) => [ox + x * S - z * kx * S, oy - y * S + z * ky * S];
  const poly = (g, pts, style) => svg('polygon', { points: pts.map((p) => p[0].toFixed(1) + ',' + p[1].toFixed(1)).join(' '), style }, g);
  function box(g, x0, x1, y0, y1, z0, z1, fill, o = {}) {
    const fr = [P(x0, y0, z1), P(x1, y0, z1), P(x1, y1, z1), P(x0, y1, z1)];
    const tp = [P(x0, y1, z1), P(x1, y1, z1), P(x1, y1, z0), P(x0, y1, z0)];
    const rt = [P(x1, y0, z1), P(x1, y0, z0), P(x1, y1, z0), P(x1, y1, z1)];
    const sk = o.stroke || 'rgba(0,0,0,.35)';
    poly(g, rt, ST(fill, sk, 0.6)); poly(g, rt, ST('#000', 'none', 0, 'opacity:.22'));
    poly(g, tp, ST(fill, sk, 0.6)); poly(g, tp, ST('#fff', 'none', 0, 'opacity:.18'));
    poly(g, fr, ST(fill, sk, 0.6));
    return fr;
  }
  function cyl(g, x, y, z0, z1, r, fill, o = {}) {
    const a = P(x, y, z0), b = P(x, y, z1);
    const ux = b[0] - a[0], uy = b[1] - a[1], L = Math.hypot(ux, uy) || 1;
    const nx = -uy / L * r * S, ny = ux / L * r * S;
    poly(g, [[a[0] + nx, a[1] + ny], [b[0] + nx, b[1] + ny], [b[0] - nx, b[1] - ny], [a[0] - nx, a[1] - ny]], ST(fill, 'rgba(0,0,0,.35)', 0.6));
    poly(g, [[a[0] + nx * 0.2, a[1] + ny * 0.2], [b[0] + nx * 0.2, b[1] + ny * 0.2], [b[0] - nx * 0.5, b[1] - ny * 0.5], [a[0] - nx * 0.5, a[1] - ny * 0.5]], ST('#fff', 'none', 0, 'opacity:.12'));
    svg('ellipse', { cx: b[0], cy: b[1], rx: r * S, ry: r * S * 0.92, style: ST(o.cap || fill, 'rgba(0,0,0,.4)', 0.7) }, g);
    if (o.rings) for (const k of [0.35, 0.7]) svg('ellipse', { cx: b[0], cy: b[1], rx: r * S * k, ry: r * S * k * 0.92, style: ST('none', 'rgba(0,0,0,.25)', 0.6) }, g);
    return [a, b];
  }
  const parts = () => (mat.v === 'fa' ? ['pallo', 'heveder', 'duc', 'ek', 'kapocs'] : ['pallo', 'heveder', 'duc', 'fej']);
  function buildParts() {
    partBox.innerHTML = '';
    for (const k of parts()) {
      const b = h('button', { type: 'button', class: sel === k ? 'on' : '' }, INFO[mat.v][k][0]);
      b.addEventListener('click', () => { sel = sel === k ? null : k; buildParts(); draw(); });
      partBox.append(b);
    }
    const it = sel && INFO[mat.v][sel];
    info.innerHTML = it ? `<b>${it[0]}</b>${it[1]}` : '<b>Szembetámasz</b>A földfal nyomását a <b>palló</b> veszi fel, a <b>heveder</b> gyűjti össze, a nyomott <b>dúc</b> pedig a szemközti oldalnak adja át – ott ugyanekkora földnyomás tart neki ellen. Koppints egy elemre!';
  }
  function grp(k) {
    const g = svg('g', { class: 'dc-part', 'data-part': k, style: sel && sel !== k ? 'opacity:.22' : '' }, s);
    g.addEventListener('click', (ev) => { ev.stopPropagation(); sel = sel === k ? null : k; buildParts(); draw(); });
    if (sel === k) g.setAttribute('filter', 'url(#dcGlow)');
    return g;
  }
  function draw() {
    clear(s);
    const defs = svg('defs', {}, s);
    defs.innerHTML = '<filter id="dcGlow" x="-20%" y="-20%" width="140%" height="140%"><feDropShadow dx="0" dy="0" stdDeviation="2.2" flood-color="#f0a33a" flood-opacity=".95"/></filter>';
    const fa = mat.v === 'fa';
    const L = 5, Hd = 3.0, dzW = 0.55 * e, dzK = 0.8 * e, dzS = 1.05 * e;
    // talaj: terep sáv + földfal
    const gs = svg('g', {}, s);
    poly(gs, [P(-0.2, 0, -1.2), P(L + 0.2, 0, -1.2), P(L + 0.2, 0, 0), P(-0.2, 0, 0)], ST(V('soilB'), V('soil-line'), 0.8));
    poly(gs, [P(-0.2, 0, -1.2), P(L + 0.2, 0, -1.2), P(L + 0.2, 0, 0), P(-0.2, 0, 0)], ST('url(#pat-soil)', 'none', 0, 'opacity:.6'));
    const wall = [P(-0.2, 0, 0), P(L + 0.2, 0, 0), P(L + 0.2, -Hd - 0.25, 0), P(-0.2, -Hd - 0.25, 0)];
    poly(gs, wall, ST(V('soilB'), V('soil-line'), 0.8)); poly(gs, wall, ST('url(#pat-clay)', 'none'));
    // árokfenék
    poly(gs, [P(-0.2, -Hd - 0.25, 0), P(L + 0.2, -Hd - 0.25, 0), P(L + 0.2, -Hd - 0.25, 1.9), P(-0.2, -Hd - 0.25, 1.9)], ST(V('soilC'), V('soil-line'), 0.6, 'opacity:.75'));
    txt(gs, P(L + 0.25, -0.9, 0)[0] + 6, P(L + 0.25, -0.9, 0)[1], 'földfal', 't-sm');
    // pallók
    const gp = grp('pallo');
    if (fa) {
      const w = 0.2;
      for (let i = 0; i < L / w; i++) {
        if (hez.v && i % 2 === 1) continue;
        box(gp, i * w + 0.004, (i + 1) * w - 0.004, -Hd, 0.2, 0, 0.048, V('timber'));
      }
    } else {
      const w = 0.33;
      for (let i = 0; i < Math.floor(L / w); i++) {
        if (hez.v && i % 2 === 1) continue;
        const fr = box(gp, i * w + 0.006, (i + 1) * w - 0.006, -Hd, 0.2, 0, 0.05, V('steelm'));
        for (const f of [0.3, 0.7]) { const a = P(i * w + f * w, -Hd, 0.05), b = P(i * w + f * w, 0.2, 0.05); svg('line', { x1: a[0], y1: a[1], x2: b[0], y2: b[1], style: 'stroke:rgba(0,0,0,.35);stroke-width:1' }, gp); }
        if (i % 2 === 0) { const a = P(i * w + 0.5 * w, 0.2, 0.05); svg('circle', { cx: a[0], cy: a[1] + 4, r: 1.6, style: 'fill:rgba(0,0,0,.4)' }, gp); }
      }
    }
    // hevederek
    const levels = [-0.6, -2.35];
    const gw = grp('heveder');
    for (const y of levels) {
      if (fa) box(gw, -0.05, L + 0.05, y - 0.08, y + 0.08, 0.05 + dzW, 0.21 + dzW, V('timber2'));
      else {
        box(gw, -0.05, L + 0.05, y - 0.1, y + 0.1, 0.05 + dzW, 0.25 + dzW, V('steel'));
        for (const yy of [y - 0.07, y + 0.07]) { const a = P(-0.05, yy, 0.25 + dzW), b = P(L + 0.05, yy, 0.25 + dzW); svg('line', { x1: a[0], y1: a[1], x2: b[0], y2: b[1], style: 'stroke:rgba(255,255,255,.35);stroke-width:1' }, gw); }
      }
    }
    // ékek / dúcolófejek
    const xs = [0.85, 2.5, 4.15];
    const zw1 = (fa ? 0.21 : 0.25) + dzW;
    if (fa) {
      const gk = grp('ek');
      for (const y of levels) for (const x of xs) {
        box(gk, x - 0.11, x - 0.05, y - 0.07, y + 0.07, zw1 + dzK - dzW, zw1 + dzK - dzW + 0.07, '#7a5124');
        box(gk, x + 0.05, x + 0.11, y - 0.07, y + 0.07, zw1 + dzK - dzW, zw1 + dzK - dzW + 0.07, '#7a5124');
      }
    } else {
      const gk = grp('fej');
      for (const y of levels) for (const x of xs) box(gk, x - 0.1, x + 0.1, y - 0.1, y + 0.1, zw1 + dzK - dzW, zw1 + dzK - dzW + 0.03, V('steelm2'));
    }
    // dúcok
    const gd = grp('duc');
    const z0 = zw1 + (fa ? 0.07 : 0.03) + (dzS - dzW), z1 = 1.75 + dzS;
    for (const y of levels) for (const x of xs) {
      if (fa) cyl(gd, x, y, z0, z1, 0.07, V('timber'), { rings: true });
      else {
        cyl(gd, x, y, z0, z0 + 0.25, 0.035, V('accent'));
        cyl(gd, x, y, z0 + 0.25, z1 - 0.25, 0.05, '#5d8a4a');
        cyl(gd, x, y, z1 - 0.25, z1, 0.035, V('accent'));
      }
    }
    // ácskapcsok
    if (fa) {
      const gc = grp('kapocs');
      for (const y of levels) for (const x of [xs[0], xs[2]]) {
        const a = P(x + 0.02, y + 0.07, z0 + 0.12), b = P(x + 0.02, y + 0.08, zw1 - 0.04);
        svg('path', { d: `M ${a[0]} ${a[1] + 3} L ${a[0]} ${a[1] - 4} L ${b[0]} ${b[1] - 4} L ${b[0]} ${b[1] + 3}`, style: 'fill:none;stroke:#3b3f45;stroke-width:2.2;stroke-linejoin:round' }, gc);
      }
    }
    // teherút
    if (load.v) {
      const gl = svg('g', { class: 'dc-load' }, s);
      for (const x of [0.4, 1.7, 3.3, 4.6]) for (const y of [-0.3, -1.45, -2.7]) {
        const a = P(x, y, -0.55), b = P(x, y, 0.02);
        arr(gl, a[0], a[1], b[0], b[1], V('bad'), 2, 7);
      }
      for (const y of levels) for (const x of xs) {
        const a = P(x, y, z0 + 0.1), b = P(x, y, z1 + 0.35);
        svg('line', { x1: a[0], y1: a[1], x2: b[0], y2: b[1], class: 'flow', style: `stroke:${V('accent')};stroke-width:3;stroke-linecap:round` }, gl);
        arr(gl, b[0] + 8, b[1] - 5, b[0] - 10, b[1] + 6, V('accent'), 2.5, 8);
      }
      const t1 = P(L + 0.3, -1.4, -0.5);
      txt(gl, t1[0] + 4, t1[1], 'földnyomás', 't-sm t-bad halo');
      const t2 = P(xs[0], levels[1], z1 + 0.5);
      txt(gl, t2[0] - 40, t2[1] + 18, '→ a szemközti fal felé', 't-sm t-acc halo');
    }
    // feliratok
    const gl2 = svg('g', {}, s);
    const lab = (k, x, y, z, t, dx = 0, dy = 0) => { if (sel && sel !== k) return; const p = P(x, y, z); txt(gl2, p[0] + dx, p[1] + dy, t, 't-lab halo'); };
    lab('pallo', L - 0.25, 0.3, 0.05, fa ? 'palló' : 'csatornapalló', -10, -6);
    lab('heveder', L + 0.1, levels[0], zw1, 'heveder', 6, 4);
    lab('duc', xs[2], levels[1] - 0.15, z1 + 0.1, fa ? 'dúc' : 'csavaros acéldúc', 8, 22);
    if (fa) lab('ek', xs[2] + 0.15, levels[0] + 0.25, zw1 + dzK - dzW, 'ék', 4, 0);
    const pt = P(-0.2, 0, 0); txt(gl2, pt[0] - 6, pt[1] - 8, '±0,00 terep', 't-sm', { 'text-anchor': 'end' });
    const pb = P(-0.2, -Hd, 0.6); txt(gl2, 12, pb[1] + 30, 'a szemközti oldal levágva', 't-sm');
  }
  const anim = (t) => {
    e += Math.sign(eT - e) * Math.min(Math.abs(eT - e), 0.045);
    if (reduced()) e = eT;
    draw();
    raf = e !== eT ? requestAnimationFrame(anim) : 0;
  };
  expBtn.addEventListener('click', () => { eT = eT ? 0 : 1; expBtn.textContent = eT ? '⇱ Összerakás' : '⇲ Szétszedés'; if (!raf) raf = requestAnimationFrame(anim); });
  s.addEventListener('click', () => { if (sel) { sel = null; buildParts(); draw(); } });
  mat.on(() => { sel = null; buildParts(); draw(); });
  hez.on(draw); load.on(draw);
  onTheme(draw);
  buildParts(); draw();
});

/* ================================================================ 2. m₀ kalkulátor */
const M0_PRESETS = {
  kemeny: { t: 'Kemény agyag', c: 40, phi: 10, g: 20, lim: 2.0, soil: 'soilE' },
  kozepes: { t: 'Közepes agyag', c: 20, phi: 15, g: 19, lim: 1.0, soil: 'soilB' },
  atmeneti: { t: 'Átmeneti (iszapos) talaj', c: 10, phi: 20, g: 19, lim: 1.0, soil: 'soilC' },
  homok: { t: 'Homok', c: 0, phi: 32, g: 18, lim: 0.5, soil: 'soilA' },
};
export function m0(c, phi, g, n, p) { return (4 * c) / (n * g) * Math.tan(rad(45 + phi / 2)) - p / g; }
function modeFor(m, H) {
  if (m <= 0) return { k: 'd', t: 'd) Előrevert pallózás', why: 'm₀ = 0: a földfal megtámasztás nélkül egy pillanatig sem áll meg (durvaszemcsés talaj). Az acél pallókat a kiemelés előtt leverik, levibrálják.' };
  if (H <= m) return { k: 'a', t: 'a) Állított pallózás', why: 'H ≤ m₀: a gödör a teljes mélységig kiemelhető, utána terítik be pallókkal, hevederekkel, dúcokkal.' };
  if (m < 0.6) return { k: 'c', t: 'c) Vízszintes pallózás, lépcsős mélyítés', why: 'H ≫ m₀, és m₀ csak néhány deciméter: m₀-nyi lépcsőkben haladnak, vízszintes pallókkal és generációnként cserélt függőleges hevederekkel.' };
  return { k: 'b', t: 'b) Utánhajtott pallózás', why: 'H > m₀: m₀ mélységű lépcsőkben haladnak lefelé, a pallókat minden lépcső után az új fenékig utánhajtják.' };
}
register('duc-m0', (root) => {
  const { ctrls, viz, out } = shell(root);
  const pre = seg(ctrls, { label: 'Előbeállítás', options: Object.entries(M0_PRESETS).map(([v, o]) => ({ v, t: o.t.replace(' (iszapos) talaj', '') })), value: 'atmeneti' });
  const sc = slider(ctrls, { label: 'Kohézió', sym: 'c', min: 0, max: 60, step: 1, value: 10, unit: 'kPa' });
  const sphi = slider(ctrls, { label: 'Belső súrlódási szög', sym: 'φ', min: 0, max: 40, step: 1, value: 20, unit: '°' });
  const sg = slider(ctrls, { label: 'Térfogatsúly', sym: 'γ', min: 16, max: 22, step: 0.5, value: 19, unit: 'kN/m³' });
  const sn = slider(ctrls, { label: 'Biztonsági tényező', sym: 'n', min: 1.5, max: 3, step: 0.1, value: 2, hint: 'Jegyzet: általában 1,5–2; az előadás 2–3-at említ.' });
  const sp = slider(ctrls, { label: 'Felszíni terhelés', sym: 'p', min: 0, max: 30, step: 1, value: 10, unit: 'kPa', hint: 'Pl. a peremen tárolt föld, forgalom; a méretezésben jellemzően min. 10 kPa.' });
  const sH = slider(ctrls, { label: 'Tervezett árokmélység', sym: 'H', min: 0.5, max: 6, step: 0.1, value: 2.5, unit: 'm' });
  const lim = select(ctrls, { label: 'Talaj a dúcolási kötelezettséghez (jegyzet)', options: [{ v: '0.5', t: 'finomhomok – H > 0,5 m' }, { v: '1', t: 'átmeneti talaj – H > 1,0 m' }, { v: '2', t: 'kemény agyag – H > 2,0 m' }], value: '1' });
  const fig = figure(viz, 560, 330);
  const chart = figure(viz, 560, 150);
  const oM = stat(out, { label: 'm₀ – szabadon megálló mélység', unit: 'm', d: 2 });
  const oMode = stat(out, { label: 'Pallózási mód' });
  const oDuc = stat(out, { label: 'Dúcolni kell?' });
  const oEk = stat(out, { label: 'Megcsúszó ék súlya', unit: 't/fm', d: 1 });
  const ver = verdict(viz);
  let soil = 'soilC';
  pre.on((k) => { const P0 = M0_PRESETS[k]; soil = P0.soil; sc.set(P0.c, false); sphi.set(P0.phi, false); sg.set(P0.g, false); lim.set(String(P0.lim), false); upd(); });
  [sc, sphi, sg, sn, sp, sH, lim].forEach((c) => c.on(upd));
  function upd() {
    const c = sc.v, phi = sphi.v, g = sg.v, n = sn.v, p = sp.v, H = sH.v;
    const mRaw = m0(c, phi, g, n, p), m = Math.max(0, mRaw);
    const md = modeFor(m, H);
    const L = +lim.v;
    const th = rad(45 + phi / 2);
    const wedgeT = 0.5 * H * (H / Math.tan(th)) * g / 9.81;
    oM.set(m, m <= 0 ? 'bad' : H <= m ? 'ok' : 'warn', m <= 0 && mRaw < 0 ? '0 <small>(' + fmt(mRaw, 2) + ')</small>' : null);
    oMode.set(0, md.k === 'a' ? 'ok' : md.k === 'd' ? 'bad' : 'warn', { a: 'a) állított', b: 'b) utánhajtott', c: 'c) vízszintes', d: 'd) előrevert' }[md.k]);
    oDuc.set(H > L ? 'igen' : 'nem kötelező', H > L ? 'warn' : 'ok', H > L ? 'igen' : 'nem kötelező');
    oEk.set(wedgeT);
    ver.set(H > m ? (m <= 0 ? 'bad' : 'warn') : 'ok', md.t, `<span>${md.why}</span>` + (H > L ? ` <span>Munkavédelmi okból mindenképp dúcolni kell (H = ${fmt(H, 1)} m > ${fmt(L, 1)} m): a kiemelt földfal kiszárad, átázik, az állapota romlik.</span>` : ` <span>A jegyzet határa alatt vagyunk (${fmt(L, 1)} m) – de dinamikus hatás (forgalom, cölöpözés) vagy épület közelében ilyenkor is dúcolni kell.</span>`));
    drawFig(m, H, th, p);
    drawChart(c, phi, g, n, p, H);
  }
  function drawFig(m, H, th, p) {
    clear(fig);
    const y0 = 52, maxD = Math.max(H, Math.min(m, 7), 1) * 1.18, Sy = 250 / maxD;
    const xl = 196, xr = 286, y = (d) => y0 + d * Sy;
    rect(fig, 0, 0, 560, y0, ST(V('sky')));
    const sf = V(soil);
    rect(fig, 0, y0, xl, 330 - y0, ST(sf)); rect(fig, xr, y0, 560 - xr, 330 - y0, ST(sf)); rect(fig, xl, y(H), xr - xl, 330 - y(H), ST(sf));
    const pat = soil === 'soilA' ? 'pat-sand' : soil === 'soilC' ? 'pat-soil' : 'pat-clay';
    for (const [x, w, yy, hh] of [[0, xl, y0, 330 - y0], [xr, 560 - xr, y0, 330 - y0], [xl, xr - xl, y(H), 330 - y(H)]]) rect(fig, x, yy, w, hh, ST(`url(#${pat})`));
    svg('line', { x1: 0, y1: y0, x2: 560, y2: y0, style: `stroke:${V('soil-line')};stroke-width:1.5` }, fig);
    // csúszó ék a jobb oldalon
    const bad = H > m;
    const xw = xr + (H * Sy) / Math.tan(th);
    svg('polygon', { points: `${xr},${y0} ${xr},${y(H)} ${Math.min(xw, 560)},${xw > 560 ? y(H) - (560 - xr) * Math.tan(th) : y0}${xw > 560 ? ` 560,${y0}` : ''}`, style: ST(bad ? V('bad') : V('ok'), 'none', 0, 'opacity:.22') }, fig);
    svg('line', { x1: xr, y1: y(H), x2: xw, y2: y0, style: `stroke:${bad ? V('bad') : V('ok')};stroke-width:2;stroke-dasharray:7 5` }, fig);
    txt(fig, Math.min(xr + (xw - xr) * 0.62, 470), y(H * 0.55), `${fmt(45 + sphi.v / 2, 0)}°`, 't-num halo');
    // felszíni teher
    if (p > 0) {
      const xa = xr + 30, xb = 540;
      for (let x = xa; x <= xb; x += 26) arr(fig, x, y0 - 30, x, y0 - 3, V('muted'), 1.6, 6);
      svg('line', { x1: xa, y1: y0 - 30, x2: xb, y2: y0 - 30, style: `stroke:${V('muted')};stroke-width:1.4` }, fig);
      txt(fig, xb, y0 - 36, `p = ${fmt(p, 0)} kPa`, 't-num', { 'text-anchor': 'end' });
    }
    // árok és m₀ jel a bal falon
    rect(fig, xl, y0, xr - xl, y(H) - y0, ST(V('surface'), 'none', 0, 'opacity:.55'));
    const mm = Math.min(m, H);
    svg('line', { x1: xl - 12, y1: y0, x2: xl - 12, y2: y(mm), style: `stroke:${V('ok')};stroke-width:5;stroke-linecap:round` }, fig);
    if (H > m) svg('line', { x1: xl - 12, y1: y(m), x2: xl - 12, y2: y(H), style: `stroke:${V('bad')};stroke-width:5;stroke-linecap:round` }, fig);
    if (m > 0 && m < maxD) {
      svg('line', { x1: xl - 26, y1: y(m), x2: xr + 4, y2: y(m), style: `stroke:${V('ink')};stroke-width:1.2;stroke-dasharray:4 4` }, fig);
      txt(fig, xl - 30, y(m) + 4, `m₀ = ${fmt(m, 2)} m`, 't-num halo', { 'text-anchor': 'end' });
    } else if (m >= maxD) txt(fig, xl - 30, y(maxD * 0.9), `m₀ = ${fmt(m, 2)} m ↓`, 't-num halo', { 'text-anchor': 'end' });
    else txt(fig, xl - 30, y0 + 16, 'm₀ = 0', 't-num halo t-bad', { 'text-anchor': 'end' });
    // H méret
    svg('line', { x1: (xl + xr) / 2, y1: y0, x2: (xl + xr) / 2, y2: y(H), style: `stroke:${V('accent')};stroke-width:1.3` }, fig);
    for (const yy of [y0, y(H)]) svg('line', { x1: (xl + xr) / 2 - 6, y1: yy, x2: (xl + xr) / 2 + 6, y2: yy, style: `stroke:${V('accent')};stroke-width:1.3` }, fig);
    txt(fig, (xl + xr) / 2 + 6, (y0 + y(H)) / 2, `H = ${fmt(H, 1)} m`, 't-num halo');
    txt(fig, 12, 330 - 12, 'zöld: szabadon megáll · piros: megtámasztás kell', 't-sm');
    txt(fig, xl + 4, y0 - 8, 'munkaárok (1–3 m)', 't-sm');
  }
  function drawChart(c, phi, g, n, p, H) {
    clear(chart);
    const x0 = 46, x1 = 540, yA = 12, yB = 118, cMax = 60;
    const mMax = Math.max(1, ...[0, cMax].map((cc) => m0(cc, phi, g, n, p)), H * 1.1);
    const X = (cc) => x0 + (cc / cMax) * (x1 - x0), Y = (mm) => yB - (Math.max(0, mm) / mMax) * (yB - yA);
    svg('line', { x1: x0, y1: yB, x2: x1, y2: yB, class: 'axis' }, chart);
    svg('line', { x1: x0, y1: yA, x2: x0, y2: yB, class: 'axis' }, chart);
    for (let cc = 0; cc <= cMax; cc += 10) { txt(chart, X(cc), yB + 14, String(cc), 't-sm', { 'text-anchor': 'middle' }); }
    txt(chart, x1, yB + 28, 'c (kPa)', 't-sm', { 'text-anchor': 'end' });
    txt(chart, x0 - 6, yA + 8, fmt(mMax, 1) + ' m', 't-sm', { 'text-anchor': 'end' });
    txt(chart, x0 - 6, yB, '0', 't-sm', { 'text-anchor': 'end' });
    svg('line', { x1: x0, y1: Y(H), x2: x1, y2: Y(H), style: `stroke:${V('accent')};stroke-width:1.2;stroke-dasharray:5 4` }, chart);
    txt(chart, x1 - 4, Y(H) - 5, `H = ${fmt(H, 1)} m`, 't-sm t-acc', { 'text-anchor': 'end' });
    const pts = []; for (let cc = 0; cc <= cMax; cc += 1) pts.push([X(cc), Y(m0(cc, phi, g, n, p))]);
    svg('path', { d: pathD(pts), style: `fill:none;stroke:${V('grp')};stroke-width:2.4` }, chart);
    const cm = Math.max(0, m0(c, phi, g, n, p));
    svg('circle', { cx: X(c), cy: Y(cm), r: 5.5, style: ST(V('grp'), V('surface'), 2) }, chart);
    txt(chart, x0 + 6, yA + 4, 'm₀ a kohézió függvényében (a többi adat rögzítve)', 't-sm');
  }
  onTheme(upd);
  upd();
});

/* ================================================================ 3. A négy pallózási mód – léptethető animáció */
const PALL = {
  a: {
    cond: '<b>Feltétel: m₀ ≥ H</b> – a gödör a teljes mélységig kiemelhető megtámasztás nélkül (kötött talaj, talajvíz felett).', soil: 'soilE', m0: 3.4, n: 6,
    texts: [
      'Kiemelés a teljes mélységig – megtehető, mert H &lt; m₀: a függőleges földfal rövid ideig megáll.',
      'A pallókat függőlegesen a földfalakhoz állítják: beterítik a falat. Kötött talajban hézagos pallózás is lehet – kb. minden második palló elmarad.',
      'A pallókra merőlegesen, vízszintesen elhelyezik az összefogó hevedereket.',
      'A hevedereket dúcokkal szembetámasztják és kiékelik – legalább két sorban.',
      'Védett munkatér: a vezeték a dúcok alatti szabad térben kerül a helyére.',
      'Bontás alulról felfelé, a visszatöltéssel lépést tartva (15–20 cm-es rétegek): egy dúc csak akkor jöhet ki, ha alatta már tömörített föld támaszt. A pallókat húzzák ki utoljára.',
    ],
  },
  b: {
    cond: '<b>Feltétel: H &gt; m₀</b> – m₀ számottevő (pl. ~1 m), de kisebb a tervezett mélységnél.', soil: 'soilB', m0: 1.0, n: 7,
    texts: [
      'Kiemelés az első lépcsőben, m₀ mélységig.',
      'Elkészül az első keret: a hosszú pallók még messze a terep fölé nyúlnak, rájuk heveder és dúc kerül.',
      'A következő lépcső kiemelése (újabb ~m₀): a pallók vége most a régi fenék szintjén „lóg”.',
      'A hevedereket ideiglenesen alátámasztják, az ékeket lazítják, a pallókat <b>utánhajtják</b> az új fenékig – majd újra kiékelnek, és lejjebb új heveder- és dúcsor kerül be.',
      'Újabb lépcső kiemelése.',
      'Ismét alátámasztás, utánhajtás, új dúcsor – a végső mélységig.',
      'Kész: a pallók a teljes mélységet takarják, a felső végük kb. 20 cm-rel a terep fölé nyúlik (pergés ellen).',
    ],
  },
  c: {
    cond: '<b>Feltétel: H ≫ m₀</b>, és m₀ csak deciméter nagyságrendű (pl. 0,6 m).', soil: 'soilC', m0: 0.6, n: 6,
    texts: [
      'm₀ mélységig kiemelnek, vízszintes pallókat raknak a falhoz, függőleges hevederrel (1. generáció) fogják le, és kidúcolják.',
      'Újabb m₀-nyi mélyítés, alá újabb vízszintes pallók. A régiek mellé hosszabb, a teljes eddigi mélységet átfogó új hevederek (2.) kerülnek; kidúcolják őket, majd a régieket kiveszik.',
      'Ugyanez a 3. lépcsőben: új hevedergeneráció, a régi kikerül.',
      'A 4. lépcső – a pallók hossza nincs korlátozva, és nem rongálódnak, mert nem verik őket.',
      'Az 5. lépcsővel elérjük a végső mélységet.',
      'Kész a dúcolat. A módszer lassú, sok kézi munkát igényel – cserébe deciméteres m₀ mellett is biztonságos.',
    ],
  },
  d: {
    cond: '<b>Feltétel: m₀ = 0</b> – durvaszemcsés talaj, még látszólagos kohézió sincs: a fal egy pillanatig sem áll meg.', soil: 'soilA', m0: 0, n: 6,
    texts: [
      'A függőleges pallókat – kizárólag acélból – a kiemelés <b>előtt</b> leverik, levibrálják.',
      'Az első lépcső kiemelése a pallók védelmében.',
      'Első heveder- és dúcsor.',
      'Következő lépcső kiemelése, újabb heveder és dúc.',
      'Kiemelés a végső mélységig, harmadik dúcsor.',
      'Kész: a pallók vége mindig legalább 30 cm-rel a talajban marad – így a talaj nem tud alattuk befolyni.',
    ],
  },
};
register('duc-pallozas', (root) => {
  const { ctrls, viz } = shell(root, { out: false });
  const mode = seg(ctrls, { label: 'Pallózási mód', vert: true, options: [{ v: 'a', t: 'a) Állított pallózás' }, { v: 'b', t: 'b) Utánhajtott pallózás' }, { v: 'c', t: 'c) Vízszintes pallózás, lépcsős mélyítés' }, { v: 'd', t: 'd) Előrevert pallózás' }], value: 'a' });
  const cond = h('div', { class: 'dc-cond' });
  ctrls.append(cond);
  const fig = figure(viz, 600, 380);
  const stepBox = h('div', {});
  viz.append(stepBox);
  const H = 3.0, y0 = 64, S = 86, xl = 232, xr = 368;
  const y = (d) => y0 + d * S;
  const GEN = [V('steel'), V('accent'), V('ok'), V('g3'), V('g4')];
  function base(m) {
    const P0 = PALL[m];
    clear(fig);
    rect(fig, 0, 0, 600, y0, ST(V('sky')));
    const pat = P0.soil === 'soilA' ? 'pat-sand' : P0.soil === 'soilC' ? 'pat-soil' : 'pat-clay';
    return { soil: V(P0.soil), pat };
  }
  function soil(b, e, fill) {
    for (const [x, w, yy, hh] of [[0, xl, y0, 380 - y0], [xr, 600 - xr, y0, 380 - y0], [xl, xr - xl, y(e), 380 - y(e)]]) { rect(fig, x, yy, w, hh, ST(b.soil)); rect(fig, x, yy, w, hh, ST(`url(#${b.pat})`)); }
    if (fill !== undefined && fill < H) { rect(fig, xl, y(fill), xr - xl, y(H) - y(fill), ST(b.soil, 'none', 0, 'opacity:.7')); rect(fig, xl, y(fill), xr - xl, y(H) - y(fill), ST('url(#pat-soil)')); }
    svg('line', { x1: 0, y1: y0, x2: 600, y2: y0, style: `stroke:${V('soil-line')};stroke-width:1.5` }, fig);
  }
  const plankV = (top, bot, steel, o = 1) => {
    if (o <= 0) return;
    const st = ST(steel ? V('steelm') : V('timber'), 'rgba(0,0,0,.4)', 0.6, `opacity:${o}`);
    rect(fig, xl, y(top), 7, y(bot) - y(top), st); rect(fig, xr - 7, y(top), 7, y(bot) - y(top), st);
  };
  const walerH = (d, o = 1, col) => { if (o <= 0) return; const st = ST(col || V('timber2'), 'rgba(0,0,0,.45)', 0.7, `opacity:${o}`); rect(fig, xl + 7, y(d) - 7, 14, 14, st); rect(fig, xr - 21, y(d) - 7, 14, 14, st); };
  const strut = (d, o = 1, inset = 21, loose = false, steel = false) => {
    if (o <= 0) return;
    rect(fig, xl + inset, y(d) - 4.5, xr - xl - 2 * inset, 9, ST(steel ? '#5d8a4a' : V('timber'), 'rgba(0,0,0,.45)', 0.7, `opacity:${o}`), { rx: 3 });
    const wc = loose ? V('bad') : '#7a5124';
    for (const x of [xl + inset, xr - inset - 5]) rect(fig, x, y(d) - 6, 5, 12, ST(wc, 'none', 0, `opacity:${o}`));
  };
  const post = (d, floor, o) => { if (o <= 0) return; for (const x of [xl + 9, xr - 19]) rect(fig, x, y(d) + 7, 10, y(floor) - y(d) - 7, ST(V('timber2'), 'rgba(0,0,0,.4)', 0.6, `opacity:${o}`)); };
  const walerV = (d0, d1, gen, o, dx = 0) => { if (o <= 0) return; const st = ST(GEN[gen % 5], 'rgba(0,0,0,.45)', 0.7, `opacity:${o}`); rect(fig, xl + 7 + dx, y(d0), 10, y(d1) - y(d0), st); rect(fig, xr - 17 - dx, y(d0), 10, y(d1) - y(d0), st); };
  const plankHzone = (d0, d1, o) => { if (o <= 0) return; for (let d = d0; d < d1 - 0.01; d += 0.2) { const st = ST(V('timber'), 'rgba(0,0,0,.45)', 0.6, `opacity:${o}`); rect(fig, xl, y(d) + 0.5, 7, 0.2 * S - 1, st); rect(fig, xr - 7, y(d) + 0.5, 7, 0.2 * S - 1, st); } };
  const pipe = (o) => { if (o <= 0) return; svg('circle', { cx: (xl + xr) / 2, cy: y(H) - 24, r: 22, style: ST(V('concrete'), 'rgba(0,0,0,.4)', 1, `opacity:${o}`) }, fig); svg('circle', { cx: (xl + xr) / 2, cy: y(H) - 24, r: 15, style: ST(V('surface'), 'none', 0, `opacity:${o}`) }, fig); };
  const m0mark = (m) => {
    if (m <= 0) { txt(fig, 18, y0 + 20, 'm₀ = 0', 't-num t-bad'); return; }
    const d = Math.min(m, H + 0.4);
    svg('line', { x1: 40, y1: y0, x2: 40, y2: y(d), style: `stroke:${V('ok')};stroke-width:4;stroke-linecap:round` }, fig);
    txt(fig, 48, y(d) - 4, `m₀ ≈ ${fmt(m, 1)} m`, 't-num halo');
  };
  const hmark = () => { svg('line', { x1: 586, y1: y0, x2: 586, y2: y(H), style: `stroke:${V('accent')};stroke-width:1.3` }, fig); txt(fig, 580, y(H) + 16, 'H = 3,0 m', 't-num halo', { 'text-anchor': 'end' }); };
  const labels = (ks) => {
    const L = { pallo: ['palló', xr + 4, y(0.25)], heveder: ['heveder', xr + 4, y(0.95)], duc: ['dúc', (xl + xr) / 2, y(0.42) - 8] };
    for (const k of ks) { const [t, x, yy] = L[k]; txt(fig, x + (k === 'duc' ? 0 : 0), yy, t, 't-sm halo', k === 'duc' ? { 'text-anchor': 'middle' } : {}); }
  };
  const k01 = (s, a, b = a + 1) => clamp((s - a) / (b - a), 0, 1);

  const DRAW = {
    a(s) {
      const b = base('a'); const e = H * k01(s, 0, 1);
      const bf = s > 5 ? H * (1 - k01(s, 5, 6)) : undefined;
      soil(b, e, bf);
      const kp = k01(s, 1, 2); const fade = bf !== undefined ? clamp(bf / 0.4, 0, 1) : 1;
      plankV(-0.2 - (1 - kp) * 1.2, H - (1 - kp) * 1.2, false, kp * fade);
      const lv = [0.45, 2.35];
      const vis = (d) => (bf === undefined ? 1 : clamp((bf - (d - 0.2)) / 0.2, 0, 1));
      for (const d of lv) { walerH(d, k01(s, 2, 2.6) * vis(d)); strut(d, k01(s, 3, 3.6) * vis(d)); }
      pipe(k01(s, 4, 4.6));
      m0mark(PALL.a.m0); hmark(); if (s > 3.5 && s < 5) labels(['pallo', 'heveder', 'duc']);
    },
    b(s) {
      const bb = base('b');
      const e = s < 1 ? k01(s, 0, 1) : s < 2 ? 1 : s < 3 ? 1 + k01(s, 2, 3) : s < 4 ? 2 : s < 5 ? 2 + k01(s, 4, 5) : 3;
      soil(bb, e);
      const off = s < 3 ? 0 : s < 4 ? k01(s, 3.3, 3.8) : s < 5 ? 1 : s < 6 ? 1 + k01(s, 5.3, 5.8) : 2;
      const kp = k01(s, 1, 1.5);
      plankV(-2.2 + off, 1.0 + off, false, kp);
      if (s > 3.3 && s < 3.8 || s > 5.3 && s < 5.8) { for (const x of [xl + 3, xr - 3]) arr(fig, x, y(-2.2 + off) - 30, x, y(-2.2 + off) - 4, V('bad'), 2.5, 8); txt(fig, xl - 6, y(-2.2 + off) - 20, 'utánhajtás', 't-sm t-bad halo', { 'text-anchor': 'end' }); }
      const rows = [[0.45, 1.5], [1.5, 3.65], [2.5, 5.65]];
      rows.forEach(([d, t0], i) => { const o = k01(s, t0, t0 + 0.15); walerH(d, o); const loose = (s > 3 && s < 3.65 && i === 0) || (s > 5 && s < 5.65 && i <= 1); strut(d, k01(s, t0 + 0.1, t0 + 0.3), 21, loose); });
      // ideiglenes alátámasztás
      const po1 = s > 3 && s < 4 ? Math.min(k01(s, 3, 3.2), 1 - k01(s, 3.7, 3.85)) : 0;
      const po2 = s > 5 && s < 6 ? Math.min(k01(s, 5, 5.2), 1 - k01(s, 5.7, 5.85)) : 0;
      post(0.45, 2.0, po1); post(1.5, 3.0, po2); post(0.45, 1.5, po2);
      if (po1 > 0.5 || po2 > 0.5) txt(fig, (xl + xr) / 2, y(e) - 8, 'ideiglenes alátámasztás', 't-sm halo', { 'text-anchor': 'middle' });
      pipe(k01(s, 6, 6.6)); m0mark(PALL.b.m0); hmark();
    },
    c(s) {
      const bb = base('c'); const m = 0.6;
      const k = Math.min(5, Math.floor(s) + 1), t = s - (k - 1);
      const e = s >= 5 ? H : m * (k - 1) + m * k01(t, 0, 0.35);
      soil(bb, e);
      for (let j = 1; j <= Math.min(5, k); j++) {
        const o = j < k || s >= 5 ? 1 : k01(t, 0.35, 0.55);
        plankHzone(m * (j - 1), m * j, o);
      }
      for (let j = 1; j <= Math.min(5, k); j++) {
        const Dj = m * j;
        let o, dx = 0;
        if (s >= 5) o = j === 5 ? 1 : 0;
        else if (j < k - 1) o = 0;
        else if (j === k - 1) o = 1 - k01(t, 0.8, 1);
        else { o = k01(t, 0.55, 0.75); dx = j > 1 ? 11 * (1 - k01(t, 0.85, 1)) : 0; }
        if (o <= 0) continue;
        walerV(0, Dj, j - 1, o, dx);
        const nS = Math.max(2, Math.round(Dj / 1.0) + 1);
        for (let q = 0; q < nS; q++) { const d = 0.15 + (q * (Dj - 0.35)) / (nS - 1); strut(d, o, 17 + dx); }
      }
      pipe(k01(s, 5, 5.6)); m0mark(m); hmark();
      const legendY = 360;
      for (let j = 0; j < 5; j++) { rect(fig, 400 + j * 38, legendY - 9, 10, 10, ST(GEN[j])); txt(fig, 413 + j * 38, legendY, `${j + 1}.`, 't-sm'); }
      txt(fig, 398, legendY, 'hevedergenerációk:', 't-sm', { 'text-anchor': 'end' });
    },
    d(s) {
      const bb = base('d');
      const e = s < 1 ? 0 : s < 2 ? k01(s, 1, 2) : s < 3 ? 1 : s < 4 ? 1 + k01(s, 3, 3.5) : s < 5 ? 2 + k01(s, 4, 4.5) : 3;
      soil(bb, e);
      const drive = k01(s, 0, 1);
      const top = lerp(-5.0, -0.2, drive), bot = top + 3.6;
      plankV(top, bot, true, 1);
      if (s < 1) { for (const x of [xl - 9, xr - 7]) { rect(fig, x, y(top) - 30, 23, 28, ST(V('accent'), 'rgba(0,0,0,.5)', 1), { rx: 3 }); } txt(fig, xl - 14, y(top) - 12, 'vibrátor', 't-sm halo', { 'text-anchor': 'end' }); }
      const rows = [[0.5, 2], [1.5, 3.55], [2.5, 4.55]];
      for (const [d, t0] of rows) { walerH(d, k01(s, t0, t0 + 0.3), V('steel')); strut(d, k01(s, t0 + 0.15, t0 + 0.45), 21, false, true); }
      if (s > 5) {
        svg('line', { x1: xr + 18, y1: y(H), x2: xr + 18, y2: y(bot), style: `stroke:${V('ok')};stroke-width:2` }, fig);
        txt(fig, xr + 24, (y(H) + y(bot)) / 2 + 4, `≥ 30 cm a talajban`, 't-sm t-ok halo');
      }
      pipe(k01(s, 5, 5.6)); m0mark(0); hmark();
    },
  };
  let cur = 'a';
  const stp = stepper(stepBox, { n: PALL.a.n, texts: PALL.a.texts, intro: 'Indítsd el a lejátszást, vagy lépj végig a folyamaton lépésenként.', draw: (s) => DRAW[cur](s) });
  const setMode = (m) => { cur = m; cond.innerHTML = PALL[m].cond; stp.reset(PALL[m].n, PALL[m].texts); };
  mode.on(setMode);
  onTheme(() => stp.redraw());
  setMode('a');
});

/* ================================================================ 4. Dúcnyomás és egyszerű statika */
register('duc-nyomas', (root) => {
  const { ctrls, viz, out } = shell(root, { foot: '<b>Szemléltető, egyszerűsített ellenőrzés:</b> egyenletes dúcnyomás, egyenlő tehermezők, kéttámaszú tartók; fa elemek: 48 mm-es palló, 16/16-os heveder, Ø12 gömbfa dúc (E ≈ 10 GPa). A szilárdsági határok tájékoztató jellegűek – a tényleges méretezés a vonatkozó szabványok szerint történik.' });
  const kind = seg(ctrls, { label: 'Talaj', options: [{ v: 'sz', t: 'Szemcsés / gyengén kötött' }, { v: 'k', t: 'Közepesen / erősen kötött' }], value: 'sz' });
  const sH = slider(ctrls, { label: 'Árokmélység', sym: 'H', min: 1, max: 6, step: 0.1, value: 3, unit: 'm' });
  const sg = slider(ctrls, { label: 'Nedves térfogatsúly', sym: 'γn', min: 16, max: 22, step: 0.1, value: 19, unit: 'kN/m³' });
  const sq = slider(ctrls, { label: 'Felszíni teher', sym: 'q', min: 0, max: 30, step: 1, value: 10, unit: 'kPa' });
  const sphi = slider(ctrls, { label: 'Belső súrlódási szög', sym: 'φ', min: 20, max: 40, step: 1, value: 30, unit: '°' });
  const sw = slider(ctrls, { label: 'Víztartalom', sym: 'w', min: 0, max: 30, step: 1, value: 12, unit: '%' });
  const sc = slider(ctrls, { label: 'Kohézió', sym: 'c', min: 0, max: 60, step: 1, value: 15, unit: 'kPa' });
  const sa = slider(ctrls, { label: 'Dúcok vízszintes távolsága', sym: 'a', min: 1, max: 3, step: 0.1, value: 1.8, unit: 'm' });
  const nr = seg(ctrls, { label: 'Dúcsorok száma', options: [{ v: 2, t: '2' }, { v: 3, t: '3' }, { v: 4, t: '4' }], value: 2 });
  const sB = slider(ctrls, { label: 'Árokszélesség (dúchossz)', sym: 'B', min: 0.8, max: 3, step: 0.1, value: 1.2, unit: 'm' });
  const fig = figure(viz, 600, 330);
  const plan = figure(viz, 600, 130);
  const oP = stat(out, { label: 'Dúcnyomás p', unit: 'kPa', d: 1 });
  const oN = stat(out, { label: 'Dúcerő (legnagyobb)', unit: 'kN', d: 0 });
  const oPal = stat(out, { label: 'Palló σ (48 mm)', unit: 'MPa', d: 1 });
  const oHev = stat(out, { label: 'Heveder σ (16/16)', unit: 'MPa', d: 1 });
  const oDuc = stat(out, { label: 'Dúc kihasználtság', unit: '%', d: 0 });
  const info = h('div', { class: 'dc-calc' });
  viz.append(info);
  const vis = () => { const g = kind.v === 'sz'; sphi.el.hidden = !g; sw.el.hidden = !g; sc.el.hidden = g; };
  [kind, sH, sg, sq, sphi, sw, sc, sa, nr, sB].forEach((c) => c.on(() => { vis(); upd(); }));
  function upd() {
    const H = sH.v, g = sg.v, q = sq.v, a = sa.v, n = +nr.v, B = sB.v;
    let p, line;
    const s0 = H * g + q;
    if (kind.v === 'sz') {
      const gd = g / (1 + sw.v / 100);
      const K = clamp(0.8 - ((gd - 16.5) / 2) * 0.2, 0.6, 0.8);
      const Ka = Math.tan(rad(45 - sphi.v / 2)) ** 2;
      p = K * s0 * Ka;
      line = `γ<sub>d</sub> = γ<sub>n</sub>/(1+w) = ${fmt(gd, 2)} kN/m³ → K = ${fmt(K, 3)} &nbsp;·&nbsp; tg²(45° − φ/2) = ${fmt(Ka, 3)} &nbsp;·&nbsp; p = ${fmt(K, 3)} · (${fmt(H, 1)}·${fmt(g, 1)} + ${fmt(q, 0)}) · ${fmt(Ka, 3)} = <b>${fmt(p, 1)} kPa</b>`;
    } else {
      const p1 = s0 - 4 * sc.v, p2 = 0.2 * s0;
      p = Math.max(p1, p2);
      line = `p₁ = (H·γ<sub>n</sub> + q) − 4c = ${fmt(s0, 1)} − ${fmt(4 * sc.v, 0)} = ${fmt(p1, 1)} kPa &nbsp;·&nbsp; p₂ = 0,2·(H·γ<sub>n</sub> + q) = ${fmt(p2, 1)} kPa → <b>p = ${fmt(p, 1)} kPa</b> (${p1 >= p2 ? 'p₁' : 'p₂'} a mértékadó)`;
    }
    const hv = H / n; // függőleges tehermező = pallófesztáv
    const N = p * hv * a;
    const Mp = (p * hv * hv) / 8; // kNm/m
    const sigP = Mp / (1.0 * 0.048 ** 2 / 6) / 1000; // MPa
    const wv = p * hv; // heveder vonalteher kN/m
    const Mh = (wv * a * a) / 8;
    const sigH = Mh / (0.16 * 0.16 ** 2 / 6) / 1000;
    const I = (Math.PI * 0.12 ** 4) / 64, A = (Math.PI * 0.12 ** 2) / 4;
    const Ncr = (Math.PI ** 2 * 10e6 * I) / (B * B);
    const NRd = Math.min((A * 10e3), Ncr / 3);
    const ut = (N / NRd) * 100;
    oP.set(p);
    oN.set(N);
    oPal.set(sigP, sigP <= 10 ? 'ok' : sigP <= 14 ? 'warn' : 'bad');
    oHev.set(sigH, sigH <= 10 ? 'ok' : sigH <= 14 ? 'warn' : 'bad');
    oDuc.set(ut, ut <= 80 ? 'ok' : ut <= 100 ? 'warn' : 'bad');
    info.innerHTML = `<div>${line}</div><div>Dúcerő: N = p · (H/n) · a = ${fmt(p, 1)} · ${fmt(hv, 2)} · ${fmt(a, 1)} = <b>${fmt(N, 0)} kN</b> &nbsp;·&nbsp; Palló: M = p·(H/n)²/8 = ${fmt(Mp, 2)} kNm/m &nbsp;·&nbsp; Heveder: M = p·(H/n)·a²/8 = ${fmt(Mh, 2)} kNm &nbsp;·&nbsp; Dúc: N<sub>Rd</sub> ≈ min(A·f<sub>c</sub>; N<sub>cr</sub>/3) = ${fmt(NRd, 0)} kN</div>`;
    drawFig(p, H, n, N);
    drawPlan(wv, a, Mh);
  }
  function drawFig(p, H, n, N) {
    clear(fig);
    const y0 = 40, S = Math.min(48, 260 / H), xl = 200, xr = 300, y = (d) => y0 + d * S;
    rect(fig, 0, 0, 600, y0, ST(V('sky')));
    const sf = kind.v === 'sz' ? V('soilA') : V('soilB');
    const pat = kind.v === 'sz' ? 'pat-sand' : 'pat-clay';
    for (const [x, w, yy, hh] of [[0, xl, y0, 330 - y0], [xr, 300, y0, 330 - y0], [xl, xr - xl, y(H), 330 - y(H)]]) { rect(fig, x, yy, w, hh, ST(sf)); rect(fig, x, yy, w, hh, ST(`url(#${pat})`)); }
    svg('line', { x1: 0, y1: y0, x2: 600, y2: y0, style: `stroke:${V('soil-line')};stroke-width:1.5` }, fig);
    // pallók
    rect(fig, xl, y0 - 8, 6, y(H) - y0 + 8, ST(V('timber'), 'rgba(0,0,0,.4)', 0.6)); rect(fig, xr - 6, y0 - 8, 6, y(H) - y0 + 8, ST(V('timber'), 'rgba(0,0,0,.4)', 0.6));
    // nyomásábra a jobb oldalon (a talaj felől)
    const pw = clamp(p * 3.2, 8, 230);
    rect(fig, xr, y0, pw, y(H) - y0, ST(V('bad'), V('bad'), 1.2, 'fill-opacity:.14'));
    for (let k = 0; k <= 6; k++) { const yy = y0 + ((y(H) - y0) * (k + 0.5)) / 7; arr(fig, xr + pw, yy, xr + 8, yy, V('bad'), 1.6, 6); }
    txt(fig, xr + pw + 6, y0 + 16, `p = ${fmt(p, 1)} kPa`, 't-num t-bad halo');
    txt(fig, xr + pw + 6, y0 + 32, 'egyenletes helyettesítő teher', 't-sm halo');
    // dúcsorok
    for (let i = 0; i < n; i++) {
      const d = (i + 0.5) * (H / n);
      rect(fig, xl + 6, y(d) - 7, 14, 14, ST(V('timber2'), 'rgba(0,0,0,.45)', 0.7)); rect(fig, xr - 20, y(d) - 7, 14, 14, ST(V('timber2'), 'rgba(0,0,0,.45)', 0.7));
      rect(fig, xl + 20, y(d) - 4.5, xr - xl - 40, 9, ST(V('timber'), 'rgba(0,0,0,.45)', 0.7), { rx: 3 });
      txt(fig, (xl + xr) / 2, y(d) - 9, `N = ${fmt(N, 0)} kN`, 't-num halo', { 'text-anchor': 'middle' });
      if (i < n - 1) svg('line', { x1: xl - 20, y1: y((i + 1) * (H / n)), x2: xl - 6, y2: y((i + 1) * (H / n)), style: `stroke:${V('muted')};stroke-width:1` }, fig);
    }
    svg('line', { x1: xl - 13, y1: y0, x2: xl - 13, y2: y(H), style: `stroke:${V('muted')};stroke-width:1` }, fig);
    txt(fig, xl - 18, y(H / n / 2) + 4, `H/n = ${fmt(H / n, 2)} m`, 't-sm halo', { 'text-anchor': 'end' });
    txt(fig, 12, 322, 'keresztmetszet – a dúcsorok egyenlő tehermezőkkel', 't-sm');
  }
  function drawPlan(wv, a, Mh) {
    clear(plan);
    const x0 = 40, sc = 520 / (3 * a), yb = 56;
    txt(plan, x0, 14, 'felülnézet – a heveder a dúcok között kéttámaszú tartóként viselkedik', 't-sm');
    rect(plan, x0 - 6, yb - 6, 3 * a * sc + 12, 12, ST(V('timber2'), 'rgba(0,0,0,.4)', 0.6));
    for (let k = 0; k <= 12; k++) arr(plan, x0 + (k * 3 * a * sc) / 12, yb - 34, x0 + (k * 3 * a * sc) / 12, yb - 8, V('bad'), 1.3, 5);
    for (let i = 0; i <= 3; i++) { svg('circle', { cx: x0 + i * a * sc, cy: yb + 14, r: 7, style: ST(V('timber'), 'rgba(0,0,0,.5)', 0.8) }, plan); }
    for (let i = 0; i < 3; i++) {
      const xa = x0 + i * a * sc, pts = [];
      for (let k = 0; k <= 20; k++) { const u = k / 20; pts.push([xa + u * a * sc, yb + 26 + 4 * u * (1 - u) * 34]); }
      svg('path', { d: pathD(pts), style: `fill:${V('accent')};fill-opacity:.18;stroke:${V('accent')};stroke-width:1.6` }, plan);
    }
    txt(plan, x0 + 1.5 * a * sc, yb + 72, `M = w·a²/8 = ${fmt(Mh, 2)} kNm  (w = ${fmt(wv, 1)} kN/m, a = ${fmt(a, 1)} m)`, 't-num halo', { 'text-anchor': 'middle' });
  }
  onTheme(upd);
  vis(); upd();
});

/* ================================================================ 5. Táblás dúcolat – beépítési módok */
const TAB = {
  sully: {
    n: 8, max: 3.5,
    texts: [
      'Előkiemelés kb. 1,0–1,25 m mélyre, legfeljebb egy doboznyi hosszon. A dobozt közben a parton összeszerelik: két tábla, köztük állítható dúcok.',
      'A dobozt négyágú lánccal az előkiemelésbe engedik.',
      'Ásás a dobozon belül – legfeljebb <b>0,5 m-rel</b> a tábla éle alá.',
      'A kotró a kanala hátával <b>sarokról sarokra</b> nyomja le a dobozt; a dúcok dőlése legfeljebb <b>1:20</b> lehet.',
      'Ismétlés. Amikor az alapdoboz teteje kb. 20 cm-re van a terep fölött, rákerül a <b>toldóelem</b>.',
      'A végső mélységben a doboz pereme legalább 10 cm-rel a terep fölé ér. A doboz és a földfal közti rést azonnal kitöltik; létra, élvédelem.',
      'Munka a dobozban: a cső a dúcok alatti szabad térben kerül a helyére.',
      'Továbblépés: a dolgozók kimennek, a dobozt kiemelik és továbbviszik – mozgatás közben senki sem lehet benne. A kész szakaszt rétegesen visszatöltik.',
    ],
  },
  beall: {
    n: 3, max: 2.4,
    texts: [
      'Az árkot a teljes mélységig kiássák – ez csak <b>ideiglenesen állékony</b> talajban és rövid szakaszon megengedett.',
      'A kész dobozt az árokba engedik.',
      'A doboz <b>passzív pajzs</b>: a talaj addig mozdul, amíg rá nem fekszik a táblára – ezért a rést azonnal ki kell tölteni. Laza talajban, forgalom mellett ez a mód nem megengedett.',
    ],
  },
  sin: {
    n: 5, max: 4.2,
    texts: [
      'Előkiemelés legfeljebb 1,25 m-ig; behelyezik az első lemezt és a sínkeretet (két függőleges acélsín, köztük a görgős kocsi a dúcokkal).',
      'Kb. 0,5 m ásás, majd a <b>sínek</b> lenyomása.',
      'Utána a <b>lemezek</b> lenyomása – felváltva: egyik elem sem járhat 0,5 m-nél többel a többi előtt.',
      'Ismétlés a végső mélységig; a toldó lemez a sín második vezetőhornyába kerül.',
      'A görgős kocsi tetszőleges magasságba állítható: alatta nagy átmérőjű cső is befér. Egyszeres / kettős / hármas sínnel kb. 3,7 / 7,4 / 8,5 m mélységig (gyártói adat).',
    ],
  },
};
register('duc-tablas', (root) => {
  const { ctrls, viz, out } = shell(root);
  const mode = seg(ctrls, { label: 'Beépítési mód', vert: true, options: [{ v: 'sully', t: 'Ásással együtt süllyesztés' }, { v: 'beall', t: 'Beállítás kész árokba' }, { v: 'sin', t: 'Csúszósínes rendszer' }], value: 'sully' });
  ctrls.append(h('div', { class: 'ctl-hint' }, 'Hosszmetszet az árok tengelyében: a sötét rész a kiásott árok, előtte a dobozt alkotó tábla.'));
  const fig = figure(viz, 600, 360);
  const stepBox = h('div', {}); viz.append(stepBox);
  const oE = stat(out, { label: 'Ásás a tábla éle alatt', unit: 'm', d: 2 });
  const oT = stat(out, { label: 'Dőlés' });
  const oD = stat(out, { label: 'Kiemelési mélység', unit: 'm', d: 2 });
  const y0 = 135, S = 50, X0 = 200, LEN = 3.5 * S, BH = 2.4, EH = 1.3;
  const y = (d) => y0 + d * S;
  const k01 = (s, a, b = a + 1) => clamp((s - a) / (b - a), 0, 1);
  function scene(st) {
    clear(fig);
    rect(fig, 0, 0, 600, y0, ST(V('sky')));
    rect(fig, 0, y0, 600, 360 - y0, ST(V('soilD'))); rect(fig, 0, y0, 600, 360 - y0, ST('url(#pat-gravel)'));
    // visszatöltött szakasz balra
    if (st.back) { rect(fig, 20, y0, X0 - 30, y(st.back) - y0, ST(V('soilC'), 'none', 0, 'opacity:.85')); txt(fig, 30, y0 + 18, 'visszatöltve', 't-sm halo'); }
    // kiásott rész
    if (st.e > 0) rect(fig, st.ex0 ?? X0 - 8, y0, (st.ex1 ?? X0 + LEN + 8) - (st.ex0 ?? X0 - 8), y(st.e) - y0, ST(V('bg2')));
    if (st.e > 0) rect(fig, st.ex0 ?? X0 - 8, y0, (st.ex1 ?? X0 + LEN + 8) - (st.ex0 ?? X0 - 8), y(st.e) - y0, ST('#000', 'none', 0, 'opacity:.12'));
    svg('line', { x1: 0, y1: y0, x2: 600, y2: y0, style: `stroke:${V('soil-line')};stroke-width:1.5` }, fig);
    if (st.pipe) { rect(fig, 20, y(st.e) - 0.75 * S, X0 + LEN - 30, 0.6 * S, ST(V('concrete'), 'rgba(0,0,0,.35)', 0.8, `opacity:${st.pipe}`), { rx: 0.3 * S }); }
  }
  function boxDraw(bl, br, ext, o = 1, dx = 0) {
    // bl, br: a bal / jobb alsó sarok mélysége (m); ext: toldóelem (0..1)
    const g = svg('g', { style: `opacity:${o}`, transform: `translate(${dx} 0)` }, fig);
    const ht = BH + (ext > 0 ? EH : 0);
    const p = [[X0, y(bl)], [X0 + LEN, y(br)], [X0 + LEN, y(br - BH)], [X0, y(bl - BH)]];
    svg('polygon', { points: p.map((q) => q.join(',')).join(' '), style: ST(V('steelm'), V('steelm2'), 1.5, 'fill-opacity:.82') }, g);
    // vágóél
    svg('line', { x1: X0, y1: y(bl), x2: X0 + LEN, y2: y(br), style: `stroke:${V('ink')};stroke-width:3` }, g);
    // bordák
    for (let k = 1; k < 6; k++) { const u = k / 6; svg('line', { x1: X0 + u * LEN, y1: lerp(y(bl), y(br), u), x2: X0 + u * LEN, y2: lerp(y(bl - BH), y(br - BH), u), style: 'stroke:rgba(0,0,0,.18);stroke-width:1' }, g); }
    // dúcok (végnézetben)
    for (const u of [0.12, 0.88]) for (const hh of [0.55, 1.75]) { const cx = X0 + u * LEN, cy = lerp(y(bl - hh), y(br - hh), u); svg('circle', { cx, cy, r: 9, style: ST('#5d8a4a', 'rgba(0,0,0,.5)', 1) }, g); svg('circle', { cx, cy, r: 3.5, style: ST(V('accent')) }, g); }
    if (ext > 0) {
      const off = (1 - ext) * 1.6;
      const q = [[X0, y(bl - BH - off)], [X0 + LEN, y(br - BH - off)], [X0 + LEN, y(br - BH - EH - off)], [X0, y(bl - BH - EH - off)]];
      svg('polygon', { points: q.map((r) => r.join(',')).join(' '), style: ST(V('steelm'), V('steelm2'), 1.5, `fill-opacity:.7;opacity:${ext}`) }, g);
      for (const u of [0.12, 0.88]) { const cx = X0 + u * LEN, cy = lerp(y(bl - BH - off - 0.65), y(br - BH - off - 0.65), u); svg('circle', { cx, cy, r: 8, style: ST('#5d8a4a', 'rgba(0,0,0,.5)', 1, `opacity:${ext}`) }, g); }
      txt(g, X0 + LEN + 6, y(br - BH - EH / 2 - off), 'toldóelem', 't-sm halo');
    }
    // emelőfülek
    for (const u of [0.04, 0.96]) { const cx = X0 + u * LEN, cy = lerp(y(bl - ht), y(br - ht), u); svg('circle', { cx, cy: cy - 4, r: 4, style: ST('none', V('ink'), 2) }, g); }
    return g;
  }
  function excavator(tx, ty, push = false) {
    const bx = 520, by = y0 - 26;
    rect(fig, bx - 40, by, 90, 22, ST(V('accent'), 'rgba(0,0,0,.4)', 1), { rx: 4 });
    rect(fig, bx - 20, by - 26, 34, 26, ST(V('accent'), 'rgba(0,0,0,.4)', 1), { rx: 3 });
    rect(fig, bx - 12, by - 22, 18, 13, ST(V('steel-soft')));
    rect(fig, bx - 44, by + 20, 98, 9, ST('#333'), { rx: 4.5 });
    const ax = bx - 18, ay = by - 6;
    const mx = (ax + tx) / 2 + 10, my = Math.min(ay, ty) - 60;
    svg('path', { d: `M ${ax} ${ay} L ${mx} ${my} L ${tx + 10} ${ty - 18}`, style: `fill:none;stroke:${V('accent')};stroke-width:8;stroke-linecap:round;stroke-linejoin:round` }, fig);
    svg('path', { d: push ? `M ${tx - 14} ${ty - 2} L ${tx + 16} ${ty - 2} L ${tx + 14} ${ty - 20} L ${tx - 6} ${ty - 22} Z` : `M ${tx - 6} ${ty - 22} q 26 -2 22 20 l -22 2 z`, style: ST('#555', 'rgba(0,0,0,.6)', 1) }, fig);
    if (push) arr(fig, tx + 26, ty - 40, tx + 26, ty - 6, V('bad'), 2.5, 8);
  }
  const DRAW = {
    sully(s) {
      let e = 0, bl = -0.2, br = -0.2, ext = 0, dx = 0, back = 0, pipe = 0, push = null, dig = null;
      e = 1.2 * k01(s, 0, 1);
      if (s >= 1) { bl = br = lerp(-0.2, 1.2, k01(s, 1, 2)); }
      if (s >= 2) { e = 1.2 + 0.5 * k01(s, 2, 3); dig = [X0 + LEN * 0.5, y(e)]; }
      if (s >= 3) { const t = s - 3; bl = 1.2 + 0.5 * k01(t, 0, 0.5); br = 1.2 + 0.5 * k01(t, 0.5, 1); push = t < 0.5 ? 'l' : 'r'; dig = null; }
      if (s >= 4) { const t = s - 4; e = lerp(1.7, 2.2, k01(t, 0, 0.45)); bl = br = lerp(1.7, 2.2, k01(t, 0.1, 0.5)); ext = k01(t, 0.55, 1); push = null; }
      if (s >= 5) { const t = s - 5; e = lerp(2.2, 3.5, k01(t, 0, 0.8)); bl = br = lerp(2.2, 3.5, k01(t, 0.1, 0.9)); ext = 1; }
      if (s >= 6) { pipe = k01(s, 6, 6.6); }
      if (s >= 7) { const t = s - 7; bl = br = lerp(3.5, -1.2, k01(t, 0, 0.5)); dx = 220 * k01(t, 0.5, 1); pipe = 1; back = 3.5 * k01(t, 0.4, 1); }
      scene({ e, back: back ? 3.5 : 0, pipe });
      if (back) { rect(fig, X0 - 8, y0 + (y(3.5) - y0) * (1 - k01(s, 7.4, 8)), LEN + 16, (y(3.5) - y0) * k01(s, 7.4, 8), ST(V('soilC'), 'none', 0, 'opacity:.85')); }
      boxDraw(bl, br, ext, 1, dx);
      if (s < 2) { const yy = y(bl - BH); for (const u of [0.04, 0.96]) svg('line', { x1: X0 + u * LEN, y1: yy - 4, x2: X0 + LEN / 2, y2: yy - 60, style: `stroke:${V('ink')};stroke-width:1.2` }, fig); }
      if (push) excavator(push === 'l' ? X0 + 12 : X0 + LEN - 12, y((push === 'l' ? bl : br) - BH - (ext ? EH : 0)), true);
      else if (dig) excavator(dig[0], dig[1]);
      else if (s < 2) excavator(X0 + LEN / 2, y(bl - BH) - 60);
      // méretek
      const edge = Math.min(bl, br);
      if (e - edge > 0.02 && s < 7) { svg('line', { x1: X0 + LEN + 22, y1: y(edge), x2: X0 + LEN + 22, y2: y(e), style: `stroke:${e - edge <= 0.51 ? V('ok') : V('bad')};stroke-width:2.5` }, fig); txt(fig, X0 + LEN + 28, (y(edge) + y(e)) / 2 + 4, `${fmt(e - edge, 2)} m ≤ 0,5 m`, 't-sm halo'); }
      if (s > 5.5 && s < 7) { const top = bl - BH - EH; txt(fig, X0 - 10, y(top) - 2, `perem +${fmt(-top * 100, 0)} cm`, 't-sm t-ok halo', { 'text-anchor': 'end' }); }
      const tilt = Math.abs(bl - br) / 3.5;
      oE.set(Math.max(0, e - Math.min(bl, br)), e - Math.min(bl, br) <= 0.51 ? 'ok' : 'bad');
      oT.set(tilt, tilt <= 0.051 ? 'ok' : 'bad', tilt < 0.001 ? 'vízszintes' : `1:${fmt(1 / tilt, 0)}`);
      oD.set(e);
    },
    beall(s) {
      const e = 2.4 * k01(s, 0, 1);
      const b = s < 1 ? -0.3 : lerp(-0.3, 2.35, k01(s, 1, 2));
      scene({ e, ex0: X0 - 4, ex1: X0 + LEN + 4 });
      boxDraw(b, b, 0, 1);
      if (s < 2 && s >= 1) { const yy = y(b - BH); for (const u of [0.04, 0.96]) svg('line', { x1: X0 + u * LEN, y1: yy - 4, x2: X0 + LEN / 2, y2: yy - 60, style: `stroke:${V('ink')};stroke-width:1.2` }, fig); }
      if (s >= 2) { const o = k01(s, 2, 2.6); for (const x of [X0 - 4, X0 + LEN]) rect(fig, x, y0, 4, y(2.4) - y0, ST(V('soilC'), 'none', 0, `opacity:${o}`)); txt(fig, X0 + LEN / 2, y0 - 10, 'rés kitöltése – a doboz csak pajzs!', 't-sm t-bad halo', { 'text-anchor': 'middle' }); }
      if (s < 1) excavator(X0 + LEN / 2, y(e));
      oE.set(Math.max(0, e - b), 'ok'); oT.set(0, 'ok', 'vízszintes'); oD.set(e);
    },
    sin(s) {
      let e = 1.25 * k01(s, 0, 0.6), rail = 1.25 * k01(s, 0.3, 1), plate = rail;
      if (s >= 1) { e = 1.25 + 0.5 * k01(s, 1, 1.5); rail = 1.25 + 0.5 * k01(s, 1.5, 2); plate = 1.25; }
      if (s >= 2) { plate = 1.25 + 0.5 * k01(s, 2, 3); }
      if (s >= 3) { const t = s - 3; e = lerp(1.75, 4.2, t); rail = lerp(1.75, 4.2, k01(t, 0.05, 1)); plate = lerp(1.75, 4.2, k01(t, 0.1, 1)); }
      if (s >= 4) { e = rail = plate = 4.2; }
      scene({ e, pipe: s >= 4 ? k01(s, 4.3, 5) : 0 });
      const g = svg('g', {}, fig);
      // lemezek
      const pH = 2.4;
      rect(g, X0 + 10, y(plate - pH), LEN - 20, pH * S, ST(V('steelm'), V('steelm2'), 1.2, 'fill-opacity:.8'));
      if (s >= 3) { const up = Math.max(0, plate - pH); if (up > 0.05) rect(g, X0 + 16, y(Math.max(-0.1, plate - pH - 1.4)), LEN - 32, (Math.min(1.4, up + 0.1)) * S, ST(V('steelm'), V('steelm2'), 1.2, 'fill-opacity:.62')); }
      // sínek
      for (const x of [X0 - 6, X0 + LEN - 10]) rect(g, x, y(rail - 4.6), 16, 4.6 * S, ST(V('steel'), 'rgba(0,0,0,.45)', 1));
      // görgős kocsi
      const cy = s >= 4 ? lerp(rail - 1.2, rail - 3.1, k01(s, 4, 4.5)) : rail - 1.2;
      rect(g, X0 + 4, y(cy) - 10, LEN - 8, 20, ST('#5d8a4a', 'rgba(0,0,0,.5)', 1), { rx: 4 });
      txt(g, X0 + LEN / 2, y(cy) + 4, 'görgős kocsi + dúc', 't-sm', { 'text-anchor': 'middle', style: 'fill:#fff' });
      const diff = Math.abs(rail - plate);
      if (s < 4) txt(fig, X0 + LEN + 26, y(Math.min(rail, plate)) + 4, `sín–lemez: ${fmt(diff, 2)} m`, `t-sm halo ${diff <= 0.51 ? 't-ok' : 't-bad'}`);
      if (s < 3.2) excavator(X0 + LEN / 2, y(e));
      oE.set(Math.max(0, e - Math.min(rail, plate)), e - Math.min(rail, plate) <= 0.51 ? 'ok' : 'bad');
      oT.set(diff, diff <= 0.51 ? 'ok' : 'bad', `sín–lemez ${fmt(diff, 2)} m`);
      oD.set(e);
    },
  };
  let cur = 'sully';
  const stp = stepper(stepBox, { n: TAB.sully.n, texts: TAB.sully.texts, intro: 'Válassz beépítési módot, és lépj végig rajta.', draw: (s) => DRAW[cur](s), speed: 0.9 });
  mode.on((m) => { cur = m; stp.reset(TAB[m].n, TAB[m].texts); });
  onTheme(() => stp.redraw());
});

/* ================================================================ 6. Euler-kihajlás – széles gödör dúcai */
const SECT = {
  fa12: { t: 'Gömbfa dúc Ø12 cm', E: 10e6, d: 0.12, fc: 20e3, mat: 'fa' },
  fa16: { t: 'Gömbfa dúc Ø16 cm', E: 10e6, d: 0.16, fc: 20e3, mat: 'fa' },
  heb: { t: 'HEB 200 (gyenge tengely)', E: 210e6, I: 2003e-8, A: 78.1e-4, fy: 355e3, mat: 'acél' },
  c324: { t: 'Acélcső Ø323,9×8', E: 210e6, D: 0.3239, tw: 0.008, fy: 355e3, mat: 'acél' },
  c610: { t: 'Acélcső Ø610×12,5', E: 210e6, D: 0.61, tw: 0.0125, fy: 355e3, mat: 'acél' },
  c914: { t: 'Acélcső Ø914×16', E: 210e6, D: 0.914, tw: 0.016, fy: 355e3, mat: 'acél' },
};
function sectProps(k) {
  const s = SECT[k];
  if (s.d) { const I = (Math.PI * s.d ** 4) / 64, A = (Math.PI * s.d ** 2) / 4; return { I, A, Npl: A * s.fc, E: s.E }; }
  if (s.D) { const d = s.D - 2 * s.tw; const I = (Math.PI * (s.D ** 4 - d ** 4)) / 64, A = (Math.PI * (s.D ** 2 - d ** 2)) / 4; return { I, A, Npl: A * s.fy, E: s.E }; }
  return { I: s.I, A: s.A, Npl: s.A * s.fy, E: s.E };
}
register('duc-kihajlas', (root) => {
  const { ctrls, viz, out } = shell(root, { foot: 'Euler-féle rugalmas kritikus erő, mindkét végén csuklós dúc: N<sub>cr</sub> = π²EI/L². Biztonsági tényező, kezdeti görbeség és saját súly nélkül – <b>szemléltető</b>. Fánál a nyomószilárdság (~20 MPa), acélnál a folyáshatár (S355) adja a felső korlátot.' });
  const sL = slider(ctrls, { label: 'Gödörszélesség = dúchossz', sym: 'L', min: 2, max: 20, step: 0.5, value: 3, unit: 'm' });
  const sec = select(ctrls, { label: 'Dúc keresztmetszete', options: Object.entries(SECT).map(([v, o]) => ({ v, t: o.t })), value: 'fa16' });
  const sp = slider(ctrls, { label: 'Dúcnyomás', sym: 'p', min: 10, max: 80, step: 1, value: 25, unit: 'kPa' });
  const sa = slider(ctrls, { label: 'Dúcok vízszintes távolsága', sym: 'a', min: 1.5, max: 8, step: 0.5, value: 2, unit: 'm' });
  const sh = slider(ctrls, { label: 'Függőleges tehermező', sym: 'h', min: 1, max: 4, step: 0.1, value: 1.5, unit: 'm' });
  const mid = toggle(ctrls, { label: 'Közbenső alátámasztás (oszlop) a dúc közepén', value: false });
  const fig = figure(viz, 600, 170);
  const ch = figure(viz, 600, 250);
  const oN = stat(out, { label: 'Dúcerő N = p·a·h', unit: 'kN', d: 0 });
  const oC = stat(out, { label: 'Kritikus erő N<sub>cr</sub>', unit: 'kN', d: 0 });
  const oU = stat(out, { label: 'N / N<sub>határ</sub>', unit: '%', d: 0 });
  const oQ = stat(out, { label: 'Kétszeres hossznál', unit: '', d: 0 });
  const ver = verdict(viz);
  [sL, sec, sp, sa, sh, mid].forEach((c) => c.on(upd));
  function upd() {
    const L = sL.v, k = sec.v, P = sectProps(k), N = sp.v * sa.v * sh.v;
    const Le = mid.v ? L / 2 : L;
    const Ncr = (Math.PI ** 2 * P.E * P.I) / (Le * Le);
    const Nlim = Math.min(Ncr, P.Npl);
    const u = N / Nlim;
    oN.set(N); oC.set(Ncr); oU.set(u * 100, u <= 0.33 ? 'ok' : u <= 1 ? 'warn' : 'bad');
    oQ.set(0, null, `N<sub>cr</sub>/4 = ${fmt(Ncr / 4, 0)} kN`);
    const tip = u > 1 ? 'Kihajlik! Rövidebb dúc, nagyobb keresztmetszet vagy közbenső alátámasztás kell.' : u > 0.33 ? 'Euler szerint még megáll, de nincs elég tartalék (kb. háromszoros biztonság kellene).' : 'Bőséges tartalék.';
    ver.set(u <= 0.33 ? 'ok' : u <= 1 ? 'warn' : 'bad', `${SECT[k].t}, L = ${fmt(L, 1)} m${mid.v ? ' (közbenső oszloppal: L<sub>e</sub> = ' + fmt(Le, 2) + ' m)' : ''}`, `<span>${tip} ${L > 3 && SECT[k].mat === 'fa' ? 'Kb. 3 m-nél szélesebb gödörben a fa dúc már nehézkes – ezért kell több irányú merevítés, ferde dúc vagy nagy átmérőjű acélcső.' : ''}</span>`);
    drawStrut(L, u, mid.v);
    drawChart(L, N, k, mid.v);
  }
  function drawStrut(L, u, m) {
    clear(fig);
    const xa = 70, xb = 530, yc = 92;
    for (const x of [xa - 50, xb]) { rect(fig, x, 20, 50, 140, ST(V('soilB'))); rect(fig, x, 20, 50, 140, ST('url(#pat-clay)')); }
    rect(fig, xa - 8, 30, 8, 125, ST(V('steelm'), 'rgba(0,0,0,.4)', 0.8)); rect(fig, xb, 30, 8, 125, ST(V('steelm'), 'rgba(0,0,0,.4)', 0.8));
    const amp = clamp(u, 0, 1.6) * 22 * (u > 1 ? 1.4 : 0.6);
    const pts = [];
    for (let k = 0; k <= 40; k++) { const t = k / 40; const w = m ? Math.sin(2 * Math.PI * t) : Math.sin(Math.PI * t); pts.push([xa + t * (xb - xa), yc - amp * w]); }
    const col = u <= 0.33 ? V('ok') : u <= 1 ? V('warn') : V('bad');
    svg('path', { d: pathD(pts), style: `fill:none;stroke:${SECT[sec.v].mat === 'fa' ? V('timber') : V('steelm2')};stroke-width:12;stroke-linecap:round` }, fig);
    svg('path', { d: pathD(pts), style: `fill:none;stroke:${col};stroke-width:2.5;stroke-linecap:round;stroke-dasharray:${u > 1 ? '7 5' : 'none'}` }, fig);
    if (m) { rect(fig, (xa + xb) / 2 - 5, yc + 6, 10, 62, ST(V('steelm2'))); txt(fig, (xa + xb) / 2 + 10, yc + 58, 'közbenső oszlop', 't-sm halo'); }
    arr(fig, xa - 40, yc, xa - 10, yc, V('bad'), 2.4, 8); arr(fig, xb + 40, yc, xb + 10, yc, V('bad'), 2.4, 8);
    svg('line', { x1: xa, y1: 160, x2: xb, y2: 160, style: `stroke:${V('muted')};stroke-width:1` }, fig);
    txt(fig, (xa + xb) / 2, 156, `L = ${fmt(L, 1)} m (alakváltozás erősen nagyítva)`, 't-sm halo', { 'text-anchor': 'middle' });
  }
  function drawChart(L, N, k, m) {
    clear(ch);
    const x0 = 64, x1 = 580, yA = 16, yB = 210, lmin = Math.log10(5), lmax = Math.log10(2e5);
    const X = (l) => x0 + ((l - 2) / 18) * (x1 - x0);
    const Y = (n) => yB - ((Math.log10(clamp(n, 5, 2e5)) - lmin) / (lmax - lmin)) * (yB - yA);
    for (const n of [10, 100, 1000, 10000, 100000]) { svg('line', { x1: x0, y1: Y(n), x2: x1, y2: Y(n), class: 'grid' }, ch); txt(ch, x0 - 6, Y(n) + 4, n >= 1000 ? fmt(n / 1000, 0) + ' MN' : n + ' kN', 't-sm', { 'text-anchor': 'end' }); }
    for (let l = 2; l <= 20; l += 2) { txt(ch, X(l), yB + 16, String(l), 't-sm', { 'text-anchor': 'middle' }); }
    txt(ch, x1, yB + 32, 'dúchossz L (m)', 't-sm', { 'text-anchor': 'end' });
    svg('line', { x1: x0, y1: yB, x2: x1, y2: yB, class: 'axis' }, ch);
    for (const kk of Object.keys(SECT)) {
      const P = sectProps(kk); const pts = [];
      for (let l = 2; l <= 20.01; l += 0.25) { const le = m ? l / 2 : l; pts.push([X(l), Y(Math.min((Math.PI ** 2 * P.E * P.I) / (le * le), P.Npl))]); }
      const on = kk === k;
      svg('path', { d: pathD(pts), style: `fill:none;stroke:${on ? V('grp') : V('line2')};stroke-width:${on ? 3 : 1.4}` }, ch);
      if (!on) { const lp = pts[pts.length - 1]; txt(ch, lp[0] - 4, lp[1] - 4, SECT[kk].t.replace('Gömbfa dúc ', '').replace('Acélcső ', '').replace(' (gyenge tengely)', ''), 't-sm', { 'text-anchor': 'end' }); }
    }
    svg('line', { x1: x0, y1: Y(N), x2: x1, y2: Y(N), style: `stroke:${V('bad')};stroke-width:1.6;stroke-dasharray:6 4` }, ch);
    txt(ch, x0 + 6, Y(N) - 6, `N = ${fmt(N, 0)} kN`, 't-sm t-bad halo');
    const P = sectProps(k); const le = m ? L / 2 : L; const nc = Math.min((Math.PI ** 2 * P.E * P.I) / (le * le), P.Npl);
    svg('circle', { cx: X(L), cy: Y(nc), r: 6, style: ST(V('grp'), V('surface'), 2) }, ch);
    txt(ch, X(L) + 10, Y(nc) - 8, `${fmt(nc, 0)} kN`, 't-num halo');
    txt(ch, x0 + 6, yA + 6, 'Kritikus erő – log. skála (a vízszintes szakasz a szilárdsági korlát)', 't-sm');
  }
  onTheme(upd);
  upd();
});

/* ================================================================ 7. Ferde dúcok – földpadka, alaplemez, erőfelbontás */
register('duc-ferde', (root) => {
  const { ctrls, viz, out } = shell(root, { foot: 'Erőfelbontás: N = H / cos α, V = H · tg α (saját számítás, szemléltető). A ferde dúc függőleges összetevője a falat emeli, a dúc talppontját pedig lefelé nyomja.' });
  const sa = slider(ctrls, { label: 'A ferde dúc hajlásszöge', sym: 'α', min: 18, max: 55, step: 1, value: 25, unit: '°' });
  const sH = slider(ctrls, { label: 'Vízszintes támaszerő dúconként', sym: 'H', min: 100, max: 600, step: 10, value: 260, unit: 'kN' });
  const fig = figure(viz, 620, 330);
  const plan = figure(viz, 620, 110);
  const stepBox = h('div', {}); viz.append(stepBox);
  const oN = stat(out, { label: 'Dúcerő N', unit: 'kN', d: 0 });
  const oV = stat(out, { label: 'Függőleges összetevő V', unit: 'kN', d: 0 });
  const oR = stat(out, { label: 'Vízszintes kinyúlás', unit: 'm', d: 1 });
  const texts = [
    'Áll a munkatérhatároló fal, rajta a fejgerenda / heveder. A gödör <b>közepét</b> kiemelik, de a fal mellett <b>földpadka</b> marad: ennek passzív ellenállása tartja a fal lábát.',
    'Elkészül az <b>alaplemez belső része</b>, a szélén acél konzolokkal (vagy külön ellentámasz-tömbökkel).',
    'A hevedertől az alaplemez széléig <b>ferde dúcok</b> kerülnek be; sajtóval előfeszítik, majd ékkel rögzítik.',
    'A földpadkát <b>rövid, 5–7 m-es szakaszokban, felváltva</b> bontják – sosem egyszerre a teljes hosszon.',
    'Minden kibontott szakaszban azonnal betonozzák a lemez <b>peremsávját</b>: innentől a lemez közvetlenül megtámasztja a fal lábát.',
    'A dúcolatot csak akkor bontják, amikor a <b>pincefalak és födémek</b> elkészültek, és tárcsaként fel tudják venni a földnyomást.',
  ];
  let sNow = 0;
  const stp = stepper(stepBox, { n: 6, texts, intro: 'Lépj végig az építés menetén – közben a szöget is állíthatod.', draw: (s) => { sNow = s; drawAll(); }, speed: 0.9 });
  [sa, sH].forEach((c) => c.on(drawAll));
  function drawAll() {
    const s = sNow, a = sa.v, H = sH.v;
    const N = H / Math.cos(rad(a)), Vv = H * Math.tan(rad(a));
    const drop = 4.5, reach = drop / Math.tan(rad(a));
    oN.set(N); oV.set(Vv, a <= 30 ? 'ok' : a <= 40 ? 'warn' : 'bad'); oR.set(reach);
    const k01 = (x, p, q = p + 1) => clamp((x - p) / (q - p), 0, 1);
    clear(fig);
    const S = 34, xw = 70, y0 = 44, y = (d) => y0 + d * S, X = (m) => xw + m * S, D = 6;
    rect(fig, 0, 0, 620, y0, ST(V('sky')));
    rect(fig, 0, y0, xw, 330 - y0, ST(V('soilD'))); rect(fig, 0, y0, xw, 330 - y0, ST('url(#pat-gravel)'));
    rect(fig, xw, y(D), 620 - xw, 330 - y(D), ST(V('soilB'))); rect(fig, xw, y(D), 620 - xw, 330 - y(D), ST('url(#pat-clay)'));
    // gödör fölötti talaj, ami még nincs kiemelve (s<0.5 elején)
    const ex = k01(s, 0, 0.8);
    if (ex < 1) { rect(fig, X(5), y0, 620 - X(5), (y(D) - y0) * (1 - ex), ST(V('soilD'), 'none', 0, 'opacity:.9')); }
    // földpadka: trapéz – szakaszos bontás a 4. lépéstől
    const bermGone = k01(s, 3, 4.2);
    const footX0 = 1.2 + reach, toe = Math.max(3.2, footX0 - 0.6), topW = Math.min(2.6, toe - 1.6);
    const berm = [[X(0), y(1.6)], [X(topW), y(1.6)], [X(toe), y(D)], [X(0), y(D)]];
    if (bermGone < 1) { svg('polygon', { points: berm.map((p) => p.join(',')).join(' '), style: ST(V('soilD'), V('soil-line'), 1, `opacity:${1 - bermGone * 0.75}`) }, fig); svg('polygon', { points: berm.map((p) => p.join(',')).join(' '), style: ST('url(#pat-gravel)', 'none', 0, `opacity:${1 - bermGone * 0.75}`) }, fig); if (s < 3.5) txt(fig, X(Math.min(1.4, topW * 0.6)), y(4.6), 'földpadka', 't-lab halo'); }
    // fal (szádfal)
    rect(fig, xw - 8, y0 - 6, 8, (D + 3) * S + 6, ST(V('steelm'), 'rgba(0,0,0,.45)', 0.8));
    rect(fig, xw - 12, y0 - 10, 16, 14, ST(V('concrete'), 'rgba(0,0,0,.45)', 0.8));
    // alaplemez – belső rész, majd peremsáv
    const slabIn = k01(s, 1, 1.6), slabEdge = k01(s, 4, 4.8);
    const footX = 1.2 + reach;
    if (slabIn > 0) rect(fig, X(Math.min(footX - 0.3, 9)), y(D) - 0.6 * S, 620 - X(Math.min(footX - 0.3, 9)), 0.6 * S, ST(V('concrete'), 'rgba(0,0,0,.45)', 0.8, `opacity:${slabIn}`));
    if (slabEdge > 0) rect(fig, X(0), y(D) - 0.6 * S, (X(Math.min(footX - 0.3, 9)) - X(0)) * slabEdge, 0.6 * S, ST(V('concrete2'), 'rgba(0,0,0,.45)', 0.8));
    // ferde dúc
    const rk = k01(s, 2, 2.6) * (1 - k01(s, 5, 5.7));
    const hx = X(0.15), hy = y(1.5), fx = X(footX), fy = y(D) - 0.6 * S;
    if (rk > 0) {
      rect(fig, xw, hy - 9, 14, 18, ST(V('steel'), 'rgba(0,0,0,.4)', 0.8, `opacity:${rk}`));
      svg('line', { x1: hx + 12, y1: hy, x2: lerp(hx + 12, fx, rk), y2: lerp(hy, fy, rk), style: `stroke:${V('steelm2')};stroke-width:11;stroke-linecap:round` }, fig);
      svg('line', { x1: hx + 12, y1: hy, x2: lerp(hx + 12, fx, rk), y2: lerp(hy, fy, rk), style: `stroke:${V('steelm')};stroke-width:6;stroke-linecap:round` }, fig);
      if (rk > 0.95) {
        // erőfelbontás a dúcfejnél
        const sc2 = 70 / 600;
        arr(fig, hx + 14 + H * sc2, hy, hx + 16, hy, V('bad'), 2.4, 8);
        arr(fig, hx + 16, hy + Vv * sc2 + 2, hx + 16, hy + 4, V('warn'), 2.4, 8);
        txt(fig, hx + 18 + H * sc2, hy - 6, `H = ${fmt(H, 0)} kN`, 't-num t-bad halo');
        txt(fig, hx + 24, hy + Math.max(20, Vv * sc2), `V = ${fmt(Vv, 0)} kN ↑ (emeli a falat)`, 't-num halo', { style: `fill:${V('warn')}` });
        txt(fig, (hx + fx) / 2 + 8, (hy + fy) / 2 - 8, `α = ${fmt(a, 0)}°  N = ${fmt(N, 0)} kN`, 't-num halo');
      }
    }
    // pincefal + födém az utolsó lépésben
    const perm = k01(s, 5, 5.8);
    if (perm > 0) { rect(fig, xw + 4, y(1.2), 12, (D - 1.2) * S - 0.6 * S, ST(V('concrete2'), 'rgba(0,0,0,.4)', 0.8, `opacity:${perm}`)); rect(fig, xw + 4, y(2.6), 620 - xw, 10, ST(V('concrete2'), 'rgba(0,0,0,.4)', 0.8, `opacity:${perm}`)); txt(fig, X(6), y(2.6) - 6, 'pincefal + födém (tárcsa)', 't-sm halo', { style: `opacity:${perm}` }); }
    svg('line', { x1: 0, y1: y0, x2: 620, y2: y0, style: `stroke:${V('soil-line')};stroke-width:1.5` }, fig);
    txt(fig, 10, 322, `szemléltető metszet: 6 m mély gödör, a dúc feje 1,5 m mélyen`, 't-sm');
    // alaprajz: padkabontás szakaszai
    clear(plan);
    txt(plan, 10, 16, 'alaprajz a fal mentén – a padka bontási sorrendje (5–7 m-es szakaszok)', 't-sm');
    const n = 8, w = 560 / n;
    rect(plan, 20, 30, 560, 10, ST(V('steelm'), 'rgba(0,0,0,.4)', 0.6));
    for (let i = 0; i < n; i++) {
      const odd = i % 2 === 0; const tt = odd ? k01(s, 3, 3.5) : k01(s, 3.5, 4);
      const x = 20 + i * w;
      rect(plan, x + 2, 42, w - 4, 34, ST(tt > 0.5 ? V('concrete2') : V('soilD'), V('line2'), 0.8));
      txt(plan, x + w / 2, 64, odd ? '1.' : '2.', 't-num', { 'text-anchor': 'middle' });
      if (tt > 0.5) txt(plan, x + w / 2, 98, 'peremsáv', 't-sm', { 'text-anchor': 'middle' });
    }
  }
  onTheme(drawAll);
  drawAll();
});

/* ================================================================ kvízek */
defineQuiz('ducolas', 'Kvíz – munkaárok dúcolása', [
  { q: 'Mit jelent az m₀?', a: ['Azt a mélységet, ameddig a függőleges földfal megtámasztás nélkül ideiglenesen (talajvíz felett) állékony', 'A dúcok közötti legnagyobb megengedett függőleges távolságot', 'A pallók kötelező befogási hosszát a fenék alatt', 'A munkaárok legkisebb szélességét'], c: 0, e: 'm₀ = 4c/(nγ)·tg(45° + φ/2) − p/γ – kohézió nélkül (homokban) nulla vagy negatív.' },
  { q: 'Melyik pallózási módot választjuk, ha a gödör megtámasztás nélkül a teljes mélységig kiemelhető (m₀ > H)?', a: ['Állított pallózás', 'Utánhajtott pallózás', 'Vízszintes pallózás, lépcsős mélyítés', 'Előrevert pallózás'], c: 0, e: 'Előbb teljes mélységig kiemelnek, utána állítják be a pallókat, hevedereket és dúcokat.' },
  { q: 'Durvaszemcsés talajban, ahol látszólagos kohézió sincs (m₀ = 0), melyik módszer alkalmazható?', a: ['Előrevert pallózás – kizárólag acélpallókkal', 'Állított pallózás fapallókkal', 'Hézagos pallózás', 'Vízszintes pallózás, lépcsős mélyítés'], c: 0, e: 'A pallókat a kiemelés előtt leverik, levibrálják; a földfal egy pillanatig sem áll szabadon.' },
  { q: 'A jegyzet szerint finomhomokban milyen mélység felett kell mindenképpen dúcolni?', a: ['H > 0,5 m', 'H > 1,0 m', 'H > 2,0 m', 'H > 1,25 m'], c: 0, e: 'Finomhomok 0,5 m, átmeneti talaj 1,0 m, kemény agyag 2,0 m – a kiszáradás, átázás miatt munkavédelmi okból.' },
  { q: 'Mi a heveder szerepe a dúcolatban?', a: ['Összefogja a pallókat, és a rájuk jutó terhet a dúcoknak adja át', 'Nyomott elemként szembetámasztja a két földfalat', 'A pallók végét védi a hasadástól', 'A talajvizet vezeti el a pallók mögül'], c: 0, e: 'Palló → heveder → dúc → szemközti oldal: ez a szembetámasz teherútja.' },
  { q: 'Közepesen és erősen kötött talajnál mekkora dúcnyomással számolunk?', a: ['p₁ = (Hγn + q) − 4c és p₂ = 0,2·(Hγn + q) közül a nagyobbal', 'p = K·(Hγn + q)·tg²(45° − φ/2)-vel', 'Mindig 10 kPa-lal', 'A passzív földnyomással'], c: 0, e: 'A K·tg² képlet a szemcsés és gyengén kötött (Ip < 10%) talajokra vonatkozik.' },
  { q: 'Hogyan bontják el a dúcolatot?', a: ['Alulról felfelé, a rétegenkénti visszatöltéssel lépést tartva', 'Felülről lefelé, hogy a munkások kiférjenek', 'Egyszerre, daruval kiemelve', 'Előbb a pallókat húzzák ki, aztán a dúcokat'], c: 0, e: 'Egy dúc csak akkor jöhet ki, ha alatta már tömörített visszatöltés támaszt.' },
  { q: 'Táblás dúcolat ásással együtt süllyesztésekor legfeljebb mennyivel áshatnak a tábla éle alá?', a: ['0,5 m-rel', '1,25 m-rel', '2,0 m-rel', 'Bármennyivel, ha a talaj kötött'], c: 0, e: 'Utána a kotró a kanala hátával, sarokról sarokra nyomja le a dobozt (a dúcok dőlése legfeljebb 1:20).' },
]);
defineQuiz('szeles', 'Kvíz – széles munkagödör', [
  { q: 'Miért nehéz kb. 3 m-nél szélesebb gödröt vízszintes dúcokkal kitámasztani?', a: ['A hosszú, karcsú dúc kihajlik', 'Mert a földnyomás a szélességgel arányosan nő', 'Mert a heveder elszakad', 'Mert nem fér el a kotró'], c: 0, e: 'A kritikus erő a dúchossz négyzetével csökken (N_cr ∝ 1/L²).' },
  { q: 'Ha a dúc hossza kétszeresére nő, a kritikus (Euler-) erő…', a: ['a negyedére csökken', 'a felére csökken', 'nem változik', 'kétszeresére nő'], c: 0, e: 'N_cr = π²EI/L² – ezért kell közbenső merevítés vagy nagyobb keresztmetszet.' },
  { q: 'Mit kell külön ellenőrizni ferde dúcoknál?', a: ['A függőleges egyensúlyt: a dúc kifordulhat, ezért kellően laposnak kell lennie', 'Csak a dúc szakítószilárdságát', 'A dúc hőtágulását', 'Semmit, a ferde dúc mindig stabil'], c: 0, e: 'A ferde dúc erejének függőleges összetevője a falat emeli, a talppontot lefelé nyomja.' },
  { q: 'Mikor bontható el a széles gödör dúcolata?', a: ['Ha a pincefalak és födémek elkészültek, és tárcsaként felveszik a földnyomást', 'Rögtön az alaplemez betonozása után', 'A földkiemelés befejezésekor', 'Amikor a talajvízszint visszaáll'], c: 0, e: 'Addig az ideiglenes megtámasztás viseli a földnyomást.' },
  { q: 'Passzív hátrahorgonyzásnál mihez kötik a falat?', a: ['A szakadólapon kívül levert I- vagy U-tartókhoz, a felszín alatt 0,8–1,0 m-re futó acélrudakkal', 'A gödör aljára épített ellentámasz-tömbhöz', 'A szemközti falhoz, csőtámasszal', 'Injektált, feszített talajhorgonyokkal'], c: 0, e: 'A horgonyrudak egy keskeny árokban futnak; ehhez hely kell a gödör mellett.' },
]);
