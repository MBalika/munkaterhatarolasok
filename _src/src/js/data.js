// Saját animációs videók (video/NN.html + video/NN.mp3) – a Munkatérhatárolás v2 sorozat.
// A 04–08. és a 10. videó helyett a BME YouTube-videói szerepelnek (lásd YT); a fájlok a video/ mappában maradtak.
export const VIDEOS = [
  { n: '01', t: 'Munkaárok dúcolása', d: '2:20', g: 'funk', grp: 1, s: 'm₀, állított · utánhajtott · vízszintes · előrevert pallózás, dúcnyomás' },
  { n: '02', t: 'Táblás dúcolat', d: '2:04', g: 'tech house', grp: 1, s: 'Előregyártott dúcolótáblák, süllyesztés ásással együtt, csúszósínes rendszer' },
  { n: '03', t: 'Széles munkagödör dúcolása', d: '2:04', g: 'nu-disco', grp: 1, s: 'Kihajlás, több irányú merevítés, ferde dúcok az alaplemezhez, földpadka' },
  { n: '09', t: 'Fa, vasbeton és műanyag szádfal', d: '2:08', g: 'reggaeton', grp: 2, s: 'Vezércölöpök, vízöblítés, előfeszítés, PVC pallók (~9 kg/m²)' },
  { n: '11', t: 'Talajszegezés', d: '2:10', g: 'breakbeat', grp: 3, s: 'Lépcsős mélyítés, szegek, háló, lőttbeton, kihúzóvizsgálat' },
  { n: '12', t: 'Talajhorgony', d: '2:19', g: 'deep house', grp: 3, s: 'Horgonyfej, szabad és befogott szakasz, injektálás, feszítés 80–90%-ra' },
  { n: '13', t: 'Acél csőtámaszok', d: '2:11', g: 'synthwave', grp: 3, s: 'Kihajlás, hőtágulás, mellgerenda, mély városi munkaterek' },
  { n: '14', t: 'Támaszfödém (top-down)', d: '2:14', g: 'trance', grp: 3, s: 'A milánói módszer öt fázisa, földkiemelés a födém alatt' },
  { n: '15', t: 'Passzív hátrahorgonyzás', d: '2:02', g: 'UK garage', grp: 3, s: 'Horgonyfal a szakadólapon kívül, feszítés nélkül – néhány cm mozgás' },
  { n: '16', t: 'Fagyasztott fal', d: '2:10', g: 'future bass', grp: 4, s: 'Sólé vagy folyékony nitrogén, fagyasztócsövek, összefagyó hengerek' },
  { n: '17', t: 'Gátak élővízben', d: '2:11', g: 'amapiano', grp: 4, s: 'Földgát, szádfalas és cellás gátak, munkatér a folyóban' },
  { n: '18', t: 'Víz alatti alaplemez lehorgonyzással', d: '2:08', g: 'melodic house', grp: 4, s: 'Szádfalas körbezárás, horgonyok, víz alatti betonozás, felúszás ellen' },
  { n: '19', t: 'Záró: mélygarázs munkagödre', d: '2:00', g: 'phonk', grp: 0, s: 'Kvíz: melyik megoldást választanád? Döntési szempontok, ismétlés' },
];
export const VGROUPS = [
  { grp: 1, t: 'Dúcolások', ids: ['01', '02', '03'] },
  { grp: 2, t: 'Munkatérhatároló falak', ids: ['09'] },
  { grp: 3, t: 'Szegezés és megtámasztás', ids: ['11', '12', '13', '14', '15'] },
  { grp: 4, t: 'Különleges megoldások', ids: ['16', '17', '18'] },
  { grp: 0, t: 'Összefoglalás', ids: ['19'] },
];

