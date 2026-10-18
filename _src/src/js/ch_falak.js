// 04 – Munkatérhatároló falak: berlini dúcolat, jet-grouting fal, zagyfal, mélykevert fal, szádfalak, cölöpfal
import { register, shell, slider, seg, toggle, select, stat, verdict, svg, figure, clear, fmt, clamp, lerp, pathD, h, loop } from './core.js';
import { defineQuiz } from './ui.js';

/* ------------------------------------------------------------------ apró rajzsegédek */
const T = (p, x, y, s, cls = 't-lab', o = {}) => svg('text', { x, y, class: cls, text: s, ...o }, p);
const R = (p, x, y, w, hh, cls, o = {}) => svg('rect', { x, y, width: Math.max(0, w), height: Math.max(0, hh), class: cls, ...o }, p);
const C = (p, cx, cy, r, cls, o = {}) => svg('circle', { cx, cy, r: Math.max(0, r), class: cls, ...o }, p);
const L = (p, x1, y1, x2, y2, style, o = {}) => svg('line', { x1, y1, x2, y2, style, ...o }, p);
/** nyíl, téma-színnel: col pl. 'var(--water)' */
function ar(p, x1, y1, x2, y2, col = 'var(--ink)', w = 2, hd = 7) {
  const g = svg('g', {}, p);
  const a = Math.atan2(y2 - y1, x2 - x1);
  L(g, x1, y1, x2 - Math.cos(a) * hd * 0.6, y2 - Math.sin(a) * hd * 0.6, `stroke:${col};stroke-width:${w};stroke-linecap:round`);
  svg('path', { d: pathD([[x2, y2], [x2 - Math.cos(a - 0.45) * hd, y2 - Math.sin(a - 0.45) * hd], [x2 - Math.cos(a + 0.45) * hd, y2 - Math.sin(a + 0.45) * hd]], true), style: `fill:${col}` }, g);
  return g;
}
/** H/I-szelvény felülnézetben: övek a falvonallal párhuzamosak */
function hbeam(p, cx, cy, b, d, cls = 'f-steel2') {
  const tf = Math.max(1.6, d * 0.12), tw = Math.max(1.4, b * 0.09);
  const g = svg('g', { class: cls }, p);
  R(g, cx - b / 2, cy - d / 2, b, tf, '');
  R(g, cx - b / 2, cy + d / 2 - tf, b, tf, '');
  R(g, cx - tw / 2, cy - d / 2, tw, d, '');
  return g;
}
/** talaj- és munkatér-háttér felülnézethez */
function planBg(p, W, yWall0, yWall1, H, soil = 'f-soilA', pat = 'pat-sand') {
  R(p, 0, 0, W, yWall1, soil);
  R(p, 0, 0, W, yWall1, '', { fill: `url(#${pat})`, opacity: 0.8 });
  R(p, 0, yWall1, W, H - yWall1, 'f-bg2');
  T(p, 10, 18, 'FÖLDOLDAL', 't-sm');
  T(p, 10, H - 10, 'MUNKATÉR (gödör)', 't-sm');
}
const S = (p) => { const g = svg('g', {}, p); return g; };

/* ================================================================== 1. Felülnézet-váltó */
const PLAN = {
  berlini: { t: 'Berlini dúcolat', el: 'acél I/H-tartók', fill: 'fapallók (vb. pallók)', wat: ['bad', 'nem vízzáró'], cap: 'Acél I-tartók 1–3 m-enként (ált. 2 m); közöttük a kiemeléssel lépést tartva vízszintes pallók, az övlemezekhez kiékelve. Teherút: palló → tartó → támasz vagy befogás.' },
  jet: { t: 'Jet-grouting fal', el: 'acéltag (I/H, cső)', fill: 'metsző jet-oszlopok', wat: ['ok', 'kvázi vízzáró'], cap: 'Egymást metsző jet-oszlopok (Ø 60–120 cm, osztás: D − 10–20 cm); acéltag csak a fúrás tengelyének 15–20 cm-es környezetébe fér. Pallózás és utólagos furatkitöltés nem kell.' },
  zagy: { t: 'Erősített önszilárduló zagyfal', el: 'acél I/H-gerendák', fill: 'szilárdult zagy', wat: ['ok', 'kvázi vízzáró'], cap: 'Résfalszerűen, zagy alatt markolt rés; a beton helyett maga a cementtartalmú zagy szilárdul meg. A zagy boltozódva adja át a föld- és víznyomást a gerendáknak.' },
  dsm: { t: 'Erősített mélykevert fal', el: 'acél I/H-szelvények', fill: 'talajcement panelek', wat: ['ok', 'vízszivárgás-gátló'], cap: 'Nedves mélykeveréssel (pl. CSM: 2,4–2,8 m × 0,55–1,2 m-es panelek) helyben kevert talajcement; a friss keverékbe acél I/H-szelvényeket állítanak.' },
  szad: { t: 'Acél szádfal', el: 'acélpallók', fill: '– (folytonos fal)', wat: ['ok', 'vízzáró (a zárakon csekély szivárgás)'], cap: 'Hornyos zárakkal egymásba fűzött U (Larssen) vagy Z (Hoesch) acélpallók folytonos fala. Ideiglenes falként teljesen visszahúzható és újra felhasználható.' },
  colH: { t: 'Hézagos cölöpfal', el: 'vb. cölöpök (CFA)', fill: 'boltozódó talaj', wat: ['bad', 'nem vízzáró'], cap: 'Cölöpök 20–60 cm-es (legfeljebb D) hézaggal; a talaj átboltozódik közöttük, a felületet kipergés ellen háló + lőttbeton védi. Hazánkban ez terjedt el leginkább.' },
  colE: { t: 'Érintkező cölöpfal', el: 'vb. cölöpök', fill: '– (tengelytáv = D)', wat: ['warn', 'nem vízzáró'], cap: 'Ha a talaj önmagában nem állékony (szemcsés talaj), de vízzárás nem kell, vagy statikailag sűrű kiosztás szükséges.' },
  colM: { t: 'Összemetsző cölöpfal', el: 'vasalt szekunder', fill: 'vasalatlan primer', wat: ['ok', 'vízzáró'], cap: 'Először a vasalatlan primer cölöpök, majd közéjük kb. 10–12 cm átfúrással a vasalt szekunder cölöpök. Csak minden második vasalt.' },
  res: { t: 'Résfal', el: 'vb. panelek', fill: '– (folytonos fal)', wat: ['ok', 'vízzáró'], cap: 'Zagy alatt markolt, vasalt és betonozott panelek: merev, vízzáró fal, gyakran a végleges szerkezet része (lásd a mélyalapozásoknál).' },
};
register('falPlan', (root) => {
  const { ctrls, viz, out } = shell(root);
  const s = seg(ctrls, { label: 'Falfajta', options: Object.entries(PLAN).map(([v, o]) => ({ v, t: o.t.replace('Erősített önszilárduló ', '').replace('Erősített ', '') })), value: 'berlini' });
  const gw = toggle(ctrls, { label: 'Talajvíz a fal mögött', value: true });
  ctrls.append(h('p', { class: 'ctl-hint', html: 'Felülnézet egy kb. 8 m hosszú falszakaszra. Felül a megtámasztott talaj, alul a munkagödör.' }));
  const fig = figure(viz, 640, 300);
  const cap = h('p', { class: 'fal-cap' }); viz.append(cap);
  const sEl = stat(out, { label: 'Teherhordó elem' }), sFi = stat(out, { label: 'Mező / kitöltés' }), sW = stat(out, { label: 'Vízzárás' });
  const W = 640, H = 300, k = 80, yc = 150;
  const draw = () => {
    clear(fig);
    const typ = s.v, o = PLAN[typ];
    const g = S(fig);
    const leaks = [];
    planBg(g, W, 0, yc, H);
    if (gw.v) R(g, 0, 26, W, yc - 40, '', { fill: 'url(#pat-water)', opacity: 0.9 });
    if (typ === 'berlini') {
      R(g, 0, yc, W, H - yc, 'f-bg2');
      const xs = [80, 240, 400, 560];
      for (let i = 0; i < xs.length - 1; i++) {
        R(g, xs[i] + 4, yc - 1, xs[i + 1] - xs[i] - 8, 9, 'f-timber', { style: 'stroke:var(--timber2);stroke-width:1' });
        R(g, xs[i] + 4, yc - 1, xs[i + 1] - xs[i] - 8, 9, '', { fill: 'url(#pat-timber)' });
        for (const xw of [xs[i] + 9, xs[i + 1] - 9]) svg('path', { d: `M${xw - 4} ${yc + 8} l8 0 l-4 6 z`, class: 'f-timber2' }, g);
        leaks.push((xs[i] + xs[i + 1]) / 2);
      }
      xs.forEach((x) => hbeam(g, x, yc + 2, 24, 24));
      T(g, 240, yc + 34, 'heveder nélkül: palló + ék', 't-sm', { 'text-anchor': 'middle' });
    } else if (typ === 'jet') {
      const D = 72, sp = 60;
      for (let i = 0; i < 10; i++) C(g, 50 + i * sp, yc, D / 2, 'f-grout', { style: 'stroke:var(--concrete2);stroke-width:1.2', opacity: 0.96 });
      for (let i = 0; i < 10; i++) { C(g, 50 + i * sp, yc, 8, '', { style: 'fill:none;stroke:var(--muted);stroke-dasharray:2 2' }); if (i % 2 === 0) hbeam(g, 50 + i * sp, yc, 11, 11); }
      T(g, 50, yc + 56, 'Ø 60–120 cm', 't-sm');
    } else if (typ === 'zagy') {
      R(g, 0, yc - 24, W, 48, 'f-grout', { style: 'stroke:var(--concrete2);stroke-width:1' });
      const xs = [80, 200, 320, 440, 560];
      for (let i = 0; i < xs.length - 1; i++) svg('path', { d: `M${xs[i] + 10} ${yc + 14} Q ${(xs[i] + xs[i + 1]) / 2} ${yc - 42} ${xs[i + 1] - 10} ${yc + 14}`, style: 'fill:none;stroke:var(--grp);stroke-width:3;stroke-dasharray:6 4' }, g);
      xs.forEach((x) => hbeam(g, x, yc, 24, 24));
      T(g, 270, yc + 46, 'boltozódás a gerendák között', 't-sm t-grp');
    } else if (typ === 'dsm') {
      const Lp = 192, tk = 44, step = 172;
      const cx = [50, 50 + step, 50 + 2 * step, 50 + 3 * step];
      cx.forEach((x, i) => { if (i % 2 === 0) R(g, x - Lp / 2, yc - tk / 2, Lp, tk, 'f-grout', { style: 'stroke:var(--concrete2);stroke-width:1' }); });
      cx.forEach((x, i) => { if (i % 2 === 1) R(g, x - Lp / 2, yc - tk / 2, Lp, tk, 'f-shot', { style: 'stroke:var(--concrete2);stroke-width:1' }); });
      cx.forEach((x) => { hbeam(g, x - 46, yc, 22, 22); hbeam(g, x + 46, yc, 22, 22); });
      cx.forEach((x, i) => T(g, x, yc + 44, i % 2 ? 'szekunder' : 'primer', 't-sm', { 'text-anchor': 'middle' }));
    } else if (typ === 'szad') {
      const b = 48, f = 20, a = 17; const pts = [];
      for (let i = 0; i < 14; i++) { const x0 = -4 + i * b, sg = i % 2 ? 1 : -1; pts.push([x0, yc], [x0 + (b - f) / 2, yc + sg * a], [x0 + (b + f) / 2, yc + sg * a]); }
      R(g, 0, yc - 1, W, 22, 'f-soilA'); R(g, 0, yc - 1, W, 22, '', { fill: 'url(#pat-sand)', opacity: 0.8 });
      svg('path', { d: pathD([...pts, [W, yc], [W, H], [0, H]], true), class: 'f-bg2' }, g);
      svg('path', { d: pathD(pts), style: 'fill:none;stroke:var(--steelm2);stroke-width:4;stroke-linejoin:round' }, g);
      for (let i = 1; i < 14; i++) C(g, -4 + i * b, yc, 3.6, i % 2 ? 'f-surface' : 'f-acc', { style: 'stroke:var(--ink);stroke-width:1.2' });
      leaks.push(-4 + 3 * b, -4 + 9 * b);
      T(g, 10, yc + 46, 'zárak (●: gyárilag sajtolt, ○: helyszínen fűzött)', 't-sm');
    } else if (typ.startsWith('col')) {
      const D = 48, sp = typ === 'colH' ? 72 : typ === 'colE' ? 48 : 40;
      const n = Math.floor((W - 40) / sp) + 1;
      if (typ === 'colH') for (let i = 0; i < n - 1; i++) { const x = 40 + i * sp; svg('path', { d: `M${x + 14} ${yc + 20} Q ${x + sp / 2} ${yc + 30} ${x + sp - 14} ${yc + 20}`, style: 'fill:none;stroke:var(--shot);stroke-width:7' }, g); leaks.push(x + sp / 2); }
      for (let pass = 0; pass < 2; pass++) for (let i = 0; i < n; i++) {
        const prim = typ === 'colM' && i % 2 === 0;
        if (typ === 'colM' && (pass === 0) !== prim) continue;
        if (typ !== 'colM' && pass === 1) continue;
        const x = 40 + i * sp;
        C(g, x, yc, D / 2, prim ? 'f-grout' : 'f-conc', { style: 'stroke:var(--concrete2);stroke-width:1.2' });
        if (!prim) { C(g, x, yc, D / 2 - 7, '', { style: 'fill:none;stroke:var(--bad);stroke-width:1.4;stroke-dasharray:3 2' }); }
      }
      if (typ === 'colE') for (let i = 0; i < n - 1; i++) leaks.push(40 + i * sp + sp / 2);
      if (typ === 'colM') { T(g, 40, yc + 46, 'világos: primer (vasalatlan) · sötét, piros kosárral: szekunder (vasalt)', 't-sm'); }
      else T(g, 40, yc + 52, typ === 'colH' ? 'hézag 20–60 cm (≤ D) · lőttbeton a cölöpközökben' : 'tengelytáv = D', 't-sm');
    } else if (typ === 'res') {
      R(g, 0, yc - 32, W, 64, 'f-conc', { style: 'stroke:var(--concrete2);stroke-width:1' });
      R(g, 0, yc - 32, W, 64, '', { fill: 'url(#pat-conc)' });
      for (let x = 100; x < W; x += 224) L(g, x, yc - 32, x, yc + 32, 'stroke:var(--ink);stroke-width:2');
      for (let x = -124; x < W; x += 224) R(g, x + 12, yc - 22, 200, 44, '', { style: 'fill:none;stroke:var(--bad);stroke-width:1.2;stroke-dasharray:4 3' });
      T(g, 108, yc + 50, 'panelhézag (ütközőcső / fugaszalag)', 't-sm');
    }
    // szivárgás
    if (gw.v) {
      const big = o.wat[0] === 'bad', mid = o.wat[0] === 'warn';
      for (const x of leaks) {
        if (big) { ar(g, x, yc - 70, x, yc + 70, 'var(--water)', 3, 10); }
        else if (mid) ar(g, x, yc - 50, x, yc + 40, 'var(--water)', 2, 7);
        else ar(g, x, yc - 40, x, yc + 26, 'var(--water)', 1.2, 5);
      }
      const ok = o.wat[0] === 'ok';
      T(g, W - 10, H - 12, ok ? '✓ a talajvíz kizárható' : '✗ a víz átszivárog – csak talajvíz felett / víztelenítéssel', ok ? 't-lab t-ok halo' : 't-lab t-bad halo', { 'text-anchor': 'end' });
    }
    cap.innerHTML = `<b>${o.t}.</b> ${o.cap}`;
    sEl.set(o.el); sFi.set(o.fill); sW.set(o.wat[1], o.wat[0]);
  };
  s.on(draw); gw.on(draw); draw();
});

