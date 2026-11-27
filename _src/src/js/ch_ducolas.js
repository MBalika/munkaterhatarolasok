// 02 Munkaárok dúcolása + 03 Széles munkagödör dúcolása – widgetek és kvízek
import { register, shell, slider, seg, toggle, select, stat, verdict, svg, figure, clear, h, fmt, clamp, lerp, pathD, rad, onTheme } from './core.js';
import { defineQuiz } from './ui.js';
import { EN } from './core.js';
import { K, MS, stage, autoRedraw, timber, logH, prop, depthBar, heap } from './scene.js';
const SOILK = { soilE: 'hard', soilB: 'clay', soilC: 'silt', soilA: 'sand', soilD: 'gravel' };

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
  const s = figure(viz, 600, 380, 'fig pr-svg');
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
    clear(s); K.defs();
    { const cw = s.getBoundingClientRect().width; s.dataset.fk = cw > 0 ? Math.max(1, Math.min(1.6, (9.5 * 600) / (11.5 * cw))).toFixed(2) : 1; }
    const defs = svg('defs', {}, s);
    defs.innerHTML = '<filter id="dcGlow" x="-20%" y="-20%" width="140%" height="140%"><feDropShadow dx="0" dy="0" stdDeviation="2.2" flood-color="#f0a33a" flood-opacity=".95"/></filter>';
    const fa = mat.v === 'fa';
    const L = 5, Hd = 3.0, dzW = 1.1 * e, dzK = 1.6 * e, dzS = 2.3 * e;
    // talaj: terep sáv + földfal
    const gs = svg('g', {}, s);
    poly(gs, [P(-0.2, 0, -1.2), P(L + 0.2, 0, -1.2), P(L + 0.2, 0, 0), P(-0.2, 0, 0)], ST(K.v('top'), K.v('ground'), 0.8));
    poly(gs, [P(-0.2, 0, -1.2), P(L + 0.2, 0, -1.2), P(L + 0.2, 0, 0), P(-0.2, 0, 0)], ST('url(#pr-p-grass)', 'none', 0, 'opacity:.9'));
    const wall = [P(-0.2, 0, 0), P(L + 0.2, 0, 0), P(L + 0.2, -Hd - 0.25, 0), P(-0.2, -Hd - 0.25, 0)];
    poly(gs, wall, ST(K.v('clay'), K.v('ground'), 0.8)); poly(gs, wall, ST('url(#pr-p-clay)', 'none'));
    // árokfenék
    poly(gs, [P(-0.2, -Hd - 0.25, 0), P(L + 0.2, -Hd - 0.25, 0), P(L + 0.2, -Hd - 0.25, 1.9), P(-0.2, -Hd - 0.25, 1.9)], ST(K.v('clay2'), K.v('ground'), 0.6));
    poly(gs, [P(-0.2, -Hd - 0.25, 0), P(L + 0.2, -Hd - 0.25, 0), P(L + 0.2, -Hd - 0.25, 1.9), P(-0.2, -Hd - 0.25, 1.9)], ST('url(#pr-p-clay)', 'none', 0, 'opacity:.7'));
    // pallók
    const gp = grp('pallo');
    if (fa) {
      const w = 0.2;
      for (let i = 0; i < L / w; i++) {
        if (hez.v && i % 2 === 1) continue;
        box(gp, i * w + 0.004, (i + 1) * w - 0.004, -Hd, 0.2, 0, 0.048, K.v('timber'));
      }
    } else {
      const w = 0.33;
      for (let i = 0; i < Math.floor(L / w); i++) {
        if (hez.v && i % 2 === 1) continue;
        const fr = box(gp, i * w + 0.006, (i + 1) * w - 0.006, -Hd, 0.2, 0, 0.05, K.v('steel2'));
        for (const f of [0.3, 0.7]) { const a = P(i * w + f * w, -Hd, 0.05), b = P(i * w + f * w, 0.2, 0.05); svg('line', { x1: a[0], y1: a[1], x2: b[0], y2: b[1], style: 'stroke:rgba(0,0,0,.35);stroke-width:1' }, gp); }
        if (i % 2 === 0) { const a = P(i * w + 0.5 * w, 0.2, 0.05); svg('circle', { cx: a[0], cy: a[1] + 4, r: 1.6, style: 'fill:rgba(0,0,0,.4)' }, gp); }
      }
    }
    // hevederek
    const levels = [-0.6, -2.35];
    const gw = grp('heveder');
    for (const y of levels) {
      if (fa) box(gw, -0.05, L + 0.05, y - 0.08, y + 0.08, 0.05 + dzW, 0.21 + dzW, K.v('timber2'));
      else {
        box(gw, -0.05, L + 0.05, y - 0.1, y + 0.1, 0.05 + dzW, 0.25 + dzW, K.v('steel3'));
        for (const yy of [y - 0.07, y + 0.07]) { const a = P(-0.05, yy, 0.25 + dzW), b = P(L + 0.05, yy, 0.25 + dzW); svg('line', { x1: a[0], y1: a[1], x2: b[0], y2: b[1], style: 'stroke:rgba(255,255,255,.35);stroke-width:1' }, gw); }
      }
    }
    // ékek / dúcolófejek
    const xs = [0.85, 2.5, 4.15];
    const zw1 = (fa ? 0.21 : 0.25) + dzW;
    if (fa) {
      const gk = grp('ek');
      for (const y of levels) for (const x of xs) {
        box(gk, x - 0.11, x - 0.05, y - 0.07, y + 0.07, zw1 + dzK - dzW, zw1 + dzK - dzW + 0.07, K.v('timber2'));
        box(gk, x + 0.05, x + 0.11, y - 0.07, y + 0.07, zw1 + dzK - dzW, zw1 + dzK - dzW + 0.07, K.v('timber2'));
      }
    } else {
      const gk = grp('fej');
      for (const y of levels) for (const x of xs) box(gk, x - 0.1, x + 0.1, y - 0.1, y + 0.1, zw1 + dzK - dzW, zw1 + dzK - dzW + 0.03, K.v('steel3'));
    }
    // dúcok
    const gd = grp('duc');
    const z0 = zw1 + (fa ? 0.07 : 0.03) + (dzS - dzW), z1 = 1.75 + dzS;
    for (const y of levels) for (const x of xs) {
      if (fa) cyl(gd, x, y, z0, z1, 0.07, K.v('timber'), { rings: true });
      else {
        cyl(gd, x, y, z0, z0 + 0.25, 0.035, K.v('acc'));
        cyl(gd, x, y, z0 + 0.25, z1 - 0.25, 0.05, K.v('steel2'));
        cyl(gd, x, y, z1 - 0.25, z1, 0.035, K.v('acc'));
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
        arr(gl, a[0], a[1], b[0], b[1], K.v('push'), 2, 7);
      }
      for (const y of levels) for (const x of xs) {
        const a = P(x, y, z0 + 0.1), b = P(x, y, z1 + 0.35);
        svg('line', { x1: a[0], y1: a[1], x2: b[0], y2: b[1], class: 'flow', style: `stroke:${K.v('acc')};stroke-width:3;stroke-linecap:round` }, gl);
        arr(gl, b[0] + 8, b[1] - 5, b[0] - 10, b[1] + 6, K.v('acc'), 2.5, 8);
      }
      const t1 = P(0, -0.3, 0);
      K.CUR.W = 600; K.tag(gl, t1[0] - 14, t1[1] + 22, 'földnyomás →', { anchor: 'end', fs: 10.5 });
      const t2 = P(xs[0], levels[1], z1 + 0.5);
      K.tag(gl, t2[0] + 30, t2[1] + 30, '↙ a szemközti fal felé', { fs: 10.5 });
    }
    // munkás az árokfenéken (a lépték kedvéért) – szétszedett nézetben eltűnik
    if (e < 0.5) { const mp = P(3.32, -Hd - 0.25, 1.45); K.man(svg('g', { style: `opacity:${(1 - e * 2).toFixed(2)};pointer-events:none` }, s), { x: mp[0], GY: mp[1], S: S * 0.94, face: -1 }); }
    // feliratok: hátlapos címkék vezetővonallal
    const gl2 = svg('g', { style: 'pointer-events:none' }, s);
    K.CUR.W = 600;
    const fk = +(s.dataset.fk || 1);
    const lab = (k, x, y, z, t, dx = 0, dy = 0, anchor = 'start') => { if (sel && sel !== k) return; const p = P(x, y, z); K.tag(gl2, p[0] + dx, p[1] + dy, t, { fs: 11 * fk, anchor, to: [p[0], p[1]] }); };
    lab('pallo', L - 0.1, 0.12, 0.05, fa ? 'palló' : 'csatornapalló', 24, -22);
    lab('heveder', L + 0.02, levels[0], zw1, EN ? 'wale' : 'heveder', 26, 8);
    lab('duc', xs[2], levels[1], z1 - 0.1, fa ? 'dúc' : 'csavaros acéldúc', 30, 40);
    if (fa) lab('ek', xs[2] + 0.08, levels[0] + 0.02, zw1 + dzK - dzW + 0.04, 'ék', 34, -30);
    if (fa && !sel) lab('kapocs', xs[0] + 0.02, levels[0] + 0.1, zw1 + 0.1, 'ácskapocs', -40, -34, 'end');
    const pw = P(L + 0.2, -1.6, 0); K.tag(gl2, pw[0] + 16, pw[1] + 40, 'földfal', { fs: 10 * fk, to: [pw[0] - 4, pw[1] + 26] });
    const pt = P(-0.2, 0, 0); K.tag(gl2, pt[0] - 8, pt[1] - 14, '±0,00 terep', { fs: 10 * fk, anchor: 'end', to: [pt[0] + 6, pt[1] - 4] });
    K.tag(gl2, 592, 366 - 6 * fk, 'a szemközti oldal levágva', { fs: 10 * fk, anchor: 'end' });
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
  buildParts(); draw(); autoRedraw(s, draw);
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
  const sn = slider(ctrls, { label: 'Biztonsági tényező', sym: 'n', min: 1.5, max: 3, step: 0.1, value: 2, hint: 'Általában 1,5–2, esetenként 2–3.' });
  const sp = slider(ctrls, { label: 'Felszíni terhelés', sym: 'p', min: 0, max: 30, step: 1, value: 10, unit: 'kPa', hint: 'Pl. a peremen tárolt föld, forgalom; a méretezésben jellemzően min. 10 kPa.' });
  const sH = slider(ctrls, { label: 'Tervezett árokmélység', sym: 'H', min: 0.5, max: 6, step: 0.1, value: 2.5, unit: 'm' });
  const lim = select(ctrls, { label: 'Talaj a dúcolási kötelezettséghez', options: [{ v: '0.5', t: 'finomhomok – H > 0,5 m' }, { v: '1', t: 'átmeneti talaj – H > 1,0 m' }, { v: '2', t: 'kemény agyag – H > 2,0 m' }], value: '1' });
  const fig = figure(viz, 600, 384, 'fig pr-svg');
  const chart = figure(viz, 560, 150);
  const oM = stat(out, { label: 'm₀ – szabadon megálló mélység', unit: 'm', d: 2 });
  const oMode = stat(out, { label: 'Pallózási mód' });
  oMode.el.classList.add('dc-modestat');
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
    ver.set(H > m ? (m <= 0 ? 'bad' : 'warn') : 'ok', md.t, `<span>${md.why}</span>` + (H > L ? ` <span>Munkavédelmi okból mindenképp dúcolni kell (H = ${fmt(H, 1)} m > ${fmt(L, 1)} m): a kiemelt földfal kiszárad, átázik, az állapota romlik.</span>` : ` <span>A dúcolási határ alatt vagyunk (${fmt(L, 1)} m) – de dinamikus hatás (forgalom, cölöpözés) vagy épület közelében ilyenkor is dúcolni kell.</span>`));
    drawFig(m, H, th, p);
    drawChart(c, phi, g, n, p, H);
  }
  function drawFig(m, H, th, p) {
    // 1 m legfeljebb 62 px: az árok, a megcsúszó ék és a peremen tárolt föld (felszíni teher) léptékben
    const GY = 126, maxD = Math.max(H, Math.min(m, 7), 1) * 1.16, Sy = Math.min(228 / maxD, 62);
    const xl = 204, xr = xl + clamp(1.5 * Sy, 46, 92), y = (d) => GY + d * Sy;
    const sk = SOILK[soil];
    const S = stage(fig, { W: 600, H: 384, GY, layers: [{ k: sk, y: GY }, { k: sk === 'sand' ? 'gravel' : 'clay2', y: Math.max(y(maxD) + 14, GY + 150) }] });
    const { g, ov } = S, M = S.M;
    K.pit(g, M, xl, xr, y(H));
    // megcsúszó ék a jobb oldalon
    const bad = H > m, col = bad ? 'mark' : 'ok';
    const xw = xr + (H * Sy) / Math.tan(th), cut = xw > 600;
    S.press([[xr, GY], [xr, y(H)], cut ? [600, y(H) - (600 - xr) * Math.tan(th)] : [xw, GY], ...(cut ? [[600, GY]] : [])], col, 0.2);
    K.Ln(ov, xr, y(H), Math.min(xw, 600), cut ? y(H) - (600 - xr) * Math.tan(th) : GY, K.SK(col, 2, 'stroke-dasharray:7 5'));
    S.txt(Math.min(xr + (xw - xr) * 0.5, 500) + 8, y(H * 0.5) + 14, `${fmt(45 + sphi.v / 2, 0)}°`, { b: true, c: col });
    // felszíni teher: a peremen tárolt föld
    if (p > 0) {
      const hw = clamp(p * 7, 90, 200), hx = xr + 26;
      heap(g, M, hx, hw, clamp((p / 18) * Sy, 9, GY - 44), sk === 'sand' ? 'sand' : 'clay');
      for (let x = hx + 12; x <= hx + hw - 8; x += 24) S.force(x, GY - 2, x, GY + 15, { c: 'labline', w: 1.6, s: 6 });
      S.tag(hx + hw + 8, GY - 20, `p = ${fmt(p, 0)} kPa`, { fs: 10.5 });
    }
    // m₀ a bal falon: zöld = szabadon megáll, piros = megtámasztás kell
    const mm = Math.min(m, H);
    if (mm > 0) depthBar(ov, xl - 9, GY + 2, y(mm) - 2, 'ok');
    if (H > m) depthBar(ov, xl - 9, y(Math.max(m, 0)) + 2, y(H) - 2, 'mark');
    if (m > 0 && m < maxD) {
      K.Ln(ov, xl - 24, y(m), xr + 4, y(m), K.SK('labline', 1.2, 'stroke-dasharray:4 4'));
      S.txt(xl - 28, y(m) + 4, [`m₀ = ${fmt(m, 2)} m`], { anchor: 'end', b: true });
    } else if (m >= maxD) S.txt(xl - 28, y(maxD * 0.92), `m₀ = ${fmt(m, 2)} m ↓`, { anchor: 'end', b: true });
    else S.txt(xl - 28, GY + 18, 'm₀ = 0', { anchor: 'end', b: true, c: 'mark' });
    // a munkás a léptéket adja (ha az árok elég mély, lent áll)
    if (H * Sy > 1.9 * Sy * 0.55) K.man(g, { x: (xl + xr) / 2 - 2, GY: y(H), S: Sy, face: 1 });
    K.man(g, { x: 92, GY, S: Sy, face: 1 });
    S.dimV(xr + 12, GY, y(H), `H = ${fmt(H, 1)} m`, { ly: y(H) - 6 });
    S.tag(8, 372 - 8 * S.fk, 'zöld: szabadon megáll · piros: megtámasztás kell', { fs: 10 });
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
  autoRedraw(fig, upd);
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
  const FW = 620, FH = 424, GY = 152, S = 70, xl = 254, xr = 366, H = 3.0;
  const fig = figure(viz, FW, FH, 'fig pr-svg');
  const stepBox = h('div', {});
  viz.append(stepBox);
  const y = (d) => GY + d * S;
  const GEN = [V('steel'), V('accent'), V('ok'), V('g3'), V('g4')];
  const k01 = (s, a, b = a + 1) => clamp((s - a) / (b - a), 0, 1);
  const win = (s, a, b, f = 0.12) => Math.min(k01(s, a, a + f), 1 - k01(s, b - f, b));   // 0→1→0 az [a, b] szakaszon
  let St, g;
  /** háttér + kiemelt árok; e: kiemelési mélység (m) */
  function base(m, e) {
    const sk = SOILK[PALL[m].soil];
    St = stage(fig, { W: FW, H: FH, GY, layers: [{ k: 'fill', y: GY }, { k: sk, y: GY + 14 }, { k: sk === 'sand' ? 'gravel' : 'clay2', y: y(H) + 30 }] });
    g = St.g;
    if (e > 0.005) K.pit(g, St.M, xl, xr, y(e));
    return sk;
  }
  const grp = (o) => K.g_(g, o < 1 ? { style: `opacity:${Math.max(0, o).toFixed(2)}` } : {});
  const plankV = (top, bot, steel, o = 1, side = 0) => {
    if (o <= 0) return;
    const gg = grp(o);
    for (const d of [1, -1]) {
      if (side && side !== d) continue;
      if (steel) K.plankS(gg, d > 0 ? xl : xr, y(top), y(bot), d, { t: 5 });
      else timber(gg, d > 0 ? xl : xr - 6, y(top), 6, y(bot) - y(top));
    }
  };
  const walerH = (d, o = 1, steel = false) => {
    if (o <= 0) return;
    const gg = grp(o);
    if (steel) { K.waleS(gg, xl + 5, y(d), 1, { w: 9, h: 13 }); K.waleS(gg, xr - 5, y(d), -1, { w: 9, h: 13 }); }
    else { timber(gg, xl + 6, y(d) - 6.5, 13, 13, { end: true, col: 'timber' }); timber(gg, xr - 19, y(d) - 6.5, 13, 13, { end: true, col: 'timber' }); }
  };
  const strut = (d, o = 1, inset = 19, loose = false, steel = false) => {
    if (o <= 0) return;
    if (steel) prop(g, xl + 14, xr - 14, y(d), 4, { op: o }); else logH(g, xl + inset, xr - inset, y(d), 4.6, { loose, op: o });
  };
  const post = (d, floor, o) => { if (o <= 0) return; for (const x of [xl + 8, xr - 17]) timber(g, x, y(d) + 6.5, 9, y(floor) - y(d) - 6.5, { op: o, col: 'timber' }); };
  const walerV = (d0, d1, gen, o, dx = 0) => { if (o <= 0) return; const gg = grp(o); for (const x of [xl + 6 + dx, xr - 15 - dx]) { K.R(gg, x, y(d0), 9, y(d1) - y(d0), `fill:${GEN[gen % 5]};stroke:${K.v('dark2')};stroke-width:.7`, { rx: 1 }); K.Ln(gg, x + 3, y(d0) + 2, x + 3, y(d1) - 2, K.SK('halo', 0.9, 'opacity:.3')); } };
  const plankHzone = (d0, d1, o) => { if (o <= 0) return; const gg = grp(o); for (let d = d0; d < d1 - 0.01; d += 0.2) { timber(gg, xl, y(d) + 0.5, 6, 0.2 * S - 1, { end: true }); timber(gg, xr - 6, y(d) + 0.5, 6, 0.2 * S - 1, { end: true }); } };
  const pipe = (o) => {
    if (o <= 0) return;
    const gg = grp(o), cx = (xl + xr) / 2;
    K.R(gg, xl + 7, y(H) - 9, xr - xl - 14, 9, K.F('sand2')); K.R(gg, xl + 7, y(H) - 9, xr - xl - 14, 9, 'fill:url(#pr-p-sand)');
    K.conduit(gg, cx, y(H) - 30, 23);
  };
  const m0mark = (m) => {
    if (m <= 0) { St.txt(xl - 22, GY + 20, 'm₀ = 0', { anchor: 'end', b: true, c: 'mark' }); return; }
    const d = Math.min(m, H + 0.4);
    depthBar(St.ov, xl - 12, GY + 2, y(d) - 2, 'ok');
    St.txt(xl - 22, y(d) - 4, `m₀ ≈ ${fmt(m, 1)} m`, { anchor: 'end', b: true });
  };
  const hmark = () => St.dimV(xl - 112, GY, y(H), 'H = 3,0 m', { side: -1 });
  const labels = (ks) => {
    const L = { pallo: ['palló', GY + 24, [xr - 3, GY + 22]], heveder: [EN ? 'wale' : 'heveder', y(0.45) + 30, [xr - 12, y(0.45)]], duc: ['dúc', y(2.35) - 22, [xr - 40, y(2.35)]] };
    for (const k of ks) { const [t, yy, to] = L[k]; St.tag(xr + 34, yy, t, { to }); }
  };
  /** a felszínen álló kotró kanala az árokban (a gép teste jobbra, részben a képen kívül) */
  const digger = (e, o, soilK) => {
    if (o <= 0.01) return;
    const sc = (0.9 * S) / MS, cx = (xl + xr) / 2 + 7, gg = K.scl(grp(o), sc, cx, GY);
    K.excavator(gg, St.M, cx, GY + (y(e) - GY - 3) / sc, { tool: 'dig', reach: 48, lift: 30, soil: soilK });
  };
  /** munkás a felszínen (irányít) és – ha van hely – az árokban */
  const crew = (inTrench, e, o = 1) => {
    K.man(g, { x: xl - 82, GY, S, face: 1 });
    if (inTrench && o > 0.01) K.man(grp(o), { x: (xl + xr) / 2 + 12, GY: y(e), S, face: -1, hands: [[xl + 30, y(e) - 0.95 * S], [xl + 26, y(e) - 1.12 * S]] });
  };

  const DRAW = {
    a(s) {
      const e = H * k01(s, 0, 1), sk = base('a', e);
      const bf = s > 5 ? H * (1 - k01(s, 5, 6)) : undefined;
      digger(e, win(s, 0.02, 1.0), sk);
      crew(s > 1.15 && s < 4.9, e, win(s, 1.15, 4.9));
      pipe(k01(s, 4, 4.6));
      if (bf !== undefined && bf < H) K.backfill(g, xl, xr, y(bf), y(H));
      const kp = k01(s, 1, 2); const fade = bf !== undefined ? clamp(bf / 0.4, 0, 1) : 1;
      plankV(-0.2 - (1 - kp) * 1.2, H - (1 - kp) * 1.2, false, kp * fade);
      const lv = [0.45, 2.35];
      const vis = (d) => (bf === undefined ? 1 : clamp((bf - (d - 0.2)) / 0.2, 0, 1));
      for (const d of lv) { walerH(d, k01(s, 2, 2.6) * vis(d)); strut(d, k01(s, 3, 3.6) * vis(d)); }
      m0mark(PALL.a.m0); hmark(); if (s > 3.5 && s < 5) labels(['pallo', 'heveder', 'duc']);
    },
    b(s) {
      const e = s < 1 ? k01(s, 0, 1) : s < 2 ? 1 : s < 3 ? 1 + k01(s, 2, 3) : s < 4 ? 2 : s < 5 ? 2 + k01(s, 4, 5) : 3;
      const sk = base('b', e);
      const off = s < 3 ? 0 : s < 4 ? k01(s, 3.3, 3.8) : s < 5 ? 1 : s < 6 ? 1 + k01(s, 5.3, 5.8) : 2;
      const kp = k01(s, 1, 1.5);
      digger(e, Math.max(win(s, 0.02, 1.0), win(s, 2.02, 3.0), win(s, 4.02, 5.0)), sk);
      crew(false, e);
      pipe(k01(s, 6, 6.6));
      plankV(-2.2 + off, 1.0 + off, false, kp);
      if (s > 3.3 && s < 3.8 || s > 5.3 && s < 5.8) { for (const x of [xl + 3, xr - 3]) St.force(x, y(-2.2 + off) - 30, x, y(-2.2 + off) - 3, { c: 'mark', w: 2.6 }); St.tag(xr + 16, y(-2.2 + off) - 14, 'utánhajtás'); }
      const rows = [[0.45, 1.5], [1.5, 3.65], [2.5, 5.65]];
      rows.forEach(([d, t0], i) => { const o = k01(s, t0, t0 + 0.15); walerH(d, o); const loose = (s > 3 && s < 3.65 && i === 0) || (s > 5 && s < 5.65 && i <= 1); strut(d, k01(s, t0 + 0.1, t0 + 0.3), 19, loose); });
      // ideiglenes alátámasztás
      const po1 = s > 3 && s < 4 ? Math.min(k01(s, 3, 3.2), 1 - k01(s, 3.7, 3.85)) : 0;
      const po2 = s > 5 && s < 6 ? Math.min(k01(s, 5, 5.2), 1 - k01(s, 5.7, 5.85)) : 0;
      post(0.45, 2.0, po1); post(1.5, 3.0, po2); post(0.45, 1.5, po2);
      if (po1 > 0.5 || po2 > 0.5) St.tag(xr + 30, y(e) - 26, 'ideiglenes alátámasztás', { to: [xr - 13, y(e) - 20] });
      m0mark(PALL.b.m0); hmark();
    },
    c(s) {
      const m = 0.6;
      const k = Math.min(5, Math.floor(s) + 1), t = s - (k - 1);
      const e = s >= 5 ? H : m * (k - 1) + m * k01(t, 0, 0.35);
      const sk = base('c', e);
      if (s < 5) digger(e, win(t, 0.0, 0.36, 0.06), sk);
      crew(false, e);
      pipe(k01(s, 5, 5.6));
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
        for (let q = 0; q < nS; q++) { const d = 0.15 + (q * (Dj - 0.35)) / (nS - 1); strut(d, o, 16 + dx); }
      }
      m0mark(m); hmark();
      const ly = FH - 16;
      St.txt(444, ly, 'hevedergenerációk:', { anchor: 'end', fs: 10.5 });
      for (let j = 0; j < 5; j++) { K.R(St.top, 452 + j * 32, ly - 9, 10, 10, `fill:${GEN[j]};stroke:${K.v('dark2')};stroke-width:.6`, { rx: 1.5 }); St.txt(465 + j * 32, ly, `${j + 1}.`, { fs: 10.5 }); }
    },
    d(s) {
      const e = s < 1 ? 0 : s < 2 ? k01(s, 1, 2) : s < 3 ? 1 : s < 4 ? 1 + k01(s, 3, 3.5) : s < 5 ? 2 + k01(s, 4, 4.5) : 3;
      const sk = base('d', e);
      digger(e, Math.max(win(s, 1.02, 2.0), win(s, 3.02, 3.52, 0.08), win(s, 4.02, 4.52, 0.08)), sk);
      crew(false, e);
      pipe(k01(s, 5, 5.6));
      // a két palló egymás után: darun függő vibrátor fogja a palló fejét
      const tops = [lerp(-2.1, -0.2, k01(s, 0.04, 0.5)), lerp(-2.1, -0.2, k01(s, 0.54, 0.98))];
      plankV(tops[0], tops[0] + 3.6, true, 1, 1); plankV(tops[1], tops[1] + 3.6, true, 1, -1);
      if (s < 1) {
        const i = s < 0.5 ? 0 : 1, cx = i ? xr - 2.5 : xl + 2.5, yt = y(tops[i]) + 9;
        const u = K.vibroUnit(g, cx, yt, s * 260, { w: 34, hb: 26, half: 3 });
        K.Ln(g, cx, u.top, cx, -4, K.SK('dark', 1.6));
        if (yt > 70) St.tag(cx + (i ? 30 : -30), Math.max(18, u.top - 4), 'vibrátor, darun függesztve', { anchor: i ? 'start' : 'end', to: [cx + (i ? 17 : -17), u.mid] });
      }
      const rows = [[0.5, 2], [1.5, 3.55], [2.5, 4.55]];
      for (const [d, t0] of rows) { walerH(d, k01(s, t0, t0 + 0.3), true); strut(d, k01(s, t0 + 0.15, t0 + 0.45), 19, false, true); }
      if (s > 5) St.dimV(xr + 16, y(H), y(3.4), '≥ 30 cm a talajban', { c: 'ok', tc: 'ok' });
      m0mark(0); hmark();
    },
  };
  let cur = 'a';
  const stp = stepper(stepBox, { n: PALL.a.n, texts: PALL.a.texts, intro: 'Indítsd el a lejátszást, vagy lépj végig a folyamaton lépésenként.', draw: (s) => DRAW[cur](s) });
  const setMode = (m) => { cur = m; cond.innerHTML = PALL[m].cond; stp.reset(PALL[m].n, PALL[m].texts); };
  mode.on(setMode);
  onTheme(() => stp.redraw());
  autoRedraw(fig, () => stp.redraw());
  setMode('a');
});

