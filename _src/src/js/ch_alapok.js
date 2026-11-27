// 01 – Alapok: gödörtípusok, szempontok, egyensúlyi elvek, technológia-térkép, rézsű kalkulátor
import { $, $$, h, svg, figure, clear, fmt, rad, register, shell, slider, seg, toggle, stat, verdict, arrow, dim, pathD } from './core.js';
import { defineQuiz } from './ui.js';
import { EN } from './core.js';
import { K, MS, stage, autoRedraw, brick, starters, heap, footing, building } from './scene.js';

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
  const s = figure(viz, 640, 310, 'fig pr-svg');
  const txt = h('div', { class: 'verdict' });
  viz.append(txt);
  const { g_, R, P, Ln, F, SK, v } = K;
  const draw = (k = sg.v) => {
    const T = TIPUS.find((t) => t.v === k), GY = 122, big = k === 'mgodor';
    const S = stage(s, { W: 640, H: 310, GY, layers: big ? [{ k: 'fill', y: GY }, { k: 'sand', y: GY + 24 }, { k: 'clay', y: GY + 118 }] : [{ k: 'fill', y: GY }, { k: 'clay', y: GY + 20 }, { k: 'sand', y: GY + 150 }] });
    const { g, M } = S;
    if (k === 'agodor' || k === 'aarok') {
      // 1 m = 36 px: sekély gödör, benne a kész alaptest; a munkás a léptéket adja
      const px = 36, w = k === 'agodor' ? 118 : 50, x0 = 320 - w / 2, x1 = 320 + w / 2, bot = GY + (k === 'agodor' ? 56 : 48);
      K.pit(g, M, x0, x1, bot);
      R(g, x0 + 4, bot - 3, w - 8, 3, F('conc2'));                                       // szerelőbeton
      if (k === 'agodor') {
        footing(g, 320, bot - 3, 84, 17, 24, 22);
        starters(g, 311, 329, bot - 42, 4, 30);
        S.tag(x0 - 26, bot - 12, EN ? 'pad footing' : 'pontalap', { anchor: 'end', to: [320 - 36, bot - 11] });
        S.tag(366, GY - 54, 'tüskék a pillérhez', { to: [326, bot - 62] });
      } else {
        footing(g, 320, bot - 3, 38, 13, 14, 0);
        brick(g, 313, GY - 44, 14, bot - 16 - (GY - 44));
        S.tag(x0 - 26, bot - 10, 'sávalap', { anchor: 'end', to: [320 - 14, bot - 9] });
        S.tag(366, GY - 54, 'felmenő fal', { to: [327, GY - 30] });
      }
      heap(g, M, 96, 96, 26, 'clay');
      K.man(g, { x: 232, GY, S: px, face: 1, lean: 8, hands: [[250, GY - 30], [262, GY - 22]] });
      Ln(g, 244, GY - 44, 272, GY - 4, SK('timber2', 2.2, 'stroke-linecap:round'));     // ásó nyele
      P(g, `M268 ${GY - 9} l8 9 l-7 2z`, F('steel2'));
      K.man(g, { x: 452, GY, S: px, face: -1 });
      S.dimV(x1 + 14, GY, bot, T.m);
      S.dimH(x0, x1, bot + 22, T.w);
    } else if (k === 'mgodor') {
      // 1 m = 12 px: egész építmény gödre, határoló fallal, a pinceszintek épülnek
      const xl = 168, xr = 500, bot = GY + 112;
      building(g, 14, GY, 9.6, 2, 12, { base: 2.6, door: 1 });
      K.pitP(g, M, [[xl, GY], [xl, bot], [xr, bot], [xr, GY]]);
      K.wallS(g, xl - 6, GY - 2, bot + 52, { t: 12, cap: true });
      K.wallS(g, xr + 6, GY - 2, bot + 52, { t: 12, cap: true });
      K.slab(g, xl, xr, bot - 11, 11);
      for (const x of [xl + 84, xl + 166, xl + 248]) K.concrete(g, x - 4, GY + 44, 8, bot - 11 - (GY + 44), false);
      K.slab(g, xl, xr, GY + 60, 7);
      K.slab(g, xl, xl + 170, GY + 22, 7, { fresh: true });
      for (const x of [xl + 84, xl + 166, xl + 248]) { K.concrete(g, x - 4, GY + 29, 8, 31, false); starters(g, x - 3, x + 3, GY + 22, 2, 10); }
      R(g, xl + 170, GY + 16, 3, 13, F('timber'));                                       // zsaluvég
      K.carSide(g, xl + 30, bot - 11, 'acc2');
      const cg = S.m(12, 590, GY), ci = S.inv(12, 590, GY), [hx, hy] = ci(456, GY - 30);
      K.crane(cg, M, hx, hy, { reach: 550 - hx, tipY: ci(0, 14)[1] });
      K.cage(g, 456, GY - 26, GY + 16, 9);
      K.man(g, { x: xl + 120, GY: GY + 22, S: 12 * 1.15, face: 1 });
      K.man(g, { x: xl + 230, GY: GY + 60, S: 12 * 1.15, face: -1 });
      S.tag(xl - 22, GY + 150, 'határoló fal', { anchor: 'end', to: [xl - 8, bot + 30] });
      S.tag(xl + 196, bot - 34, EN ? 'basement levels' : 'pinceszintek', { anchor: 'middle' });
      S.tag(10, GY + 46, 'szomszéd épület', { fs: 10 });
      S.dimV(xr + 26, GY, bot, T.m);
      S.dimH(xl, xr, bot + 26, T.w);
    } else {
      // 1 m = 30 px: keskeny, dúcolt közműárok
      const px = 30, x0 = 296, x1 = 344, bot = GY + 104;
      K.pit(g, M, x0, x1, bot);
      K.plankS(g, x0, GY - 8, bot, 1); K.plankS(g, x1, GY - 8, bot, -1);
      for (const y of [GY + 20, GY + 62]) { const a = K.waleS(g, x0 + 3.6, y, 1, { w: 7, h: 12 }), b = K.waleS(g, x1 - 3.6, y, -1, { w: 7, h: 12 }); K.propH(g, a, b, y); }
      R(g, x0 + 4, bot - 8, x1 - x0 - 8, 8, F('sand2')); R(g, x0 + 4, bot - 8, x1 - x0 - 8, 8, 'fill:url(#pr-p-sand)');
      K.conduit(g, 320, bot - 20, 13);
      heap(g, M, 84, 110, 30, 'clay');
      K.conduit(g, 430, GY - 13, 13); K.conduit(g, 458, GY - 13, 13);
      R(g, 414, GY - 2, 60, 2.4, F('timber2'));
      K.man(g, { x: 396, GY, S: px, face: -1, lean: 6, hands: [null, [378, GY - 34]] });
      K.man(g, { x: 524, GY, S: px, face: -1 });
      S.tag(x0 - 26, GY + 20, 'dúc', { anchor: 'end', to: [320, GY + 20] });
      S.tag(x0 - 26, GY + 62, EN ? 'wale' : 'heveder', { anchor: 'end', to: [x0 + 7, GY + 62] });
      S.tag(x0 - 26, GY + 92, 'palló', { anchor: 'end', to: [x0 + 2, GY + 92] });
      S.tag(x1 + 30, bot - 4, 'közmű', { to: [330, bot - 16] });
      S.dimV(x1 + 16, GY, bot, T.m);
      S.dimH(x0, x1, bot + 22, T.w);
    }
    txt.innerHTML = `<b>${T.t}</b>${T.d}`;
  };
  sg.on(draw); draw(sg.v); autoRedraw(s, () => draw());
});

