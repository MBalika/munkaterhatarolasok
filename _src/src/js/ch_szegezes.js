// 05 – Talajszegezés: widgetek és kvíz
import { register, shell, slider, seg, toggle, stat, verdict, svg, figure, clear, fmt, clamp, rad, loop, h } from './core.js';
import { defineQuiz } from './ui.js';

/* ---------------------------------------------------------------- közös rajzsegédek */
function arr(parent, x1, y1, x2, y2, cls = 'mt-ar-ink', w = 2, hd = 8) {
  const g = svg('g', { class: cls }, parent);
  const a = Math.atan2(y2 - y1, x2 - x1);
  svg('line', { x1, y1, x2: x2 - Math.cos(a) * hd * 0.8, y2: y2 - Math.sin(a) * hd * 0.8, 'stroke-width': w, 'stroke-linecap': 'round' }, g);
  svg('path', { d: `M${x2} ${y2} L${x2 - Math.cos(a - 0.45) * hd} ${y2 - Math.sin(a - 0.45) * hd} L${x2 - Math.cos(a + 0.45) * hd} ${y2 - Math.sin(a + 0.45) * hd} Z`, class: 'mt-ah' }, g);
  return g;
}
const txt = (p, x, y, t, cls = 't-lab', anchor = 'start', extra = {}) => svg('text', { x, y, class: cls, 'text-anchor': anchor, text: t, ...extra }, p);
const scrollBox = (p) => { const d = h('div', { class: 'mt-scroll' }); p.append(d); return d; }; // mobilon vízszintesen görgethető ábra