/* ================================================================ 4. Dúcnyomás és egyszerű statika */
register('duc-nyomas', (root) => {
  const { ctrls, viz, out } = shell(root, { foot: '<b>Szemléltető, egyszerűsített ellenőrzés:</b> egyenletes dúcnyomás, egyenlő tehermezők, kéttámaszú tartók; fa elemek: 48 mm-es palló, 16/16-os heveder, Ø12 gömbfa dúc (E ≈ 10 GPa). Színezés: σ ≤ 14 MPa zöld, ≤ 18 MPa sárga (C24-es fenyő hajlítószilárdságának tervezési értéke nagyságrendileg 15–17 MPa); dúcnál N ≤ 0,8·N<sub>Rd</sub> zöld. A határok tájékoztató jellegűek – a tényleges méretezés a vonatkozó szabványok szerint történik.' });
  const kind = seg(ctrls, { label: 'Talaj', options: [{ v: 'sz', t: 'Szemcsés / gyengén kötött' }, { v: 'k', t: 'Közepesen / erősen kötött' }], value: 'sz' });
  const sH = slider(ctrls, { label: 'Árokmélység', sym: 'H', min: 1, max: 6, step: 0.1, value: 3, unit: 'm' });
  const sg = slider(ctrls, { label: 'Nedves térfogatsúly', sym: 'γn', min: 16, max: 22, step: 0.1, value: 19, unit: 'kN/m³' });
  const sq = slider(ctrls, { label: 'Felszíni teher', sym: 'q', min: 0, max: 30, step: 1, value: 10, unit: 'kPa' });
  const sphi = slider(ctrls, { label: 'Belső súrlódási szög', sym: 'φ', min: 20, max: 40, step: 1, value: 30, unit: '°' });
  const sw = slider(ctrls, { label: 'Víztartalom', sym: 'w', min: 0, max: 30, step: 1, value: 12, unit: '%' });
  const sc = slider(ctrls, { label: 'Kohézió', sym: 'c', min: 0, max: 60, step: 1, value: 15, unit: 'kPa' });
  const sa = slider(ctrls, { label: 'Dúcok vízszintes távolsága', sym: 'a', min: 1, max: 3, step: 0.1, value: 1.6, unit: 'm' });
  const nr = seg(ctrls, { label: 'Dúcsorok száma', options: [{ v: 2, t: '2' }, { v: 3, t: '3' }, { v: 4, t: '4' }], value: 2 });
  const sB = slider(ctrls, { label: 'Árokszélesség (dúchossz)', sym: 'B', min: 0.8, max: 3, step: 0.1, value: 1.2, unit: 'm' });
  const fig = figure(viz, 600, 372, 'fig pr-svg');
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
    oPal.set(sigP, sigP <= 14 ? 'ok' : sigP <= 18 ? 'warn' : 'bad');
    oHev.set(sigH, sigH <= 14 ? 'ok' : sigH <= 18 ? 'warn' : 'bad');
    oDuc.set(ut, ut <= 80 ? 'ok' : ut <= 100 ? 'warn' : 'bad');
    info.innerHTML = `<div>${line}</div><div>Dúcerő: N = p · (H/n) · a = ${fmt(p, 1)} · ${fmt(hv, 2)} · ${fmt(a, 1)} = <b>${fmt(N, 0)} kN</b> &nbsp;·&nbsp; Palló: M = p·(H/n)²/8 = ${fmt(Mp, 2)} kNm/m &nbsp;·&nbsp; Heveder: M = p·(H/n)·a²/8 = ${fmt(Mh, 2)} kNm &nbsp;·&nbsp; Dúc: N<sub>Rd</sub> ≈ min(A·f<sub>c</sub>; N<sub>cr</sub>/3) = ${fmt(NRd, 0)} kN</div>`;
    drawFig(p, H, n, N);
    drawPlan(wv, a, Mh);
  }
  function drawFig(p, H, n, N) {
    const GY = 98, S = Math.min(46, 240 / H), B = sB.v, xl = 196, xr = xl + clamp(B * S, 44, 138), y = (d) => GY + d * S;
    const sk = kind.v === 'sz' ? 'sand' : 'clay';
    const St = stage(fig, { W: 600, H: 372, GY, layers: [{ k: 'fill', y: GY }, { k: sk, y: GY + 12 }, { k: sk === 'sand' ? 'gravel' : 'clay2', y: Math.max(y(H) + 22, GY + 170) }] });
    const { g } = St;
    K.pit(g, St.M, xl, xr, y(H));
    K.man(g, { x: 70, GY, S, face: 1 });
    // pallók
    timber(g, xl, GY - 8, 6, y(H) - GY + 8); timber(g, xr - 6, GY - 8, 6, y(H) - GY + 8);
    // nyomásábra a jobb oldalon (a talaj felől)
    const pw = clamp(p * 3.0, 10, 600 - xr - 150);
    St.press([[xr, GY], [xr + pw, GY], [xr + pw, y(H)], [xr, y(H)]], 'push', 0.16);
    for (let k = 0; k <= 6; k++) { const yy = GY + ((y(H) - GY) * (k + 0.5)) / 7; St.force(xr + pw, yy, xr + 5, yy, { c: 'push', w: 1.7, s: 6.5 }); }
    St.txt(xr + pw + 8, GY + 18, `p = ${fmt(p, 1)} kPa`, { b: true, c: 'push' });
    St.txt(xr + pw + 8, GY + 18 + 15 * St.fk, 'egyenletes helyettesítő teher', { fs: 10.5 });
    if (sq.v > 0) { for (let x = xr + 14; x < xr + 110; x += 20) St.force(x, GY - 24, x, GY - 3, { c: 'labline', w: 1.5, s: 6 }); St.txt(xr + 118, GY - 12, `q = ${fmt(sq.v, 0)} kPa`, { fs: 10.5, b: true }); }
    // dúcsorok
    for (let i = 0; i < n; i++) {
      const d = (i + 0.5) * (H / n);
      timber(g, xl + 6, y(d) - 6.5, 13, 13, { end: true }); timber(g, xr - 19, y(d) - 6.5, 13, 13, { end: true });
      logH(g, xl + 19, xr - 19, y(d), 4.4);
      if (i < n - 1) K.Ln(St.ov, xl - 20, y((i + 1) * (H / n)), xl - 6, y((i + 1) * (H / n)), K.SK('labline', 1));
    }
    St.txt(xl - 26, y(H / n / 2) + 22 * St.fk, `N = ${fmt(N, 0)} kN`, { anchor: 'end', b: true, c: 'ok' });
    St.txt(xl - 26, y(H / n / 2) + 22 * St.fk + 14 * St.fk, 'dúconként', { anchor: 'end', fs: 10.5 });
    K.Ln(St.ov, xl - 13, GY, xl - 13, y(H), K.SK('labline', 1)); K.P(St.ov, `M${xl - 20} ${GY} h14 M${xl - 20} ${y(H)} h14`, K.SK('labline', 1));
    St.txt(xl - 26, y(H / n / 2) + 4, `H/n = ${fmt(H / n, 2)} m`, { anchor: 'end', b: true });
    St.tag(8, 360 - 8 * St.fk, 'keresztmetszet – a dúcsorok egyenlő tehermezőkkel', { fs: 10 });
  }
  function drawPlan(wv, a, Mh) {
    clear(plan); K.defs(); plan.classList.add('pr-svg');
    const x0 = 40, sc = 520 / (3 * a), yb = 56;
    txt(plan, x0, 14, 'felülnézet – a heveder a dúcok között kéttámaszú tartóként viselkedik', 't-sm');
    timber(plan, x0 - 6, yb - 6, 3 * a * sc + 12, 12);
    for (let k = 0; k <= 12; k++) arr(plan, x0 + (k * 3 * a * sc) / 12, yb - 34, x0 + (k * 3 * a * sc) / 12, yb - 8, K.v('push'), 1.4, 5.5);
    for (let i = 0; i <= 3; i++) { const cx = x0 + i * a * sc; K.C(plan, cx, yb + 14, 7.5, K.F('timber') + `;stroke:${K.v('timber2')};stroke-width:1`); K.C(plan, cx, yb + 14, 4.6, K.SK('timber2', 0.7, 'opacity:.7')); K.C(plan, cx, yb + 14, 1.8, K.SK('timber2', 0.7, 'opacity:.7')); }
    for (let i = 0; i < 3; i++) {
      const xa = x0 + i * a * sc, pts = [];
      for (let k = 0; k <= 20; k++) { const u = k / 20; pts.push([xa + u * a * sc, yb + 26 + 4 * u * (1 - u) * 34]); }
      svg('path', { d: pathD(pts), style: `fill:${V('accent')};fill-opacity:.18;stroke:${V('accent')};stroke-width:1.6` }, plan);
    }
    txt(plan, x0 + 1.5 * a * sc, yb + 72, `M = w·a²/8 = ${fmt(Mh, 2)} kNm  (w = ${fmt(wv, 1)} kN/m, a = ${fmt(a, 1)} m)`, 't-num halo', { 'text-anchor': 'middle' });
  }
  onTheme(upd);
  autoRedraw(fig, upd);
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
  const FW = 640, FH = 412, GY = 176, S = 40, X0 = 150, LEN = 3.5 * S, BH = 2.4, EH = 1.3;
  const fig = figure(viz, FW, FH, 'fig pr-svg');
  const stepBox = h('div', {}); viz.append(stepBox);
  const oE = stat(out, { label: 'Ásás a tábla éle alatt', unit: 'm', d: 2 });
  const oT = stat(out, { label: 'Dőlés' });
  const oD = stat(out, { label: 'Kiemelési mélység', unit: 'm', d: 2 });
  const y0 = GY;
  const y = (d) => GY + d * S;
  const k01 = (s, a, b = a + 1) => clamp((s - a) / (b - a), 0, 1);
  let St, fig_;   // fig_: a jelenet rajzcsoportja (a régi rajzoló hívások ide kerülnek)
  function scene(st) {
    St = stage(fig, { W: FW, H: FH, GY, layers: [{ k: 'fill', y: GY }, { k: 'gravel', y: GY + 13 }, { k: 'clay', y: y(4.2) + 26 }] });
    const g = fig_ = St.g;
    // kiásott rész
    if (st.e > 0) K.pit(g, St.M, st.ex0 ?? X0 - 8, st.ex1 ?? X0 + LEN + 8, y(st.e));
    // visszatöltött szakasz balra
    if (st.back) { K.backfill(g, 14, X0 - 10, GY, y(st.back)); St.tag(22, GY + 20, 'visszatöltve', { fs: 10 }); }
    if (st.pipe) {
      const gg = K.g_(g, { style: `opacity:${st.pipe}` }), py = y(st.e) - 0.72 * S, ph = 0.6 * S, x1 = X0 + LEN - 12;
      K.R(gg, 14, py, x1 - 14, ph, 'fill:url(#pr-concg)' + `;stroke:${K.v('concedge')};stroke-width:1`, { rx: 3 });
      K.Ln(gg, 16, py + ph * 0.28, x1 - 2, py + ph * 0.28, K.SK('halo', 1.6, 'opacity:.35'));
      for (let x = 60; x < x1 - 8; x += 50) K.R(gg, x, py - 1.5, 5, ph + 3, K.F('conc2') + `;stroke:${K.v('concedge')};stroke-width:.7`, { rx: 1 });
    }
    // irányító a parton
    K.man(g, { x: 70, GY, S, face: 1, hands: [null, [92, GY - 1.32 * S]] });
  }
  function boxDraw(bl, br, ext, o = 1, dx = 0) {
    // bl, br: a bal / jobb alsó sarok mélysége (m); ext: toldóelem (0..1)
    const g = K.g_(fig_, { style: `opacity:${o}`, transform: `translate(${dx} 0)` });
    const ht = BH + (ext > 0 ? EH : 0);
    const panel = (top0, top1, bot0, bot1, op) => {
      const p = [[X0, y(bot0)], [X0 + LEN, y(bot1)], [X0 + LEN, y(top1)], [X0, y(top0)]];
      const d = 'M' + p.map((q) => q.join(' ')).join(' L') + 'Z';
      K.P(g, d, 'fill:url(#pr-cylh)' + `;fill-opacity:${op};stroke:${K.v('steel3')};stroke-width:1.4;stroke-linejoin:round`);
      for (let k = 1; k < 7; k++) { const u = k / 7; K.Ln(g, X0 + u * LEN, lerp(y(bot0), y(bot1), u) - 2, X0 + u * LEN, lerp(y(top0), y(top1), u) + 2, K.SK('steel3', 0.9, 'opacity:.45')); }
      K.Ln(g, X0 + 2, y(top0) + 3, X0 + LEN - 2, y(top1) + 3, K.SK('halo', 1.4, 'opacity:.4'));
    };
    const strutEnd = (cx, cy, r) => { K.C(g, cx, cy, r, K.F('steel2') + `;stroke:${K.v('dark')};stroke-width:1`); K.C(g, cx, cy, r * 0.62, K.F('steel3')); K.C(g, cx, cy, r * 0.3, K.F('acc')); };
    panel(bl - BH, br - BH, bl, br, 0.78);
    // vágóél
    K.Ln(g, X0, y(bl), X0 + LEN, y(br), K.SK('dark', 3));
    // dúcok (végnézetben)
    for (const u of [0.12, 0.88]) for (const hh of [0.55, 1.75]) strutEnd(X0 + u * LEN, lerp(y(bl - hh), y(br - hh), u), 7.5);
    if (ext > 0) {
      const off = (1 - ext) * 1.6, ge = K.g_(g, { style: `opacity:${ext}` }), g0 = g;
      const p = [[X0, y(bl - BH - off)], [X0 + LEN, y(br - BH - off)], [X0 + LEN, y(br - BH - EH - off)], [X0, y(bl - BH - EH - off)]];
      K.P(ge, 'M' + p.map((q) => q.join(' ')).join(' L') + 'Z', 'fill:url(#pr-cylh)' + `;fill-opacity:.7;stroke:${K.v('steel3')};stroke-width:1.4`);
      for (const u of [0.12, 0.88]) { const cx = X0 + u * LEN, cy = lerp(y(bl - BH - off - 0.65), y(br - BH - off - 0.65), u); K.C(ge, cx, cy, 7, K.F('steel2') + `;stroke:${K.v('dark')};stroke-width:1`); K.C(ge, cx, cy, 2.4, K.F('acc')); }
      if (ext > 0.5) St.tag(X0 + LEN + 18 + dx, y(br - BH - EH / 2 - off) - 16, 'toldóelem', { to: [X0 + LEN - 6 + dx, y(br - BH - EH / 2 - off)] });
    }
    // emelőfülek
    for (const u of [0.04, 0.96]) { const cx = X0 + u * LEN, cy = lerp(y(bl - ht), y(br - ht), u); K.C(g, cx, cy - 4, 3.6, K.SK('dark', 2)); }
    return g;
  }
  /** kotró a parton: a kanál (tx, ty) pontnál; push: a kanál hátával nyomja a dobozt */
  function excavator(tx, ty, push = false) {
    const sc = (0.92 * S) / MS, gg = K.scl(fig_, sc, tx, GY);
    K.excavator(gg, St.M, tx, GY + (ty - GY) / sc, { tool: 'dig', reach: clamp((430 - tx) / sc, 40, 120), lift: 40, soil: 'gravel' });
    if (push) St.force(tx + 24, ty - 44, tx + 24, ty - 5, { c: 'mark', w: 2.8 });
  }
  /** emelőlánc a doboz füleitől a kanál horgáig */
  const chains = (yy) => { for (const u of [0.04, 0.96]) K.Ln(fig_, X0 + u * LEN, yy - 6, X0 + LEN / 2, yy - 58, K.SK('dark', 1.3)); };
  /** dolgozó a dobozban (a közelebbi tábla mögött, ezért halványabban látszik) */
  const inside = (e, o) => { if (o > 0.01) K.man(K.g_(fig_, { style: `opacity:${o}` }), { x: X0 + LEN * 0.52, GY: y(e), S, face: -1, squat: 0.25, hands: [[X0 + LEN * 0.34, y(e) - 0.75 * S], [X0 + LEN * 0.3, y(e) - 0.6 * S]] }); };
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
      if (s >= 7) { const t = s - 7; bl = br = lerp(3.5, -1.5, k01(t, 0.05, 0.55)); dx = 96 * k01(t, 0.55, 1); pipe = 1; back = 3.5 * k01(t, 0.4, 1); }
      scene({ e, back: back ? 3.5 : 0, pipe });
      if (back) { const f = k01(s, 7.4, 8); if (f > 0) K.backfill(fig_, X0 - 8, X0 + LEN + 8, y(3.5 * (1 - f)), y(3.5)); }
      inside(e, Math.min(k01(s, 6.2, 6.5), 1 - k01(s, 7.0, 7.05)));
      boxDraw(bl, br, ext, 1, dx);
      if (s < 2) chains(y(bl - BH));
      if (push) excavator(push === 'l' ? X0 + 14 : X0 + LEN - 14, y((push === 'l' ? bl : br) - BH - (ext ? EH : 0)) - 2, true);
      else if (dig) excavator(dig[0], dig[1] - 3);
      else if (s < 2) excavator(X0 + LEN / 2, y(bl - BH) - 58);
      else if (s >= 4 && s < 6) excavator(X0 + LEN / 2, y(e) - 3);
      else if (s > 7.02) { const cg = K.g_(fig_, { transform: `translate(${dx} 0)` }); for (const u of [0.04, 0.96]) K.Ln(cg, X0 + u * LEN, y(bl - BH - EH) - 6, X0 + LEN / 2, y(bl - BH - EH) - 58, K.SK('dark', 1.3)); excavator(X0 + LEN / 2 + dx, y(bl - BH - EH) - 58); }
      // méretek
      const edge = Math.min(bl, br);
      if (e - edge > 0.02 && s >= 2 && s < 7) St.dimV(X0 + LEN + 16, y(edge), y(e), `${fmt(e - edge, 2)} m ≤ 0,5 m`, { c: e - edge <= 0.51 ? 'ok' : 'mark', tc: e - edge <= 0.51 ? 'ok' : 'mark', ly: y(e) + 16 * St.fk });
      if (s > 5.5 && s < 7) { const top = bl - BH - EH; St.tag(X0 - 12, y(top) - 14, `perem +${fmt(-top * 100, 0)} cm`, { anchor: 'end', to: [X0 + 2, y(top)] }); }
      const tilt = Math.abs(bl - br) / 3.5;
      oE.set(s < 2 ? 0 : Math.max(0, e - Math.min(bl, br)), s < 2 || e - Math.min(bl, br) <= 0.51 ? 'ok' : 'bad');
      oT.set(tilt, tilt <= 0.051 ? 'ok' : 'bad', tilt < 0.001 ? 'vízszintes' : `1:${fmt(1 / tilt, 0)}`);
      oD.set(e);
    },
    beall(s) {
      const e = 2.4 * k01(s, 0, 1);
      const b = s < 1 ? -0.3 : lerp(-0.3, 2.35, k01(s, 1, 2));
      scene({ e, ex0: X0 - 4, ex1: X0 + LEN + 4 });
      boxDraw(b, b, 0, 1);
      if (s < 2 && s >= 1) { chains(y(b - BH)); excavator(X0 + LEN / 2, y(b - BH) - 58); }
      if (s >= 2) { const o = k01(s, 2, 2.6); for (const x of [X0 - 4, X0 + LEN]) K.R(fig_, x, GY, 4, y(2.4) - GY, K.F('fill') + `;opacity:${o}`); St.tag(X0 + LEN / 2, GY - 22, 'rés kitöltése – a doboz csak pajzs!', { anchor: 'middle', to: [X0 + LEN + 2, GY + 8] }); }
      if (s < 1) excavator(X0 + LEN / 2, y(e) - 3);
      oE.set(Math.max(0, e - b), 'ok'); oT.set(0, 'ok', 'vízszintes'); oD.set(e);
    },
    sin(s) {
      let e = 1.25 * k01(s, 0, 0.6), rail = 1.25 * k01(s, 0.3, 1), plate = rail;
      if (s >= 1) { e = 1.25 + 0.5 * k01(s, 1, 1.5); rail = 1.25 + 0.5 * k01(s, 1.5, 2); plate = 1.25; }
      if (s >= 2) { plate = 1.25 + 0.5 * k01(s, 2, 3); }
      if (s >= 3) { const t = s - 3; e = lerp(1.75, 4.2, t); rail = lerp(1.75, 4.2, k01(t, 0.05, 1)); plate = lerp(1.75, 4.2, k01(t, 0.1, 1)); }
      if (s >= 4) { e = rail = plate = 4.2; }
      scene({ e, pipe: s >= 4 ? k01(s, 4.3, 5) : 0 });
      const g = K.g_(fig_);
      // lemezek
      const pH = 2.4;
      const plate_ = (x, yy, w, hh, op) => { K.R(g, x, yy, w, hh, 'fill:url(#pr-cylh)' + `;fill-opacity:${op};stroke:${K.v('steel3')};stroke-width:1.3`); for (let k = 1; k < 6; k++) K.Ln(g, x + (w * k) / 6, yy + 2, x + (w * k) / 6, yy + hh - 2, K.SK('steel3', 0.8, 'opacity:.4')); };
      plate_(X0 + 10, y(plate - pH), LEN - 20, pH * S, 0.8);
      if (s >= 3) { const up = Math.max(0, plate - pH); if (up > 0.05) plate_(X0 + 16, y(Math.max(-0.1, plate - pH - 1.4)), LEN - 32, (Math.min(1.4, up + 0.1)) * S, 0.62); }
      // sínek
      for (const x of [X0 + 2, X0 + LEN - 2]) K.hbeamF(g, x, y(rail - 4.6), y(rail), { w: 15 });
      // görgős kocsi
      const cy = s >= 4 ? lerp(rail - 1.2, rail - 3.1, k01(s, 4, 4.5)) : rail - 1.2;
      K.R(g, X0 + 6, y(cy) - 9, LEN - 12, 18, K.F('ok') + `;stroke:${K.v('dark2')};stroke-width:1`, { rx: 4 });
      K.Ln(g, X0 + 10, y(cy) - 5, X0 + LEN - 10, y(cy) - 5, K.SK('halo', 1.2, 'opacity:.35'));
      for (const x of [X0 + 2, X0 + LEN - 2]) for (const d of [-6, 6]) K.C(g, x, y(cy) + d, 3.2, K.F('dark2') + `;stroke:${K.v('steel1')};stroke-width:.8`);
      St.tag(X0 + LEN + 34, y(cy) - 24, 'görgős kocsi + dúc', { to: [X0 + LEN - 16, y(cy)] });
      const diff = Math.abs(rail - plate);
      if (s < 4) St.txt(X0 + LEN + 22, y(Math.max(rail, plate)) + 16 * St.fk, `sín–lemez: ${fmt(diff, 2)} m`, { b: true, c: diff <= 0.51 ? 'ok' : 'mark' });
      if (s < 3.2) excavator(X0 + LEN / 2, y(e) - 3);
      oE.set(Math.max(0, e - Math.min(rail, plate)), e - Math.min(rail, plate) <= 0.51 ? 'ok' : 'bad');
      oT.set(diff, diff <= 0.51 ? 'ok' : 'bad', `sín–lemez ${fmt(diff, 2)} m`);
      oD.set(e);
    },
  };
  let cur = 'sully';
  const stp = stepper(stepBox, { n: TAB.sully.n, texts: TAB.sully.texts, intro: 'Válassz beépítési módot, és lépj végig rajta.', draw: (s) => DRAW[cur](s), speed: 0.9 });
  mode.on((m) => { cur = m; stp.reset(TAB[m].n, TAB[m].texts); });
  onTheme(() => stp.redraw());
  autoRedraw(fig, () => stp.redraw());
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
  const fig = figure(viz, 600, 236, 'fig pr-svg');
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
    const GY = 46, FL = 200, xa = 84, xb = 516, yc = 98, kpx = (xb - xa) / L;
    const St = stage(fig, { W: 600, H: 236, GY, layers: [{ k: 'fill', y: GY }, { k: 'clay', y: GY + 12 }] });
    const { g } = St;
    K.pit(g, St.M, xa, xb, FL);
    K.plankS(g, xa, GY - 6, FL + 14, 1, { t: 5 }); K.plankS(g, xb, GY - 6, FL + 14, -1, { t: 5 });
    const wa = K.waleS(g, xa + 5, yc, 1, { w: 9, h: 15 }), wb = K.waleS(g, xb - 5, yc, -1, { w: 9, h: 15 });
    if (1.8 * kpx < FL - yc - 14) K.man(g, { x: xa + (xb - xa) * 0.3, GY: FL, S: kpx, face: 1 });
    const amp = clamp(u, 0, 1.6) * 22 * (u > 1 ? 1.4 : 0.6);
    const pts = [];
    for (let k = 0; k <= 40; k++) { const t = k / 40; const w = m ? Math.sin(2 * Math.PI * t) : Math.sin(Math.PI * t); pts.push([wa + t * (wb - wa), yc - amp * w]); }
    const col = u <= 0.33 ? 'ok' : u <= 1 ? 'warn' : 'mark', fa = SECT[sec.v].mat === 'fa', d = pathD(pts);
    const th = fa ? 10 : clamp((SECT[sec.v].D ?? 0.2) * kpx, 7, 16);
    K.P(g, d, K.SK(fa ? 'timber2' : 'steel3', th + 1.6, 'stroke-linecap:butt'));
    K.P(g, d, K.SK(fa ? 'timber' : 'steel2', th, 'stroke-linecap:butt'));
    K.P(g, d, K.SK('halo', th * 0.22, 'opacity:.35') + `;transform:translate(0,${(-th * 0.22).toFixed(1)}px)`);
    K.P(St.ov, d, K.SK(col, 2.4, 'stroke-linecap:round' + (u > 1 ? ';stroke-dasharray:7 5' : '')));
    if (m) { K.hbeamS(g, (xa + xb) / 2, yc + th / 2, FL, { w: 9 }); St.tag((xa + xb) / 2 + 18, yc + 52, 'közbenső oszlop', { to: [(xa + xb) / 2 + 4, yc + 46] }); }
    St.force(xa - 48, yc, xa - 7, yc, { c: 'push', w: 2.6 }); St.force(xb + 48, yc, xb + 7, yc, { c: 'push', w: 2.6 });
    St.dimH(xa, xb, FL + 26, `L = ${fmt(L, 1)} m (alakváltozás erősen nagyítva)`);
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
      { const lp = pts[pts.length - 1]; txt(ch, lp[0] - 4, lp[1] - 4, SECT[kk].t.replace('Gömbfa dúc ', '').replace('Acélcső ', '').replace(' (gyenge tengely)', ''), on ? 't-sm t-grp halo' : 't-sm', { 'text-anchor': 'end' }); }
    }
    svg('line', { x1: x0, y1: Y(N), x2: x1, y2: Y(N), style: `stroke:${V('bad')};stroke-width:1.6;stroke-dasharray:6 4` }, ch);
    txt(ch, x0 + 6, Y(N) - 6, `N = ${fmt(N, 0)} kN`, 't-sm t-bad halo');
    const P = sectProps(k); const le = m ? L / 2 : L; const nc = Math.min((Math.PI ** 2 * P.E * P.I) / (le * le), P.Npl);
    svg('circle', { cx: X(L), cy: Y(nc), r: 6, style: ST(V('grp'), V('surface'), 2) }, ch);
    txt(ch, X(L) + 10, Y(nc) - 8, `${fmt(nc, 0)} kN`, 't-num halo');
    txt(ch, x0 + 6, yA + 6, 'Kritikus erő – log. skála (a vízszintes szakasz a szilárdsági korlát)', 't-sm');
  }
  onTheme(upd);
  autoRedraw(fig, upd);
  upd();
});