// BME Építőmérnöki Kar – YouTube-videók (img/yt/<id>/: t.jpg indexkép, p1–p4.jpg képkockák, qr.png)
export const YT = {
  "wRRuJb3yTLw": {"title": "Befogott támszerkezetek", "dur": "3:01", "playlist": "Befogott támszerkezetek", "list": "PLiAsGexXzYoLoUK4uIoeIHjowjrmQH1Tc", "caps": ["Cölöpfal építése", "Résfalmarkoló", "Fejgerenda, lőttbeton", "Jet-grouting fal"], "kick": "A befogott támszerkezetek áttekintése", "tech": "Befogott támszerkezetek"},
  "6v1tscw5Y7M": {"title": "Hézagos erősítésű munkatérhatároló falak", "dur": "6:33", "playlist": "Befogott támszerkezetek", "list": "PLiAsGexXzYoLoUK4uIoeIHjowjrmQH1Tc", "caps": ["Hézagos falú gödör", "Acéltag a jet-oszlopba", "Önszilárduló zagyfal", "Mélykeverő szárak"], "kick": "A hézagos falak a valóságban", "tech": "Hézagos erősítésű falak"},
  "4IzRHH2GgEM": {"title": "Szádfalazás", "dur": "3:31", "playlist": "Befogott támszerkezetek", "list": "PLiAsGexXzYoLoUK4uIoeIHjowjrmQH1Tc", "caps": ["Vibrátor a pallón", "Palló beemelése", "Lehajtás kotróval", "Vasbeton szádpallók"], "kick": "A szádfalazás a valóságban", "tech": "Szádfal"},
  "QcPETASq0zI": {"title": "Cölöpfalak", "dur": "4:46", "playlist": "Befogott támszerkezetek", "list": "PLiAsGexXzYoLoUK4uIoeIHjowjrmQH1Tc", "caps": ["Cölöpfalas gödör", "Hézagos cölöpfal", "Cölöpfúrás", "Béléscsöves fúrófej"], "kick": "A cölöpfal a valóságban", "tech": "Cölöpfal"},
  "f_41-sJhGK8": {"title": "Résfalazás", "dur": "4:59", "playlist": "Befogott támszerkezetek", "list": "PLiAsGexXzYoLoUK4uIoeIHjowjrmQH1Tc", "caps": ["Résfalas munkaterület", "Réskanál", "Vasalókosár", "Betonozás"], "kick": "A résfal a valóságban", "tech": "Résfal"},
  "MPjXIhchN-w": {"title": "Jet-grouting", "dur": "4:27", "playlist": "Talajjavítások", "list": "PLiAsGexXzYoLJnR9HUPPN85cACUQXJhYj", "caps": ["Foghíjtelek", "Fúrás a gödörben", "Visszafolyó iszap", "Feltárt jet-oszlopok"], "kick": "A jet-grouting a valóságban", "tech": "Jet-grouting"},
  "wh31VB1fY_8": {"title": "Mélykeverés", "dur": "5:52", "playlist": "Talajjavítások", "list": "PLiAsGexXzYoLJnR9HUPPN85cACUQXJhYj", "caps": ["Keverés a part mentén", "Kiemelt keverőszár", "Keverőmarós fal", "Tömegstabilizáció"], "kick": "A mélykeverés a valóságban", "tech": "Mélykeverés"},
};
// A videótár BME-szekciói (a lejátszási listák szerint)
export const YT_GROUPS = [
  { t: 'Befogott támszerkezetek lejátszási lista', grp: 2, ids: ['wRRuJb3yTLw', '6v1tscw5Y7M', '4IzRHH2GgEM', 'QcPETASq0zI', 'f_41-sJhGK8'] },
  { t: 'Talajjavítások lejátszási lista', grp: 4, ids: ['MPjXIhchN-w', 'wh31VB1fY_8'] },
];

// Fejezetek a szintléchez (mélység m-ben)
export const CHAPTERS = [
  { id: 'bevezeto', t: 'Bevezető', d: 0, grp: 0 },
  { id: 'alapok', t: 'Alapok', d: 1.5, grp: 0 },
  { id: 'ducolas', t: 'Munkaárok dúcolása', d: 3.5, grp: 1 },
  { id: 'szeles', t: 'Széles gödör', d: 5.5, grp: 1 },
  { id: 'falak', t: 'Határoló falak', d: 7.5, grp: 2 },
  { id: 'szegezes', t: 'Talajszegezés', d: 10, grp: 3 },
  { id: 'megtamasztas', t: 'Megtámasztás', d: 12.5, grp: 3 },
  { id: 'kulonleges', t: 'Különleges', d: 15, grp: 4 },
  { id: 'tervezo', t: '3D gödörtervező', d: 17.5, grp: 0 },
  { id: 'dontes', t: 'Melyiket válasszam?', d: 19.5, grp: 0 },
  { id: 'videotar', t: 'Videótár', d: 21.5, grp: 0 },
  { id: 'teszt', t: 'Önellenőrzés', d: 23.5, grp: 0 },
];
export const MAXDEPTH = 25;
