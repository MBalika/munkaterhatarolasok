// 9. fejezet – Melyiket válasszam? Döntéstámogató + „Te vagy a tervező!” esettanulmány-játék
import { register, shell, slider, seg, toggle, select, h, svg, figure, clear, fmt, clamp } from './core.js';

/* ================================================================== DÖNTÉSTÁMOGATÓ */
// Minden opció: {id, t (név), href, kind: 'fal'|'tam', eval(p) → {x: kizáró ok | null, r: [[+/-pont, szöveg]]}}
const OPTS = [
  { t: 'Rézsűs kiemelés', href: '#rezsu', kind: 'fal', f: (p) => {
    const r = [], need = 1.5 * p.H + 2;
    if (p.dist < need) return { x: `Nincs hely a rézsűnek: kb. ${fmt(need, 0)} m kellene a szomszédig.`, r };
    r.push([20, 'A legegyszerűbb – nem kell mélyépítési technológia, ha van hely.']);
    r.push([-10, 'Nagy földtömeg mozgatása, deponálás és rétegenkénti visszatöltés.']);
    if (p.gw !== 'none') r.push([-30, 'Talajvíz: víztelenítés kell, és a vízszint emelkedése rézsűmozgást okozhat.']);
    if (p.soil === 'puha') r.push([-25, 'Puha talajban nagyon lapos rézsű kell.']);
    if (p.H > 4) r.push([-8, '3–5 m felett padka beépítése célszerű.']);
    if (p.B <= 3) r.push([-10, 'Keskeny árokhoz aránytalanul sok földmunka.']);
    return { r };
  } },
  { t: 'Munkaárok dúcolása (pallók, hevederek, dúcok)', href: '#ducolas', kind: 'fal', f: (p) => {
    const r = [];
    if (p.B > 3.5) return { x: 'Csak keskeny (jellemzően 1–3 m-es) munkaárkokhoz: szélesebb gödörben a dúcok kihajlanak.', r };
    r.push([25, 'Keskeny közműárokhoz a klasszikus megoldás: szembetámasz.']);
    if (p.H > 6) r.push([-15, '6 m-nél mélyebb ároknál lépcsős dúcolás kell.']);
    if (p.gw === 'high') r.push([-30, 'A pallózás nem vízzáró – víztelenítés kell.']);
    if (p.soil === 'szemcses') r.push([-5, 'Durvaszemcsés talajban m₀ = 0: csak előrevert (acél) pallózás jöhet szóba.']);
    if (p.life === 'veg') r.push([-25, 'Ideiglenes megoldás – a vezeték elkészülte után visszatemetik.']);
    return { r };
  } },
  { t: 'Táblás dúcolat (dúcolókeret)', href: '#tablas', kind: 'fal', f: (p) => {
    const r = [];
    if (p.B > 4.5) return { x: 'Előregyártott táblák csak árokszélességig (kb. 4 m-ig) gazdaságosak.', r };
    if (p.H > 8.5) return { x: 'Kb. 6 m (doboz), csúszósínes rendszerrel kb. 8,5 m mélységig.', r };
    r.push([30, 'Sokszor felhasználható, gyorsan beemelhető – bármilyen talajban, a földfal sosem áll szabadon.']);
    if (p.gw === 'high') r.push([-20, 'Nem vízzáró: víztelenítés kell.']);
    if (p.life === 'veg') r.push([-30, 'Csak ideiglenes.']);
    return { r };
  } },
  { t: 'Berlini (Siemens) dúcolat', href: '#berlini', kind: 'fal', f: (p) => {
    const r = [];
    if (p.gw === 'high') return { x: 'Nem vízzáró: a pallók között átszivárog a víz – csak talajvíz felett (vagy vízszint-süllyesztéssel).', r };
    r.push([20, 'Száraz, nem túl mély munkagödrök egyik leggazdaságosabb ideiglenes megtámasztása.']);
    if (p.gw === 'slight') r.push([-30, 'A víz a kiemelési sík fölé ér: talajvízszint-süllyesztés kellene.']);
    if (p.H > 15) r.push([-25, 'Jellemzően 12–15 m-ig gazdaságos.']);
    if (p.soil === 'puha' || p.soil === 'feltoltes') r.push([-20, 'Laza, puha anyag a pallók között kifolyhat, kipereghet.']);
    if (p.B <= 3) r.push([-10, 'Keskeny árokhoz drágább, mint a dúcolat.']);
    if (p.vib) r.push([-3, 'Verés helyett furatba helyezett tartók kellenek (zajvédelem).']);
    if (p.life === 'veg') r.push([-25, 'Ideiglenes szerkezet.']);
    if (p.dist < 4) r.push([-10, 'Hajlékony fal: közvetlenül épület mellett nagyobb lehet a mozgás.']);
    r.push([-5, 'Nagy élőmunka-igény.']);
    return { r };
  } },
  { t: 'Jet-grouting fal', href: '#jetfal', kind: 'fal', f: (p) => {
    const r = [];
    r.push([5, 'Berlini elvű fal acéltagokkal, de kvázi vízzáró, és nem kell pallózás, furatkitöltés.']);
    if (p.gw === 'slight') r.push([20, 'Talajvíz feletti vagy kissé talajvíz alatti kiemeléshez való.']);
    if (p.gw === 'high') r.push([-10, 'Nagy víznyomásnál a vízzárás a sok oszlop-csatlakozás miatt kényes.']);
    if (p.H <= 8) r.push([10, 'Jellemző terület: 1–2 szintes mélygarázs, utólagos hozzáépítés.']); else r.push([-15, 'Mélyebb gödörnél ritkán gazdaságos.']);
    if (p.dist < 5) r.push([15, 'Kis géppel, rezgésmentesen, meglévő épület mellett is készülhet.']);
    if (p.vib) r.push([8, 'Rezgésmentes.']);
    if (p.life === 'veg') r.push([-10, 'Jellemzően ideiglenes.']);
    if (p.B <= 3) r.push([-20, 'Keskeny árokhoz nem gazdaságos.']);
    r.push([-5, 'Sok iszap keletkezik, az átmérő talajfüggő.']);
    return { r };
  } },
  { t: 'Erősített önszilárduló zagyfal', href: '#zagyfal', kind: 'fal', f: (p) => {
    const r = [];
    if (p.H > 10) return { x: 'Jellemzően legfeljebb 7–10 m mély munkaterekhez.', r };
    if (p.life === 'veg') return { x: 'Ideiglenes munkatérhatárolásra való.', r };
    if (p.gw === 'high') r.push([25, 'Magas talajvíz mellett kvázi vízzáró: a berlini dúcolat és a résfal előnyeit egyesíti.']);
    if (p.gw === 'none') r.push([-15, 'Talajvíz nélkül a vízzárás előnye kihasználatlan.']);
    if (p.gw === 'high' && p.imp) r.push([10, 'Gazdaságos, ha a vízzáró réteg jóval mélyebben van, mint a fal statikailag szükséges talpa (az acél csak addig kell).']);
    if (p.dist < 5) r.push([-25, 'Süllyedésérzékeny szerkezet vagy nagy felszíni teher mellett nem javasolt.']);
    if (p.soil === 'puha' || p.soil === 'feltoltes') r.push([-20, 'A résállékonyság szempontjából kedvezőtlen talaj.']);
    if (p.B <= 3) r.push([-25, 'Keskeny árokhoz nem gazdaságos.']);
    return { r };
  } },
  { t: 'Erősített mélykeveréses fal (CSM, colmix, trenchmix)', href: '#dsmfal', kind: 'fal', f: (p) => {
    const r = [];
    if (p.life === 'veg') r.push([-15, 'Jellemzően ideiglenes.']);
    if (p.gw !== 'none') r.push([15, 'Munkatérhatároló és vízszivárgás-gátló fal.']);
    if (p.soil === 'feltoltes') r.push([-25, 'Törmelékes feltöltés akadályozza a keverést.']);
    if (p.soil === 'kemeny') r.push([-20, 'Kemény, köves talajban nehezen keverhető.']);
    if (p.soil === 'puha') r.push([-5, 'Szerves, puha talajban a kötés bizonytalan.']);
    if (p.vib) r.push([8, 'Rezgésmentes, kevés kitermelt föld.']);
    if (p.dist < 3) r.push([-5, 'Nagy gép és keverőtelep kell.']);
    if (p.B <= 3) r.push([-25, 'Keskeny árokhoz nem gazdaságos.']);
    return { r };
  } },
  { t: 'Acél szádfal', href: '#szadfal', kind: 'fal', f: (p) => {
    const r = [];
    if (p.gw !== 'none') r.push([25, 'Hornyos zárak: vízzáró fal, a vízzáró rétegbe kötve kizárja a talajvizet.']);
    else r.push([5, 'Gyors, szűk helyen is építhető.']);
    if (p.vib && p.dist < 25) r.push([-35, 'A lehajtás rezgése 20–30 m-re is elhat – szigorú korlátnál csak besajtolás jöhet szóba.']);
    else if (p.dist < 10) r.push([-10, 'Szomszéd épület közelében a rezgést vizsgálni kell.']);
    if (p.soil === 'feltoltes') r.push([-25, 'Törmelékes feltöltésben a palló elakad – előfúrás kell.']);
    if (p.soil === 'kemeny') r.push([-20, 'Kemény, köves agyagban, kőpadban előfúrás kell.']);
    if (p.soil === 'puha') r.push([5, 'Puha talajban akár sajtolva is lehajtható.']);
    if (p.life === 'ide') r.push([10, 'Ideiglenes falnál visszahúzható, újra felhasználható.']); else r.push([-5, 'Végleges falnál korrózióvédelem kell.']);
    if (p.H > 15) r.push([-10, 'Nagy mélységnél hosszú pallók, több dúc-/horgonyszint.']);
    return { r };
  } },
  { t: 'Hézagos cölöpfal', href: '#colopfal', kind: 'fal', f: (p) => {
    const r = [];
    if (p.gw === 'high') return { x: 'Nem vízzáró – talajvíz alatti kiemeléshez nem jó.', r };
    if (p.soil === 'puha') return { x: 'Puha talaj nem boltozódik át a cölöpök között.', r };
    if (p.gw === 'slight') r.push([-25, 'Csak szezonális rétegvíz kezelhető (felületszivárgó, dréncsövek).']);
    if (p.soil === 'kemeny') r.push([30, 'Kemény agyagban, puha kőzetben ideális: kevés cölöp is elég.']);
    if (p.soil === 'szemcses') r.push([-25, 'Szemcsés talaj kipereg a hézagokon – érintkező fal kell.']);
    if (p.dist < 6) r.push([12, 'Szűk városi telken, rezgésmentesen (CFA) készül.']);
    if (p.life === 'veg') r.push([8, 'Végleges fal is lehet (pl. útbevágás).']);
    if (p.B <= 3) r.push([-25, 'Keskeny árokhoz nem gazdaságos.']);
    return { r };
  } },
  { t: 'Érintkező cölöpfal', href: '#colopfal', kind: 'fal', f: (p) => {
    const r = [];
    if (p.gw === 'high') return { x: 'Nem vízzáró.', r };
    if (p.soil === 'szemcses') r.push([18, 'Ha a talaj önmagában nem állékony, de vízzárás nem kell.']);
    if (p.gw === 'slight') r.push([-20, 'A cölöpök közti réseken átszivároghat a víz.']);
    if (p.dist < 6) r.push([10, 'Rezgésmentes, merev fal.']);
    if (p.B <= 3) r.push([-25, 'Keskeny árokhoz nem gazdaságos.']);
    return { r };
  } },
  { t: 'Összemetsző cölöpfal', href: '#colopfal', kind: 'fal', f: (p) => {
    const r = [];
    if (p.gw !== 'none') r.push([20, 'Vízzáró fal: minden második (szekunder) cölöp vasalt.']);
    r.push([-12, 'A résfallal szemben csak speciális esetben gazdaságos.']);
    if (p.dist < 6) r.push([10, 'Rezgésmentes, merev.']);
    if (p.H > 18) r.push([-10, 'Mélyen a cölöpök ferdesége miatt elfogyhat az átfedés.']);
    if (p.B <= 3) r.push([-25, 'Keskeny árokhoz nem gazdaságos.']);
    return { r };
  } },
  { t: 'Résfal', href: '#resfal', kind: 'fal', f: (p) => {
    const r = [];
    if (p.gw !== 'none') r.push([22, 'Vízzáró, a vízzáró rétegbe kötve kizárja a talajvizet.']);
    if (p.H > 10) r.push([15, 'Nagy mélységre is merev, kis deformációjú fal.']);
    if (p.H < 6) r.push([-20, 'Kis mélységre drága.']);
    if (p.dist < 6) r.push([12, 'Szomszéd épületek mellett, rezgésmentesen.']);
    if (p.life === 'veg') r.push([18, 'Egyben a végleges pincefal, sőt alapozás is lehet.']);
    if (p.B <= 3) r.push([-30, 'Keskeny árokhoz nem való.']);
    return { r };
  } },
  { t: 'Talajszegezés', href: '#szegezes', kind: 'fal', f: (p) => {
    const r = [];
    if (p.gw === 'high') return { x: 'Magas (áramló) talajvíz esetén nem alkalmazható – csak folyamatos víztelenítés mellett.', r };
    if (p.soil === 'puha') return { x: 'Puha, plasztikus agyagban, szerves talajban nem alkalmazható.', r };
    if (p.soil === 'feltoltes') return { x: 'Törmelékes feltöltésben nem alkalmazható.', r };
    r.push([18, 'Relatíve olcsó, egyszerű eszközökkel, rugalmasan módosítható.']);
    if (p.gw === 'slight') r.push([-25, 'A talajvíz miatt víztelenítés kell.']);
    if (p.soil === 'szemcses') r.push([-12, 'Laza vagy telített szemcsés talaj nem áll meg a 0,9–1,8 m-es lépcsőkben.']);
    if (p.soil === 'kemeny') r.push([8, 'Kemény agyagban fúrt-injektált szegekkel.']);
    if (!p.anch && p.dist < 1.2 * p.H) r.push([-30, `A szegek 0,6–1,2·H hosszan a szomszéd telek alá nyúlnának (közművek!).`]);
    if (p.B <= 3) r.push([-25, 'Keskeny árokhoz nem való.']);
    if (p.H > 12) r.push([-8, 'Nagy mélységnél hosszú szegek, nagy alakváltozás.']);
    return { r };
  } },
  { t: 'Fagyasztott fal', href: '#fagyasztas', kind: 'fal', f: (p) => {
    const r = [];
    if (p.life === 'veg') return { x: 'Ideiglenes megoldás: a hűtés leállítása után felenged.', r };
    if (p.gw === 'none') return { x: 'Víztelített talaj kell – száraz talajban nincs mit megfagyasztani.', r };
    r.push([5, 'Egyszerre vízzáró és teherbíró, szinte bármilyen víztelített talajban.']);
    r.push([-30, 'Drága, energiaigényes, lassú – akkor jön szóba, ha más megoldás nem működik (alagutak, aknák).']);
    if (p.dist < 6) r.push([-5, 'Fagyemelés és olvadási süllyedés veszélyezteti a szomszédot.']);
    return { r };
  } },
  // megtámasztások
  { t: 'Konzolos fal (nincs külön megtámasztás)', href: '#statika', kind: 'tam', f: (p) => {
    const r = [];
    if (p.H > 6) return { x: 'Konzolosan csak kb. 4–6 m kiemelési mélységig állékony.', r };
    if (p.B <= 3) return { x: 'Keskeny árokban a szembetámasz (dúcolás) az egyszerűbb.', r };
    if (p.H <= 4) r.push([30, 'Kis mélységnél a befogás (passzív földellenállás) elég.']); else r.push([5, 'Határeset: 4–6 m.']);
    if (p.dist < p.H) r.push([-25, 'Közvetlenül mellette álló építménynél a konzolos fal mozgása túl nagy.']);
    return { r };
  } },
  { t: 'Belső dúcolás (szembetámasz, ferde dúcok)', href: '#szeles', kind: 'tam', f: (p) => {
    const r = [];
    if (p.B <= 3) r.push([30, 'Keskeny árokban a két földfal egymásnak támasztható.']);
    else if (p.B <= 10) r.push([0, 'Kb. 3 m felett a dúcok kihajlanak: több irányú merevítés vagy ferde dúc kell.']);
    else r.push([-25, 'Széles gödörben nehézkes – csőtámasz vagy horgony kell.']);
    if (p.life === 'veg') r.push([-10, 'Csak a pincefalak és födémek elkészültéig marad.']);
    return { r };
  } },
  { t: 'Talajhorgony', href: '#horgony', kind: 'tam', f: (p) => {
    const r = [];
    if (!p.anch) return { x: 'A 15–20 m hosszú horgonyok a szomszéd telek alá nyúlnának – nincs hozzájárulás vagy hely.', r };
    if (p.B <= 3) return { x: 'Keskeny árokhoz nem kell.', r };
    if (p.H <= 4) r.push([-10, 'Kis mélységnél még a konzolos fal is elég lehet.']);
    r.push([18, '„Tiszta”, dúcmentes munkatér.']);
    if (p.H > 6) r.push([10, 'Mélyebb gödörnél egy vagy több horgonysor.']);
    if (p.soil === 'puha') r.push([-30, 'Puha, szerves talajban a befogott szakasz nem ad elég teherbírást.']);
    if (p.life === 'veg') r.push([-10, 'Végleges horgony: szigorúbb korrózióvédelem, utánfeszíthetőség.']);
    if (p.dist < 8) r.push([-5, 'Pincébe, közműbe ütközhet – előtte fel kell térképezni.']);
    return { r };
  } },
  { t: 'Acél csőtámaszok', href: '#csotamasz', kind: 'tam', f: (p) => {
    const r = [];
    if (p.B > 40) return { x: 'Ilyen fesztávra a csőtámasz már nem gazdaságos (toldás, közbenső alátámasztás).', r };
    if (p.B <= 3) return { x: 'Keskeny árokban egyszerű dúcolás elég.', r };
    if (p.H <= 4) r.push([-15, 'Kis mélységnél felesleges.']);
    if (p.B <= 25) r.push([18, 'Szűk, közel derékszögű gödrök, aluljárók, metróállomások jellemző megtámasztása.']); else r.push([-5, 'Hosszú csöveknél a hőtágulás és a kihajlás meghatározó.']);
    if (!p.anch) r.push([20, 'Akkor gazdaságos, ha horgonyozni nem lehet.']);
    if (p.H > 15 && p.dist < 8) r.push([15, 'Merev rendszer: kis falmozgás érzékeny szomszéd mellett.']);
    r.push([-5, 'Nehezíti a földkiemelést és a belső szerkezet építését.']);
    return { r };
  } },
  { t: 'Támaszfödém (top-down / milánói módszer)', href: '#topdown', kind: 'tam', f: (p) => {
    const r = [];
    if (p.life === 'ide') return { x: 'A födémek az épület végleges részei – ideiglenes munkatérhez nem való.', r };
    if (p.B <= 3) return { x: 'Keskeny árokhoz nem való.', r };
    if (p.H < 6) r.push([-20, 'Kis mélységnél nem éri meg a bonyolult technológiát.']); else r.push([12, 'Mély pincéknél a födémek tárcsaként, nagyon mereven támasztanak.']);
    if (p.dist < 6) r.push([15, 'Érzékeny szomszédok mellett kicsi a falmozgás.']);
    r.push([5, 'A fel- és alépítmény egyszerre épülhet, a felszín hamar visszakapható.']);
    r.push([-5, 'Kiemelés a födém alatt, szűk térben (szellőzés, világítás).']);
    return { r };
  } },
  { t: 'Passzív hátrahorgonyzás', href: '#passziv', kind: 'tam', f: (p) => {
    const r = [];
    const need = 1.2 * p.H + 3;
    if (p.dist < need) return { x: `A horgonyfalnak a szakadólapon kívül kellene lennie (kb. ${fmt(need, 0)} m) – nincs hely.`, r };
    if (p.B <= 3) return { x: 'Keskeny árokhoz nem kell.', r };
    r.push([12, 'Egyszerű: a fal egy hátrébb levert tartóhoz/cölöpsorhoz van kikötve.']);
    r.push([-6, 'Feszítés nélkül a fal mozgása nagyobb (néhány cm).']);
    if (p.life === 'veg') r.push([8, 'Partfalaknál, nyitott aluljáróknál végleges szerkezetként is gyakori.']);
    return { r };
  } },
];

