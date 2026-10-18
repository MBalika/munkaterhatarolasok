// 7. fejezet – Különleges megoldások: fagyasztott fal, gátak élővízben, víz alatti alaplemez
import { register, shell, slider, seg, toggle, stat, verdict, h, svg, figure, clear, fmt, clamp, fitCanvas, loop, cssVar, onTheme, pathD, dim } from './core.js';
import { defineQuiz } from './ui.js';

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
    foot: '<b>Szemléltető modell.</b> A jéghengerek sugara ~√t szerint nő; a sebességeket a szakirodalmi tartományokhoz (sólé 4–8 hét, LN₂ 1–3 hét, homokban gyorsabb, agyagban lassabb) igazítottuk. Tervezéshez hőtani számítás és helyszíni hőmérséklet-mérés kell.',
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
    foot: '<b>Szemléltető arányok.</b> Földgát 1:2,5 rézsűkkel és 3 m-es koronával; kétfalú gát szélessége ≈ 0,85 × magasság; cella átmérője ≥ 8 m. A szivárgás a NAVFAC-ökölszabály (0,1 gpm / fal-láb / 10 láb víznyomás) szerint, egy 30 × 12 m-es hídpillér-gát kerületére. Valós tervezésnél hidraulikai, állékonysági és talajtörési vizsgálat kell.',
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
  const gStat = svg('g', {}, S), gDyn = svg('g', {}, S), gAnim = svg('g', {}, S);
  let drops = [];

  const draw = () => {
    clear(gStat); clear(gDyn);
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
    // ég, meder
    svg('rect', { x: 0, y: 0, width: 760, height: 380, class: 'f-sky' }, gStat);
    svg('rect', { x: 0, y: bed, width: 760, height: 50, class: 'f-soilA' }, gStat);
    svg('rect', { x: 0, y: bed, width: 760, height: 50, fill: 'url(#pat-sand)' }, gStat);
    // folyó (bal oldal) – a gát külső lábáig
    const outerX = T === 'fold' ? xg0 + 2.5 * crest * pxm * ((h + d) / crest) : xg0;
    svg('rect', { x: 0, y: yW, width: Math.max(0, Math.min(outerX, xg1)), height: bed - yW, class: 'f-water' }, gStat);
    svg('rect', { x: 0, y: yW, width: Math.max(0, Math.min(outerX, xg1)), height: bed - yW, fill: 'url(#pat-water)' }, gStat);
    svg('line', { x1: 0, y1: yW, x2: Math.min(outerX, xg1), y2: yW, class: 's-water', 'stroke-width': 2 }, gStat);
    // folyásirány
    // munkagödör (jobb oldal) – száraz
    const pitX = xg1 + (T === 'egy' ? 4 : 0);
    const pitBot = bed + 16;
    svg('rect', { x: pitX, y: bed, width: 760 - pitX, height: pitBot - bed, fill: 'var(--bg2)' }, gStat);
    // betondugó
    if (T !== 'fold') { svg('rect', { x: pitX, y: pitBot, width: 760 - pitX, height: 380 - pitBot, class: 'f-conc' }, gStat); svg('rect', { x: pitX, y: pitBot, width: 760 - pitX, height: 380 - pitBot, fill: 'url(#pat-conc)' }, gStat); txt(gStat, 760 - 8, 374, 'víz alatti betondugó', 't-sm', { 'text-anchor': 'end' }); }
    // pillér
    const pierX = Math.max(pitX + 60, 610);
    if (pierX < 740) { svg('rect', { x: pierX, y: pitBot - 70, width: Math.min(90, 750 - pierX), height: 70, class: 'f-conc2' }, gStat); txt(gStat, pierX + 6, pitBot - 8, 'hídpillér', 't-sm', { style: 'fill:var(--surface);font-weight:700' }); }
    // gát
    if (T === 'fold') {
      const half = 2.5 * crest * pxm;
      const pts = [[xg0, bed], [xg0 + half, yC], [xg0 + half + 3 * pxm, yC], [xg0 + 2 * half + 3 * pxm, bed]];
      svg('path', { d: pathD(pts, true), class: 'f-soilD' }, gDyn);
      svg('path', { d: pathD(pts, true), fill: 'url(#pat-gravel)' }, gDyn);
      const cx = xg0 + half + 1.5 * pxm;
      svg('path', { d: pathD([[cx - 10, yC], [cx + 10, yC], [cx + 22, bed], [cx - 22, bed]], true), class: 'f-soilB' }, gDyn);
      txt(gDyn, cx, yC - 6, 'agyagmag', 't-sm', { 'text-anchor': 'middle' });
      if (truncated) {
        svg('rect', { x: clipW, y: 0, width: 760 - clipW, height: bed, class: 'f-sky' }, gDyn);
        svg('path', { d: `M ${clipW} ${bed - 60} l 8 10 l -8 10 l 8 10 l -8 10`, fill: 'none', class: 's-ink', 'stroke-width': 1.5 }, gDyn);
        txt(gDyn, 756, bed - 100, 'a gát innen', 't-sm', { 'text-anchor': 'end' }); txt(gDyn, 756, bed - 86, 'folytatódik…', 't-sm', { 'text-anchor': 'end' });
      }
    } else if (T === 'egy') {
      sheetPile(gDyn, xg0 + 3, yC, bed + 46, 7);
      // merevítő keretszintek
      const nLev = Math.max(1, Math.ceil(crest / 4));
      for (let i = 0; i < nLev; i++) {
        const y = yC + 10 + (i * (bed - yC - 20)) / Math.max(1, nLev);
        svg('rect', { x: xg0 + 7, y: y - 4, width: 10, height: 8, class: 'f-steel' }, gDyn);
        svg('rect', { x: xg0 + 17, y: y - 3, width: 760 - xg0 - 17, height: 6, rx: 3, fill: 'var(--g3)', opacity: 0.85 }, gDyn);
      }
      txt(gDyn, xg0 + 24, yC + 2, 'merevítő keretek (heveder + dúc)', 't-sm');
    } else if (T === 'ket') {
      svg('rect', { x: xg0, y: yC, width: xg1 - xg0, height: bed - yC + 40, class: 'f-soilA' }, gDyn);
      svg('rect', { x: xg0, y: yC, width: xg1 - xg0, height: bed - yC + 40, fill: 'url(#pat-sand)' }, gDyn);
      sheetPile(gDyn, xg0, yC, bed + 46, 7); sheetPile(gDyn, xg1, yC, bed + 46, 7);
      svg('line', { x1: xg0, y1: yC + 14, x2: xg1, y2: yC + 14, class: 's-ink', 'stroke-width': 2 }, gDyn);
      txt(gDyn, (xg0 + xg1) / 2, yC + 30, 'homok/kavics töltés', 't-sm', { 'text-anchor': 'middle' });
      txt(gDyn, (xg0 + xg1) / 2, yC + 10, 'átkötő rúd', 't-sm', { 'text-anchor': 'middle' });
    } else {
      svg('rect', { x: xg0, y: yC, width: xg1 - xg0, height: bed - yC + 40, class: 'f-soilD' }, gDyn);
      svg('rect', { x: xg0, y: yC, width: xg1 - xg0, height: bed - yC + 40, fill: 'url(#pat-gravel)' }, gDyn);
      sheetPile(gDyn, xg0, yC, bed + 40, 6); sheetPile(gDyn, xg1, yC, bed + 40, 6);
      svg('ellipse', { cx: (xg0 + xg1) / 2, cy: yC, rx: (xg1 - xg0) / 2, ry: 9, fill: 'none', class: 's-steel', 'stroke-width': 3, style: 'stroke:var(--steelm2)' }, gDyn);
      txt(gDyn, (xg0 + xg1) / 2, yC + 32, `acélcella Ø ≈ ${fmt(Bm, 0)} m`, 't-lab', { 'text-anchor': 'middle' });
      txt(gDyn, (xg0 + xg1) / 2, yC + 48, 'homokkal töltve', 't-sm', { 'text-anchor': 'middle' });
    }
    // átbukás
    if (over) {
      const xs = T === 'fold' ? xg0 + 2.5 * crest * pxm + 1.5 * pxm : (xg0 + xg1) / 2;
      svg('path', { d: `M ${Math.min(xs, xg1)} ${yC - 2} Q ${xg1 + 25} ${yC + 10} ${xg1 + 30} ${pitBot}`, fill: 'none', class: 's-water', 'stroke-width': 10, opacity: 0.6 }, gDyn);
      svg('rect', { x: pitX, y: pitBot - 40, width: 760 - pitX, height: 40, class: 'f-water' }, gDyn);
      txt(gDyn, Math.min(700, xg1 + 60), yC - 14, 'ÁTBUKÁS!', 't-big t-bad');
    } else {
      // szivattyú
      const px0 = Math.min(720, pitX + 14);
      svg('rect', { x: px0, y: pitBot - 14, width: 18, height: 14, rx: 3, fill: 'var(--g4)' }, gDyn);
      const hx = T === 'fold' ? Math.min(xg0 + 2.5 * (h + d) * pxm - 12, 600) : xg0 - 16;
      svg('path', { d: `M ${px0 + 9} ${pitBot - 14} L ${px0 + 9} ${yC - 18} L ${hx} ${yC - 18} L ${hx} ${yW + 10}`, fill: 'none', class: 's-ink', 'stroke-width': 3, opacity: 0.55, 'stroke-linejoin': 'round' }, gDyn);
      carrow(gDyn, hx, yW - 4, hx, yW + 12, 'var(--water)', 2);
      if (Math.max(pitX + 60, 610) - px0 > 95) txt(gDyn, px0 + 22, pitBot - 4, 'szivattyú', 't-sm');
    }
    // méretek
    const xd = 40;
    dim(gDyn, xd, bed, xd, yDes, `h = ${fmt(h, 1)} m`, { dx: 8, anchor: 'start' });
    svg('line', { x1: 0, y1: yDes, x2: xg0, y2: yDes, class: 's-water', 'stroke-width': 1, 'stroke-dasharray': '5 4' }, gDyn);
    dim(gDyn, xg0 - 24, yDes, xg0 - 24, yC, `f = ${fmt(f, 1)} m`, { dx: -6, anchor: 'end' });
    if (d > 0) txt(gDyn, 6, yW - 5, `árhullám +${fmt(d, 1)} m`, 't-sm t-bad');
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
  update();
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

/* ================================================================== VÍZ ALATTI LEMEZ – FÁZISOK */
const UW_STEPS = [
  ['Kiinduló helyzet', 'Magas talajvíz, jó vízvezető homok-kavics, a vízzáró réteg nagyon mélyen. A talajvizet <strong>nem szabad lesüllyeszteni</strong> (szomszéd épületek, fák, vízjogi előírás – pl. Berlinben).'],
  ['1. Körbezárás szádfallal', 'Vízzáró szádfal (vagy résfal) zárja körbe a munkagödröt – de a vízzáró rétegig nem ér le, így alulról a víz továbbra is bejönne.'],
  ['2. Nedves kiemelés', 'A vizet bent hagyják: a földet víz alól markolják ki a leendő lemez aljáig. A munkagödörből „mesterséges tó” lesz, a talajvízszint nem változik.'],
  ['3. Ideiglenes munkaszint + horgonyzás', 'A vízen úszó pontonról (vagy előre, szárazon a munkaszintről) sűrű, kb. 2,5–3,5 m-es rácsban húzott cölöpök készülnek: GEWI-rúd vagy mikrocölöp, habarccsal a mélyebb rétegekbe injektálva.'],
  ['4. Víz alatti betonozás', 'Búvárok megtisztítják a horgonyfejeket, leszívják az iszapot. A lemezt <strong>kontraktor eljárással</strong> betonozzák: a cső vége végig a friss betonban marad. Jellemző vastagság 1–1,5 m.'],
  ['5. Leszivattyúzás', 'Szilárdulás után a vizet fokozatosan kiszivattyúzzák. Alulról a teljes víznyomás nyomja a lemezt – lent a lemez <strong>súlya + a horgonyok húzóereje</strong> tartja.'],
  ['6. Horgony rögzítése, alaplemez', 'Szárazon a horgonyvégeket rögzítik (lemez + anya), majd a víz alatti lemezre megépül a végleges alaplemez és a szerkezet.'],
];
register('uwphases', (root) => {
  const { viz } = shell(root, { layout: 'wide', out: false });
  const S = figure(viz, 760, 380);
  const nav = h('div', { class: 'play-row' });
  const prev = h('button', { class: 'btn btn-line btn-sm', type: 'button' }, '← Előző');
  const next = h('button', { class: 'btn btn-line btn-sm', type: 'button' }, 'Következő →');
  const auto = h('button', { class: 'btn btn-line btn-sm', type: 'button' }, '▶ Lejátszás');
  const dots = h('div', { class: 'stepbtns' });
  UW_STEPS.forEach((_, i) => dots.append(h('button', { type: 'button', onclick: () => go(i), 'aria-label': `${i}. fázis` }, String(i))));
  nav.append(prev, dots, next, auto);
  const text = h('div', { class: 'steptext' });
  viz.append(nav, text);
  let k = 0, timer = null;
  const go = (i) => { k = (i + UW_STEPS.length) % UW_STEPS.length; draw(); };
  prev.addEventListener('click', () => { stop(); go(k - 1); });
  next.addEventListener('click', () => { stop(); go(k + 1); });
  const stop = () => { if (timer) { clearInterval(timer); timer = null; auto.textContent = '▶ Lejátszás'; } };
  auto.addEventListener('click', () => { if (timer) return stop(); auto.textContent = '❚❚ Megállítás'; if (k === UW_STEPS.length - 1) go(0); timer = setInterval(() => { if (k >= UW_STEPS.length - 1) return stop(); go(k + 1); }, 3800); });

  function draw() {
    clear(S);
    const top = 70, gw = 100, xL = 190, xR = 570, botEx = 262, slabT = 240, sheetB = 330;
    svg('rect', { x: 0, y: 0, width: 760, height: top, class: 'f-sky' }, S);
    // talaj
    svg('rect', { x: 0, y: top, width: 760, height: 380 - top, class: 'f-soilD' }, S);
    svg('rect', { x: 0, y: top, width: 760, height: 380 - top, fill: 'url(#pat-gravel)' }, S);
    svg('rect', { x: 0, y: 352, width: 760, height: 28, class: 'f-soilB' }, S);
    svg('rect', { x: 0, y: 352, width: 760, height: 28, fill: 'url(#pat-clay)' }, S);
    txt(S, 12, 370, 'vízzáró réteg – nagyon mélyen', 't-sm');
    // talajvíz kívül
    svg('rect', { x: 0, y: gw, width: 760, height: 352 - gw, class: 'f-water', opacity: 0.55 }, S);
    svg('line', { x1: 0, y1: gw, x2: 760, y2: gw, class: 's-water', 'stroke-width': 1.6, 'stroke-dasharray': '7 5' }, S);
    txt(S, 650, gw - 6, '▽ talajvíz', 't-sm t-water');
    // szomszéd ház + fa
    svg('rect', { x: 26, y: 20, width: 110, height: top - 20, class: 'f-bld' }, S);
    for (let i = 0; i < 3; i++) svg('rect', { x: 38 + i * 33, y: 30, width: 20, height: 14, class: 'f-bg2' }, S);
    svg('rect', { x: 680, y: 40, width: 6, height: top - 40, class: 'f-timber2' }, S);
    svg('circle', { cx: 683, cy: 34, r: 18, fill: 'var(--ok)', opacity: 0.75 }, S);
    txt(S, 380, 200, 'homok, kavics – jó vízvezető', 't-lab', { 'text-anchor': 'middle', style: 'fill:var(--ink2)' });
    if (k === 0) { svg('rect', { x: xL, y: top, width: xR - xL, height: botEx - top, fill: 'none', class: 's-ink', 'stroke-width': 1.5, 'stroke-dasharray': '7 5' }, S); txt(S, (xL + xR) / 2, top + 22, 'tervezett munkagödör', 't-sm', { 'text-anchor': 'middle' }); }
    if (k >= 1) {
      // munkagödör
      const exDepth = k >= 2 ? botEx : top;
      svg('rect', { x: xL, y: top, width: xR - xL, height: exDepth - top, fill: 'var(--surface)' }, S);
      // víz a gödörben
      const wl = k >= 5 ? (k >= 5 ? slabT : gw) : gw;
      if (k >= 2 && k < 5) { svg('rect', { x: xL, y: gw, width: xR - xL, height: exDepth - gw, class: 'f-water' }, S); svg('rect', { x: xL, y: gw, width: xR - xL, height: exDepth - gw, fill: 'url(#pat-water)' }, S); }
      sheetPile(S, xL, top - 12, sheetB, 8); sheetPile(S, xR, top - 12, sheetB, 8);
      if (k === 1) { txt(S, xR + 12, 200, 'szádfal', 't-lab'); svg('path', { d: `M ${(xL + xR) / 2} 330 q 0 -60 0 -150`, fill: 'none', class: 's-water', 'stroke-width': 2.4, 'stroke-dasharray': '6 5', 'marker-end': 'url(#arr)' }, S); txt(S, (xL + xR) / 2 + 8, 300, 'alulról a víz bejönne', 't-sm t-water'); }
      if (k === 2) {
        // markoló
        svg('line', { x1: 430, y1: 0, x2: 430, y2: 200, class: 's-ink', 'stroke-width': 1.5 }, S);
        svg('path', { d: 'M 416 200 l 28 0 l -4 18 l -20 0 z', class: 'f-steel2' }, S);
        txt(S, 448, 170, 'markolás víz alatt', 't-sm');
        txt(S, (xL + xR) / 2, 150, '„mesterséges tó”', 't-big t-water', { 'text-anchor': 'middle' });
      }
      // horgonyok
      if (k >= 3) {
        const n = 7;
        for (let i = 0; i < n; i++) {
          const x = xL + 30 + (i * (xR - xL - 60)) / (n - 1);
          svg('line', { x1: x, y1: slabT + 6, x2: x, y2: 345, class: 's-ink', 'stroke-width': 2.2 }, S);
          svg('rect', { x: x - 4, y: 290, width: 8, height: 55, rx: 4, class: 'f-grout' }, S);
          if (k >= 5) svg('line', { x1: x, y1: slabT + 6, x2: x, y2: 345, class: k >= 5 ? 's-bad' : 's-ink', 'stroke-width': 2.4, opacity: 0.8 }, S);
          if (k >= 3) svg('rect', { x: x - 7, y: slabT + 4, width: 14, height: 4, class: 'f-steel2' }, S);
        }
      }
      if (k === 3) {
        // ponton + fúrógép
        svg('rect', { x: 300, y: gw - 10, width: 170, height: 12, rx: 3, fill: 'var(--g4)' }, S);
        svg('rect', { x: 370, y: gw - 70, width: 6, height: 62, class: 'f-steel2' }, S);
        svg('rect', { x: 352, y: gw - 26, width: 40, height: 16, class: 'f-acc' }, S);
        svg('line', { x1: 373, y1: gw, x2: 373, y2: botEx, class: 's-ink', 'stroke-width': 2, 'stroke-dasharray': '4 3' }, S);
        txt(S, 476, gw - 14, 'ponton + fúrógép', 't-sm');
      }
      // betonlemez
      if (k >= 4) {
        svg('rect', { x: xL + 4, y: slabT, width: xR - xL - 8, height: botEx - slabT, class: 'f-conc' }, S);
        svg('rect', { x: xL + 4, y: slabT, width: xR - xL - 8, height: botEx - slabT, fill: 'url(#pat-conc)' }, S);
      }
      if (k === 4) {
        for (const x of [290, 380, 470]) { svg('rect', { x: x - 4, y: gw - 30, width: 8, height: slabT - gw + 34, class: 'f-steel', opacity: 0.9 }, S); svg('path', { d: `M ${x - 14} ${gw - 44} l 28 0 l -10 14 l -8 0 z`, class: 'f-steel2' }, S); }
        // búvár
        svg('circle', { cx: 520, cy: 214, r: 7, fill: 'var(--accent)' }, S);
        svg('rect', { x: 512, y: 220, width: 20, height: 9, rx: 4, class: 'f-ink' }, S);
        svg('path', { d: 'M 520 207 C 520 160, 560 140, 560 92', fill: 'none', class: 's-ink', 'stroke-width': 1.2 }, S);
        txt(S, 536, 205, 'búvár', 't-sm');
        txt(S, 300, 232, 'kontraktorcsövek – a cső vége a friss betonban', 't-sm');
      }
      if (k >= 5) {
        // száraz gödör, felhajtóerő-nyilak
        for (let i = 0; i < 9; i++) { const x = xL + 26 + i * 42; carrow(S, x, botEx + 40, x, botEx + 6, 'var(--water)', 2.2); }
        txt(S, xR - 10, botEx + 52, 'víznyomás alulról', 't-sm t-water', { 'text-anchor': 'end' });
        if (k === 5) { svg('rect', { x: xR - 50, y: slabT - 14, width: 18, height: 14, rx: 3, fill: 'var(--g4)' }, S); svg('path', { d: `M ${xR - 41} ${slabT - 14} C ${xR - 41} 60, ${xR + 30} 50, ${xR + 60} 60`, fill: 'none', class: 's-ink', 'stroke-width': 3, opacity: 0.6 }, S); txt(S, xR - 120, slabT - 20, 'leszivattyúzás', 't-sm'); }
        txt(S, (xL + xR) / 2, 200, 'a horgonyok lefelé húzzák a lemezt', 't-lab', { 'text-anchor': 'middle' });
      }
      if (k >= 6) {
        svg('rect', { x: xL + 4, y: slabT - 22, width: xR - xL - 8, height: 22, class: 'f-conc2' }, S);
        txt(S, (xL + xR) / 2, slabT - 7, 'végleges alaplemez', 't-sm', { 'text-anchor': 'middle', style: 'fill:var(--surface)' });
        // pincefal kezdete
        svg('rect', { x: xL + 6, y: top + 10, width: 12, height: slabT - top - 32, class: 'f-conc2' }, S);
        svg('rect', { x: xR - 18, y: top + 10, width: 12, height: slabT - top - 32, class: 'f-conc2' }, S);
      }
      if (k >= 4 || k === 2) dim(S, xR + 26, botEx, xR + 26, slabT, k >= 4 ? '1–1,5 m' : '', { dx: 6, anchor: 'start' });
    }
    text.innerHTML = `<b class="kd-sh">${UW_STEPS[k][0]}</b>${UW_STEPS[k][1]}`;
    [...dots.children].forEach((b, i) => b.classList.toggle('on', i === k));
    prev.disabled = false; next.disabled = false;
  }
  draw();
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
    h('button', { type: 'button', onclick: () => { anc.set(false, false); H.set(12, false); t.set(9, false); upd(); } }, 'Horgony nélkül, t = 9 m'),
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
  function draw(u, g, ra, mu) {
    clear(S);
    const top = 40, xL = 110, xR = 650, gwY = 60;
    const lift = mu > 1 ? Math.min(14, (mu - 1) * 30 + 5) : 0;
    const slabTop = 210 - lift, tpx = clamp(t.v * 9, 7, 108);
    svg('rect', { x: 0, y: 0, width: 760, height: 340, class: 'f-soilD' }, S);
    svg('rect', { x: 0, y: 0, width: 760, height: 340, fill: 'url(#pat-gravel)' }, S);
    svg('rect', { x: 0, y: gwY, width: 760, height: 280, class: 'f-water', opacity: 0.5 }, S);
    svg('rect', { x: 0, y: 0, width: 760, height: 24, class: 'f-sky' }, S);
    svg('line', { x1: 0, y1: gwY, x2: xL, y2: gwY, class: 's-water', 'stroke-width': 1.6, 'stroke-dasharray': '7 5' }, S);
    svg('line', { x1: xR, y1: gwY, x2: 760, y2: gwY, class: 's-water', 'stroke-width': 1.6, 'stroke-dasharray': '7 5' }, S);
    txt(S, 8, gwY - 6, '▽ talajvíz', 't-sm t-water');
    // gödör
    svg('rect', { x: xL, y: 24, width: xR - xL, height: slabTop - 24 + lift, fill: 'var(--surface)' }, S);
    sheetPile(S, xL, 16, 320, 8); sheetPile(S, xR, 16, 320, 8);
    // lemez
    svg('rect', { x: xL + 4, y: slabTop, width: xR - xL - 8, height: tpx, class: mu > 1 ? 'f-bad' : 'f-conc', opacity: mu > 1 ? 0.55 : 1 }, S);
    svg('rect', { x: xL + 4, y: slabTop, width: xR - xL - 8, height: tpx, fill: 'url(#pat-conc)' }, S);
    if (mu > 1) for (const x of [240, 380, 520]) svg('path', { d: `M ${x} ${slabTop} l 6 ${tpx * 0.4} l -8 ${tpx * 0.3} l 5 ${tpx * 0.3}`, fill: 'none', class: 's-bad', 'stroke-width': 2 }, S);
    // horgonyok
    if (anc.v) {
      const nA = Math.max(2, Math.round(30 / a.v));
      for (let i = 0; i < nA; i++) {
        const x = xL + 30 + (i * (xR - xL - 60)) / (nA - 1);
        const col = mu > 1 ? 'var(--bad)' : ra > 0 ? 'var(--steelm2)' : 'var(--muted)';
        svg('line', { x1: x, y1: slabTop + tpx - 4, x2: x, y2: 330, stroke: col, 'stroke-width': 2.4 }, S);
        svg('rect', { x: x - 4, y: 280, width: 8, height: 50, rx: 4, class: 'f-grout' }, S);
        svg('rect', { x: x - 7, y: slabTop + tpx - 8, width: 14, height: 4, class: 'f-steel2' }, S);
      }
    }
    // nyilak: víznyomás fel, súly le
    const uLen = clamp(u / 4, 10, 70), gLen = clamp(g / 4, 6, 70);
    for (let i = 0; i < 7; i++) {
      const x = xL + 60 + i * 72;
      carrow(S, x, slabTop + tpx + uLen + 6, x, slabTop + tpx + 4, 'var(--water)', 2.4);
    }
    carrow(S, 140, slabTop - gLen - 4, 140, slabTop - 2, 'var(--ink)', 2.6);
    txt(S, 150, slabTop - gLen / 2 - 2, `súly ${fmt(g, 0)} kPa`, 't-num halo');
    txt(S, xR - 10, Math.min(332, slabTop + tpx + uLen + 4), `víznyomás ${fmt(u, 0)} kPa`, 't-num t-water halo', { 'text-anchor': 'end' });
    if (anc.v) txt(S, 380, 318, `horgonyok ${fmt(a.v, 1)} × ${fmt(a.v, 1)} m-es rácsban`, 't-sm halo', { 'text-anchor': 'middle' });
    dim(S, 60, gwY, 60, slabTop, `H = ${fmt(H.v, 1)} m`, { dx: 0, dy: -8 });
    dim(S, xR + 40, slabTop, xR + 40, slabTop + tpx, `t = ${fmt(t.v, 1)} m`, { dx: 8, anchor: 'start' });
    if (mu > 1) txt(S, 380, slabTop - 14, 'FELÚSZIK', 't-big t-bad', { 'text-anchor': 'middle' });
    else txt(S, 380, 110, 'száraz munkatér', 't-big', { 'text-anchor': 'middle', style: 'fill:var(--muted)' });
  }
  [H, t, gc, a, R].forEach((c) => c.on(upd));
  anc.on(upd);
  upd();
});

/* ================================================================== KVÍZ */
defineQuiz('kulonleges', 'Kvíz – különleges megoldások', [
  { q: 'Milyen hőmérsékletű a folyékony nitrogén, amellyel talajt fagyasztanak?', a: ['−196 °C', 'kb. −30 °C', 'kb. −78 °C', '−12 °C'], c: 0, e: 'A folyékony nitrogén −196 °C-os, nyílt rendszerben elpárolog: gyors (kb. 1–3 hét), de drága. A sólés (kalcium-klorid) hűtés kb. −25…−40 °C-os, zárt körben kering, lassabb (kb. 4–8 hét).' },
  { q: 'Miért veszélyes a talajfagyasztásnál az áramló talajvíz?', a: ['Hőt szállít: a jéghengerek nem tudnak összezárni, „ablak” marad a falban', 'Mert a sólé feloldódik benne', 'Mert az áramló víz gyorsabban fagy meg, és szétfeszíti a csöveket', 'Nem veszélyes, csak a fagyasztás költségét növeli'], c: 0, e: 'Az áramló víz folyamatosan hozza a meleget. Sólénál már kb. 1–2 m/nap áramlás meghiúsíthatja a záródást; ilyenkor nitrogén, sűrűbb csőosztás vagy előzetes injektálás segít.' },
  { q: 'Mi a kontraktor eljárás lényege víz alatti betonozásnál?', a: ['A betonozócső vége végig a friss betonban marad, a beton alulról emelkedik', 'A betont a víz felszínéről szórják a gödörbe', 'A gödröt előbb leszivattyúzzák, utána betonoznak', 'Előregyártott betonlemezeket süllyesztenek le'], c: 0, e: 'Így a beton nem hullik át a vízen, nem osztályozódik és nem mosódik ki belőle a cement. A betonozás folyamatos, gyakran éjjel-nappal tart.' },
  { q: 'Mi tartja lent a víz alatti alaplemezt a leszivattyúzás után?', a: ['A lemez súlya és a húzott cölöpök (horgonyok) ereje', 'Csak a szádfalak súrlódása', 'A gödörben maradt víz súlya', 'A lemez alatti vákuum'], c: 0, e: 'Alulról a teljes víznyomás hat. Horgony nélkül a víztelenített mélység kb. 0,7–0,9-szeresének megfelelő vastag beton kellene (12 m-nél kb. 9 m); horgonyokkal 1–1,5 m is elég.' },
  { q: 'Melyik gáttípus önálló gravitációs szerkezet, amelyben a homokkal töltött acélhenger „hordóként” dolgozik?', a: ['Cellás szádfalgát', 'Egyfalú, merevített szádfalgát', 'Berlini dúcolat', 'Földgát agyagmaggal'], c: 0, e: 'A cellás gát egyenes gerincű pallókból álló, homokkal töltött körcellákból áll: a töltés gyűrűirányú húzást kelt a pallókban, ezt a zárak viszik át. Belül nincs merevítés.' },
  { q: 'Hogyan készültek a 4-es metró Fővám téri állomásánál a Duna-part alatti peronalagutak?', a: ['Bányászati (NATM) módszerrel, talajfagyasztás védelmében', 'Szádfalas gátban, víz alatti betondugóval', 'Berlini dúcolattal, talajvízszint-süllyesztéssel', 'Talajszegezéssel'], c: 0, e: 'Az állomás dobozát a felszínről építették; a Duna-part alá nyúló peronalagutak bányászati módszerrel, talajfagyasztás védelmében készültek.' },
  { q: 'Mit jelent a gátnál a szabadmagasság?', a: ['Mennyivel ér a gát koronája a mértékadó vízszint fölé', 'A gát és a munkagödör közötti távolságot', 'A szádfal befogási mélységét', 'A szivattyú emelőmagasságát'], c: 0, e: 'Ajánlás szerint legalább kb. 0,9 m, illetve a várható hullámmagasság fölé kell érnie – különben egy váratlan árhullám átbukik, és elárasztja a munkagödröt.' },
]);
