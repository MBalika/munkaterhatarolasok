// 7. fejezet – Különleges megoldások: fagyasztott fal, gátak élővízben, víz alatti alaplemez
import { register, shell, slider, seg, toggle, stat, verdict, h, svg, figure, clear, fmt, clamp, fitCanvas, loop, cssVar, onTheme, pathD, dim, EN } from './core.js';
import { defineQuiz } from './ui.js';
import { K, stage, autoRedraw } from './scene.js';

/* ------------------------------------------------------------------ segédek */
// színes nyíl (a fej is színes): carrow(g, x1,y1,x2,y2, 'var(--water)', 2)
function carrow(p, x1, y1, x2, y2, col, w = 2, hd = 7) {
  const g = svg('g', { style: `color:${col}` }, p);
  const a = Math.atan2(y2 - y1, x2 - x1);
  svg('line', { x1, y1, x2: x2 - Math.cos(a) * hd * 0.7, y2: y2 - Math.sin(a) * hd * 0.7, stroke: 'currentColor', 'stroke-width': w, 'stroke-linecap': 'round' }, g);
  svg('path', { d: pathD([[x2, y2], [x2 - Math.cos(a - 0.45) * hd, y2 - Math.sin(a - 0.45) * hd], [x2 - Math.cos(a + 0.45) * hd, y2 - Math.sin(a + 0.45) * hd]], true), fill: 'currentColor' }, g);
  return g;
}
const txt = (p, x, y, t, cls = 't-lab', o = {}) => svg('text', { x, y, class: cls, text: t, ...o }, p);
// szádfal (függőleges, hullámos vonal)
function sheetPile(p, x, y0, y1, w = 6) {
  const g = svg('g', {}, p);
  svg('rect', { x: x - w / 2, y: y0, width: w, height: y1 - y0, class: 'f-steel2' }, g);
  for (let y = y0 + 4; y < y1 - 2; y += 9) svg('line', { x1: x - w / 2, y1: y, x2: x + w / 2, y2: y + 4, class: 's-steel', 'stroke-width': 0.8, style: 'stroke:var(--steelm)' }, g);
  return g;
}

/* ================================================================== FAGYASZTOTT FAL */
const KF = { brine: { sand: 0.183, clay: 0.095 }, ln2: { sand: 0.29, clay: 0.15 } }; // r = k·√t (m, nap) – szemléltető kalibráció
const VLIM = { brine: 2, ln2: 10 }; // m/nap – efölött nem zár (szemléltető)
const RING = 5, EXC = 3; // fagyasztócső-gyűrű sugara, kiemelés sugara (m)

function freezeState(t, m, so, s, v) {
  const r0 = Math.min(3.4, KF[m][so] * Math.sqrt(Math.max(0, t)));
  const q = Math.min(1.4, v / VLIM[m]);
  const a = r0 * (1 + 0.2 * q), b = r0 * Math.max(0.12, 1 - 0.7 * q), dx = 0.25 * q * r0;
  const N = Math.max(10, Math.round((2 * Math.PI * RING) / s));
  const chord = 2 * RING * Math.sin(Math.PI / N);
  const rho = (ang) => (a * b) / Math.sqrt((b * Math.cos(ang)) ** 2 + (a * Math.sin(ang)) ** 2 || 1e-9);
  let closed = 0, thick = Infinity;
  const gaps = [];
  for (let i = 0; i < N; i++) {
    const phi = ((i + 0.5) * 2 * Math.PI) / N;
    const tau = phi + Math.PI / 2;
    const rt = rho(tau), rn = rho(phi);
    if (2 * rt >= chord) { closed++; thick = Math.min(thick, 2 * Math.sqrt(Math.max(0, rt * rn - (chord / 2) ** 2))); }
    else { gaps.push(phi); thick = 0; }
  }
  return { r0, a, b, dx, N, chord, closed: closed === N, gaps, thick: closed === N ? thick : 0 };
}