/* ================================================================ 7. Ferde dúcok – földpadka, alaplemez, erőfelbontás */
register('duc-ferde', (root) => {
  const { ctrls, viz, out } = shell(root, { foot: 'Erőfelbontás: N = H / cos α, V = H · tg α (saját számítás, szemléltető). A ferde dúc függőleges összetevője a falat emeli, a dúc talppontját pedig lefelé nyomja.' });
  const sa = slider(ctrls, { label: 'A ferde dúc hajlásszöge', sym: 'α', min: 18, max: 55, step: 1, value: 25, unit: '°' });
  const sH = slider(ctrls, { label: 'Vízszintes támaszerő dúconként', sym: 'H', min: 100, max: 600, step: 10, value: 260, unit: 'kN' });
  const fig = figure(viz, 640, 360, 'fig pr-svg');
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
    const FW = 640, FH = 360, S = 31, xw = 84, GY = 66, y = (d) => GY + d * S, X = (m) => xw + m * S, D = 6;
    const St = stage(fig, { W: FW, H: FH, GY, layers: [{ k: 'fill', y: GY }, { k: 'gravel', y: GY + 12 }, { k: 'clay', y: y(D) + 10 }] });
    const { g } = St, M = St.M;
    // kiemelés: a gödör közepe lefelé halad, a fal mellett földpadka marad (a 4. lépéstől szakaszosan bontják)
    const ex = k01(s, 0, 0.85), De = D * ex, bermGone = k01(s, 3, 4.2);
    /* a padka a dúc vonala alatt marad: a teteje és a rézsűje kb. 0,35 m-rel a dúc alatt fut */
    const footX = 1.2 + reach, topW = 1.0, dT = 1.5 + (topW - 0.15) * Math.tan(rad(a)) + 0.4, toe = Math.max(topW + 1.2, footX - 0.7);
    if (De > 0.02) K.pitP(g, M, [[X(0), GY], [X(0), y(De)], [FW + 4, y(De)], [FW + 4, GY]]);
    if (De > dT && bermGone < 1) {
      const tx = topW + (toe - topW) * ((De - dT) / (D - dT));
      const d = `M${X(0)} ${y(dT)} H${X(topW)} L${X(tx)} ${y(De)} H${X(0)}Z`, gb = K.g_(g, { style: `opacity:${(1 - bermGone * 0.8).toFixed(2)}` });
      K.P(gb, d, K.F('gravel')); K.P(gb, d, 'fill:url(#pr-p-gravel)'); K.P(gb, `M${X(0)} ${y(dT)} H${X(topW)} L${X(tx)} ${y(De)}`, K.SK('ground', 1.4));
      if (s < 3.4 && ex >= 1) St.tag(X(0.35), y((dT + D) / 2 + 0.9), 'földpadka', { fs: 10.5 });
    }
    // alaplemez – belső rész, majd peremsáv
    const slabIn = k01(s, 1, 1.6), slabEdge = k01(s, 4, 4.8), st = 0.6 * S, sx = X(Math.min(footX - 0.3, 9));
    if (slabIn > 0) K.slab(K.g_(g, { style: `opacity:${slabIn}` }), sx, FW + 4, y(D) - st, st);
    if (slabEdge > 0) K.slab(g, X(0), X(0) + (sx - X(0)) * slabEdge, y(D) - st, st, { fresh: slabEdge < 1 });
    // gépek, emberek
    if (s < 1) { const sc = (0.9 * S) / MS, tx = X(7.4), fy = y(De), gg = K.scl(g, sc, tx, fy); K.excavator(gg, K.at(M, fy), tx, fy - 12, { tool: 'dig', reach: 52, soil: 'gravel' }); }
    if (s > 3.03 && s < 4.2 && bermGone < 0.98) { const sc = (0.9 * S) / MS, tx = X(toe + 0.2), fy = y(D) - st, gg = K.scl(g, sc, tx, fy); K.excavator(gg, K.at(M, fy), tx, fy - 14 - 30 * (1 - bermGone), { tool: 'dig', reach: 60, soil: 'gravel' }); }
    K.man(g, { x: 40, GY, S, face: 1 });
    if (slabIn > 0.5 && s < 3) K.man(g, { x: X(footX + 1.5), GY: y(D) - st, S, face: -1, hands: [null, [X(footX + 0.9), y(D) - st - 1.1 * S]] });
    // fal (szádfal) fejgerendával
    K.sheetS(g, xw - 4, GY - 8, y(D + 2.9));
    K.concrete(g, xw - 12, GY - 12, 16, 13, false);
    // ferde dúc
    const rk = k01(s, 2, 2.6) * (1 - k01(s, 5, 5.7));
    const hx = X(0.15), hy = y(1.5), fx = X(footX), fy = y(D) - st;
    if (rk > 0) {
      const gs = K.g_(g, rk < 1 && s > 5 ? { style: `opacity:${rk}` } : {}), k2 = s > 5 ? 1 : rk;
      K.waleS(gs, xw, hy, 1, { w: 10, h: 17 });
      K.pipeL(gs, hx + 10, hy, lerp(hx + 10, fx, k2), lerp(hy, fy - 4, k2), 5.2);
      if (k2 > 0.97) K.P(gs, `M${fx - 9} ${fy} L${fx + 3} ${fy - 13} L${fx + 12} ${fy}Z`, K.F('steel3') + `;stroke:${K.v('dark')};stroke-width:.8`);   // acél konzol / ellentámasz
      if (rk > 0.95) {
        // erőfelbontás a dúcfejnél
        const sc2 = 70 / 600;
        St.force(hx + 16 + H * sc2, hy, hx + 16, hy, { c: 'push', w: 2.6 });
        St.force(hx + 16, hy + Vv * sc2 + 6, hx + 16, hy + 6, { c: 'warn', w: 2.6 });
        St.txt(hx + 22 + H * sc2, hy + 4, `H = ${fmt(H, 0)} kN`, { b: true, c: 'push' });
        St.txt(hx + 24, hy + Math.max(26, Vv * sc2) + 20, `V = ${fmt(Vv, 0)} kN ↑ (emeli a falat)`, { b: true, c: 'warn' });
        St.tag((hx + fx) / 2 + 26, (hy + fy) / 2 - 30, `α = ${fmt(a, 0)}°  N = ${fmt(N, 0)} kN`, { to: [(hx + fx) / 2 + 6, (hy + fy) / 2 - 4] });
      }
    }
    // pincefal + födém az utolsó lépésben
    const perm = k01(s, 5, 5.8);
    if (perm > 0) {
      const gp = K.g_(g, { style: `opacity:${perm}` });
      K.concrete(gp, xw + 2, y(0.3), 11, (D - 0.3) * S - st, false);
      K.slab(gp, xw + 13, FW + 4, y(2.9), 9); K.slab(gp, xw + 13, FW + 4, y(0.3), 9);
      for (const m of [6, 12]) K.concrete(gp, X(m), y(0.3) + 9, 9, y(D) - st - y(0.3) - 9, false);
      if (perm > 0.6) St.tag(X(7.2), y(2.9) - 20, 'pincefal + födém (tárcsa)', { to: [X(6.8), y(2.9) + 2] });
    }
    St.tag(8, FH - 12 - 8 * St.fk, 'szemléltető metszet: 6 m mély gödör, a dúc feje 1,5 m mélyen', { fs: 10 });
    // alaprajz: padkabontás szakaszai
    clear(plan); K.defs(); plan.classList.add('pr-svg');
    txt(plan, 10, 16, 'alaprajz a fal mentén – a padka bontási sorrendje (5–7 m-es szakaszok)', 't-sm');
    const n = 8, w = 560 / n;
    K.R(plan, 20, 30, 560, 10, 'fill:url(#pr-cylh)' + `;stroke:${K.v('steel3')};stroke-width:.8`);
    for (let i = 0; i < n; i++) {
      const odd = i % 2 === 0; const tt = odd ? k01(s, 3, 3.5) : k01(s, 3.5, 4);
      const x = 20 + i * w, done = tt > 0.5;
      K.R(plan, x + 2, 42, w - 4, 34, done ? 'fill:url(#pr-concg)' : K.F('gravel'), { rx: 2 });
      K.R(plan, x + 2, 42, w - 4, 34, `fill:url(#${done ? 'pr-p-conc' : 'pr-p-gravel'});stroke:${K.v(done ? 'concedge' : 'layer')};stroke-width:.9`, { rx: 2 });
      txt(plan, x + w / 2, 64, odd ? '1.' : '2.', 't-num halo', { 'text-anchor': 'middle' });
      if (done) txt(plan, x + w / 2, 98, 'peremsáv', 't-sm', { 'text-anchor': 'middle' });
    }
  }
  onTheme(drawAll);
  autoRedraw(fig, drawAll);
  drawAll();
});

