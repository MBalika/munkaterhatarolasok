// 06 – Megtámasztó szerkezetek: fal-labor, horgony (részek, tervező, próbaterhelés), csőtámasz, top-down, passzív hátrahorgonyzás
import { register, shell, slider, seg, toggle, stat, verdict, svg, figure, clear, fmt, clamp, rad, loop, h } from './core.js';
import { defineQuiz } from './ui.js';

const txt = (p, x, y, t, cls = 't-lab', anchor = 'start', extra = {}) => svg('text', { x, y, class: cls, 'text-anchor': anchor, text: t, ...extra }, p);
const scrollBox = (p) => { const d = h('div', { class: 'mt-scroll' }); p.append(d); return d; }; // mobilon vízszintesen görgethető ábra
function arr(parent, x1, y1, x2, y2, cls = 'mt-ar-ink', w = 2, hd = 8) {
  const g = svg('g', { class: cls }, parent);
  const a = Math.atan2(y2 - y1, x2 - x1);
  svg('line', { x1, y1, x2: x2 - Math.cos(a) * hd * 0.8, y2: y2 - Math.sin(a) * hd * 0.8, 'stroke-width': w, 'stroke-linecap': 'round' }, g);
  svg('path', { d: `M${x2} ${y2} L${x2 - Math.cos(a - 0.45) * hd} ${y2 - Math.sin(a - 0.45) * hd} L${x2 - Math.cos(a + 0.45) * hd} ${y2 - Math.sin(a + 0.45) * hd} Z`, class: 'mt-ah' }, g);
  return g;
}
const P = (pts) => 'M' + pts.map((p) => p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join(' L ');

/* ================================================================ 1. FAL-LABOR – statikai vázak */
// Rankine, száraz homogén szemcsés talaj, felszíni teher nélkül; nyomások kN/m², erők kN/m.
function bisect(f, a, b, n = 80) {
  let fa = f(a);
  for (let i = 0; i < n; i++) { const m = (a + b) / 2, fm = f(m); if ((fa <= 0) === (fm <= 0)) { a = m; fa = fm; } else b = m; }
  return (a + b) / 2;
}
/** Integrálás felülről: nyomásfüggvény (pozitív = a gödör felé) + pontszerű erők → nyíró- és nyomatéki ábra */
function integrate(Ltot, pfun, forces, N = 240) {
  const dz = Ltot / N, z = [], V = [], M = [];
  let v = 0, m = 0;
  const fs = forces.slice().sort((a, b) => a.z - b.z);
  let fi = 0;
  for (let i = 0; i <= N; i++) {
    const zi = i * dz;
    if (i > 0) {
      const zp = zi - dz;
      while (fi < fs.length && fs[fi].z <= zi + 1e-9) { m += v * (fs[fi].z - zp) * 0; v += fs[fi].F; fi++; }
      const q = (pfun(zp) + pfun(zi)) / 2;
      m += v * dz + q * dz * dz / 2;
      v += q * dz;
    } else { while (fi < fs.length && fs[fi].z <= 1e-9) { v += fs[fi].F; fi++; } }
    z.push(zi); V.push(v); M.push(m);
  }
  return { z, V, M };
}
/** Tartó lehajlása rugalmas ágyazással (VEM, EI = 1): w > 0 = a gödör felé. supports: merev megtámasztások mélységei; spring: rugók a gödör alatti szakaszon. */
function deflect(Ltot, H, load, supports, N = 60) {
  const ne = N, nn = ne + 1, nd = 2 * nn, le = Ltot / ne;
  const K = Array.from({ length: nd }, () => new Float64Array(nd));
  const F = new Float64Array(nd);
  const k = [[12, 6 * le, -12, 6 * le], [6 * le, 4 * le * le, -6 * le, 2 * le * le], [-12, -6 * le, 12, -6 * le], [6 * le, 2 * le * le, -6 * le, 4 * le * le]].map((r) => r.map((v) => v / (le * le * le)));
  for (let e = 0; e < ne; e++) { const id = [2 * e, 2 * e + 1, 2 * e + 2, 2 * e + 3]; for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) K[id[i]][id[j]] += k[i][j]; }
  const lam = 0.22 * H; const ks = 4 / Math.pow(lam, 4); // ágyazási modulus (relatív)
  for (let i = 0; i < nn; i++) {
    const z = i * le;
    const wgt = (i === 0 || i === nn - 1) ? le / 2 : le;
    F[2 * i] += load(z) * wgt;
    if (z > H) K[2 * i][2 * i] += ks * wgt * Math.min(1, (z - H) / (0.25 * H) + 0.15);
  }
  const fixed = new Set();
  for (const a of supports) { const i = Math.round(a / le); fixed.add(2 * i); }
  for (const d of fixed) { for (let j = 0; j < nd; j++) { K[d][j] = 0; K[j][d] = 0; } K[d][d] = 1; F[d] = 0; }
  // Gauss-elimináció
  const n = nd, A = K.map((r) => Array.from(r)), b = Array.from(F);
  for (let c = 0; c < n; c++) {
    let p = c; for (let r = c + 1; r < n; r++) if (Math.abs(A[r][c]) > Math.abs(A[p][c])) p = r;
    [A[c], A[p]] = [A[p], A[c]]; [b[c], b[p]] = [b[p], b[c]];
    const piv = A[c][c] || 1e-12;
    for (let r = c + 1; r < n; r++) { const f = A[r][c] / piv; if (!f) continue; for (let j = c; j < n; j++) A[r][j] -= f * A[c][j]; b[r] -= f * b[c]; }
  }
  const x = new Array(n).fill(0);
  for (let r = n - 1; r >= 0; r--) { let s = b[r]; for (let j = r + 1; j < n; j++) s -= A[r][j] * x[j]; x[r] = s / (A[r][r] || 1e-12); }
  const out = []; for (let i = 0; i < nn; i++) out.push([i * le, x[2 * i]]);
  return out;
}
function wallCalc(o) {
  const { type, phi, gam, H, eta } = o;
  const Ka = Math.tan(rad(45 - phi / 2)) ** 2, Kp = Math.tan(rad(45 + phi / 2)) ** 2, Kpd = Kp / eta;
  const res = { Ka, Kp, Kpd, supports: [], forces: [], T: [], peck: null };
  if (type === 'konzol') {
    const r = Math.cbrt(Kpd / Ka); const d0 = H / (r - 1); const d = 1.2 * d0;
    const R = 0.5 * Kpd * gam * d0 * d0 - 0.5 * Ka * gam * (H + d0) ** 2;
    res.d0 = d0; res.d = d; res.Lcalc = H + d0;
    res.p = (z) => Ka * gam * z - (z > H ? Kpd * gam * (z - H) : 0);
    res.forces = [{ z: H + d0, F: R, kind: 'C' }];
  } else if (type === 'egy-szabad') {
    const a = o.a;
    const f = (d) => 0.5 * Ka * gam * (H + d) ** 2 * ((2 / 3) * (H + d) - a) - 0.5 * Kpd * gam * d * d * (H + (2 / 3) * d - a);
    const d = bisect(f, 0.01, 4 * H);
    const T = 0.5 * Ka * gam * (H + d) ** 2 - 0.5 * Kpd * gam * d * d;
    res.d0 = d; res.d = d; res.Lcalc = H + d; res.T = [{ z: a, T }];
    res.p = (z) => Ka * gam * z - (z > H ? Kpd * gam * (z - H) : 0);
    res.forces = [{ z: a, F: -T, kind: 'T' }]; res.supports = [a];
  } else if (type === 'egy-befogott') {
    const a = o.a;
    const x = (Ka * H) / (Kpd - Ka);
    const zH = H + x;
    const net = (z) => Ka * gam * z - (z > H ? Kpd * gam * (z - H) : 0);
    // reakciók az egyenértékű tartón (horgony + nulla nyomatékú pont)
    let Fn = 0, Mn = 0; const n = 400;
    for (let i = 0; i < n; i++) { const z = (i + 0.5) * zH / n; const q = net(z) * zH / n; Fn += q; Mn += q * (zH - z); }
    const T = Mn / (zH - a); const R = Fn - T;
    const y = Math.sqrt((6 * Math.max(R, 0)) / ((Kpd - Ka) * gam));
    res.d0 = x + y; res.d = x + 1.2 * y; res.Lcalc = H + x + y; res.T = [{ z: a, T }]; res.x = x;
    res.p = net;
    const R2 = 0.5 * (Kpd - Ka) * gam * y * y - R; // a talppontbeli helyettesítő erő
    res.forces = [{ z: a, F: -T, kind: 'T' }, { z: H + x + y, F: R2, kind: 'C' }]; res.supports = [a];
  } else {
    const nL = o.nL; const a1 = Math.min(1.5, 0.22 * H); const aN = Math.max(a1 + 0.6 * (nL - 1), H - 1.2);
    const as = []; for (let i = 0; i < nL; i++) as.push(nL === 1 ? a1 : a1 + (i * (aN - a1)) / (nL - 1));
    const p = 0.65 * Ka * gam * H; // Peck-féle látszólagos földnyomás homokra
    const T = as.map((ai, i) => {
      const up = i === 0 ? ai : (ai - as[i - 1]) / 2;
      const dn = i === nL - 1 ? (H - ai) / 2 : (as[i + 1] - ai) / 2;
      return { z: ai, T: p * (up + dn) };
    });
    // befogás: nyomatéki egyensúly a legalsó támaszra (szabadon támaszkodó talp), Rankine az alsó támasz alatt
    const aL = as[nL - 1];
    const f = (d) => {
      let Mv = 0; const n = 200;
      for (let i = 0; i < n; i++) { const z = aL + (i + 0.5) * (H + d - aL) / n; Mv += Ka * gam * z * (z - aL) * (H + d - aL) / n; }
      let Mp = 0; for (let i = 0; i < n; i++) { const z = H + (i + 0.5) * d / n; Mp += Kpd * gam * (z - H) * (z - aL) * d / n; }
      return Mv - Mp;
    };
    const d = bisect(f, 0.01, 3 * H);
    res.d0 = d; res.d = d; res.Lcalc = H + d; res.T = T; res.supports = as; res.peck = p;
    res.p = (z) => (z <= H ? p : Ka * gam * z - Kpd * gam * (z - H));
    // a talajreakció a gödör alatt + a talppont a nyíróerő zárására
    res.forces = T.map((t) => ({ z: t.z, F: -t.T, kind: 'T' }));
  }
  res.Ltot = H + res.d;
  // nyomatéki ábra a számítási hosszon (a lezáró hibát a talpon helyettesítő erő veszi fel)
  let I = integrate(res.Lcalc, res.p, res.forces);
  const nE = I.z.length - 1, V0 = I.V[nE], M0 = I.M[nE];
  if (Math.abs(V0) > 1e-6 || Math.abs(M0) > 1e-6) {
    const Rb = -M0 / Math.max(0.01, res.Lcalc - H), Ct = -V0 - Rb;
    I = integrate(res.Lcalc, res.p, [...res.forces, { z: H, F: Rb, kind: 'R' }, { z: res.Lcalc, F: Ct, kind: 'R' }]);
  }
  res.I = I;
  let Mmax = 0; I.M.forEach((m) => { if (Math.abs(m) > Math.abs(Mmax)) Mmax = m; });
  res.Mmax = Mmax;
  return res;
}
register('fallabor', (root) => {
  const { ctrls, viz, out } = shell(root, { foot: '<b>Egyszerűsített, szemléltető számítás</b> – Rankine-féle földnyomás (K<sub>a</sub>, K<sub>p</sub>), száraz homogén szemcsés talaj, felszíni teher és talajvíz nélkül; a passzív földnyomást 1/η-val csökkentjük. Konzolos fal: Blum-módszer, d = 1,2·d₀. Egy szinten szabadon támaszkodó: nyomatéki egyensúly a horgonypontra. Egy szinten befogott: Blum-féle egyenértékű tartó, a talp alatti rész 1,2-szeresével. Több szint: Peck-féle 0,65·K<sub>a</sub>·γ·H látszólagos nyomás, a befogás a legalsó támaszra felírt egyensúlyból. Az alakváltozás csak jelleg (rugalmasan ágyazott tartó, torzítva). Részletesen: Földalatti műtárgyak tárgy.' });
  const sType = seg(ctrls, { label: 'Statikai váz', vert: true, options: [
    { v: 'konzol', t: 'a) Szabadon álló, befogott (konzolos)' },
    { v: 'egy-szabad', t: 'b) Egy szinten megtámasztott, szabadon támaszkodó' },
    { v: 'egy-befogott', t: 'c) Egy szinten megtámasztott, befogott' },
    { v: 'tobb', t: 'd) Több szinten megtámasztott' },
  ], value: 'egy-szabad' });
  const sH = slider(ctrls, { label: 'Kiemelési mélység', sym: 'H', min: 2, max: 14, step: 0.5, value: 7, unit: 'm' });
  const sPhi = slider(ctrls, { label: 'Belső súrlódási szög', sym: 'φ', min: 22, max: 40, step: 1, value: 32, unit: '°' });
  const sG = slider(ctrls, { label: 'Térfogatsúly', sym: 'γ', min: 16, max: 21, step: 0.5, value: 19, unit: 'kN/m³' });
  const sA = slider(ctrls, { label: 'Horgony / dúc szintje', sym: 'a', min: 0.5, max: 4, step: 0.1, value: 1.5, unit: 'm' });
  const sN = slider(ctrls, { label: 'Támaszszintek száma', sym: 'n', min: 2, max: 4, step: 1, value: 3 });
  const sE = slider(ctrls, { label: 'Biztonság a passzív oldalon', sym: 'η', min: 1, max: 2, step: 0.1, value: 1.5, hint: 'K<sub>p,d</sub> = K<sub>p</sub> / η' });
  const W = 760, HH = 470;
  const fig = figure(scrollBox(viz), W, HH);
  const g = svg('g', {}, fig);
  const leg = h('div', { class: 'legend', html: '<span><i style="background:var(--mt-act)"></i>aktív földnyomás</span><span><i style="background:var(--mt-pas)"></i>passzív földellenállás (K<sub>p</sub>/η)</span><span><i style="background:var(--accent)"></i>megtámasztás</span><span><i style="background:transparent;border:1.5px dashed var(--bad)"></i>alakváltozás (torzítva)</span><span><i style="background:var(--mt-momc)"></i>nyomatéki ábra M(z)</span>' });
  viz.append(leg);
  const sKa = stat(out, { label: 'Aktív tényező K<sub>a</sub>', d: 3 });
  const sKp = stat(out, { label: 'Passzív tényező K<sub>p</sub>', d: 2 });
  const sD = stat(out, { label: 'Befogási mélység d', unit: 'm', d: 2 });
  const sL = stat(out, { label: 'Teljes falhossz', unit: 'm', d: 1 });
  const sT = stat(out, { label: 'Támaszerő összesen', unit: 'kN/m', d: 0 });
  const sM = stat(out, { label: 'Max. nyomaték', unit: 'kNm/m', d: 0 });
  const vd = verdict(out); vd.el.style.gridColumn = '1 / -1';

  function draw() {
    const type = sType.v;
    sA.el.hidden = !(type === 'egy-szabad' || type === 'egy-befogott');
    sN.el.hidden = type !== 'tobb';
    sA.input.max = Math.max(0.6, sH.v - 1).toFixed(1);
    if (sA.v > sH.v - 1) sA.set(Math.max(0.5, sH.v - 1), false);
    const H = sH.v;
    const r = wallCalc({ type, phi: sPhi.v, gam: sG.v, H, eta: sE.v, a: sA.v, nL: sN.v });
    clear(g);
    const Lt = r.Ltot;
    const y0 = 56, sc = (HH - y0 - 30) / Math.max(Lt, 6);
    const Y = (z) => y0 + z * sc;
    const xw = 330;
    // talaj
    svg('rect', { x: 0, y: 0, width: W, height: y0, class: 'f-sky' }, g);
    svg('rect', { x: xw, y: y0, width: 560 - xw, height: HH - y0, class: 'f-soilA' }, g);
    svg('rect', { x: 40, y: Y(H), width: xw - 40, height: HH - Y(H), class: 'f-soilA' }, g);
    svg('rect', { x: xw, y: y0, width: 560 - xw, height: HH - y0, fill: 'url(#pat-sand)' }, g);
    svg('rect', { x: 40, y: Y(H), width: xw - 40, height: HH - Y(H), fill: 'url(#pat-sand)' }, g);
    txt(g, 552, y0 + 18, 'megtámasztott talaj', 't-sm halo', 'end');
    txt(g, 50, Y(H) - 8, 'munkagödör', 't-sm halo');
    // nyomásábrák
    const ps = 150 / Math.max(r.Ka * sG.v * Lt, r.Kpd * sG.v * (r.Lcalc - H), type === 'tobb' ? r.peck : 0, 1);
    // aktív (jobb oldalon, a fal felé mutat)
    const act = [];
    for (let i = 0; i <= 60; i++) { const z = (i / 60) * r.Lcalc; const pa = type === 'tobb' && z <= H ? r.peck : r.Ka * sG.v * z; act.push([xw + 6 + pa * ps, Y(z)]); }
    svg('path', { d: P([[xw + 6, y0], ...act, [xw + 6, Y(r.Lcalc)]]) + ' Z', class: 'mt-act' }, g);
    for (let z = 0.5; z < r.Lcalc; z += Math.max(0.8, r.Lcalc / 9)) { const pa = type === 'tobb' && z <= H ? r.peck : r.Ka * sG.v * z; if (pa * ps > 10) arr(g, xw + 6 + pa * ps, Y(z), xw + 8, Y(z), 'mt-ar-act', 1.4, 6); }
    // passzív (bal oldalon a gödör alatt)
    const pas = [];
    for (let i = 0; i <= 40; i++) { const z = H + (i / 40) * (r.Lcalc - H); pas.push([xw - 6 - r.Kpd * sG.v * (z - H) * ps, Y(z)]); }
    svg('path', { d: P([[xw - 6, Y(H)], ...pas, [xw - 6, Y(r.Lcalc)]]) + ' Z', class: 'mt-pas' }, g);
    // fal
    svg('rect', { x: xw - 5, y: y0 - 6, width: 10, height: Y(Lt) - y0 + 6, class: 'mt-wall' }, g);
    if (r.d > r.d0 + 0.01) svg('rect', { x: xw - 5, y: Y(r.Lcalc), width: 10, height: Y(Lt) - Y(r.Lcalc), class: 'mt-wall-ext' }, g);
    // helyettesítő erők (C)
    r.forces.filter((f) => f.kind === 'C').forEach((f) => { arr(g, xw + 60, Y(f.z), xw + 8, Y(f.z), 'mt-ar-ink', 2, 8); txt(g, xw + 64, Y(f.z) + 4, 'C (Blum)', 't-sm halo'); });
    // megtámasztások
    r.T.forEach((t, i) => {
      const yy = Y(t.z);
      if (type === 'tobb') {
        svg('rect', { x: 60, y: yy - 4, width: xw - 65, height: 8, rx: 4, class: 'mt-strut' }, g);
        txt(g, xw - 14, yy - 9, `T${i + 1} = ${fmt(t.T, 0)} kN/m`, 't-num halo', 'end');
      } else {
        const L = 150, al = rad(20);
        svg('line', { x1: xw + 5, y1: yy, x2: xw + 5 + L * Math.cos(al), y2: yy + L * Math.sin(al), class: 'mt-tendon', 'stroke-width': 2.5 }, g);
        svg('line', { x1: xw + 5 + L * 0.55 * Math.cos(al), y1: yy + L * 0.55 * Math.sin(al), x2: xw + 5 + L * Math.cos(al), y2: yy + L * Math.sin(al), class: 'mt-grout', 'stroke-width': 9, 'stroke-linecap': 'round' }, g);
        svg('rect', { x: xw - 9, y: yy - 6, width: 8, height: 12, class: 'f-acc' }, g);
        arr(g, xw - 50, yy, xw - 8, yy, 'mt-ar-acc', 2.5, 9);
        txt(g, xw - 54, yy - 8, `T = ${fmt(t.T, 0)} kN/m`, 't-num halo', 'end');
      }
    });
    // alakváltozás
    const load = (z) => (type === 'tobb' && z <= H ? r.peck : r.Ka * sG.v * z);
    const wd = deflect(Lt, H, load, r.supports);
    const wmax = Math.max(...wd.map((p) => Math.abs(p[1])), 1e-9);
    const ws = 46 / wmax;
    svg('path', { d: P(wd.map(([z, w]) => [xw - w * ws, Y(z)])), class: 'mt-defl', fill: 'none' }, g);
    // gödörfenék, terep
    svg('line', { x1: 40, y1: Y(H), x2: xw - 5, y2: Y(H), class: 's-soil', 'stroke-width': 2 }, g);
    svg('line', { x1: xw, y1: y0, x2: 560, y2: y0, class: 's-soil', 'stroke-width': 2 }, g);
    // méretek
    const dimv = (x, z1, z2, t) => { svg('line', { x1: x, y1: Y(z1), x2: x, y2: Y(z2), class: 's-muted', 'stroke-width': 1 }, g); for (const z of [z1, z2]) svg('line', { x1: x - 4, y1: Y(z), x2: x + 4, y2: Y(z), class: 's-muted' }, g); txt(g, x + 6, (Y(z1) + Y(z2)) / 2 + 4, t, 't-num halo'); };
    dimv(14, 0, H, `H = ${fmt(H, 1)} m`);
    dimv(14, H, Lt, `d = ${fmt(r.d, 1)} m`);
    // nyomatéki ábra jobbra
    const mx0 = 650, mw = 90;
    const Mabs = Math.max(...r.I.M.map(Math.abs), 1);
    svg('line', { x1: mx0, y1: y0, x2: mx0, y2: Y(Lt), class: 's-muted', 'stroke-width': 1 }, g);
    const mp = r.I.z.map((z, i) => [mx0 - (r.I.M[i] / Mabs) * mw * 0.95, Y(z)]);
    svg('path', { d: P([[mx0, y0], ...mp, [mx0, Y(r.I.z[r.I.z.length - 1])]]) + ' Z', class: 'mt-mom' }, g);
    txt(g, mx0, y0 - 14, 'M(z)', 't-num', 'middle');
    const iM = r.I.M.findIndex((m) => m === r.Mmax);
    if (iM >= 0) txt(g, mx0 - (r.Mmax / Mabs) * mw - 4, Y(r.I.z[iM]) + 4, `${fmt(Math.abs(r.Mmax), 0)}`, 't-num halo', r.Mmax > 0 ? 'end' : 'start');
    // kijelzők
    sKa.set(r.Ka); sKp.set(r.Kp);
    sD.set(r.d, r.d > 1.5 * H ? 'warn' : null);
    sL.set(Lt);
    const Tsum = r.T.reduce((s, t) => s + t.T, 0);
    sT.set(Tsum, null, type === 'konzol' ? '–' : null);
    sM.set(Math.abs(r.Mmax));
    let st = 'ok', title = '', msg = '';
    if (type === 'konzol') {
      if (H > 6) { st = 'bad'; title = 'Túl mély a konzolos falhoz'; msg = 'A befogott falak egyéb megtámasztás nélkül csak pár méteres (max. 4–6 m) kiemelésig állékonyak. Kell horgony, dúc vagy födém!'; }
      else if (H > 4) { st = 'warn'; title = 'A konzolos határ közelében'; msg = 'Konzolosan max. 4–6 m – és csak akkor, ha közvetlenül mellette nincs építmény. Nézd meg, mennyit csökken a befogás és a nyomaték egy horgonnyal!'; }
      else { title = 'Konzolos fal'; msg = `A fal a passzív földellenállás révén befogott; a talp körül fordul el (C pont). d = 1,2·d₀ = ${fmt(r.d, 1)} m.`; }
    } else if (type === 'egy-szabad') { title = 'Szabadon támaszkodó talp'; msg = 'Rövidebb fal, de nagyobb mezőnyomaték: a talp kissé elmozdulhat, a fal „két támaszú tartóként” dolgozik (horgony + passzív földellenállás).'; }
    else if (type === 'egy-befogott') { title = 'Befogott talp'; msg = `Hosszabb fal, de kisebb mezőnyomaték: a talp befogása negatív nyomatékot ébreszt. A nulla nyomatékú pont kb. ${fmt(r.x, 2)} m-rel a gödör alja alatt van.`; }
    else { title = 'Határozatlan, többtámaszú tartó'; msg = 'Mély gödörnél több szinten kell megtámasztani: a támaszerők itt a Peck-féle látszólagos földnyomásból, hatásterület alapján adódnak – a valódi eloszlás az építési fázisoktól is függ.'; }
    vd.set(st, title, msg);
  }
  [sType, sH, sPhi, sG, sA, sN, sE].forEach((s) => s.on(draw));
  draw();
});