/* ================================================================== 2. Falválasztó mátrix */
const CRIT = [
  { v: 'viz', t: 'Vízzárás' }, { v: 'rez', t: 'Zaj-, rezgésmentesség' }, { v: 'mely', t: 'Elérhető mélység' },
  { v: 'ujra', t: 'Újrafelhasználás' }, { v: 'vegl', t: 'Végleges szerkezet' }, { v: 'gep', t: 'Gépesítettség (kevés élőmunka)' }, { v: 'hely', t: 'Szűk hely, kis gép' },
];
const WALLS = [
  { k: 'berlini', t: 'Berlini dúcolat', a: '#berlini', viz: [0, 'nem vízzáró'], rez: [2, 'furatba helyezve csendes, verve zajos'], mely: [2, 'jellemzően 12–15 m, horgonysorokkal több'], ujra: [3, 'a tartók kihúzhatók, újra felhasználhatók'], vegl: [0, 'ideiglenes'], gep: [0, 'nagy élőmunka-igény (pallózás kézzel)'], hely: [2, 'fúrógép / vibrátor + kis kotró'] },
  { k: 'jet', t: 'Jet-grouting fal', a: '#jetfal', viz: [2, 'kvázi vízzáró'], rez: [3, 'rezgésmentes'], mely: [2, 'gépfüggő, kb. 15–30 m'], ujra: [0, 'a talajban marad'], vegl: [1, 'jellemzően ideiglenes, ritkán végleges'], gep: [2, 'gépi, de sok iszap keletkezik'], hely: [3, 'kis gép, akár épület mellett'] },
  { k: 'zagy', t: 'Erősített zagyfal', a: '#zagyfal', viz: [2, 'kvázi vízzáró (k ≈ 10⁻⁹ m/s)'], rez: [3, 'rezgésmentes'], mely: [1, 'jellemzően legfeljebb 7–10 m'], ujra: [0, 'a talajban marad'], vegl: [0, 'ideiglenes'], gep: [2, 'gépi markolás'], hely: [1, 'keverőtelep, munkasáv kell'] },
  { k: 'dsm', t: 'Erősített mélykevert fal', a: '#dsmfal', viz: [2, 'vízszivárgás-gátló (k ≈ 10⁻⁸ m/s)'], rez: [3, 'rezgésmentes, csendes'], mely: [3, 'CSM: szokásosan < 20 m, akár 50 m felett'], ujra: [0, 'a talajban marad'], vegl: [1, 'jellemzően ideiglenes'], gep: [3, 'teljesen gépesített, digitális naplózás'], hely: [1, 'nagy gép + keverőtelep'] },
  { k: 'szad', t: 'Acél szádfal', a: '#szadfal', viz: [3, 'vízzáró (tömítéssel még jobb)'], rez: [1, 'verés, vibrálás: zaj, rezgés (20–30 m-ig); a sajtolás csendes'], mely: [2, 'pallóhossz kb. 6–30 m'], ujra: [3, 'teljesen visszahúzható'], vegl: [2, 'ideiglenes és végleges (korrózióvédelemmel)'], gep: [3, 'gyors, gépi'], hely: [2, 'szűk helyen is, gyors'] },
  { k: 'colH', t: 'Hézagos cölöpfal', a: '#colopfal', viz: [0, 'nem vízzáró'], rez: [3, 'fúrt: közel rezgésmentes'], mely: [2, 'horgonyokkal, dúcokkal kb. 20 m-ig'], ujra: [0, 'nem'], vegl: [3, 'ideiglenes vagy végleges'], gep: [2, 'gépi, felületvédelem kell'], hely: [2, 'fúrógép'] },
  { k: 'colM', t: 'Összemetsző cölöpfal', a: '#colopfal', viz: [2, 'vízzáró lehet – ha megmarad az átfedés'], rez: [3, 'fúrt: közel rezgésmentes'], mely: [2, 'kb. 25 m-ig (a függőlegesség korlátoz)'], ujra: [0, 'nem'], vegl: [3, 'ideiglenes vagy végleges'], gep: [2, 'gépi, pontos fúrás kell'], hely: [2, 'fúrógép'] },
  { k: 'res', t: 'Résfal', a: '#resfal', viz: [3, 'vízzáró'], rez: [3, 'rezgésmentes'], mely: [3, 'több tíz méter'], ujra: [0, 'nem – végleges szerkezet'], vegl: [3, 'gyakran az épület fala'], gep: [2, 'gépi'], hely: [1, 'nagy gép, zagytelep'] },
];
const NEEDS = [
  { k: 'gw', t: 'A talajvíz a gödör feneke fölött van', c: 'viz', min: 2, why: 'nem zárja ki a talajvizet' },
  { k: 'vib', t: 'Rezgésérzékeny szomszéd épület', c: 'rez', min: 2, why: 'zajjal, rezgéssel jár' },
  { k: 'deep', t: 'Mély gödör (10 m felett)', c: 'mely', min: 2, why: 'ekkora mélységre nem jellemző' },
  { k: 'perm', t: 'A fal a végleges szerkezet része', c: 'vegl', min: 2, why: 'ideiglenes megoldás' },
  { k: 'reuse', t: 'Fontos az anyag újrafelhasználása', c: 'ujra', min: 2, why: 'a fal a talajban marad' },
  { k: 'tight', t: 'Szűk hely, kis gép', c: 'hely', min: 2, why: 'nagy gépet, telepet igényel' },
];
register('falMatrix', (root) => {
  const { ctrls, viz } = shell(root, { out: false });
  const cr = seg(ctrls, { label: 'Rendezési szempont', options: CRIT, value: 'viz', vert: true });
  ctrls.append(h('span', { class: 'ctl-lab', style: { marginTop: '6px' } }, 'A te munkagödröd:'));
  const togs = NEEDS.map((n) => toggle(ctrls, { label: n.t, value: n.k === 'gw' }));
  const list = h('div', { class: 'fm-list' }); viz.append(list);
  const sum = h('div', { class: 'verdict' }); viz.append(sum);
  const draw = () => {
    const c = cr.v;
    const act = NEEDS.filter((_, i) => togs[i].v);
    const rows = WALLS.map((w) => {
      const fails = act.filter((n) => w[n.c][0] < n.min);
      const weak = act.filter((n) => w[n.c][0] === n.min && n.min > 0 && w[n.c][0] < 3);
      return { w, fails, weak, sc: w[c][0], st: fails.length ? 'bad' : weak.length ? 'warn' : 'ok' };
    });
    const rank = { ok: 0, warn: 1, bad: 2 };
    rows.sort((a, b) => rank[a.st] - rank[b.st] || b.sc - a.sc);
    list.innerHTML = '';
    for (const r of rows) {
      const fit = act.length ? h('span', { class: 'chip ' + r.st }, r.st === 'ok' ? 'megfelel' : r.st === 'warn' ? 'feltételesen' : 'kizárva') : null;
      const why = r.fails.length ? h('span', { class: 'fm-why' }, '✗ ' + r.fails.map((n) => n.why).join('; ')) : null;
      list.append(h('a', { class: 'fm-row' + (r.st === 'bad' && act.length ? ' off' : ''), href: r.w.a },
        h('span', { class: 'fm-name' }, r.w.t),
        h('span', { class: 'fm-bar' }, h('i', { style: { width: (12 + r.sc * 29.3) + '%' } })),
        h('span', { class: 'fm-txt' }, r.w[c][1]),
        h('span', { class: 'fm-fit' }, fit), why));
    }
    const okN = rows.filter((r) => r.st === 'ok').map((r) => r.w.t);
    sum.dataset.s = act.length ? (okN.length ? 'ok' : 'warn') : '';
    sum.innerHTML = act.length ? (okN.length ? `<b>Szóba jöhet: ${okN.join(', ')}</b>A végső döntést a talaj, a mélység, a megtámasztás és a költség együtt adja – a táblázat csak az első szűrés.` : '<b>Egyik fal sem felel meg minden feltételnek</b>Ilyenkor kombinált megoldás kell (pl. vízzáró fal + víztelenítés, vagy résfal).') : '<b>Jelölj be feltételeket!</b>A sávok a kiválasztott szempont szerint rangsorolnak (tájékoztató, szemléltető értékelés).';
  };
  cr.on(draw); togs.forEach((t) => t.on(draw)); draw();
});