function evaluate(p) {
  return OPTS.map((o) => {
    const e = o.f(p);
    if (e.x) return { ...o, score: 0, excl: e.x, r: [] };
    const s = clamp(50 + e.r.reduce((a, b) => a + b[0], 0), 3, 100);
    return { ...o, score: s, excl: null, r: e.r };
  });
}

const PRESETS = [
  { t: 'Közműárok', p: { H: 2.5, B: 1.2, gw: 'none', soil: 'szemcses', dist: 3, anch: false, life: 'ide', vib: true, imp: false } },
  { t: 'Pince kemény agyagban', p: { H: 4, B: 20, gw: 'none', soil: 'kemeny', dist: 5, anch: false, life: 'ide', vib: true, imp: false } },
  { t: 'Mélygarázs talajvízben', p: { H: 8, B: 30, gw: 'high', soil: 'szemcses', dist: 1, anch: false, life: 'veg', vib: true, imp: true } },
  { t: 'Metróállomás', p: { H: 22, B: 22, gw: 'high', soil: 'szemcses', dist: 3, anch: false, life: 'veg', vib: true, imp: true } },
  { t: 'Szabad telek, ideiglenes', p: { H: 7, B: 40, gw: 'high', soil: 'szemcses', dist: 40, anch: true, life: 'ide', vib: false, imp: true } },
];

