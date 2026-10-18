// 11. fejezet – Önellenőrzés: 40 igaz/hamis állítás + kereshető fogalomtár
import { register, h, clear } from './core.js';
import { defineTF } from './ui.js';

defineTF([
  { s: 'A munkaárok olyan keskeny munkagödör, amelynek szélessége jellemzően legfeljebb 1–3 m, és többnyire vonalas létesítményekhez (pl. közművekhez) készül.', v: true, e: 'Ideiglenes: a közmű elkészülte után visszatemetik.' },
  { s: 'Durvaszemcsés, kohézió nélküli talajban a függőleges földfal ideiglenesen 1–2 m mélységig megtámasztás nélkül is megáll.', v: false, e: 'Durvaszemcsés talajban (látszólagos kohézió nélkül) m₀ = 0 – ezért ott előrevert (acél) pallózás kell.' },
  { s: 'Kohéziómentes szemcsés talajban a rézsű hajlásszöge nem lehet nagyobb a talaj belső súrlódási szögénél.', v: true, e: 'Magasabb (3–5 m feletti) rézsűnél padka beépítése is célszerű.' },
  { s: 'A rézsű fölött, a szakadólapon belül nyugodtan deponálhatjuk a kiemelt földet, hiszen a méretezésben úgyis 10 kPa felszíni terhet veszünk fel.', v: false, e: 'Célszerű előírni, hogy a szakadólapon belül ne történjen deponálás; a min. 10 kPa teher csak a szokásos esetleges terhet fedi le.' },
  { s: 'A dúcolás „szembetámaszt” jelent: a két szemközti földfal nyomását nyomott dúcok veszik fel.', v: true, e: 'Ezért szélesedő gödörnél a dúcok kihajlási hossza – és a kihajlás veszélye – nő.' },
  { s: 'A hagyományos fa dúcolatnál a dúcok jellemzően 30–40 cm átmérőjű gömbfák voltak.', v: false, e: 'A dúcok 12–16 cm átmérőjű gömbfák, a pallók 2 colos (48 mm) vastagok, a hevederek 12–24 cm oldalhosszú gerendák voltak.' },
  { s: 'Kemény agyagban munkavédelmi okból már 0,5 m mélységtől dúcolni kell.', v: false, e: 'Finomhomokban H > 0,5 m, átmeneti talajban H > 1,0 m, kemény agyagban H > 2,0 m esetén kell dúcolni.' },
  { s: 'Ha m₀ > H, állított pallózás alkalmazható: a gödröt teljes mélységig kiemelik, majd a falakat beterítik és kidúcolják.', v: true, e: 'Ha H > m₀: utánhajtott pallózás; ha H ≫ m₀: vízszintes pallózás lépcsős mélyítéssel; ha m₀ = 0: előrevert pallózás.' },
  { s: 'Előrevert pallózásnál fa pallókat is lehet használni, hiszen azokat a kiemelés előtt leverik.', v: false, e: 'Előrevert pallózás kizárólag acélból készül – a pallókat leverik, levibrálják, csak utána emelik ki a földet.' },
  { s: 'A vízszintes pallózás előnye, hogy a pallók hossza nincs korlátozva, és beépítéskor nem rongálódnak, mert nem kell verni őket.', v: true, e: 'Akkor alkalmazzák, ha H ≫ m₀, és m₀ csak deciméteres nagyságrendű.' },
  { s: 'Közepesen és erősen kötött talajban a dúcnyomás a p₁ = (H·γn + q) − 4c és a p₂ = 0,2·(H·γn + q) érték közül a kisebbik.', v: false, e: 'A kettő közül a nagyobbat kell figyelembe venni.' },
  { s: 'Kb. 3 m-nél szélesebb munkagödörnél már a dúcok kihajlásával is számolni kell.', v: true, e: 'Ilyenkor több irányú merevítés, ferde dúcok, vagy nagy átmérőjű acél csőtámaszok kellenek.' },
  { s: 'Széles munkagödörben a ferde dúcokat az alaplemez előre elkészített belső részéhez is lehet támasztani.', v: true, e: 'A szélén ilyenkor rézsűs földtámaszt (földpadkát) hagynak, amit később szakaszosan bontanak.' },
  { s: 'A berlini dúcolat vízzáró, ezért magas talajvíz esetén is gazdaságos megoldás.', v: false, e: 'Talajvízmentes, száraz munkagödrök megoldása: a pallók között átszivárog a víz.' },
  { s: 'A berlini dúcolat acéltartóit jellemzően 4–6 m-es osztásban helyezik el.', v: false, e: '1–3 m-enként, általában 2 m-re; sűrűbb kiosztást nagyobb terhek indokolhatnak.' },
  { s: 'Jet-grouting falnál az acéltag mérete a jet-oszlop átmérőjével arányosan tetszőlegesen növelhető.', v: false, e: 'A friss jetelt talaj sűrű folyadék: csak a fúrószárral átjárt függély és kb. 15–20 cm-es környezete fogadja be az acéltagot.' },
  { s: 'Ha a jet-oszlopok osztástávolsága 10–20 cm-rel kisebb az átmérőnél, a fal kvázi vízzáró lehet.', v: true, e: 'Ez a nagy előnye a hagyományos berlini dúcolattal szemben.' },
  { s: 'Az erősített önszilárduló zagyfalban a markolás és az acélgerendák elhelyezése után betont juttatnak a zagy helyére.', v: false, e: 'Nem kerül beton a zagy helyére: a cementtartalmú zagy maga szilárdul meg, és adja a fal vízzárását.' },
  { s: 'Az önszilárduló zagy 28 napos nyomószilárdsága jellemzően 0,5–1,4 MPa.', v: true, e: 'A terhet az 1–2 m-enként elhelyezett acélszelvények viszik; a zagy boltozódva adja át rájuk a föld- és víznyomást.' },
  { s: 'Az acél szádpallók hornyos kapcsolata miatt vízzáró fal készíthető, és ideiglenes falnál a pallók visszahúzhatók.', v: true, e: 'A szádfal ideiglenes és végleges is lehet; végleges alkalmazásnál külön korrózióvédelmi előírások vannak.' },
  { s: 'A szádpallók lehajtásakor keletkező rezgések csak 2–3 m-re hatnak el, ezért beépített területen nem kell velük foglalkozni.', v: false, e: 'A rezgések 20–30 m-re is elhathatnak – meg kell vizsgálni, nem okoznak-e kárt a környező épületekben.' },
  { s: 'A vasbeton szádfalat elsősorban ideiglenes munkagödrökhöz használják, mert könnyen visszahúzható.', v: false, e: 'Végleges szádoláshoz, elsősorban kikötőkben, élővízben, partvédelemhez használják. Nehéz, lehajtása is nehéz (vízöblítéssel segítik).' },
  { s: 'Magyarországon a műanyag szádfal a legelterjedtebb szádfaltípus.', v: false, e: 'Hazánkban még nem terjedt el; leggyakrabban acél szádfalat (Larssen-, Hoesch-típusú pallókat) használnak.' },
  { s: 'Összemetsző cölöpfalnál minden cölöp vasalt, és a vasalt cölöpök készülnek elsőként.', v: false, e: 'Csak minden második cölöp vasalt. Előbb a nem vasalt (primer) cölöpök készülnek, majd közéjük kb. 10–12 cm átfúrással a vasaltak.' },
  { s: 'Hézagos cölöpfalnál a cölöpköz jellemzően 20–60 cm, de legfeljebb a cölöp átmérőjének megfelelő méretű.', v: true, e: 'A vállalható hézag a talaj állékonyságától, átboltozódási képességétől függ.' },
  { s: 'Hazánkban a cölöpfalak elsősorban talajvízszint feletti, nem vízzáró munkatérhatároló falként népszerűek.', v: true, e: 'Leggyakrabban CFA-technológiával készülnek; hazánkban főleg a hézagos kialakítás terjedt el.' },
  { s: 'Talajszegezésnél a gödröt a talaj állékonyságától függően 90–180 cm-es függőleges szakaszokban mélyítik.', v: true, e: 'Minden lépcsőben: szegek, betonacél háló, lőttbeton – majd a következő szakasz kiemelése.' },
  { s: 'A talajszegek szükséges hossza jellemzően a gödörmélység 0,1–0,3-szorosa.', v: false, e: 'A H mélységű gödörnél a szegek hossza a talajtól függően 0,6–1,2·H; a raszter jellemzően 0,5–1,0 (1,5) m.' },
  { s: 'A talajszegezés puha, plasztikus agyagban és szerves talajban is jól alkalmazható.', v: false, e: 'Nem alkalmazható puha, plasztikus agyagban, szerves talajban, törmelékes feltöltésben és görgeteges talajban.' },
  { s: 'A konzolos (egyéb megtámasztás nélküli) munkatérhatároló szerkezetek jellemzően csak kb. 4–6 m kiemelési mélységig állékonyak.', v: true, e: 'És csak akkor, ha közvetlenül mellettük nincs építmény. Mélyebb gödörnél egy vagy több szinten meg kell támasztani őket.' },
  { s: 'A talajhorgony a talajszeghez hasonlóan a teljes hosszán adja át az erőt a talajnak.', v: false, e: 'A horgony csak a befogott (injektált) szakaszon ad át erőt; a szabad szakasz csak közvetít a fej és a befogott szakasz között.' },
  { s: 'A talajhorgony befogott szakaszának túl kell nyúlnia az aktív csúszólapon.', v: true, e: 'Különben a horgony a megcsúszó földtömeggel együtt mozogna.' },
  { s: 'Hazánkban a fúrt, injektált talajhorgonyok szinte mindig ideiglenesek, legfeljebb 2 éves élettartammal.', v: true, e: 'Állandó horgony is készíthető, szigorúbb korrózióvédelemmel és utánfeszíthetőséggel.' },
  { s: 'A horgonyokat a szilárdulás után a tervezett igénybevétel 120–130%-ára feszítik elő.', v: false, e: 'Szilárdulás (8–12 nap) után a tervezett igénybevétel 80–90%-ára feszítik elő, és minden horgonyról próbaterhelési jegyzőkönyv készül.' },
  { s: 'A legrövidebb talajhorgony kb. 8 m hosszú, mert a szabad és a befogott szakasz is legalább 4 m.', v: true, e: 'Jellemző hajlás 15–30°, hossz legfeljebb 25–30 m, befogási hossz 4–9 m, 3–7 pászma.' },
  { s: '10–15 m-nél hosszabb acél csőtámaszoknál a hőtágulásból eredő tengelyirányú nyomóerők már meghatározók.', v: true, e: 'A dúcelemet ezekre is méretezni kell; a csövek jellemzően S235–S355 acélból, 30–150 cm átmérővel készülnek.' },
  { s: 'A top-down (milánói) módszernél a födémek zsaluállványzat nélkül, a talajra fektetve épülhetnek.', v: true, e: 'További előny a födémtámaszok nagy merevsége és a rövidebb építési idő.' },
  { s: 'Top-down építésnél a földkiemelés a már elkészült támaszfödém felett, szabad ég alatt történik.', v: false, e: 'A kiemelés a támaszfödém alatt, szűk térben folyik – a szellőzést és a világítást biztosítani kell.' },
  { s: 'Passzív hátrahorgonyzásnál a feszítőerő hiánya miatt a fal mozgásai nagyobbak, jellemzően néhány centiméteresek.', v: true, e: 'A falat egy, a megtámasztott földtömeg mögött kellő távolságban lévő szerkezethez (falhoz, cölöpsorhoz) kötik.' },
  { s: 'A fagyasztott fal folyékony nitrogénnel gyorsabban elkészül, mint sólés hűtéssel.', v: true, e: 'Nitrogénnel (−196 °C) kb. 1–3 hét, sólével (kb. −30 °C) kb. 4–8 hét – a nitrogén viszont drága, ezért gyakran sólével tartják fenn a falat.' },
]);

