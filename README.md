# Munkatérhatárolások – interaktív tananyag

Élő oldal: https://munkaterhatarolasok.vercel.app (a `main` ág minden push után automatikusan élesedik a Vercelen).

BME Építőmérnöki Kar, Alapozás, 9. előadás. Alap: a „Munkatér határolások” jegyzet és az előadásanyag (Dr. Móczár Balázs), webes forrásokkal kiegészítve (fejezetenként a *Források* alatt).

## Felépítés
- `index.html` – a kész, egyfájlos oldal (a buildből; CSS + JS beágyazva, three.js-szel együtt)
- `video/NN.html` + `video/NN.mp3` – a 19 animációs videó (a hang külön fájlban), `video/grass.jpg` közös textúra
- `img/thumb/` – videó-bélyegképek, `img/ppt/` – képek az előadásanyagból
- `fonts/` – saját tárhelyről kiszolgált betűk (Barlow Condensed, Inter, JetBrains Mono – @fontsource, OFL)
- `_src/` – forrás (a Vercel nem teszi ki, lásd `.vercelignore`)
  - `src/index.src.html` – keret (fejléc, szintléc, hős, lábléc, lejátszó)
  - `src/chapters/NN_*.html` – fejezetek, névsorrendben fűzi össze a build
  - `src/js/` – `core.js` (widget-segédek), `ui.js` (navigáció, videók, kvíz, igaz/hamis), `hero.js`, `ch_*.js` (fejezetek widgetjei és kvízei), `sim3d.js` (3D gödörtervező), `tf.js` (igaz/hamis állítások)
  - `src/style.css`, `src/css/*.css`, `src/fonts.css`

## Újraépítés
```bash
cd _src
npm install
python3 build.py          # → ../index.html
```

## Videók frissítése
Ha elkészül egy videó új változata (önálló `NN_Nev_video.html`), tedd egy mappába, majd:
```bash
python3 _src/tools/import_videos.py "<mappa a videókkal>"
```
Ez kiírja a hangot külön mp3-ba, elrejti az export gombot, és beállítja az automatikus indítást / Esc-re bezárást. Utána commit + push.
