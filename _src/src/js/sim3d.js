// 3D gödörtervező – városi telek kivágott talajtömbbel, választható fal + megtámasztás,
// építési fázisokkal és szabályalapú ellenőrző listával. Szemléltető modell.
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { register, h, $, $$, fmt, clamp, lerp, slider, seg, toggle, select, stat, cssVar, onTheme, shell } from './core.js';

/* ------------------------------------------------------------------ alapadatok */
const LP = 14;   // a gödör hossza a metszetsík mögött (a gödör közepén vágunk)
const ZB = 30;   // talajtömb a metszet mögött
const YB = 26;   // talajtömb alja (m)
const D2R = Math.PI / 180;
const ALPHA = 20 * D2R; // horgony hajlása

const PROFILES = {
  A: { name: 'A · Budai kemény agyag', layers: [{ to: 1.5, k: 'fill', n: 'feltöltés' }, { to: YB, k: 'hardclay', n: 'kemény agyag (kiscelli)' }], imper: 1.5, gw: 16, phi: 24, soft: false, gran: false },
  B: { name: 'B · Pesti homokos kavics + talajvíz', layers: [{ to: 2.5, k: 'fill', n: 'feltöltés' }, { to: 12, k: 'gravel', n: 'homokos kavics' }, { to: YB, k: 'clay', n: 'vízzáró agyag' }], imper: 12, gw: 5, phi: 35, soft: false, gran: true },
  C: { name: 'C · Puha, telített talaj', layers: [{ to: 1.5, k: 'fill', n: 'feltöltés' }, { to: 8, k: 'soft', n: 'puha agyag, iszap' }, { to: 14, k: 'sand', n: 'homok' }, { to: YB, k: 'hardclay', n: 'kemény agyag' }], imper: 14, gw: 2, phi: 20, soft: true, gran: false },
};
const WALLS = {
  szad: { t: 'Acél szádfal', wt: true, max: 22, tw: 0.45, link: '#szadfal' },
  berlini: { t: 'Berlini dúcolat', wt: false, max: 20, tw: 0.35, link: '#berlini' },
  hezagos: { t: 'Hézagos cölöpfal', wt: false, max: 25, tw: 0.8, link: '#colopfal' },
  metszo: { t: 'Összemetsző cölöpfal', wt: true, max: 25, tw: 0.9, link: '#colopfal' },
  res: { t: 'Résfal', wt: true, max: 40, tw: 0.8, link: '#resfal' },
  jet: { t: 'Jet-grouting fal', wt: true, max: 20, tw: 1.1, link: '#jetfal' },
  zagy: { t: 'Erősített zagyfal', wt: true, max: 14, tw: 0.6, link: '#zagyfal' },
  szeg: { t: 'Talajszegezés', wt: false, max: 0, tw: 0.15, link: '#szegezes' },
};
const SUPS = { konzolos: 'Konzolos', horgony: 'Horgony', cso: 'Csőtámasz', topdown: 'Top-down' };

const LCOL = { fill: 0x8c8477, gravel: 0xc9ae80, clay: 0x8a6b4e, hardclay: 0x7b7a72, soft: 0x948f7d, sand: 0xd6c293 };
const COL = {
  top: 0xa9a59c, street: 0x45484d, walk: 0xbdb8ae, conc: 0xb7b3aa, conc2: 0x98938a, cap: 0xcac6bc, steel: 0x58646e, sheet: 0x5f5249,
  timber: 0xb88b55, jet: 0xbfb197, slurry: 0x837e73, shot: 0xa8a49b, joint: 0x58554f, waler: 0x3f6f99, strand: 0xdcd6c8, grout: 0xcfc6b0,
  head: 0xf0a33a, strut: 0xc4563d, slab: 0xc8c4b9, column: 0x6c7a86, nail: 0x9aa4ab, well: 0x2f6f9f, water: 0x3d8fd1,
  bld: 0xd8d0c2, bld2: 0x5b5f66, base: 0x4a4e55, pipeW: 0x2f86c9, pipeG: 0xe1b337, pipeS: 0x8a6646, exc: 0xf0a33a,
};

/* ------------------------------------------------------------------ szabályok */
function levelDepths(H, n) {
  if (n <= 0) return [];
  if (n === 1) return [clamp(0.3 * H, 1.2, 3.5)];
  const top = clamp(0.2 * H, 1.2, 3), bot = H - clamp(0.28 * H, 1.6, 4);
  const arr = [];
  for (let i = 0; i < n; i++) arr.push(top + ((bot - top) * i) / (n - 1));
  const out = [arr[0]];
  for (let i = 1; i < arr.length; i++) if (arr[i] > out[out.length - 1] + 1.2) out.push(arr[i]);
  return out;
}
function tdLevels(H) { const a = []; for (let d = 0; d < H - 1.4; d += 3.5) a.push(d); return a; }