/* ================================================================ 2. A talajhorgony részei */
const PARTS = {
  fej: { t: 'Horgonyfej', d: 'Az erőt a falról a horgonyra a horgonyfejen keresztül adjuk át. A falra alátét (teherelosztó lemez) kerül, ez adja meg a horgony irányát; a pászmákat az ékes horgonytárcsában kúpos ékek rögzítik.' },
  heveder: { t: 'Fal és heveder (mellgerenda)', d: 'Egy horgony több falelemet (cölöpöt, szádpallót, résfalpanelt) támaszt meg a teherelosztó heveder, mellgerenda mentén.' },
  szabad: { t: 'Szabad szakasz (horgonyszár)', d: 'Elmozdulást biztosít, nincs erőátadás a talajra: közvetíti az erőt a fej és a befogott szakasz között. Nagy szilárdságú Dywidag-rúd vagy leggyakrabban acélpászmák, védőcsőben; a furatot cementhabarccsal töltik ki. Legalább 4 m.' },
  csuszo: { t: 'Aktív csúszólap', d: 'A megtámasztott földtömeg lehetséges csúszólapja. A befogott szakasznak ezen túl kell kezdődnie – különben a horgony a mozgó földtömeggel együtt mozdulna.' },
  befogott: { t: 'Befogott (injektált) szakasz', d: 'Itt történik az erőátadás: az injektált test köpenymenti nyírással adja át az erőt a talajnak. Jellemzően 4–9 m hosszú, túlnyúlik az aktív csúszólapon.' },
  paszma: { t: 'Pászmák, távtartók', d: 'Jellemzően 3–7 pászma (a felveendő erő függvényében). Egy Ø15,7 mm-es pászma szakítóereje kb. 279 kN (≈ 28 t) – öt ilyen már több mint 100 t-t bír. A befogott szakaszon távtartók tartják szét őket.' },
  mandzsetta: { t: 'Mandzsettás injektálócső', d: 'A pászmák mellett végigfutó, szelepes (mandzsettás) cső: ezen át történik a nagy nyomású (utó)injektálás, amely szétrepeszti és kiszélesíti az elsődleges habarcstestet.' },
};
register('horgonyreszek', (root) => {
  const { ctrls, viz } = shell(root, { out: false });
  const sP = seg(ctrls, { label: 'Részek', vert: true, options: Object.entries(PARTS).map(([v, o]) => ({ v, t: o.t })), value: 'fej' });
  const info = h('div', { class: 'verdict' });
  const W = 760, HH = 330;
  const fig = figure(scrollBox(viz), W, HH);
  viz.append(info);
  const g = svg('g', {}, fig);
  let tt = 0;
  function draw() {
    clear(g);
    const sel = sP.v;
    const on = (k) => (sel === k ? ' mt-sel' : '');
    const grp = (k) => { const e = svg('g', { class: 'mt-part' + on(k), tabindex: 0, role: 'button', 'aria-label': PARTS[k].t }, g); e.addEventListener('click', () => sP.set(k)); e.addEventListener('keydown', (ev) => { if (ev.key === 'Enter') sP.set(k); }); return e; };
    // talaj
    svg('rect', { x: 100, y: 20, width: W - 100, height: HH - 40, class: 'f-soilB' }, g);
    svg('rect', { x: 100, y: 20, width: W - 100, height: HH - 40, fill: 'url(#pat-soil)' }, g);
    svg('rect', { x: 0, y: 20, width: 100, height: HH - 40, class: 'f-sky', opacity: 0.6 }, g);
    txt(g, 50, HH - 30, 'munkagödör', 't-sm', 'middle');
    // fal + heveder
    const gw = grp('heveder');
    svg('rect', { x: 84, y: 20, width: 18, height: HH - 40, class: 'f-conc' }, gw);
    svg('rect', { x: 84, y: 20, width: 18, height: HH - 40, fill: 'url(#pat-conc)' }, gw);
    svg('rect', { x: 64, y: 100, width: 20, height: 34, class: 'f-steel2' }, gw);
    // geometria
    const ax = 102, ay = 117, ang = rad(17), Lf = 300, Lb = 270;
    const pt = (u) => [ax + Math.cos(ang) * u, ay + Math.sin(ang) * u];
    const [bx, by] = pt(Lf), [ex, ey] = pt(Lf + Lb);
    // csúszólap
    const gc = grp('csuszo');
    svg('line', { x1: 120, y1: HH - 20, x2: 330, y2: 20, class: 'mt-slip', 'stroke-width': 2.2, 'stroke-dasharray': '9 6' }, gc);
    txt(gc, 318, 40, 'aktív csúszólap', 't-sm t-bad halo', 'end');
    // befogott szakasz
    const gb = grp('befogott');
    const bulb = [];
    for (let i = 0; i <= 24; i++) { const u = Lf + (i / 24) * Lb; const r = 15 + Math.sin(i * 1.7) * 3; const [x, y] = pt(u); bulb.push([x - Math.sin(ang) * r, y + Math.cos(ang) * r]); }
    for (let i = 24; i >= 0; i--) { const u = Lf + (i / 24) * Lb; const r = 15 + Math.cos(i * 1.3) * 3; const [x, y] = pt(u); bulb.push([x + Math.sin(ang) * r, y - Math.cos(ang) * r]); }
    svg('path', { d: P(bulb) + ' Z', class: 'f-grout' }, gb);
    svg('path', { d: P(bulb) + ' Z', fill: 'url(#pat-conc)' }, gb);
    for (let i = 0; i < 7; i++) {
      const [x, y] = pt(Lf + 25 + i * 36);
      for (const sgn of [-1, 1]) { const nx = -Math.sin(ang) * 24 * sgn, ny = Math.cos(ang) * 24 * sgn; arr(gb, x + nx, y + ny, x + nx - Math.cos(ang) * 16, y + ny - Math.sin(ang) * 16, 'mt-ar-shear', 1.4, 5); }
    }
    txt(gb, (bx + ex) / 2, (by + ey) / 2 + 40, 'befogott szakasz 4–9 m', 't-lab halo', 'middle');
    // szabad szakasz
    const gs = grp('szabad');
    svg('line', { x1: ax, y1: ay, x2: bx, y2: by, class: 'mt-sheath', 'stroke-width': 12 }, gs);
    txt(gs, (ax + bx) / 2, (ay + by) / 2 - 16, 'szabad szakasz ≥ 4 m', 't-lab halo', 'middle');
    // pászmák
    const gp = grp('paszma');
    for (const off of [-3, 0, 3]) svg('line', { x1: ax - 30, y1: ay + off, x2: ex - 6, y2: ey + off, class: 'mt-strand', 'stroke-width': 1.6 }, gp);
    for (let i = 1; i < 6; i++) { const [x, y] = pt(Lf + i * 45); svg('circle', { cx: x, cy: y, r: 6, class: 'mt-spacer' }, gp); }
    // mandzsettás cső
    const gm = grp('mandzsetta');
    svg('line', { x1: ax - 10, y1: ay + 8, x2: ex - 4, y2: ey + 8, class: 'mt-tam', 'stroke-width': 3 }, gm);
    for (let i = 0; i < 6; i++) { const [x, y] = pt(Lf + 15 + i * 45); svg('rect', { x: x - 4, y: y + 5, width: 8, height: 6, rx: 2, class: 'f-acc' }, gm); if (sel === 'mandzsetta') { const ph = (tt + i * 0.17) % 1; svg('circle', { cx: x, cy: y + 8 + ph * 16, r: 2.4, class: 'f-grout', opacity: 1 - ph }, gm); } }
    // fej
    const gf = grp('fej');
    svg('path', { d: `M 60 98 L 70 92 L 70 142 L 60 136 Z`, class: 'f-steel2' }, gf);
    svg('rect', { x: 40, y: 104, width: 20, height: 26, rx: 3, class: 'f-steel' }, gf);
    for (const yy of [109, 117, 125]) svg('path', { d: `M 40 ${yy - 3} L 30 ${yy} L 40 ${yy + 3} Z`, class: 'f-acc' }, gf);
    txt(gf, 44, 90, 'horgonyfej', 't-lab halo', 'middle');
    // erő
    arr(g, 150, 60, 104, 60, 'mt-ar-acc', 2.5, 9); txt(g, 156, 64, 'földnyomás → fal → horgony', 't-sm halo');
    const p = PARTS[sel];
    info.innerHTML = `<b>${p.t}</b><p class="small" style="margin:6px 0 0">${p.d}</p>`;
  }
  sP.on(draw); draw();
  loop(fig, (t) => { tt = t; if (sP.v === 'mandzsetta') draw(); });
});

