// 01 – Alapok: gödörtípusok, szempontok, egyensúlyi elvek, technológia-térkép, rézsű kalkulátor
import { $, $$, h, svg, figure, clear, fmt, rad, register, shell, slider, seg, toggle, stat, verdict, arrow, dim, pathD } from './core.js';
import { defineQuiz } from './ui.js';

/* ---------------------------------------------------------------- gödörtípusok */
const TIPUS = [
  { v: 'agodor', t: 'Alapgödör', d: 'Egy <b>pontalap</b> helyéről kiemelt gödör. Jellemzően max. 1–2 m mély; kötött talajban rövid ideig (a gyors bebetonozásig) függőleges falban is kiemelhető.', w: 'kb. 1,5–3 m', m: '1–2 m' },
  { v: 'aarok', t: 'Alapárok', d: 'Egy <b>sávalap</b> helyéről kiemelt árok. Síkalapozásnál döntően csak ilyen sekély árkok, gödrök készülnek.', w: '0,6–1,5 m', m: '1–2 m' },
  { v: 'mgodor', t: 'Munkagödör', d: 'Egy <b>egész építmény</b> – pl. pince, mélygarázs – számára kiemelt gödör. Már egy pinceszintnél legalább rézsűs kiemelés vagy megtámasztó szerkezet kell.', w: 'az építmény + munkatér', m: '3–25 m' },
  { v: 'marok', t: 'Munkaárok', d: 'Keskeny munkagödör, jellemzően <b>1–3 m</b> széles, <b>vonalas létesítményekhez</b> (közművek). Ideiglenes: a közmű elkészülte után visszatemetik.', w: '1–3 m', m: '1–6 m' },
];
register('godortipus', (root) => {
  const { viz } = shell(root, { layout: 'wide', out: false });
  const sg = seg(viz, { options: TIPUS.map((t) => ({ v: t.v, t: t.t })) });
  const s = figure(viz, 520, 230);
  const txt = h('div', { class: 'verdict' });
  viz.append(txt);
  const draw = (k) => {
    clear(s);
    const T = TIPUS.find((t) => t.v === k);
    const g0 = 70;
    svg('rect', { x: 0, y: 0, width: 520, height: g0, class: 'f-sky' }, s);
    const soil = (pts) => { svg('path', { d: pathD(pts, true), class: 'f-soilB' }, s); svg('path', { d: pathD(pts, true), fill: 'url(#pat-clay)' }, s); };
    let hole;
    if (k === 'agodor') hole = [[200, g0], [320, g0], [320, g0 + 70], [200, g0 + 70]];
    if (k === 'aarok') hole = [[230, g0], [290, g0], [290, g0 + 70], [230, g0 + 70]];
    if (k === 'mgodor') hole = [[90, g0], [430, g0], [430, g0 + 140], [90, g0 + 140]];
    if (k === 'marok') hole = [[225, g0], [295, g0], [295, g0 + 120], [225, g0 + 120]];
    soil([[0, g0], [hole[0][0], g0], [hole[3][0], hole[3][1]], [hole[2][0], hole[2][1]], [hole[1][0], g0], [520, g0], [520, 230], [0, 230]]);
    svg('line', { x1: 0, y1: g0, x2: 520, y2: g0, class: 's-ink', 'stroke-width': 1.5 }, s);
    if (k === 'agodor') {
      svg('rect', { x: 215, y: g0 + 45, width: 90, height: 25, class: 'f-conc' }, s);
      svg('rect', { x: 247, y: g0 - 40, width: 26, height: 85, class: 'f-conc2' }, s);
      svg('text', { x: 192, y: g0 + 62, 'text-anchor': 'end', class: 't-lab', text: 'pontalap' }, s);
    } else if (k === 'aarok') {
      svg('rect', { x: 236, y: g0 + 48, width: 48, height: 22, class: 'f-conc' }, s);
      svg('rect', { x: 250, y: g0 - 40, width: 20, height: 88, class: 'f-conc2' }, s);
      svg('text', { x: 222, y: g0 + 64, 'text-anchor': 'end', class: 't-lab', text: 'sávalap' }, s);
    } else if (k === 'mgodor') {
      svg('rect', { x: 120, y: g0 + 20, width: 280, height: 120, class: 'f-conc2', opacity: 0.35 }, s);
      svg('rect', { x: 120, y: g0 + 130, width: 280, height: 10, class: 'f-conc' }, s);
      svg('rect', { x: 120, y: g0 + 20, width: 9, height: 110, class: 'f-conc' }, s);
      svg('rect', { x: 391, y: g0 + 20, width: 9, height: 110, class: 'f-conc' }, s);
      svg('rect', { x: 120, y: g0 + 70, width: 280, height: 7, class: 'f-conc' }, s);
      svg('rect', { x: 120, y: g0 + 20, width: 280, height: 7, class: 'f-conc' }, s);
      svg('text', { x: 260, y: g0 + 55, 'text-anchor': 'middle', class: 't-lab', text: 'pinceszintek' }, s);
      for (const x of [92, 428]) svg('line', { x1: x, y1: g0, x2: x, y2: g0 + 140, class: 's-steel', 'stroke-width': 5 }, s);
      svg('text', { x: 82, y: g0 - 8, 'text-anchor': 'middle', class: 't-sm', text: 'határoló fal' }, s);
    } else {
      svg('circle', { cx: 260, cy: g0 + 102, r: 15, class: 'f-steel' }, s);
      svg('circle', { cx: 260, cy: g0 + 102, r: 10, class: 'f-surface' }, s);
      for (const y of [g0 + 25, g0 + 65]) svg('rect', { x: 227, y: y - 3, width: 66, height: 6, rx: 3, class: 'f-acc' }, s);
      for (const x of [227, 289]) svg('rect', { x, y: g0, width: 4, height: 118, class: 'f-steel2' }, s);
      svg('text', { x: 305, y: g0 + 105, class: 't-lab', text: 'közmű' }, s);
      svg('text', { x: 305, y: g0 + 28, class: 't-lab', text: 'dúc' }, s);
    }
    const hx = hole[1][0] + 14;
    dim(s, hx, g0, hx, hole[2][1], T.m, { dx: 4, anchor: 'start' });
    dim(s, hole[0][0], hole[3][1] + 14, hole[1][0], hole[3][1] + 14, T.w);
    txt.innerHTML = `<b>${T.t}</b>${T.d}`;
  };
  sg.on(draw); draw(sg.v);
});