register('freeze', (root) => {
  const { ctrls, viz, out } = shell(root, {
    foot: '<b>Szemléltető modell.</b> A jéghengerek sugara ~√t szerint nő; a sebességeket a jellemző tartományokhoz (sólé 4–8 hét, LN₂ 1–3 hét, homokban gyorsabb, agyagban lassabb) igazítottuk. Tervezéshez hőtani számítás és helyszíni hőmérséklet-mérés kell.',
  });
  const med = seg(ctrls, { label: 'Hűtőközeg', options: [{ v: 'brine', t: 'Sólé ≈ −30 °C' }, { v: 'ln2', t: 'Folyékony N₂ −196 °C' }], value: 'brine' });
  const soil = seg(ctrls, { label: 'Talaj', options: [{ v: 'sand', t: 'Homok, kavics' }, { v: 'clay', t: 'Agyag, iszap' }], value: 'sand' });
  const sp = slider(ctrls, { label: 'Csőosztás', sym: 's', min: 0.6, max: 2, step: 0.1, value: 1, unit: 'm', hint: 'Jellemzően kb. 1 m (0,9–1,5 m)' });
  const fl = slider(ctrls, { label: 'Talajvíz áramlása', sym: 'v', min: 0, max: 4, step: 0.1, value: 0, unit: 'm/nap', hint: 'Az áramló víz hőt hoz – sólénál kb. 1–2 m/nap felett nem zár a fal' });
  const tm = slider(ctrls, { label: 'Eltelt idő', sym: 't', min: 0, max: 90, step: 1, value: 0, unit: 'nap' });
  const play = h('button', { class: 'btn btn-line btn-sm', type: 'button' }, '▶ Fagyasztás indítása');
  ctrls.append(h('div', { class: 'play-row' }, play));

  const cv = h('canvas', { class: 'fig kd-canvas', role: 'img', 'aria-label': 'Fagyasztócső-gyűrű felülnézetben, a jéghengerek növekedésével' });
  viz.append(cv);
  viz.append(h('div', { class: 'legend' },
    h('span', {}, h('i', { style: { background: 'var(--ice)' } }), 'fagyott talaj'),
    h('span', {}, h('i', { style: { background: 'var(--steelm2)', borderRadius: '50%' } }), 'fagyasztócső'),
    h('span', {}, h('i', { style: { background: 'transparent', border: '1.5px dashed var(--ink)' } }), 'kiemelés (akna Ø 6 m)'),
    h('span', {}, h('i', { style: { background: 'var(--bad)' } }), 'nyitott rés („ablak”)')));
  const sClose = stat(out, { label: 'Összefagyás (zárt fal)' });
  const sThick = stat(out, { label: 'Falvastagság a csövek között', unit: 'm', d: 2 });
  const sTemp = stat(out, { label: 'Hűtőközeg a csőben' });
  const sStr = stat(out, { label: 'Fagyott talaj szilárdsága −12 °C-on (fagyatlan: 0,2–2,5 MPa)' });
  const vd = verdict(viz);

  let closeDay = null;
  const calcClose = () => {
    closeDay = null;
    for (let t = 0; t <= 400; t += 0.5) { if (freezeState(t, med.v, soil.v, sp.v, fl.v).closed) { closeDay = t; break; } }
  };
  let st = null, phase = 0;
  const C = {};
  const readCols = () => {
    for (const k of ['--soilA', '--soilB', '--ice', '--ice2', '--ink', '--water', '--bad', '--steelm2', '--surface', '--muted', '--ok']) C[k] = cssVar(k);
  };
  readCols();

  const draw = () => {
    if (!st || !st.w) return;
    const { ctx, w, h: H } = st;
    const X0 = -9, X1 = 9, Y0 = -6.2;
    const k = w / (X1 - X0);
    const px = (x) => (x - X0) * k, py = (y) => (y - Y0) * k;
    const S = freezeState(tm.v, med.v, soil.v, sp.v, fl.v);
    ctx.clearRect(0, 0, w, H);
    ctx.fillStyle = soil.v === 'sand' ? C['--soilA'] : C['--soilB'];
    ctx.fillRect(0, 0, w, H);
    // szemcsék
    ctx.fillStyle = C['--ink']; ctx.globalAlpha = 0.16;
    for (let i = 0; i < 420; i++) { const x = ((i * 97.3) % 18) - 9, y = ((i * 53.7) % 12.4) - 6.2; ctx.beginPath(); ctx.arc(px(x), py(y), soil.v === 'sand' ? 1.3 : 0.8, 0, 7); ctx.fill(); }
    ctx.globalAlpha = 1;
    // talajvíz áramlás (csíkok)
    if (fl.v > 0) {
      ctx.strokeStyle = C['--water']; ctx.lineWidth = 2; ctx.globalAlpha = 0.55; ctx.lineCap = 'round';
      const off = (phase * fl.v * 0.9) % 3;
      for (let row = -5.5; row <= 5.6; row += 1.1) {
        for (let x = -9 + off - 3; x < 9; x += 3) {
          ctx.beginPath(); ctx.moveTo(px(x), py(row)); ctx.lineTo(px(x + 1.2), py(row)); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(px(x + 1.2), py(row)); ctx.lineTo(px(x + 0.95), py(row - 0.15)); ctx.lineTo(px(x + 0.95), py(row + 0.15)); ctx.closePath(); ctx.fillStyle = C['--water']; ctx.fill();
        }
      }
      ctx.globalAlpha = 1;
    }
    // jéghengerek
    const pipes = [];
    for (let i = 0; i < S.N; i++) { const p = (i * 2 * Math.PI) / S.N; pipes.push([RING * Math.cos(p), RING * Math.sin(p)]); }
    if (S.r0 > 0.01) {
      ctx.fillStyle = C['--ice'];
      for (const [x, y] of pipes) { ctx.beginPath(); ctx.ellipse(px(x + S.dx), py(y), S.a * k, S.b * k, 0, 0, Math.PI * 2); ctx.fill(); }
      ctx.fillStyle = C['--ice2']; ctx.globalAlpha = 0.55;
      for (const [x, y] of pipes) { ctx.beginPath(); ctx.ellipse(px(x + S.dx * 0.6), py(y), S.a * k * 0.55, S.b * k * 0.55, 0, 0, Math.PI * 2); ctx.fill(); }
      ctx.globalAlpha = 1;
    }
    // ha zárt, a belső mag „száraz”
    ctx.setLineDash([6, 5]); ctx.strokeStyle = C['--ink']; ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.arc(px(0), py(0), EXC * k, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]);
    ctx.font = `600 ${Math.max(11, k * 0.42)}px Inter, system-ui, sans-serif`; ctx.textAlign = 'center'; ctx.fillStyle = C['--ink'];
    ctx.fillText(S.closed ? 'zárt, vízzáró gyűrű – mehet a kiemelés' : tm.v < 1 ? 'kiemelés helye' : 'a gyűrű még nyitott', px(0), py(0) + 4);
    // rések
    if (!S.closed && S.r0 > 0.05) {
      ctx.strokeStyle = C['--bad']; ctx.lineWidth = 3;
      for (const phi of S.gaps) {
        const x = RING * Math.cos(phi) * Math.cos(Math.PI / S.N) + S.dx, y = RING * Math.sin(phi) * Math.cos(Math.PI / S.N);
        const ux = Math.cos(phi), uy = Math.sin(phi);
        ctx.beginPath(); ctx.moveTo(px(x - ux * 0.35), py(y - uy * 0.35)); ctx.lineTo(px(x + ux * 0.35), py(y + uy * 0.35)); ctx.stroke();
      }
    }
    // csövek
    for (const [x, y] of pipes) {
      ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(px(x), py(y), Math.max(3.5, 0.13 * k), 0, 7); ctx.fill();
      ctx.fillStyle = C['--steelm2']; ctx.beginPath(); ctx.arc(px(x), py(y), Math.max(2.3, 0.08 * k), 0, 7); ctx.fill();
    }
    // feliratok
    ctx.textAlign = 'left'; ctx.font = `700 ${Math.max(11, k * 0.4)}px "JetBrains Mono", monospace`; ctx.fillStyle = C['--ink'];
    ctx.fillText(`t = ${tm.v} nap`, 10, 20);
    if (fl.v > 0) { ctx.fillStyle = C['--water']; ctx.fillText(`talajvíz → ${fmt(fl.v, 1)} m/nap`, 10, H - 12); }
    // lépték
    ctx.fillStyle = C['--ink']; ctx.fillRect(w - 10 - 2 * k, H - 16, 2 * k, 3);
    ctx.textAlign = 'right'; ctx.font = `600 11px Inter, system-ui`; ctx.fillText('2 m', w - 10, H - 22);
  };

  const update = () => {
    const S = freezeState(tm.v, med.v, soil.v, sp.v, fl.v);
    sClose.set(null, closeDay === null ? 'bad' : S.closed ? 'ok' : null, closeDay === null ? 'nem zár' : `~${fmt(closeDay, 0)}. nap`);
    sThick.set(S.thick, S.closed ? (S.thick >= 1 ? 'ok' : 'warn') : null);
    sTemp.set(null, null, med.v === 'brine' ? '≈ −30 °C' : '−196 °C');
    sStr.set(null, null, soil.v === 'sand' ? '4–8,5 MPa' : '5–10,8 MPa');
    if (closeDay === null) vd.set('bad', 'A fal nem zár össze', `Az áramló talajvíz elviszi a hideget: a csövek között „ablak” marad. ${med.v === 'brine' ? 'Megoldás: folyékony nitrogén, sűrűbb csőosztás, több csősor vagy előzetes injektálás az áramlás lassítására.' : 'Sűrűbb csőosztás, több csősor vagy előzetes injektálás kell.'}`);
    else if (!S.closed) vd.set('warn', 'Aktív fagyasztás – a hengerek még nem értek össze', `A jéghengerek ${fmt(closeDay, 0)} nap körül zárnak össze. Addig nem szabad ásni: a hőmérő-csövek és a belső víznyomás emelkedése jelzi a záródást.`);
    else vd.set(S.thick >= 1 ? 'ok' : 'warn', S.thick >= 1 ? 'Zárt, teherbíró fagyott fal' : 'Zárt, de még vékony fal', `A fagyott talaj egyszerre <b>vízzáró és teherbíró</b>. ${med.v === 'brine' ? 'Sólével a teljes fal jellemzően 4–8 hét alatt alakul ki.' : 'Nitrogénnel gyors (kb. 1–3 hét), de drága; gyakran sólével tartják fenn.'} A kiemelés alatt fenntartó fagyasztás kell (az indító energia kb. 30–50%-a).`);
    draw();
  };
  const full = () => { calcClose(); update(); };
  [med, soil, sp, fl].forEach((c) => c.on(full));
  tm.on(update);

  st = fitCanvas(cv, 0.69, () => draw());
  onTheme(() => { readCols(); draw(); });
  let playing = false;
  play.addEventListener('click', () => {
    playing = !playing;
    play.textContent = playing ? '❚❚ Szünet' : '▶ Fagyasztás indítása';
    if (playing && tm.v >= 90) tm.set(0);
  });
  let acc = 0;
  loop(cv, (t, dt) => {
    phase = t;
    if (playing) {
      acc += dt * 9;
      if (acc >= 1) { const nv = Math.min(90, tm.v + Math.floor(acc)); acc -= Math.floor(acc); tm.set(nv); if (nv >= 90) { playing = false; play.textContent = '▶ Fagyasztás indítása'; } }
    }
    if (fl.v > 0) draw();
  });
  full();
});

