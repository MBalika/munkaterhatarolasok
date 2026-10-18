// Videók (video/NN.html + video/NN.mp3) – a Munkatérhatárolás v2 sorozat
export const VIDEOS = [
  { n: '01', t: 'Munkaárok dúcolása', d: '2:20', g: 'funk', grp: 1, s: 'm₀, állított · utánhajtott · vízszintes · előrevert pallózás, dúcnyomás' },
  { n: '02', t: 'Táblás dúcolat', d: '2:04', g: 'tech house', grp: 1, s: 'Előregyártott dúcolótáblák, süllyesztés ásással együtt, csúszósínes rendszer' },
  { n: '03', t: 'Széles munkagödör dúcolása', d: '2:04', g: 'nu-disco', grp: 1, s: 'Kihajlás, több irányú merevítés, ferde dúcok az alaplemezhez, földpadka' },
  { n: '04', t: 'Berlini dúcolat', d: '2:13', g: 'acid', grp: 2, s: 'I-tartók 1–3 m-enként, pallózás a kiemeléssel lépést tartva, hézagos falak' },
  { n: '05', t: 'Jet-grouting fal', d: '2:09', g: 'drum & bass', grp: 2, s: 'Acéltagok jet-oszlopokban – kvázi vízzáró fal pallózás nélkül' },
  { n: '06', t: 'Erősített önszilárduló zagyfal', d: '2:05', g: 'deep house', grp: 2, s: 'Markolás zagy alatt, acélgerendák a friss zagyban, boltozódás' },
  { n: '07', t: 'Erősített mélykeveréses fal', d: '2:04', g: 'moombahton', grp: 2, s: 'CSM, trenchmix, colmix – helyben kevert talajcement acélgerendákkal' },
  { n: '08', t: 'Acél szádfal', d: '2:21', g: 'hard techno', grp: 2, s: 'Larssen és Hoesch profilok, vibrálás, verés, sajtolás, rezgés, visszahúzás' },
  { n: '09', t: 'Fa, vasbeton és műanyag szádfal', d: '2:08', g: 'reggaeton', grp: 2, s: 'Vezércölöpök, vízöblítés, előfeszítés, PVC pallók (~9 kg/m²)' },
  { n: '10', t: 'Cölöpfalak', d: '2:16', g: 'trap', grp: 2, s: 'Hézagos, érintkező, összemetsző fal; primer–szekunder sorrend, cölöpköz' },
  { n: '11', t: 'Talajszegezés', d: '2:10', g: 'breakbeat', grp: 3, s: 'Lépcsős mélyítés, szegek, háló, lőttbeton, kihúzóvizsgálat' },
  { n: '12', t: 'Talajhorgony', d: '2:19', g: 'dubstep', grp: 3, s: 'Horgonyfej, szabad és befogott szakasz, injektálás, feszítés 80–90%-ra' },
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
  { grp: 2, t: 'Munkatérhatároló falak', ids: ['04', '05', '06', '07', '08', '09', '10'] },
  { grp: 3, t: 'Szegezés és megtámasztás', ids: ['11', '12', '13', '14', '15'] },
  { grp: 4, t: 'Különleges megoldások', ids: ['16', '17', '18'] },
  { grp: 0, t: 'Összefoglalás', ids: ['19'] },
];

export const YT = {
  wRRuJb3yTLw: 'Befogott támszerkezetek – áttekintés',
  '6v1tscw5Y7M': 'Hézagos erősítésű munkatérhatároló falak',
  '4IzRHH2GgEM': 'Szádfalazás',
  QcPETASq0zI: 'Cölöpfalak',
  'f_41-sJhGK8': 'Résfalazás',
  'MPjXIhchN-w': 'Jet-grouting',
  wh31VB1fY_8: 'Mélykeverés',
};

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