/* ---------------------------------------------------------------- szempontok (chipek) */
const FAKTOR = [
  ['Rendelkezésre álló terület', 'Van-e hely rézsűre, deponálásra, horgonyokra? Szűk városi telken csak függőleges, megtámasztott fal jöhet szóba – a horgony pedig gyakran a szomszéd telek alá nyúlna.'],
  ['Talaj', 'Kötött talajban a fal rövid ideig magától is megáll (m₀), szemcsés talajban nem. Kemény, köves rétegben a szádpalló nem hajtható le, puha agyagban a szegezés nem alkalmazható.'],
  ['Talajvíz', 'Talajvíz alá érő gödörnél vízzáró fal kell (szádfal, résfal, összemetsző cölöpfal, jet- vagy zagyfal) a vízzáró rétegbe kötve – vagy víztelenítés. A berlini dúcolat és a hézagos cölöpfal nem vízzáró.'],
  ['Nyitvatartás ideje', 'Rövid ideig nyitott gödörhöz ideiglenes, visszanyerhető szerkezet (szádfal, táblás dúcolat) kell; hosszú ideig nyitva tartott vagy végleges falnál korrózió, tartósság is számít.'],
  ['Környezet beépítettsége', 'Szomszéd épület mellett a fal mozgása, a verés-vibrálás rezgése (20–30 m-re is elhat) és a zaj korlátoz: ilyenkor fúrt, merev falak és merev megtámasztás (csőtámasz, födém) a nyerő.'],
  ['Létesítmény méretei', 'A gödör szélessége a dúcolhatóságot (kihajlás), a mélysége a falszerkezetet és a megtámasztási szintek számát határozza meg.'],
  ['Rendelkezésre álló eszközök', 'Milyen gépek, technológiák, szakcégek érhetők el: például hazánkban a CFA cölöpözés elterjedt, a műanyag szádfal nem.'],
];
function initFaktor() {
  const box = $('#faktorChips'), t = $('#faktorTxt'); if (!box) return;
  FAKTOR.forEach(([a, b], i) => {
    const c = h('button', { type: 'button', class: 'chip', style: { cursor: 'pointer' } }, a);
    c.addEventListener('click', () => { $$('.chip', box).forEach((x) => x.classList.remove('warn')); c.classList.add('warn'); t.innerHTML = `<b>${a}:</b> ${b}`; });
    box.append(c);
  });
}