/* ================================================================== GÁT ÉLŐVÍZBEN */
register('cofferdam', (root) => {
  const { ctrls, viz, out } = shell(root, {
    foot: '<b>Szemléltető arányok.</b> Földgát 1:2,5 rézsűkkel és 3 m-es koronával; kétfalú gát szélessége ≈ 0,85 × magasság; cella átmérője ≥ 8 m. A szivárgás egy tapasztalati ökölszabály (0,1 gpm / fal-láb / 10 láb víznyomás) szerint, egy 30 × 12 m-es hídpillér-gát kerületére. Valós tervezésnél hidraulikai, állékonysági és talajtörési vizsgálat kell.',
  });
  const typ = seg(ctrls, { label: 'Gáttípus', vert: true, options: [
    { v: 'fold', t: 'Föld- / kőszórásos gát' }, { v: 'egy', t: 'Egyfalú, merevített szádfalgát' },
    { v: 'ket', t: 'Kétfalú, töltött szádfalgát' }, { v: 'cel', t: 'Cellás szádfalgát' }], value: 'egy' });
  const hw = slider(ctrls, { label: 'Mértékadó vízmélység', sym: 'h', min: 1, max: 14, step: 0.5, value: 6, unit: 'm' });
  const fb = slider(ctrls, { label: 'Szabadmagasság a vízszint felett', sym: 'f', min: 0.3, max: 2.5, step: 0.1, value: 1, unit: 'm', hint: 'Ajánlás: legalább kb. 0,9 m, illetve a hullámmagasság felett' });
  const dh = slider(ctrls, { label: 'Váratlan árhullám', sym: 'Δh', min: 0, max: 3, step: 0.1, value: 0, unit: 'm' });
  const S = figure(viz, 760, 380);
  const vd = verdict(viz);
  const sCrest = stat(out, { label: 'Korona a meder felett', unit: 'm', d: 1 });
  const sWidth = stat(out, { label: 'Gát talpszélessége', unit: 'm', d: 1 });
  const sLeak = stat(out, { label: 'Szivárgás (30 × 12 m-es gát)' });
  const sOk = stat(out, { label: 'Alkalmasság' });
  let gAnim = svg('g', {}, S);
  let drops = [];

  const draw = () => {
    const h = hw.v, f = fb.v, d = dh.v, T = typ.v;
    const crest = h + f;
    const pxm = 300 / 17; // px / m (függőleges és vízszintes egyaránt)
    const bed = 330, yW = bed - (h + d) * pxm, yDes = bed - h * pxm, yC = bed - crest * pxm;
    const over = d > f;
    // szélességek (m)
    let Bm, xg0 = T === 'fold' ? 150 : 250;
    if (T === 'fold') Bm = 3 + 2 * 2.5 * crest;
    else if (T === 'egy') Bm = 0.6;
    else if (T === 'ket') Bm = Math.max(3, 0.85 * crest);
    else Bm = Math.max(8, 0.9 * crest);
    const Bpx = Bm * pxm;
    let xg1 = xg0 + Bpx;
    const clipW = 700;
    const truncated = xg1 > clipW;
    if (truncated) xg1 = clipW;
    // ég a távoli parttal (a horizont a vízszint), meder
    const St = stage(S, { W: 760, H: 380, GY: bed, hz: Math.round(yW), layers: [{ k: 'gravel', y: bed }, { k: 'clay', y: bed + 30 }] });
    const g = St.g, ov = St.ov, { F, SK, R: Rc, P: Pp, C: Cc, Ln, v } = K;
    gAnim = K.g_(S);
    // folyó (bal oldal) – a gát külső lábáig
    const outerX = T === 'fold' ? xg0 + 2.5 * crest * pxm * ((h + d) / crest) : xg0;
    const wR = Math.max(0, Math.min(outerX, xg1)) + (T === 'fold' ? 0 : 2);
    Rc(g, -2, yW, wR + 2, bed - yW, F('halo'));
    Rc(g, -2, yW, wR + 2, bed - yW, F('water', 0.5));
    Rc(g, -2, yW + (bed - yW) * 0.45, wR + 2, (bed - yW) * 0.55, F('dark', 0.07));
    Ln(g, -2, yW, wR, yW, SK('water', 2));
    for (let i = 0; i < 9; i++) { const x = 14 + i * 31 + (i % 2) * 9, yy = yW + 7 + (i % 3) * 9; if (x + 16 < wR - 6) Pp(g, `M${x} ${yy} q4 -2.6 8 0 t8 0`, SK('halo', 1.1, 'opacity:.55') + ';fill:none'); }
    // a száraz munkatér háttere: a gát túlsó oldala nézetben
    const pitX = xg1 + (T === 'egy' ? 4 : 0);
    const pitBot = bed + 16;
    if (T === 'fold') { Rc(g, pitX, yW, 762 - pitX, bed - yW, F('fill', 0.5)); Rc(g, pitX, yW, 762 - pitX, bed - yW, 'fill:url(#pr-p-fill);opacity:.5'); }
    else if (pitX < 752) {
      const ty = Math.min(yC, yW);
      Rc(g, pitX, ty, 762 - pitX, pitBot - ty, F('labbg')); Rc(g, pitX, ty, 762 - pitX, pitBot - ty, F('steel2', 0.2));
      let dd = ''; for (let x = pitX + 9; x < 760; x += 13) dd += `M${x} ${ty} V${pitBot} `;
      Pp(g, dd, SK('steel3', 1, 'opacity:.28')); Rc(g, pitX, ty, 762 - pitX, 3, F('steel3', 0.45));
    }
    Rc(g, pitX, bed - 1, 762 - pitX, pitBot - bed + 1, 'fill:url(#pr-pitg)');
    // betondugó
    if (T !== 'fold') { K.concrete(g, pitX, pitBot, 762 - pitX, 384 - pitBot, false); Ln(g, pitX, pitBot, 762, pitBot, SK('concedge', 1)); St.tag(752, 372, 'víz alatti betondugó', { fs: 10, anchor: 'end' }); }
    else Ln(g, pitX, pitBot, 762, pitBot, SK('ground', 1.5));
    // pillér (kiálló tüskékkel), mellette munkás a léptékhez
    const pierX = Math.max(pitX + 60, 610);
    if (pierX < 740) {
      const pw = Math.min(90, 750 - pierX);
      K.pier(g, pierX + pw / 2, pitBot, pitBot - 74, pw / 2);
      St.tag(pierX + pw / 2, pitBot - 32, 'hídpillér', { fs: 10, anchor: 'middle' });
      if (!over && pierX - pitX > 74) K.man(g, { x: pierX - 22, GY: pitBot, S: pxm, face: 1 });
    }
    // gát
    if (T === 'fold') {
      const half = 2.5 * crest * pxm;
      const pts = [[xg0, bed], [xg0 + half, yC], [xg0 + half + 3 * pxm, yC], [xg0 + 2 * half + 3 * pxm, bed]];
      Pp(g, pathD(pts, true), 'fill:url(#pr-s-fill)' + `;stroke:${v('ground')};stroke-width:1.2;stroke-linejoin:round`);
      const cx = xg0 + half + 1.5 * pxm;
      Pp(g, pathD([[cx - 10, yC + 3], [cx + 10, yC + 3], [cx + 22, bed], [cx - 22, bed]], true), 'fill:url(#pr-s-clay2)' + `;stroke:${v('layer')};stroke-width:.8`);
      // kőszórás a vízoldali rézsűn
      for (let i = 0; i < 26; i++) { const u = (i + 0.5) / 26, x = xg0 + u * half, yy = bed - u * (bed - yC); if (yy > yW - 14) Cc(g, x + 2, yy - 1.5, 3.4 + (i % 3), F(i % 2 ? 'stone' : 'stone2') + `;stroke:${v('dark2')};stroke-width:.5`); }
      St.tag(cx, yC - 12, EN ? 'clay core' : 'agyagmag', { fs: 10, anchor: 'middle', to: [cx, yC + 14] });
      if (truncated) {
        Rc(g, clipW, 0, 762 - clipW, bed, F('labbg', 0.9));
        Pp(g, `M${clipW} ${bed - 60} l8 10 l-8 10 l8 10 l-8 10`, SK('labline', 1.5) + ';fill:none');
        St.txt(754, bed - 100, 'a gát innen', { anchor: 'end', fs: 10.5 }); St.txt(754, bed - 100 + 14 * St.fk, 'folytatódik…', { anchor: 'end', fs: 10.5 });
      }
    } else if (T === 'egy') {
      K.sheetS(g, xg0 + 2, yC, bed + 46);
      // merevítő keretszintek: heveder a szádfalon, csőtámasz a túloldalig
      const nLev = Math.max(1, Math.ceil(crest / 4));
      for (let i = 0; i < nLev; i++) {
        const y = yC + 10 + (i * (bed - yC - 20)) / Math.max(1, nLev);
        K.pipeH(g, xg0 + 15, 772, y, { r: 3.6 });
        K.waleS(g, xg0 + 6, y, 1, { w: 9, h: 14 });
      }
      St.tag(xg0 + 60, yC + 34, 'merevítő keretek (heveder + dúc)', { fs: 10 });
    } else if (T === 'ket') {
      Rc(g, xg0, yC + 4, xg1 - xg0, bed - yC + 36, 'fill:url(#pr-s-sand)');
      Ln(g, xg0, yC + 4, xg1, yC + 4, SK('ground', 1.2));
      Ln(g, xg0 - 6, yC + 16, xg1 + 8, yC + 16, SK('steel3', 2.6));
      for (const x of [xg0 - 8, xg1 + 6]) { Rc(g, x, yC + 9, 3.4, 14, F('steel3')); }
      K.sheetS(g, xg0 - 1, yC, bed + 46); K.sheetS(g, xg1 - 1, yC, bed + 46);
      St.txt((xg0 + xg1) / 2, yC + 38, 'homok/kavics töltés', { anchor: 'middle', fs: 10.5, b: true });
      St.tag((xg0 + xg1) / 2, yC - 12, 'átkötő rúd', { fs: 10, anchor: 'middle', to: [(xg0 + xg1) / 2, yC + 15] });
    } else {
      Rc(g, xg0, yC + 4, xg1 - xg0, bed - yC + 36, 'fill:url(#pr-s-gravel)');
      K.sheetS(g, xg0 - 1, yC, bed + 40); K.sheetS(g, xg1 - 1, yC, bed + 40);
      K.E(g, (xg0 + xg1) / 2, yC + 2, (xg1 - xg0) / 2, 9, 'fill:url(#pr-s-gravel)' + `;stroke:${v('sheet2')};stroke-width:3.4`);
      St.txt((xg0 + xg1) / 2, yC + 36, `acélcella Ø ≈ ${fmt(Bm, 0)} m`, { anchor: 'middle', b: true });
      St.txt((xg0 + xg1) / 2, yC + 36 + 15 * St.fk, 'homokkal töltve', { anchor: 'middle', fs: 10.5 });
    }
    // úszó munkaállvány (ponton) a folyón, rajta a szádpallók és egy munkás
    if (T !== 'fold' && !over && yW < bed - 2.2 * pxm) {
      const dk = K.barge(g, 52, 150, yW + 2);
      for (let i = 0; i < 3; i++) Rc(g, 94 + i * 2, dk - 5 - i * 3.4, 46 - i * 4, 3, F('sheet2') + `;stroke:${v('sheet3')};stroke-width:.5`);
      K.man(g, { x: 74, GY: dk, S: pxm, face: 1 });
    }
    // átbukás
    if (over) {
      const xs = T === 'fold' ? xg0 + 2.5 * crest * pxm + 1.5 * pxm : (xg0 + xg1) / 2;
      Pp(g, `M${Math.min(xs, xg1)} ${yC - 2} Q${xg1 + 25} ${yC + 10} ${xg1 + 30} ${pitBot}`, SK('water', 10, 'opacity:.6;stroke-linecap:round') + ';fill:none');
      Rc(g, pitX, pitBot - 40, 762 - pitX, 40, F('water', 0.6)); Ln(g, pitX, pitBot - 40, 762, pitBot - 40, SK('water', 1.6));
      txt(St.top, Math.min(700, xg1 + 60), yC - 14, 'ÁTBUKÁS!', 't-big t-bad');
    } else {
      // szivattyú a zsompban, a nyomócső a gát koronáján át a folyóba
      const px0 = Math.min(720, pitX + 14);
      Rc(g, px0, pitBot - 15, 18, 15, F('cont') + `;stroke:${v('cont3')};stroke-width:.8`, { rx: 3 });
      Rc(g, px0 + 5, pitBot - 20, 8, 5, F('dark2'), { rx: 1 });
      const hx = T === 'fold' ? Math.min(xg0 + 2.5 * (h + d) * pxm - 12, 600) : xg0 - 16;
      Pp(g, `M${px0 + 9} ${pitBot - 20} V${yC - 8} Q${px0 + 9} ${yC - 18} ${px0 - 1} ${yC - 18} H${hx + 10} Q${hx} ${yC - 18} ${hx} ${yC - 8} V${yW + 8}`, SK('hose', 3, 'stroke-linejoin:round') + ';fill:none');
      carrow(ov, hx, yW - 4, hx, yW + 13, 'var(--water)', 2);
      if (Math.max(pitX + 60, 610) - px0 > 110) St.tag(px0 + 24, pitBot - 22, 'szivattyú', { fs: 10 });
    }
    // méretek
    const xd = 40;
    dim(ov, xd, bed, xd, yDes, `h = ${fmt(h, 1)} m`, { dx: 8, anchor: 'start' });
    svg('line', { x1: 0, y1: yDes, x2: xg0, y2: yDes, class: 's-water', 'stroke-width': 1, 'stroke-dasharray': '5 4' }, ov);
    dim(ov, xg0 - 24, yDes, xg0 - 24, yC, `f = ${fmt(f, 1)} m`, { dx: -6, anchor: 'end' });
    if (d > 0) St.txt(6, yW - 7, `árhullám +${fmt(d, 1)} m`, { c: 'push', b: true, fs: 10.5 });
    // állapot
    return { crest, Bm, over };
  };

  const update = () => {
    const r = draw();
    const T = typ.v, h = hw.v;
    sCrest.set(r.crest);
    sWidth.set(r.Bm, T === 'fold' && r.Bm > 30 ? 'warn' : null);
    const head = h + dh.v;
    const leak = 0.0068 * 84 * head;
    if (T === 'fold') sLeak.set(null, 'warn', 'nagy – a gáttesten át');
    else sLeak.set(null, null, `≈ ${fmt(leak, 1)} l/s`);
    let s = 'ok', title, why;
    if (T === 'fold') {
      if (h <= 3) { title = 'Sekély, lassú vízben megfelel'; why = 'Olcsó, helyi anyagból épül – de nagy helyet foglal, szűkíti a medret és erodálódik. Agyagmag vagy beépített szádfal tömíti.'; }
      else if (h <= 5) { s = 'warn'; title = 'Már nagyon széles'; why = `A talpszélesség ≈ ${fmt(r.Bm, 0)} m – a folyó jelentős részét elzárja, az áramlás felgyorsul, kimossa a rézsűt.`; }
      else { s = 'bad'; title = 'Ekkora vízmélységre nem való'; why = `≈ ${fmt(r.Bm, 0)} m talpszélesség: helyette szádfalas vagy cellás gát kell.`; }
    } else if (T === 'egy') {
      if (h <= 9) { title = 'Tipikus hídpillér-gát'; why = 'Kis alapterület, a merevítő keret egyben a szádfalverés sablonja. A gödör aljára víz alatti betondugó kerül, ennek súlya tart a felhajtóerő ellen.'; }
      else { s = 'warn'; title = 'Mély: sok merevítő szint, hosszú pallók'; why = 'Kb. 9 m víztelenített mélység + befogás felett a pallóhossz és a keretek száma gyorsan nő – mérlegelni kell a cellás vagy kétfalú gátat.'; }
    } else if (T === 'ket') {
      if (h <= 10) { title = 'Önálló súlytámfal'; why = 'A két szádfal közötti töltés súlya tart: belül nincs dúc, a tetején akár út is vezethet. Cserébe sok acél és töltőanyag kell.'; }
      else { s = 'warn'; title = 'Nagyon széles és nehéz'; why = 'Ilyen mélységnél a cellás gát gyakran gazdaságosabb.'; }
    } else {
      if (h < 4) { s = 'warn'; title = 'Túlméretezett'; why = 'Sekély vízben a ≥ 8 m átmérőjű cellák nem gazdaságosak – elég a föld- vagy egyfalú gát.'; }
      else { title = 'Mély vízben, hosszú szerkezetnél gazdaságos'; why = 'Homokkal töltött acélhengerek: gravitációs fal, belső merevítés nélkül. A töltés a pallókban gyűrűirányú húzást kelt („hordóhatás”), ezt a zárak viszik át.'; }
    }
    if (r.over) { s = 'bad'; title = 'Átbukik a víz – a munkagödör elárasztódik!'; why = `Az árhullám (${fmt(dh.v, 1)} m) nagyobb a szabadmagasságnál (${fmt(fb.v, 1)} m). Vészhelyzetben a gödröt szándékosan, szabályozottan árasztják el, hogy a víznyomás kiegyenlítődjön.`; }
    else if (dh.v > fb.v - 0.3 && dh.v > 0) { if (s === 'ok') s = 'warn'; why += ' <b>Figyelem:</b> az árhullám már közel jár a koronához.'; }
    sOk.set(null, s, s === 'ok' ? 'megfelel' : s === 'warn' ? 'feltételesen' : 'nem');
    vd.set(s, title, why);
    // szivárgó cseppek száma
    drops = [];
    if (!r.over && typ.v !== 'fold') for (let i = 0; i < Math.round(clamp(leak / 1.5, 1, 9)); i++) drops.push({ y: 0.2 + 0.7 * Math.random(), p: Math.random() });
    if (typ.v === 'fold' && !r.over) for (let i = 0; i < 12; i++) drops.push({ y: 0.3 + 0.6 * Math.random(), p: Math.random() });
  };
  [typ, hw, fb, dh].forEach((c) => c.on(update));
  update(); autoRedraw(S, update);
  // szivárgás-animáció
  loop(S, (t, dt) => {
    clear(gAnim);
    if (!drops.length) return;
    const h = hw.v, f = fb.v, crest = h + f, pxm = 300 / 17, bed = 330;
    const T = typ.v;
    let Bm = T === 'fold' ? 3 + 5 * crest : T === 'egy' ? 0.6 : T === 'ket' ? Math.max(3, 0.85 * crest) : Math.max(8, 0.9 * crest);
    const x1 = Math.min((T === 'fold' ? 150 : 250) + Bm * pxm, 700) + 6;
    for (const d of drops) {
      d.p = (d.p + dt * 0.5) % 1;
      const y = bed - d.y * h * pxm;
      svg('circle', { cx: x1 + d.p * 40, cy: y + d.p * d.p * 30, r: 2.6, fill: 'var(--water)', opacity: 1 - d.p }, gAnim);
    }
  });
});