/* ================================================================ 3. Horgonytervező */
register('horgonytervezo', (root) => {
  const { ctrls, viz, out } = shell(root, { foot: 'A csúszólapot a gödör aljától, 45° + φ/2 hajlással rajzoljuk (egyszerűsítés). A szabad szakasznak a csúszólapon túl még legalább max(1,5 m; H/5) távolságra kell nyúlnia, és legalább 4 m-nek kell lennie. Szemléltető – a tényleges hosszat a kihúzódási teherbírás és a mély csúszólap (Kranz) vizsgálata adja.' });
  const sH = slider(ctrls, { label: 'Kiemelési mélység', sym: 'H', min: 4, max: 20, step: 0.5, value: 10, unit: 'm' });
  const sA = slider(ctrls, { label: 'Horgonysor mélysége', sym: 'a', min: 1, max: 8, step: 0.1, value: 2.5, unit: 'm' });
  const sAl = slider(ctrls, { label: 'Hajlásszög', sym: 'α', min: 10, max: 35, step: 1, value: 20, unit: '°', hint: 'Jellemzően 15–30° a vízszinteshez.' });
  const sPhi = slider(ctrls, { label: 'Belső súrlódási szög', sym: 'φ', min: 22, max: 40, step: 1, value: 30, unit: '°' });
  const sLb = slider(ctrls, { label: 'Befogott szakasz', sym: 'L<sub>b</sub>', min: 3, max: 12, step: 0.5, value: 7, unit: 'm', hint: 'Jellemzően 4–9 m.' });
  const sP = slider(ctrls, { label: 'Telekhatár a faltól', min: 0, max: 20, step: 0.5, value: 4, unit: 'm' });
  const tB = toggle(ctrls, { label: 'Szomszéd épület pincével (−3,5 m)', value: true });
  const W = 760, HH = 420;
  const fig = figure(scrollBox(viz), W, HH);
  const g = svg('g', {}, fig);
  const sLf = stat(out, { label: 'Szükséges szabad szakasz', unit: 'm', d: 1 });
  const sL = stat(out, { label: 'Teljes horgonyhossz', unit: 'm', d: 1 });
  const sR = stat(out, { label: 'Vízszintes kinyúlás', unit: 'm', d: 1 });
  const sO = stat(out, { label: 'A szomszéd telek alatt', unit: 'm', d: 1 });
  const sZ = stat(out, { label: 'A horgonyvég mélysége', unit: 'm', d: 1 });
  const vd = verdict(out); vd.el.style.gridColumn = '1 / -1';
  function draw() {
    sA.input.max = Math.max(1.2, sH.v - 1).toFixed(1); if (sA.v > sH.v - 1) sA.set(sH.v - 1, false);
    const H = sH.v, a = sA.v, al = rad(sAl.v), phi = sPhi.v, Lb = sLb.v;
    const th = rad(45 + phi / 2);
    // a csúszólap: x_s(z) = (H - z)/tan(th) a faltól; a horgonyirány: x = u cos al, z = a + u sin al
    const uS = (H - a) / (Math.tan(th) * Math.cos(al) + Math.sin(al)); // metszéspont a horgonytengely mentén
    const margin = Math.max(1.5, H / 5);
    const LfReq = Math.max(4, uS + margin);
    const L = LfReq + Lb;
    const R = L * Math.cos(al), zEnd = a + L * Math.sin(al);
    const over = R - sP.v;
    clear(g);
    const xw = 150, y0 = 70;
    const sc = Math.min(34, (W - xw - 30) / Math.max(R + 2, 14), (HH - y0 - 20) / Math.max(H + 2.6, zEnd + 1.5));
    const X = (x) => xw + x * sc, Y = (z) => y0 + z * sc;
    svg('rect', { x: 0, y: 0, width: W, height: y0, class: 'f-sky' }, g);
    svg('rect', { x: xw, y: y0, width: W - xw, height: HH - y0, class: 'f-soilA' }, g);
    svg('rect', { x: xw, y: y0, width: W - xw, height: HH - y0, fill: 'url(#pat-sand)' }, g);
    svg('rect', { x: 0, y: y0, width: xw, height: Y(H) - y0, class: 'mt-air' }, g);
    svg('rect', { x: 0, y: Y(H), width: xw, height: HH - Y(H), class: 'f-soilA' }, g);
    // telekhatár + szomszéd
    const xp = X(sP.v);
    svg('rect', { x: xp, y: y0, width: W - xp, height: HH - y0, class: 'mt-neigh' }, g);
    svg('line', { x1: xp, y1: 20, x2: xp, y2: HH, class: 's-warn', 'stroke-width': 2, 'stroke-dasharray': '8 5' }, g);
    txt(g, xp - 6, HH - 12, 'telekhatár', 't-sm halo', 'end');
    txt(g, xp + 6, HH - 12, 'szomszéd telek →', 't-lab halo');
    let hit = false;
    if (tB.v) {
      const bx0 = xp + 0.8 * sc, bx1 = Math.min(W - 6, xp + 14 * sc);
      svg('rect', { x: bx0, y: y0 - 50, width: bx1 - bx0, height: 50, class: 'f-bld' }, g);
      for (let i = 0; i < 6; i++) svg('rect', { x: bx0 + 10 + i * ((bx1 - bx0 - 20) / 6), y: y0 - 40, width: 8, height: 12, class: 'f-bld2' }, g);
      svg('rect', { x: bx0, y: y0, width: bx1 - bx0, height: 3.5 * sc, class: 'f-bld2' }, g);
      txt(g, (bx0 + bx1) / 2, y0 + 1.9 * sc, 'pince', 't-sm halo', 'middle');
      // ütközés vizsgálat
      for (let u = 0; u <= L; u += 0.1) { const x = u * Math.cos(al), z = a + u * Math.sin(al); if (X(x) >= bx0 && X(x) <= bx1 && z <= 3.5 + 0.3) { hit = true; break; } }
    }
    // csúszólap
    svg('line', { x1: xw, y1: Y(H), x2: X(H / Math.tan(th)), y2: y0, class: 'mt-slip', 'stroke-width': 2, 'stroke-dasharray': '8 6' }, g);
    txt(g, X(H / Math.tan(th)) + 4, y0 + 14, `csúszólap (${fmt(45 + phi / 2, 0)}°)`, 't-sm t-bad halo');
    // fal
    svg('rect', { x: xw - 9, y: y0 - 6, width: 9, height: Y(H + 2.5) - y0 + 6, class: 'mt-wall' }, g);
    txt(g, xw - 14, Y(H) - 8, 'gödör', 't-sm halo', 'end');
    // horgony
    const P0 = [X(0), Y(a)], Pf = [X(LfReq * Math.cos(al)), Y(a + LfReq * Math.sin(al))], Pe = [X(R), Y(zEnd)];
    svg('line', { x1: P0[0], y1: P0[1], x2: Pf[0], y2: Pf[1], class: 'mt-sheath', 'stroke-width': 7 }, g);
    svg('line', { x1: Pf[0], y1: Pf[1], x2: Pe[0], y2: Pe[1], class: 'mt-grout', 'stroke-width': 14, 'stroke-linecap': 'round' }, g);
    svg('line', { x1: P0[0] - 10, y1: P0[1], x2: Pe[0], y2: Pe[1], class: 'mt-strand', 'stroke-width': 2 }, g);
    svg('rect', { x: xw - 16, y: Y(a) - 7, width: 8, height: 14, class: 'f-acc' }, g);
    // csúszólap-metszés és ráhagyás
    const Ps = [X(uS * Math.cos(al)), Y(a + uS * Math.sin(al))];
    svg('circle', { cx: Ps[0], cy: Ps[1], r: 4, class: 'f-bad' }, g);
    txt(g, (Ps[0] + Pf[0]) / 2, (Ps[1] + Pf[1]) / 2 - 10, `+${fmt(LfReq - uS, 1)} m`, 't-num t-bad halo', 'middle');
    txt(g, (P0[0] + Pf[0]) / 2, (P0[1] + Pf[1]) / 2 + 20, `L_f = ${fmt(LfReq, 1)} m`, 't-num halo', 'middle');
    txt(g, (Pf[0] + Pe[0]) / 2, (Pf[1] + Pe[1]) / 2 + 24, `L_b = ${fmt(Lb, 1)} m`, 't-num halo', 'middle');
    if (hit) svg('circle', { cx: Pe[0], cy: Pe[1], r: 18, class: 'mt-hitc' }, g);
    // H méret
    svg('line', { x1: 30, y1: y0, x2: 30, y2: Y(H), class: 's-muted' }, g);
    txt(g, 36, (y0 + Y(H)) / 2, `H = ${fmt(H, 1)} m`, 't-num halo');
    // kijelzők
    sLf.set(LfReq, LfReq === 4 ? null : null);
    sL.set(L, L > 30 ? 'bad' : L > 25 ? 'warn' : 'ok');
    sR.set(R);
    sO.set(Math.max(0, over), over > 0 ? 'warn' : 'ok', over > 0 ? null : 'nem nyúlik át');
    sZ.set(zEnd);
    const msgs = [];
    let st = 'ok';
    if (L > 30) { st = 'bad'; msgs.push('A horgony hosszabb 30 m-nél – legfeljebb 25–30 m-es horgonyok készülnek. Több horgonysor vagy más megtámasztás kell.'); }
    else if (L > 25) { st = 'warn'; msgs.push('25 m feletti horgonyhossz – a gyakorlati határ közelében.'); }
    if (Lb < 4 || Lb > 9) { st = st === 'bad' ? st : 'warn'; msgs.push('A befogott szakasz jellemzően 4–9 m; 9 m felett már alig nő a teherbírás.'); }
    if (sAl.v < 15 || sAl.v > 30) { st = st === 'bad' ? st : 'warn'; msgs.push('A horgonyok a vízszintessel jellemzően 15–30°-os szöget zárnak be.'); }
    if (hit) { st = 'bad'; msgs.push('A horgony beleütközik a szomszéd pincéjébe! Meredekebb horgony, mélyebb horgonysor – vagy csőtámasz kell.'); }
    if (over > 0) msgs.push(`A horgony ${fmt(over, 1)} m-rel a szomszéd telek alá nyúlik – jogi kérdés (tulajdonosi hozzájárulás), és meglévő műtárgyakba ütközhet.`);
    vd.set(st, st === 'ok' ? (over > 0 ? 'Geometriailag rendben' : 'Rendben') : st === 'warn' ? 'Figyelem' : 'Így nem jó', msgs.length ? '<ul class="mt-ul">' + msgs.map((m) => `<li>${m}</li>`).join('') + '</ul>' : 'A befogott szakasz a csúszólapon túl kezdődik, és a horgony a saját telken marad.');
  }
  [sH, sA, sAl, sPhi, sLb, sP, tB].forEach((s) => s.on(draw));
  draw();
});

