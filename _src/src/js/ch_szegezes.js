// 05 – Talajszegezés: widgetek és kvíz
import { register, shell, slider, seg, toggle, stat, verdict, svg, figure, clear, fmt, clamp, rad, loop, h, EN } from './core.js';
import { defineQuiz } from './ui.js';
import { K, MS, stage, autoRedraw, decor } from './scene.js';

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

  const W = 760, HH = 452;
  const fig = figure(scrollBox(viz), W, HH);
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
    let blockLabel = null;
    const G = geo();
    step = clamp(step, 0, G.total);
    const y0 = 74, xT = 300;
    const sc = Math.min(30, (HH - y0 - 28) / (G.H + 1.6));
    const X = (z) => xT - (z / 10) * sc; // 1:10 hajlású homlok
    const Y = (z) => y0 + z * sc;
    const idx = Math.max(0, step - 1);
    const kLift = step >= G.total ? G.n - 1 : Math.min(G.n - 1, Math.floor(idx / 5));
    const sub = step >= G.total ? 5 : idx % 5; // 0 kiemelés, 1 szeg, 2 víztelenítés, 3 háló, 4 lőttbeton
    const liftDone = (k) => (step === 0 ? 0 : step >= G.total ? 5 : k < kLift ? 5 : k === kLift ? sub + 1 : 0); // kész részlépések
    const e = step === 0 ? 0 : step >= G.total ? G.H : Math.min(G.H, (kLift + 1) * G.hf); // kiemelési szint
    const St = stage(fig, { W, H: HH, GY: y0, layers: [{ k: 'fill', y: y0 }, { k: 'silt', y: y0 + 9 }, { k: 'clay', y: Math.round(Y(G.H * 0.56)) }] });
    const g = St.g, ov = St.ov, top = St.top;
    // a kiemelt munkagödör a 10:1 hajlású homlokkal
    if (e > 0) K.pit(g, St.M, -4, X(0), Y(e), { sr: X(0) - X(e) });
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
      svg('path', { d: 'M' + pts.map((p) => p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join(' L ') + ' Z', class: 'mt-block' }, ov);
      blockLabel = [(X(0) + (ends[ends.length - 1]?.[0] || X(0))) / 2 + 10, Y(G.H * 0.5)];
    }
    svg('line', { x1: xs0, y1: ys0, x2: xs1, y2: y0, class: 's-bad', 'stroke-width': 1.6, 'stroke-dasharray': '7 5' }, ov);
    St.txt(xs1 + 8, y0 + 18, 'csúszólap (45° + φ/2)', { c: 'push', b: true, fs: 10.5 });
    // szegek: betonacél az injektált furatban, fejlemezzel
    const nf = clamp(sc / 15, 1.1, 2);
    let topOver = null;
    G.rows.forEach((z, i) => {
      const k = Math.floor(z / G.hf);
      const done = liftDone(k);
      if (done < 2) return;
      const x1 = X(z), y1 = Y(z);
      K.nailA(K.scl(g, nf, x1, y1), K.axis(x1, y1, sD.v, 1), (G.L * sc) / nf);
      // a szeg és a csúszólap metszése (numerikusan)
      let hit = null;
      for (let u = 0; u <= G.L; u += 0.02) {
        const px = x1 + Math.cos(G.dl) * u * sc, py = y1 + Math.sin(G.dl) * u * sc;
        const zp = (py - y0) / sc; const xsl = xs0 + ((G.H - zp) * sc) / Math.tan(a);
        if (px >= xsl) { hit = u; break; }
      }
      if (i === 0) topOver = hit === null ? -1 : G.L - hit;
      if (hit !== null) svg('circle', { cx: x1 + Math.cos(G.dl) * hit * sc, cy: y1 + Math.sin(G.dl) * hit * sc, r: 3.2, class: 'f-bad' }, ov);
    });
    // dréncsövek (kb. 2 m-es raszter): enyhén kifelé lejtő, perforált cső
    for (let z = 1.2; z < G.H - 0.3; z += 2) {
      const k = Math.floor(z / G.hf);
      if (liftDone(k) < 3) continue;
      const x1 = X(z), y1 = Y(z);
      K.Ln(g, x1 - 7, y1 + 2.5, x1 + 44, y1 - 6, K.SK('dark2', 4.6, 'stroke-linecap:round'));
      K.Ln(g, x1 - 7, y1 + 2.5, x1 + 44, y1 - 6, K.SK('water', 2.6, 'stroke-linecap:round;stroke-dasharray:5 2.4'));
      K.P(g, `M${x1 - 10} ${y1 + 5} q-3.4 5 0 7.4 q3.4 -2.4 0 -7.4Z`, K.F('water'));
    }
    // háló és lőttbeton fogásonként
    for (let k = 0; k < G.n; k++) {
      const z0 = k * G.hf, z1 = Math.min(G.H, (k + 1) * G.hf);
      const done = liftDone(k);
      if (done >= 5) {
        const tp = Math.max(4.5, G.t * sc * 0.9), d = `M${X(z0)} ${Y(z0)} L${X(z1)} ${Y(z1)} L${X(z1) - tp} ${Y(z1)} L${X(z0) - tp} ${Y(z0)}Z`;
        K.P(g, d, K.F('conc1') + `;stroke:${K.v('concedge')};stroke-width:.9;stroke-linejoin:round`);
        K.P(g, d, 'fill:url(#pr-p-conc)');
      }
      if (done >= 4) { K.Ln(g, X(z0) - 1.6, Y(z0) + 1, X(z1) - 1.6, Y(z1) - 1, K.SK('rebar', 1.5)); K.Ln(g, X(z0) - 1.6, Y(z0) + 1, X(z1) - 1.6, Y(z1) - 1, K.SK('rebar', 4, 'stroke-dasharray:1.2 4.2')); }
    }
    // szegfejek a kész felületen
    G.rows.forEach((z) => { if (liftDone(Math.floor(z / G.hf)) >= 2) { const tp = liftDone(Math.floor(z / G.hf)) >= 5 ? Math.max(4.5, G.t * sc * 0.9) : 0; K.R(g, X(z) - tp - 3, Y(z) - 5, 3.4, 10, K.F('steel3')); K.R(g, X(z) - tp - 6, Y(z) - 2.2, 3.2, 4.4, K.F('dark2')); } });
    // aktuális munkafázis jelzése, gépek és emberek a gödörfenéken
    if (step < G.total && step > 0) {
      const z0 = kLift * G.hf, z1 = Math.min(G.H, (kLift + 1) * G.hf), gy = Y(z1), ms = (0.88 * sc) / MS;
      svg('rect', { x: X(z1) - 120, y: Y(z0), width: 116, height: Y(z1) - Y(z0), class: 'mt-curlift' }, ov);
      if (sub === 0) decor(g, { exc: [X(z1) - 26, gy, sc, 44, 'silt', true] });
      else if (sub === 1) {
        // fúrógép: az árboc a szeg irányában áll, a kezelő a gép mellett
        const zr = G.rows.filter((z) => z >= z0 && z < z1), zz = zr.length ? zr[0] : (z0 + z1) / 2;
        const tx = X(zz) - 4, ty = Math.min(Y(zz), gy - 15 * ms);
        K.anchorRig(K.mir(K.scl(g, ms, tx, ty), tx), { GY: ty + (gy - ty) / ms }, tx, ty, sD.v, { head: 0.55, Lm: 96 });
      } else if (sub === 4) {
        // lőttbetonozó: a fúvókát kézben tartja, a tömlő a gép felé fut
        const zm = (z0 + z1) / 2, px = X(z1) - 4.2 * sc;
        K.nozzle(K.scl(g, ms, px, gy), { GY: gy }, px, px + (X(zm) - 6 - px) / ms, gy + (Y(zm) - gy) / ms, { hose: 46 });
        for (let i = 0; i < 12; i++) { const ph = (sprayT * 3 + i / 12) % 1; svg('circle', { cx: px + 26 * ms + ph * (X(zm) - 8 - px - 26 * ms), cy: gy - 21 * ms + (Y(zm) - gy + 21 * ms) * ph + Math.sin(i * 7.1) * 9 * ph, r: 1.7, class: 'f-conc2' }, ov); }
      } else K.man(g, { x: X(z1) - 2.2 * sc, GY: gy, S: sc, face: 1 });
    } else if (e > 0) K.man(g, { x: X(e) - 2.6 * sc, GY: Y(e), S: sc, face: 1 });
    // méretek
    St.dimV(26, y0, Y(G.H), `H = ${fmt(G.H, 1)} m`, step < G.total && e > 0.3 * G.H && e < 0.8 * G.H ? { ly: Y(G.H) - 12 } : {});
    if (e > 0 && step < G.total) St.tag(44, Y(e) + 18, `kiemelés: −${fmt(e, 1)} m`, { fs: 10 });
    if (blockLabel) {
      const [lx, ly] = blockLabel;
      svg('rect', { x: lx - 92, y: ly - 20, width: 184, height: 42, rx: 8, class: 'mt-labelbox' }, top);
      txt(top, lx, ly - 1, 'együttdolgozó földtömeg', 't-big t-grp', 'middle');
      txt(top, lx, ly + 16, '≈ súlytámfal', 't-lab', 'middle');
    }
    // feliratok
    St.tag(X(0) + 12, y0 - 14, 'terep', { fs: 10 });
    St.tag(W - 8, y0 + 20, 'megtámasztott talaj', { fs: 10, anchor: 'end' });
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
  draw(); autoRedraw(fig, draw);
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
  let tt = 0;
  function draw() {
    const k = sType.v;
    const fx = 130, y = 150, L = 520, xe = fx + L;
    const St = stage(fig, { W, H: HH, GY: -3, layers: [{ k: 'clay', y: -3 }], plain: true });
    const g = St.g, { F, SK, R: Rc, P: Pp, C: Cc, Ln, v } = K;
    // munkagödör, lőttbeton kéreg hálóval
    K.pit(g, St.M, -4, fx - 26, HH + 6);
    Rc(g, fx - 26, -4, 26, HH + 8, F('conc1') + `;stroke:${v('concedge')};stroke-width:1`);
    Rc(g, fx - 26, -4, 26, HH + 8, 'fill:url(#pr-p-conc)');
    Ln(g, fx - 12, 0, fx - 12, HH, SK('rebar', 1.5));
    Ln(g, fx - 12, 6, fx - 12, HH, SK('rebar', 4.6, 'stroke-dasharray:1.6 14'));
    // a rúd bordázata / menete
    const ribs = (x0, x1, r, st, c = 'rebar2') => { let d = ''; for (let x = x0; x < x1; x += st) d += `M${x} ${y - r} l${st * 0.45} ${2 * r} `; Pp(g, d, SK(c, 1, 'opacity:.8')); };
    const body = (r, wob, wf) => {
      let d = `M${fx} ${y - r}`;
      for (let x = fx; x <= xe; x += 14) d += ` L${x} ${(y - r - wob * (0.5 + 0.5 * Math.sin(x * wf))).toFixed(1)}`;
      d += ` L${xe + 9} ${y}`;
      for (let x = xe; x >= fx; x -= 14) d += ` L${x} ${(y + r + wob * (0.5 + 0.5 * Math.sin(x * wf * 1.17 + 1))).toFixed(1)}`;
      Pp(g, d + 'Z', F('grout2') + `;stroke:${v('concedge')};stroke-width:1.1;stroke-linejoin:round`);
      Pp(g, d + 'Z', 'fill:url(#pr-p-conc)');
    };
    if (k === 'furt') { body(16, 0, 1); St.txt(fx + 200, y - 26, 'cementhabarccsal kitöltött furat Ø100–150 mm', { fs: 10.5, b: true }); }
    if (k === 'ures') { body(15, 5, 0.3); St.txt(fx + 200, y - 30, 'habarcstest (öblítés + injektálás a rúdon át)', { fs: 10.5, b: true }); }
    if (k === 'jet') {
      body(21, 13, 0.052);
      for (let i = 0; i < 6; i++) { const ph = (tt * 0.8 + i / 6) % 1; Ln(g, xe - 20, y, xe - 20 + Math.cos(i) * 40 * ph, y + Math.sin(i * 2.1) * 30 * ph, SK('water', 2.2, `stroke-linecap:round;opacity:${(1 - ph).toFixed(2)}`)); }
      St.txt(fx + 200, y - 44, 'nagy nyomású habarcssugárral képzett test', { fs: 10.5, b: true });
    }
    if (k === 'vert') {
      // tömörödött talajköpeny a rúd körül
      Rc(g, fx, y - 13, L, 26, F('dark', 0.13), { rx: 13 });
      for (let i = 0; i < 46; i++) { const x = fx + 10 + ((i * 37) % L), yy = y + ((i * 13) % 2 ? 1 : -1) * (6 + (i % 4) * 2); Cc(g, x, yy, 1.3, F('dark', 0.4)); }
      St.txt(fx + 200, y - 24, 'a talaj a rúd mentén tömörödik', { fs: 10.5, b: true });
      // szegvető („puska”) a kotró gémjén: cső, zárófej, légtartály; a visszarúgástól rezeg
      const px = Math.sin(tt * 6) * 2, q = K.g_(g, { transform: `translate(${px.toFixed(1)} 0)` });
      Pp(q, `M30 ${y - 78} L62 ${y - 30} L74 ${y - 30} L46 ${y - 84}Z`, F('exc') + `;stroke:${v('exc3')};stroke-width:1`);
      Rc(q, 6, y - 11, 92, 22, 'fill:url(#pr-cylh)' + `;stroke:${v('dark')};stroke-width:1`, { rx: 3 });
      Rc(q, 2, y - 16, 20, 32, F('dark2') + `;stroke:${v('dark')};stroke-width:.8`, { rx: 3 });
      Rc(q, 44, y - 32, 40, 21, F('exc') + `;stroke:${v('exc3')};stroke-width:1`, { rx: 3 });
      Rc(q, 28, y + 13, 56, 15, F('acc') + `;stroke:${v('dark2')};stroke-width:.8`, { rx: 7.5 });
      Pp(q, `M22 ${y - 16} C14 ${y - 40} 34 ${y - 46} 44 ${y - 26}`, SK('hose', 2.4));
      St.tag(56 + px, y + 44, '„puska”', { fs: 10, anchor: 'middle' });
    }
    // rúd
    if (k === 'ures') {
      Rc(g, fx - 30, y - 7, L + 30, 14, 'fill:url(#pr-cylh)' + `;stroke:${v('steel3')};stroke-width:.9`, { rx: 2 });
      Ln(g, fx - 30, y, xe, y, SK('dark', 2.2, 'opacity:.5'));
      ribs(fx - 28, xe, 7, 7, 'steel3');
      Pp(g, `M${xe} ${y - 13} L${xe + 15} ${y - 8} L${xe + 23} ${y} L${xe + 15} ${y + 8} L${xe} ${y + 13}Z`, F('dark2') + `;stroke:${v('dark')};stroke-width:.9`);
      Pp(g, `M${xe + 5} ${y - 11} v22 M${xe + 12} ${y - 9} v18`, SK('steel1', 1));
      St.txt(xe - 10, y + 40, 'elvesző fúrókorona', { anchor: 'end', fs: 10.5, b: true });
    } else if (k === 'csavart') {
      Rc(g, fx - 30, y - 5, L + 30, 10, 'fill:url(#pr-cylh)' + `;stroke:${v('steel3')};stroke-width:.9`);
      Pp(g, `M${xe} ${y - 5} l12 5 l-12 5Z`, F('steel3'));
      const sk = Math.sin(tt * 5) * 6;
      for (const x of [fx + 200, fx + 330, fx + 460]) {
        const e = K.g_(g, { transform: `translate(${x} ${y}) skewY(${sk.toFixed(1)})` });
        K.E(e, 0, 0, 8, 27, 'fill:url(#pr-cylh)' + `;stroke:${v('steel3')};stroke-width:1`);
        K.E(e, 0, 0, 2.6, 6, F('steel3'));
      }
      St.txt(fx + 330, y + 50, EN ? 'helical plates' : 'csavarlemezek', { anchor: 'middle', fs: 10.5, b: true });
    } else {
      Rc(g, fx - 30, y - 4.5, L + 30, 9, F('rebar') + `;stroke:${v('rebar2')};stroke-width:.8`, { rx: 2 });
      Ln(g, fx - 28, y - 2, xe - 2, y - 2, SK('halo', 1.1, 'opacity:.3'));
      ribs(fx - 28, xe - 2, 4.5, 9);
      if (k === 'furt') {
        // központosítók: műanyag „hordó” bordák a rúd körül
        for (const x of [fx + 140, fx + 300, fx + 460]) { for (const sg of [-1, 1]) Pp(g, `M${x - 16} ${y + sg * 4.5} Q${x} ${y + sg * 22} ${x + 16} ${y + sg * 4.5}`, SK('spacer', 2.6, 'stroke-linecap:round') + ';fill:none'); Rc(g, x - 18, y - 5.6, 5, 11.2, F('spacer')); Rc(g, x + 13, y - 5.6, 5, 11.2, F('spacer')); }
        St.txt(fx + 300, y + 38, 'központosító (távtartó)', { anchor: 'middle', fs: 10.5, b: true });
      }
    }
    // szegfej
    if (sHead.v === 'lapos') {
      Rc(g, fx - 17, y - 20, 6, 40, F('steel2') + `;stroke:${v('dark')};stroke-width:.8`);
      Pp(g, `M${fx - 17} ${y - 5} q-5 5 0 10`, SK('acc', 2.4) + ';fill:none');
      Rc(g, fx - 30, y - 4.5, 14, 9, F('rebar') + `;stroke:${v('rebar2')};stroke-width:.8`);
      St.tag(6, 48, 'laposacél, hegesztve', { fs: 10, to: [fx - 14, y - 19] });
    } else {
      Rc(g, fx - 34, y - 30, 8, 60, F('steel2') + `;stroke:${v('dark')};stroke-width:.9`);
      Pp(g, `M${fx - 34} ${y - 10} h-11 l-5 4 v12 l5 4 h11Z`, F('steel3') + `;stroke:${v('dark')};stroke-width:.9`);
      Pp(g, `M${fx - 45} ${y - 10} v20 M${fx - 39} ${y - 10} v20`, SK('steel1', 0.8));
      Rc(g, fx - 58, y - 4.5, 9, 9, F('rebar') + `;stroke:${v('rebar2')};stroke-width:.8`);
      St.tag(6, 48, 'fejlemez + anya', { fs: 10, to: [fx - 30, y - 29] });
    }
    St.tag(fx - 13, 16, 'lőttbeton + háló', { fs: 10, anchor: 'middle' });
    St.tag(W - 8, HH - 12, 'megtámasztott talaj →', { fs: 10, anchor: 'end' });
    info.innerHTML = `<b>${NAILS[k].t} <span class="chip" style="vertical-align:middle;margin-left:6px">${NAILS[k].tag}</span></b><p class="small" style="margin:6px 0 0">${NAILS[k].d}</p>`;
  }
  sType.on(draw); sHead.on(draw);
  draw(); autoRedraw(fig, draw);
  loop(fig, (t) => { tt = t; if (['vert', 'jet', 'csavart'].includes(sType.v)) draw(); });
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
  const W = 760, HH = 372;
  const fig = figure(scrollBox(viz), W, HH);
  function draw() {
    const nail = sT.v === 'szeg', p = sP.v / 100;
    const fx = 110, y = 112, L = 560, xe = fx + L, yb = 216;
    const St = stage(fig, { W, H: HH, GY: -3, layers: [{ k: nail ? 'silt' : 'clay', y: -3 }], plain: true });
    const g = St.g, { F, SK, R: Rc, P: Pp, Ln, v, pts: kp } = K;
    K.pit(g, St.M, -4, fx - 18, yb + 8);
    const xs = fx + L * (nail ? 0.42 : 0.5);
    Pp(g, `M${fx} ${yb} L${xs - 50} ${yb} L${xs + 50} -3 L${fx} -3Z`, F('push', 0.07));
    Ln(g, xs - 50, yb, xs + 50, -3, SK('push', 1.8, 'stroke-dasharray:7 5'));
    St.txt(xs + 56, 22, 'csúszólap', { c: 'push', b: true, fs: 10.5 });
    const A = K.axis(fx, y, 0, 1);
    if (nail) {
      // lőttbeton kéreg, teljes hosszán injektált betonacél
      Rc(g, fx - 18, -4, 18, yb + 8, F('conc1') + `;stroke:${v('concedge')};stroke-width:1`); Rc(g, fx - 18, -4, 18, yb + 8, 'fill:url(#pr-p-conc)');
      Pp(g, `M${kp(A(0, -9), A(L, -9), A(L + 7, 0), A(L, 9), A(0, 9))}Z`, F('grout2') + `;stroke:${v('concedge')};stroke-width:1`);
      Pp(g, `M${kp(A(0, -9), A(L, -9), A(L + 7, 0), A(L, 9), A(0, 9))}Z`, 'fill:url(#pr-p-conc)');
      Rc(g, fx - 24, y - 3.4, L + 22, 6.8, F('rebar') + `;stroke:${v('rebar2')};stroke-width:.7`, { rx: 1.5 });
      Rc(g, fx - 24, y - 15, 6, 30, F('steel2') + `;stroke:${v('dark')};stroke-width:.8`);
      // a talaj a szeg mentén „tapad”: kis súrlódási nyilak a csúszólap két oldalán ellentétesen
      for (let i = 0; i < 9; i++) { const x = fx + 34 + i * 60, d = x < xs ? -1 : 1; for (const sg of [-1, 1]) arr(g, x - d * 9, y + sg * 16, x + d * 9, y + sg * 16, 'mt-ar-shear', 1.4, 5.5); }
      St.txt(fx + 20, y - 26, 'teljes hosszán injektált, nem feszített', { fs: 10.5, b: true });
    } else {
      const xb = xs + 60, Lf = xb - fx, Lb = xe - xb;
      K.wallS(g, fx - 9, -5, yb + 8, { t: 18 });
      // befogott habarcstest, védőcsöves szabad szakasz, pászmák
      const up = [], dn = [];
      for (let i = 0; i <= 14; i++) { const u = Lf + (i / 14) * Lb, e = i === 0 || i === 14 ? 0.55 : 1; up.push(A(u, -(13 + Math.sin(i * 1.9) * 2.6) * e)); dn.unshift(A(u, (13 + Math.cos(i * 1.4) * 2.6) * e)); }
      Pp(g, `M${kp(...up, ...dn)}Z`, F('grout2') + `;stroke:${v('concedge')};stroke-width:1.1;stroke-linejoin:round`);
      Pp(g, `M${kp(...up, ...dn)}Z`, 'fill:url(#pr-p-conc)');
      Rc(g, fx - 18, y - 5.5, Lf + 18, 11, F('dark2') + `;stroke:${v('dark')};stroke-width:.8`);
      for (const o of [-2, 0, 2]) Ln(g, fx - 44, y + o * 1.6, xe - 8, y + o * (1.6 + 0.9), SK(o ? 'steel3' : 'steel1', 1.5));
      for (let i = 0; i < 5; i++) for (const sg of [-1, 1]) arr(g, xb + 22 + i * 44, y + sg * 22, xb + 6 + i * 44, y + sg * 22, 'mt-ar-shear', 1.4, 5.5);
      // heveder és horgonyfej
      K.waleS(g, fx - 18, y, -1, { w: 10, h: 30 });
      Rc(g, fx - 33, y - 17, 5, 34, F('steel3')); Rc(g, fx - 46, y - 10, 13, 20, 'fill:url(#pr-cylh)' + `;stroke:${v('dark')};stroke-width:.8`);
      St.txt((fx + xb) / 2, y - 22, 'szabad szakasz (védőcsőben)', { anchor: 'middle', fs: 10.5, b: true });
      St.txt((xb + xe) / 2, y - 28, 'befogott (injektált) szakasz', { anchor: 'middle', fs: 10.5, b: true });
    }
    // az erőábra táblája
    Rc(g, -2, yb + 6, W + 4, HH - yb, F('labbg') + `;stroke:${v('labedge')};stroke-width:1`);
    // erőábra
    const by = 336, Ah = 84;
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
    txt(g, fx, by + 18, EN ? 'head' : 'fej', 't-sm');
    box.innerHTML = nail
      ? '<b>Talajszeg:</b> passzív – nem feszítik elő; az erő a kis talajmozgásokkal ébred, a <b>teljes hosszán</b> súrlódással adódik át. Sűrű raszter (0,5–1,5 m), rövidebb (0,6–1,2 H), teherbírása kisebb.'
      : '<b>Talajhorgony:</b> előfeszített (a tervezett erő 80–90%-ára); a szabad szakaszon nincs erőátadás, csak a <b>csúszólapon túli</b> befogott szakaszon. Ritkább, hosszabb (≤ 25–30 m), teherbírása legalább egy nagyságrenddel nagyobb.';
  }
  sT.on(draw); sP.on(draw);
  draw(); autoRedraw(fig, draw);
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