/* ---------------------------------------------------------------- egyensúlyi elvek */
const ELV = {
  belso: { t: 'Belső megtámasztás', p: 'Dúcolatok vagy támaszfödémek a munkatérben: a két szemközti fal nyomása egymást „oltja ki”.', ex: ['#ducolas|dúcolás', '#csotamasz|acél csőtámasz', '#topdown|támaszfödém (top-down)'] },
  befog: { t: 'Befogás', p: 'A fal a kiemelési sík alá nyúlik, ott a passzív földellenállás támasztja meg. Önmagában (konzolosan) csak kb. 4–6 m mélységig.', ex: ['#szadfal|szádfal', '#colopfal|cölöpfal', '#berlini|berlini dúcolat', '#jetfal|jet-grouting fal'] },
  suly: { t: 'Saját vagy bevont súly', p: 'A szerkezet saját súlya, vagy a környezetéből bevont földtömeg súlya tart – ezek a támfalak. A szegezett talajtömb is „súlytámfal-szerűen” dolgozik.', ex: ['#szegezes|talajszegezés', '#jetfal|acél nélküli jet-blokk'] },
  horgony: { t: 'Hátrahorgonyzás', p: 'A fal húzott elemmel kapaszkodik a megtámasztott földtömeg mögé: talajhorgony vagy passzív horgony. „Tiszta” munkatér, de a szomszéd telek alá nyúlhat.', ex: ['#horgony|talajhorgony', '#passziv|passzív hátrahorgonyzás'] },
};
register('egyensuly', (root) => {
  const { ctrls, viz, out } = shell(root);
  const tg = {};
  for (const [k, e] of Object.entries(ELV)) tg[k] = toggle(ctrls, { label: e.t, value: k === 'befog' });
  const pre = seg(ctrls, { label: 'Előbeállítás', options: [{ v: 'befog', t: 'Konzolos' }, { v: 'bh', t: 'Befogott-horgonyzott' }, { v: 'duc', t: 'Dúcolt' }, { v: 'semmi', t: 'Semmi' }], value: 'befog' });
  const s = figure(viz, 560, 330);
  const vd = verdict(out); out.style.gridTemplateColumns = '1fr';
  const exBox = h('div', { class: 'chips' }); out.append(exBox);
  pre.on((p) => {
    const m = { befog: ['befog'], bh: ['befog', 'horgony'], duc: ['belso', 'befog'], semmi: [] }[p];
    for (const k of Object.keys(tg)) tg[k].set(m.includes(k), false);
    draw();
  });
  Object.values(tg).forEach((t) => t.on(draw));
  function draw() {
    clear(s);
    const on = Object.fromEntries(Object.entries(tg).map(([k, t]) => [k, t.v]));
    const g0 = 70, base = 230, wx = 300; // terep, gödörfenék, fal x
    const any = Object.values(on).some(Boolean);
    svg('rect', { x: 0, y: 0, width: 560, height: g0, class: 'f-sky' }, s);
    // talaj balra (megtámasztott), jobbra a gödör alatt
    const toe = on.befog ? 300 : base + 4;
    svg('rect', { x: 0, y: g0, width: wx, height: 260, class: 'f-soilA' }, s);
    svg('rect', { x: 0, y: g0, width: wx, height: 260, fill: 'url(#pat-sand)' }, s);
    svg('rect', { x: wx, y: base, width: 260, height: 100, class: 'f-soilA' }, s);
    svg('rect', { x: wx, y: base, width: 260, height: 100, fill: 'url(#pat-sand)' }, s);
    svg('line', { x1: 0, y1: g0, x2: wx, y2: g0, class: 's-ink', 'stroke-width': 1.5 }, s);
    svg('line', { x1: wx, y1: base, x2: 560, y2: base, class: 's-ink', 'stroke-width': 1.5 }, s);
    svg('text', { x: 430, y: base - 10, 'text-anchor': 'middle', class: 't-sm', text: 'munkagödör' }, s);
    // fal (dőlt, ha nincs egyensúly)
    const g = svg('g', { transform: any ? '' : `rotate(9 ${wx} ${toe})` }, s);
    if (on.suly) {
      svg('path', { d: pathD([[wx - 46, toe], [wx, toe], [wx, g0 - 4], [wx - 16, g0 - 4]], true), class: 'f-conc' }, g);
      svg('path', { d: pathD([[wx - 46, toe], [wx, toe], [wx, g0 - 4], [wx - 16, g0 - 4]], true), fill: 'url(#pat-conc)' }, g);
    } else {
      svg('rect', { x: wx - 8, y: g0 - 6, width: 8, height: toe - g0 + 6, class: 'f-steel2' }, g);
    }
    // aktív földnyomás (háromszög) balról
    const pmax = 70;
    svg('path', { d: pathD([[wx - 8, g0], [wx - 8 - pmax * ((base - g0) / 160), base], [wx - 8, base]], true), class: 'f-bad', opacity: 0.16 }, s);
    for (let y = g0 + 25; y <= base; y += 30) {
      const L = pmax * ((y - g0) / 160);
      arrow(s, wx - 10 - L, y, wx - 10, y, { cls: 's-bad', w: 2, head: 7 }).style.color = 'var(--bad)';
    }
    svg('text', { x: wx - 100, y: g0 + 22, class: 't-lab t-bad', text: 'földnyomás' }, s);
    if (on.befog) {
      for (let y = base + 18; y <= toe - 6; y += 22) {
        const L = 22 + (y - base) * 0.6;
        arrow(s, wx + L + 4, y, wx + 4, y, { cls: 's-ok', w: 2, head: 7 }).style.color = 'var(--ok)';
      }
      svg('text', { x: wx + 66, y: toe - 2, class: 't-lab t-ok', text: 'passzív ellenállás' }, s);
    }
    if (on.belso) {
      const y = g0 + 40;
      svg('rect', { x: wx, y: y - 6, width: 230, height: 12, rx: 6, class: 'f-acc' }, s);
      svg('rect', { x: 528, y: g0, width: 10, height: base - g0, class: 'f-steel2', opacity: 0.6 }, s);
      svg('text', { x: 415, y: y - 12, 'text-anchor': 'middle', class: 't-lab t-acc', text: 'dúc / csőtámasz → szemközti fal' }, s);
      arrow(s, wx + 60, y + 22, wx + 4, y + 22, { cls: 's-ok', w: 2.5, head: 9 }).style.color = 'var(--ok)';
    }
    if (on.horgony) {
      const y = g0 + 38, a = rad(20), L = 210, Lf = 80;
      const x1 = wx - 8 - Math.cos(a) * L, y1 = y + Math.sin(a) * L;
      const xf = wx - 8 - Math.cos(a) * (L - Lf), yf = y + Math.sin(a) * (L - Lf);
      svg('line', { x1: wx - 8, y1: y, x2: xf, y2: yf, class: 's-ink', 'stroke-width': 2 }, s);
      svg('line', { x1: xf, y1: yf, x2: x1, y2: y1, class: 's-muted', 'stroke-width': 10, 'stroke-linecap': 'round', opacity: 0.6 }, s);
      svg('rect', { x: wx - 4, y: y - 7, width: 12, height: 14, class: 'f-acc' }, s);
      arrow(s, wx + 2, y + 18, wx - 56, y + 18 + 21, { cls: 's-ok', w: 2.5, head: 9 }).style.color = 'var(--ok)';
      svg('text', { x: x1 + 10, y: y1 + 22, class: 't-lab', text: 'befogott szakasz' }, s);
    }
    if (on.suly) {
      arrow(s, wx - 22, g0 + 70, wx - 22, g0 + 150, { cls: 's-ok', w: 3, head: 10 }).style.color = 'var(--ok)';
      svg('text', { x: wx - 30, y: g0 + 168, 'text-anchor': 'end', class: 't-lab t-ok', text: 'súly (G)' }, s);
    }
    // eredmény
    const names = Object.entries(on).filter(([, v]) => v).map(([k]) => ELV[k].t.toLowerCase());
    if (!any) vd.set('bad', 'Nincs egyensúly', 'A földnyomásnak semmi nem tart ellen – a fal kifordul, a gödör beomlik.');
    else if (on.befog && !on.belso && !on.horgony && !on.suly) vd.set('warn', 'Konzolos, befogott fal', 'Csak a passzív ellenállás tart: kis mélységig (kb. 4–6 m) és ha közvetlenül mellette nincs építmény.');
    else vd.set('ok', names.length > 1 ? 'Kombinált megoldás' : ELV[Object.keys(on).find((k) => on[k])].t, names.length > 1 ? `Együtt dolgozik: ${names.join(' + ')}. Sok esetben a kombináció adja a megoldást.` : ELV[Object.keys(on).find((k) => on[k])].p);
    clear(exBox);
    for (const [k, v] of Object.entries(on)) if (v) for (const e of ELV[k].ex) { const [href, t] = e.split('|'); exBox.append(h('a', { class: 'chip', href }, t + ' →')); }
  }
  draw();
});