/* ================================================================ 4. Próbaterhelés és lekötés */
register('horgonyproba', (root) => {
  const { ctrls, viz, out } = shell(root, { foot: 'Szemléltető diagram: a rugalmas megnyúlás Δ = P·L<sub>app</sub>/(E·A), ahol L<sub>app</sub> ≈ L<sub>f</sub> + L<sub>b</sub>/2, E = 195 GPa, A = n·150 mm² (Ø15,7 mm-es pászma, f<sub>pk</sub> = 1860 MPa → 279 kN/pászma). A terhelési lépcsők az EN ISO 22477-5 ciklikus vizsgálatához hasonlóak; a próbaterhelés itt 1,25·T<sub>d</sub> (a nemzeti előírások 1,1–1,5 között változnak). A maradó elmozdulás és a kúszás becsült érték.' });
  const sN = slider(ctrls, { label: 'Pászmák száma', sym: 'n', min: 3, max: 7, step: 1, value: 5 });
  const sLf = slider(ctrls, { label: 'Szabad szakasz', sym: 'L<sub>f</sub>', min: 4, max: 20, step: 0.5, value: 9, unit: 'm' });
  const sLb = slider(ctrls, { label: 'Befogott szakasz', sym: 'L<sub>b</sub>', min: 4, max: 9, step: 0.5, value: 7, unit: 'm' });
  const sTd = slider(ctrls, { label: 'Tervezett horgonyerő', sym: 'T<sub>d</sub>', min: 200, max: 1200, step: 10, value: 600, unit: 'kN' });
  const sLo = slider(ctrls, { label: 'Lekötés a tervezett erő', min: 80, max: 90, step: 1, value: 85, unit: '%-ára', hint: 'Jellemzően 80–90%.' });
  const bGo = h('button', { type: 'button', class: 'btn btn-line btn-sm' }, '▶ Próbaterhelés indítása');
  ctrls.append(bGo);
  const W = 760, HH = 380;
  const fig = figure(scrollBox(viz), W, HH);
  const g = svg('g', {}, fig);
  const sPp = stat(out, { label: 'Próbaterhelés P<sub>p</sub>', unit: 'kN', d: 0 });
  const sU = stat(out, { label: 'Pászmák kihasználtsága P<sub>p</sub>/F<sub>pk</sub>', unit: '%', d: 0 });
  const sDe = stat(out, { label: 'Rugalmas megnyúlás P<sub>p</sub>-nél', unit: 'mm', d: 1 });
  const sLk = stat(out, { label: 'Lekötési erő', unit: 'kN', d: 0 });
  let prog = 1, anim = false, t0 = 0;
  const seq = [0.1, 0.4, 0.1, 0.55, 0.1, 0.7, 0.1, 0.85, 0.1, 1.0, 1.0, 0.1, -1];
  function path() {
    const n = sN.v, A = n * 150, E = 195000, Td = sTd.v, Pp = 1.25 * Td, Lapp = (sLf.v + sLb.v / 2) * 1000;
    const de = (P) => (P * 1000 * Lapp) / (E * A);
    const el = (P) => de(P) - de(0.1 * Pp);                 // rugalmas rész a 0,1·Pp alapterheléstől
    const dp = (f) => 0.11 * el(Pp) * f * f;                // maradó elmozdulás a csúcsterhelés függvényében (becslés)
    const pts = [[0, 0.1 * Pp]]; let hold = 0, peakPrev = 0.1;
    const peaks = [0.4, 0.55, 0.7, 0.85, 1.0];
    for (const f of peaks) {
      const d0 = dp(peakPrev), d1 = dp(f);
      for (let k = 1; k <= 14; k++) { const P = Pp * (0.1 + (f - 0.1) * k / 14); const r = (P - 0.1 * Pp) / ((f - 0.1) * Pp); pts.push([d0 + el(P) + (d1 - d0) * r * r, P]); }
      if (f === 1.0) { const last = pts[pts.length - 1]; for (let k = 1; k <= 8; k++) pts.push([last[0] + 1.2 * Math.log10(1 + k), Pp]); hold = pts.length - 1; }
      const cr = f === 1.0 ? 1.2 * Math.log10(9) : 0;
      for (let k = 1; k <= 10; k++) { const P = Pp * (f - (f - 0.1) * k / 10); pts.push([d1 + cr + el(P), P]); }
      peakPrev = f;
    }
    const base = pts[pts.length - 1][0], Plo = (sLo.v / 100) * Td;
    for (let k = 1; k <= 10; k++) { const P = 0.1 * Pp + (Plo - 0.1 * Pp) * k / 10; pts.push([base + el(P), P]); }
    return { pts, Pp, hold, de: el(Pp), Fpk: n * 279 };
  }
  function draw() {
    clear(g);
    const D = path();
    const x0 = 70, y0 = HH - 46, w = W - 110, hh = HH - 90;
    const xmax = Math.max(...D.pts.map((p) => p[0])) * 1.15 + 1;
    const ymax = Math.max(D.Pp * 1.1, D.Fpk * 0.85);
    const X = (v) => x0 + (v / xmax) * w, Y = (v) => y0 - (v / ymax) * hh;
    // rács
    for (let i = 0; i <= 5; i++) { const v = (ymax / 5) * i; svg('line', { x1: x0, y1: Y(v), x2: x0 + w, y2: Y(v), class: 'grid' }, g); txt(g, x0 - 6, Y(v) + 4, fmt(v, 0), 't-sm', 'end'); }
    for (let i = 0; i <= 5; i++) { const v = (xmax / 5) * i; svg('line', { x1: X(v), y1: y0, x2: X(v), y2: y0 - hh, class: 'grid' }, g); txt(g, X(v), y0 + 16, fmt(v, 0), 't-sm', 'middle'); }
    txt(g, x0 + w, y0 + 34, 'fejelmozdulás [mm]', 't-sm', 'end');
    txt(g, x0 - 50, y0 - hh - 12, 'P [kN]', 't-sm');
    // határvonalak
    const l80 = 0.8 * D.Fpk;
    if (l80 < ymax) { svg('line', { x1: x0, y1: Y(l80), x2: x0 + w, y2: Y(l80), class: 's-bad', 'stroke-dasharray': '6 5', 'stroke-width': 1.2 }, g); txt(g, x0 + w - 4, Y(l80) - 5, '0,8·F_pk (vizsgálati határ)', 't-sm t-bad halo', 'end'); }
    svg('line', { x1: x0, y1: Y(sTd.v), x2: x0 + w, y2: Y(sTd.v), class: 's-muted', 'stroke-dasharray': '3 4' }, g);
    txt(g, x0 + 4, Y(sTd.v) - 5, 'T_d', 't-sm halo');
    // görbe a haladásig
    const n = D.pts.length - 1;
    const upto = prog * n;
    const vis = [];
    for (let i = 0; i <= Math.floor(upto); i++) vis.push(D.pts[i]);
    if (upto < n) { const i = Math.floor(upto), f = upto - i; const a = D.pts[i], b = D.pts[i + 1]; vis.push([a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f]); }
    svg('path', { d: P(vis.map(([x, y]) => [X(x), Y(y)])), class: 'mt-curve', fill: 'none' }, g);
    const nvis = vis.length;
    [0.4, 0.55, 0.7, 0.85, 1.0].forEach((f, i) => {
      const idx = 1 + i * 24 + 14 - 1 + (f === 1.0 ? 0 : 0);
      if (idx < nvis) { const q = D.pts[idx]; svg('circle', { cx: X(q[0]), cy: Y(q[1]), r: 3.5, class: 'f-grp' }, g); txt(g, X(q[0]) - 6, Y(q[1]) - 7, fmt(f, 2).replace(/0$/, '') + '·P_p', 't-sm halo', 'end'); }
    });
    const last = vis[vis.length - 1];
    svg('circle', { cx: X(last[0]), cy: Y(last[1]), r: 5, class: 'f-acc' }, g);
    if (prog >= 1) {
      const lo = D.pts[D.pts.length - 1];
      txt(g, X(lo[0]) + 8, Y(lo[1]) + 4, `lekötés: ${fmt(lo[1], 0)} kN`, 't-num halo');
      txt(g, X(D.pts[D.hold][0]) + 8, Y(D.pts[D.hold][1]) - 6, 'tartás – kúszás mérése', 't-sm halo');
    }
    sPp.set(D.Pp);
    const u = D.Pp / D.Fpk * 100;
    sU.set(u, u > 80 ? 'bad' : u > 70 ? 'warn' : 'ok');
    sDe.set(D.de);
    sLk.set((sLo.v / 100) * sTd.v);
  }
  [sN, sLf, sLb, sTd, sLo].forEach((s) => s.on(() => { prog = 1; draw(); }));
  bGo.onclick = () => { anim = true; prog = 0; t0 = performance.now(); };
  draw();
  loop(fig, () => { if (!anim) return; prog = clamp((performance.now() - t0) / 9000, 0, 1); if (prog >= 1) anim = false; draw(); });
});