/* ================================================================== 3. Berlini dúcolat építése */
register('berliniBuild', (root) => {
  const { ctrls, viz, out } = shell(root, { foot: 'Szabályok: a pallózás legkésőbb 1,25 m mélységben kezdődjön, utána a szabadon álló földfal magassága szemcsés talajban ≤ 0,5 m, merev kötött talajban ≤ 1,0 m (DIN 4124). A pallóvastagság tájékoztató (FHWA-táblázat szerint). A támasz akkor kerül be, amikor a kiemelés 0,5–0,8 m-rel a támaszszint alá ért.' });
  const zS = slider(ctrls, { label: 'Kiemelési mélység', sym: 'z', min: 0, max: 7.5, step: 0.05, value: 2.6, unit: 'm', d: 2 });
  const play = h('button', { class: 'btn btn-line btn-sm', type: 'button' }, '▶ Kiemelés lejátszása'); ctrls.append(play);
  const sS = slider(ctrls, { label: 'Tartótávolság', sym: 's', min: 1, max: 3, step: 0.25, value: 2, unit: 'm', d: 2, hint: 'Jegyzet: 1–3 m, általában 2 m.' });
  const soil = seg(ctrls, { label: 'Talaj', options: [{ v: 's', t: 'szemcsés (≤ 0,5 m)' }, { v: 'k', t: 'kötött (≤ 1,0 m)' }], value: 's' });
  const sup = seg(ctrls, { label: 'Megtámasztás', options: [{ v: 'k', t: 'konzol' }, { v: 'd', t: 'dúc' }, { v: 'h', t: 'horgony' }], value: 'h' });
  const late = toggle(ctrls, { label: 'Hiba: a pallózás lemarad', value: false });
  const fig = figure(viz, 640, 400);
  const vd = verdict(viz);
  const st = { z: stat(out, { label: 'Kiemelés', unit: 'm', d: 2 }), zl: stat(out, { label: 'Pallózva', unit: 'm', d: 2 }), op: stat(out, { label: 'Szabad földfal', unit: 'm', d: 2 }), n: stat(out, { label: 'Tartó / 10 m fal', unit: 'db', d: 0 }), t: stat(out, { label: 'Pallóvastagság (tájékoztató)' }) };
  const k = 34, y0 = 44, HF = 7.5, EMB = 2.4, A = 1.6;
  const Y = (d) => y0 + d * k;
  let crumbs = [];
  const draw = (tt = 0) => {
    clear(fig);
    const z = zS.v, s = sS.v, open = soil.v === 's' ? 0.5 : 1.0;
    let zl = late.v ? Math.min(z, 1.0) : Math.max(0, Math.floor((z - 0.5 * open) / 0.25) * 0.25);
    zl = Math.min(zl, z);
    const free = z - zl;
    const bay = s * k, xm0 = (640 - 3 * bay) / 2, xs = [0, 1, 2, 3].map((i) => xm0 + i * bay), bw = 10;
    const nL = Math.ceil(xm0 / bay) + 1, all = [];
    for (let i = -nL; i <= 3 + nL; i++) { const x = xm0 + i * bay; if (x > -bay && x < 640 + bay) all.push(x); }
    // háttér: a fal mögötti talaj, illetve a még ki nem emelt talaj
    R(fig, 0, 0, 640, y0, 'f-surface');
    R(fig, 0, y0, 640, 400 - y0, 'f-soilA'); R(fig, 0, y0, 640, 400 - y0, '', { fill: 'url(#pat-sand)' });
    // furatok a kiemelési szint alatt (röntgen)
    for (const x of all) {
      const yz = Y(z);
      if (Y(HF) > yz) R(fig, x - 11, yz, 22, Y(HF) - yz, 'f-grout', { opacity: 0.75 });
      R(fig, x - 11, Math.max(yz, Y(HF)), 22, Y(HF + EMB) - Math.max(yz, Y(HF)), 'f-conc', { opacity: 0.9 });
      L(fig, x, yz, x, Y(HF + EMB), 'stroke:var(--steelm2);stroke-width:3;stroke-dasharray:5 4');
    }
    // ki nem emelt talaj (a gödör feneke alatt) – sötétebb sáv
    R(fig, 0, Y(z), 640, 400 - Y(z), 'f-soilB', { opacity: 0.55 });
    T(fig, 8, Y(z) + 16, 'még ki nem emelt talaj (röntgen)', 't-sm halo');
    // pallók
    for (let d = 0; d < zl - 1e-6; d += 0.25) {
      for (let i = 0; i < all.length - 1; i++) {
        const yy = Y(d) + 0.6, hh = 0.25 * k - 1.2;
        R(fig, all[i] + bw / 2 - 2, yy, bay - bw + 4, hh, 'f-timber', { style: 'stroke:var(--timber2);stroke-width:.8' });
        R(fig, all[i] + bw / 2 - 2, yy, bay - bw + 4, hh, '', { fill: 'url(#pat-timber)' });
      }
    }
    // szabad sáv
    if (free > 0.01) {
      const bad = free > open + 1e-6 && z > 1.25 - 1e-6;
      for (let i = 0; i < all.length - 1; i++) R(fig, all[i] + bw / 2, Y(zl), bay - bw, free * k, bad ? 'f-bad' : 'f-acc', { opacity: bad ? 0.35 : 0.22 });
      L(fig, 0, Y(zl), 640, Y(zl), `stroke:var(${bad ? '--bad' : '--accent'});stroke-width:1.5;stroke-dasharray:4 3`);
      if (bad) for (const c of crumbs) C(fig, c.x, Y(zl) + c.y, c.r, 'f-soilB');
    }
    // tartók (a kiemelés fölött teljes, alatta szaggatott)
    for (const x of all) {
      R(fig, x - bw / 2, y0 - 10, bw, Y(z) - y0 + 10, 'f-steel', { style: 'stroke:var(--steelm2);stroke-width:1' });
      R(fig, x - 1.5, y0 - 10, 3, Y(z) - y0 + 10, 'f-steel2');
    }
    // támasz
    const supOn = sup.v !== 'k' && z >= A + 0.5;
    if (supOn) {
      R(fig, 0, Y(A) - 6, 640, 12, 'f-steel2');
      R(fig, 0, Y(A) - 1, 640, 2, 'f-steel');
      if (sup.v === 'd') all.forEach((x) => { C(fig, x, Y(A), 9, 'f-steelc', { style: 'stroke:var(--ink);stroke-width:1' }); C(fig, x, Y(A), 5, 'f-surface'); });
      else for (let i = 0; i < all.length - 1; i++) { const x = (all[i] + all[i + 1]) / 2; R(fig, x - 9, Y(A) - 9, 18, 18, 'f-acc', { style: 'stroke:var(--ink);stroke-width:1' }); C(fig, x, Y(A), 4, 'f-ink'); }
      T(fig, 632, Y(A) - 12, sup.v === 'd' ? 'heveder + dúc' : 'heveder + horgonyfej', 't-sm halo', { 'text-anchor': 'end' });
    } else if (sup.v !== 'k') {
      L(fig, 0, Y(A), 640, Y(A), 'stroke:var(--muted);stroke-width:1;stroke-dasharray:3 3');
      T(fig, 632, Y(A) - 6, 'tervezett támaszszint', 't-sm halo', { 'text-anchor': 'end' });
    }
    // terep, méretek
    L(fig, 0, y0, 640, y0, 'stroke:var(--ink);stroke-width:1.5');
    T(fig, 8, y0 - 8, '±0,00 terep', 't-sm');
    L(fig, 24, y0, 24, Y(z), 'stroke:var(--grp);stroke-width:2');
    T(fig, 30, Math.max(y0 + 14, Y(z) - 6), `z = ${fmt(z, 2)} m`, 't-num halo');
    L(fig, 0, Y(HF), 640, Y(HF), 'stroke:var(--muted);stroke-width:1;stroke-dasharray:2 4');
    T(fig, 632, Y(HF) - 5, 'végleges gödörfenék', 't-sm', { 'text-anchor': 'end' });
    T(fig, 632, Y(HF) + 14, 'befogás: sovány beton a furatban', 't-sm', { 'text-anchor': 'end' });
    if (xs[1] - xs[0] > 50) { L(fig, xs[1], y0 - 22, xs[2], y0 - 22, 'stroke:var(--muted);stroke-width:1'); T(fig, (xs[1] + xs[2]) / 2, y0 - 26, `s = ${fmt(s, 2)} m`, 't-num', { 'text-anchor': 'middle' }); }
    // ítélet
    const span = s - 0.15;
    st.z.set(z); st.zl.set(zl); st.op.set(free, free > open + 1e-6 && z > 1.25 ? 'bad' : 'ok'); st.n.set(Math.round(10 / s) + 1);
    st.t.set(span <= 1.5 ? '≈ 5 cm' : span <= 2.4 ? '≈ 5–7,5 cm' : '≈ 7,5–10 cm');
    if (late.v && free > open + 1e-6 && z > 1.25) vd.set('bad', 'Omlásveszély!', `A pallózás ${fmt(free, 2)} m-rel lemaradt. Megengedett: ${soil.v === 's' ? '0,5' : '1,0'} m – a földfal kiomolhat, a munkást maga alá temetheti.`);
    else if (sup.v === 'k' && z > 6) vd.set('bad', 'Konzolként túl mély', 'A befogott acéltartók konzolosan csak pár méteres, max. 4–6 m-es kiemelésig állékonyak (jegyzet 1.9). Itt dúc vagy horgony kell.');
    else if (sup.v === 'k' && z > 4) vd.set('warn', 'A konzolos működés határán', 'Konzolosan kb. 4–6 m-ig. Mélyebb gödörnél a tartókat dúccal vagy horgonnyal kell gyámolítani.');
    else if (sup.v !== 'k' && z > A + 0.8 && !supOn) vd.set('warn', 'Ideje beépíteni a támaszt', '');
    else vd.set('ok', 'Rendben halad a munka', `A pallózás lépést tart a kiemeléssel (szabad sáv ≤ ${soil.v === 's' ? '0,5' : '1,0'} m). ${sup.v === 'h' ? 'A horgonyzás „tiszta”, dúcmentes munkateret ad.' : sup.v === 'd' ? 'A dúcok a gödörben akadályozzák a munkát, de nem nyúlnak a szomszéd telek alá.' : ''}`);
  };
  const newCrumbs = () => { crumbs = Array.from({ length: 26 }, () => ({ x: 40 + Math.random() * 560, y: 4 + Math.random() * 30, r: 1.5 + Math.random() * 2.5 })); };
  newCrumbs();
  [zS, sS, soil, sup, late].forEach((c) => c.on(() => draw()));
  late.on(newCrumbs);
  let anim = null;
  play.addEventListener('click', () => {
    if (anim) { cancelAnimationFrame(anim); anim = null; play.textContent = '▶ Kiemelés lejátszása'; return; }
    if (zS.v >= 7.45) zS.set(0, false);
    play.textContent = '❚❚ Megállítás';
    let last = performance.now();
    const stp = (t) => { const dt = (t - last) / 1000; last = t; const z = Math.min(7.5, zS.v + dt * 0.6); zS.set(z); if (z < 7.5) anim = requestAnimationFrame(stp); else { anim = null; play.textContent = '▶ Kiemelés lejátszása'; } };
    anim = requestAnimationFrame(stp);
  });
  draw();
});

/* ================================================================== 4. A hézagos falak családja */
const FAM = {
  berlin: { t: 'Berlini fal', el: 'acél I-tartók', fill: 'fa / vb. palló' },
  lutec: { t: 'Lutéciai fal', el: 'fúrt cölöpök', fill: 'íves vb. mező' },
  paris: { t: 'Párizsi fal', el: 'előregyártott vb.', fill: 'helyszíni vb.' },
  moszk: { t: 'Moszkvai fal', el: 'barettek', fill: 'helyszíni vb.' },
};
register('hezagosFam', (root) => {
  const { ctrls, viz, out } = shell(root);
  const s = seg(ctrls, { label: 'Változat', options: Object.entries(FAM).map(([v, o]) => ({ v, t: o.t })), value: 'berlin', vert: true });
  ctrls.append(h('p', { class: 'ctl-hint', html: 'Közös elv: hézagosan álló függőleges teherhordó elemek, köztük kitöltés. A terhet a tartó / cölöp / barett viszi a támaszokra, a kitöltés csak a mezőt hidalja át. (Előadás, 32. dia)' }));
  const fig = figure(viz, 640, 230);
  const s1 = stat(out, { label: 'Függőleges elem' }), s2 = stat(out, { label: 'Kitöltés' }), s3 = stat(out, { label: 'Elemtávolság' });
  const draw = () => {
    clear(fig); const W = 640, H = 230, yc = 112;
    planBg(fig, W, 0, yc, H);
    const xs = [95, 245, 395, 545];
    const v = s.v;
    for (let i = 0; i < 3; i++) {
      const a = xs[i], b = xs[i + 1];
      if (v === 'berlin') { R(fig, a + 6, yc + 4, b - a - 12, 10, 'f-timber', { style: 'stroke:var(--timber2)' }); }
      else if (v === 'lutec') svg('path', { d: `M${a + 14} ${yc + 18} Q ${(a + b) / 2} ${yc - 18} ${b - 14} ${yc + 18} L ${b - 14} ${yc + 32} Q ${(a + b) / 2} ${yc} ${a + 14} ${yc + 32} Z`, class: 'f-conc', style: 'stroke:var(--concrete2)' }, fig);
      else R(fig, a + 10, yc + 6, b - a - 20, 20, 'f-conc', { style: 'stroke:var(--concrete2)' });
    }
    for (const x of xs) {
      if (v === 'berlin') hbeam(fig, x, yc, 26, 26);
      else if (v === 'lutec') { C(fig, x, yc + 6, 24, 'f-conc', { style: 'stroke:var(--concrete2);stroke-width:1.2' }); C(fig, x, yc + 6, 17, '', { style: 'fill:none;stroke:var(--bad);stroke-dasharray:3 2' }); }
      else if (v === 'paris') { R(fig, x - 16, yc - 14, 32, 40, 'f-conc2', { style: 'stroke:var(--ink);stroke-width:1' }); T(fig, x, yc + 40, 'előregyártott', 't-sm', { 'text-anchor': 'middle' }); }
      else { R(fig, x - 34, yc - 14, 68, 40, 'f-conc', { style: 'stroke:var(--ink);stroke-width:1' }); R(fig, x - 28, yc - 8, 56, 28, '', { style: 'fill:none;stroke:var(--bad);stroke-dasharray:3 2' }); }
    }
    svg('line', { x1: xs[1], y1: H - 34, x2: xs[2], y2: H - 34, style: 'stroke:var(--muted)' }, fig);
    T(fig, (xs[1] + xs[2]) / 2, H - 40, 'L – elemtávolság', 't-sm', { 'text-anchor': 'middle' });
    const o = FAM[v]; s1.set(o.el); s2.set(o.fill); s3.set(v === 'berlin' ? '1–3 m (ált. 2 m)' : 'méretezés szerint');
  };
  s.on(draw); draw();
});

/* ================================================================== 5. Jet-grouting fal felülnézet */
const STEEL = [
  { v: 'hea100', t: 'HEA 100', h: 96, b: 100 }, { v: 'hea120', t: 'HEA 120', h: 114, b: 120 }, { v: 'hea140', t: 'HEA 140', h: 133, b: 140 },
  { v: 'heb160', t: 'HEB 160', h: 160, b: 160 }, { v: 'heb200', t: 'HEB 200', h: 200, b: 200 },
  { v: 'c114', t: 'cső Ø114,3', d: 114.3 }, { v: 'c168', t: 'cső Ø168,3', d: 168.3 }, { v: 'c219', t: 'cső Ø219,1', d: 219.1 },
];
register('jetPlan', (root) => {
  const { ctrls, viz, out } = shell(root, { foot: 'A falvastagság a két oszlop metszésvonalán (a „torokban”) a legkisebb: t = 2·√(R² − (s/2)²). Az acéltag befoglaló körének átmérőjét vetjük össze a fúrás tengelyének 15–20 cm-es környezetével (jegyzet). Szemléltető ábra.' });
  const pre = seg(ctrls, { label: 'Talaj (előbeállítás)', options: [{ v: 'a', t: 'agyag' }, { v: 'h', t: 'homok' }, { v: 'k', t: 'kavics' }], value: 'h' });
  const dS = slider(ctrls, { label: 'Oszlopátmérő', sym: 'D', min: 60, max: 120, step: 5, value: 90, unit: 'cm', d: 0, hint: 'Talajkörnyezettől függően 60–120 cm.' });
  const sS = slider(ctrls, { label: 'Osztástávolság', sym: 's', min: 40, max: 135, step: 5, value: 75, unit: 'cm', d: 0, hint: 'Vízzáráshoz: s = D − (10–20 cm).' });
  const stl = select(ctrls, { label: 'Acéltag', options: STEEL.map((x) => ({ v: x.v, t: x.t })), value: 'hea100' });
  const every = seg(ctrls, { label: 'Acél kiosztás', options: [{ v: 1, t: 'minden oszlopba' }, { v: 2, t: 'minden másodikba' }], value: 1 });
  const fig = figure(viz, 640, 270);
  const vd = verdict(viz);
  const st = { a: stat(out, { label: 'Átfedés a = D − s', unit: 'cm', d: 0 }), t: stat(out, { label: 'Falvastagság a toroknál', unit: 'cm', d: 0 }), n: stat(out, { label: 'Oszlop / fm', unit: 'db', d: 2 }), s: stat(out, { label: 'Acéltag befér?' }) };
  pre.on((v) => { const D = v === 'a' ? 60 : v === 'h' ? 90 : 120; dS.set(D, false); sS.set(D - 15, false); draw(); });
  const draw = () => {
    clear(fig);
    const D = dS.v, s = sS.v, a = D - s, R0 = D / 2;
    const n = 5, span = (n - 1) * s + D, k = Math.min(1.25, 600 / span), W = 640, yc = 140;
    const x0 = (W - (n - 1) * s * k) / 2;
    R(fig, 0, 0, W, yc, 'f-soilA'); R(fig, 0, 0, W, yc, '', { fill: 'url(#pat-sand)' });
    R(fig, 0, yc, W, 130, 'f-bg2');
    R(fig, 0, 20, W, yc - 30, '', { fill: 'url(#pat-water)', opacity: 0.8 });
    for (let i = 0; i < n; i++) C(fig, x0 + i * s * k, yc, R0 * k, 'f-grout', { style: 'stroke:var(--concrete2);stroke-width:1.2', opacity: 0.97 });
    const sd = STEEL.find((x) => x.v === stl.v);
    const db = sd.d ? sd.d : Math.hypot(sd.h, sd.b);
    for (let i = 0; i < n; i++) {
      const cx = x0 + i * s * k;
      C(fig, cx, yc, 10 * k, '', { style: 'fill:none;stroke:var(--ok);stroke-width:1;stroke-dasharray:3 2' });
      C(fig, cx, yc, 7.5 * k, '', { style: 'fill:none;stroke:var(--ok);stroke-width:1;stroke-dasharray:1 2' });
      if (i % every.v === 0) {
        if (sd.d) C(fig, cx, yc, (sd.d / 20) * k, '', { style: `fill:none;stroke:var(--steelm2);stroke-width:${Math.max(2, 0.8 * k)}` });
        else hbeam(fig, cx, yc, (sd.b / 10) * k, (sd.h / 10) * k);
      }
    }
    // torok
    if (a > 0) {
      const tt = 2 * Math.sqrt(Math.max(0, R0 * R0 - (s / 2) * (s / 2)));
      const xm = x0 + 0.5 * s * k;
      L(fig, xm, yc - (tt / 2) * k, xm, yc + (tt / 2) * k, 'stroke:var(--accent);stroke-width:3');
      T(fig, xm + 6, yc + (tt / 2) * k + 16, `t = ${fmt(tt, 0)} cm`, 't-num halo');
      st.t.set(tt, tt < 0.55 * D ? 'warn' : 'ok');
    } else st.t.set(0, 'bad', '0');
    // szivárgás
    for (let i = 0; i < n - 1; i++) {
      const xm = x0 + (i + 0.5) * s * k;
      if (a <= 0) ar(fig, xm, 30, xm, yc + 70, 'var(--water)', 3, 10);
      else if (a < 10) ar(fig, xm, 50, xm, yc + 40, 'var(--water)', 1.4, 6);
    }
    L(fig, x0, yc + R0 * k + 18, x0 + s * k, yc + R0 * k + 18, 'stroke:var(--muted)');
    T(fig, x0 + (s * k) / 2, yc + R0 * k + 32, `s = ${s} cm`, 't-num', { 'text-anchor': 'middle' });
    T(fig, x0 + (n - 1) * s * k, yc - R0 * k - 8, `D = ${D} cm`, 't-num halo', { 'text-anchor': 'middle' });
    T(fig, 8, 16, 'FÖLDOLDAL · talajvíz', 't-sm'); T(fig, 8, 262, 'MUNKATÉR', 't-sm');
    T(fig, W - 8, 262, 'zöld szaggatott: 15–20 cm-es tengelyközeli zóna', 't-sm', { 'text-anchor': 'end' });
    st.a.set(a, a >= 10 && a <= 20 ? 'ok' : a > 0 ? 'warn' : 'bad');
    st.n.set(100 / s);
    const fit = db <= 150 ? 'ok' : db <= 200 ? 'warn' : 'bad';
    st.s.set(fit === 'ok' ? 'igen' : fit === 'warn' ? 'határeset' : 'nem fér be', fit);
    if (a <= 0) vd.set('bad', 'Hézagos oszlopsor – nem vízzáró', 'Az oszlopok nem metszik egymást: a víz és a talaj a hézagokon át befolyik a gödörbe.');
    else if (a < 10) vd.set('warn', 'Kevés az átfedés', 'Az átmérő talajfüggő és a fúrás sosem pontosan függőleges – ekkora átfedés mélyebben elfogyhat. A jegyzet szerint D − 10–20 cm osztás kell.');
    else if (a > 25) vd.set('warn', 'Vízzáró, de pazarló', 'A túl sűrű osztás sok oszlopot, sok iszapot és költséget jelent.');
    else vd.set(fit === 'bad' ? 'warn' : 'ok', fit === 'bad' ? 'Vízzáró fal – de az acéltag nem fér be' : 'Kvázi vízzáró fal', fit === 'bad' ? `A ${sd.t} befoglaló köre ${fmt(db / 10, 1)} cm: nagyobb a tengely 15–20 cm-es környezeténél. A még folyékony, sűrű jetelt talajba csak korlátos méretű acél süllyeszthető – kisebb szelvény vagy cső kell.` : `Átfedés ${a} cm. Az acéltagokat szilárd talajbeton veszi körül: nem kell utólagos furatkitöltés, összemetsző oszlopoknál pallózás sem.`);
  };
  [dS, sS, stl, every].forEach((c) => c.on(draw)); draw();
});