/* ================================================================ 1. Szegezett fal fogásról fogásra */
register('szegfal', (root) => {
  const { ctrls, viz, out } = shell(root, { foot: '<b>Szemléltető modell.</b> A csúszólap φ = 30°-os talajra, a faltőből 45° + φ/2 hajlással rajzolt Rankine-sík; a valódi méretezés (külső–belső állékonyság, szegkihúzódás, lőttbeton-áttörés) ennél összetettebb. A fal 1:10 hajlású.' });
  const sH = slider(ctrls, { label: 'Gödörmélység', sym: 'H', min: 3, max: 14, step: 0.5, value: 8, unit: 'm' });
  const sL = slider(ctrls, { label: 'Szeghossz / mélység', sym: 'L/H', min: 0.6, max: 1.2, step: 0.05, value: 0.8, d: 2, hint: 'L = 0,6–1,2 H, a talaj függvényében.' });
  const sS = slider(ctrls, { label: 'Szegraszter', sym: 's', min: 0.5, max: 1.5, step: 0.1, value: 1.0, unit: 'm', hint: 'Jellemzően 0,5–1,0 (1,5) m, négyzetes kiosztás.' });
  const sF = slider(ctrls, { label: 'Fogásmagasság', sym: 'h', min: 0.9, max: 1.8, step: 0.1, value: 1.5, unit: 'm', hint: 'A kohéziótól függően 90–180 cm.' });
  const sD = slider(ctrls, { label: 'Szegdőlés lefelé', sym: 'δ', min: 10, max: 20, step: 1, value: 15, unit: '°' });
  const sT = slider(ctrls, { label: 'Lőttbeton vastagsága', sym: 't', min: 8, max: 20, step: 1, value: 12, unit: 'cm' });

  const W = 760, HH = 440;
  const fig = figure(scrollBox(viz), W, HH);
  const g = svg('g', {}, fig);
  const stepRow = h('div', { class: 'play-row' });
  const bPrev = h('button', { type: 'button', class: 'btn btn-line btn-sm' }, '◀ Vissza');
  const bNext = h('button', { type: 'button', class: 'btn btn-line btn-sm' }, 'Következő lépés ▶');
  const bPlay = h('button', { type: 'button', class: 'btn btn-line btn-sm' }, '▶ Lejátszás');
  const bEnd = h('button', { type: 'button', class: 'btn btn-line btn-sm' }, 'Kész fal ⏭');
  const bReset = h('button', { type: 'button', class: 'btn btn-line btn-sm' }, '⟲ Elölről');
  stepRow.append(bPrev, bNext, bPlay, bEnd, bReset);
  const stepTxt = h('div', { class: 'steptext' });
  const prog = h('div', { class: 'mt-prog' }, h('i'));
  viz.prepend(stepTxt);
  viz.prepend(prog);
  viz.prepend(stepRow);

  const stN = stat(out, { label: 'Fogások száma' });
  const stR = stat(out, { label: 'Szegsorok' });
  const stPm = stat(out, { label: 'Szeg / fm fal', d: 1 });
  const stLt = stat(out, { label: 'Szeghossz összesen', unit: 'm/fm', d: 1 });
  const stSc = stat(out, { label: 'Lőttbeton', unit: 'm³/fm', d: 2 });
  const stOv = stat(out, { label: 'Felső sor túlnyúlása a csúszólapon', unit: 'm', d: 1 });
  const vd = verdict(out);
  vd.el.style.gridColumn = '1 / -1';

  let step = 0, playing = false, timer = 0, sprayT = 0;
  const geo = () => {
    const H = sH.v, L = sL.v * H, s = sS.v, hf = sF.v, dl = rad(sD.v), t = sT.v / 100;
    const n = Math.ceil(H / hf - 1e-6);
    const rows = [];
    for (let z = Math.min(0.6, s * 0.6); z < H - 0.25; z += s) rows.push(+z.toFixed(3));
    return { H, L, s, hf, dl, t, n, rows, total: n * 5 + 1 };
  };
  const STEPS = ['Kiemelés', 'Szegek', 'Víztelenítés', 'Háló', 'Lőttbeton'];

  function draw() {
    clear(g);
    let blockLabel = null;
    const G = geo();
    step = clamp(step, 0, G.total);
    const sc = Math.min(30, (HH - 90) / (G.H + 1.6));
    const y0 = 62, xT = 300;
    const X = (z) => xT - (z / 10) * sc; // 1:10 hajlású homlok
    const Y = (z) => y0 + z * sc;
    const idx = Math.max(0, step - 1);
    const kLift = step >= G.total ? G.n - 1 : Math.min(G.n - 1, Math.floor(idx / 5));
    const sub = step >= G.total ? 5 : idx % 5; // 0 kiemelés, 1 szeg, 2 víztelenítés, 3 háló, 4 lőttbeton
    const liftDone = (k) => (step === 0 ? 0 : step >= G.total ? 5 : k < kLift ? 5 : k === kLift ? sub + 1 : 0); // kész részlépések
    const e = step === 0 ? 0 : step >= G.total ? G.H : Math.min(G.H, (kLift + 1) * G.hf); // kiemelési szint
    // ég
    svg('rect', { x: 0, y: 0, width: W, height: y0, class: 'f-sky' }, g);
    // talaj (megtartott oldal + a gödör alatti talaj)
    const zb = G.H + 1.6;
    const soil = `M ${X(0)} ${y0} L ${W} ${y0} L ${W} ${Y(zb)} L 0 ${Y(zb)} L 0 ${Y(e)} L ${X(e)} ${Y(e)} Z`;
    if (e > 0) svg('path', { d: `M 0 ${y0} L ${X(0)} ${y0} L ${X(e)} ${Y(e)} L 0 ${Y(e)} Z`, class: 'mt-air' }, g);
    svg('path', { d: soil, class: 'f-soilA' }, g);
    svg('path', { d: soil, fill: 'url(#pat-sand)', opacity: 0.8 }, g);
    // rétegzés díszítés
    svg('path', { d: `M ${X(G.H * 0.45)} ${Y(G.H * 0.45)} L ${W} ${Y(G.H * 0.45) - 8}`, class: 's-soil', 'stroke-width': 1, 'stroke-dasharray': '2 5', fill: 'none', opacity: 0.6 }, g);
    // kiemelt rész alatti vonal (a gödör feneke)
    if (e > 0) svg('line', { x1: 0, y1: Y(e), x2: X(e), y2: Y(e), class: 's-soil', 'stroke-width': 2 }, g);
    // csúszólap (Rankine, φ = 30° → 60°)
    const a = rad(60);
    const xs0 = X(G.H), ys0 = Y(G.H);
    const xs1 = xs0 + (G.H * sc) / Math.tan(a);
    // megerősített tömb (kész fal)
    if (step >= G.total) {
      const pts = [[X(0), y0]];
      const ends = G.rows.map((z) => [X(z) + Math.cos(G.dl) * G.L * sc, Y(z) + Math.sin(G.dl) * G.L * sc]);
      if (ends.length) pts.push([ends[0][0], y0]);
      ends.forEach((p) => pts.push(p));
      if (ends.length) pts.push([ends[ends.length - 1][0], Y(G.H)]);
      pts.push([X(G.H), Y(G.H)]);
      svg('path', { d: 'M' + pts.map((p) => p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join(' L ') + ' Z', class: 'mt-block' }, g);
      blockLabel = [(X(0) + (ends[ends.length - 1]?.[0] || X(0))) / 2 + 10, Y(G.H * 0.5)];
    }
    svg('line', { x1: xs0, y1: ys0, x2: xs1, y2: y0, class: 's-bad', 'stroke-width': 1.6, 'stroke-dasharray': '7 5' }, g);
    txt(g, xs1 + 6, y0 + 16, 'csúszólap (45° + φ/2)', 't-sm t-bad halo');
    // szegek
    let topOver = null;
    G.rows.forEach((z, i) => {
      const k = Math.floor(z / G.hf);
      const done = liftDone(k);
      if (done < 2) return;
      const x1 = X(z), y1 = Y(z);
      const x2 = x1 + Math.cos(G.dl) * G.L * sc, y2 = y1 + Math.sin(G.dl) * G.L * sc;
      svg('line', { x1, y1, x2, y2, class: 'mt-grout', 'stroke-width': 6, 'stroke-linecap': 'round' }, g);
      svg('line', { x1, y1, x2, y2, class: 'mt-nail', 'stroke-width': 2 }, g);
      // a szeg és a csúszólap metszése (numerikusan)
      let hit = null;
      for (let u = 0; u <= G.L; u += 0.02) {
        const px = x1 + Math.cos(G.dl) * u * sc, py = y1 + Math.sin(G.dl) * u * sc;
        const zp = (py - y0) / sc; const xsl = xs0 + ((G.H - zp) * sc) / Math.tan(a);
        if (px >= xsl) { hit = u; break; }
      }
      if (i === 0) topOver = hit === null ? -1 : G.L - hit;
      if (hit !== null) svg('circle', { cx: x1 + Math.cos(G.dl) * hit * sc, cy: y1 + Math.sin(G.dl) * hit * sc, r: 3, class: 'f-bad' }, g);
      // szegfej
      svg('rect', { x: x1 - 3, y: y1 - 4, width: 6, height: 8, class: 'f-steel2' }, g);
    });
    // dréncsövek (kb. 2 m-es raszter)
    for (let z = 1.2; z < G.H - 0.3; z += 2) {
      const k = Math.floor(z / G.hf);
      if (liftDone(k) < 3) continue;
      const x1 = X(z), y1 = Y(z);
      svg('line', { x1: x1 - 6, y1: y1 + 2, x2: x1 + 40, y2: y1 - 6, class: 's-water', 'stroke-width': 3, 'stroke-linecap': 'round' }, g);
      svg('circle', { cx: x1 - 9, cy: y1 + 8, r: 2, class: 'mt-drop' }, g);
    }
    // háló és lőttbeton fogásonként
    for (let k = 0; k < G.n; k++) {
      const z0 = k * G.hf, z1 = Math.min(G.H, (k + 1) * G.hf);
      const done = liftDone(k);
      if (done >= 4) svg('line', { x1: X(z0) - 1, y1: Y(z0), x2: X(z1) - 1, y2: Y(z1), class: 'mt-mesh', 'stroke-width': 2.5 }, g);
      if (done >= 5) {
        const tp = Math.max(4, G.t * sc * 0.9);
        svg('path', { d: `M ${X(z0)} ${Y(z0)} L ${X(z1)} ${Y(z1)} L ${X(z1) - tp} ${Y(z1)} L ${X(z0) - tp} ${Y(z0)} Z`, class: 'f-shot' }, g);
        svg('path', { d: `M ${X(z0)} ${Y(z0)} L ${X(z1)} ${Y(z1)} L ${X(z1) - tp} ${Y(z1)} L ${X(z0) - tp} ${Y(z0)} Z`, fill: 'url(#pat-conc)' }, g);
      }
    }
    // aktuális munkafázis jelzése
    if (step < G.total && step > 0) {
      const z0 = kLift * G.hf, z1 = Math.min(G.H, (kLift + 1) * G.hf);
      svg('rect', { x: X(z1) - 120, y: Y(z0), width: 116, height: Y(z1) - Y(z0), class: 'mt-curlift' }, g);
      // gép
      const gy = Y(z1);
      if (sub === 0 || sub === 1) {
        const gx = Math.max(40, X(z1) - 150);
        const gg = svg('g', { transform: `translate(${gx} ${gy})` }, g);
        svg('rect', { x: -24, y: -14, width: 48, height: 9, rx: 3, class: 'f-acc' }, gg);
        svg('rect', { x: -6, y: -27, width: 22, height: 14, rx: 2, class: 'f-acc' }, gg);
        svg('rect', { x: -26, y: -6, width: 52, height: 6, rx: 3, class: 'f-ink' }, gg);
        if (sub === 0) svg('path', { d: 'M 14 -22 L 52 -40 L 70 -14', class: 'mt-boom', 'stroke-width': 5, fill: 'none' }, gg);
        else {
          // fúróárboc a szeg irányában
          const zr = G.rows.filter((z) => z >= z0 && z < z1);
          const zz = zr.length ? zr[zr.length - 1] : (z0 + z1) / 2;
          const tx = X(zz) - gx, ty = Y(zz) - gy;
          const L2 = 70;
          svg('line', { x1: tx - Math.cos(G.dl) * L2, y1: ty - Math.sin(G.dl) * L2, x2: tx, y2: ty, class: 'mt-mast', 'stroke-width': 6 }, gg);
          svg('line', { x1: 10, y1: -20, x2: tx - Math.cos(G.dl) * L2 * 0.6, y2: ty - Math.sin(G.dl) * L2 * 0.6, class: 'mt-boom', 'stroke-width': 4 }, gg);
        }
      }
      if (sub === 4) {
        // lőttbeton-szórás
        const zm = (z0 + z1) / 2, nx = X(zm) - 70, ny = Y(zm);
        svg('line', { x1: nx - 40, y1: ny + 30, x2: nx, y2: ny, class: 's-ink', 'stroke-width': 4 }, g);
        for (let i = 0; i < 14; i++) {
          const ph = (sprayT * 3 + i / 14) % 1;
          svg('circle', { cx: nx + ph * 62, cy: ny + Math.sin(i * 7.1) * 14 * ph, r: 1.8, class: 'f-conc2' }, g);
        }
      }
    }
    // méretek
    const dx = 26;
    svg('line', { x1: dx, y1: y0, x2: dx, y2: Y(G.H), class: 's-muted', 'stroke-width': 1 }, g);
    for (const yy of [y0, Y(G.H)]) svg('line', { x1: dx - 5, y1: yy, x2: dx + 5, y2: yy, class: 's-muted', 'stroke-width': 1 }, g);
    txt(g, dx + 6, (y0 + Y(G.H)) / 2, `H = ${fmt(G.H, 1)} m`, 't-num halo');
    if (e > 0 && step < G.total) txt(g, 40, Y(e) - 6, `kiemelés: −${fmt(e, 1)} m`, 't-sm halo');
    if (blockLabel) {
      const [lx, ly] = blockLabel;
      svg('rect', { x: lx - 92, y: ly - 20, width: 184, height: 42, rx: 8, class: 'mt-labelbox' }, g);
      txt(g, lx, ly - 1, 'együttdolgozó földtömeg', 't-big t-grp', 'middle');
      txt(g, lx, ly + 16, '≈ súlytámfal', 't-lab', 'middle');
    }
    // feliratok
    txt(g, X(0) + 10, y0 - 10, 'terep', 't-sm');
    txt(g, W - 10, y0 + 18, 'megtámasztott talaj', 't-sm halo', 'end');
    // szöveg
    const lift = kLift + 1;
    if (step === 0) stepTxt.innerHTML = '<b class="mt-st">Kiinduló állapot</b>Az első fogás kiemelésével kezdünk: a talajnak rövid ideig magától meg kell állnia függőleges falban.';
    else if (step >= G.total) stepTxt.innerHTML = `<b class="mt-st">Kész a szegezett fal – ${G.n} fogás</b>A szegek „összevarrják” a talajt: a megerősített tömb súlytámfalként dolgozik. A szegeknek túl kell nyúlniuk a csúszólapon (piros pontok).`;
    else {
      const T = [
        `<b class="mt-st">${lift}. fogás – kiemelés</b>Egy ${fmt(G.hf, 1)} m-es függőleges szakaszt emelnek ki (90–180 cm a talaj kohéziójától függően). Ennyi ideig a földfalnak meg kell állnia.`,
        `<b class="mt-st">${lift}. fogás – szegek</b>A raszterben (${fmt(G.s, 1)} × ${fmt(G.s, 1)} m) fúrják és injektálják – vagy verik, „puskával” lövik – a ${fmt(G.L, 1)} m-es szegeket, ${fmt(sD.v, 0)}°-kal lefelé.`,
        `<b class="mt-st">${lift}. fogás – víztelenítés</b>Rétegvíz esetén a lőttbeton mögé felületszivárgó kerül, vagy 1–3 m-es raszterben dréncsövek vezetik át a vizet a falon – ne alakuljon ki víznyomás.`,
        `<b class="mt-st">${lift}. fogás – háló</b>Ø6–8 mm-es, 150 × 150 mm-es betonacél hálót rögzítenek a szegekre (pl. laposacél darabbal hegesztik).`,
        `<b class="mt-st">${lift}. fogás – lőttbeton</b>${fmt(sT.v, 0)} cm lőttbeton kerül a felületre (jellemzően 8–15 (20) cm). Csak szilárdulás után (≥ 72 óra) jöhet a következő fogás.`,
      ];
      stepTxt.innerHTML = T[sub];
    }
    prog.firstChild.style.width = (step / G.total) * 100 + '%';
    bPrev.disabled = step === 0; bNext.disabled = step >= G.total;
    // kijelzők
    const perM = G.rows.length / G.s;
    stN.set(G.n, null, String(G.n));
    stR.set(G.rows.length, null, String(G.rows.length));
    stPm.set(perM);
    stLt.set(perM * G.L);
    stSc.set((G.H * Math.sqrt(1 + 0.01)) * G.t);
    stOv.set(topOver, topOver < 0 ? 'bad' : topOver < 1 ? 'warn' : 'ok', topOver < 0 ? 'nem éri el' : null);
    const warns = [];
    if (G.s > 1.0) warns.push('1,0 m-nél ritkább (legfeljebb 1,5 m-es) raszter csak kedvező talajban.');
    if (topOver < 1) warns.push('A felső szegsor alig nyúlik túl a csúszólapon – hosszabb szeg kell (L/H ↑).');
    if (G.hf > 1.5) warns.push('Nagy fogásmagasság: csak jól álló, kötött talajban.');
    vd.set(warns.length ? 'warn' : 'ok', warns.length ? 'Figyelem' : 'Rendben, a jellemző tartományokon belül', warns.length ? '<ul class="mt-ul">' + warns.map((w) => `<li>${w}</li>`).join('') + '</ul>' : `${G.n} fogás, ${G.rows.length} szegsor, ${fmt(perM, 1)} szeg / folyóméter.`);
  }
  const go = (d) => { step += d; draw(); };
  bPrev.onclick = () => { stop(); go(-1); };
  bNext.onclick = () => { stop(); go(1); };
  bEnd.onclick = () => { stop(); step = 1e9; draw(); };
  bReset.onclick = () => { stop(); step = 0; draw(); };
  function stop() { playing = false; bPlay.textContent = '▶ Lejátszás'; clearInterval(timer); }
  bPlay.onclick = () => {
    if (playing) return stop();
    if (step >= geo().total) step = 0;
    playing = true; bPlay.textContent = '❚❚ Szünet';
    timer = setInterval(() => { if (step >= geo().total) return stop(); go(1); }, 950);
  };
  [sH, sL, sS, sF, sD, sT].forEach((s) => s.on(draw));
  step = 1e9; // kész fallal indul – a lejátszás elölről kezdi
  draw();
  loop(fig, (t) => { sprayT = t; if (step > 0 && step < geo().total && (step - 1) % 5 === 4) draw(); });
});

/* ================================================================ 2. Szegtípusok */
const NAILS = {
  vert: { t: 'Vert / lőtt szeg', d: 'Betonacélt, acélcsövet vagy acél szeget ütve, vibrálva – vagy sűrített levegős „puskával” – juttatnak a talajba: nincs fúrás, nincs kitermelt föld. Ha lehet, leggyakrabban így készül. A ballisztikus szegvető egy kb. 6 m-es, 38–40 mm-es rudat ~350–400 km/h-val lő a rézsűbe.', tag: 'gyors · fúrás nélkül' },
  furt: { t: 'Fúrt-injektált szeg', d: 'Előre fúrt (jellemzően Ø100–150 mm-es) furatba központosítókkal (távtartókkal) helyezik a Ø20–28 mm-es betonacélt, majd alulról felfelé cementhabarccsal töltik ki. Kemény, köves agyagban, puhább kőzetben ez a megoldás.', tag: 'a „standard”' },
  ures: { t: 'Önfúró üreges rúd', d: 'A fúrt-injektált szeg változata: menetes, üreges acélrúd elvesző fúrókoronával. Fúrás közben a rúdon át öblítenek, a végén ugyanazon át injektálnak – egy menetben, béléscső nélkül, omlékony talajban is.', tag: 'fúr + injektál egyszerre' },
  jet: { t: 'Jetelt szeg', d: 'A szeget nagy nyomású habarcssugárral juttatják be: a sugár a talajt fellazítja, és körülötte kialakítja a habarcstestet.', tag: 'nagy nyomású sugár' },
  csavart: { t: 'Csavart szeg', d: 'Csavarlemezes (helikális) vagy csavarmenetes acélszár, amelyet forgatva hajtanak be – injektálás nélkül. A gyakorlatban ritkább.', tag: 'forgatva behajtva' },
};
register('szegtipus', (root) => {
  const { ctrls, viz } = shell(root, { out: false });
  const sType = seg(ctrls, { label: 'Szegtípus', vert: true, options: Object.entries(NAILS).map(([v, o]) => ({ v, t: o.t })) });
  const sHead = seg(ctrls, { label: 'Szegfej kialakítása', vert: true, options: [{ v: 'lapos', t: 'Laposacél + háló (hazai)' }, { v: 'lemez', t: 'Fejlemez + anya' }] });
  const info = h('div', { class: 'verdict' });
  const W = 760, HH = 300;
  const fig = figure(scrollBox(viz), W, HH);
  viz.append(info);
  const g = svg('g', {}, fig);
  let tt = 0;
  function draw() {
    clear(g);
    const k = sType.v;
    const fx = 130, y = 150, L = 520, xe = fx + L;
    // levegő + talaj
    svg('rect', { x: 0, y: 20, width: fx, height: HH - 40, class: 'mt-air' }, g);
    svg('rect', { x: fx, y: 20, width: W - fx, height: HH - 40, class: 'f-soilB' }, g);
    svg('rect', { x: fx, y: 20, width: W - fx, height: HH - 40, fill: 'url(#pat-soil)' }, g);
    // lőttbeton és háló
    svg('rect', { x: fx - 26, y: 20, width: 26, height: HH - 40, class: 'f-shot' }, g);
    svg('rect', { x: fx - 26, y: 20, width: 26, height: HH - 40, fill: 'url(#pat-conc)' }, g);
    svg('line', { x1: fx - 13, y1: 20, x2: fx - 13, y2: HH - 20, class: 'mt-mesh', 'stroke-width': 2, 'stroke-dasharray': '3 6' }, g);
    txt(g, fx - 13, 14, 'lőttbeton + háló', 't-sm', 'middle');
    if (k === 'furt' || k === 'ures') {
      // furat / habarcstest
      const wob = k === 'ures' ? 4 : 0;
      let d = `M ${fx} ${y - 16}`;
      for (let x = fx; x <= xe; x += 20) d += ` L ${x} ${y - 16 - Math.sin(x * 0.3) * wob}`;
      d += ` L ${xe + 8} ${y}`;
      for (let x = xe; x >= fx; x -= 20) d += ` L ${x} ${y + 16 + Math.sin(x * 0.27) * wob}`;
      svg('path', { d: d + ' Z', class: 'f-grout' }, g);
      svg('path', { d: d + ' Z', fill: 'url(#pat-conc)' }, g);
      txt(g, fx + 200, y - 24, k === 'ures' ? 'habarcstest (öblítés + injektálás a rúdon át)' : 'cementhabarccsal kitöltött furat Ø100–150 mm', 't-sm halo');
    }
    if (k === 'jet') {
      let d = `M ${fx} ${y - 22}`;
      for (let x = fx; x <= xe; x += 16) d += ` L ${x} ${y - 20 - Math.abs(Math.sin(x * 0.11)) * 12}`;
      d += ` L ${xe + 14} ${y}`;
      for (let x = xe; x >= fx; x -= 16) d += ` L ${x} ${y + 20 + Math.abs(Math.sin(x * 0.13)) * 12}`;
      svg('path', { d: d + ' Z', class: 'f-grout' }, g);
      for (let i = 0; i < 6; i++) { const ph = (tt * 0.8 + i / 6) % 1; svg('line', { x1: xe - 20, y1: y, x2: xe - 20 + Math.cos(i) * 40 * ph, y2: y + Math.sin(i * 2.1) * 30 * ph, class: 's-water', 'stroke-width': 2, opacity: 1 - ph }, g); }
      txt(g, fx + 200, y - 40, 'nagy nyomású habarcssugárral képzett test', 't-sm halo');
    }
    if (k === 'vert') {
      for (let i = 0; i < 40; i++) { const x = fx + 10 + (i * 37) % L, yy = y + ((i * 13) % 2 ? 1 : -1) * (6 + (i % 4) * 2); svg('circle', { cx: x, cy: yy, r: 1.4, class: 'f-ink', opacity: 0.35 }, g); }
      txt(g, fx + 200, y - 22, 'a talaj a rúd mentén tömörödik', 't-sm halo');
      // puska
      const px = 18 + Math.sin(tt * 6) * 2;
      svg('rect', { x: px, y: y + 24, width: 70, height: 20, rx: 4, class: 'f-acc' }, g);
      svg('text', { x: px + 35, y: y + 38, 'text-anchor': 'middle', class: 't-sm', text: '„puska”' }, g);
      for (let i = 0; i < 3; i++) svg('line', { x1: fx + 30 + i * 18, y1: y - 30, x2: fx + 50 + i * 18, y2: y - 30, class: 's-muted', 'stroke-width': 2 }, g);
    }
    // rúd
    if (k === 'ures') {
      svg('rect', { x: fx - 20, y: y - 7, width: L + 20, height: 14, rx: 3, class: 'f-steel' }, g);
      for (let x = fx; x < xe; x += 9) svg('line', { x1: x, y1: y - 7, x2: x + 5, y2: y + 7, class: 's-steel', 'stroke-width': 1.5 }, g);
      svg('path', { d: `M ${xe} ${y - 12} L ${xe + 16} ${y - 6} L ${xe + 22} ${y} L ${xe + 16} ${y + 6} L ${xe} ${y + 12} Z`, class: 'f-ink' }, g);
      txt(g, xe - 10, y + 34, 'elvesző fúrókorona', 't-sm halo', 'end');
    } else if (k === 'csavart') {
      svg('rect', { x: fx - 20, y: y - 4, width: L + 20, height: 8, class: 'f-steel' }, g);
      for (const x of [fx + 200, fx + 330, fx + 460]) {
        const r = 26 + Math.sin(tt * 4) * 0;
        svg('ellipse', { cx: x, cy: y, rx: 7, ry: r, class: 'f-steel2', transform: `skewY(${Math.sin(tt * 5) * 6})`, 'transform-origin': `${x} ${y}` }, g);
      }
      txt(g, fx + 330, y + 46, 'csavarlemezek', 't-sm halo', 'middle');
    } else {
      svg('rect', { x: fx - 20, y: y - 4, width: L + 20, height: 8, rx: 2, class: 'f-steel' }, g);
      for (let x = fx; x < xe; x += 10) svg('line', { x1: x, y1: y - 4, x2: x + 3, y2: y + 4, class: 's-steel', 'stroke-width': 1 }, g);
      if (k === 'furt') for (const x of [fx + 140, fx + 300, fx + 460]) { svg('path', { d: `M ${x} ${y - 15} L ${x} ${y + 15} M ${x - 6} ${y - 12} L ${x + 6} ${y + 12} M ${x + 6} ${y - 12} L ${x - 6} ${y + 12}`, class: 's-ink', 'stroke-width': 1.5 }, g); }
      if (k === 'furt') txt(g, fx + 300, y + 34, 'központosító (távtartó)', 't-sm halo', 'middle');
    }
    // szegfej
    if (sHead.v === 'lapos') {
      svg('rect', { x: fx - 30, y: y - 18, width: 7, height: 36, class: 'f-steel2' }, g);
      svg('line', { x1: fx - 30, y1: y - 18, x2: fx - 23, y2: y + 18, class: 's-acc', 'stroke-width': 2 }, g);
      txt(g, 8, y - 30, 'laposacél, hegesztve', 't-sm halo');
    } else {
      svg('rect', { x: fx - 36, y: y - 30, width: 10, height: 60, class: 'f-steel2' }, g);
      svg('path', { d: `M ${fx - 36} ${y - 9} L ${fx - 52} ${y - 9} L ${fx - 56} ${y} L ${fx - 52} ${y + 9} L ${fx - 36} ${y + 9} Z`, class: 'f-ink' }, g);
      txt(g, 8, y - 40, 'fejlemez + anya', 't-sm halo');
    }
    txt(g, xe, HH - 28, 'megtámasztott talaj →', 't-sm halo', 'end');
    info.innerHTML = `<b>${NAILS[k].t} <span class="chip" style="vertical-align:middle;margin-left:6px">${NAILS[k].tag}</span></b><p class="small" style="margin:6px 0 0">${NAILS[k].d}</p>`;
  }
  sType.on(draw); sHead.on(draw);
  draw();
  loop(fig, (t) => { tt = t; if (['vert', 'jet'].includes(sType.v)) draw(); });
});

/* ================================================================ 3. Hol alkalmazható? – kártyajáték */
const SOILS = [
  { n: 'Kötött talaj', s: 'merev–kemény agyag, iszap', ok: true, e: 'Rövid ideig függőleges falban is megáll – ideális a szegezéshez.' },
  { n: 'Szemcsés talaj', s: 'nedves homok, látszólagos kohézióval', ok: true, e: 'Alkalmazható, ha a fogás néhány napig megáll (a talajnak 1–2,5 m-ig meg kell állnia).' },
  { n: 'Mállott kőzet, lejtőtörmelék', s: '', ok: true, e: 'Alkalmazható.' },
  { n: 'Heterogén, rétegzett talaj', s: '', ok: true, e: 'Alkalmazható – a szegezés jól igazítható a változó talajhoz.' },
  { n: 'Kemény, köves agyag, puha kőzet', s: '', ok: true, e: 'Alkalmazható – de itt fúrt-injektált szegek kellenek.' },
  { n: 'Puha, plasztikus agyag', s: '', ok: false, e: 'Nem alkalmazható: nem áll meg a fogás, és a szegek mentén kúszik.' },
  { n: 'Szerves talaj, tőzeg', s: '', ok: false, e: 'Nem alkalmazható.' },
  { n: 'Laza és/vagy telített szemcsés talaj', s: '', ok: false, e: 'Nem alkalmazható: a kiemelt fogás azonnal leomlik, kifolyik.' },
  { n: 'Feltöltés', s: 'kőtörmelék, salak, pernye', ok: false, e: 'Nem alkalmazható: a törmelékes feltöltés nem áll meg, a fúrás is akadályozott.' },
  { n: 'Görgeteges talaj', s: 'nagy kövek, görgetegek', ok: false, e: 'Nem alkalmazható: a fúrás, verés akadályba ütközik.' },
  { n: 'Magas, áramló talajvíz', s: '', ok: false, e: 'Csak folyamatos víztelenítés mellett – a vízáramlás kimossa a falat.' },
];
register('szegtalaj', (root) => {
  const { viz, out } = shell(root, { layout: 'wide' });
  const grid = h('div', { class: 'mt-cards' });
  viz.append(grid);
  const sc = stat(out, { label: 'Eltalált', d: 0 });
  const left = stat(out, { label: 'Hátravan', d: 0 });
  const reset = h('button', { type: 'button', class: 'btn btn-line btn-sm' }, '⟲ Újra');
  out.append(h('div', { class: 'stat' }, h('div', { class: 'stat-l' }, 'Játék'), reset));
  let ans;
  const build = () => {
    clear(grid); ans = SOILS.map(() => null);
    SOILS.forEach((so, i) => {
      const res = h('div', { class: 'mt-card-res', hidden: true });
      const bY = h('button', { type: 'button', 'aria-label': so.n + ': alkalmazható' }, '✓ Igen'), bN = h('button', { type: 'button', 'aria-label': so.n + ': nem alkalmazható' }, '✗ Nem');
      const card = h('div', { class: 'mt-card' }, h('b', {}, so.n), so.s ? h('span', { class: 'small muted' }, so.s) : null, h('div', { class: 'mt-card-btns' }, bY, bN), res);
      const pick = (v) => {
        if (ans[i] !== null) return;
        ans[i] = v === so.ok;
        card.classList.add(so.ok ? 'is-ok' : 'is-no', ans[i] ? 'hit' : 'miss');
        bY.disabled = bN.disabled = true;
        res.hidden = false; res.innerHTML = `<b>${so.ok ? 'Alkalmazható.' : 'Nem alkalmazható.'}</b> ${so.e}`;
        upd();
      };
      bY.onclick = () => pick(true); bN.onclick = () => pick(false);
      grid.append(card);
    });
    upd();
  };
  const upd = () => { sc.set(0, null, `${ans.filter((a) => a === true).length} / ${SOILS.length}`); left.set(0, null, String(ans.filter((a) => a === null).length)); };
  reset.onclick = build;
  build();
});

/* ================================================================ 4. Szeg vagy horgony – erőeloszlás */
register('szeghorgony', (root) => {
  const { ctrls, viz } = shell(root, { out: false, foot: 'Szemléltető erőeloszlás (jellegábra, nem méretarányos): a szegben a húzóerő a csúszólap közelében a legnagyobb, a horgonyban a szabad szakaszon állandó.' });
  const sT = seg(ctrls, { label: 'Elem', options: [{ v: 'szeg', t: 'Talajszeg' }, { v: 'horgony', t: 'Talajhorgony' }] });
  const sP = slider(ctrls, { label: 'Kiemelés / terhelés', min: 0, max: 100, step: 1, value: 70, unit: '%' });
  const box = h('div', { class: 'small' });
  ctrls.append(box);
  const W = 760, HH = 360;
  const fig = figure(scrollBox(viz), W, HH);
  const g = svg('g', {}, fig);
  function draw() {
    clear(g);
    const nail = sT.v === 'szeg', p = sP.v / 100;
    const fx = 110, y = 110, L = 560, xe = fx + L;
    svg('rect', { x: fx, y: 20, width: W - fx, height: 190, class: nail ? 'f-soilA' : 'f-soilB' }, g);
    svg('rect', { x: fx, y: 20, width: W - fx, height: 190, fill: 'url(#pat-soil)' }, g);
    svg('rect', { x: fx - 16, y: 20, width: 16, height: 190, class: nail ? 'f-shot' : 'f-conc' }, g);
    const xs = fx + L * (nail ? 0.42 : 0.5);
    svg('line', { x1: xs - 50, y1: 210, x2: xs + 50, y2: 20, class: 's-bad', 'stroke-width': 1.6, 'stroke-dasharray': '7 5' }, g);
    txt(g, xs + 54, 32, 'csúszólap', 't-sm t-bad halo');
    if (nail) {
      svg('line', { x1: fx, y1: y, x2: xe, y2: y, class: 'mt-grout', 'stroke-width': 12, 'stroke-linecap': 'round' }, g);
      svg('line', { x1: fx - 10, y1: y, x2: xe, y2: y, class: 'mt-nail', 'stroke-width': 3 }, g);
      txt(g, fx + 20, y - 18, 'teljes hosszán injektált, nem feszített', 't-sm halo');
    } else {
      const xb = xs + 60;
      svg('line', { x1: fx, y1: y, x2: xb, y2: y, class: 'mt-sheath', 'stroke-width': 10 }, g);
      svg('line', { x1: xb, y1: y, x2: xe, y2: y, class: 'mt-grout', 'stroke-width': 22, 'stroke-linecap': 'round' }, g);
      svg('line', { x1: fx - 10, y1: y, x2: xe, y2: y, class: 'mt-nail', 'stroke-width': 3 }, g);
      svg('rect', { x: fx - 26, y: y - 14, width: 10, height: 28, class: 'f-acc' }, g);
      txt(g, (fx + xb) / 2, y - 18, 'szabad szakasz (védőcsőben)', 't-sm halo', 'middle');
      txt(g, (xb + xe) / 2, y - 22, 'befogott (injektált) szakasz', 't-sm halo', 'middle');
    }
    // erőábra
    const by = 320, Ah = 80;
    svg('line', { x1: fx, y1: by, x2: xe, y2: by, class: 's-muted', 'stroke-width': 1 }, g);
    txt(g, fx - 8, by - Ah - 4, 'T(x)', 't-num', 'end');
    const pts = [];
    for (let i = 0; i <= 100; i++) {
      const u = i / 100, x = fx + u * L;
      let T;
      if (nail) {
        const us = (xs - fx) / L;
        T = u < us ? 0.55 + 0.45 * Math.sin((u / us) * Math.PI / 2) : Math.max(0, 1 - Math.pow((u - us) / (1 - us), 1.1));
      } else {
        const ub = (xs + 60 - fx) / L;
        T = u < ub ? 1 : Math.exp(-4.2 * (u - ub) / (1 - ub)) * (1 - (u - ub) / (1 - ub) * 0.15);
      }
      pts.push([x, by - T * p * Ah]);
    }
    svg('path', { d: `M ${fx} ${by} L ` + pts.map((q) => q[0].toFixed(1) + ' ' + q[1].toFixed(1)).join(' L ') + ` L ${xe} ${by} Z`, class: 'mt-force' }, g);
    svg('path', { d: 'M ' + pts.map((q) => q[0].toFixed(1) + ' ' + q[1].toFixed(1)).join(' L '), class: 'mt-force-l', fill: 'none', 'stroke-width': 2.5 }, g);
    svg('line', { x1: xs, y1: by + 6, x2: xs, y2: by - Ah - 10, class: 's-bad', 'stroke-width': 1, 'stroke-dasharray': '3 4' }, g);
    txt(g, xs, by + 18, nail ? 'Tmax a csúszólap közelében' : 'erőátadás csak a befogott szakaszon', 't-sm halo', 'middle');
    txt(g, fx, by + 18, 'fej', 't-sm');
    box.innerHTML = nail
      ? '<b>Talajszeg:</b> passzív – nem feszítik elő; az erő a kis talajmozgásokkal ébred, a <b>teljes hosszán</b> súrlódással adódik át. Sűrű raszter (0,5–1,5 m), rövidebb (0,6–1,2 H), teherbírása kisebb.'
      : '<b>Talajhorgony:</b> előfeszített (a tervezett erő 80–90%-ára); a szabad szakaszon nincs erőátadás, csak a <b>csúszólapon túli</b> befogott szakaszon. Ritkább, hosszabb (≤ 25–30 m), teherbírása legalább egy nagyságrenddel nagyobb.';
  }
  sT.on(draw); sP.on(draw);
  draw();
});

/* ================================================================ kvíz */
defineQuiz('szegezes', 'Kvíz – talajszegezés', [
  { q: 'Milyen magas függőleges szakaszokban (fogásokban) mélyítik a gödröt szegezésnél?', a: ['90–180 cm-es szakaszokban', '3–5 m-es szakaszokban', '20–40 cm-es szakaszokban', 'egyben, a teljes mélységig'], c: 0, e: 'A talaj állékonyságától (kohéziójától) függően 90–180 cm-es függőleges szakaszokban.' },
  { q: 'Mekkora a szegek szükséges hossza egy H mélységű munkagödörnél?', a: ['0,6–1,2 H', '0,1–0,3 H', '2–3 H', 'mindig pontosan 6 m'], c: 0, e: 'A talaj függvényében 0,6–1,2 H.' },
  { q: 'Mi a lényegi különbség a talajszeg és a talajhorgony között?', a: ['A szeg nem feszített és teljes hosszán adja át az erőt; a horgony előfeszített, és csak a befogott szakaszán', 'A szeg mindig hosszabb, mint a horgony', 'A horgonyt nem injektálják', 'Nincs különbség, csak a név más'], c: 0, e: 'A horgony nem a teljes hosszán veszi fel az erőt, jóval nagyobb (átmérőjű és hosszú), és teherbírása legalább egy nagyságrenddel nagyobb.' },
  { q: 'Melyik talajban NEM alkalmazható a talajszegezés?', a: ['Puha, plasztikus agyagban', 'Kemény, kötött agyagban', 'Mállott kőzetben', 'Rétegzett, heterogén talajban'], c: 0, e: 'Puha, plasztikus agyagban, szerves talajban, törmelékes feltöltésben és görgeteges talajban nem alkalmazható.' },
  { q: 'Mekkora lőttbeton-vastagság jellemző a szegezett falon?', a: ['8–15 (20) cm', '1–2 cm', '40–60 cm', '1 m'], c: 0, e: 'A felületet 8–15 (20) cm vastag lőttbetonnal borítják, Ø6–8 mm-es, 150 × 150 mm-es hálóval.' },
  { q: 'Mi a talajszegezés egyik fő hátránya városi környezetben?', a: ['A sűrűn kiosztott szegek a szomszédos közművekbe ütközhetnek', 'Nagy, nehéz gépek kellenek hozzá', 'Csak talajvíz alatt működik', 'Nem lehet vele 3 m-nél mélyebb gödröt határolni'], c: 0, e: 'Hátránya, hogy magas és áramló talajvíz esetén nem alkalmazható, és városban a szegmező (sokszor közterület alá nyúlva) közművekbe ütközhet.' },
]);