/* ================================================================== FELÚSZÁS-KALKULÁTOR */
register('uplift', (root) => {
  const { ctrls, viz, out } = shell(root, {
    foot: '<b>Egyszerűsített, szemléltető ellenőrzés</b> (az EC7 UPL-ellenőrzés mintájára): G<sub>dst</sub> ≤ 0,9·G<sub>stb</sub> + R<sub>d</sub>, γ<sub>w</sub> = 10 kN/m³. A parciális tényezőket a magyar Nemzeti Melléklet szerint kell felvenni; a szádfal és a cölöpök palástsúrlódását itt elhanyagoltuk.',
  });
  const H = slider(ctrls, { label: 'Víztelenített mélység a lemez felett', sym: 'H', min: 2, max: 20, step: 0.5, value: 12, unit: 'm', hint: 'a talajvízszinttől a lemez tetejéig' });
  const t = slider(ctrls, { label: 'Víz alatti lemez vastagsága', sym: 't', min: 0.6, max: 12, step: 0.1, value: 1.5, unit: 'm' });
  const gc = slider(ctrls, { label: 'Beton térfogatsúlya', sym: 'γc', min: 22, max: 25, step: 0.5, value: 23, unit: 'kN/m³' });
  const anc = toggle(ctrls, { label: 'Húzott cölöpök (horgonyok)', value: true });
  const a = slider(ctrls, { label: 'Horgonyraszter', sym: 'a', min: 2, max: 4.5, step: 0.1, value: 3, unit: 'm', hint: 'jellemzően 2,5–3,5 m' });
  const R = slider(ctrls, { label: 'Horgony tervezési húzási ellenállása', sym: 'Rd', min: 100, max: 1500, step: 50, value: 1000, unit: 'kN' });
  const pre = h('div', { class: 'stepbtns' },
    h('button', { type: 'button', onclick: () => { anc.set(false, false); H.set(12, false); t.set(11.5, false); upd(); } }, 'Horgony nélkül, t = 11,5 m'),
    h('button', { type: 'button', onclick: () => { anc.set(true, false); H.set(12, false); t.set(1.5, false); a.set(2.7, false); R.set(800, false); upd(); } }, 'Berlini mintára (2,7 m-es rács)'));
  ctrls.append(h('div', { class: 'ctl' }, h('span', { class: 'ctl-lab' }, 'Előbeállítások'), pre));
  const S = figure(viz, 760, 340);
  const vd = verdict(viz);
  const sU = stat(out, { label: 'Víznyomás a lemez alján', unit: 'kPa', d: 0 });
  const sG = stat(out, { label: 'A lemez súlya (×0,9)', unit: 'kPa', d: 0 });
  const sA = stat(out, { label: 'Horgonyerő / m²', unit: 'kPa', d: 0 });
  const sMu = stat(out, { label: 'Kihasználtság', unit: '%', d: 0 });
  const sReq = stat(out, { label: 'Szükséges erő / horgony', unit: 'kN', d: 0 });
  const sT0 = stat(out, { label: 'Horgony nélkül kellene', unit: 'm', d: 1 });

  function upd() {
    a.el.style.opacity = anc.v ? 1 : 0.4; R.el.style.opacity = anc.v ? 1 : 0.4;
    const gw = 10;
    const u = gw * (H.v + t.v);
    const g = gc.v * t.v * 0.9;
    const ra = anc.v ? R.v / (a.v * a.v) : 0;
    const mu = u / (g + ra);
    const req = Math.max(0, (u - g) * a.v * a.v);
    const t0 = (gw * H.v) / (0.9 * gc.v - gw);
    sU.set(u); sG.set(g); sA.set(ra); sMu.set(mu * 100, mu <= 1 ? (mu > 0.9 ? 'warn' : 'ok') : 'bad');
    sReq.set(anc.v ? req : null, null, anc.v ? null : '–'); sT0.set(t0);
    if (mu <= 1) vd.set(mu > 0.9 ? 'warn' : 'ok', mu > 0.9 ? 'Éppen megfelel' : 'Lent marad – megfelel', anc.v ? `A lemez súlya (${fmt(g, 0)} kPa) és a horgonyok (${fmt(ra, 0)} kPa) együtt tartják a ${fmt(u, 0)} kPa víznyomást. Horgonyonként ≈ ${fmt(req, 0)} kN húzóerő kell (ellenállás: ${fmt(R.v, 0)} kN).` : `Csak a súly tart: ehhez ${fmt(t.v, 1)} m beton kell – hatalmas tömeg és kiemelés.`);
    else vd.set('bad', 'Felúszik!', anc.v ? `A víznyomás (${fmt(u, 0)} kPa) nagyobb, mint a súly és a horgonyerő összege (${fmt(g + ra, 0)} kPa). Sűrűbb raszter vagy erősebb horgony kell (≈ ${fmt(req, 0)} kN / horgony).` : `Horgony nélkül legalább ≈ ${fmt(t0, 1)} m vastag lemez kellene – horgonyokkal 1–1,5 m is elég.`);
    draw(u, g, ra, mu);
  }
  let last = null;
  function draw(u, g, ra, mu) {
    last = [u, g, ra, mu];
    const GY = 46, xL = 110, xR = 650, gwY = 68;
    const lift = mu > 1 ? Math.min(14, (mu - 1) * 30 + 5) : 0;
    const slabTop = 214 - lift, tpx = clamp(t.v * 9, 7, 104);
    const St = stage(S, { W: 760, H: 340, GY, layers: [{ k: 'fill', y: GY }, { k: 'gravel', y: GY + 12 }, { k: 'sand', y: 250 }] });
    const q = St.g, ov = St.ov, { F, SK, R: Rc, P: Pp, Ln, v } = K;
    // talajvíz a gödrön kívül és a lemez alatt
    Rc(q, -2, gwY, 764, 340 - gwY, F('water', 0.2));
    for (const [x1, x2] of [[0, xL - 6], [xR + 6, 760]]) Ln(q, x1, gwY, x2, gwY, SK('water', 1.6, 'stroke-dasharray:7 5'));
    St.gwMark(22, gwY); St.txt(34, gwY - 4, 'talajvíz', { c: 'water', b: true, fs: 10.5 });
    // száraz munkagödör a szádfalak között
    K.pit(q, St.M, xL + 3, xR - 3, slabTop + 2);
    // húzott cölöpök / horgonyok a lemez alatt
    if (anc.v) {
      const nA = Math.max(2, Math.round(30 / a.v));
      for (let i = 0; i < nA; i++) {
        const x = xL + 30 + (i * (xR - xL - 60)) / (nA - 1);
        Rc(q, x - 4.5, 282, 9, 52, F('grout2') + `;stroke:${v('concedge')};stroke-width:.8`, { rx: 4.5 }); Rc(q, x - 4.5, 282, 9, 52, 'fill:url(#pr-p-conc)', { rx: 4.5 });
        Ln(q, x, slabTop + tpx - 6, x, 330, SK(mu > 1 ? 'push' : 'steel3', 2.4));
      }
    }
    // víz alatti betonlemez
    K.concrete(q, xL + 4, slabTop, xR - xL - 8, tpx, false);
    Pp(q, `M${xL + 4} ${slabTop} H${xR - 4} V${slabTop + tpx} H${xL + 4}Z`, SK('concedge', 1) + ';fill:none');
    if (mu > 1) { Rc(q, xL + 4, slabTop, xR - xL - 8, tpx, F('push', 0.3)); for (const x of [240, 380, 520]) Pp(q, `M${x} ${slabTop} l6 ${tpx * 0.4} l-8 ${tpx * 0.3} l5 ${tpx * 0.3}`, SK('push', 2) + ';fill:none'); }
    if (anc.v) { const nA = Math.max(2, Math.round(30 / a.v)); for (let i = 0; i < nA; i++) { const x = xL + 30 + (i * (xR - xL - 60)) / (nA - 1); Rc(q, x - 7, slabTop + tpx - 9, 14, 4, F('steel3')); Rc(q, x - 3, slabTop + tpx - 13, 6, 4, F('dark2')); } }
    K.sheetS(q, xL - 1, GY - 10, 326); K.sheetS(q, xR - 1, GY - 10, 326);
    // a száraz munkatérben: kotró és munkás a lemezen (ha nem úszott fel)
    if (mu <= 1) { K.excavator(q, { GY: slabTop, H: 340, layers: [] }, xR - 190, slabTop - 14, { tool: 'dig', reach: 50 }); K.man(q, { x: xL + 190, GY: slabTop, S: 16, face: 1 }); }
    // nyilak: víznyomás fel, súly le
    const uLen = clamp(u / 4, 10, 70), gLen = clamp(g / 4, 6, 70);
    for (let i = 0; i < 7; i++) { const x = xL + 60 + i * 72; carrow(ov, x, slabTop + tpx + uLen + 6, x, slabTop + tpx + 4, 'var(--water)', 2.4); }
    carrow(ov, 140, slabTop - gLen - 4, 140, slabTop - 2, 'var(--ink)', 2.6);
    St.txt(150, slabTop - gLen / 2 - 2, `súly ${fmt(g, 0)} kPa`, { b: true, mono: true });
    St.txt(xR - 12, Math.min(332, slabTop + tpx + uLen + 4), `víznyomás ${fmt(u, 0)} kPa`, { anchor: 'end', b: true, mono: true, c: 'water' });
    if (anc.v) St.tag(380, 326, `horgonyok ${fmt(a.v, 1)} × ${fmt(a.v, 1)} m-es rácsban`, { fs: 10, anchor: 'middle' });
    dim(ov, 60, gwY, 60, slabTop, `H = ${fmt(H.v, 1)} m`, { dx: 0, dy: -8 });
    dim(ov, xR + 40, slabTop, xR + 40, slabTop + tpx, `t = ${fmt(t.v, 1)} m`, { dx: 8, anchor: 'start' });
    if (mu > 1) txt(St.top, 380, slabTop - 14, 'FELÚSZIK', 't-big t-bad', { 'text-anchor': 'middle' });
    else txt(St.top, 380, 112, 'száraz munkatér', 't-big', { 'text-anchor': 'middle', style: 'fill:var(--muted)' });
  }
  [H, t, gc, a, R].forEach((c) => c.on(upd));
  anc.on(upd);
  upd(); autoRedraw(S, () => last && draw(...last));
});