/* ================================================================== 6. Zagyfal boltozódása */
register('zagyArch', (root) => {
  const { ctrls, viz, out } = shell(root, { foot: '<b>Szemléltető modell:</b> parabolikus nyomott ív a két acélgerenda öve között, ívvastagság = falvastagság / 2, nyílmagasság = falvastagság / 2; σ = p·L² / (2·t²). Terhelés: nyugalmi földnyomás (K = 0,5) + víznyomás, talajvíz −2 m-en. Biztonsági tényező 1,5. Tervezésre nem alkalmas.' });
  const LS = slider(ctrls, { label: 'Gerendatávolság', sym: 'L', min: 1, max: 3, step: 0.1, value: 1.6, unit: 'm', d: 1, hint: 'Jegyzet: jellemzően 1–2 m.' });
  const tS = slider(ctrls, { label: 'Falvastagság', sym: 't', min: 0.4, max: 0.8, step: 0.05, value: 0.6, unit: 'm', d: 2, hint: 'Előadás: min. 40 cm; gyakori a 60 cm.' });
  const zS = slider(ctrls, { label: 'Vizsgált mélység', sym: 'z', min: 2, max: 10, step: 0.5, value: 6, unit: 'm', d: 1 });
  const fc = seg(ctrls, { label: '28 napos szilárdság', options: [{ v: 0.5, t: '0,5 MPa' }, { v: 1.0, t: '1,0 MPa' }, { v: 1.4, t: '1,4 MPa' }], value: 1.0 });
  const fig = figure(viz, 640, 290);
  const vd = verdict(viz);
  const st = { p: stat(out, { label: 'Föld- + víznyomás p', unit: 'kPa', d: 0 }), N: stat(out, { label: 'Ívnyomás N', unit: 'kN/m', d: 0 }), s: stat(out, { label: 'Feszültség σ', unit: 'MPa', d: 2 }), e: stat(out, { label: 'Kihasználtság', unit: '%', d: 0 }) };
  const draw = () => {
    clear(fig);
    const Lb = LS.v, t = tS.v, z = zS.v, f = +fc.v;
    const sv = Math.min(z, 2) * 19 + Math.max(0, z - 2) * 10, u = Math.max(0, z - 2) * 10;
    const p = 0.5 * sv + u, N = (p * Lb * Lb) / (4 * t), sig = (p * Lb * Lb) / (2 * t * t) / 1000, eta = sig / (f / 1.5);
    const W = 640, Hh = 290, k = Math.min(120, 560 / (2 * Lb)), yc = 150, tw = t * k;
    const x0 = (W - 2 * Lb * k) / 2, xs = [x0, x0 + Lb * k, x0 + 2 * Lb * k];
    R(fig, 0, 0, W, yc - tw / 2, 'f-soilA'); R(fig, 0, 0, W, yc - tw / 2, '', { fill: 'url(#pat-sand)' });
    if (z > 2) R(fig, 0, 0, W, yc - tw / 2, '', { fill: 'url(#pat-water)' });
    R(fig, 0, yc + tw / 2, W, Hh - yc - tw / 2, 'f-bg2');
    R(fig, 0, yc - tw / 2, W, tw, 'f-grout', { style: 'stroke:var(--concrete2)' });
    const bb = 0.3 * k;
    for (let i = 0; i < 2; i++) {
      const a = xs[i] + bb / 2, b = xs[i + 1] - bb / 2, d = tw / 2;
      const yS = yc + tw / 2 - d / 2, yC = yc - tw / 2 + d / 2;
      const ctrl = 2 * yC - yS;
      const col = eta > 1 ? 'var(--bad)' : eta > 0.8 ? 'var(--warn)' : 'var(--ok)';
      svg('path', { d: `M${a} ${yS} Q ${(a + b) / 2} ${ctrl} ${b} ${yS}`, style: `fill:none;stroke:${col};stroke-width:${Math.max(3, d)};stroke-opacity:.55;stroke-linecap:round` }, fig);
      svg('path', { d: `M${a} ${yS} Q ${(a + b) / 2} ${ctrl} ${b} ${yS}`, style: `fill:none;stroke:${col};stroke-width:1.5` }, fig);
      const m = 7;
      for (let j = 0; j <= m; j++) { const x = a + ((b - a) * j) / m; ar(fig, x, yc - tw / 2 - 34, x, yc - tw / 2 - 3, 'var(--water)', 1.4, 5); }
    }
    xs.forEach((x) => hbeam(fig, x, yc, bb, Math.min(tw * 0.9, 0.3 * k)));
    L(fig, xs[0], yc + tw / 2 + 24, xs[1], yc + tw / 2 + 24, 'stroke:var(--muted)');
    T(fig, (xs[0] + xs[1]) / 2, yc + tw / 2 + 40, `L = ${fmt(Lb, 1)} m`, 't-num', { 'text-anchor': 'middle' });
    T(fig, xs[2] + 8, yc + 4, `t = ${fmt(t, 2)} m`, 't-num halo');
    T(fig, 8, 16, `FÖLDOLDAL – p = ${fmt(p, 0)} kPa a ${fmt(z, 1)} m mélységben`, 't-sm');
    T(fig, 8, Hh - 8, 'MUNKATÉR', 't-sm');
    st.p.set(p); st.N.set(N); st.s.set(sig); st.e.set(eta * 100, eta > 1 ? 'bad' : eta > 0.8 ? 'warn' : 'ok');
    if (eta > 1) vd.set('bad', 'Az ív nem bírja', `σ = ${fmt(sig, 2)} MPa > f/1,5 = ${fmt(f / 1.5, 2)} MPa. A feszültség a gerendatávolság <i>négyzetével</i> nő: sűrűbb gerendakiosztás vagy vastagabb fal kell – ezért jellemző az 1–2 m.`);
    else if (eta > 0.8) vd.set('warn', 'Határeset', 'A mélységgel a föld- és víznyomás nő – ezért jellemzően legfeljebb 7–10 m mély munkagödröknél gazdaságos.');
    else vd.set('ok', 'Az ív átadja a terhet', 'A gyenge (0,5–1,4 MPa), de vízzáró zagy boltozódva adja át a föld- és víznyomást a gerendáknak; a gerendák viszik a terhet a támaszokra.');
  };
  [LS, tS, zS, fc].forEach((c) => c.on(draw)); draw();
});

register('zagyCheck', (root) => {
  const { ctrls, viz } = shell(root, { out: false });
  const gaz = ['Magas talajvízzel érintett terület', 'Kb. 7–8 m mély, ideiglenes munkatér', 'A (kvázi) vízzáró réteg lényegesen mélyebben van, mint a fal statikailag szükséges talpa', 'A fal bontása (később) szükséges'];
  const fel = ['A megtámasztott oldalon nincs jelentős felszíni terhelés vagy süllyedésre érzékeny szerkezet', 'A talaj résállékonyság szempontjából kedvező'];
  ctrls.append(h('span', { class: 'ctl-lab' }, 'Mikor gazdaságos? (előadás, 37. dia)'));
  const g = gaz.map((t, i) => toggle(ctrls, { label: t, value: i < 2 }));
  ctrls.append(h('span', { class: 'ctl-lab', style: { marginTop: '8px' } }, 'Feltételek (jegyzet 1.5)'));
  const f = fel.map((t) => toggle(ctrls, { label: t, value: true }));
  const vd = verdict(viz);
  const box = h('div', { class: 'zc-vis' }); viz.prepend(box);
  const draw = () => {
    const n = g.filter((x) => x.v).length, okF = f.every((x) => x.v);
    box.innerHTML = '';
    g.forEach((x, i) => box.append(h('span', { class: 'chip ' + (x.v ? 'ok' : '') }, (x.v ? '✓ ' : '· ') + ['magas TV', '7–8 m, ideiglenes', 'mély vízzáró réteg', 'bontani kell'][i])));
    f.forEach((x, i) => box.append(h('span', { class: 'chip ' + (x.v ? 'ok' : 'bad') }, (x.v ? '✓ ' : '✗ ') + ['nincs nagy felszíni teher', 'résállékony talaj'][i])));
    if (!okF) vd.set('bad', 'Nem ajánlott', 'A fal mozgásai miatt jelentős felszíni teher vagy süllyedésre érzékeny szomszéd mellett, illetve résállékonyság szempontjából kedvezőtlen talajban más megoldás kell (pl. résfal, összemetsző cölöpfal).');
    else if (n >= 3) vd.set('ok', 'Az erősített zagyfal jó választás lehet', 'Kvázi vízzáró, gyors (nem kell betonozni), kevés acél – és később könnyen bontható.');
    else if (n >= 1) vd.set('warn', 'Megfontolandó', 'Csak részben teljesülnek a gazdaságossági feltételek – érdemes alternatívákat (szádfal, mélykevert fal, jet-fal) is összevetni.');
    else vd.set('warn', 'Valószínűleg van jobb megoldás', 'Talajvíz nélkül például berlini dúcolat vagy hézagos cölöpfal olcsóbb lehet.');
  };
  [...g, ...f].forEach((x) => x.on(draw)); draw();
});