/* ================================================================ 5. Acél csőtámasz: kihajlás + hőmérséklet */
register('csotamasz', (root) => {
  const { ctrls, viz, out } = shell(root, { foot: 'Szemléltető számítás (EN 1993-1-1 szerinti kihajlás, melegen hengerelt cső: „a” görbe, α = 0,21; γ<sub>M1</sub> = 1,0; csuklós végek, kihajlási hossz = L). A gátolt hőtágulásból: ΔN = α<sub>T</sub>·E·A·ΔT·b, α<sub>T</sub> = 1,2·10⁻⁵ 1/°C, b = gátoltság (merev fal + merev talaj ≈ 0,7, merev fal + gyenge talaj ≈ 0,5). Az önsúlyból adódó hajlítást itt nem vesszük figyelembe.' });
  const sL = slider(ctrls, { label: 'Dúchossz (gödörszélesség)', sym: 'L', min: 4, max: 40, step: 0.5, value: 18, unit: 'm' });
  const sD = slider(ctrls, { label: 'Csőátmérő', sym: 'D', min: 300, max: 1500, step: 10, value: 610, unit: 'mm' });
  const sTk = slider(ctrls, { label: 'Falvastagság', sym: 't', min: 8, max: 30, step: 0.5, value: 12.5, unit: 'mm' });
  const sS = seg(ctrls, { label: 'Acélminőség', options: [{ v: 235, t: 'S235' }, { v: 275, t: 'S275' }, { v: 355, t: 'S355' }], value: 355 });
  const sN = slider(ctrls, { label: 'Dúcerő a földnyomásból', sym: 'N<sub>Ed</sub>', min: 0, max: 8000, step: 50, value: 2500, unit: 'kN' });
  const sT = slider(ctrls, { label: 'Felmelegedés', sym: 'ΔT', min: 0, max: 40, step: 1, value: 20, unit: '°C' });
  const sB = slider(ctrls, { label: 'Gátoltság', sym: 'b', min: 0.3, max: 0.7, step: 0.05, value: 0.5, d: 2 });
  const tDay = toggle(ctrls, { label: 'Napi hőmérséklet-ciklus (animáció)', value: false });
  const W = 760, HH = 430;
  const fig = figure(scrollBox(viz), W, HH);
  const g = svg('g', {}, fig);
  const oNcr = stat(out, { label: 'Euler-féle kritikus erő', unit: 'kN', d: 0 });
  const oNb = stat(out, { label: 'Kihajlási ellenállás N<sub>b,Rd</sub>', unit: 'kN', d: 0 });
  const oDT = stat(out, { label: 'Hőmérsékleti többleterő', unit: 'kN', d: 0 });
  const oU = stat(out, { label: 'Kihasználtság', unit: '%', d: 0 });
  const vd = verdict(out); vd.el.style.gridColumn = '1 / -1';
  let hour = 14;
  const calc = (L, dT) => {
    const D = sD.v, t = Math.min(sTk.v, D / 2 - 1), fy = +sS.v, E = 210000;
    const A = (Math.PI / 4) * (D * D - (D - 2 * t) ** 2), I = (Math.PI / 64) * (D ** 4 - (D - 2 * t) ** 4);
    const Npl = (A * fy) / 1000, Ncr = (Math.PI ** 2 * E * I) / ((L * 1000) ** 2) / 1000;
    const lb = Math.sqrt(Npl / Ncr), ph = 0.5 * (1 + 0.21 * (lb - 0.2) + lb * lb);
    const chi = Math.min(1, 1 / (ph + Math.sqrt(Math.max(0, ph * ph - lb * lb))));
    const dN = (1.2e-5 * E * A * dT * sB.v) / 1000;
    return { A, I, Npl, Ncr, lb, chi, Nb: chi * Npl, dN };
  };
  function draw() {
    clear(g);
    const dT = tDay.v ? sT.v * (0.5 - 0.5 * Math.cos(((hour - 7) / 24) * 2 * Math.PI)) : sT.v; // 7 óra körül minimum, 19 óra körül maximum
    const c = calc(sL.v, dT);
    const NEd = sN.v + c.dN, u = NEd / c.Nb;
    // ------- felső rész: keresztmetszet a gödrön át
    const y0 = 40, xl = 60, xr = W - 60, ys = 120;
    svg('rect', { x: 0, y: 0, width: W, height: y0, class: 'f-sky' }, g);
    // nap
    const sunx = tDay.v ? xl + ((hour - 6) / 14) * (xr - xl) : W - 90;
    const suny = tDay.v ? 30 - Math.sin(((hour - 6) / 14) * Math.PI) * 14 + 6 : 22;
    if (!tDay.v || (hour > 6 && hour < 20)) { svg('circle', { cx: sunx, cy: suny, r: 11, class: 'mt-sun' }, g); }
    svg('rect', { x: 0, y: y0, width: xl, height: 190, class: 'f-soilA' }, g);
    svg('rect', { x: xr, y: y0, width: W - xr, height: 190, class: 'f-soilA' }, g);
    svg('rect', { x: xl, y: y0, width: 14, height: 190, class: 'f-conc' }, g);
    svg('rect', { x: xr - 14, y: y0, width: 14, height: 190, class: 'f-conc' }, g);
    svg('rect', { x: xl + 14, y: ys - 14, width: 12, height: 28, class: 'f-steel2' }, g);
    svg('rect', { x: xr - 26, y: ys - 14, width: 12, height: 28, class: 'f-steel2' }, g);
    const x1 = xl + 26, x2 = xr - 26;
    const bow = clamp((u - 0.6) / 0.4, 0, 1.4) * 22 * (u > 1 ? 1.6 : 1);
    const pts = []; for (let i = 0; i <= 40; i++) { const f = i / 40; pts.push([x1 + (x2 - x1) * f, ys - Math.sin(Math.PI * f) * bow]); }
    const thick = clamp(sD.v / 50, 8, 26);
    svg('path', { d: P(pts), class: u > 1 ? 'mt-strut-bad' : 'mt-strut-l', 'stroke-width': thick, fill: 'none', 'stroke-linecap': 'butt' }, g);
    svg('path', { d: P(pts), class: 'mt-strut-hl', 'stroke-width': thick * 0.25, fill: 'none', transform: `translate(0 ${-thick * 0.22})` }, g);
    // illesztések 12 m-enként
    const nSeg = Math.ceil(sL.v / 12);
    for (let i = 1; i < nSeg; i++) { const f = i / nSeg; const x = x1 + (x2 - x1) * f; svg('rect', { x: x - 3, y: ys - Math.sin(Math.PI * f) * bow - thick / 2 - 4, width: 6, height: thick + 8, class: 'f-steel2' }, g); }
    if (sL.v > 26) { const xm = (x1 + x2) / 2; svg('rect', { x: xm - 5, y: ys + thick / 2, width: 10, height: 105, class: 'f-steel2' }, g); txt(g, xm + 10, ys + 90, 'közbenső alátámasztás (cölöpön)', 't-sm halo'); }
    arr(g, x1 - 18, ys, x1 + 4, ys, 'mt-ar-acc', 3, 9); arr(g, x2 + 18, ys, x2 - 4, ys, 'mt-ar-acc', 3, 9);
    txt(g, (x1 + x2) / 2, ys + 40, `L = ${fmt(sL.v, 1)} m · Ø${fmt(sD.v, 0)}×${fmt(sTk.v, 1)} mm · S${sS.v}`, 't-num halo', 'middle');
    txt(g, (x1 + x2) / 2, ys + 58, `${nSeg} db ${sL.v / nSeg <= 12 ? '≤12' : fmt(sL.v / nSeg, 1)} m-es csőelem, karimás toldással`, 't-sm halo', 'middle');
    if (tDay.v) txt(g, 20, y0 + 220, `${String(Math.floor(hour)).padStart(2, '0')}:${String(Math.floor((hour % 1) * 60)).padStart(2, '0')} · ΔT = ${fmt(dT, 1)} °C · N = ${fmt(NEd, 0)} kN`, 't-num halo');
    // ------- alsó rész: N_b,Rd(L) görbe
    const px0 = 80, py0 = HH - 34, pw = W - 120, ph = 150;
    const Nmax = Math.max(calc(4, 0).Npl, NEd) * 1.05;
    const X = (L) => px0 + ((L - 4) / 36) * pw, Y = (N) => py0 - (N / Nmax) * ph;
    svg('line', { x1: px0, y1: py0, x2: px0 + pw, y2: py0, class: 'axis' }, g);
    svg('line', { x1: px0, y1: py0, x2: px0, y2: py0 - ph, class: 'axis' }, g);
    for (let L = 4; L <= 40; L += 4) txt(g, X(L), py0 + 14, String(L), 't-sm', 'middle');
    txt(g, px0 + pw, py0 + 28, 'dúchossz L [m]', 't-sm', 'end');
    for (let k = 0; k <= 4; k++) { const N = (Nmax / 4) * k; txt(g, px0 - 6, Y(N) + 4, fmt(N, 0), 't-sm', 'end'); svg('line', { x1: px0, y1: Y(N), x2: px0 + pw, y2: Y(N), class: 'grid' }, g); }
    txt(g, px0 - 60, py0 - ph - 8, 'N [kN]', 't-sm');
    const curve = [], eul = [];
    for (let L = 4; L <= 40; L += 0.5) { const cc = calc(L, 0); curve.push([X(L), Y(cc.Nb)]); if (cc.Ncr < Nmax * 1.2) eul.push([X(L), Y(Math.min(cc.Ncr, Nmax * 1.2))]); }
    svg('rect', { x: X(10), y: py0 - ph, width: X(15) - X(10), height: ph, class: 'mt-band' }, g);
    txt(g, X(12.5), py0 - ph + 12, '10–15 m felett: a hőtágulás meghatározó', 't-sm halo', 'middle');
    svg('rect', { x: X(26), y: py0 - ph, width: X(40) - X(26), height: ph, class: 'mt-band2' }, g);
    if (eul.length > 1) svg('path', { d: P(eul), class: 's-muted', fill: 'none', 'stroke-dasharray': '4 4' }, g);
    svg('path', { d: P(curve), class: 'mt-curve', fill: 'none' }, g);
    svg('line', { x1: px0, y1: Y(NEd), x2: px0 + pw, y2: Y(NEd), class: u > 1 ? 's-bad' : 's-ok', 'stroke-width': 1.6, 'stroke-dasharray': '7 5' }, g);
    svg('line', { x1: px0, y1: Y(sN.v), x2: px0 + pw, y2: Y(sN.v), class: 's-muted', 'stroke-width': 1, 'stroke-dasharray': '2 4' }, g);
    txt(g, px0 + pw - 4, Y(NEd) - 5, `N_Ed + ΔN_T = ${fmt(NEd, 0)} kN`, 't-num halo', 'end');
    svg('circle', { cx: X(sL.v), cy: Y(c.Nb), r: 6, class: u > 1 ? 'f-bad' : 'f-acc' }, g);
    txt(g, X(sL.v) + 9, Y(c.Nb) - 8, 'N_b,Rd', 't-sm halo');
    oNcr.set(c.Ncr); oNb.set(c.Nb); oDT.set(c.dN);
    oU.set(u * 100, u > 1 ? 'bad' : u > 0.85 ? 'warn' : 'ok');
    const m = [];
    if (u > 1) m.push('A dúc kihajlik! Nagyobb átmérő / falvastagság, jobb acél, rövidebb kihajlási hossz (közbenső alátámasztás) vagy sűrűbb dúckiosztás kell.');
    if (sL.v > 26) m.push('25–28 m felett közbenső alátámasztás szükséges.');
    if (sL.v > 12) m.push(`${fmt(sL.v, 1)} m: a szállítható (jellemzően 12 m, különleges esetben 14–18 m-es) elemekből toldással állítják össze.`);
    if (c.dN > 0.15 * c.Nb && sL.v >= 10) m.push(`A hőmérsékleti többleterő a teherbírás ${fmt((c.dN / c.Nb) * 100, 0)}%-a – 10–15 m-nél hosszabb dúcnál erre méretezni kell.`);
    vd.set(u > 1 ? 'bad' : u > 0.85 ? 'warn' : 'ok', u > 1 ? 'Kihajlás!' : u > 0.85 ? 'Közel a határhoz' : 'Megfelel', m.length ? '<ul class="mt-ul">' + m.map((x) => `<li>${x}</li>`).join('') + '</ul>' : 'A dúc a földnyomásból és a felmelegedésből adódó erőt is biztonsággal viseli.');
  }
  [sL, sD, sTk, sS, sN, sT, sB, tDay].forEach((s) => s.on(draw));
  draw();
  loop(fig, (t, dt) => { if (!tDay.v) return; hour = (hour + dt * 1.6) % 24; draw(); });
});