/* ---------------------------------------------------------------- technológia-térkép */
const TECH = [
  ['rezsu', 0, 'Rézsűs kiemelés', 'Legegyszerűbb, de sok hely kell', '#rezsu', ''],
  ['arok', 1, 'Munkaárok dúcolása', 'Palló, heveder, dúc – szembetámasz', '#pallozas', '01'],
  ['tabla', 1, 'Táblás dúcolat', 'Előregyártott dúcolótáblák', '#tablas', '02'],
  ['szeles', 1, 'Széles gödör dúcolása', 'Kihajlás, ferde dúcok', '#szeles', '03'],
  ['berlini', 2, 'Berlini dúcolat', 'I-tartók + pallók, száraz gödörbe', '#berlini', '04'],
  ['jet', 2, 'Jet-grouting fal', 'Acél jet-oszlopokban, kvázi vízzáró', '#jetfal', '05'],
  ['zagy', 2, 'Erősített zagyfal', 'Önszilárduló zagy + acélgerendák', '#zagyfal', '06'],
  ['dsm', 2, 'Mélykevert fal', 'Helyben kevert talajcement + acél', '#dsmfal', '07'],
  ['szad', 2, 'Acél szádfal', 'Zárakkal kapcsolt, vízzáró, visszahúzható', '#szadfal', '08'],
  ['szadanyag', 2, 'Fa, vb., műanyag szádfal', 'Végleges partfalak, kikötők', '#szadanyag', '09'],
  ['colop', 2, 'Cölöpfal', 'Hézagos, érintkező, összemetsző', '#colopfal', '10'],
  ['resfal', 2, 'Réselt fal (résfal)', 'Merev, vízzáró, gyakran végleges', '#resfal', ''],
  ['szeg', 3, 'Talajszegezés', 'Szegek + háló + lőttbeton, lépcsőnként', '#szegezes', '11'],
  ['horgony', 3, 'Talajhorgony', 'Feszített, injektált – tiszta munkatér', '#horgony', '12'],
  ['cso', 3, 'Acél csőtámasz', 'Szemközti falak összetámasztása', '#csotamasz', '13'],
  ['topdown', 3, 'Támaszfödém (top-down)', 'Milánói módszer: felülről lefelé', '#topdown', '14'],
  ['passziv', 3, 'Passzív hátrahorgonyzás', 'Horgonyfal a szakadólapon kívül', '#passziv', '15'],
  ['fagy', 4, 'Fagyasztott fal', 'Ideiglenes jégfal a talajban', '#fagyasztas', '16'],
  ['gat', 4, 'Gát élővízben', 'Munkatér a folyómederben', '#gat', '17'],
  ['vizalatti', 4, 'Víz alatti alaplemez', 'Lehorgonyzás felúszás ellen', '#vizalatti', '18'],
];
function icon(k) {
  const s = svg('svg', { viewBox: '0 0 120 54', class: 'ti', 'aria-hidden': 'true' });
  const soil = (x, y, w, hh, c = 'f-soilA') => { svg('rect', { x, y, width: w, height: hh, class: c }, s); svg('rect', { x, y, width: w, height: hh, fill: 'url(#pat-sand)' }, s); };
  const G = 12;
  const st = (x, y, w, hh, c = 'f-steel2') => svg('rect', { x, y, width: w, height: hh, class: c }, s);
  switch (k) {
    case 'rezsu': svg('path', { d: 'M0 12 H30 L52 46 H68 L90 12 H120 V54 H0Z', class: 'f-soilA' }, s); svg('path', { d: 'M0 12 H30 L52 46 H68 L90 12 H120 V54 H0Z', fill: 'url(#pat-sand)' }, s); break;
    case 'arok': soil(0, G, 46, 42); soil(74, G, 46, 42); soil(46, 48, 28, 6); st(46, G, 3, 36); st(71, G, 3, 36); st(49, 22, 22, 3, 'f-acc'); st(49, 36, 22, 3, 'f-acc'); break;
    case 'tabla': soil(0, G, 40, 42); soil(80, G, 40, 42); soil(40, 48, 40, 6); st(40, 6, 5, 42, 'f-ok'); st(75, 6, 5, 42, 'f-ok'); st(45, 18, 30, 3, 'f-acc'); st(45, 34, 30, 3, 'f-acc'); break;
    case 'szeles': soil(0, G, 20, 42); soil(100, G, 20, 42); soil(20, 46, 80, 8); st(20, G, 3, 40); st(97, G, 3, 40); svg('line', { x1: 23, y1: 22, x2: 50, y2: 46, class: 's-acc', 'stroke-width': 3 }, s); svg('line', { x1: 97, y1: 22, x2: 70, y2: 46, class: 's-acc', 'stroke-width': 3 }, s); st(50, 44, 20, 3, 'f-conc'); break;
    case 'berlini': soil(0, 0, 120, 54, 'f-soilB'); for (let x = 8; x < 120; x += 26) st(x, 0, 5, 54); for (let y = 4; y < 54; y += 7) for (let x = 13; x < 120; x += 26) st(x, y, 21, 5, 'f-timber'); break;
    case 'jet': soil(0, 0, 120, 54, 'f-soilB'); for (let x = 14; x < 120; x += 23) { svg('circle', { cx: x, cy: 27, r: 14, class: 'f-grout', opacity: 0.9 }, s); st(x - 4, 24, 8, 6); } break;
    case 'zagy': soil(0, 0, 120, 54, 'f-soilB'); st(0, 18, 120, 18, 'f-slurry'); for (let x = 10; x < 120; x += 24) { st(x, 16, 3, 22); st(x - 5, 16, 13, 3); st(x - 5, 35, 13, 3); } break;
    case 'dsm': soil(0, 0, 120, 54, 'f-soilB'); for (let x = 2; x < 120; x += 29) svg('rect', { x, y: 16, width: 30, height: 22, rx: 3, class: 'f-shot' }, s); for (let x = 14; x < 120; x += 29) st(x, 20, 4, 14); break;
    case 'szad': soil(0, 0, 120, 54, 'f-soilB'); svg('path', { d: 'M0 22 L12 22 L18 34 L30 34 L36 22 L48 22 L54 34 L66 34 L72 22 L84 22 L90 34 L102 34 L108 22 L120 22', fill: 'none', class: 's-steel', 'stroke-width': 3.5 }, s); break;
    case 'szadanyag': soil(0, 0, 120, 54, 'f-soilB'); for (let x = 4; x < 60; x += 12) st(x, 18, 10, 18, 'f-timber'); for (let x = 64; x < 120; x += 14) st(x, 18, 12, 18, 'f-conc'); break;
    case 'colop': soil(0, 0, 120, 54, 'f-soilB'); for (let x = 12; x < 120; x += 24) svg('circle', { cx: x, cy: 27, r: 10, class: 'f-conc' }, s); break;
    case 'resfal': soil(0, 0, 120, 54, 'f-soilB'); for (let x = 2; x < 120; x += 30) st(x, 18, 28, 18, 'f-conc'); break;
    case 'szeg': soil(30, G, 90, 42); soil(0, 48, 30, 6); st(30, G, 4, 36, 'f-shot'); for (let y = 18; y < 48; y += 9) svg('line', { x1: 32, y1: y, x2: 100, y2: y + 9, class: 's-steel', 'stroke-width': 2 }, s); break;
    case 'horgony': soil(30, G, 90, 42); soil(0, 48, 30, 6); st(30, 6, 5, 48); svg('line', { x1: 35, y1: 20, x2: 80, y2: 36, class: 's-ink', 'stroke-width': 1.6 }, s); svg('line', { x1: 80, y1: 36, x2: 112, y2: 47, class: 's-muted', 'stroke-width': 6, 'stroke-linecap': 'round' }, s); st(27, 16, 9, 8, 'f-acc'); break;
    case 'cso': soil(0, G, 16, 42); soil(104, G, 16, 42); soil(16, 48, 88, 6); st(16, 6, 5, 48, 'f-conc'); st(99, 6, 5, 48, 'f-conc'); svg('rect', { x: 21, y: 18, width: 78, height: 8, rx: 4, class: 'f-bad' }, s); svg('rect', { x: 21, y: 34, width: 78, height: 8, rx: 4, class: 'f-bad' }, s); break;
    case 'topdown': soil(0, G, 16, 42); soil(104, G, 16, 42); soil(16, 48, 88, 6); st(16, 6, 5, 48, 'f-conc'); st(99, 6, 5, 48, 'f-conc'); st(21, 10, 78, 5, 'f-conc2'); st(21, 30, 78, 5, 'f-conc2'); st(58, 15, 4, 33, 'f-steel2'); break;
    case 'passziv': soil(0, G, 120, 42); st(14, 6, 5, 48); st(100, 8, 4, 30); svg('line', { x1: 19, y1: 20, x2: 100, y2: 20, class: 's-ink', 'stroke-width': 2 }, s); svg('path', { d: 'M19 54 L58 12', class: 's-bad', 'stroke-width': 1.2, 'stroke-dasharray': '3 2', fill: 'none' }, s); break;
    case 'fagy': soil(0, 0, 120, 54, 'f-soilA'); for (let x = 14; x < 120; x += 23) svg('circle', { cx: x, cy: 27, r: 14, class: 'f-ice', opacity: 0.9 }, s); for (let x = 14; x < 120; x += 23) svg('circle', { cx: x, cy: 27, r: 3, class: 'f-steel2' }, s); break;
    case 'gat': svg('rect', { x: 0, y: 14, width: 120, height: 40, class: 'f-water' }, s); svg('rect', { x: 0, y: 14, width: 120, height: 40, fill: 'url(#pat-water)' }, s); st(30, 6, 4, 48); st(86, 6, 4, 48); svg('rect', { x: 34, y: 14, width: 52, height: 40, class: 'f-surface' }, s); soil(34, 44, 52, 10, 'f-soilB'); break;
    case 'vizalatti': svg('rect', { x: 14, y: 8, width: 92, height: 30, class: 'f-water' }, s); st(10, 4, 4, 50); st(106, 4, 4, 50); soil(0, 38, 10, 16); soil(110, 38, 10, 16); st(14, 32, 92, 8, 'f-conc'); for (let x = 26; x < 106; x += 20) svg('line', { x1: x, y1: 40, x2: x, y2: 54, class: 's-ink', 'stroke-width': 1.5 }, s); soil(14, 40, 92, 14); break;
  }
  return s;
}
function initTechmap() {
  const box = $('#techmap'); if (!box) return;
  for (const [k, g, t, sub, href, v] of TECH) {
    box.append(h('a', { class: `tech grp${g}`, href, 'data-g': g }, icon(k), v ? h('span', { class: 'tv' }, '▶ ' + v) : null, h('b', {}, t), h('span', {}, sub)));
  }
  const f = $('#techFilter');
  f?.addEventListener('click', (e) => {
    const b = e.target.closest('button'); if (!b) return;
    $$('button', f).forEach((x) => x.classList.toggle('on', x === b));
    $$('.tech', box).forEach((el) => { el.hidden = !(b.dataset.f === 'all' || el.dataset.g === b.dataset.f); });
  });
}