/* ================================================================== 7. Mélykevert fal – panelsorrend */
const DSM = {
  csm: {
    t: 'CSM (marókerekes keverés)',
    steps: [
      ['Vezetőárok', 'Kb. 0,5 m mély árok a falvonalban – ide gyűlik a felesleges zagy.'],
      ['P1 – le: marás + zagy', 'A két pár, ellentétesen forgó marókerék lefelé haladva aprítja a talajt, közben zagyot adagolnak.'],
      ['P1 – fel: keverés + cement', 'A talpon a kerekek visszafordulnak; felfelé cementzaggyal homogénre keverik a talajt.'],
      ['Acél a friss panelbe', 'A még friss talajcementbe acél I/H-gerendákat állítanak (szükség esetén vibrátorral).'],
      ['P2, P3 primer panelek', 'A primer paneleket egy-egy panelnyi hézaggal készítik.'],
      ['S1, S2 szekunder panelek', 'A szekunder panelek a szomszédos primerekbe belemarnak („friss a frissbe”) – így folytonos a fal.'],
      ['Kiemelés', 'Szilárdulás után kiemelés; a gerendákat heveder mentén dúc vagy horgony támasztja; a felületet lenyesik, szükség esetén lőttbetonnal védik.'],
    ],
  },
  colmix: {
    t: 'Colmix (többcsigás, oszlopszerű)',
    steps: [
      ['Vezetőárok', 'A falvonal kitűzése, vezetőárok a kiszoruló keveréknek.'],
      ['1. csoport – le', 'Több (pl. három) egymás melletti csiga fúr le, a csőszáron át kötőanyagot adagolnak.'],
      ['1. csoport – fel', 'Felfelé menet keverik a talajt: egymásba metsző oszlopok jönnek létre.'],
      ['Acél a friss oszlopokba', 'Acél I/H-szelvények a friss keverékbe (a méretezés szerinti kiosztásban).'],
      ['További primer csoportok', 'A primer csoportok hézaggal követik egymást.'],
      ['Szekunder csoportok', 'A szekunder csoportok átfedéssel zárják a hézagokat („zarándoklépés”).'],
      ['Kiemelés', 'Hullámos felületű, vízszivárgást gátló fal; a gerendák viszik a terhet.'],
    ],
  },
  trench: {
    t: 'Trenchmix (láncos, falszerű)',
    steps: [
      ['Vezetőárok', 'Kitűzés, vezetőárok.'],
      ['A vágókar lemerül', 'A láncos vágókar („óriás láncfűrész”) a teljes falmélységig lemerül.'],
      ['Haladás oldalirányban', 'A gép a falvonal mentén halad, a lánc függőlegesen keveri a talajt a kötőanyaggal – folyamatos árok.'],
      ['Acél folyamatosan', 'A gép mögött a friss keverékbe kerülnek az acélszelvények.'],
      ['A fal elkészül', 'Hézag és panelcsatlakozás nélküli, egyenletes vastagságú talajcement fal.'],
      ['Szilárdulás', 'A keverék megszilárdul (talajtól és cementadagolástól függő szilárdság).'],
      ['Kiemelés', 'Megtámasztás heveder + dúc/horgony segítségével.'],
    ],
  },
};
register('dsmSeq', (root) => {
  const { ctrls, viz, out } = shell(root, { layout: 'wide', out: false });
  const top = h('div', { class: 'dsm-top' }); viz.append(top);
  const mode = seg(top, { options: Object.entries(DSM).map(([v, o]) => ({ v, t: o.t })), value: 'csm' });
  const fig = figure(viz, 640, 330);
  const row = h('div', { class: 'play-row' }); viz.append(row);
  const prev = h('button', { class: 'btn btn-line btn-sm', type: 'button' }, '← Előző');
  const next = h('button', { class: 'btn btn-line btn-sm', type: 'button' }, 'Következő →');
  const dots = h('div', { class: 'stepbtns' });
  row.append(prev, dots, next);
  const txt = h('div', { class: 'steptext' }); viz.append(txt);
  let step = 0, t0 = performance.now();
  const W = 640, yP = 70, k = 46;   // felülnézet: 1 m = 46 px
  const yE0 = 170, kz = 9.5;        // metszet: 1 m = 9,5 px, 14,5 m mély panel
  const depth = 14.5;
  const setStep = (i) => { step = clamp(i, 0, 6); t0 = performance.now(); paint(); };
  prev.addEventListener('click', () => setStep(step - 1));
  next.addEventListener('click', () => setStep(step + 1));
  mode.on(() => setStep(0));
  const paint = () => {
    dots.innerHTML = '';
    DSM[mode.v].steps.forEach((s, i) => dots.append(h('button', { type: 'button', class: i === step ? 'on' : '', onclick: () => setStep(i), 'aria-label': s[0] }, String(i + 1))));
    const s = DSM[mode.v].steps[step];
    txt.innerHTML = `<b>${step + 1}. ${s[0]}</b>${s[1]}`;
    prev.disabled = step === 0; next.disabled = step === 6;
  };
  const draw = (time) => {
    clear(fig);
    const bgG = svg('g', {}, fig), fg = svg('g', { transform: 'translate(46 0)' }, fig);
    const m = mode.v, st = step, ph = ((time - t0) / 1000) % 4 / 4;
    // felülnézet
    T(fig, W - 8, 16, 'FELÜLNÉZET', 't-sm', { 'text-anchor': 'end' });
    R(bgG, 0, 24, W, 36, 'f-soilA'); R(bgG, 0, 24, W, 36, '', { fill: 'url(#pat-sand)' });
    R(bgG, 0, 92, W, 40, 'f-bg2');
    R(bgG, 0, 60, W, 32, 'f-soilB', { opacity: st === 0 ? 0.5 : 0.3 });
    if (st === 0) T(fig, W / 2, 80, 'vezetőárok', 't-sm', { 'text-anchor': 'middle' });
    let cur = null; // aktuális elem x-e a metszethez
    if (m === 'csm') {
      const Lp = 2.4, ov = 0.25, cxs = [1.5, 1.5 + 2 * (Lp - ov), 1.5 + 4 * (Lp - ov)], sxs = [cxs[0] + (Lp - ov), cxs[1] + (Lp - ov)];
      const prim = st >= 4 ? cxs : st >= 1 ? [cxs[0]] : [];
      const sec = st >= 5 ? sxs : [];
      const fresh = (i) => (st <= 3 && i === 0) || (st === 4 && i > 0);
      prim.forEach((cx, i) => R(fg, cx * k - (Lp * k) / 2, yP - 13, Lp * k, 26, fresh(i) && st < 3 ? 'f-slurry' : 'f-grout', { style: 'stroke:var(--concrete2)' }));
      sec.forEach((cx) => R(fg, cx * k - (Lp * k) / 2, yP - 13, Lp * k, 26, 'f-shot', { style: 'stroke:var(--concrete2)', opacity: 0.95 }));
      const beams = [];
      if (st >= 3) beams.push(cxs[0]); if (st >= 4) beams.push(cxs[1], cxs[2]); if (st >= 5) beams.push(...sxs);
      beams.forEach((cx) => { hbeam(fg, (cx - 0.6) * k, yP, 12, 12); hbeam(fg, (cx + 0.6) * k, yP, 12, 12); });
      prim.forEach((cx, i) => T(fg, cx * k, yP + 30, 'P' + (i + 1), 't-num', { 'text-anchor': 'middle' }));
      sec.forEach((cx, i) => T(fg, cx * k, yP + 30, 'S' + (i + 1), 't-num t-grp', { 'text-anchor': 'middle' }));
      cur = st <= 3 ? cxs[0] : st === 4 ? cxs[2] : st === 5 ? sxs[1] : null;
    } else if (m === 'colmix') {
      const r = 0.45, sp = 0.75, grp = (gx) => [gx - sp, gx, gx + sp];
      const P = [1.4, 1.4 + 4.5, 1.4 + 9], Sx = [P[0] + 2.25, P[1] + 2.25];
      const prim = st >= 4 ? P : st >= 1 ? [P[0]] : [];
      const sec = st >= 5 ? Sx : [];
      prim.forEach((gx) => grp(gx).forEach((x) => C(fg, x * k, yP, r * k, 'f-grout', { style: 'stroke:var(--concrete2)' })));
      sec.forEach((gx) => grp(gx).forEach((x) => C(fg, x * k, yP, r * k, 'f-shot', { style: 'stroke:var(--concrete2)' })));
      if (st >= 3) [...(st >= 4 ? P : [P[0]]), ...sec].forEach((gx) => hbeam(fg, gx * k, yP, 12, 12));
      cur = st <= 3 ? P[0] : st === 4 ? P[2] : st === 5 ? Sx[1] : null;
    } else {
      const xEnd = st === 0 ? 0 : st === 1 ? 0.6 : st === 2 ? 0.6 + ph * 12 : 13.6;
      if (xEnd > 0) R(fg, 0.2 * k, yP - 12, (xEnd - 0.2) * k, 24, st >= 5 ? 'f-grout' : 'f-slurry', { style: 'stroke:var(--concrete2)' });
      if (st >= 3) for (let x = 0.9; x < xEnd - 0.4; x += 1.2) hbeam(fg, x * k, yP, 12, 12);
      cur = st >= 1 && st <= 3 ? xEnd : null;
      if (st >= 1 && st <= 2) R(fg, (xEnd - 0.3) * k, yP - 18, 0.6 * k, 36, 'f-acc', { opacity: 0.9 });
    }
    // metszet
    T(fig, W - 8, yE0 - 10, 'METSZET', 't-sm', { 'text-anchor': 'end' });
    const yG = yE0 + 6;
    R(bgG, 0, yG, W, depth * kz + 10, 'f-soilA'); R(bgG, 0, yG, W, depth * kz + 10, '', { fill: 'url(#pat-sand)' });
    L(bgG, 0, yG, W, yG, 'stroke:var(--ink);stroke-width:1.2');
    if (cur !== null && st >= 1 && st <= 5) {
      const w = (m === 'csm' ? 2.4 : m === 'colmix' ? 2.25 : 1.2) * k;
      const x = cur * k;
      let dTool, mixed;
      if (m === 'trench') { dTool = st === 1 ? depth * Math.min(1, ph * 1.4) : depth; mixed = st >= 2 ? 1 : 0; }
      else if (st === 1) { dTool = depth * ph; mixed = 0; }
      else if (st === 2) { dTool = depth * (1 - ph); mixed = 1; }
      else { dTool = 0; mixed = 1; }
      if (st === 1 && m !== 'trench') R(fg, x - w / 2, yG, w, dTool * kz, 'f-slurry', { opacity: 0.55 });
      if (mixed) { R(fg, x - w / 2, yG, w, depth * kz, 'f-slurry', { opacity: 0.45 }); if (st === 2 && m !== 'trench') R(fg, x - w / 2, yG + dTool * kz, w, (depth - dTool) * kz, 'f-grout', { opacity: 0.95 }); }
      if (st >= 3 && m !== 'trench') { R(fg, x - w / 2, yG, w, depth * kz, 'f-grout', { opacity: 0.95 }); [-0.6, 0.6].forEach((o) => R(fg, x + o * k - 3, yG - 6, 6, (depth - 3) * kz, 'f-steel2')); }
      // szerszám
      if (st <= 2 || (m === 'trench' && st <= 3)) {
        const ty = yG + dTool * kz;
        if (m === 'csm') {
          R(fg, x - 6, yE0 - 16, 12, ty - yE0 + 4, 'f-steel2');
          R(fg, x - 34, ty - 36, 68, 30, 'f-acc', { style: 'stroke:var(--ink)' });
          const rot = (time / 1000) * (st === 1 ? 6 : -6);
          for (const cx of [x - 18, x + 18]) {
            C(fg, cx, ty - 4, 14, 'f-steel', { style: 'stroke:var(--ink)' });
            for (let j = 0; j < 4; j++) { const a = rot + (j * Math.PI) / 2; L(fg, cx, ty - 4, cx + Math.cos(a) * 13, ty - 4 + Math.sin(a) * 13, 'stroke:var(--ink);stroke-width:1.5'); }
          }
          T(fg, x + 44, ty - 14, st === 1 ? '↓ marás + zagy' : '↑ keverés + cement', 't-lab halo');
        } else if (m === 'colmix') {
          for (const o of [-0.75, 0, 0.75]) { R(fg, x + o * k - 4, yE0 - 16, 8, ty - yE0 + 14, 'f-steel2'); for (let yy = yE0; yy < ty; yy += 10) L(fg, x + o * k - 9, yy + ((time / 60) % 10), x + o * k + 9, yy + 5 + ((time / 60) % 10), 'stroke:var(--steelm);stroke-width:2'); }
          T(fg, x + 50, ty - 10, st === 1 ? '↓ fúrás + kötőanyag' : '↑ keverés', 't-lab halo');
        } else {
          R(fg, x - 10, yE0 - 18, 20, ty - yE0 + 18, 'f-acc', { style: 'stroke:var(--ink)' });
          for (let yy = yE0 - 14; yy < ty; yy += 12) R(fg, x - 13, yy + ((time / 40) % 12), 26, 3, 'f-ink');
          T(fg, x + 18, yE0 + 40, st === 1 ? '↓ a vágókar lemerül' : '→ oldalirányú haladás', 't-lab halo');
        }
      }
      T(fig, W - 8, yG + depth * kz - 4, m === 'csm' ? 'pl. 14,5 m mély panel ≈ 47 perc (Bauer-napló)' : 'mélység: gép- és talajfüggő', 't-sm halo', { 'text-anchor': 'end' });
    } else {
      // kész fal + kiemelés
      if (st === 6) {
        R(bgG, 0, yG, W, 7 * kz, 'f-bg2');
        R(fig, 300, yG, 30, depth * kz, 'f-grout', { style: 'stroke:var(--concrete2)' });
        R(fig, 312, yG - 6, 6, (depth - 3) * kz, 'f-steel2');
        R(fig, 330, yG, W - 330, 7 * kz, 'f-bg2');
        R(fig, 330, yG + 2 * kz - 5, 22, 10, 'f-steel2');
        L(fig, 352, yG + 2 * kz, 470, yG + 2 * kz, 'stroke:var(--accent);stroke-width:5;stroke-linecap:round');
        T(fig, 360, yG + 2 * kz - 10, 'heveder + dúc', 't-sm halo');
        T(fig, 340, yG + 7 * kz + 18, 'gödörfenék', 't-sm');
        T(fig, 296, yG + 14, 'talajcement + acél', 't-sm halo', { 'text-anchor': 'end' });
      } else T(fig, W / 2, yG + 60, 'előkészítés: kitűzés, vezetőárok, keverőtelep', 't-sm', { 'text-anchor': 'middle' });
    }
  };
  paint();
  loop(fig, (t) => draw(t * 1000));
  draw(performance.now());
});