const GLOSS = [
  ['palló', 'A földfalat beterítő (függőleges vagy vízszintes) elem – régen 48 mm-es fa, ma többnyire acél csatornapalló.', '#ducolas'],
  ['heveder', 'A pallókat összefogó, rájuk merőleges gerenda (fa vagy I/U acélszelvény); erre támaszkodnak a dúcok.', '#ducolas'],
  ['dúc', 'Nyomott elem, amely a szemközti földfalakat egymásnak támasztja (gömbfa, I-tartó, cső, csavaros acéldúc).', '#ducolas'],
  ['m₀ (megtámasztás nélküli mélység)', 'Az a mélység, ameddig a függőleges földfal talajvíz felett ideiglenesen megtámasztás nélkül megáll: m₀ = 4c/(nγ)·tg(45°+φ/2) − p/γ.', '#m0'],
  ['csatornapalló (Pátria, Union)', 'Vékony falú, profilos acél szádlemez árkok beterítésére – nem vízzáró kapcsolatú.', '#ducolas'],
  ['állított / utánhajtott / vízszintes / előrevert pallózás', 'A pallózás négy módja az m₀ és a H viszonya szerint.', '#pallozas'],
  ['dúcnyomás', 'A dúcolatra ható, egyenletesnek feltételezett helyettesítő vízszintes teher (a befeszített dúcok reakcióereje).', '#ducnyomas'],
  ['táblás dúcolat', 'Előregyártott, merevített acéltáblákból és állítható dúcokból álló, sokszor felhasználható dúcolókeret.', '#tablas'],
  ['ferde dúc', 'Széles gödörben a falat a gödör aljához vagy az alaplemezhez támasztó ferde elem; függőleges egyensúlyát is ellenőrizni kell.', '#ferde-duc'],
  ['földpadka', 'A fal mellett hagyott földtámasz, amely a ferde dúcok beépítéséig a passzív ellenállásával tartja a falat.', '#ferde-duc'],
  ['berlini (Siemens) dúcolat', 'Hézagosan a talajba juttatott acél I-tartók, közöttük a kiemeléssel lépést tartva behelyezett pallózás.', '#berlini'],
  ['jet-oszlop', 'Nagynyomású cementhabarcs-sugárral helyben kevert talajoszlop (60–120 cm); a jet-grouting fal eleme.', '#jetfal'],
  ['önszilárduló zagy', 'Bentonit-cement zagy, amely a rést megtámasztja, majd maga szilárdul meg (0,5–1,4 MPa).', '#zagyfal'],
  ['CSM / trenchmix / colmix', 'Mélykeverési eljárások: marókerekes panel, láncos keverő (folyamatos árok), illetve egymásba metsző oszlopok.', '#dsmfal'],
  ['szádpalló', 'Hornyos zárakkal egymáshoz kapcsolt, a talajba vert/vibrált/sajtolt elem (főleg acél: Larssen, Hoesch).', '#szadfal'],
  ['zár (horony)', 'A szádpallók kapcsolata; ez teszi a falat folytonossá és vízzáróvá.', '#szadfal'],
  ['hézagos / érintkező / összemetsző cölöpfal', 'Cölöpfal-kialakítások: résekkel, egymást érintő, illetve egymásba fúrt cölöpökkel (ez utóbbi vízzáró).', '#colopfal'],
  ['primer / szekunder cölöp', 'Összemetsző falnál előbb a vasalatlan (primer) cölöpök, majd közéjük, átfúrással a vasalt (szekunder) cölöpök készülnek.', '#colopfal'],
  ['fejgerenda', 'A cölöpök (falelemek) felső síkját összefogó vasbeton gerenda – a megtámasztások ide is kapcsolódhatnak.', '#colopfal'],
  ['mellgerenda', 'Mélyebb szinten a fal oldalára rögzített teherelosztó gerenda, amelyhez horgonyok vagy csőtámaszok kapcsolódnak.', '#csotamasz'],
  ['talajszeg', 'A földfalba ütött/fúrt-injektált, jellemzően 20–28 mm-es betonacél; a teljes hosszán dolgozik.', '#szegezes'],
  ['lőttbeton', 'Felületre lőtt beton (szegezésnél 8–15 (20) cm, betonacél hálóval).', '#szegezes'],
  ['horgonyfej', 'A horgonyerőt a falra átadó szerkezet: alátét, lehorgonyzó elem (ék, anya).', '#horgony'],
  ['szabad szakasz', 'A horgony fej és befogott szakasz közötti része – védőcsőben csúszik, nem ad át erőt a talajnak.', '#horgony'],
  ['befogott szakasz', 'A horgony injektált teste (jellemzően 4–9 m), amely az aktív csúszólapon túl adja át az erőt a talajnak.', '#horgony'],
  ['pászma', 'Nagy szilárdságú acél sodrony; egy horgonyban jellemzően 3–7 db.', '#horgony'],
  ['előfeszítés', 'A horgony megfeszítése szilárdulás után a tervezett igénybevétel 80–90%-ára, majd rögzítése a fejen.', '#horgony'],
  ['aktív csúszólap (szakadólap)', 'A fal mögötti megcsúszni hajlamos földék határa; a horgonyok befogott szakasza és a depóniák ezen kívül legyenek.', '#horgony'],
  ['acél csőtámasz', 'Nagy átmérőjű (30–150 cm) acélcső, amely a szemközti falakat támasztja össze – hőtágulásra is méretezni kell.', '#csotamasz'],
  ['top-down (milánói) módszer', 'Előbb a határoló falak és a felső födém készül, a kiemelés a födémek alatt halad lefelé.', '#topdown'],
  ['passzív horgony', 'Feszítés nélküli kikötés egy hátrébb, a szakadólapon kívül lévő falhoz vagy cölöpsorhoz.', '#passziv'],
  ['fagyasztócső', 'Zárt végű külső cső benne ejtőcsővel; a hűtőközeg (sólé vagy folyékony nitrogén) ebben kering.', '#fagyasztas'],
  ['sólé', 'Kalcium-klorid-oldat, amelyet hűtőgép kb. −25…−40 °C-ra hűt, és zárt körben áramoltat a fagyasztócsövekben.', '#fagyasztas'],
  ['cellás gát', 'Homokkal töltött, egyenes gerincű szádpallókból álló acélcellák – önálló gravitációs szerkezet élővízben.', '#gat'],
  ['kontraktor eljárás', 'Víz alatti betonozás csövön át úgy, hogy a cső vége végig a friss betonban marad.', '#gat'],
  ['felúszás', 'A víznyomás felfelé emelő hatása a munkagödör alján; ellene súly és/vagy húzott cölöpök (horgonyok) tartanak.', '#vizalatti'],
];

register('glossary', (root) => {
  const inp = h('input', { type: 'search', class: 'kd-gsearch', placeholder: 'Keresés a fogalmak között… (pl. horgony, palló, zagy)', 'aria-label': 'Keresés a fogalomtárban' });
  const cnt = h('span', { class: 'kd-gcnt' });
  const list = h('dl', { class: 'kd-gloss' });
  root.append(h('div', { class: 'kd-gbar' }, inp, cnt), list);
  const norm = (s) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  const render = () => {
    const q = norm(inp.value.trim());
    clear(list);
    let n = 0;
    for (const [t, d, href] of GLOSS) {
      if (q && !norm(t + ' ' + d).includes(q)) continue;
      n++;
      list.append(h('div', { class: 'kd-gi' }, h('dt', {}, t), h('dd', {}, d, ' ', h('a', { href }, 'Ugrás a fejezethez →'))));
    }
    cnt.textContent = `${n} / ${GLOSS.length} fogalom`;
    if (!n) list.append(h('p', { class: 'muted' }, 'Nincs találat.'));
  };
  inp.addEventListener('input', render);
  render();
});