function evaluate(S) {
  const P = PROFILES[S.prof], W = WALLS[S.wall];
  const H = S.H, B = S.B, gw = S.gw, dist = S.dist;
  const szeg = S.wall === 'szeg';
  const sup = szeg ? 'szeg' : S.sup;
  const nSel = sup === 'horgony' || sup === 'cso' ? S.lev : 0;
  const levels = sup === 'topdown' ? tdLevels(H) : levelDepths(H, nSel);
  const theta = (45 + P.phi / 2) * D2R;
  const gwAbove = gw < H - 0.05;
  const items = [];
  const add = (s, t, d, l) => items.push({ s, t, d, l });

  // falhossz (talpszint)
  const emb = sup === 'konzolos' ? Math.max(2, 0.8 * H) : sup === 'topdown' ? Math.max(2, 0.3 * H) : Math.max(2, 0.4 * H);
  let toe = szeg ? H : H + emb;
  let reach = false;
  if (!szeg && W.wt) {
    const need = P.imper + 1.5;
    if (gwAbove && need > toe && need <= W.max) toe = need;
    reach = toe >= P.imper + 1.0;
  }
  toe = Math.min(toe, YB - 1.5);
  const tooLong = !szeg && toe > W.max + 0.01;

  // --- statika
  let stat = 'ok';
  if (sup === 'konzolos') {
    stat = H > 6 ? 'bad' : H > 4 ? 'warn' : 'ok';
    const near = dist < H;
    if (near && stat === 'ok' && H > 3) stat = 'warn';
    add(stat, 'Konzolos, befogott fal', `A befogott fal megtámasztás nélkül csak kb. <b>4–6 m</b> kiemelésig állékony – és csak ha közvetlenül mellette nincs építmény.${near ? ' Itt a szomszéd épület közel van.' : ''}${stat !== 'ok' ? ' Adj hozzá horgony- vagy dúcsort!' : ''}`, '#statika');
  } else if (sup === 'horgony' || sup === 'cso') {
    const n = levels.length, cap = 5 + 5 * n;
    stat = H > cap ? 'bad' : H > cap - 1.5 ? 'warn' : 'ok';
    const need = Math.max(1, Math.ceil((H - 5) / 5));
    add(stat, `${n} ${sup === 'horgony' ? 'horgonysor' : 'dúcsor (csőtámasz)'}`, `Szemléltető ökölszabály: a fal felső kb. 5 m-e konzolként áll, minden további támaszszint kb. 5 m-rel többet enged. ${stat === 'bad' ? `H = ${fmt(H, 1)} m-hez legalább <b>${need}</b> szint kellene – a fal túlterhelt.` : stat === 'warn' ? 'A határon van – egy további szint biztonságosabb.' : 'A támaszszintek száma elegendőnek tűnik.'}`, '#statika');
    if (n < nSel) add('info', 'Kevesebb szint fér el', `${fmt(H, 1)} m mélységben ${nSel} szint nem fér el értelmesen (min. ~1,2 m függőleges távolság) – ${n} szinttel számolunk.`, '#statika');
  } else if (sup === 'topdown') {
    stat = 'ok';
    add('ok', `Támaszfödémek (${levels.length} szint)`, 'A födémek tárcsaként, nagy merevséggel támasztják a falat; a földre fektetve, zsaluállvány nélkül épülnek.', '#topdown');
  } else if (szeg) {
    stat = H > 14 ? 'warn' : 'ok';
    add(stat, 'Szegezett fal – súlytámfal-szerű földtömeg', `A szegek a földtömeget „összevarrják”: szeghossz ≈ 0,6–1,2·H (itt ~${fmt((P.gran ? 1.0 : 0.8) * H, 1)} m), raszter 0,5–1,5 m, lépcsők 0,9–1,8 m-enként, fal-meredekség max. 1:8–1:10.${H > 14 ? ' Ekkora mélységnél a deformációk már jelentősek lehetnek.' : ''}`, '#szegezes');
  }

  // --- víz
  let flood = false, seep = false, dewOut = false;
  if (!gwAbove) {
    add('ok', 'Száraz munkagödör', `A talajvíz (−${fmt(gw, 1)} m) a kiemelési sík alatt van, vízzárásra nincs szükség.`, '#falak');
  } else if (!W.wt) {
    if (S.dew) { dewOut = true; add('warn', `Nem vízzáró fal + víztelenítés`, `A ${W.t.toLowerCase()} nem vízzáró: csak talajvízszint-süllyesztéssel használható. A leszívás a környező talajvízszintet is süllyeszti – a szomszéd épület süllyedhet.`, W.link); }
    else { flood = true; add('bad', 'Víz a gödörben!', `A ${W.t.toLowerCase()} nem vízzáró, a talajvíz (−${fmt(gw, 1)} m) a kiemelési sík felett van: a gödör megtelik vízzel. Válassz vízzáró falat (szádfal, résfal, összemetsző cölöpfal, jet-fal) vagy víztelenítést.`, W.link); }
  } else if (reach) {
    add('ok', 'Vízzáró fal a vízzáró rétegbe kötve', `A fal talpa (−${fmt(toe, 1)} m) a vízzáró réteg (−${fmt(P.imper, 1)} m) alá ér: csak a bezárt vizet kell kiszivattyúzni.${S.wall === 'jet' || S.wall === 'zagy' ? ' (A jet- és a zagyfal „kvázi vízzáró”.)' : ''}`, W.link);
  } else {
    if (S.dew) dewOut = true; else seep = true;
    add(S.dew ? 'warn' : 'bad', 'A fal nem éri el a vízzáró réteget', `A vízzáró réteg −${fmt(P.imper, 1)} m-en van, a ${W.t.toLowerCase()} itt legfeljebb kb. ${W.max} m hosszú: a víz alulról áramlik be (hidraulikus talajtörés veszélye). Megoldás: mélyebb fal (résfal), víztelenítés vagy víz alatti betonozás.`, '#vizalatti');
  }
  if (S.dew && !gwAbove) add('info', 'Víztelenítés bekapcsolva', 'A talajvíz most a kiemelési sík alatt van – a szivattyúzás felesleges.', '#falak');

  // --- fal és talaj
  if (szeg) {
    if (P.soft) add('bad', 'Puha, plasztikus agyagban nem alkalmazható', 'A talajszegezés puha, plasztikus agyagban, szerves talajban, törmelékes feltöltésben és görgetegben nem működik: a földfal a lépcsők között sem áll meg.', '#szegezes');
    else if (P.gran) add('warn', 'Szemcsés talaj, feltöltés felül', 'Homokos kavicsban csak akkor megy, ha a lépcső (0,9–1,8 m) rövid ideig megáll; a felső 2,5 m törmelékes feltöltésben a szegezés nem alkalmazható – ott más megoldás kell.', '#szegezes');
    else add('ok', 'Kemény agyagban jól működik', 'Kemény, köves agyagban fúrt-injektált szegeket alkalmaznak; a földfal a lépcsők között jól megáll.', '#szegezes');
    const Ln = (P.gran ? 1.0 : 0.8) * H, reachN = Ln * Math.cos(12 * D2R);
    if (reachN > dist) add('warn', 'A szegek a szomszéd telek alá nyúlnak', `~${fmt(Ln, 1)} m-es szegek, a szomszéd épület ${fmt(dist, 1)} m-re van – engedély kell, és a pincébe, közműbe ütközhetnek.`, '#szegezes');
    add('info', 'Utca felől: közművek', 'Városi területen a sűrűn kiosztott szegek a közterület alatti közművekbe ütközhetnek.', '#szegezes');
  } else {
    const wall = S.wall;
    if (wall === 'hezagos') {
      if (P.soft) add('bad', 'Hézagos cölöpfal puha talajban', 'A cölöpközökben a puha talaj nem boltozódik át, kifolyik – zárt (érintkező, összemetsző) fal kell.', '#colopfal');
      else if (P.gran) add('warn', 'Hézagos cölöpfal szemcsés talajban', 'Szemcsés talajban a cölöpközökből kipereg a talaj: érintkező cölöpfal vagy felületvédelem (betonacél háló + lőttbeton) kell.', '#colopfal');
      else add('ok', 'Hézagos cölöpfal kemény agyagban', 'Nagyon kemény agyagban a talaj átboltozódik a 20–60 cm-es cölöpközökben – hazánkban ez a legelterjedtebb.', '#colopfal');
    }
    if (wall === 'berlini') {
      add(P.soft ? 'warn' : 'ok', P.soft ? 'Berlini dúcolat puha talajban' : 'Berlini dúcolat', P.soft ? 'Puha talajban a pallózás beépítéséig a földfal nem áll meg, a talaj kifolyhat a pallók mögül.' : 'Száraz, nem túl mély gödrök egyik leggazdaságosabb ideiglenes megtámasztása; zajvédelmi okból ma inkább furatba helyezik a tartókat.', '#berlini');
    }
    if (wall === 'szad') {
      if (S.prof === 'A') add('warn', 'Szádfal kemény agyagban', 'Kemény, köves agyagban a pallók nehezen hajthatók le – előfúrás kell.', '#szadfal');
      add('warn', 'Rezgés a szomszédban', `A verés, vibrálás rezgése 20–30 m-re is elhathat – a ${fmt(dist, 1)} m-re lévő épületre vizsgálni kell (csendesebb: sajtolás).`, '#szadfal');
    }
    if (wall === 'zagy') {
      const zs = H > 10 ? 'bad' : H > 7 ? 'warn' : 'ok';
      add(zs, 'Zagyfal mélysége', `Az erősített önszilárduló zagyfal jellemzően legfeljebb 7–10 m mély, ideiglenes munkatérhez optimális.${dist < H ? ' Süllyedésre érzékeny szerkezet közelében kerülendő.' : ''}`, '#zagyfal');
      if (P.soft) add('warn', 'Résállékonyság', 'A zagyfal kedvező résállékonyságú talajt igényel – puha talajban a rés beomolhat.', '#zagyfal');
    }
    if (wall === 'jet') add(H > 10 ? 'warn' : 'ok', 'Jet-grouting fal', `Jellemzően 1–2 szintes mélygarázsokhoz, utólagos hozzáépítésekhez; az oszlopátmérő talajfüggő (60–120 cm).${H > 10 ? ' Ekkora mélységhez inkább résfal.' : ''}`, '#jetfal');
    if (wall === 'res') add('ok', 'Résfal', 'Nagy mélységig (akár 40 m felett) vízzáró, merev fal; egyben végleges pincefal is lehet.', '#resfal');
    if (wall === 'metszo') add('info', 'Összemetsző cölöpfal', 'Vízzáró, de csak minden második cölöp vasalt; a résfallal szemben csak speciális esetben gazdaságos.', '#colopfal');
    if (tooLong) add('bad', 'Túl hosszú fal', `A szükséges ${fmt(toe, 1)} m-es falhossz meghaladja a technológia szokásos határát (~${W.max} m).`, W.link);
  }

  // --- megtámasztás és környezet
  const anchors = [];
  if (sup === 'horgony') {
    let worst = 'ok', longest = 0, under = false, hit = false, softFix = false;
    for (const d of levels) {
      const x = (H - d) / (Math.tan(theta) + Math.tan(ALPHA));
      const Lf = Math.max(4, x / Math.cos(ALPHA) + 1.5), Lb = 6, L = Lf + Lb;
      anchors.push({ d, Lf, Lb, L });
      longest = Math.max(longest, L);
      const reachA = L * Math.cos(ALPHA);
      if (reachA > dist) { under = true; const yAt = d + dist * Math.tan(ALPHA); if (yAt < 4.0) hit = true; }
      const mid = d + (Lf + Lb / 2) * Math.sin(ALPHA);
      if (P.soft && mid > 1.5 && mid < 8) softFix = true;
    }
    if (longest > 30) worst = 'bad'; else if (longest > 25) worst = 'warn';
    add(worst, `Horgonyhossz: max. ${fmt(longest, 1)} m`, `Szabad szakasz az aktív csúszólapon túl (min. 4 m) + befogott szakasz (4–9 m, itt 6 m), 15–30°-os hajlással; a horgonyok legfeljebb 25–30 m hosszúak. Szilárdulás (8–12 nap) után a tervezett erő 80–90%-ára feszítik.`, '#horgony');
    if (hit) add('bad', 'A horgony a szomszéd pincéjébe ütközik!', 'A felső horgonysor a szomszéd épület pincéjének mélységében halad át – más hajlás, mélyebb szint vagy csőtámasz kell.', '#horgony');
    else if (under) add('warn', 'Horgony a szomszéd telek alatt', 'A horgonyok (sokszor 15–20 m-re) a szomszéd ingatlan alá nyúlnak: jogi kérdés (hozzájárulás), és meglévő műtárgyba ütközhetnek.', '#horgony');
    add('info', 'Utca alatt: közművek', 'A másik oldalon a horgonyok a közterület alá nyúlnak – közműegyeztetés kell.', '#horgony');
    if (softFix) add('warn', 'Befogás puha talajban', 'A befogott szakasz puha agyagba esik: kicsi a köpenysúrlódás, a teherbírás bizonytalan – mélyebbre kell vinni.', '#horgony');
  }
  if (sup === 'cso') {
    const s = B > 28 ? 'bad' : B > 25 ? 'warn' : 'ok';
    add(s, `Csőtámasz-fesztáv: ${fmt(B, 0)} m`, `Jellemzően 4–25 m-es elemek; ${s === 'ok' ? 'ez a fesztáv közbenső alátámasztás nélkül is áthidalható.' : '25–28 m felett közbenső alátámasztás (pl. előre elkészített cölöpre) kell.'}${B > 12 ? ' 10–15 m felett a hőtágulásból eredő tengelyerő is meghatározó.' : ''}`, '#csotamasz');
    add('info', 'Szűk munkatér', 'A dúcok nehezítik a kiemelést és a belső szerkezet építését – cserébe nem nyúlnak a szomszéd telek alá, és merev, kis mozgású falat adnak.', '#csotamasz');
  }
  if (sup === 'topdown') {
    const okW = ['res', 'metszo', 'hezagos'].includes(S.wall);
    if (S.wall === 'berlini') add('bad', 'Top-down berlini dúcolattal?', 'A milánói módszerhez a födémeket tartani képes, végleges jellegű határoló szerkezet kell (résfal, cölöpfal).', '#topdown');
    else if (!okW) add('warn', 'Szokatlan párosítás', `A top-down módszernél jellemzően résfalat vagy cölöpfalat készítenek – a ${WALLS[S.wall].t.toLowerCase()} ritkán jön szóba.`, '#topdown');
    add('info', 'Zárófödém, szűk munkatér', 'A felszín hamar visszaadható; a földkiemelés a födém alatt, a földkiadó nyíláson át, szűk térben folyik – szellőzés, világítás kell.', '#topdown');
  }

  // --- szomszéd épület mozgása (szemléltető)
  const kStiff = { konzolos: 1.0, horgony: 0.4, cso: 0.3, topdown: 0.18, szeg: 0.6 }[sup];
  const soilFail = (szeg && P.soft) || (S.wall === 'hezagos' && P.soft);
  const sb = stat === 'bad' || soilFail ? 1.0 : stat === 'warn' ? 0.35 : 0;
  const prox = Math.exp(-dist / Math.max(4, H));
  let risk = (kStiff * H / 12 + sb) * prox + (dewOut ? 0.55 * Math.exp(-dist / (2 * H)) : 0) + (flood ? 0.35 * prox : 0) + (seep ? 0.25 * prox : 0);
  if (S.wall === 'szad') risk += 0.08 * Math.exp(-dist / 10);
  const rs = risk < 0.18 ? 'ok' : risk < 0.45 ? 'warn' : 'bad';
  add(rs, 'Szomszéd épület mozgása', `${rs === 'ok' ? 'Várhatóan kicsi.' : rs === 'warn' ? 'Közepes – mozgásfigyelés (monitoring) javasolt.' : 'Nagy – süllyedés, dőlés, repedések várhatók!'} A merevebb megtámasztás (csőtámasz, födém, feszített horgony) és a nagyobb távolság csökkenti.${dewOut ? ' A talajvízszint-süllyesztés tovább növeli.' : ''}`, '#statika');

  const dmax = szeg ? (stat === 'ok' ? 0.12 : 0.45) : stat === 'bad' ? 1.25 : stat === 'warn' ? 0.42 : sup === 'topdown' ? 0.03 : 0.07;
  return { S, P, W, H, B, gw, dist, sup, szeg, levels, anchors, theta, gwAbove, toe, reach, flood, seep, dewOut, stat: soilFail ? 'bad' : stat, risk, rs, dmax: soilFail ? 0.9 : dmax, items, tw: W.tw };
}