/* ---------------------------------------------------------------- szempontok (chipek) */
const FAKTOR = [
  ['Rendelkezésre álló terület', 'Van-e hely rézsűre, deponálásra, horgonyokra? Szűk városi telken csak függőleges, megtámasztott fal jöhet szóba – a horgony pedig gyakran a szomszéd telek alá nyúlna.'],
  ['Talaj', 'Kötött talajban a fal rövid ideig magától is megáll (m₀), szemcsés talajban nem. A szádpalló tömör, kemény talajon is áthatol, de köves rétegben, kőpadban előfúrás kell; puha agyagban a szegezés nem alkalmazható.'],
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
  const s = figure(viz, 640, 372, 'fig pr-svg');
  const vd = verdict(out); out.style.gridTemplateColumns = '1fr';
  const exBox = h('div', { class: 'chips' }); out.append(exBox);
  pre.on((p) => {
    const m = { befog: ['befog'], bh: ['befog', 'horgony'], duc: ['belso', 'befog'], semmi: [] }[p];
    for (const k of Object.keys(tg)) tg[k].set(m.includes(k), false);
    draw();
  });
  Object.values(tg).forEach((t) => t.on(draw));
  const { g_, R, P, Ln, F, SK, v } = K;
  function draw() {
    const on = Object.fromEntries(Object.entries(tg).map(([k, t]) => [k, t.v]));
    const any = Object.values(on).some(Boolean);
    // 1 m = 22 px; a gödör 7 m mély, a szemközti fal a jobb szélen
    const GY = 104, base = GY + 154, wx = 318, ox = 596, px = 22;
    const toe = on.befog ? base + 78 : base + 6;
    const S = stage(s, { W: 640, H: 372, GY, layers: [{ k: 'fill', y: GY, lab: 'feltöltés' }, { k: 'sand', y: GY + 30, lab: EN ? 'sand' : 'homok' }, { k: 'clay', y: base + 46, lab: EN ? 'clay' : 'agyag' }] });
    const { g, M } = S;
    // megtámasztott oldal: utca, parkoló autó
    K.carSide(g, 96, GY, 'acc2');
    K.man(g, { x: 208, GY, S: px, face: 1 });
    K.pitP(g, M, [[wx, GY], [wx, base], [ox, base], [ox, GY]]);
    // szemközti fal
    K.wallS(g, ox + 6, GY - 4, base + 80, { t: 12 });
    // a vizsgált fal (ha semmi nem tartja: kifordul)
    const fall = any ? g : g_(g, { transform: `rotate(8 ${wx} ${toe})` });
    if (on.suly) {
      const d = `M${wx - 58} ${toe} H${wx} V${GY - 6} H${wx - 16}Z`;
      P(fall, d, 'fill:url(#pr-concg)'); P(fall, d, 'fill:url(#pr-p-conc)'); P(fall, d, SK('concedge', 1.1, 'stroke-linejoin:round'));
    } else K.wallS(fall, wx - 6, GY - 6, toe, { t: 12 });
    if (!any) {
      // megcsúszó ék és repedés a terepen
      P(g, `M${wx - 8} ${base} L${wx - 118} ${GY}`, SK('mark', 1.6, 'stroke-dasharray:6 4'));
      P(g, `M${wx - 120} ${GY - 1} l4 9 l-5 6 l4 8`, SK('dark', 1.6, 'stroke-linejoin:round'));
    }
    // gödörfenék: kotró és munkás
    const mg = S.m(px * 0.86, 470, base);
    K.excavator(mg, K.at(M, base), 432, base - 16, { tool: 'dig', reach: 60 });
    K.man(g, { x: 372, GY: base, S: px, face: 1 });
    // aktív földnyomás
    const pm = 62, ya = (y) => ((y - GY) / (base - GY)) * pm;
    S.press([[wx - 12, GY], [wx - 12 - pm, base], [wx - 12, base]], 'push', 0.16);
    for (let y = GY + 30; y <= base; y += 31) S.force(wx - 14 - ya(y), y, wx - 13, y, { c: 'push' });
    S.txt(wx - 78, GY + 24, 'földnyomás', { c: 'push', b: true, anchor: 'end' });
    if (on.befog) {
      const pp = 56;
      S.press([[wx + 2, base], [wx + 2 + pp, toe - 6], [wx + 2, toe - 6]], 'ok', 0.16);
      for (let y = base + 22; y <= toe - 6; y += 24) S.force(wx + 6 + ((y - base) / (toe - 6 - base)) * pp, y, wx + 3, y, { c: 'ok' });
      S.txt(wx + 66, toe - 10, 'passzív ellenállás', { c: 'ok', b: true });
      S.dimV(wx - 26, base, toe, 'befogás', { side: -1 });
    }
    if (on.belso) {
      const y = GY + 44;
      const a = K.waleS(g, wx, y, 1, { w: 8, h: 14 }), b = K.waleS(g, ox, y, -1, { w: 8, h: 14 });
      K.pipeH(g, a, b, y, { r: 6 });
      S.force(a + 70, y + 20, a + 6, y + 20, { c: 'ok', w: 3 });
      S.tag((wx + ox) / 2, y - 18, 'dúc / csőtámasz → szemközti fal', { anchor: 'middle' });
    }
    if (on.horgony) {
      const y = GY + 42, A = K.axis(wx - 12, y, 20, -1);
      K.anchorA(g, A, 0, 130, 86, {});
      K.waleS(g, wx, y, 1, { w: 7, h: 13 });
      K.aheadS(g, K.axis(wx + 7, y, 20, -1));
      const [fx, fy] = A(60, 16), [hx, hy] = A(8, 16);
      S.force(hx, hy, fx, fy, { c: 'ok', w: 3 });
      const [bx, by] = A(176, 0);
      S.tag(bx - 6, by + 30, 'befogott szakasz', { anchor: 'middle', to: [bx, by + 6] });
      const [sx, sy] = A(70, 0);
      S.tag(sx - 30, sy - 26, 'szabad szakasz', { anchor: 'middle', to: [sx, sy - 3] });
    }
    if (on.suly) {
      S.force(wx - 26, GY + 60, wx - 26, GY + 150, { c: 'ok', w: 3.4, s: 10 });
      S.txt(wx - 34, GY + 172, 'súly (G)', { c: 'ok', b: true, anchor: 'end' });
    }
    S.layerLabs(8);
    // eredmény
    const names = Object.entries(on).filter(([, v2]) => v2).map(([k]) => ELV[k].t.toLowerCase());
    if (!any) vd.set('bad', 'Nincs egyensúly', 'A földnyomásnak semmi nem tart ellen – a fal kifordul, a gödör beomlik.');
    else if (on.befog && !on.belso && !on.horgony && !on.suly) vd.set('warn', 'Konzolos, befogott fal', 'Csak a passzív ellenállás tart: kis mélységig (kb. 4–6 m) és ha közvetlenül mellette nincs építmény.');
    else vd.set('ok', names.length > 1 ? 'Kombinált megoldás' : ELV[Object.keys(on).find((k) => on[k])].t, names.length > 1 ? `Együtt dolgozik: ${names.join(' + ')}. Sok esetben a kombináció adja a megoldást.` : ELV[Object.keys(on).find((k) => on[k])].p);
    clear(exBox);
    for (const [k, v2] of Object.entries(on)) if (v2) for (const e of ELV[k].ex) { const [href, t] = e.split('|'); exBox.append(h('a', { class: 'chip', href }, t + ' →')); }
  }
  draw(); autoRedraw(s, draw);
});