/* ---------------------------------------------------------------- rézsű kalkulátor */
register('rezsu', (root) => {
  const { ctrls, viz, out } = shell(root, { foot: '<b>Szemléltető</b> geometriai összevetés: a rézsű megengedhető hajlását a valóságban állékonysági vizsgálat adja (szemcsés talajban elméletileg β ≤ φ). A padkát 4 m felett 1,5 m szélesen, a terhelésmentes sávot ~1 m-rel vettük fel.' });
  const sH = slider(ctrls, { label: 'Kiemelési mélység', sym: 'H', min: 1, max: 14, step: 0.5, value: 6, unit: 'm' });
  const tal = seg(ctrls, { label: 'Talaj', options: [{ v: 'sz', t: 'Szemcsés (c = 0)' }, { v: 'k', t: 'Kötött' }], value: 'sz' });
  const sPhi = slider(ctrls, { label: 'Belső súrlódási szög', sym: 'φ', min: 25, max: 40, step: 1, value: 32, unit: '°' });
  const sB = slider(ctrls, { label: 'Rézsűhajlás', sym: 'β', min: 18, max: 70, step: 1, value: 30, unit: '°', hint: 'Hajlás 1 : n, ahol n = 1/tg β' });
  const sD = slider(ctrls, { label: 'Szomszéd épület távolsága', sym: 'd', min: 2, max: 30, step: 0.5, value: 14, unit: 'm', hint: 'a gödör aljának szélétől (a függőleges fal helyétől)' });
  const s = figure(viz, 640, 330);
  const oA = stat(out, { label: 'Rézsű vízszintes kiterjedése', unit: 'm' });
  const oV = stat(out, { label: 'Többlet kiemelés oldalanként', unit: 'm³/fm', d: 1 });
  const oN = stat(out, { label: 'Hajlás', d: 2 });
  const vd = verdict(out); vd.el.style.gridColumn = '1 / -1';
  const draw = () => {
    clear(s);
    const H = sH.v, beta = sB.v, phi = sPhi.v, d = sD.v, sz = tal.v === 'sz';
    sPhi.el.style.display = sz ? '' : 'none';
    const n = 1 / Math.tan(rad(beta));
    const padka = H > 4 ? 1.5 : 0;
    const a = H * n + padka; // vízszintes kiterjedés
    const V = (H * H * n) / 2 + padka * (H / 2);
    // skála: legfeljebb 34 m szélesség
    const span = Math.max(a + 4, d + 8, 16);
    const k = Math.min(530 / span, 190 / H);
    const X0 = 560, Y0 = 110;
    const X = (m) => X0 - m * k, Y = (m) => Y0 + m * k;
    svg('rect', { x: 0, y: 0, width: 640, height: Y0, class: 'f-sky' }, s);
    // gödör a jobb oldalon (x<0 a gödör), a rézsű balra emelkedik
    const pts = [[X(0), Y(H)]];
    if (padka) { pts.push([X((H / 2) * n), Y(H / 2)], [X((H / 2) * n + padka), Y(H / 2)]); }
    pts.push([X(a), Y(0)]);
    const soilPoly = [[0, Y(0)], ...[...pts].reverse(), [640, Y(H)], [640, 330], [0, 330]];
    svg('path', { d: pathD(soilPoly, true), class: sz ? 'f-soilA' : 'f-soilB' }, s);
    svg('path', { d: pathD(soilPoly, true), fill: `url(#${sz ? 'pat-sand' : 'pat-clay'})` }, s);
    // a függőleges fal változata szaggatottal
    svg('line', { x1: X(0), y1: Y(0) - 6, x2: X(0), y2: Y(H) + 14, class: 's-steel', 'stroke-width': 3, 'stroke-dasharray': '6 4' }, s);
    svg('text', { x: X(0) + 6, y: Y(H) - 8, class: 't-sm', text: 'fal helye' }, s);
    svg('text', { x: 600, y: Y(H) + 18, 'text-anchor': 'middle', class: 't-sm', text: 'gödör' }, s);
    // terhelésmentes sáv + deponálás
    const strip = 1;
    svg('rect', { x: X(a + strip), y: Y(0) - 4, width: strip * k, height: 4, class: 'f-ok', opacity: 0.7 }, s);
    // szomszéd épület
    const bw = 9, bh = Math.min(10, (Y0 - 14) / k);
    const bx = X(d + bw), conflict = a + strip > d;
    svg('rect', { x: bx, y: Y(0) - bh * k, width: bw * k, height: bh * k, class: 'f-bld' }, s);
    svg('rect', { x: bx, y: Y(0), width: bw * k, height: 2 * k, class: 'f-bld2' }, s);
    for (let i = 0; i < 2; i++) for (let j = 0; j < 3; j++) svg('rect', { x: bx + (1 + j * 2.8) * k, y: Y(0) - bh * k + (0.15 + i * 0.42) * bh * k, width: 1.4 * k, height: 0.22 * bh * k, class: 'f-sky' }, s);
    svg('text', { x: bx + (bw * k) / 2, y: Y(0) - bh * k - 6, 'text-anchor': 'middle', class: 't-lab', text: 'szomszéd épület' }, s);
    if (conflict) {
      svg('path', { d: pathD([[X(d), Y(0)], [X(Math.min(a + strip, d + bw)), Y(0)], [X(Math.min(a + strip, d + bw)), Y(0) + 12]], false), class: 's-bad', 'stroke-width': 3, fill: 'none' }, s);
      svg('rect', { x: X(Math.min(a + strip, d + bw)), y: Y(0) - 2, width: (Math.min(a + strip, d + bw) - d) * k, height: 2 * k + 4, class: 'f-bad', opacity: 0.35 }, s);
    }
    svg('line', { x1: 0, y1: Y(0), x2: 640, y2: Y(0), class: 's-ink', 'stroke-width': 1.3 }, s);
    // méretek
    dim(s, X(a), Y(0) - 22, X(0), Y(0) - 22, fmt(a, 1) + ' m');
    dim(s, X(-1.2), Y(0), X(-1.2), Y(H), 'H = ' + fmt(H, 1) + ' m', { dx: -6, anchor: 'end' });
    svg('text', { x: X(H * n * 0.45) - 8, y: Y(H * 0.55), 'text-anchor': 'end', class: 't-num halo', text: `β = ${beta}°` }, s);
    oA.set(a, conflict ? 'bad' : null);
    oV.set(V);
    oN.set(0, null, '1 : ' + fmt(n, 2));
    if (conflict) vd.set('bad', 'Nem fér el – megtámasztott fal kell', `A rézsű (és a terhelésmentes sáv) ${fmt(a + strip - d, 1)} m-rel a szomszéd épület alá nyúlna. Itt függőleges, megtámasztott határolás kell.`);
    else if (sz && beta > phi) vd.set('bad', 'Túl meredek', `Kohéziómentes talajban a rézsű nem lehet meredekebb a belső súrlódási szögnél: β = ${beta}° > φ = ${phi}°.`);
    else if (!sz && beta > 60) vd.set('warn', 'Csak rövid ideig, ellenőrzéssel', 'Kötött talajban meredekebb rézsű is megállhat rövid ideig, de kiszáradás, átázás, rétegvíz rontja – állékonysági vizsgálat kell.');
    else vd.set('ok', 'Elfér', `A rézsű ${fmt(a, 1)} m széles sávot foglal el oldalanként${padka ? ', 1,5 m-es padkával' : ''}. Ne feledd: a kiemelt földet a szakadólapon kívül kell deponálni, majd rétegesen visszatömöríteni.`);
  };
  [sH, sPhi, sB, sD].forEach((c) => c.on(draw)); tal.on(draw);
  draw();
});