/* ------------------------------------------------------------------ textúrák, anyagok */
function canvasTex(draw, size = 128) {
  const c = document.createElement('canvas'); c.width = c.height = size;
  const g = c.getContext('2d'); draw(g, size);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  return t;
}
const hex = (c) => '#' + c.toString(16).padStart(6, '0');
let rs = 1;
const rnd = () => { rs = (rs * 16807) % 2147483647; return rs / 2147483647; };
function soilTex(kind) {
  return canvasTex((g, s) => {
    rs = 7 + kind.length * 13;
    g.fillStyle = hex(LCOL[kind]); g.fillRect(0, 0, s, s);
    const dark = 'rgba(0,0,0,0.22)', light = 'rgba(255,255,255,0.18)';
    if (kind === 'clay' || kind === 'hardclay') {
      g.strokeStyle = dark; g.lineWidth = kind === 'hardclay' ? 1.6 : 1.2;
      const step = kind === 'hardclay' ? 11 : 14;
      for (let i = -s; i < 2 * s; i += step) { g.beginPath(); g.moveTo(i, s); g.lineTo(i + s, 0); g.stroke(); }
      if (kind === 'hardclay') { g.strokeStyle = 'rgba(0,0,0,0.3)'; for (let k = 0; k < 4; k++) { g.beginPath(); const x = rnd() * s, y = rnd() * s; g.moveTo(x, y); g.lineTo(x + 18 * rnd(), y + 10); g.stroke(); } }
    } else if (kind === 'soft') {
      g.strokeStyle = dark; g.lineWidth = 1.2;
      for (let y = 8; y < s; y += 14) { g.beginPath(); for (let x = 0; x <= s; x += 4) g.lineTo(x, y + Math.sin((x / s) * Math.PI * 4) * 2.2); g.stroke(); }
    } else if (kind === 'gravel') {
      for (let k = 0; k < 46; k++) { const r = 2 + rnd() * 5; g.beginPath(); g.ellipse(rnd() * s, rnd() * s, r, r * 0.75, rnd() * 3, 0, 7); g.fillStyle = rnd() > 0.5 ? dark : light; g.fill(); }
    } else if (kind === 'sand') {
      for (let k = 0; k < 260; k++) { g.fillStyle = rnd() > 0.5 ? dark : light; g.fillRect(rnd() * s, rnd() * s, 1.6, 1.6); }
    } else { // feltöltés: törmelék
      for (let k = 0; k < 30; k++) { g.fillStyle = ['rgba(0,0,0,0.25)', 'rgba(160,60,40,0.35)', 'rgba(255,255,255,0.2)'][k % 3]; const x = rnd() * s, y = rnd() * s, w = 3 + rnd() * 8; g.beginPath(); g.moveTo(x, y); g.lineTo(x + w, y + 2); g.lineTo(x + w * 0.6, y + w * 0.7); g.closePath(); g.fill(); }
      for (let k = 0; k < 80; k++) { g.fillStyle = 'rgba(0,0,0,0.18)'; g.fillRect(rnd() * s, rnd() * s, 1.5, 1.5); }
    }
  });
}
const boardTex = () => canvasTex((g, s) => {
  g.fillStyle = hex(COL.timber); g.fillRect(0, 0, s, s);
  g.strokeStyle = 'rgba(70,40,10,0.55)'; g.lineWidth = 2;
  for (let y = 0; y <= s; y += s / 4) { g.beginPath(); g.moveTo(0, y); g.lineTo(s, y); g.stroke(); }
  g.strokeStyle = 'rgba(90,55,20,0.25)'; g.lineWidth = 1;
  for (let k = 0; k < 14; k++) { const y = Math.random() * s; g.beginPath(); g.moveTo(0, y); g.bezierCurveTo(s * 0.3, y + 3, s * 0.6, y - 3, s, y); g.stroke(); }
});
const facadeTex = () => canvasTex((g, s) => {
  g.fillStyle = hex(COL.bld); g.fillRect(0, 0, s, s);
  for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) {
    g.fillStyle = (r + c) % 3 ? '#5b6672' : '#e9c98c';
    g.fillRect(8 + c * 30, 8 + r * 30, 18, 20);
    g.fillStyle = 'rgba(0,0,0,0.12)'; g.fillRect(8 + c * 30, 28 + r * 30, 18, 2);
  }
}, 128);