/* ================================================================ 6. Top-down – öt fázis */
const TD = [
  { t: 'Kiinduló állapot', d: 'Belvárosi utca: a felszín alatt épül majd egy többszintes műtárgy (mélygarázs, metróállomás, aluljáró).' },
  { t: '1. Határoló falak építése', d: 'Először a munkatérhatároló szerkezetei készülnek – résfal vagy cölöpfal –, a felszínről. Csak erre az időre kell elterelni a forgalmat.' },
  { t: '2. Közbenső alapozás és pillérek', d: 'Ha közbenső támaszok is vannak, felülről elkészítik azok alapozását (fúrt cölöp, barett), és elhelyezik a pilléreket: az acéloszlopot a friss betonba engedik. Hazánkban jellemzően a végleges pillérek mellett ideiglenes acéloszlop készül.' },
  { t: '3. Felső támaszfödém', d: 'Kb. 1–2 m kiemelés után földzsalun (sovány beton + fólia) elkészül a felső födém – zsaluállvány nélkül. Tárcsaként megtámasztja a falakat; benne kitermelő nyílás marad, a felszín helyreállítható.' },
  { t: '4. Kiemelés és közbenső födém', d: 'A további szinteket bányászati módszerrel, kis gépekkel emelik ki a födém alatt; a föld a nyíláson, szállítóalagúton vagy „zseben” át távozik. A közbenső födém is a talajra fektetve készül.' },
  { t: '5. Kiemelés és alaplemez', d: 'A teljes földkiemelés és a födémek elkészülte után készül az alaplemez; a pilléreket betonköpeny veszi körül. Ideiglenes dúcra, horgonyra nem volt szükség.' },
];
register('topdown', (root) => {
  const { ctrls, viz } = shell(root, { out: false });
  const sPh = seg(ctrls, { label: 'Építési fázis', vert: true, options: TD.map((p, i) => ({ v: i, t: p.t })), value: 0 });
  const tUp = toggle(ctrls, { label: 'Felépítmény párhuzamosan (épületnél)', value: false });
  const bPlay = h('button', { type: 'button', class: 'btn btn-line btn-sm' }, '▶ Lejátszás');
  ctrls.append(bPlay);
  const info = h('div', { class: 'steptext' }); viz.prepend(info);
  const W = 760, HH = 440;
  const fig = figure(scrollBox(viz), W, HH);
  const g = svg('g', {}, fig);
  let tt = 0, timer = 0;
  function draw() {
    clear(g);
    const ph = sPh.v;
    const y0 = 150, xl = 150, xr = 610, zb = 410, sc = 22; // px/m
    const Y = (z) => y0 + z * sc;
    const lv = [0.8, 5.6, 10.4]; // födémszintek (m) – felső, közbenső, alaplemez teteje ~ 10,4
    // ég, felszín
    svg('rect', { x: 0, y: 0, width: W, height: y0, class: 'f-sky' }, g);
    svg('rect', { x: 0, y: y0, width: W, height: HH - y0, class: 'f-soilB' }, g);
    svg('rect', { x: 0, y: y0, width: W, height: HH - y0, fill: 'url(#pat-soil)' }, g);
    // kiemelés állapota
    let exc = 0;
    if (ph >= 3) exc = lv[0] + 0.4;
    if (ph >= 4) exc = lv[1] + 0.4;
    if (ph >= 5) exc = 11.2;
    if (exc > 0) svg('rect', { x: xl + 12, y: y0, width: xr - xl - 24, height: exc * sc, class: 'mt-cavity' }, g);
    // falak
    if (ph >= 1) for (const x of [xl, xr - 12]) { svg('rect', { x, y: y0, width: 12, height: zb - y0 + 10, class: 'f-conc' }, g); svg('rect', { x, y: y0, width: 12, height: zb - y0 + 10, fill: 'url(#pat-conc)' }, g); }
    // pillér + cölöp
    const xc = (xl + xr) / 2;
    if (ph >= 2) {
      svg('rect', { x: xc - 14, y: Y(11.6), width: 28, height: 90, class: 'f-conc2' }, g);
      svg('rect', { x: xc - 4, y: y0, width: 8, height: Y(11.6) - y0 + 22, class: 'f-steel2' }, g);
      if (ph === 2) { svg('rect', { x: xc - 40, y: y0 - 18, width: 80, height: 12, class: 'f-acc' }, g); txt(g, xc + 14, y0 + 40, 'vezetőkeret – az acéloszlopot a friss betonba engedik', 't-sm halo'); }
      if (ph >= 5) svg('rect', { x: xc - 9, y: y0 + 1 * sc, width: 18, height: Y(10.4) - y0 - sc, class: 'f-conc', opacity: 0.85 }, g);
    }
    // födémek
    const slab = (z, label, open = true) => {
      svg('rect', { x: xl + 12, y: Y(z) - 8, width: xr - xl - 24, height: 12, class: 'f-conc' }, g);
      svg('rect', { x: xl + 12, y: Y(z) + 4, width: xr - xl - 24, height: 3, class: 'mt-lean' }, g);
      if (open) svg('rect', { x: xl + 60, y: Y(z) - 8, width: 70, height: 15, class: 'mt-cavity' }, g);
      txt(g, xl + 22, Y(z) + 20, label, 't-sm halo');
    };
    if (ph >= 3) slab(lv[0], 'felső támaszfödém (földzsalun)');
    if (ph >= 4) slab(lv[1], 'közbenső födém');
    if (ph >= 5) { svg('rect', { x: xl + 12, y: Y(10.6), width: xr - xl - 24, height: 16, class: 'f-conc2' }, g); txt(g, xl + 22, Y(10.6) + 30, 'alaplemez', 't-sm halo'); }
    // gépek és szállítás
    const mini = (x, z) => { const gg = svg('g', { transform: `translate(${x} ${Y(z)})` }, g); svg('rect', { x: -16, y: -10, width: 32, height: 7, rx: 2, class: 'f-acc' }, gg); svg('rect', { x: -4, y: -19, width: 14, height: 10, class: 'f-acc' }, gg); svg('path', { d: `M 6 -15 L 26 ${-26 + Math.sin(tt * 3) * 4} L 36 -6`, class: 'mt-boom', 'stroke-width': 3, fill: 'none' }, gg); svg('rect', { x: -18, y: -4, width: 36, height: 4, rx: 2, class: 'f-ink' }, gg); };
    if (ph === 3) mini(xl + 200, 0.75);
    if (ph === 4) { mini(xl + 220, lv[1] - 0.1); mini(xl + 330, lv[1] - 0.1); }
    if (ph === 5) mini(xl + 250, 10.4);
    if (ph >= 3 && ph <= 5) {
      // daru-kübel a nyíláson át
      const k = (Math.sin(tt * 1.4) + 1) / 2;
      const bx = xl + 95, by = y0 - 40 + k * (Y(ph === 3 ? 0.6 : ph === 4 ? 5 : 9.6) - y0 + 30);
      svg('line', { x1: bx, y1: 20, x2: bx, y2: by, class: 's-ink', 'stroke-width': 1.2 }, g);
      svg('rect', { x: bx - 9, y: by, width: 18, height: 12, class: 'f-steel2' }, g);
      svg('rect', { x: bx - 60, y: 14, width: 120, height: 6, class: 'f-acc' }, g);
      txt(g, bx + 14, by + 10, 'kitermelés', 't-sm halo');
      // szellőzés, világítás
      if (ph >= 4) { svg('path', { d: `M ${xr - 40} ${Y(lv[0]) + 14} q 30 40 -60 70`, class: 'mt-duct', fill: 'none', 'stroke-width': 7 }, g); txt(g, xr - 30, Y(lv[0]) + 40, 'szellőzés', 't-sm halo', 'end'); for (let i = 0; i < 5; i++) svg('circle', { cx: xl + 60 + i * 80, cy: Y(lv[0]) + 14, r: 3, class: 'mt-lamp' }, g); }
    }
    // forgalom a felszínen
    const traffic = (ph === 0 || ph >= 3) && !tUp.v;
    svg('rect', { x: 0, y: y0 - 6, width: W, height: 6, class: 'mt-road' }, g);
    if (traffic) for (let i = 0; i < 4; i++) { const x = ((tt * 60 + i * 210) % (W + 80)) - 40; const gg = svg('g', { transform: `translate(${x} ${y0 - 6})` }, g); svg('rect', { x: -18, y: -12, width: 36, height: 9, rx: 3, class: i % 2 ? 'f-steelc' : 'f-bad' }, gg); svg('rect', { x: -10, y: -18, width: 18, height: 7, rx: 2, class: i % 2 ? 'f-steelc' : 'f-bad' }, gg); svg('circle', { cx: -10, cy: -2, r: 3, class: 'f-ink' }, gg); svg('circle', { cx: 10, cy: -2, r: 3, class: 'f-ink' }, gg); }
    else if (ph === 1 || ph === 2) { for (let i = 0; i < 5; i++) svg('rect', { x: xl - 30 + i * 120, y: y0 - 26, width: 12, height: 20, class: 'mt-cone' }, g); txt(g, xc, y0 - 40, 'forgalomterelés – csak a falak építése idejére', 't-sm halo', 'middle'); }
    // felépítmény
    if (tUp.v && ph >= 3) {
      const fl = ph === 3 ? 1 : ph === 4 ? 3 : 5;
      const bx0 = xl + 150, bw = xr - xl - 170;
      for (let i = 0; i < fl; i++) { svg('rect', { x: bx0, y: y0 - 6 - (i + 1) * 20, width: bw, height: 18, class: 'f-bld' }, g); for (let j = 0; j < 6; j++) svg('rect', { x: bx0 + 14 + j * 48, y: y0 - 6 - (i + 1) * 20 + 5, width: 20, height: 8, class: 'f-bld2' }, g); }
      txt(g, bx0 + 6, y0 - 6 - fl * 20 - 6, 'felépítmény – közben épül felfelé', 't-sm halo');
    }
    info.innerHTML = `<b class="mt-st">${TD[ph].t}</b>${TD[ph].d}`;
  }
  sPh.on(draw); tUp.on(draw);
  bPlay.onclick = () => {
    clearInterval(timer);
    sPh.set(0);
    timer = setInterval(() => { if (sPh.v >= TD.length - 1) return clearInterval(timer); sPh.set(sPh.v + 1); }, 2200);
  };
  draw();
  loop(fig, (t) => { tt = t; draw(); });
});