register('decide', (root) => {
  const { ctrls, viz } = shell(root, { out: false, foot: '<b>Szemléltető pontozás</b> a jegyzetben felsorolt alkalmazási feltételek alapján (+/− pontok, kizáró okok). Valós döntésnél a költség, a határidő, a rendelkezésre álló gépek és a helyi tapasztalat is számít – és mindig statikai számítás kell.' });
  const pre = h('div', { class: 'stepbtns' });
  ctrls.append(h('div', { class: 'ctl' }, h('span', { class: 'ctl-lab' }, 'Mintafeladatok'), pre));
  const H = slider(ctrls, { label: 'Kiemelési mélység', sym: 'H', min: 1, max: 25, step: 0.5, value: 8, unit: 'm' });
  const B = slider(ctrls, { label: 'A gödör (árok) szélessége', sym: 'B', min: 1, max: 60, step: 0.5, value: 30, unit: 'm' });
  const gw = seg(ctrls, { label: 'Talajvíz', vert: true, options: [{ v: 'none', t: 'Nincs / a kiemelési sík alatt' }, { v: 'slight', t: 'Kissé a sík felett (≤ 1–2 m)' }, { v: 'high', t: 'Jóval a kiemelési sík felett' }], value: 'high' });
  const imp = toggle(ctrls, { label: 'Vízzáró réteg elérhető mélységben', value: true });
  const soil = select(ctrls, { label: 'Talaj', options: [
    { v: 'koto', t: 'Kötött (közepes agyag, iszap)' }, { v: 'kemeny', t: 'Kemény agyag / puha kőzet' }, { v: 'szemcses', t: 'Szemcsés (homok, kavics)' },
    { v: 'puha', t: 'Puha agyag / szerves talaj' }, { v: 'feltoltes', t: 'Törmelékes feltöltés' }], value: 'szemcses' });
  const dist = slider(ctrls, { label: 'Legközelebbi épület / telekhatár', min: 0, max: 40, step: 0.5, value: 2, unit: 'm' });
  const anch = toggle(ctrls, { label: 'Horgonyozhatunk a szomszéd telek alatt', value: false });
  const life = seg(ctrls, { label: 'Élettartam', options: [{ v: 'ide', t: 'Ideiglenes' }, { v: 'veg', t: 'Végleges' }], value: 'veg' });
  const vib = toggle(ctrls, { label: 'Szigorú zaj- és rezgéskorlát', value: true });
  const res = h('div', { class: 'kd-res' });
  viz.append(res);
  const all = [H, B, gw, imp, soil, dist, anch, life, vib];
  PRESETS.forEach((ps) => pre.append(h('button', { type: 'button', onclick: () => {
    H.set(ps.p.H, false); B.set(ps.p.B, false); gw.set(ps.p.gw, false); soil.set(ps.p.soil, false); dist.set(ps.p.dist, false);
    anch.set(ps.p.anch, false); life.set(ps.p.life, false); vib.set(ps.p.vib, false); imp.set(ps.p.imp, false); upd();
  } }, ps.t)));

  const item = (o, i) => {
    const st = o.excl ? 'bad' : o.score >= 70 ? 'ok' : o.score >= 45 ? 'warn' : 'bad';
    const li = h('li', { class: 'kd-opt', 'data-s': st },
      h('span', { class: 'kd-rank' }, o.excl ? '✗' : String(i + 1)),
      h('div', { class: 'kd-main' },
        h('div', { class: 'kd-top' }, h('a', { href: o.href }, o.t), h('span', { class: 'kd-score' }, o.excl ? 'kizárva' : `${Math.round(o.score)} pont`)),
        o.excl ? null : h('div', { class: 'kd-bar' }, h('i', { style: { width: o.score + '%' } })),
        h('ul', { class: 'kd-why' }, ...(o.excl ? [h('li', { class: 'neg' }, o.excl)] : o.r.map(([v, s]) => h('li', { class: v > 0 ? 'pos' : v < 0 ? 'neg' : 'neu' }, s))))));
    return li;
  };
  function upd() {
    imp.el.style.opacity = gw.v === 'none' ? 0.45 : 1;
    const p = { H: H.v, B: B.v, gw: gw.v, imp: imp.v, soil: soil.v, dist: dist.v, anch: anch.v, life: life.v, vib: vib.v };
    const ev = evaluate(p);
    clear(res);
    for (const [kind, title, n] of [['fal', 'Határoló szerkezet', 4], ['tam', 'Megtámasztás', 3]]) {
      const list = ev.filter((o) => o.kind === kind);
      const ok = list.filter((o) => !o.excl).sort((a, b) => b.score - a.score);
      const ex = list.filter((o) => o.excl);
      const box = h('div', { class: 'kd-col' }, h('h5', { class: 'kd-h' }, title));
      const ol = h('ol', { class: 'kd-list' });
      ok.slice(0, n).forEach((o, i) => ol.append(item(o, i)));
      box.append(ol);
      const rest = ok.slice(n);
      if (rest.length || ex.length) {
        const det = h('details', { class: 'kd-more' }, h('summary', {}, `További ${rest.length} lehetőség és ${ex.length} kizárt megoldás`));
        const ol2 = h('ol', { class: 'kd-list' });
        rest.forEach((o, i) => ol2.append(item(o, n + i)));
        ex.forEach((o) => ol2.append(item(o, 0)));
        det.append(ol2); box.append(det);
      }
      res.append(box);
    }
    // összefoglaló figyelmeztetések
    const notes = [];
    if (p.gw === 'high' && !p.imp) notes.push('A vízzáró réteg nem érhető el: a fal alatt alulról is bejön a víz – lehorgonyzott víz alatti alaplemez, injektált fenékzárás vagy talajvízszint-süllyesztés kell. <a href="#vizalatti">→ Víz alatti alaplemez</a>');
    if (p.gw !== 'none') notes.push('Talajvíz alatti kiemelésnél a víztelenítést a munkatérhatárolással együtt kell megtervezni.');
    if (p.H > 15 && p.dist < 8) notes.push('Mély gödör érzékeny szomszéd mellett: merev fal (résfal, összemetsző cölöpfal) + merev megtámasztás (csőtámasz, támaszfödém) a cél.');
    if (notes.length) res.append(h('div', { class: 'callout figyelem kd-note' }, h('b', { class: 't' }, 'Ne feledd'), h('p', { html: notes.join('<br>') })));
  }
  all.forEach((c) => c.on(upd));
  upd();
});