/* ================================================================== 8. Szádpalló-szelvények */
const PROF = [
  { v: 'AU14', t: 'AU 14', ty: 'U', b: 750, h: 408, tf: 10.0, m: 104, W: 1405 },
  { v: 'AU18', t: 'AU 18', ty: 'U', b: 750, h: 441, tf: 10.5, m: 118, W: 1780 },
  { v: 'AU25', t: 'AU 25', ty: 'U', b: 750, h: 450, tf: 14.5, m: 147, W: 2500 },
  { v: 'PU18', t: 'PU 18', ty: 'U', b: 600, h: 430, tf: 11.2, m: 128, W: 1800 },
  { v: 'AZ13', t: 'AZ 13-770', ty: 'Z', b: 770, h: 344, tf: 9.0, m: 99, W: 1300 },
  { v: 'AZ18', t: 'AZ 18-800', ty: 'Z', b: 800, h: 449, tf: 8.5, m: 101, W: 1840 },
  { v: 'AZ26', t: 'AZ 26-700', ty: 'Z', b: 700, h: 460, tf: 12.2, m: 147, W: 2600 },
  { v: 'AZ46', t: 'AZ 46', ty: 'Z', b: 580, h: 481, tf: 18.0, m: 229, W: 4595 },
  { v: 'AS500', t: 'AS 500 (egyenes)', ty: 'S', b: 500, h: 0, tf: 12.0, m: null, W: null },
];
register('szadProfile', (root) => {
  const { ctrls, viz, out } = shell(root, { foot: 'Adatok: ArcelorMittal szádpalló-katalógus (EN 10248). A szelvény nevében lévő szám ≈ W / 100 (cm³/m). A méretezés itt csak rugalmas hajlítási ellenőrzés: W<sub>szüks</sub> = M / f<sub>y</sub> – a valóságban az EN 1993-5 szerinti (pl. U-pallóknál a zárbeli nyírás miatti csökkentő) tényezők, a horpadás és az alakváltozás is számít. Szemléltető.' });
  const s = seg(ctrls, { label: 'Szelvény', options: PROF.map((p) => ({ v: p.v, t: p.t })), value: 'AU14' });
  const M = slider(ctrls, { label: 'Hajlítónyomaték a falban', sym: 'M', min: 50, max: 1600, step: 10, value: 420, unit: 'kNm/m', d: 0 });
  const fy = seg(ctrls, { label: 'Acélminőség', options: [{ v: 240, t: 'S240GP' }, { v: 355, t: 'S355GP' }, { v: 430, t: 'S430GP' }], value: 355 });
  const fig = figure(viz, 640, 190);
  const chart = figure(viz, 640, 270);
  const st = { b: stat(out, { label: 'Szélesség b', unit: 'mm', d: 0 }), h: stat(out, { label: 'Magasság h', unit: 'mm', d: 0 }), m: stat(out, { label: 'Tömeg', unit: 'kg/m²', d: 0 }), W: stat(out, { label: 'Keresztm. modulus W', unit: 'cm³/m', d: 0 }), r: stat(out, { label: 'Szükséges W', unit: 'cm³/m', d: 0 }) };
  const draw = () => {
    clear(fig); clear(chart);
    const p = PROF.find((x) => x.v === s.v);
    const Wreq = (M.v * 1000) / fy.v;
    // keresztmetszet
    const n = 6, kx = Math.min(0.13, 600 / (n * p.b)), x0 = (640 - n * p.b * kx) / 2, yc = 96;
    R(fig, 0, 0, 640, yc, 'f-soilA', { opacity: 0.6 }); R(fig, 0, 0, 640, yc, '', { fill: 'url(#pat-sand)', opacity: 0.6 });
    R(fig, 0, yc, 640, 94, 'f-bg2');
    const hh = (p.h / 2) * kx, f = 0.42 * p.b * kx, b = p.b * kx;
    let pts = [], locks = [];
    if (p.ty === 'U') {
      for (let i = 0; i < n; i++) { const xa = x0 + i * b, sg = i % 2 ? 1 : -1; pts.push([xa, yc], [xa + (b - f) / 2, yc + sg * hh], [xa + (b + f) / 2, yc + sg * hh]); locks.push([xa, yc, i % 2 === 1]); }
      pts.push([x0 + n * b, yc]); locks.push([x0 + n * b, yc, false]);
    } else if (p.ty === 'Z') {
      for (let j = 0; j <= n; j++) { const cx = x0 + j * b, sg = j % 2 ? 1 : -1; pts.push([cx - f / 2, yc + sg * hh], [cx + f / 2, yc + sg * hh]); locks.push([cx, yc + sg * hh, j % 2 === 1]); }
    } else {
      pts = [[x0, yc], [x0 + n * b, yc]];
      for (let j = 0; j <= n; j++) locks.push([x0 + j * b, yc, false]);
    }
    svg('path', { d: pathD(pts), style: `fill:none;stroke:var(--steelm2);stroke-width:${Math.max(3, p.tf * kx * 1.4)};stroke-linejoin:round` }, fig);
    L(fig, 0, yc, 640, yc, 'stroke:var(--grp);stroke-width:1;stroke-dasharray:6 4');
    T(fig, 636, yc - 5, 'semleges tengely', 't-sm', { 'text-anchor': 'end' });
    for (const [x, y, crimp] of locks) C(fig, x, y, 5, crimp ? 'f-acc' : 'f-surface', { style: 'stroke:var(--ink);stroke-width:1.4' });
    if (p.h) { L(fig, x0 - 16, yc - hh, x0 - 16, yc + hh, 'stroke:var(--muted)'); T(fig, x0 - 20, yc + 4, `h = ${p.h}`, 't-num', { 'text-anchor': 'end' }); }
    L(fig, x0 + 2 * b, 170, x0 + 3 * b, 170, 'stroke:var(--muted)'); T(fig, x0 + 2.5 * b, 184, `b = ${p.b} mm`, 't-num', { 'text-anchor': 'middle' });
    T(fig, 8, 16, p.ty === 'U' ? 'U-palló (Larssen-zár): a zárak a fal középsíkjában, a semleges tengelyen' : p.ty === 'Z' ? 'Z-palló (Hoesch-típus): a zárak a külső övlemezeken' : 'Egyenes gerincű palló: húzásra dolgozik (cellás gátak), hajlításra nem', 't-lab halo');
    T(fig, 8, 32, '● gyárilag összesajtolt zár (dupla palló) · ○ a helyszínen fűzött zár', 't-sm halo');
    // diagram
    const list = PROF.filter((x) => x.W);
    const maxW = 4800, xs = (w) => 150 + (w / maxW) * 420;
    const lightest = list.filter((x) => x.W * 1 >= Wreq).sort((a, b) => a.m - b.m)[0];
    T(chart, 8, 16, 'Keresztmetszeti modulus W (cm³/m) – és a fal tömege (kg/m²)', 't-sm');
    list.forEach((x, i) => {
      const y = 30 + i * 28, ok = x.W >= Wreq;
      T(chart, 8, y + 14, x.t, 't-lab' + (x.v === p.v ? ' t-grp' : ''));
      R(chart, 150, y + 3, xs(x.W) - 150, 16, ok ? 'f-ok' : 'f-muted', { opacity: x.v === p.v ? 0.95 : 0.55, rx: 3 });
      T(chart, xs(x.W) + 6, y + 15, `${x.W} · ${x.m} kg/m²` + (lightest && x.v === lightest.v ? '  ★ legkönnyebb megfelelő' : ''), 't-sm');
    });
    const xr = xs(Math.min(Wreq, maxW));
    L(chart, xr, 24, xr, 30 + list.length * 28, 'stroke:var(--bad);stroke-width:2;stroke-dasharray:5 3');
    T(chart, Math.min(xr + 4, 560), 262, `W szüks = ${fmt(Wreq, 0)}`, 't-num t-bad');
    st.b.set(p.b); st.h.set(p.h || 0, null, p.h ? null : '–'); st.m.set(p.m || 0, null, p.m ? null : '≈ 130–160');
    st.W.set(p.W || 0, p.W ? (p.W >= Wreq ? 'ok' : 'bad') : null, p.W ? null : 'húzott');
    st.r.set(Wreq);
  };
  [s, M, fy].forEach((c) => c.on(draw)); draw();
});

/* ================================================================== 9. Lépcsős verés */
register('szadStaged', (root) => {
  const { ctrls, viz, out } = shell(root, { foot: 'Ha a pallókat egyesével, egyből végleges mélységig hajtják, a sor a haladás irányába „előredől” (a dőlés itt túlozva látszik). Panelverésnél a vezetőkeretben álló pallókat csak néhány méterenként, sorban hajtják le; lépcsős verésnél előbb a páratlan, aztán a páros elemek mennek le. Gyárilag párosával sajtolt (dupla) pallókat vernek.' });
  const mode = seg(ctrls, { label: 'Verési mód', options: [{ v: 'egy', t: 'egyesével, végig' }, { v: 'lep', t: 'lépcsős (1-3-5…, 2-4-6…)' }, { v: 'pan', t: 'panelverés (néhány m-enként)' }], value: 'lep', vert: true });
  const N = 8, stepsOf = (m) => (m === 'pan' ? N * 3 : N);
  const st = slider(ctrls, { label: 'Lépés', min: 0, max: N, step: 1, value: 0, d: 0 });
  const play = h('button', { class: 'btn btn-line btn-sm', type: 'button' }, '▶ Lejátszás'); ctrls.append(play);
  const fig = figure(viz, 640, 340);
  const o1 = stat(out, { label: 'Lehajtott elemek', d: 0 }), o2 = stat(out, { label: 'Dőlés a haladás irányába' });
  const depths = (m, sIdx) => {
    const d = Array(N).fill(0);
    if (m === 'egy') { for (let i = 0; i < Math.min(sIdx, N); i++) d[i] = 1; }
    else if (m === 'lep') { const order = [0, 2, 4, 6, 1, 3, 5, 7]; for (let i = 0; i < Math.min(sIdx, N); i++) d[order[i]] = 1; }
    else { for (let i = 0; i < sIdx; i++) d[i % N] = Math.min(1, d[i % N] + 1 / 3); }
    return d;
  };
  mode.on((m) => { st.input.max = stepsOf(m); st.set(0); });
  const draw = () => {
    clear(fig);
    const m = mode.v, d = depths(m, st.v);
    const yG = 190, k = 14, Lp = 12, wP = 50, x0 = 120, fin = 9;
    R(fig, 0, yG, 640, 150, 'f-soilA'); R(fig, 0, yG, 640, 150, '', { fill: 'url(#pat-sand)' });
    L(fig, 0, yG, 640, yG, 'stroke:var(--ink);stroke-width:1.4');
    R(fig, x0 - 20, yG - 32, N * wP + 40, 7, 'f-steel2'); R(fig, x0 - 20, yG - 12, N * wP + 40, 7, 'f-steel2');
    T(fig, x0 - 24, yG - 18, 'vezetőkeret', 't-sm', { 'text-anchor': 'end' });
    let lean = 0;
    for (let i = 0; i < N; i++) {
      const dd = d[i] * fin;
      const th = m === 'egy' ? Math.min(i, st.v - 1) * 1.1 * (d[i] > 0 ? 1 : 0) : 0;
      if (m === 'egy' && d[i] > 0) lean = th;
      const x = x0 + i * wP, yTop = yG + dd * k - Lp * k, yBot = yG + dd * k;
      const g = svg('g', { transform: `rotate(${th} ${x + wP / 2} ${yBot})` }, fig);
      R(g, x + 2, yTop, wP - 4, Lp * k, d[i] >= 1 ? 'f-steel' : 'f-steelc', { style: 'stroke:var(--steelm2);stroke-width:1', opacity: d[i] > 0 ? 1 : 0.55 });
      L(g, x + wP / 2, yTop, x + wP / 2, yBot, 'stroke:var(--ink);stroke-width:1;stroke-dasharray:3 3');
      T(fig, x + wP / 2, 334, String(i + 1), 't-num', { 'text-anchor': 'middle' });
    }
    L(fig, 0, yG + fin * k, 640, yG + fin * k, 'stroke:var(--muted);stroke-dasharray:4 4');
    T(fig, 632, yG + fin * k - 4, 'tervezett talpszint', 't-sm', { 'text-anchor': 'end' });
    ar(fig, 520, 30, 600, 30, 'var(--grp)', 2, 8); T(fig, 512, 34, 'haladási irány', 't-sm', { 'text-anchor': 'end' });
    o1.set(d.filter((x) => x >= 1).length + ' / ' + N);
    o2.set(m === 'egy' ? (lean > 3 ? 'erős' : lean > 0 ? 'kezdődik' : '–') : 'nincs', m === 'egy' && lean > 3 ? 'bad' : m === 'egy' && lean > 0 ? 'warn' : 'ok');
  };
  [mode, st].forEach((c) => c.on(draw));
  let anim = null;
  play.addEventListener('click', () => {
    if (anim) { clearInterval(anim); anim = null; play.textContent = '▶ Lejátszás'; return; }
    if (st.v >= stepsOf(mode.v)) st.set(0);
    play.textContent = '❚❚ Megállítás';
    anim = setInterval(() => { if (st.v >= stepsOf(mode.v)) { clearInterval(anim); anim = null; play.textContent = '▶ Lejátszás'; return; } st.set(st.v + 1); }, mode.v === 'pan' ? 260 : 600);
  });
  draw();
});

/* ================================================================== 10. Rezgés a lehajtáskor */
register('szadVibe', (root) => {
  const { ctrls, viz, out } = shell(root, { foot: 'Becslés: TRL 429 (Hiller & Crabb, 2000) tapasztalati képletei, a BS 5228-2 is ezeket használja. Vibrálás: v = k<sub>v</sub> / x<sup>1,3</sup> (k<sub>v</sub> = 60 / 126 / 266 – 50 / 33 / 5 % túllépési valószínűség). Verés: v = k<sub>p</sub>·√W / r<sup>1,3</sup> (W: ütésenkénti energia, J). Határértékek: DIN 4150-3, rövid idejű rezgés, alapozás, 10–50 Hz. Szemléltető – a valós helyzetet rezgésméréssel kell ellenőrizni.' });
  const meth = seg(ctrls, { label: 'Lehajtás', options: [{ v: 'vib', t: 'vibrálás' }, { v: 'ver', t: 'verés' }, { v: 'saj', t: 'sajtolás' }], value: 'vib' });
  const xS = slider(ctrls, { label: 'Távolság a szomszéd épülettől', sym: 'x', min: 2, max: 60, step: 0.5, value: 12, unit: 'm', d: 1 });
  const WS = slider(ctrls, { label: 'Ütési energia (verés)', sym: 'W', min: 10, max: 120, step: 5, value: 40, unit: 'kJ', d: 0 });
  const kp = seg(ctrls, { label: 'Talaj (verés)', options: [{ v: 1, t: 'puha, laza' }, { v: 1.5, t: 'közepes' }, { v: 3, t: 'kemény, tömör' }, { v: 5, t: 'elakadásig' }], value: 1.5 });
  const bld = seg(ctrls, { label: 'Szomszéd épület', options: [{ v: 'i', t: 'ipari' }, { v: 'l', t: 'lakóház' }, { v: 'm', t: 'műemlék' }], value: 'l' });
  const LIM = { i: [20, 40, 'ipari, kereskedelmi'], l: [5, 15, 'lakóépület'], m: [3, 8, 'érzékeny, műemlék'] };
  const fig = figure(viz, 640, 320);
  const vd = verdict(viz);
  const o = { v50: stat(out, { label: 'Becsült rezgés (átlagos)', unit: 'mm/s', d: 1 }), v5: stat(out, { label: 'Óvatos becslés', unit: 'mm/s', d: 1 }), lim: stat(out, { label: 'Határérték (DIN 4150-3)' }) };
  const X0 = 2, X1 = 100, Y0 = 0.1, Y1 = 300, l = 60, r = 620, t = 18, b = 280;
  const sx = (x) => l + ((Math.log10(x) - Math.log10(X0)) / (Math.log10(X1) - Math.log10(X0))) * (r - l);
  const sy = (y) => b - ((Math.log10(clamp(y, Y0, Y1)) - Math.log10(Y0)) / (Math.log10(Y1) - Math.log10(Y0))) * (b - t);
  const curve = (f) => { const pts = []; for (let i = 0; i <= 60; i++) { const x = X0 * Math.pow(X1 / X0, i / 60); pts.push([sx(x), sy(f(x))]); } return pts; };
  const draw = () => {
    clear(fig);
    const m = meth.v, x = xS.v, lim = LIM[bld.v];
    // rács
    for (const v of [0.1, 1, 10, 100]) { L(fig, l, sy(v), r, sy(v), 'stroke:var(--line);stroke-width:1'); T(fig, l - 6, sy(v) + 4, String(v).replace('.', ','), 't-sm', { 'text-anchor': 'end' }); }
    for (const v of [2, 5, 10, 20, 50, 100]) { L(fig, sx(v), t, sx(v), b, 'stroke:var(--line);stroke-width:1'); T(fig, sx(v), b + 16, v + ' m', 't-sm', { 'text-anchor': 'middle' }); }
    T(fig, l, 12, 'rezgéssebesség v (mm/s)', 't-sm');
    // jegyzet: 20–30 m
    R(fig, sx(20), t, sx(30) - sx(20), b - t, 'f-acc', { opacity: 0.12 });
    T(fig, sx(25), t + 14, 'jegyzet: 20–30 m-re is elhat', 't-sm t-acc', { 'text-anchor': 'middle' });
    // határsáv
    R(fig, l, sy(lim[1]), r - l, sy(lim[0]) - sy(lim[1]), 'f-bad', { opacity: 0.13 });
    L(fig, l, sy(lim[0]), r, sy(lim[0]), 'stroke:var(--bad);stroke-width:1.5;stroke-dasharray:6 4');
    T(fig, r - 4, sy(lim[1]) - 5, `határérték-sáv: ${lim[2]} (${lim[0]}–${lim[1]} mm/s)`, 't-sm t-bad', { 'text-anchor': 'end' });
    let v50 = 0, v5 = 0;
    if (m === 'vib') {
      const ks = [[266, '5 %'], [126, '33 %'], [60, '50 %']];
      const band = [...curve((xx) => 266 / Math.pow(xx, 1.3)), ...curve((xx) => 60 / Math.pow(xx, 1.3)).reverse()];
      svg('path', { d: pathD(band, true), class: 'f-grp', opacity: 0.15 }, fig);
      ks.forEach(([kv, lab], i) => { svg('path', { d: pathD(curve((xx) => kv / Math.pow(xx, 1.3))), style: `fill:none;stroke:var(--grp);stroke-width:${i === 2 ? 3 : 1.5}` }, fig); T(fig, sx(2.6), sy(kv / Math.pow(2.6, 1.3)) - 4, lab, 't-sm t-grp halo'); });
      v50 = 60 / Math.pow(x, 1.3); v5 = 266 / Math.pow(x, 1.3);
    } else if (m === 'ver') {
      const W = WS.v * 1000, kk = +kp.v, f = (xx) => (kk * Math.sqrt(W)) / Math.pow(xx, 1.3);
      svg('path', { d: pathD(curve(f)), style: 'fill:none;stroke:var(--grp);stroke-width:3' }, fig);
      v50 = f(x); v5 = (5 * Math.sqrt(W)) / Math.pow(x, 1.3);
      svg('path', { d: pathD(curve((xx) => (5 * Math.sqrt(W)) / Math.pow(xx, 1.3))), style: 'fill:none;stroke:var(--grp);stroke-width:1.2;stroke-dasharray:4 3' }, fig);
      T(fig, sx(2.6), sy((5 * Math.sqrt(W)) / Math.pow(2.6, 1.3)) - 5, 'elakadásig verve (k = 5)', 't-sm t-grp halo');
    } else {
      T(fig, (l + r) / 2, sy(1) - 10, 'Statikus besajtolás: gyakorlatilag rezgésmentes, csendes', 't-big t-ok', { 'text-anchor': 'middle' });
      T(fig, (l + r) / 2, sy(1) + 12, '(Giken-típusú gép: kb. 69 dB(A) 7 m-ről; puha talajban a leghatékonyabb)', 't-sm', { 'text-anchor': 'middle' });
    }
    // jelölő
    L(fig, sx(x), t, sx(x), b, 'stroke:var(--ink);stroke-width:1.5');
    if (m !== 'saj') { C(fig, sx(x), sy(v50), 6, 'f-grp', { style: 'stroke:var(--surface);stroke-width:2' }); T(fig, sx(x) + 9, sy(v50) - 6, `${fmt(v50, 1)} mm/s`, 't-num halo'); }
    o.v50.set(m === 'saj' ? 0 : v50, null, m === 'saj' ? '≈ 0' : null);
    o.v5.set(m === 'saj' ? 0 : v5, null, m === 'saj' ? '≈ 0' : null);
    o.lim.set(`${lim[0]}–${lim[1]} mm/s`);
    if (m === 'saj') vd.set('ok', 'Rezgésmentes lehajtás', 'Ahol a zaj és a rezgés nem megengedhető (városban, érzékeny szomszéd mellett), a sajtolás – vagy fúrt technológiájú fal – a megoldás. Kemény talajban előfúrás vagy vízöblítés kell hozzá.');
    else {
      const ref = m === 'vib' ? v5 : v50;
      const sv = v50 > lim[1] ? 'bad' : ref > lim[0] ? 'warn' : 'ok';
      vd.set(sv, sv === 'bad' ? 'Kár veszélye!' : sv === 'warn' ? 'Mérni, figyelni kell' : 'Várhatóan a határérték alatt', sv === 'bad' ? `${fmt(x, 1)} m-ről a becsült rezgés ${fmt(v50, 1)} mm/s – meghaladja a ${lim[2]} határértékét. Megoldás: sajtolás, előfúrás, nagyfrekvenciás, rezonanciamentes vibrátor – vagy más falfajta.` : sv === 'warn' ? 'A becslés szórása nagy: a kedvezőtlen eset a határérték-sávba esik. Beépített területen előzetes vizsgálat és rezgésmérés szükséges.' : 'A becslés alapján a rezgés kicsi – de a laza homok tömörödése, a közművek és a régi épületek miatt érdemes mérni.');
    }
    WS.el.style.opacity = m === 'ver' ? 1 : 0.4; kp.el.style.opacity = m === 'ver' ? 1 : 0.4;
  };
  [meth, xS, WS, kp, bld].forEach((c) => c.on(draw)); draw();
});