/* ================================================================ 7. Passzív hátrahorgonyzás – hol álljon a horgonyfal? */
register('passziv', (root) => {
  const { ctrls, viz, out } = shell(root, { foot: 'Elhelyezési szabály: a fő fal aktív éke és a horgonyfal passzív éke nem fedheti egymást. Itt a fő fal talppontjából 45° + φ/2, a horgonyfal alsó élétől 45° − φ/2 hajlású síkokat rajzolunk (biztonságos oldalon lévő egyszerűsítés). Az elmozdulás szemléltető, torzított.' });
  const sH = slider(ctrls, { label: 'Kiemelési mélység', sym: 'H', min: 2, max: 8, step: 0.5, value: 5, unit: 'm' });
  const sDd = slider(ctrls, { label: 'A fő fal befogása', sym: 'd', min: 1, max: 6, step: 0.5, value: 3, unit: 'm' });
  const sPhi = slider(ctrls, { label: 'Belső súrlódási szög', sym: 'φ', min: 24, max: 40, step: 1, value: 30, unit: '°' });
  const sHa = slider(ctrls, { label: 'Horgonyfal magassága', sym: 'h<sub>a</sub>', min: 1.5, max: 4, step: 0.25, value: 2.5, unit: 'm' });
  const sL = slider(ctrls, { label: 'A horgonyfal távolsága', sym: 'L', min: 2, max: 20, step: 0.25, value: 7, unit: 'm' });
  const sT = slider(ctrls, { label: 'A horgonyrúd mélysége', min: 0.8, max: 1.0, step: 0.05, value: 0.9, unit: 'm', d: 2, hint: 'Jellemzően 0,8–1,0 m-re a felszín alatt, keskeny árokban.' });
  const bGo = h('button', { type: 'button', class: 'btn btn-line btn-sm' }, '▶ Kiemelés');
  ctrls.append(bGo);
  const W = 760, HH = 360;
  const fig = figure(scrollBox(viz), W, HH);
  const g = svg('g', {}, fig);
  const oMin = stat(out, { label: 'Szükséges távolság L<sub>min</sub>', unit: 'm', d: 1 });
  const oRat = stat(out, { label: 'L / H', d: 2 });
  const oSt = stat(out, { label: 'Állapot' });
  const vd = verdict(out); vd.el.style.gridColumn = '1 / -1';
  let ex = 1, anim = false, t0 = 0;
  function draw() {
    clear(g);
    const H = sH.v, d = sDd.v, phi = sPhi.v, ha = sHa.v, L = sL.v;
    const ca = 1 / Math.tan(rad(45 + phi / 2)), cp = 1 / Math.tan(rad(45 - phi / 2));
    const xa = (H + d) * ca;        // az aktív sík felszíni pontja a faltól
    const xpS = L - ha * cp;        // a passzív sík felszíni pontja
    const Lmin = xa + ha * cp;
    const inside = L < (H + d - ha) * ca; // a horgonyfal alja az aktív éken belül
    const state = inside ? 'bad' : L < Lmin ? 'warn' : 'ok';
    const xw = 170, y0 = 80;
    const sc = Math.min(30, (W - xw - 30) / Math.max(L + 3, Lmin + 2, 8), (HH - y0 - 20) / (H + d + 1));
    const X = (x) => xw + x * sc, Y = (z) => y0 + z * sc;
    const e = ex * H;
    const mv = ex * (state === 'ok' ? 6 : state === 'warn' ? 12 : 22); // px – torzított elmozdulás
    svg('rect', { x: 0, y: 0, width: W, height: y0, class: 'f-sky' }, g);
    svg('rect', { x: xw, y: y0, width: W - xw, height: HH - y0, class: 'f-soilA' }, g);
    svg('rect', { x: xw, y: y0, width: W - xw, height: HH - y0, fill: 'url(#pat-sand)' }, g);
    svg('rect', { x: 0, y: Y(e), width: xw, height: HH - Y(e), class: 'f-soilA' }, g);
    svg('rect', { x: 0, y: y0, width: xw, height: Y(e) - y0, class: 'mt-cavity', opacity: 0.35 }, g);
    // ékek
    svg('path', { d: P([[X(0), Y(H + d)], [X(xa), y0], [X(0), y0]]) + ' Z', class: 'mt-wedge-a' }, g);
    svg('path', { d: P([[X(L), Y(ha)], [X(xpS), y0], [X(L), y0]]) + ' Z', class: 'mt-wedge-p' }, g);
    svg('line', { x1: X(0), y1: Y(H + d), x2: X(xa), y2: y0, class: 'mt-slip', 'stroke-width': 2, 'stroke-dasharray': '8 6' }, g);
    svg('line', { x1: X(L), y1: Y(ha), x2: X(xpS), y2: y0, class: 's-steel', 'stroke-width': 2, 'stroke-dasharray': '8 6' }, g);
    txt(g, X(xa * 0.35), Y((H + d) * 0.45), 'aktív ék', 't-lab t-bad halo', 'middle');
    txt(g, X(L) + 8, Y(ha) + 4, '← passzív ék', 't-lab t-steel halo');
    // fő fal (elmozdulással)
    const wallTop = [X(0) - mv * 0.9, y0 - 8], wallBot = [X(0) - mv * 0.2, Y(H + d)];
    svg('path', { d: P([[wallTop[0] - 6, wallTop[1]], [wallTop[0], wallTop[1]], [wallBot[0], wallBot[1]], [wallBot[0] - 6, wallBot[1]]]) + ' Z', class: 'f-steel2' }, g);
    // horgonyfal
    svg('rect', { x: X(L) - 3 - mv * 0.15, y: y0 - 6, width: 6, height: ha * sc + 6, class: 'f-steel2' }, g);
    // rúd
    const tension = ex * (state === 'bad' ? 0.3 : 1);
    svg('line', { x1: wallTop[0], y1: Y(sT.v), x2: X(L) - mv * 0.15, y2: Y(sT.v), class: 'mt-rod', 'stroke-width': 4, style: `stroke: color-mix(in srgb, var(--bad) ${Math.round(tension * 100)}%, var(--steelm2))` }, g);
    svg('rect', { x: (wallTop[0] + X(L)) / 2 - 10, y: Y(sT.v) - 5, width: 20, height: 10, rx: 3, class: 'f-ink' }, g);
    txt(g, (wallTop[0] + X(L)) / 2, Y(sT.v) - 10, 'feszítőzár', 't-sm halo', 'middle');
    // árok
    svg('rect', { x: X(0), y: y0, width: X(L) - X(0), height: sT.v * sc + 4, class: 'mt-trench' }, g);
    // méretek
    svg('line', { x1: X(0), y1: y0 - 30, x2: X(L), y2: y0 - 30, class: 's-muted' }, g);
    txt(g, (X(0) + X(L)) / 2, y0 - 36, `L = ${fmt(L, 2)} m`, 't-num halo', 'middle');
    svg('line', { x1: X(0), y1: y0 - 52, x2: X(Lmin), y2: y0 - 52, class: 's-ok', 'stroke-dasharray': '4 3' }, g);
    txt(g, X(Lmin) + 4, y0 - 48, `L_min = ${fmt(Lmin, 1)} m`, 't-sm t-ok halo');
    svg('line', { x1: 30, y1: y0, x2: 30, y2: Y(H), class: 's-muted' }, g);
    txt(g, 36, (y0 + Y(H)) / 2, `H = ${fmt(H, 1)} m`, 't-num halo');
    if (ex > 0.95) txt(g, X(0) - mv - 12, y0 + 20, '← néhány cm', 't-sm t-bad halo', 'end');
    oMin.set(Lmin); oRat.set(L / H);
    oSt.set(0, state, state === 'ok' ? 'rendben' : state === 'warn' ? 'átfedés' : 'éken belül');
    vd.set(state, state === 'ok' ? 'A horgonyfal jó helyen van' : state === 'warn' ? 'Az ékek átfedik egymást – csökkent ellenállás' : 'A horgonyfal az aktív éken belül van – nincs ellenállás',
      state === 'ok' ? 'A két csúszólap legfeljebb a terepen találkozik: a horgonyfal előtt a teljes passzív ék kialakulhat. Feszítés nélkül a fal néhány cm-t mozdul, mire a rúd megfeszül.'
        : state === 'warn' ? `A passzív ék belelóg a fő fal mozgó földékébe. Told hátrébb a horgonyfalat legalább ${fmt(Lmin, 1)} m-re – vagy mélyebb, rövidebb horgonyfal kell.`
          : 'A horgonyfal a földdel együtt mozdul: a rúd nem kap ellenállást. Rossz helyen a horgonyfal semmit sem ér!');
  }
  [sH, sDd, sPhi, sHa, sL, sT].forEach((s) => s.on(() => { if (!anim) ex = 1; draw(); }));
  bGo.onclick = () => { anim = true; t0 = performance.now(); ex = 0; };
  draw();
  loop(fig, () => { if (!anim) return; ex = clamp((performance.now() - t0) / 3500, 0, 1); if (ex >= 1) anim = false; draw(); });
});