/* ================================================================== „TE VAGY A TERVEZŐ!” */
// vázlat: {kind:'arok'|'godor'|'folyo'|'akna'|'bevagas', H, gw (m a terep alatt, null = nincs), nb: szomszéd ('hz'|null), imp: vízzáró réteg mélysége}
const CASES = [
  { t: 'Közműárok forgalmas utcában', d: '2,5 m mély, 1,2 m széles csatornaárok, finom homok, talajvíz nincs. Mellette forgalmas út, a szakaszok gyorsan haladnak.',
    sk: { kind: 'arok', H: 2.5, gw: null, nb: 'ut' },
    o: ['Táblás dúcolat, ásással együtt süllyesztve', 'Állított pallózás: előbb teljes mélységig kiemelünk', 'Rézsűs kiemelés', 'Talajszegezés'], c: 0,
    e: 'Homokban m₀ ≈ 0: a földfal megtámasztás nélkül egy pillanatig sem áll meg, ezért az állított pallózás kizárt. A táblás dúcolat gyorsan beemelhető, sokszor felhasználható, és süllyesztve a fal sosem áll szabadon. Rézsűhöz nincs hely, a szegezés pedig nem árokra való.' },
  { t: 'Egyszintes pince a belvárosban', d: '4 m mély munkagödör nagyon kemény agyagban, talajvíz mélyen. Szűk telek, a szomszéd ház 5 m-re áll.',
    sk: { kind: 'godor', H: 4, gw: null, nb: 'hz', soil: 'kemeny' },
    o: ['Hézagos cölöpfal (CFA)', 'Acél szádfal vibrálva', 'Fagyasztott fal', 'Rézsűs kiemelés'], c: 0,
    e: 'A jegyzet szerint hazánkban a hézagos cölöpfal terjedt el nagyon kemény agyagban, talajvizet el nem érő, szűk városi munkatereknél: a talaj átboltozódik a cölöpök között, kevés cölöp elég. A szádfal kemény agyagban nehezen hajtható le, és a rezgés a szomszédot veszélyezteti.' },
  { t: 'Kétszintes mélygarázs talajvízben', d: '8 m mély gödör homokos kavicsban, a talajvíz 2 m-rel a felszín alatt, 14 m-en vízzáró agyag. Közvetlenül a telekhatáron régi házak állnak, horgonyozni nem lehet.',
    sk: { kind: 'godor', H: 8, gw: 2, nb: 'hz', imp: 14 },
    o: ['Résfal + támaszfödém (top-down)', 'Berlini dúcolat + talajhorgonyok', 'Acél szádfal vibrálva + horgonyok', 'Hézagos cölöpfal konzolosan'], c: 0,
    e: 'Vízzáró, merev fal kell a vízzáró agyagba kötve (résfal), és horgony nélküli, merev megtámasztás (a födémek tárcsaként). A berlini dúcolat és a hézagos cölöpfal nem vízzáró, a szádfal rezgése és a horgonyok pedig a szomszédok miatt nem jöhetnek szóba.' },
  { t: 'Hídpillér a folyó medrében', d: 'Új hídpillér alapozása 6 m mély vízben, homokos-kavicsos mederben.',
    sk: { kind: 'folyo', H: 6 },
    o: ['Egyfalú, merevített szádfalgát + víz alatti betondugó', 'Földgát agyagmaggal', 'Berlini dúcolat', 'Talajszegezés'], c: 0,
    e: 'Hídpillérnél a tipikus megoldás a merevített szádfal-„doboz”: a merevítő keret egyben sablon, a víz alatti betondugó súlya tart a felhajtóerő ellen. Földgát ekkora vízmélységnél nagyon széles lenne, szűkítené a medret.' },
  { t: 'Ideiglenes gödör magas talajvíz mellett', d: '7 m mély ideiglenes munkagödör szabad telken, magas talajvíz. A vízzáró réteg 18 m mélyen van – jóval a fal statikailag szükséges talpa alatt. A falat később el kell bontani.',
    sk: { kind: 'godor', H: 7, gw: 1, nb: null, imp: 18 },
    o: ['Erősített önszilárduló zagyfal', 'Hézagos cölöpfal', 'Talajszegezés', 'Berlini dúcolat'], c: 0,
    e: 'Pontosan ez a zagyfal gazdaságos alkalmazási területe: magas talajvíz, kb. 7–8 m mély ideiglenes munkatér, a kvázi vízzáró fal a mély vízzáró rétegig ér, de az acélgerendák csak a statikailag szükséges mélységig. A többi felsorolt megoldás nem vízzáró.' },
  { t: 'Bevágás megtámasztása út mellett', d: '5 m magas, közel függőleges bevágás kötött talajban, talajvíz nincs. Olcsó, gyors, rugalmasan módosítható megoldás kell.',
    sk: { kind: 'bevagas', H: 5, gw: null },
    o: ['Talajszegezés lőttbetonnal', 'Fagyasztott fal', 'Résfal', 'Egyfalú szádfalgát'], c: 0,
    e: 'A talajszegezés relatíve olcsó, egyszerű eszközökkel készül, jól adaptálható és módosítható. Kötött talajban, talajvíz nélkül jól működik; végleges alkalmazásnál korrózióvédelem kell (epoxi, PE-tok).' },
  { t: 'Metróállomás a belvárosban', d: '25 m mély, 20 m széles munkagödör, sűrű beépítés, a szomszédok alatt pincék és közművek – horgonyt nem lehet építeni.',
    sk: { kind: 'godor', H: 25, gw: 4, nb: 'hz', imp: 32 },
    o: ['Résfal + acél csőtámaszok (több szinten)', 'Berlini dúcolat + talajhorgonyok', 'Konzolos szádfal', 'Passzív hátrahorgonyzás'], c: 0,
    e: 'A jegyzet szerint a csőtámasz akkor gazdaságos, ha horgonyozni nem lehet, a munkatér 15–20 m-nél mélyebb, és a szomszéd szerkezetek mozgása kritikus: metróállomások jellemző támaszrendszere. A résfal vízzáró és merev. A top-down is jó lehet – a lényeg a merev, horgony nélküli megtámasztás.' },
  { t: 'Alagút-keresztjárat víztelített homokban', d: 'Két alagútcső közötti keresztjárat 18 m mélyen, víztelített homokban – a felszínről nem lehet falat építeni.',
    sk: { kind: 'akna', H: 18, gw: 2 },
    o: ['Talajfagyasztás (fagyasztott fal)', 'Acél szádfal', 'Berlini dúcolat', 'Talajszegezés'], c: 0,
    e: 'A fagyasztott talaj egyszerre vízzáró és teherbíró – ideiglenesen, szinte bármilyen víztelített talajban, akár az alagútból fúrt csövekkel. Drága és lassú, de itt a többi megoldás meg sem építhető.' },
];