/* ================================================================== 11. Szádfal anyagok */
const MAT = {
  fa: { t: 'Fa szádfal', kg: 110, col: 'f-timber', txt: ['Ma már nem használatos – 2–6 m mélységig, csak végleges állapotban.', 'Visszahúzása körülményes, a fa roncsolódik.', 'Először vezércölöpöket vertek, közéjük hajtották a horony-eresztékes pallókat.', 'Csak állandóan víz alatt tartós – a változó vízszintű zónában rothad.'] },
  vb: { t: 'Vasbeton szádfal', kg: 1100, col: 'f-conc', txt: ['Végleges szádoláshoz: kikötők, élővizek, partvédelem.', 'Hátránya a nagy súly – szállításra is méretezni kell (4–8 m).', 'Előfeszítéssel csökkentik a súlyt.', 'Lehajtása nehéz: vízöblítéssel segítik; a hézagokat utólag kiinjektálják.'] },
  pvc: { t: 'Műanyag (PVC) szádfal', kg: 16, col: 'f-grout', txt: ['Hazánkban még nem terjedt el – végleges partfalak, kikötők, csatornapartok.', '30 cm széles „nyomott” hullámlemez (pl. Geoflex), csak kb. 9 kg/m².', 'Vibrátoros, vízsugaras lehajtás; nagyon puha talajban kotrógéppel benyomják.', 'Zár: belső és külső szelvény; fejlezárás műanyag, acél vagy fa elemmel.'] },
  acel: { t: 'Acél szádfal', kg: 187, col: 'f-steel', txt: ['A leggyakoribb, különösen ideiglenes munkagödör-határoláshoz.', 'Könnyen verhető, visszahúzható, vízzáró képessége a legjobb.', 'Egyenes, félhullám (U, Z) vagy teljes hullám szelvények; hazánkban Larssen és Hoesch.', 'Végleges alkalmazásnál külön korrózióvédelmi előírások.'] },
};
register('szadAnyag', (root) => {
  const { ctrls, viz } = shell(root, { out: false, foot: 'Tömeg: egy 6 m hosszú, 30 cm széles palló, <b>szemléltető számítás</b> – PVC: 9 kg/m² (jegyzet); acél: AU 14, 104 kg/m²; fa: 10 cm vastag fenyő, ~600 kg/m³; vasbeton: 25 cm vastag, ~2500 kg/m³.' });
  const s = seg(ctrls, { label: 'Anyag', options: Object.entries(MAT).map(([v, o]) => ({ v, t: o.t.replace(' szádfal', '') })), value: 'pvc', vert: true });
  const card = h('div', { class: 'card flat' }); ctrls.append(card);
  const fig = figure(viz, 640, 300);
  const draw = () => {
    clear(fig);
    const o = MAT[s.v];
    card.innerHTML = `<h4>${o.t}</h4><ul class="list">${o.txt.map((t) => `<li>${t}</li>`).join('')}</ul>`;
    // szelvényrajz
    const yc = 70, x0 = 40;
    T(fig, 8, 16, 'Szelvény (felülnézet, vázlat)', 't-sm');
    if (s.v === 'fa') { for (let i = 0; i < 5; i++) { R(fig, x0 + i * 62, yc - 14, 58, 28, 'f-timber', { style: 'stroke:var(--timber2)' }); R(fig, x0 + i * 62 + 58, yc - 5, 6, 10, 'f-timber'); } C(fig, x0 - 16, yc, 16, 'f-timber2'); T(fig, x0 - 16, yc + 34, 'vezércölöp', 't-sm', { 'text-anchor': 'middle' }); }
    else if (s.v === 'vb') { for (let i = 0; i < 4; i++) { R(fig, x0 + i * 82, yc - 22, 76, 44, 'f-conc', { style: 'stroke:var(--concrete2)' }); R(fig, x0 + i * 82 + 76, yc - 8, 8, 16, 'f-conc'); } }
    else if (s.v === 'pvc') { const pts = []; for (let i = 0; i < 8; i++) { const xa = x0 + i * 40, sg = i % 2 ? 1 : -1; pts.push([xa, yc], [xa + 10, yc + sg * 14], [xa + 30, yc + sg * 14]); } pts.push([x0 + 320, yc]); svg('path', { d: pathD(pts), style: 'fill:none;stroke:var(--muted);stroke-width:2.5' }, fig); }
    else { const pts = []; for (let i = 0; i < 4; i++) { const xa = x0 + i * 80, sg = i % 2 ? 1 : -1; pts.push([xa, yc], [xa + 22, yc + sg * 24], [xa + 58, yc + sg * 24]); } pts.push([x0 + 320, yc]); svg('path', { d: pathD(pts), style: 'fill:none;stroke:var(--steelm2);stroke-width:4' }, fig); }
    // tömegdiagram
    T(fig, 8, 140, 'Egy 6 m × 30 cm-es palló tömege', 't-sm');
    const ord = ['pvc', 'fa', 'acel', 'vb'], mx = 1100;
    ord.forEach((kk, i) => {
      const y = 152 + i * 34, w = Math.max(4, (MAT[kk].kg / mx) * 380);
      T(fig, 8, y + 18, MAT[kk].t.replace(' szádfal', ''), 't-lab' + (kk === s.v ? ' t-grp' : ''));
      R(fig, 140, y + 4, w, 20, MAT[kk].col, { style: 'stroke:var(--ink);stroke-width:' + (kk === s.v ? 2 : 0.6), rx: 3 });
      T(fig, 146 + w, y + 19, `≈ ${MAT[kk].kg.toLocaleString('hu-HU')} kg` + (kk === 'pvc' ? ' – egy ember is viszi' : kk === 'vb' ? ' – daru kell' : ''), 't-num halo');
    });
  };
  s.on(draw); draw();
});

/* ================================================================== 12. Cölöpfal alaprajz */
register('colopPlan', (root) => {
  const { ctrls, viz, out } = shell(root);
  const dS = slider(ctrls, { label: 'Cölöpátmérő', sym: 'D', min: 40, max: 120, step: 5, value: 60, unit: 'cm', d: 0 });
  const sS = slider(ctrls, { label: 'Tengelytávolság', sym: 's', min: 30, max: 200, step: 1, value: 100, unit: 'cm', d: 0 });
  const pre = seg(ctrls, { label: 'Előbeállítás', options: [{ v: 'h', t: 'hézagos' }, { v: 'e', t: 'érintkező' }, { v: 'm', t: 'összemetsző' }], value: 'h' });
  const gw = toggle(ctrls, { label: 'Talajvíz / rétegvíz a fal mögött', value: false });
  const jet = toggle(ctrls, { label: 'Hézagok jet-oszloppal kitöltve', value: false });
  const fv = toggle(ctrls, { label: 'Felületvédelem: háló + lőttbeton + szivárgó', value: true });
  const fig = figure(viz, 640, 270);
  const vd = verdict(viz);
  const st = { ty: stat(out, { label: 'Faltípus' }), g: stat(out, { label: 'Hézag / átfedés', unit: 'cm', d: 0 }), n: stat(out, { label: 'Cölöp / fm', d: 2 }), v: stat(out, { label: 'Vasalt cölöp / fm', d: 2 }), w: stat(out, { label: 'Vízzárás' }) };
  pre.on((v) => { const D = dS.v; sS.set(v === 'h' ? D + 40 : v === 'e' ? D : D - 11, false); draw(); });
  const draw = () => {
    clear(fig);
    const D = dS.v, s = sS.v, g = s - D;
    const typ = g > 0.5 ? 'h' : g < -0.5 ? 'm' : 'e';
    const n = 6, k = Math.min(1.6, 600 / ((n - 1) * s + D)), W = 640, yc = 128;
    const x0 = (W - (n - 1) * s * k) / 2;
    R(fig, 0, 0, W, yc, 'f-soilE'); R(fig, 0, 0, W, yc, '', { fill: 'url(#pat-clay)' });
    if (gw.v) R(fig, 0, 20, W, yc - 30, '', { fill: 'url(#pat-water)' });
    R(fig, 0, yc + (D / 2) * k * 0.2, W, 270, 'f-bg2');
    // jet
    if (typ === 'h' && jet.v) for (let i = 0; i < n - 1; i++) C(fig, x0 + (i + 0.5) * s * k, yc - (D / 2) * k * 0.55, Math.max((g / 2 + 18) * k, (D / 2) * k * 0.7), 'f-ice', { opacity: 0.9, style: 'stroke:var(--ice2)' });
    // felületvédelem
    if (typ === 'h' && fv.v) for (let i = 0; i < n - 1; i++) { const xa = x0 + i * s * k + (D / 2) * k * 0.7, xb = x0 + (i + 1) * s * k - (D / 2) * k * 0.7; svg('path', { d: `M${xa} ${yc + (D / 2) * k * 0.72} Q ${(xa + xb) / 2} ${yc + (D / 2) * k * 0.35} ${xb} ${yc + (D / 2) * k * 0.72}`, style: `fill:none;stroke:var(--shot);stroke-width:${Math.max(4, 12 * k)}` }, fig); }
    for (let pass = 0; pass < 2; pass++) for (let i = 0; i < n; i++) {
      const prim = typ === 'm' && i % 2 === 0;
      if (typ === 'm' ? (pass === 0) !== prim : pass === 1) continue;
      const cx = x0 + i * s * k;
      C(fig, cx, yc, (D / 2) * k, prim ? 'f-grout' : 'f-conc', { style: 'stroke:var(--concrete2);stroke-width:1.2' });
      if (!prim) C(fig, cx, yc, (D / 2 - 8) * k, '', { style: 'fill:none;stroke:var(--bad);stroke-width:1.5;stroke-dasharray:3 2' });
      if (typ === 'm') T(fig, cx, yc + 4, (prim ? 'P' : 'S') + (prim ? i / 2 + 1 : (i + 1) / 2), 't-num', { 'text-anchor': 'middle' });
    }
    // szivárgás
    if (gw.v && typ !== 'm') for (let i = 0; i < n - 1; i++) {
      const xm = x0 + (i + 0.5) * s * k;
      if (typ === 'h' && jet.v) ar(fig, xm, 26, xm, yc + 52, 'var(--water)', 1, 5);
      else ar(fig, xm, 26, xm, yc + 80, 'var(--water)', typ === 'h' ? 3 : 1.6, typ === 'h' ? 10 : 7);
    }
    L(fig, x0 + s * k, yc + (D / 2) * k + 22, x0 + 2 * s * k, yc + (D / 2) * k + 22, 'stroke:var(--muted)');
    T(fig, x0 + 1.5 * s * k, yc + (D / 2) * k + 38, `s = ${s} cm`, 't-num', { 'text-anchor': 'middle' });
    T(fig, 8, 16, 'FÖLDOLDAL', 't-sm'); T(fig, 8, 262, 'MUNKATÉR', 't-sm');
    // értékelés
    const nn = 100 / s;
    st.n.set(nn); st.v.set(typ === 'm' ? nn / 2 : nn);
    if (typ === 'h') {
      st.ty.set('hézagos'); st.g.set(g, g >= 20 && g <= Math.min(60, D) ? 'ok' : 'warn');
      st.w.set(jet.v ? 'vízteleníthető' : 'nem vízzáró', jet.v ? 'warn' : 'bad');
      if (g > Math.min(60, D)) vd.set('bad', 'Túl nagy a cölöpköz', `A vállalható hézag jellemzően 20–60 cm, de legfeljebb a cölöpátmérő (itt ${Math.min(60, D)} cm). Ennél nagyobb hézagnál a talaj nem boltozódik át biztonságosan.`);
      else if (g < 20) vd.set('warn', 'Nagyon kicsi hézag', 'Ez már közel érintkező fal – sok cölöp, kevés haszon. A hézag méretét a talaj állékonysága, átboltozódási képessége adja.');
      else vd.set(gw.v && !jet.v ? 'warn' : 'ok', 'Hézagos cölöpfal', gw.v && !jet.v ? 'Rétegvíz esetén a cölöpközökben dréncső, felületszivárgó kell – állandó talajvíz alatt nem alkalmas.' : 'Kemény agyagban, puha kőzetben, talajvíz felett, szűk városi telken – hazánkban ez terjedt el. A kedvező szilárdságú talaj miatt kevesebb cölöp is elég.');
    } else if (typ === 'e') {
      st.ty.set('érintkező'); st.g.set(0, 'ok'); st.w.set('nem vízzáró', 'warn');
      vd.set('ok', 'Érintkező cölöpfal', 'Ha a talaj önmagában nem állékony (szemcsés talaj), de vízzárásra nincs szükség, vagy statikailag sűrű kiosztás kell.');
    } else {
      const a = -g;
      st.ty.set('összemetsző'); st.g.set(a, a >= 8 && a <= 15 ? 'ok' : 'warn'); st.w.set('vízzáró', 'ok');
      vd.set(a >= 8 && a <= 15 ? 'ok' : 'warn', 'Összemetsző cölöpfal', a < 8 ? `Csak ${a} cm átfedés – a fúrás ferdesége miatt mélyebben szétnyílhat. A jegyzet szerint kb. 10–12 cm átfúrás.` : a > 15 ? `${a} cm átfedés – vízzáró, de sok a „levágott” beton: gazdaságtalan.` : 'Először a vasalatlan primer (P) cölöpök, majd 10–12 cm átfúrással a vasalt szekunder (S) cölöpök. Csak minden második vasalt – a résfalhoz képest csak speciális esetben gazdaságos.');
    }
  };
  [dS, sS, gw, jet, fv].forEach((c) => c.on(draw)); draw();
});