defineQuiz('alapok', 'Kvíz – alapok', [
  { q: 'Mi a különbség az alapárok és a munkaárok között?', a: ['Az alapárok egy sávalap, a munkaárok egy egész létesítmény (pl. közmű) számára készül', 'A munkaárok mindig mélyebb 6 m-nél', 'Nincs különbség, a kettő szinonima', 'Az alapárok mindig rézsűs, a munkaárok mindig dúcolt'], c: 0, e: 'Alaptest helyén alapárok/alapgödör, egész építmény számára munkaárok/munkagödör. A munkaárok keskeny (jellemzően 1–3 m), vonalas létesítményekhez.' },
  { q: 'Melyik NEM tartozik a munkagödör nagyságát meghatározó tényezők közé?', a: ['Az építmény méretei', 'A közlekedési, szállítási igények', 'A víztelenítési igények', 'A talaj belső súrlódási szöge'], c: 3, e: 'A gödör nagyságát az építmény méretei, a közlekedési-szállítási igények és a víztelenítési igények határozzák meg. A talaj tulajdonságai (pl. a súrlódási szög) a határolás <i>módját</i> befolyásolják.' },
  { q: 'Melyik a négy egyensúlyi elv egyike?', a: ['Hátrahorgonyzás a megtámasztandó földtömeg mögé', 'A talaj felfagyasztása mindig', 'A talajvíz megemelése', 'A gödör lefedése fóliával'], c: 0, e: 'Belső megtámasztás, befogás, saját vagy bevont súly, hátrahorgonyzás – és ezek kombinációi.' },
  { q: 'Kohéziómentes szemcsés talajban mekkora lehet legfeljebb a rézsű hajlásszöge?', a: ['A belső súrlódási szög (β ≤ φ)', '45° + φ/2', 'Bármekkora, ha a rézsű rövid', '90°, ha nincs talajvíz'], c: 0, e: 'Kohéziómentes talajban a rézsűhajlás nem lehet nagyobb a belső súrlódási szögnél. A pontos értéket állékonysági vizsgálat adja.' },
  { q: 'Milyen magasság felett célszerű a rézsűbe padkát építeni?', a: ['3–5 m felett', '0,5 m felett', '20 m felett', 'Soha nem célszerű'], c: 0, e: 'Magasabb, 3–5 m-nél nagyobb rézsűnél padka beépítése célszerű.' },
  { q: 'Mekkora felszíni terhelés vehető figyelembe a rézsű méretezésénél szabvány szerint (minimum)?', a: ['10 kPa', '1 kPa', '100 kPa', '0 kPa, mert tilos deponálni'], c: 0, e: 'Célszerű előírni, hogy a szakadólapon belül ne legyen deponálás, ugyanakkor a méretezésben min. 10 kPa felszíni teher figyelembe vehető.' },
  { q: 'Mi igaz a végleges munkatérhatárolásra?', a: ['Az építmény része lesz (pl. mélygarázs, aluljáró, alagút)', 'Mindig fából készül', 'Az építmény elkészülte után elbontják', 'Csak rézsűs lehet'], c: 0, e: 'Az ideiglenes határolás szerepe a felszín alatti építmény elkészülte után megszűnik; a végleges az építmény része lesz.' },
]);

function init() { initFaktor(); initTechmap(); }
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