function sketch(s, sk) {
  const g = svg('g', {}, s);
  const W = 360, Hh = 200, top = 60, pxm = Math.min(6, 120 / Math.max(6, sk.H + 4));
  svg('rect', { x: 0, y: 0, width: W, height: Hh, class: 'f-sky' }, g);
  if (sk.kind === 'folyo') {
    const bed = 150, wl = bed - sk.H * 12;
    svg('rect', { x: 0, y: bed, width: W, height: Hh - bed, class: 'f-soilD' }, g);
    svg('rect', { x: 0, y: bed, width: W, height: Hh - bed, fill: 'url(#pat-gravel)' }, g);
    svg('rect', { x: 0, y: wl, width: W, height: bed - wl, class: 'f-water' }, g);
    svg('rect', { x: 0, y: wl, width: W, height: bed - wl, fill: 'url(#pat-water)' }, g);
    svg('rect', { x: 150, y: bed - 34, width: 60, height: 34, class: 'f-conc2', opacity: 0.6, 'stroke-dasharray': '4 3', stroke: 'var(--ink)' }, g);
    txt2(g, 180, bed - 40, 'leendő pillér', 'middle');
    txt2(g, 10, wl - 6, `vízmélység ${fmt(sk.H, 0)} m`);
    return;
  }
  const yG = top;
  svg('rect', { x: 0, y: yG, width: W, height: Hh - yG, class: sk.soil === 'kemeny' ? 'f-soilE' : 'f-soilA' }, g);
  svg('rect', { x: 0, y: yG, width: W, height: Hh - yG, fill: sk.soil === 'kemeny' ? 'url(#pat-clay)' : 'url(#pat-sand)' }, g);
  if (sk.imp) { const yi = yG + sk.imp * pxm; if (yi < Hh) { svg('rect', { x: 0, y: yi, width: W, height: Hh - yi, class: 'f-soilB' }, g); svg('rect', { x: 0, y: yi, width: W, height: Hh - yi, fill: 'url(#pat-clay)' }, g); txt2(g, W - 6, Math.min(Hh - 4, yi + 12), 'vízzáró agyag', 'end'); } }
  if (sk.gw !== null && sk.gw !== undefined) {
    const yw = yG + sk.gw * pxm;
    const yb = sk.imp ? Math.min(Hh, yG + sk.imp * pxm) : Hh;
    svg('rect', { x: 0, y: yw, width: W, height: yb - yw, class: 'f-water', opacity: 0.7 }, g);
    svg('line', { x1: 0, y1: yw, x2: W, y2: yw, class: 's-water', 'stroke-width': 1.5, 'stroke-dasharray': '5 4' }, g);
    txt2(g, 6, yw - 3, '▽ talajvíz');
  }
  let x0, x1;
  if (sk.kind === 'arok') { x0 = 165; x1 = 195; }
  else if (sk.kind === 'akna') { x0 = 0; x1 = W; }
  else if (sk.kind === 'bevagas') { x0 = 180; x1 = W; }
  else { x0 = 110; x1 = 290; }
  const yB = yG + sk.H * pxm;
  if (sk.kind === 'akna') {
    // két alagút + keresztjárat
    for (const cx of [70, 290]) { svg('circle', { cx, cy: yB, r: 26, fill: 'var(--surface)', class: 's-ink', 'stroke-width': 3, stroke: 'var(--concrete2)' }, g); }
    svg('rect', { x: 96, y: yB - 12, width: 168, height: 24, fill: 'none', stroke: 'var(--bad)', 'stroke-width': 2, 'stroke-dasharray': '5 4' }, g);
    txt2(g, 180, yB - 18, 'keresztjárat helye', 'middle');
    txt2(g, 180, yG - 8, 'felszín – város, közlekedés', 'middle');
    return;
  }
  if (sk.kind === 'bevagas') {
    svg('rect', { x: x0, y: yG, width: x1 - x0, height: sk.H * pxm, class: 'f-sky' }, g);
    svg('rect', { x: x0, y: yB - 4, width: x1 - x0, height: 4, fill: 'var(--ink)', opacity: 0.6 }, g);
    txt2(g, 300, yB - 8, 'út', 'middle');
  } else {
    svg('rect', { x: x0, y: yG, width: x1 - x0, height: sk.H * pxm, fill: 'var(--surface)' }, g);
    svg('rect', { x: x0, y: yG, width: x1 - x0, height: sk.H * pxm, fill: 'none', class: 's-ink', 'stroke-width': 1.5, 'stroke-dasharray': '5 4' }, g);
  }
  // szomszéd
  if (sk.nb === 'hz') { svg('rect', { x: 8, y: 14, width: 80, height: yG - 14, class: 'f-bld' }, g); svg('rect', { x: 8, y: yG, width: 80, height: 18, class: 'f-bld2' }, g); svg('rect', { x: x1 + 6, y: 20, width: 56, height: yG - 20, class: 'f-bld' }, g); txt2(g, 48, 32, 'szomszéd', 'middle'); }
  if (sk.nb === 'ut') { svg('rect', { x: 205, y: yG - 4, width: 150, height: 4, fill: 'var(--ink)', opacity: 0.7 }, g); svg('rect', { x: 240, y: yG - 16, width: 34, height: 12, rx: 3, fill: 'var(--g2)' }, g); txt2(g, 290, yG - 8, 'forgalom'); }
  // mélység
  svg('line', { x1: (x0 + x1) / 2, y1: yG, x2: (x0 + x1) / 2, y2: yB, class: 's-acc', 'stroke-width': 1.5 }, g);
  txt2(g, (x0 + x1) / 2 + 5, (yG + yB) / 2 + 4, `${fmt(sk.H, 1)} m`);
}
function txt2(p, x, y, t, anchor = 'start') { svg('text', { x, y, class: 't-sm halo', 'text-anchor': anchor, text: t, style: 'fill:var(--ink2);font-weight:600' }, p); }