/* ================================================================== KVÍZ */
defineQuiz('kulonleges', 'Kvíz – különleges megoldások', [
  { q: 'Milyen hőmérsékletű a folyékony nitrogén, amellyel talajt fagyasztanak?', a: ['−196 °C', 'kb. −30 °C', 'kb. −78 °C', '−12 °C'], c: 0, e: 'A folyékony nitrogén −196 °C-os, nyílt rendszerben elpárolog: gyors (kb. 1–3 hét), de drága. A sólés (kalcium-klorid) hűtés kb. −25…−40 °C-os, zárt körben kering, lassabb (kb. 4–8 hét).' },
  { q: 'Miért veszélyes a talajfagyasztásnál az áramló talajvíz?', a: ['Hőt szállít: a jéghengerek nem tudnak összezárni, „ablak” marad a falban', 'Mert a sólé feloldódik benne', 'Mert az áramló víz gyorsabban fagy meg, és szétfeszíti a csöveket', 'Nem veszélyes, csak a fagyasztás költségét növeli'], c: 0, e: 'Az áramló víz folyamatosan hozza a meleget. Sólénál már kb. 1–2 m/nap áramlás meghiúsíthatja a záródást; ilyenkor nitrogén, sűrűbb csőosztás vagy előzetes injektálás segít.' },
  { q: 'Mi a kontraktor eljárás lényege víz alatti betonozásnál?', a: ['A betonozócső vége végig a friss betonban marad, a beton alulról emelkedik', 'A betont a víz felszínéről szórják a gödörbe', 'A gödröt előbb leszivattyúzzák, utána betonoznak', 'Előregyártott betonlemezeket süllyesztenek le'], c: 0, e: 'Így a beton nem hullik át a vízen, nem osztályozódik és nem mosódik ki belőle a cement. A betonozás folyamatos, gyakran éjjel-nappal tart.' },
  { q: 'Mi tartja lent a víz alatti alaplemezt a leszivattyúzás után?', a: ['A lemez súlya és a húzott cölöpök (horgonyok) ereje', 'Csak a szádfalak súrlódása', 'A gödörben maradt víz súlya', 'A lemez alatti vákuum'], c: 0, e: 'Alulról a teljes víznyomás hat. Horgony nélkül a víztelenített mélységgel összemérhető vastag beton kellene: 12 m-nél biztonsági tényező nélkül kb. 9 m, a felúszási (0,9-es) tényezővel kb. 11 m. Horgonyokkal 1–1,5 m is elég.' },
  { q: 'Melyik gáttípus önálló gravitációs szerkezet, amelyben a homokkal töltött acélhenger „hordóként” dolgozik?', a: ['Cellás szádfalgát', 'Egyfalú, merevített szádfalgát', 'Berlini dúcolat', 'Földgát agyagmaggal'], c: 0, e: 'A cellás gát egyenes gerincű pallókból álló, homokkal töltött körcellákból áll: a töltés gyűrűirányú húzást kelt a pallókban, ezt a zárak viszik át. Belül nincs merevítés.' },
  { q: 'Hogyan készültek a 4-es metró Fővám téri állomásánál a Duna-part alatti peronalagutak?', a: ['Bányászati (NATM) módszerrel, talajfagyasztás védelmében', 'Szádfalas gátban, víz alatti betondugóval', 'Berlini dúcolattal, talajvízszint-süllyesztéssel', 'Talajszegezéssel'], c: 0, e: 'Az állomás dobozát a felszínről építették; a Duna-part alá nyúló peronalagutak bányászati módszerrel, talajfagyasztás védelmében készültek.' },
  { q: 'Mit jelent a gátnál a szabadmagasság?', a: ['Mennyivel ér a gát koronája a mértékadó vízszint fölé', 'A gát és a munkagödör közötti távolságot', 'A szádfal befogási mélységét', 'A szivattyú emelőmagasságát'], c: 0, e: 'Ajánlás szerint legalább kb. 0,9 m, illetve a várható hullámmagasság fölé kell érnie – különben egy váratlan árhullám átbukik, és elárasztja a munkagödröt.' },
]);