/* ================================================================== 13. Függőlegesség – meddig tart az átfedés? */
register('colopVert', (root) => {
  const { ctrls, viz, out } = shell(root, { foot: 'Legrosszabb eset: a két szomszédos cölöp egymástól elfelé dől, így tengelyeik mélységgel 2·i·z-vel távolodnak; az átfedés z₀ = a / (2i) mélységben fogy el. A tömítő „torok” szélessége t = 2·√(R² − (s/2)²). Saját, szemléltető levezetés (a vízszintes lépték erősen nagyított).' });
  const iS = seg(ctrls, { label: 'Függőlegességi tűrés', options: [{ v: 75, t: '1:75' }, { v: 100, t: '1:100' }, { v: 200, t: '1:200' }], value: 100 });
  const aS = slider(ctrls, { label: 'Átfedés a fejnél', sym: 'a', min: 6, max: 15, step: 1, value: 12, unit: 'cm', d: 0 });
  const DS = seg(ctrls, { label: 'Cölöpátmérő', options: [{ v: 60, t: 'Ø 60' }, { v: 88, t: 'Ø 88' }, { v: 120, t: 'Ø 120' }], value: 88 });
  const LS = slider(ctrls, { label: 'Falmélység', sym: 'L', min: 5, max: 25, step: 0.5, value: 14, unit: 'm', d: 1 });
  const one = toggle(ctrls, { label: 'Csak az egyik cölöp ferde', value: false });
  const fig = figure(viz, 640, 330);
  const vd = verdict(viz);
  const st = { z0: stat(out, { label: 'Itt fogy el az átfedés', unit: 'm', d: 1 }), aL: stat(out, { label: 'Átfedés a fal talpán', unit: 'cm', d: 1 }), t0: stat(out, { label: 'Torok a fejnél', unit: 'cm', d: 0 }) };
  const draw = () => {
    clear(fig);
    const i = 1 / +iS.v, a0 = aS.v, D = +DS.v, Lw = LS.v, f = one.v ? 1 : 2;
    const z0 = a0 / (100 * f * i);
    const aAt = (z) => a0 - f * i * z * 100;
    const yT = 26, yB = 306, ky = (yB - yT) / Lw, xc = 230, kx = 7;
    const Y = (z) => yT + z * ky;
    R(fig, 20, yT, 420, yB - yT, 'f-soilB', { opacity: 0.5 }); R(fig, 20, yT, 420, yB - yT, '', { fill: 'url(#pat-clay)' });
    // bal (primer) és jobb (szekunder) cölöp széle
    const leftEdge = (z) => xc + (one.v ? (a0 / 2) * kx : (aAt(z) / 2) * kx);
    const rightEdge = (z) => xc - (one.v ? (aAt(z) - a0 / 2) * kx : (aAt(z) / 2) * kx);
    svg('path', { d: pathD([[20, yT], [leftEdge(0), yT], [leftEdge(Lw), yB], [20, yB]], true), class: 'f-grout', style: 'stroke:var(--concrete2)' }, fig);
    svg('path', { d: pathD([[440, yT], [rightEdge(0), yT], [rightEdge(Lw), yB], [440, yB]], true), class: 'f-conc', style: 'stroke:var(--concrete2)', opacity: 0.85 }, fig);
    // átfedés / rés kiemelése
    const zz = Math.min(z0, Lw);
    svg('path', { d: pathD([[rightEdge(0), yT], [leftEdge(0), yT], [leftEdge(zz), Y(zz)], [rightEdge(zz), Y(zz)]], true), class: 'f-ok', opacity: 0.55 }, fig);
    if (z0 < Lw) svg('path', { d: pathD([[leftEdge(z0), Y(z0)], [rightEdge(z0), Y(z0)], [rightEdge(Lw), yB], [leftEdge(Lw), yB]], true), class: 'f-water', style: 'fill:var(--water)', opacity: 0.6 }, fig);
    T(fig, 30, yT + 18, 'primer (vasalatlan)', 't-sm halo'); T(fig, 430, yT + 18, 'szekunder (vasalt)', 't-sm halo', { 'text-anchor': 'end' });
    if (z0 < Lw) { L(fig, 20, Y(z0), 440, Y(z0), 'stroke:var(--bad);stroke-width:1.5;stroke-dasharray:6 4'); T(fig, 436, Y(z0) - 6, `z₀ = ${fmt(z0, 1)} m – itt nyílik a rés`, 't-lab t-bad halo', { 'text-anchor': 'end' }); }
    for (let z = 0; z <= Lw + 0.01; z += Lw > 15 ? 5 : 2) T(fig, 16, Y(z) + 4, fmt(z, 0) + ' m', 't-sm', { 'text-anchor': 'end' });
    // torok-diagram
    const R0 = D / 2, cx0 = 480, cw = 140;
    T(fig, cx0, 16, 'tömítő torok t (cm)', 't-sm');
    const tAt = (z) => { const s = D - aAt(z); return s >= D ? 0 : 2 * Math.sqrt(Math.max(0, R0 * R0 - (s / 2) * (s / 2))); };
    const tMax = tAt(0) || 1, kt = (cw - 10) / Math.max(60, tMax);
    L(fig, cx0, yT, cx0, yB, 'stroke:var(--line2)');
    const pts = []; for (let j = 0; j <= 60; j++) { const z = (Lw * j) / 60; pts.push([cx0 + tAt(z) * kt, Y(z)]); }
    svg('path', { d: pathD([[cx0, yT], ...pts, [cx0, yB]], true), class: 'f-ok', opacity: 0.35 }, fig);
    svg('path', { d: pathD(pts), style: 'fill:none;stroke:var(--ok);stroke-width:2' }, fig);
    T(fig, cx0 + tAt(0) * kt + 4, yT + 12, fmt(tAt(0), 0), 't-num');
    const aL = aAt(Lw);
    st.z0.set(z0, z0 < Lw ? 'bad' : 'ok'); st.aL.set(aL, aL > 4 ? 'ok' : aL > 0 ? 'warn' : 'bad'); st.t0.set(tAt(0));
    if (z0 < Lw) vd.set('bad', 'A fal alsó része már nem vízzáró', `1:${iS.v} ferdeségnél a ${a0} cm-es átfedés ${fmt(z0, 1)} m mélyen elfogy – alatta rés nyílik, a víz és a talaj bejut. Pontosabb (pl. béléscsöves) fúrás, nagyobb átfedés vagy vezetőfal + ferdeségmérés kell.`);
    else if (aL < 4) vd.set('warn', 'Szűkösen tart', `A talpon csak ${fmt(aL, 1)} cm átfedés marad.`);
    else vd.set('ok', 'Az átfedés a talpig megmarad', `A talpon még ${fmt(aL, 1)} cm átfedés van. „1 cm/m” ferdeség 10 m mélyen már 10 cm eltérés – ezért kritikus a vezetőfal és a pontos fúrás.`);
  };
  [iS, aS, DS, LS, one].forEach((c) => c.on(draw)); draw();
});

/* ================================================================== kvíz */
defineQuiz('falak', 'Kvíz – munkatérhatároló falak', [
  { q: 'Milyen távolságban helyezik el általában a berlini dúcolat acél I-tartóit?', a: ['0,5–1 m-enként', '1–3 m-enként, általában 2 m-re', '4–6 m-enként', 'mindig pontosan 3 m-re'], c: 1, e: 'A jegyzet szerint 1–3 m-re, általában 2 m-re; sűrűbb kiosztást nagyobb terhelés indokolhat.' },
  { q: 'Miért helyezik ma inkább furatba (mint verik) a berlini dúcolat tartóit?', a: ['Mert így vízzáró lesz a fal', 'Zajvédelmi okból – és így a veréssel nehezen átjárható rétegek sem okoznak gondot', 'Mert a furatban nem kell befogni', 'Mert így nem kell pallózni'], c: 1, e: 'Zajvédelem, és a nehezen átverhető rétegek elkerülése. A furatot – különösen a kiemelési szint alatt – megfelelően ki kell tölteni.' },
  { q: 'Mekkora osztástávolság biztosítja a jet-grouting fal vízzárását?', a: ['Az átmérőnél 10–20 cm-rel nagyobb', 'Az átmérővel azonos', 'Az átmérőnél 10–20 cm-rel kisebb', 'Az átmérő fele'], c: 2, e: 'Az átmérőnél 10–20 cm-rel kisebb osztás adja az átfedést – így kvázi vízzáró fal készíthető.' },
  { q: 'Miért korlátos a jet-grouting falba helyezhető acéltag mérete?', a: ['Mert a jetelt talaj szilárdulásáig igen sűrű folyadék – csak a fúrás tengelyének kb. 15–20 cm-es környezete fogadja be', 'Mert a jet-oszlop átmérője legfeljebb 30 cm', 'Mert az acél korrodál a cementben', 'Mert a szabvány tiltja a nagy szelvényeket'], c: 0, e: 'A jegyzet szerint a fúrószárral átjárt függély és annak 15–20 cm-es környezete alkalmas az acéltag befogadására – függetlenül az oszlop méretétől.' },
  { q: 'Mi adja az erősített önszilárduló zagyfal vízzárását és mi a teherbírását?', a: ['Mindkettőt a beton', 'A vízzárást a megszilárdult zagy, a teherbírást az 1–2 m-enként elhelyezett acélszelvények', 'A vízzárást az acél, a teherbírást a zagy', 'A vízzárást fólia, a teherbírást horgonyok'], c: 1, e: 'A cementtartalmú zagy megszilárdulva vízzáró, de csak 0,5–1,4 MPa szilárdságú – boltozódva adja át a terhet az acélszelvényeknek.' },
  { q: 'Melyik állítás igaz az acél szádfalra?', a: ['Csak végleges szerkezetként használható', 'Hornyos kapcsolata miatt vízzáró lehet, ideiglenes falként visszahúzható és újra felhasználható', 'Csak sajtolással lehet lehajtani', 'Rezgése legfeljebb 2–3 m-re hat el'], c: 1, e: 'A zárak (hornyok) miatt vízzáró, ideiglenes és végleges is lehet; a lehajtás rezgései 20–30 m-re is elhathatnak.' },
  { q: 'Hol van a zár egy U (Larssen) szádpallóból készült falban?', a: ['A külső övlemezeken', 'A fal középsíkjában, a semleges tengelyen', 'A gerinc közepén, a fal felületén', 'Nincs zár, hegesztik'], c: 1, e: 'U-pallóknál a zár a semleges tengelyen van (ezért kell a dupla pallók sajtolása), Z-pallóknál a külső övlemezeken.' },
  { q: 'Mekkora a hézagos cölöpfal cölöpközének jellemző mérete a jegyzet szerint?', a: ['5–10 cm', '20–60 cm, de legfeljebb a cölöpátmérő', '1–2 m', 'pontosan a cölöpátmérő kétszerese'], c: 1, e: 'A vállalható hézag a talaj állékonyságától, átboltozódási képességétől függ: jellemzően 20–60 cm, legfeljebb D.' },
  { q: 'Összemetsző cölöpfalnál melyik cölöpök készülnek először?', a: ['A vasalt cölöpök', 'A nem vasalt (primer) cölöpök, majd közéjük kb. 10–12 cm átfúrással a vasaltak', 'Mindegy, tetszőleges sorrendben', 'Először a fejgerenda'], c: 1, e: 'Először a vasalatlan cölöpök, majd közéjük – kb. 10–12 cm-t átfúrva – a vasalt, nyomaték felvételére is alkalmas cölöpök. Csak minden második vasalt.' },
  { q: 'Melyik fal NEM alkalmas talajvíz alatti munkagödör vízzáró határolására?', a: ['Összemetsző cölöpfal', 'Acél szádfal', 'Berlini dúcolat', 'Erősített mélykevert fal'], c: 2, e: 'A berlini dúcolat pallói között átszivárog a víz – csak talajvíz felett vagy víztelenítéssel használható.' },
]);