register('casegame', (root) => {
  const { viz } = shell(root, { layout: 'wide', out: false });
  const box = h('div', { class: 'kd-game' });
  viz.append(box);
  let i = 0, score = 0, ans = [];
  const shuffle = (q) => { const idx = q.o.map((_, k) => k); for (let k = idx.length - 1; k > 0; k--) { const j = Math.floor(Math.random() * (k + 1)); [idx[k], idx[j]] = [idx[j], idx[k]]; } return idx; };
  const render = () => {
    clear(box);
    if (i >= CASES.length) {
      const msg = score === CASES.length ? 'Gratulálunk, mesterfokú munkatérhatárolás-tervező vagy!' : score >= 6 ? 'Nagyon jó – a hibásakat érdemes újra átgondolni.' : 'Érdemes a döntéstámogatóval és a fejezetekkel még egyszer átnézni.';
      box.append(h('div', { class: 'q-res' }, h('b', {}, `${score} / ${CASES.length}`), h('p', {}, msg), h('button', { class: 'btn btn-line', type: 'button', onclick: () => { i = 0; score = 0; ans = []; render(); } }, 'Újra')));
      return;
    }
    const C = CASES[i];
    const s = figure(h('div'), 360, 200);
    sketch(s, C.sk);
    const fig = h('div', { class: 'kd-sk' }); fig.append(s);
    const order = shuffle(C);
    const opts = h('div', { class: 'q-opts' });
    const exp = h('div', { class: 'q-exp', hidden: true });
    const next = h('button', { class: 'btn btn-line btn-sm', type: 'button', disabled: true, onclick: () => { i++; render(); } }, i === CASES.length - 1 ? 'Eredmény' : 'Következő helyzet →');
    order.forEach((k, n) => {
      const b = h('button', { type: 'button' }, h('i', {}, 'ABCD'[n]), h('span', {}, C.o[k]));
      b.addEventListener('click', () => {
        if (ans[i] !== undefined) return;
        ans[i] = k === C.c; if (ans[i]) score++;
        [...opts.children].forEach((x, nn) => { x.disabled = true; if (order[nn] === C.c) x.classList.add('right'); });
        if (k !== C.c) b.classList.add('wrong');
        exp.hidden = false; exp.innerHTML = (ans[i] ? '<b>Jó döntés!</b> ' : '<b>Ezt nem így építenénk.</b> ') + C.e;
        next.disabled = false; sc.textContent = `Pontszám: ${score} / ${CASES.length}`;
      });
      opts.append(b);
    });
    const sc = h('span', { class: 'kd-sc' }, `Pontszám: ${score} / ${CASES.length}`);
    box.append(
      h('div', { class: 'kd-case' }, fig, h('div', { class: 'kd-cbody' }, h('div', { class: 'q-n' }, `${i + 1}. helyzet / ${CASES.length}`), h('div', { class: 'q-t' }, C.t), h('p', { class: 'kd-desc' }, C.d), opts, exp, h('div', { class: 'q-nav' }, sc, next))));
  };
  render();
});