/* ================================================================ kvíz */
defineQuiz('megtamasztas', 'Kvíz – megtámasztó szerkezetek', [
  { q: 'Konzolosan (egyéb megtámasztás nélkül) kb. milyen kiemelési mélységig állékonyak a befogott munkatérhatároló falak?', a: ['max. 4–6 m-ig', 'max. 1 m-ig', '15–20 m-ig', 'bármilyen mélységig, ha elég hosszú a fal'], c: 0, e: 'Csak pár méteres, max. 4–6 m-es kiemelésig – és csak ha közvetlenül mellettük nincs építmény.' },
  { q: 'Melyik NEM a munkatérhatároló falak négy statikai alaptípusa közül való?', a: ['Több szinten befogott, megtámasztás nélküli', 'Szabadon álló, befogott', 'Egy szinten megtámasztott, szabadon támaszkodó', 'Több szinten megtámasztott, szabadon támaszkodó'], c: 0, e: 'A négy típus: szabadon álló befogott; egy szinten megtámasztott szabadon támaszkodó; egy szinten megtámasztott befogott; több szinten megtámasztott szabadon támaszkodó.' },
  { q: 'Hol történik a talajhorgonyban az erőátadás a talajra?', a: ['A befogott (injektált) szakaszon, az aktív csúszólapon túl', 'A horgonyfejnél', 'A szabad szakasz teljes hosszán', 'Egyenletesen a horgony teljes hosszán'], c: 0, e: 'A szabad szakasz védőcsőben fut, nincs erőátadás; a befogott szakasz túlnyúlik az aktív csúszólapon.' },
  { q: 'Mekkora a talajhorgonyok jellemző hajlása és legnagyobb hossza?', a: ['15–30°, legfeljebb 25–30 m', '45–60°, legfeljebb 10 m', '0–5°, legfeljebb 50 m', '90°, a hossz nem korlátozott'], c: 0, e: 'A vízszintessel 15–30°-os hajlással, legfeljebb 25–30 m hosszal készülnek; a befogási szakasz 4–9 m.' },
  { q: 'Miért a legrövidebb horgonyhossz 8 m?', a: ['Mert a szabad és az injektált szakasz is legalább 4 m', 'Mert ennyi a fúrócső hossza', 'Mert 8 m alatt nem lehet injektálni', 'Mert a szomszéd telek 8 m-re van'], c: 0, e: 'A szabad és az injektált szakasz is legalább 4 m-es, így a legrövidebb horgonyhossz 8 m.' },
  { q: 'Mennyi idő szilárdulás után és mekkora erőre feszítik elő a horgonyt?', a: ['8–12 nap után, a tervezett igénybevétel 80–90%-ára', 'azonnal, a tervezett erő 150%-ára', '1 nap után, a tervezett erő 20%-ára', 'soha nem feszítik elő'], c: 0, e: 'Szilárdulás (8–12 nap) után a pászmákat a fejen keresztül előfeszítik a tervezett igénybevétel 80–90%-ára, majd a horgonyfejen rögzítik; minden horgonyról próbaterhelési jegyzőkönyv készül.' },
  { q: 'Mikor gazdaságos jellemzően az acél csőtámaszok alkalmazása?', a: ['Ha horgony nem készíthető, vagy nagyon mély (15–20 m feletti) gödörnél a szomszéd épületek mozgását korlátozni kell', 'Minden 3 m-nél sekélyebb gödörnél', 'Ha a gödör nagyon széles (100 m felett)', 'Csak élővízben'], c: 0, e: 'Ha a talaj vagy a szomszédos földalatti terek miatt horgony nem készíthető, illetve 15–20 m-nél mélyebb munkatérnél, ahol horgonyokkal nem lehetne kellően merev falat építeni.' },
  { q: 'Mi válik meghatározóvá a 10–15 m-nél hosszabb csőtámaszoknál?', a: ['A hőtágulásból eredő tengelyirányú nyomóerő', 'A szél', 'A korrózió', 'A cső saját súlya miatti lehajlás – semmi más'], c: 0, e: 'A napon felmelegedő dúc tágulna, de a falak közé szorítva nem tud – a többleterőre méretezni kell.' },
  { q: 'Mi a top-down (milánói) módszer lényege?', a: ['A falak és a pillérek után előbb a felső födém készül, és a további szinteket a födém alatt emelik ki', 'Előbb kiemelik a teljes gödröt, majd alulról felfelé építenek', 'A födémeket daruval emelik a helyükre', 'A gödröt fagyasztással biztosítják'], c: 0, e: 'Földzsalun elkészül a felső födém, amely tárcsaként megtámasztja a falakat; a további szintek a födém alatt, bányászati módszerrel készülnek.' },
  { q: 'Hol kell elhelyezni a passzív hátrahorgonyzás horgonyfalát?', a: ['A fő fal aktív csúszóékén kívül, úgy, hogy a passzív éke ne fedje a fő fal aktív ékét', 'Közvetlenül a fő fal mögött, 0,5 m-re', 'A munkagödör közepén', 'Mindegy, csak elég mély legyen'], c: 0, e: 'A szakadólapon kívül kell lennie; ha a mozgó földéken belül áll, a földdel együtt mozdul, és nem ad ellenállást.' },
]);