/* ================================================================ kvízek */
defineQuiz('ducolas', 'Kvíz – munkaárok dúcolása', [
  { q: 'Mit jelent az m₀?', a: ['Azt a mélységet, ameddig a függőleges földfal megtámasztás nélkül ideiglenesen (talajvíz felett) állékony', 'A dúcok közötti legnagyobb megengedett függőleges távolságot', 'A pallók kötelező befogási hosszát a fenék alatt', 'A munkaárok legkisebb szélességét'], c: 0, e: 'm₀ = 4c/(nγ)·tg(45° + φ/2) − p/γ – kohézió nélkül (homokban) nulla vagy negatív.' },
  { q: 'Melyik pallózási módot választjuk, ha a gödör megtámasztás nélkül a teljes mélységig kiemelhető (m₀ > H)?', a: ['Állított pallózás', 'Utánhajtott pallózás', 'Vízszintes pallózás, lépcsős mélyítés', 'Előrevert pallózás'], c: 0, e: 'Előbb teljes mélységig kiemelnek, utána állítják be a pallókat, hevedereket és dúcokat.' },
  { q: 'Durvaszemcsés talajban, ahol látszólagos kohézió sincs (m₀ = 0), melyik módszer alkalmazható?', a: ['Előrevert pallózás – kizárólag acélpallókkal', 'Állított pallózás fapallókkal', 'Hézagos pallózás', 'Vízszintes pallózás, lépcsős mélyítés'], c: 0, e: 'A pallókat a kiemelés előtt leverik, levibrálják; a földfal egy pillanatig sem áll szabadon.' },
  { q: 'Finomhomokban milyen mélység felett kell mindenképpen dúcolni?', a: ['H > 0,5 m', 'H > 1,0 m', 'H > 2,0 m', 'H > 1,25 m'], c: 0, e: 'Finomhomok 0,5 m, átmeneti talaj 1,0 m, kemény agyag 2,0 m – a kiszáradás, átázás miatt munkavédelmi okból.' },
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