/* ------------------------------------------------------------------ geometria-segédek */
function boxG(x0, x1, y0, y1, z0, z1, segX = 1, segY = 1) {
  const g = new THREE.BoxGeometry(Math.max(0.001, x1 - x0), Math.max(0.001, y1 - y0), Math.max(0.001, z1 - z0), segX, segY, 1);
  g.translate((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
  return g;
}
function cylG(cx, cz, r, y0, y1, segR = 14, segY = 10) {
  const g = new THREE.CylinderGeometry(r, r, Math.max(0.001, y1 - y0), segR, segY);
  g.translate(cx, (y0 + y1) / 2, cz);
  return g;
}
// világkoordinátás UV (a sraffozás a dobozok között folytonos)
function worldUV(g, tile) {
  const p = g.attributes.position, n = g.attributes.normal, uv = g.attributes.uv;
  for (let i = 0; i < p.count; i++) {
    const ax = Math.abs(n.getX(i)), ay = Math.abs(n.getY(i));
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    if (ax > 0.5) uv.setXY(i, z / tile, y / tile);
    else if (ay > 0.5) uv.setXY(i, x / tile, z / tile);
    else uv.setXY(i, x / tile, y / tile);
  }
  uv.needsUpdate = true;
  return g;
}
function mapper(side, B) {
  const hb = B / 2;
  if (side === 'L') return (X, Y, Z, o, i) => { o[i] = -hb - Z; o[i + 1] = Y; o[i + 2] = -LP + X; };
  if (side === 'R') return (X, Y, Z, o, i) => { o[i] = hb + Z; o[i + 1] = Y; o[i + 2] = -X; };
  return (X, Y, Z, o, i) => { o[i] = hb - X; o[i + 1] = Y; o[i + 2] = -LP - Z; };
}
function sideShape(side, B) {
  if (side === 'L') return (X) => 0.25 + 0.75 * Math.sin((Math.PI / 2) * clamp(X / LP, 0, 1));
  if (side === 'R') return (X) => 0.25 + 0.75 * Math.cos((Math.PI / 2) * clamp(X / LP, 0, 1));
  return (X) => 0.25 + 0.75 * Math.sin(Math.PI * clamp(X / B, 0, 1));
}
function deflShape(M) {
  const H = M.H, toe = M.toe;
  if (M.sup === 'konzolos' || M.szeg) return (dep) => { const r = clamp(1 - dep / (M.szeg ? H : toe * 0.85), 0, 1); return r * r; };
  return (dep) => (dep > H * 1.15 || dep < -0.5 ? 0 : Math.pow(Math.sin(Math.PI * clamp(dep / (H * 1.15), 0, 1)), 1.2));
}
function orientMatrix(a, b, r) {
  const dir = new THREE.Vector3().subVectors(b, a); const len = dir.length();
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
  return new THREE.Matrix4().compose(new THREE.Vector3().addVectors(a, b).multiplyScalar(0.5), q, new THREE.Vector3(r, len, r));
}

/* ------------------------------------------------------------------ címkék */
function label(text, o = {}) {
  const fs = 44, pad = 16;
  const c = document.createElement('canvas'); const g = c.getContext('2d');
  g.font = `700 ${fs}px Inter, "Segoe UI", system-ui, sans-serif`;
  const w = Math.ceil(g.measureText(text).width) + pad * 2, hh = fs + pad;
  c.width = w; c.height = hh;
  g.font = `700 ${fs}px Inter, "Segoe UI", system-ui, sans-serif`;
  g.fillStyle = o.bg || 'rgba(22,24,28,0.78)';
  const r = 14; g.beginPath(); g.moveTo(r, 0); g.arcTo(w, 0, w, hh, r); g.arcTo(w, hh, 0, hh, r); g.arcTo(0, hh, 0, 0, r); g.arcTo(0, 0, w, 0, r); g.fill();
  g.fillStyle = o.fg || '#f3eee4'; g.textBaseline = 'middle'; g.fillText(text, pad, hh / 2 + 2);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.minFilter = THREE.LinearFilter;
  const m = new THREE.SpriteMaterial({ map: t, depthTest: false, depthWrite: false, transparent: true });
  const s = new THREE.Sprite(m);
  const H = o.size || 0.9; s.scale.set((H * w) / hh, H, 1);
  s.renderOrder = 20;
  if (o.center) s.center.set(o.center[0], o.center[1]);
  return s;
}

/* ------------------------------------------------------------------ fő widget */
register('sim3d', (root) => {
  const ui = shell(root, { layout: 'ctl-right' });
  const S = { prof: 'B', wall: 'szad', sup: 'horgony', lev: 1, H: 9, B: 20, gw: 5, dew: false, dist: 6, xray: false };

  // --- nézet + színpad
  const viewSeg = seg(null, { label: '', options: [{ v: 'metszet', t: 'Metszet' }, { v: 'ferde', t: 'Ferde' }, { v: 'madar', t: 'Madártávlat' }, { v: 'godor', t: 'A gödörben' }], value: 'ferde' });
  const views = h('div', { class: 'sim-views' }, viewSeg.el);
  const stage = h('div', { class: 'sim-stage' });
  const badge = h('div', { class: 'sim-badge' }, 'Szemléltető · mozgások túlzottak');
  const stepEl = h('div', { class: 'sim-step' });
  const alertEl = h('div', { class: 'sim-alert' });
  stage.append(badge, alertEl, stepEl);
  const playBtn = h('button', { class: 'btn btn-acc btn-sm', type: 'button' }, '▶ Építés');
  const phase = slider(null, { label: 'Építési fázis', min: 0, max: 100, step: 1, value: 100, unit: '%', d: 0 });
  const playRow = h('div', { class: 'sim-play' }, playBtn, phase.el);
  ui.viz.append(views, stage, playRow);

  // --- vezérlők
  const C = ui.ctrls;
  C.append(h('div', { class: 'sim-ctl-h' }, 'Helyszín'));
  const cProf = select(C, { label: 'Talajprofil', options: Object.entries(PROFILES).map(([v, p]) => ({ v, t: p.name })), value: S.prof });
  const cGw = slider(C, { label: 'Talajvíz mélysége', min: 1, max: 20, step: 0.5, value: S.gw, unit: 'm', d: 1 });
  const cDist = slider(C, { label: 'Szomszéd épület távolsága', min: 1.5, max: 30, step: 0.5, value: S.dist, unit: 'm', d: 1 });
  C.append(h('div', { class: 'sim-ctl-h' }, 'Munkagödör'));
  const cH = slider(C, { label: 'Kiemelési mélység', sym: 'H', min: 2, max: 20, step: 0.5, value: S.H, unit: 'm', d: 1 });
  const cB = slider(C, { label: 'Gödör szélessége', sym: 'B', min: 10, max: 36, step: 1, value: S.B, unit: 'm', d: 0 });
  C.append(h('div', { class: 'sim-ctl-h' }, 'Szerkezet'));
  const cWall = select(C, { label: 'Határoló fal', options: Object.entries(WALLS).map(([v, w]) => ({ v, t: w.t })), value: S.wall });
  const cSup = seg(C, { label: 'Megtámasztás', options: Object.entries(SUPS).map(([v, t]) => ({ v, t })), value: S.sup });
  const cLev = slider(C, { label: 'Támaszszintek száma', min: 1, max: 3, step: 1, value: S.lev, unit: 'db', d: 0 });
  const supNote = h('div', { class: 'sim-ctl-note' });
  C.append(supNote);
  C.append(h('div', { class: 'sim-ctl-h' }, 'Kiegészítők'));
  const cDew = toggle(C, { label: 'Víztelenítés (szivattyúzás)', value: S.dew });
  const cX = toggle(C, { label: 'Röntgen – átlátszó talaj', value: S.xray });

  // --- kimenetek, lista, jelmagyarázat
  const oToe = stat(ui.out, { label: 'Fal talpszintje' });
  const oLev = stat(ui.out, { label: 'Támaszszintek' });
  const oLen = stat(ui.out, { label: 'Horgony / dúc' });
  const oWater = stat(ui.out, { label: 'Víz a gödörben' });
  const oNb = stat(ui.out, { label: 'Szomszéd mozgása' });
  const checkBox = h('div', { class: 'sim-check' });
  const legend = h('div', { class: 'sim-legend' }, h('div', { class: 'legend' },
    ...[['Acél (szádfal, tartó)', COL.sheet], ['Vasbeton', COL.conc], ['Jet / talajcement', COL.jet], ['Zagy', COL.slurry], ['Pallózás', COL.timber],
      ['Heveder', COL.waler], ['Horgony befogott szakasza', COL.grout], ['Csőtámasz', COL.strut], ['Talajvíz', COL.water]].map(([t, c]) => h('span', {}, h('i', { style: { background: hex(c) } }), t)),
    h('span', {}, h('i', { style: { background: 'transparent', borderTop: '2px dashed #d0533e', borderRadius: 0, height: 0 } }), 'aktív csúszólap')));
  root.append(checkBox, legend);

  // --- three.js
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
  } catch (e) {
    stage.append(h('div', { class: 'sim-msg', html: 'A 3D nézethez WebGL kell, amit ez a böngésző (vagy eszköz) most nem támogat.<br>Az ellenőrző lista és a vezérlők ettől még működnek.' }));
    stage.style.aspectRatio = '16 / 9';
    renderer = null;
  }
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(38, 1.6, 0.3, 400);
  let controls = null;
  if (renderer) {
    renderer.setPixelRatio(Math.min(1.5, window.devicePixelRatio || 1));
    renderer.localClippingEnabled = true;
    stage.prepend(renderer.domElement);
    renderer.domElement.setAttribute('aria-label', '3D munkagödör-modell');
    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = false;
    controls.minDistance = 4; controls.maxDistance = 160;
    controls.addEventListener('change', () => { if (!tween) req(); });
  }
  scene.add(new THREE.HemisphereLight(0xfff6e8, 0x5a4a3a, 1.35));
  const sun = new THREE.DirectionalLight(0xffffff, 1.9); sun.position.set(-30, 50, 40); scene.add(sun);
  const fill = new THREE.DirectionalLight(0xbfd6ff, 0.55); fill.position.set(40, 20, 30); scene.add(fill);
  const setBg = () => { scene.background = new THREE.Color(cssVar('--sky') || '#dfe9ee'); req(); };

  // anyagok
  const lam = (c, o = {}) => new THREE.MeshLambertMaterial({ color: c, ...o });
  const clipWall = new THREE.Plane(new THREE.Vector3(0, 1, 0), 100);   // y ≥ −fal-előrehaladás
  const clipExc = new THREE.Plane(new THREE.Vector3(0, 1, 0), 100);    // y ≥ −kiemelés
  const clipCap = new THREE.Plane(new THREE.Vector3(0, 1, 0), 100);    // fejgerenda csak a fal után
  const MAT = {
    conc: lam(COL.conc, { clippingPlanes: [clipWall] }), conc2: lam(COL.conc2, { clippingPlanes: [clipWall] }), cap: lam(COL.cap, { clippingPlanes: [clipCap] }),
    steel: lam(COL.steel, { clippingPlanes: [clipWall] }), sheet: lam(COL.sheet, { clippingPlanes: [clipWall] }), jet: lam(COL.jet, { clippingPlanes: [clipWall] }),
    slurry: lam(COL.slurry, { clippingPlanes: [clipWall] }), joint: lam(COL.joint, { clippingPlanes: [clipWall] }),
    timber: lam(0xffffff, { map: boardTex(), clippingPlanes: [clipExc] }), shot: lam(COL.shot, { clippingPlanes: [clipExc] }),
    waler: lam(COL.waler), strand: lam(COL.strand), grout: lam(COL.grout), head: lam(COL.head), strut: lam(COL.strut), slab: lam(COL.slab), column: lam(COL.column),
    nail: lam(COL.nail), well: lam(COL.well), top: lam(COL.top), street: lam(COL.street), walk: lam(COL.walk), mark: lam(0xf2efe6),
    water: new THREE.MeshLambertMaterial({ color: COL.water, transparent: true, opacity: 0.6, depthWrite: false }),
    gwFace: new THREE.MeshBasicMaterial({ color: COL.water, transparent: true, opacity: 0.32, depthWrite: false, side: THREE.DoubleSide }),
    bld: lam(0xffffff, { map: facadeTex() }), bld2: lam(COL.bld2), base: lam(COL.base),
    pipeW: lam(COL.pipeW), pipeG: lam(COL.pipeG), pipeS: lam(COL.pipeS), exc: lam(COL.exc), excD: lam(0x2b2f35),
  };
  const DASH = { water: new THREE.LineDashedMaterial({ color: COL.water, dashSize: 0.6, gapSize: 0.35, depthTest: false }), slip: new THREE.LineDashedMaterial({ color: 0xd0533e, dashSize: 0.7, gapSize: 0.45, depthTest: false }) };
  const SOILMAT = {};
  for (const k of Object.keys(LCOL)) {
    const tex = soilTex(k);
    const base = new THREE.Color(LCOL[k]);
    SOILMAT[k] = { face: lam(0xffffff, { map: tex }), side: lam(base.clone().multiplyScalar(0.82)), floor: lam(0xffffff, { map: tex, color: 0xd9d4ca }) };
  }
  const setXray = (on) => {
    const set = (m, op) => { m.transparent = on; m.opacity = on ? op : 1; m.depthWrite = !on; m.needsUpdate = true; };
    for (const m of Object.values(SOILMAT)) { set(m.face, 0.55); set(m.side, 0.14); set(m.floor, 0.4); }
    set(MAT.top, 0.3);
  };

  // csoportok
  const G = { soil: new THREE.Group(), under: new THREE.Group(), wall: new THREE.Group(), sup: new THREE.Group(), env: new THREE.Group(), face: new THREE.Group(), lab: new THREE.Group(), water: new THREE.Group() };
  Object.values(G).forEach((g) => scene.add(g));
  const disposeGroup = (g) => { g.traverse((o) => { if (o.geometry) o.geometry.dispose(); if (o.isSprite) { o.material.map?.dispose(); o.material.dispose(); } }); g.clear(); };

  // szomszéd épület (egyszer épül, csak mozgatjuk)
  const bPivot = new THREE.Group(); scene.add(bPivot);
  const BW = 14, BH = 16, BD = 14;
  {
    const body = new THREE.Mesh(boxG(0, BW, 0, BH, -BD - 2, -2), [MAT.bld, MAT.bld, MAT.bld2, MAT.bld2, MAT.bld, MAT.bld]);
    const uv = body.geometry.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * 1.75, uv.getY(i) * 1.25);
    const roof = new THREE.Mesh(boxG(-0.3, BW + 0.3, BH, BH + 0.5, -BD - 2.3, -1.7), MAT.bld2);
    const basement = new THREE.Mesh(boxG(0, BW, -3.5, 0, -BD - 2, 0.03), MAT.base);
    bPivot.add(body, roof, basement);
    const lb = label('SZOMSZÉD ÉPÜLET', { size: 1.1 }); lb.position.set(BW / 2, BH + 2, -8); bPivot.add(lb);
    const lp = label('pince', { size: 0.75, bg: 'rgba(0,0,0,0.55)' }); lp.position.set(BW / 2, -1.7, 0.4); bPivot.add(lp);
    bPivot.children.forEach((c) => { c.userData.off = c.position.clone(); });
  }
  // kotró
  const exc = new THREE.Group(); scene.add(exc);
  const arm = new THREE.Group();
  {
    exc.add(new THREE.Mesh(boxG(-1.8, 1.8, 0, 0.7, -1.2, 1.2), MAT.excD));
    exc.add(new THREE.Mesh(boxG(-1.4, 1.4, 0.7, 1.5, -1.1, 1.1), MAT.exc));
    exc.add(new THREE.Mesh(boxG(-0.2, 1.2, 1.5, 2.6, -1.0, 0.2), MAT.exc));
    arm.position.set(-1.2, 1.3, 0.3);
    const boom = new THREE.Mesh(boxG(0, 3.4, -0.2, 0.2, -0.2, 0.2), MAT.exc); boom.rotation.z = 0.55; arm.add(boom);
    const stick = new THREE.Group(); stick.position.set(2.9, 1.75, 0);
    const st = new THREE.Mesh(boxG(0, 2.4, -0.15, 0.15, -0.15, 0.15), MAT.exc); st.rotation.z = -1.25; stick.add(st);
    const bucket = new THREE.Mesh(boxG(0.6, 1.4, -2.6, -1.9, -0.5, 0.5), MAT.excD); stick.add(bucket);
    arm.add(stick); arm.userData.stick = stick;
    exc.add(arm);
    exc.rotation.y = Math.PI; exc.scale.setScalar(0.85);
  }

  let M = null;           // aktuális modell
  let deform = [];        // {mesh, local, map, shape}
  let nailMesh = null, anchFree = null, anchFix = null, anchorDepths = [], nailDepths = [];
  let levelGroups = [];   // {d, g}
  let underState = '';
  let waterMesh = null, waterLevel = null;
  let faceKey = '';
  let P = 1;              // fázis 0..1

  /* ---------------- talaj */
  function buildSoil() {
    disposeGroup(G.soil);
    const P0 = M.P, hb = M.B / 2, tw = M.tw;
    const Xb = Math.max(30, hb + M.dist + BW + 8);
    M.Xb = Xb;
    const regions = [
      [-Xb, -hb - tw, -ZB, 0], [hb + tw, Xb, -ZB, 0], [-hb - tw, hb + tw, -ZB, -LP - tw],
    ];
    let y0 = 0;
    for (const L of P0.layers) {
      const y1 = -L.to, m = SOILMAT[L.k];
      for (const [xa, xb, za, zb] of regions) {
        const g = worldUV(boxG(xa, xb, y1, -y0, za, zb), 2.5);
        const mats = [m.side, m.side, y0 === 0 ? MAT.top : m.side, m.side, m.face, m.side];
        G.soil.add(new THREE.Mesh(g, mats));
      }
      y0 = L.to;
    }
    // utca + járda + útburkolati jel + közművek
    const xs0 = -hb - tw - 2.5, xs1 = -hb - tw - 12;
    G.soil.add(new THREE.Mesh(boxG(xs0, -hb - tw - 0.2, 0, 0.12, -ZB, 0.02), MAT.walk));
    G.soil.add(new THREE.Mesh(boxG(xs1, xs0, 0, 0.06, -ZB, 0.02), MAT.street));
    for (let z = -ZB + 1; z < -1; z += 4) G.soil.add(new THREE.Mesh(boxG((xs0 + xs1) / 2 - 0.1, (xs0 + xs1) / 2 + 0.1, 0.06, 0.08, z, z + 2), MAT.mark));
    const pipe = (x, y, r, mat) => { const g = new THREE.CylinderGeometry(r, r, ZB + 0.05, 16); g.rotateX(Math.PI / 2); g.translate(x, y, -ZB / 2 + 0.03); G.soil.add(new THREE.Mesh(g, mat)); };
    pipe(-hb - tw - 4.2, -1.8, 0.25, MAT.pipeW); pipe(-hb - tw - 6.5, -1.2, 0.16, MAT.pipeG); pipe(-hb - tw - 9, -3.0, 0.5, MAT.pipeS);
    // címkék
    disposeGroup(G.lab);
    y0 = 0;
    for (const L of P0.layers) {
      const mid = Math.min((y0 + L.to) / 2, y0 + 2.2);
      const s = label(L.n + (L.k === 'clay' || (L.k === 'hardclay' && S.prof !== 'C') ? ' · vízzáró' : ''), { size: 0.85, center: [0, 0.5] });
      s.position.set(-Math.min(Xb - 1.2, hb + tw + 15), -mid, 0.5); G.lab.add(s); y0 = L.to;
    }
    const ls = label('UTCA · KÖZMŰVEK', { size: 0.9 }); ls.position.set((xs0 + xs1) / 2, 2.2, -4); G.lab.add(ls);
    // szomszéd épület
    const bx = hb + Math.max(M.dist, tw + 0.3);
    bPivot.position.set(bx, -3.5, 0);
    bPivot.children.forEach((c) => { c.position.copy(c.userData.off).add(new THREE.Vector3(0, 3.5, 0)); });
  }
  function buildUnder(e) {
    const key = M.key + '|' + e.toFixed(2);
    if (key === underState) return; underState = key;
    disposeGroup(G.under);
    const hb = M.B / 2, tw = M.tw;
    let y0 = 0;
    for (const L of M.P.layers) {
      const top = Math.max(y0, e), bot = L.to;
      if (bot > top + 0.001) {
        const m = SOILMAT[L.k];
        const g = worldUV(boxG(-hb - tw, hb + tw, -bot, -top, -LP - tw, 0), 2.5);
        G.under.add(new THREE.Mesh(g, [m.side, m.side, Math.abs(top - e) < 0.001 && e > 0.01 ? m.floor : (top === 0 ? MAT.top : m.side), m.side, m.face, m.side]));
      }
      y0 = L.to;
    }
  }

  /* ---------------- fal */
  function wallSide(side, len) {
    // lokális koordináták: X a fal mentén, Y függőleges, Z a talaj felé (0 = gödör felőli sík)
    const W = M.S.wall, toe = M.toe, H = M.H, out = {};
    const put = (k, g) => { (out[k] = out[k] || []).push(g); };
    const x0 = side === 'R' ? -0.04 : side === 'B' ? -M.tw : 0, x1 = side === 'L' ? len + 0.04 : side === 'B' ? len + M.tw : len;
    const segY = 22;
    if (W === 'res') {
      put('conc', boxG(x0, x1, -toe, 0.0, 0, 0.8, Math.max(1, Math.round((x1 - x0) / 2)), segY));
      for (let x = 5; x < x1 - 0.5; x += 5) put('joint', boxG(x - 0.03, x + 0.03, -toe, 0, -0.012, 0.81, 1, segY));
      put('cap', boxG(x0, x1, -0.9, 0.25, -0.1, 0.95, 1, 2));
    } else if (W === 'szad') {
      const A = 0.38, Pp = 1.2, t = 0.06;
      for (let x = x0; x < x1 - 0.01; x += Pp) {
        const seg = [[0, 0.22, 0, 0], [0.22, 0.38, 0, A], [0.38, 0.82, A, A], [0.82, 0.98, A, 0], [0.98, 1.2, 0, 0]];
        for (const [a, b, za, zb] of seg) {
          const xa = x + a, xb = Math.min(x1, x + b); if (xb <= xa) continue;
          const g = boxG(0, Math.hypot(xb - xa, zb - za), -toe, 0.4, -t / 2, t / 2, 1, segY);
          g.rotateY(-Math.atan2(zb - za, xb - xa)); g.translate(xa, 0, za);
          put('sheet', g);
        }
      }
    } else if (W === 'berlini') {
      const sp = 2.0;
      const pos = []; for (let x = x0 + 0.2; x <= x1 - 0.1; x += sp) pos.push(x);
      for (const x of pos) {
        put('steel', boxG(x - 0.15, x + 0.15, -toe, 0.35, 0, 0.04, 1, segY));
        put('steel', boxG(x - 0.15, x + 0.15, -toe, 0.35, 0.3, 0.34, 1, segY));
        put('steel', boxG(x - 0.02, x + 0.02, -toe, 0.35, 0.04, 0.3, 1, segY));
      }
      for (let i = 0; i < pos.length - 1; i++) put('timber', worldUV(boxG(pos[i] + 0.15, pos[i + 1] - 0.15, -H, 0, 0.12, 0.2, 1, segY), 1));
      if (pos.length) put('timber', worldUV(boxG(Math.max(x0, pos[pos.length - 1] + 0.15), x1, -H, 0, 0.12, 0.2, 1, segY), 1));
    } else if (W === 'hezagos' || W === 'metszo' || W === 'jet') {
      const D = W === 'hezagos' ? 0.8 : W === 'metszo' ? 0.9 : 1.1, sp = W === 'hezagos' ? 1.2 : W === 'metszo' ? 0.75 : 0.95;
      let k = 0;
      for (let x = x0 + D / 2; x <= x1 + 0.01; x += sp, k++) {
        const g = cylG(x, D / 2, D / 2, -toe, W === 'jet' ? 0 : -0.6, W === 'jet' ? 12 : 16, segY);
        if (W === 'jet') { // szabálytalan felület
          const p = g.attributes.position;
          for (let i = 0; i < p.count; i++) { const yy = p.getY(i), xx = p.getX(i) - x, zz = p.getZ(i) - D / 2; const f = 1 + 0.08 * Math.sin(yy * 2.3 + k * 1.7) + 0.05 * Math.sin(yy * 5.1 + k); p.setX(i, x + xx * f); p.setZ(i, D / 2 + zz * f); }
        }
        put(W === 'jet' ? 'jet' : W === 'metszo' && k % 2 === 0 ? 'conc2' : 'conc', g);
        if (W === 'jet' && k % 2 === 0) put('steel', boxG(x - 0.12, x + 0.12, -0.1, 0.45, D / 2 - 0.1, D / 2 + 0.1, 1, 1));
      }
      if (W === 'hezagos') put('shot', boxG(x0, x1, -H, 0, 0.32, 0.42, Math.max(1, Math.round((x1 - x0) / 2)), segY));
      if (W !== 'jet') put('cap', boxG(x0, x1, -0.9, 0.25, -0.1, D + 0.1, 1, 2));
      else put('cap', boxG(x0, x1, -0.6, 0.2, 0.0, D, 1, 2));
    } else if (W === 'zagy') {
      put('slurry', boxG(x0, x1, -toe, 0.1, 0, 0.6, Math.max(1, Math.round((x1 - x0) / 2)), segY));
      for (let x = x0 + 0.5; x < x1; x += 1.5) { put('steel', boxG(x - 0.15, x + 0.15, -toe + 1.5, 0.4, -0.02, 0.03, 1, segY)); }
    } else if (W === 'szeg') {
      put('shot', boxG(x0, x1, -H, 0.15, 0, 0.15, Math.max(1, Math.round((x1 - x0) / 2)), segY));
    }
    return out;
  }
  function addDeformable(geos, side, matKey, group) {
    const g = mergeGeometries(geos, false); if (!g) return;
    const p = g.attributes.position;
    const local = new Float32Array(p.array);
    const map = mapper(side, M.B);
    for (let i = 0; i < p.count; i++) map(local[i * 3], local[i * 3 + 1], local[i * 3 + 2], p.array, i * 3);
    g.computeVertexNormals(); g.computeBoundingSphere();
    const mesh = new THREE.Mesh(g, MAT[matKey]); mesh.frustumCulled = false;
    group.add(mesh);
    deform.push({ mesh, local, map, shape: sideShape(side, M.B) });
  }
  function buildWalls() {
    disposeGroup(G.wall); deform = deform.filter((d) => d.waler);
    for (const [side, len] of [['L', LP], ['R', LP], ['B', M.B]]) {
      const parts = wallSide(side, len);
      for (const [k, geos] of Object.entries(parts)) addDeformable(geos, side, k, G.wall);
    }
  }

  /* ---------------- megtámasztás */
  function buildSupports() {
    disposeGroup(G.sup); deform = deform.filter((d) => !d.waler);
    levelGroups = []; anchorDepths = []; nailDepths = []; nailMesh = anchFree = anchFix = null;
    const hb = M.B / 2, tw = M.tw, sup = M.sup;
    const unitCyl = new THREE.CylinderGeometry(1, 1, 1, 10, 1);
    if (sup === 'horgony' || sup === 'cso') {
      for (const d of M.levels) {
        const g = new THREE.Group(); G.sup.add(g); levelGroups.push({ d, g });
        const sides = sup === 'horgony' ? [['L', LP], ['R', LP], ['B', M.B]] : [['L', LP], ['R', LP]];
        for (const [side, len] of sides) {
          const x0 = side === 'R' ? -0.04 : 0, x1 = side === 'L' ? len + 0.04 : len;
          const geo = [boxG(x0, x1, -d - 0.28, -d + 0.28, -0.42, 0, 1, 1)];
          const before = deform.length;
          addDeformable(geo, side, 'waler', g);
          for (let i = before; i < deform.length; i++) deform[i].waler = d;
        }
        if (sup === 'cso') {
          const zs = []; for (let z = -1.2; z > -LP + 1; z -= 6) zs.push(z);
          for (const z of zs) {
            const m = new THREE.Mesh(unitCyl, MAT.strut);
            m.matrix.copy(orientMatrix(new THREE.Vector3(-hb + 0.42, -d, z), new THREE.Vector3(hb - 0.42, -d, z), 0.4)); m.matrixAutoUpdate = false; g.add(m);
            if (M.B > 25) { const col = new THREE.Mesh(boxG(-0.2, 0.2, -M.H - 4, -d - 0.4, z - 0.2, z + 0.2), MAT.column); g.add(col); }
          }
          // sarok-ferdedúcok a hátsó sarkoknál
          for (const sx of [-1, 1]) {
            const m = new THREE.Mesh(unitCyl, MAT.strut);
            m.matrix.copy(orientMatrix(new THREE.Vector3(sx * (hb - 0.42), -d, -LP + 5), new THREE.Vector3(sx * (hb - 5), -d, -LP + 0.42), 0.3)); m.matrixAutoUpdate = false; g.add(m);
          }
        }
      }
      if (sup === 'horgony') {
        const list = [];
        for (const a of M.anchors) {
          for (const [side, len] of [['L', LP], ['R', LP], ['B', M.B]]) {
            const map = mapper(side, M.B);
            const xs = []; for (let x = 1.25; x < len - 0.6; x += 2.5) xs.push(x);
            xs.push(side === 'L' ? LP + 0.05 : side === 'R' ? -0.05 : len / 2);
            for (const X of xs) {
              const o = new Float32Array(9);
              map(X, -a.d, 0.02, o, 0);
              const dz = Math.cos(ALPHA), dy = -Math.sin(ALPHA);
              map(X, -a.d + dy * a.Lf, a.Lf * dz, o, 3);
              map(X, -a.d + dy * a.L, a.L * dz, o, 6);
              list.push({ d: a.d, p0: new THREE.Vector3(o[0], o[1], o[2]), p1: new THREE.Vector3(o[3], o[4], o[5]), p2: new THREE.Vector3(o[6], o[7], o[8]) });
            }
          }
        }
        list.sort((a, b) => a.d - b.d);
        anchFree = new THREE.InstancedMesh(unitCyl, MAT.strand, list.length);
        anchFix = new THREE.InstancedMesh(unitCyl, MAT.grout, list.length);
        const heads = new THREE.InstancedMesh(new THREE.BoxGeometry(0.45, 0.45, 0.45), MAT.head, list.length);
        list.forEach((a, i) => {
          anchFree.setMatrixAt(i, orientMatrix(a.p0, a.p1, 0.08));
          anchFix.setMatrixAt(i, orientMatrix(a.p1, a.p2, 0.24));
          heads.setMatrixAt(i, new THREE.Matrix4().makeTranslation(a.p0.x, a.p0.y, a.p0.z));
          anchorDepths.push(a.d);
        });
        anchFree.userData.heads = heads;
        G.sup.add(anchFree, anchFix, heads);
      }
    }
    if (sup === 'topdown') {
      for (const d of M.levels) {
        const g = new THREE.Group(); G.sup.add(g); levelGroups.push({ d, g, slab: true });
        const t = 0.5, y1 = -d, y0 = -d - t, hx = 2.6, z0 = -LP / 2 - 2.6, z1 = -LP / 2 + 2.6;
        // födém a földkiadó nyílással
        g.add(new THREE.Mesh(boxG(-hb, hb, y0, y1, -LP, z0), MAT.slab));
        g.add(new THREE.Mesh(boxG(-hb, hb, y0, y1, z1, 0.04), MAT.slab));
        g.add(new THREE.Mesh(boxG(-hb, -hx, y0, y1, z0, z1), MAT.slab));
        g.add(new THREE.Mesh(boxG(hx, hb, y0, y1, z0, z1), MAT.slab));
      }
      // pillérek (előre, felülről készülnek)
      const cols = new THREE.Group(); G.sup.add(cols);
      for (const x of [-hb / 2, hb / 2]) for (const z of [-LP * 0.28, -LP * 0.78]) cols.add(new THREE.Mesh(boxG(x - 0.25, x + 0.25, -M.H - 6, -0.5, z - 0.25, z + 0.25), MAT.column));
      levelGroups.push({ d: -1, g: cols, cols: true });
    }
    if (M.szeg) {
      const list = [];
      const Ln = (M.P.gran ? 1.0 : 0.8) * M.H, inc = 12 * D2R;
      for (const [side, len] of [['L', LP], ['R', LP], ['B', M.B]]) {
        const map = mapper(side, M.B);
        const xs = []; for (let x = 0.75; x < len; x += 1.5) xs.push(x);
        xs.push(side === 'L' ? LP + 0.05 : side === 'R' ? -0.05 : len / 2);
        for (let d = 0.75; d < M.H; d += 1.5) for (const X of xs) {
          const o = new Float32Array(6);
          map(X, -d, 0.1, o, 0); map(X, -d - Math.sin(inc) * Ln, Math.cos(inc) * Ln, o, 3);
          list.push({ d, a: new THREE.Vector3(o[0], o[1], o[2]), b: new THREE.Vector3(o[3], o[4], o[5]) });
        }
      }
      list.sort((a, b) => a.d - b.d);
      nailMesh = new THREE.InstancedMesh(unitCyl, MAT.nail, Math.max(1, list.length));
      list.forEach((n, i) => { nailMesh.setMatrixAt(i, orientMatrix(n.a, n.b, 0.07)); nailDepths.push(n.d); });
      G.sup.add(nailMesh);
    }
  }

  /* ---------------- környezet: kutak, metszet-fedőrétegek */
  function buildEnv() {
    disposeGroup(G.env);
    const hb = M.B / 2, tw = M.tw;
    if (M.S.dew && M.gwAbove) {
      const wells = M.reach && M.W.wt ? [[-hb / 2, -LP / 2], [hb / 2, -LP / 2]] : [[-hb - tw - 1.5, -2], [hb + tw + 1.5, -2], [-hb - tw - 1.5, -LP + 2], [hb + tw + 1.5, -LP + 2], [0, -LP - tw - 1.5]];
      for (const [x, z] of wells) G.env.add(new THREE.Mesh(cylG(x, z, 0.18, -M.H - 3, 0.6, 10, 1), MAT.well));
    }
    // H-méret
    const x = -hb + 1.0;
    const line = new THREE.Mesh(boxG(x - 0.05, x + 0.05, -M.H, 0, 0.3, 0.4), MAT.head); G.env.add(line);
    for (const y of [0, -M.H]) G.env.add(new THREE.Mesh(boxG(x - 0.5, x + 0.5, y - 0.05, y + 0.05, 0.3, 0.4), MAT.head));
    const lh = label(`H = ${fmt(M.H, 1)} m`, { size: 0.95, bg: 'rgba(240,163,58,0.95)', fg: '#1a1408', center: [0, 0.5] });
    lh.position.set(x + 0.6, -M.H / 2, 0.6); G.env.add(lh);
  }
  function waterTable(xdist, e) {
    // a fal mögötti talajvízszint (m, pozitív lefelé)
    if (!M.dewOut) return M.gw;
    const dd = Math.max(0, e + 0.5 - M.gw), R = 2.5 * M.H + 10;
    return M.gw + (xdist < R ? dd * Math.pow(1 - xdist / R, 2) : 0);
  }
  function buildFace(e) {
    const key = M.key + '|' + e.toFixed(1);
    if (key === faceKey) return; faceKey = key;
    disposeGroup(G.face);
    const hb = M.B / 2, tw = M.tw, bot = M.P.imper, Xb = M.Xb;
    const poly = (pts) => { const sh = new THREE.Shape(); pts.forEach(([x, y], i) => (i ? sh.lineTo(x, y) : sh.moveTo(x, y))); const m = new THREE.Mesh(new THREE.ShapeGeometry(sh), MAT.gwFace); m.position.z = 0.025; m.renderOrder = 5; G.face.add(m); };
    const lineMat = DASH.water;
    const dline = (pts, mat) => { const g = new THREE.BufferGeometry().setFromPoints(pts.map(([x, y]) => new THREE.Vector3(x, y, 0.06))); const l = new THREE.Line(g, mat); l.computeLineDistances(); l.renderOrder = 6; G.face.add(l); };
    if (M.gw < bot) {
      for (const sgn of [-1, 1]) {
        const xa = sgn * (hb + tw), xb = sgn * Xb, pts = [], top = [];
        for (let k = 0; k <= 30; k++) { const xx = xa + ((xb - xa) * k) / 30; const wt = Math.min(bot, waterTable(Math.abs(xx) - hb - tw, e)); top.push([xx, -wt]); }
        pts.push(...top, [xb, -bot], [xa, -bot]);
        poly(pts); dline(top, lineMat);
      }
      // a gödör alatt
      let inner = M.flood ? M.gw : M.seep ? Math.max(M.gw, e) : Math.max(M.gw, e + 0.5);
      if (!M.gwAbove) inner = M.gw;
      const itop = Math.max(inner, e);
      if (itop < bot) poly([[-hb - tw, -itop], [hb + tw, -itop], [hb + tw, -bot], [-hb - tw, -bot]]);
      const lg = label('▽ talajvíz', { size: 0.8, bg: 'rgba(47,134,201,0.92)', center: [0, 0] }); lg.position.set(-Math.min(Xb - 1.2, hb + tw + 15), -M.gw + 0.15, 0.5); G.face.add(lg);
    }
    // aktív csúszólap (konzolos, horgony, szegezés)
    if (M.sup === 'konzolos' || M.sup === 'horgony' || M.szeg) {
      const mat = DASH.slip;
      const w = M.H / Math.tan(M.theta);
      dline([[hb + tw, -M.H], [hb + tw + w, 0]], mat); dline([[-hb - tw, -M.H], [-hb - tw - w, 0]], mat);
    }
  }

  /* ---------------- fázisok */
  const wallEnd = () => (M.szeg ? 0 : 0.22);
  const slabEnd = () => wallEnd() + (M.sup === 'topdown' ? 0.06 : 0);
  function phaseInfo(p) {
    const we = wallEnd(), se = slabEnd();
    const wf = M.szeg ? 1 : clamp(p / Math.max(0.001, we), 0, 1);
    const ex = clamp((p - se) / (1 - se), 0, 1);
    return { wf, e: M.H * ex, topSlab: M.sup === 'topdown' && p >= we + 0.02, ex };
  }
  function applyPhase(p, dt = 0) {
    if (!M) return;
    const { wf, e, topSlab, ex } = phaseInfo(p);
    clipWall.constant = M.szeg ? 100 : -0.5 + (M.toe + 0.5) * wf;
    clipCap.constant = wf >= 1 ? 100 : -100;
    clipExc.constant = e + 0.02;
    buildUnder(e); buildFace(e);
    if (viewSeg.v === 'godor') G.face.children.forEach((c) => { if (c.isSprite) c.visible = false; });
    // támaszok láthatósága
    for (const L of levelGroups) {
      if (L.cols) L.g.visible = wf >= 1;
      else if (L.slab) L.g.visible = L.d === 0 ? topSlab : e >= L.d + 0.4;
      else L.g.visible = e >= L.d + 0.5;
    }
    if (anchFree) { const n = anchorDepths.filter((d) => e >= d + 0.5).length; anchFree.count = n; anchFix.count = n; anchFree.userData.heads.count = n; }
    if (nailMesh) nailMesh.count = nailDepths.filter((d) => e >= d + 0.4).length;
    // falmozgás a kiemeléssel nő
    const k = Math.pow(ex, 1.5) * M.dmax, fd = deflShape(M);
    for (const D of deform) {
      const p3 = D.mesh.geometry.attributes.position, L = D.local, arr = p3.array;
      for (let i = 0; i < p3.count; i++) {
        const X = L[i * 3], Y = L[i * 3 + 1], Z = L[i * 3 + 2];
        const dz = D.waler !== undefined ? fd(D.waler) : fd(-Y);
        D.map(X, Y, Z - k * dz * D.shape(X), arr, i * 3);
      }
      p3.needsUpdate = true;
    }
    // szomszéd épület dőlése (szemléltető, erősen túlzott)
    const tilt = clamp(M.risk * 2.2, 0, 4.5) * D2R * Math.pow(ex, 1.3);
    bPivot.rotation.z = tilt;
    bPivot.position.y = -3.5 - clamp(M.risk * 0.35, 0, 0.6) * ex;
    // víz
    let target = null;
    if (M.flood && e > M.gw) target = M.gw;
    else if (M.seep && e > M.gw) target = Math.max(M.gw, e - 0.7);
    if (target === null) waterLevel = null;
    else {
      if (waterLevel === null) waterLevel = e;
      waterLevel = dt ? Math.max(target, waterLevel - dt * 2.2) : target;
    }
    if (waterLevel !== null && e - waterLevel > 0.02) {
      if (!waterMesh) { waterMesh = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), MAT.water); waterMesh.renderOrder = 4; G.water.add(waterMesh); }
      const hb = M.B / 2, hgt = e - waterLevel;
      waterMesh.visible = true; waterMesh.scale.set(M.B, hgt, LP + 0.04); waterMesh.position.set(0, -e + hgt / 2, -LP / 2 + 0.02);
    } else if (waterMesh) waterMesh.visible = false;
    // kotró
    exc.visible = e > 1.2 && (playing || ex < 0.999);
    exc.position.set(-M.B / 4, -e, -LP * 0.55);
    // lépésszöveg
    stepEl.innerHTML = stepText(p, wf, e, topSlab);
    return target !== null && waterLevel !== null && Math.abs(waterLevel - target) > 0.01;
  }
  function stepText(p, wf, e, topSlab) {
    if (!M.szeg && wf < 1) return `<b>1.</b> A határoló fal készül (${M.W.t.toLowerCase()}, talpszint −${fmt(M.toe, 1)} m)`;
    if (M.sup === 'topdown' && e < 0.05) return `<b>2.</b> Zárófödém a terepszinten – a felszín visszaadható, alatta folyik a munka`;
    if (e < M.H - 0.01) {
      let extra = '';
      const done = levelGroups.filter((L) => !L.cols && L.g.visible).length;
      if (M.sup === 'horgony' && done) extra = ` · ${done}. horgonysor feszítve`;
      if (M.sup === 'cso' && done) extra = ` · ${done}. dúcsor beépítve`;
      if (M.sup === 'topdown' && done > 1) extra = ` · ${done - 1}. közbenső födém`;
      if (M.szeg) extra = ` · szegezés, háló, lőttbeton lépcsőnként`;
      return `<b>Kiemelés</b> −${fmt(e, 1)} m${extra}`;
    }
    return `<b>Kész</b> H = ${fmt(M.H, 1)} m · ${M.flood ? 'a gödör elárasztva!' : M.rs === 'bad' ? 'a szomszéd épület veszélyben!' : M.stat === 'bad' ? 'a fal túlterhelt!' : 'jöhet az alaplemez'}`;
  }

  /* ---------------- teljes újraépítés */
  function rebuild() {
    M = evaluate(S);
    M.key = JSON.stringify(S);
    underState = ''; faceKey = ''; waterLevel = null;
    buildSoil(); buildWalls(); buildSupports(); buildEnv();
    setXray(S.xray);
    applyPhase(P);
    renderList();
    setLabels(viewSeg.v);
    if (!camInit) { setView(viewSeg.v, true); camInit = true; }
    req();
  }
  let camInit = false;

  function renderList() {
    const order = { bad: 0, warn: 1, ok: 2, info: 3 };
    const items = [...M.items].sort((a, b) => order[a.s] - order[b.s]);
    const cnt = (s) => M.items.filter((i) => i.s === s).length;
    checkBox.innerHTML = '';
    checkBox.append(h('div', { class: 'sim-check-h' }, h('b', {}, 'Ellenőrző lista'), h('span', {}, `${PROFILES[S.prof].name} · ${M.W.t} · ${M.szeg ? 'szegezés' : SUPS[M.sup].toLowerCase()} · H = ${fmt(M.H, 1)} m`),
      h('span', { class: 'sim-sum' }, cnt('bad') ? h('span', { class: 'chip bad' }, `${cnt('bad')} hiba`) : null, cnt('warn') ? h('span', { class: 'chip warn' }, `${cnt('warn')} figyelmeztetés`) : null, h('span', { class: 'chip ok' }, `${cnt('ok')} rendben`))));
    const ul = h('ul', { class: 'sim-list' });
    for (const it of items) ul.append(h('li', { 'data-s': it.s }, h('i', {}, it.s === 'ok' ? '✓' : it.s === 'info' ? 'i' : it.s === 'bad' ? '✕' : '!'), h('b', {}, it.t), h('span', { html: it.d + (it.l ? ` <a href="${it.l}">Részletek →</a>` : '') })));
    checkBox.append(ul);
    // csempék
    oToe.set('', M.szeg ? null : (M.W.wt && M.gwAbove ? (M.reach ? 'ok' : 'warn') : null), M.szeg ? 'nincs fal' : '−' + fmt(M.toe, 1) + '<small>m</small>');
    oLev.set(M.szeg ? 'szegek' : M.sup === 'konzolos' ? 'nincs' : `${M.levels.length} ${M.sup === 'topdown' ? 'födém' : 'szint'}`, M.stat === 'bad' ? 'bad' : M.stat === 'warn' ? 'warn' : 'ok');
    if (M.sup === 'horgony') { const L = Math.max(...M.anchors.map((a) => a.L)); oLen.set(`max ${fmt(L, 1)}`, L > 30 ? 'bad' : L > 25 ? 'warn' : null, `max ${fmt(L, 1)}<small>m</small>`); }
    else if (M.sup === 'cso') oLen.set(`${fmt(M.B, 0)}`, M.B > 28 ? 'bad' : M.B > 25 ? 'warn' : null, `${fmt(M.B, 0)}<small>m fesztáv</small>`);
    else if (M.szeg) oLen.set(`${fmt((M.P.gran ? 1 : 0.8) * M.H, 1)}`, null, `${fmt((M.P.gran ? 1 : 0.8) * M.H, 1)}<small>m szeg</small>`);
    else oLen.set('–');
    oWater.set(M.flood ? 'elárasztva' : M.seep ? 'alulról szivárog' : M.gwAbove ? (M.dewOut ? 'leszívva' : 'száraz (zárt)') : 'nincs', M.flood ? 'bad' : M.seep ? 'bad' : M.dewOut ? 'warn' : 'ok');
    oNb.set(M.rs === 'ok' ? 'kicsi' : M.rs === 'warn' ? 'közepes' : 'nagy', M.rs);
    alertEl.innerHTML = '';
    const bad = M.items.filter((i) => i.s === 'bad').slice(0, 2);
    for (const b of bad) alertEl.append(h('span', { class: 'a-bad' }, b.t));
    if (!bad.length) alertEl.append(h('span', { class: M.items.some((i) => i.s === 'warn') ? 'a-warn' : 'a-ok' }, M.items.some((i) => i.s === 'warn') ? 'Működik – figyelmeztetésekkel' : 'Minden rendben'));
    // vezérlők állapota
    const szeg = S.wall === 'szeg';
    cSup.el.style.opacity = szeg ? 0.45 : 1; cSup.el.style.pointerEvents = szeg ? 'none' : '';
    const levOn = !szeg && (S.sup === 'horgony' || S.sup === 'cso');
    cLev.el.style.opacity = levOn ? 1 : 0.45; cLev.input.disabled = !levOn;
    supNote.textContent = szeg ? 'Szegezésnél a szegek maguk a megtámasztás.' : S.sup === 'topdown' ? 'A födémek kb. 3,5 m-enként követik egymást.' : S.sup === 'konzolos' ? 'Csak a befogás tart – nincs horgony, dúc.' : '';
  }

  /* ---------------- kamera */
  let tween = null;
  function viewPose(v) {
    const hb = M.B / 2, aspect = camera.aspect || 1.6, t = Math.tan((camera.fov / 2) * D2R);
    if (v === 'metszet') {
      const halfW = Math.max(hb + 16, 26), halfH = 17;
      const D = Math.max(halfH / t, halfW / (t * aspect));
      return { pos: [0, -7, D], tgt: [0, -8.5, 0] };
    }
    if (v === 'madar') return { pos: [-hb - 26, 34, 30], tgt: [0, -5, -LP / 2] };
    if (v === 'godor') return { pos: [hb - 2.2, -M.H + 1.8, -0.6], tgt: [-hb, -M.H * 0.4, -LP + 3] };
    const D = Math.max(54, ((hb + 24) / (t * aspect)) * (aspect < 1.3 ? 0.72 : 0.95));
    return { pos: [-D * 0.48, 15, D * 0.88], tgt: [0, -6, -5] };
  }
  function setView(v, instant = false) {
    if (!controls) return;
    const pose = viewPose(v);
    const to = { pos: new THREE.Vector3(...pose.pos), tgt: new THREE.Vector3(...pose.tgt) };
    if (instant) { camera.position.copy(to.pos); controls.target.copy(to.tgt); controls.update(); req(); return; }
    tween = { t0: performance.now(), from: { pos: camera.position.clone(), tgt: controls.target.clone() }, to };
    req();
  }
  const setLabels = (v) => { const on = v !== 'godor'; G.lab.visible = on; G.env.children.forEach((c) => { if (c.isSprite) c.visible = on; }); G.face.children.forEach((c) => { if (c.isSprite) c.visible = on; }); bPivot.children.forEach((c) => { if (c.isSprite) c.visible = on; }); };
  viewSeg.on((v) => { setLabels(v); setView(v); });

  /* ---------------- render-ciklus (csak ha kell) */
  let visible = false, pending = false, playing = false, lastT = 0, needsAnim = false;
  function req() { if (!pending && renderer) { pending = true; requestAnimationFrame(frame); } }
  function frame(t) {
    pending = false;
    const dt = lastT ? Math.min(0.05, (t - lastT) / 1000) : 0; lastT = t;
    let again = false;
    if (tween) {
      const k = clamp((t - tween.t0) / 900, 0, 1), s = k * k * (3 - 2 * k);
      camera.position.lerpVectors(tween.from.pos, tween.to.pos, s);
      controls.target.lerpVectors(tween.from.tgt, tween.to.tgt, s);
      controls.update();
      if (k >= 1) tween = null; else again = true;
    }
    if (playing) {
      P = Math.min(1, P + dt / 16);
      phase.set(Math.round(P * 100), false);
      again = true;
      if (P >= 1) { playing = false; playBtn.textContent = '↺ Újra'; }
      const sw = arm.userData.stick; arm.rotation.z = Math.sin(t / 420) * 0.25; sw.rotation.z = Math.sin(t / 300) * 0.35;
      needsAnim = applyPhase(P, dt);
    } else if (needsAnim) {
      needsAnim = applyPhase(P, dt); again = again || needsAnim;
    }
    if (visible) renderer.render(scene, camera);
    if (again || needsAnim) req(); else lastT = 0;
  }
  if (renderer) {
    new IntersectionObserver((es) => { visible = es[0].isIntersecting; if (visible) req(); }, { rootMargin: '50px' }).observe(stage);
    const resize = () => {
      const w = stage.clientWidth || 600;
      const hh = Math.round(w * (w < 560 ? 0.92 : w < 820 ? 0.72 : 0.62));
      stage.style.height = hh + 'px';
      renderer.setSize(w, hh, false);
      camera.aspect = w / hh; camera.updateProjectionMatrix();
      req();
    };
    new ResizeObserver(resize).observe(stage);
    resize();
  }

  /* ---------------- vezérlők bekötése */
  let rbPending = false;
  const schedule = () => { if (rbPending) return; rbPending = true; requestAnimationFrame(() => { rbPending = false; rebuild(); }); };
  cProf.on((v) => { S.prof = v; S.gw = PROFILES[v].gw; cGw.set(S.gw, false); schedule(); });
  cGw.on((v) => { S.gw = v; schedule(); });
  cDist.on((v) => { S.dist = v; schedule(); });
  cH.on((v) => { S.H = v; schedule(); });
  cB.on((v) => { S.B = v; schedule(); });
  cWall.on((v) => { S.wall = v; schedule(); });
  cSup.on((v) => { S.sup = v; schedule(); });
  cLev.on((v) => { S.lev = v; schedule(); });
  cDew.on((v) => { S.dew = v; schedule(); });
  cX.on((v) => { S.xray = v; setXray(v); req(); });
  phase.on((v) => { playing = false; playBtn.textContent = '▶ Építés'; P = v / 100; waterLevel = null; applyPhase(P); req(); });
  playBtn.addEventListener('click', () => {
    if (playing) { playing = false; playBtn.textContent = '▶ Folytatás'; return; }
    if (P >= 0.999) P = 0;
    playing = true; waterLevel = null; lastT = 0; playBtn.textContent = '❚❚ Szünet'; req();
  });
  onTheme(setBg);

  const PRESETS = {
    1: { prof: 'B', wall: 'berlini', sup: 'horgony', lev: 1, H: 8, B: 20, gw: 5, dew: false, dist: 6, xray: false, view: 'metszet' },
    2: { prof: 'A', wall: 'hezagos', sup: 'konzolos', lev: 1, H: 8, B: 20, gw: 16, dew: false, dist: 8, xray: false, view: 'ferde' },
    3: { prof: 'B', wall: 'res', sup: 'horgony', lev: 2, H: 12, B: 20, gw: 5, dew: false, dist: 3, xray: true, view: 'metszet' },
    4: { prof: 'C', wall: 'szeg', sup: 'konzolos', lev: 1, H: 6, B: 20, gw: 2, dew: false, dist: 8, xray: false, view: 'ferde' },
  };
  const applyPreset = (k) => {
    const p = PRESETS[k]; if (!p) return;
    Object.assign(S, p); delete S.view;
    cProf.set(p.prof, false); cWall.set(p.wall, false); cSup.set(p.sup, false); cLev.set(p.lev, false); cH.set(p.H, false); cB.set(p.B, false);
    cGw.set(p.gw, false); cDew.set(p.dew, false); cDist.set(p.dist, false); cX.set(p.xray, false);
    rebuild();
    viewSeg.set(p.view, false); setLabels(p.view); setView(p.view);
    P = 0; playing = true; waterLevel = null; lastT = 0; playBtn.textContent = '❚❚ Szünet'; req();
    root.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };
  $$('[data-sim-preset]').forEach((b) => b.addEventListener('click', () => applyPreset(b.dataset.simPreset)));

  setBg();
  rebuild();
  // első megjelenéskor egyszer lejátsszuk az építést
  if (renderer && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
    const io = new IntersectionObserver((es) => { if (es[0].isIntersecting) { io.disconnect(); P = 0; playing = true; lastT = 0; playBtn.textContent = '❚❚ Szünet'; req(); } }, { threshold: 0.35 });
    io.observe(stage);
  }
});