/* ---------------------------------------------------------------- technológia-térkép */
const TECH = [
  ['rezsu', 0, 'Rézsűs kiemelés', 'Legegyszerűbb, de sok hely kell', '#rezsu', ''],
  ['arok', 1, 'Munkaárok dúcolása', 'Palló, heveder, dúc – szembetámasz', '#pallozas', '01'],
  ['tabla', 1, 'Táblás dúcolat', 'Előregyártott dúcolótáblák', '#tablas', '02'],
  ['szeles', 1, 'Széles gödör dúcolása', 'Kihajlás, ferde dúcok', '#szeles', '03'],
  ['berlini', 2, 'Berlini dúcolat', 'I/H-tartók + pallók, talajvíz felett', '#berlini', 'BME'],
  ['jet', 2, 'Jet-grouting fal', 'Acél jet-oszlopokban, kvázi vízzáró', '#jetfal', 'BME'],
  ['zagy', 2, 'Erősített zagyfal', 'Önszilárduló zagy + acélgerendák', '#zagyfal', 'BME'],
  ['dsm', 2, 'Mélykevert fal', 'Helyben kevert talajbeton + acél', '#dsmfal', 'BME'],
  ['szad', 2, 'Acél szádfal', 'Zárakkal kapcsolt, vízzáró, visszahúzható', '#szadfal', 'BME'],
  ['szadanyag', 2, 'Fa, vb., műanyag szádfal', 'Végleges partfalak, kikötők', '#szadanyag', '09'],
  ['colop', 2, 'Cölöpfal', 'Hézagos, érintkező, összemetsző', '#colopfal', 'BME'],
  ['resfal', 2, 'Réselt fal (résfal)', 'Merev, vízzáró, gyakran végleges', '#resfal', 'BME'],
  ['horgony', 3, 'Talajhorgony', 'Feszített, injektált – tiszta munkatér', '#horgony', '12'],
  ['passziv', 3, 'Passzív hátrahorgonyzás', 'Horgonyfal a szakadólapon kívül', '#passziv', '15'],
  ['cso', 3, 'Acél csőtámasz', 'Szemközti falak összetámasztása', '#csotamasz', '13'],
  ['topdown', 3, 'Támaszfödém (top-down)', 'Milánói módszer: felülről lefelé', '#topdown', '14'],
  ['szeg', 5, 'Talajszegezés', 'Szegek + háló + lőttbeton, lépcsőnként', '#szegezes', '11'],
  ['fagy', 4, 'Fagyasztott fal', 'Ideiglenes jégfal a talajban', '#fagyasztas', '16'],
  ['gat', 4, 'Gát élővízben', 'Munkatér a folyómederben', '#gat', '17'],
  ['vizalatti', 4, 'Víz alatti alaplemez', 'Lehorgonyzás felúszás ellen', '#vizalatti', '18'],
];
// Bélyegkép a technológia-kártyák tetejére: kis jelenet ugyanabból az elemtárból, mint a folyamatsorok (200 × 84, 1 m ≈ 5 px).
// A falaknál a munkatér felőli homlokzat látszik (így különböznek egymástól), a többinél a keresztmetszet.
function icon(k) {
  const s = svg('svg', { viewBox: '0 0 200 84', class: 'ti', 'aria-hidden': 'true', preserveAspectRatio: 'xMidYMid slice' });
  const { g_, R, P, C, Ln, F, SK, v } = K;
  const front = ['berlini', 'jet', 'zagy', 'dsm', 'szad', 'szadanyag', 'colop', 'resfal', 'fagy'].includes(k);
  const GY = front ? -8 : 26, FL = 66;
  const S = stage(s, { W: 200, H: 84, GY, plain: true, layers: front ? [{ k: k === 'fagy' ? 'sand' : 'clay', y: GY }] : [{ k: 'sand', y: GY }, { k: 'clay', y: 70 }], ...(k === 'gat' ? { GY: 62, hz: 22, layers: [{ k: 'gravel', y: 62 }] } : {}) });
  const { g, M } = S;
  const pit = (x0, x1, bot = FL) => K.pitP(g, M, [[x0, GY], [x0, bot], [x1, bot], [x1, GY]]);
  const exc = (x, y, sc = 0.44) => { const e = K.scl(g, sc, x, y); K.excavator(e, K.at(M, y), x, y - 12, { tool: 'dig', reach: 40 }); };
  const shade = (x, w) => { R(g, x, 0, w * 0.22, 84, F('dark', 0.16)); R(g, x + w * 0.78, 0, w * 0.22, 84, F('dark', 0.1)); R(g, x + w * 0.3, 0, w * 0.16, 84, F('halo', 0.22)); };
  const floor = (y = 70) => { R(g, 0, y, 200, 84 - y, F('sand')); R(g, 0, y, 200, 84 - y, 'fill:url(#pr-p-sand)'); Ln(g, 0, y, 200, y, SK('ground', 1.4)); };
  switch (k) {
    case 'rezsu': K.pitP(g, M, [[30, GY], [78, FL], [150, FL], [182, GY]]); exc(104, FL); break;
    case 'arok': pit(86, 114, 72); K.plankS(g, 86, GY - 5, 72, 1); K.plankS(g, 114, GY - 5, 72, -1);
      for (const y of [37, 54]) { const a = K.waleS(g, 89.6, y, 1, { w: 4.5, h: 8 }), b = K.waleS(g, 110.4, y, -1, { w: 4.5, h: 8 }); K.propH(g, a, b, y); }
      K.conduit(g, 100, 65.5, 6); K.spoil(g, M, 22, 44, 12, 'sand'); break;
    case 'tabla': pit(78, 122, 72); K.tbox(g, 78, 122, GY - 6, 70); K.conduit(g, 100, 65, 6.5); break;
    case 'szeles': pit(34, 166); K.plankS(g, 34, GY - 5, FL + 10, 1, { t: 4 }); K.plankS(g, 166, GY - 5, FL + 10, -1, { t: 4 });
      for (const d of [1, -1]) { const wx = d > 0 ? 38 : 162; K.waleS(g, wx, 38, d, { w: 5, h: 9 }); K.pipeL(g, wx + d * 5, 39, wx + d * 40, FL - 3, 2.6); R(g, wx + d * 40 - 7, FL - 5, 14, 6, 'fill:url(#pr-concg)'); }
      exc(92, FL, 0.4); break;
    case 'berlini': K.boardsF(g, 0, 200, 0, 56, { h: 8, wedge: false }); for (const x of [22, 74, 126, 178]) K.hbeamF(g, x, -4, 90, { w: 9 }); break;
    case 'jet': for (let x = 12; x < 210; x += 25) K.column(g, x, -6, 90, 15, 'jet'); for (let x = 12; x < 210; x += 50) K.hbeamF(g, x, -4, 90, { w: 7, hidden: true }); floor(); break;
    case 'zagy': K.slurry(g, 0, -2, 200, 90); for (let x = 20; x < 200; x += 40) K.hbeamF(g, x, -4, 90, { w: 8, hidden: true }); floor(); break;
    case 'dsm': for (let x = 0; x < 200; x += 40) { K.column(g, x + 20, -6, 90, 20.6, 'mix'); Ln(g, x, 0, x, 84, SK('dark2', 0.7, 'opacity:.5')); } for (let x = 20; x < 200; x += 40) K.hbeamF(g, x, -4, 90, { w: 8, hidden: true }); floor(); break;
    case 'szad': K.sheetF(g, -4, -4, 90, { pw: 13, n: 16 }); floor(72); break;
    case 'szadanyag':
      for (let x = 0; x < 66; x += 11) { R(g, x, 0, 11, 84, F('timber') + `;stroke:${v('timber2')};stroke-width:.7`); R(g, x, 0, 11, 84, 'fill:url(#pr-p-wood)'); }
      for (let x = 66; x < 134; x += 17) { K.concrete(g, x, -2, 17, 90, false); }
      for (let x = 134; x < 200; x += 11) { R(g, x, 0, 11, 84, F('pclean') + `;stroke:${v('steel3')};stroke-width:.6`); R(g, x + 1.5, 0, 2.5, 84, F('halo', 0.35)); }
      floor(72); break;
    case 'colop': for (let x = 0; x < 200; x += 25) { R(g, x, 0, 25, 84, 'fill:url(#pr-concg)'); R(g, x, 0, 25, 84, 'fill:url(#pr-p-conc)'); shade(x, 25); Ln(g, x, 0, x, 84, SK('concedge', 1)); } floor(72); break;
    case 'resfal': K.concrete(g, -2, -2, 204, 90, false); for (const x of [50, 100, 150]) { P(g, `M${x} 0 V84`, SK('concedge', 1.6)); P(g, `M${x + 2.5} 0 V84`, SK('halo', 0.9, 'opacity:.5')); } R(g, 0, 0, 200, 9, F('conc2')); Ln(g, 0, 9, 200, 9, SK('concedge', 1)); floor(72); break;
    case 'fagy': for (let x = 14; x < 210; x += 28) K.ice(g, x, -8, 92, 17); for (let x = 14; x < 210; x += 28) K.freezePipe(g, x, 2, 80); break;
    case 'horgony': case 'passziv': case 'szeg': {
      K.pitP(g, M, [[-4, GY], [-4, FL], [58, FL], [58, GY]]);
      if (k === 'szeg') {
        R(g, 58, GY - 2, 4.5, FL - GY + 2, 'fill:url(#pr-mixg)'); R(g, 58, GY - 2, 4.5, FL - GY + 2, SK('concedge', 0.8) + ';fill:none');
        for (const y of [33, 43, 53, 62]) K.nailA(g, K.axis(60.5, y, 12, 1), 84);
      } else {
        K.wallS(g, 63, GY - 5, 90, { t: 9 });
        if (k === 'horgony') { const y = 37; K.anchorA(g, K.axis(67, y, 22, 1), 0, 62, 50, {}); K.waleS(g, 58.5, y, -1, { w: 4, h: 9 }); K.aheadS(g, K.axis(54.5, y, 22, 1)); }
        else { const y = 36; Ln(g, 58, y, 168, y, SK('rebar', 1.8)); K.concrete(g, 164, GY + 2, 7, 26, false); K.waleS(g, 58.5, y, -1, { w: 4, h: 9 }); P(g, `M67 ${FL} L112 ${GY}`, SK('mark', 1.2, 'stroke-dasharray:4 3')); }
      }
      exc(14, FL, 0.4); break; }
    case 'cso': case 'topdown': {
      pit(40, 160, k === 'cso' ? FL : 60); K.wallS(g, 36, GY - 5, 90, { t: 9 }); K.wallS(g, 164, GY - 5, 90, { t: 9 });
      if (k === 'cso') for (const y of [36, 52]) { const a = K.waleS(g, 40.5, y, 1, { w: 4.5, h: 9 }), b = K.waleS(g, 159.5, y, -1, { w: 4.5, h: 9 }); K.pipeH(g, a, b, y, { r: 3.4 }); }
      else { K.slab(g, 40.5, 159.5, GY - 1, 5.5); K.slab(g, 40.5, 159.5, 44, 5); K.concrete(g, 97.5, GY + 4.5, 5, 80, false); R(g, 118, GY - 1.5, 16, 6.5, F('halo', 0.9)); exc(64, 60, 0.3); }
      break; }
    case 'gat': {
      K.sheetS(g, 58, 12, 84); K.sheetS(g, 142, 12, 84);
      R(g, 60.5, 21, 79, 41.5, 'fill:url(#pr-pitg)'); Ln(g, 60.5, 62, 139.5, 62, SK('ground', 1.3));
      K.pipeH(g, 61, 139, 30, { r: 2.6 }); K.pier(g, 100, 62, 40, 13); break; }
    case 'vizalatti': {
      pit(40, 160, 68); K.wallS(g, 36, GY - 5, 90, { t: 9 }); K.wallS(g, 164, GY - 5, 90, { t: 9 });
      K.water(g, 40.5, 34, 119, 26); K.concrete(g, 40.5, 59, 119, 9, false);
      for (let x = 58; x < 150; x += 21) { Ln(g, x, 66, x, 84, SK('rebar', 1.6)); R(g, x - 2.6, 73, 5.2, 12, F('grout2', 0.85), { rx: 2 }); }
      break; }
  }
  return s;
}
function initTechmap() {
  const box = $('#techmap'); if (!box) return;
  for (const [k, g, t, sub, href, v] of TECH) {
    box.append(h('a', { class: `tech grp${g === 5 ? 3 : g}`, href, 'data-g': g }, icon(k), v ? h('span', { class: v === 'BME' ? 'tv yt' : 'tv' }, '▶ ' + v) : null, h('b', {}, t), h('span', {}, sub)));
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
  const s = figure(viz, 660, 390, 'fig pr-svg');
  const oA = stat(out, { label: 'Rézsű vízszintes kiterjedése', unit: 'm' });
  const oV = stat(out, { label: 'Többlet kiemelés oldalanként', unit: 'm³/fm', d: 1 });
  const oN = stat(out, { label: 'Hajlás', d: 2 });
  const vd = verdict(out); vd.el.style.gridColumn = '1 / -1';
  const { g_, R, P, Ln, F, SK, v } = K;
  const draw = () => {
    const H = sH.v, beta = sB.v, phi = sPhi.v, d = sD.v, sz = tal.v === 'sz';
    sPhi.el.style.display = sz ? '' : 'none';
    const n = 1 / Math.tan(rad(beta));
    const padka = H > 4 ? 1.5 : 0;
    const a = H * n + padka; // vízszintes kiterjedés
    const V = (H * H * n) / 2 + padka * (H / 2);
    // lépték: a rézsű, a szomszéd épület és a gödörfenék egy része férjen ki
    const W = 660, FH = 390, GY = 152, bw = 9, strip = 1;
    const span = Math.max(a + 4, d + bw + 0.6, 14);
    const k = Math.min(462 / span, 205 / H, 23);
    const X0 = 478;
    const X = (m) => X0 - m * k, Y = (m) => GY + m * k;
    const S = stage(s, { W, H: FH, GY, layers: sz ? [{ k: 'fill', y: GY }, { k: 'sand', y: GY + 0.8 * k }, { k: 'gravel', y: GY + Math.max(4, H * 0.75) * k }] : [{ k: 'fill', y: GY }, { k: 'clay', y: GY + 0.8 * k }, { k: 'clay2', y: GY + Math.max(4, H * 0.75) * k }] });
    const { g, M, ov } = S;
    const conflict = a + strip > d;
    // szomszéd épület pincével (a rézsű mögött), 1 m = 14 egység a tömb saját rajzában
    building(g, X(d + bw), GY, bw, 2, k, { base: 2.2, door: 1 });
    // a gödör: rézsű (padkával), a gödörfenék a jobb szélig
    const pts = [[X(a), GY]];
    if (padka) pts.push([X((H / 2) * n + padka), Y(H / 2)], [X((H / 2) * n), Y(H / 2)]);
    pts.push([X(0), Y(H)], [W + 4, Y(H)], [W + 4, GY]);
    K.pitP(g, M, pts);
    if (conflict) {
      const xe = X(Math.min(a + strip, d + bw));
      R(ov, xe, GY - 3, X(d) - xe, 2.2 * k + 6, F('mark', 0.3) + `;stroke:${v('mark')};stroke-width:1.2;stroke-dasharray:5 3`);
    }
    // terhelésmentes sáv a rézsűkorona mögött, mögötte depónia és munkás
    R(g, X(a + strip), GY - 3.5, strip * k, 3.5, F('ok', 0.9));
    const free = d - a - strip;
    if (!conflict && free > 7) heap(g, M, X(a + strip + 4.6), 3.4 * k, 1.1 * k, sz ? 'sand' : 'clay');
    if (!conflict && free > 2.4) K.man(g, { x: X(a + strip + 1.3), GY, S: k, face: 1 });
    // gödörfenék: kotró a rézsűlábnál (léptékben), ha kifér
    const mk = Math.min(1.25, k / MS), tipX = X0 + 26 * mk;
    if (tipX + (44 + 62) * mk < W - 4) { const mg = K.scl(g, mk, tipX, Y(H)); K.excavator(mg, K.at(M, Y(H)), tipX, Y(H) - 12, { tool: 'dig', reach: 44 }); }
    // a függőleges fal változata szaggatottal + a mélység
    Ln(ov, X(0), GY - 10, X(0), Y(H) + 14, SK('steel3', 2.4, 'stroke-dasharray:7 4'));
    P(ov, `M${X(0) - 5} ${GY} h10 M${X(0) - 5} ${Y(H)} h10`, SK('labline', 1.2));
    S.txt(X(0) - 8, GY + 16 * S.fk, 'H = ' + fmt(H, 1) + ' m', { anchor: 'end', b: true });
    S.tag(X(0) + 12, Y(H) + 24, 'itt állna a függőleges fal', { fs: 10, to: [X(0), Y(H) + 10] });
    // méretek, feliratok
    S.dimH(X(a), X(0), GY - 30, fmt(a, 1) + ' m');
    S.txt(X(H * n * (padka ? 0.25 : 0.5)) - 12, Y(H * (padka ? 0.75 : 0.5)) + 20 * S.fk, `β = ${beta}°`, { anchor: 'end', b: true, fs: 12.5 });
    if (!conflict && free > 6) S.tag(X(a + strip) + 4, GY - 54, 'terhelésmentes sáv', { anchor: 'end', fs: 10, to: [X(a + strip / 2), GY - 5] });
    S.tag(X(d + bw / 2), GY + 2.2 * k + 16, 'szomszéd épület', { anchor: 'middle', fs: 10 });
    oA.set(a, conflict ? 'bad' : null);
    oV.set(V);
    oN.set(0, null, '1 : ' + fmt(n, 2));
    if (conflict) vd.set('bad', 'Nem fér el – megtámasztott fal kell', `A rézsű (és a terhelésmentes sáv) ${fmt(a + strip - d, 1)} m-rel a szomszéd épület alá nyúlna. Itt függőleges, megtámasztott határolás kell.`);
    else if (sz && beta > phi) vd.set('bad', 'Túl meredek', `Kohéziómentes talajban a rézsű nem lehet meredekebb a belső súrlódási szögnél: β = ${beta}° > φ = ${phi}°.`);
    else if (!sz && beta > 60) vd.set('warn', 'Csak rövid ideig, ellenőrzéssel', 'Kötött talajban meredekebb rézsű is megállhat rövid ideig, de kiszáradás, átázás, rétegvíz rontja – állékonysági vizsgálat kell.');
    else vd.set('ok', 'Elfér', `A rézsű ${fmt(a, 1)} m széles sávot foglal el oldalanként${padka ? ', 1,5 m-es padkával' : ''}. Ne feledd: a kiemelt földet a szakadólapon kívül kell deponálni, majd rétegesen visszatömöríteni.`);
  };
  [sH, sPhi, sB, sD].forEach((c) => c.on(draw)); tal.on(draw);
  draw(); autoRedraw(s, draw);
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
