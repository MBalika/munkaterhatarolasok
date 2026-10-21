#!/usr/bin/env python3
"""Összeállítja a ../index.html-t: src/index.src.html + src/chapters/*.html (névsorrendben)
+ beágyazott CSS + esbuild-del csomagolt JS (three.js is benne).
Használat:  cd _src && npm install && python3 build.py

Fejlesztői (részleges) build – nem írja felül az index.html-t:
  BUILD_ID=ducolas MODULES=ch_ducolas CHAPTERS=02,03 python3 build.py   →  ../dev-ducolas.html
  (MODULES: a betöltendő fejezetmodulok vesszővel; CHAPTERS: a chapters/ fájlnév-előtagjai)
"""
import os, subprocess, sys, pathlib

R = pathlib.Path(__file__).resolve().parent
os.chdir(R)
SRC = R / 'src'
BID = os.environ.get('BUILD_ID', '')
MODS = [m for m in os.environ.get('MODULES', '').split(',') if m]
CHS = [c for c in os.environ.get('CHAPTERS', '').split(',') if c]
entry = 'src/js/main.js'
if BID:
    main = (SRC / 'js' / 'main.js').read_text(encoding='utf-8')
    lines = [l for l in main.splitlines() if not (l.startswith("import './") and l[len("import './"):].split('.js')[0] not in MODS)]
    (SRC / 'js' / f'_dev_{BID}.js').write_text('\n'.join(lines) + '\n', encoding='utf-8')
    entry = f'src/js/_dev_{BID}.js'
outjs = f'dist/app{"-" + BID if BID else ""}.js'
r = subprocess.run(['npx', 'esbuild', entry, '--bundle', '--format=iife', '--minify', '--target=es2019',
                    '--outfile=' + outjs, '--log-level=warning', '--legal-comments=none'], capture_output=True, text=True)
if r.returncode:
    print(r.stderr); sys.exit(1)
if r.stderr.strip():
    print(r.stderr)

css = (SRC / 'fonts.css').read_text(encoding='utf-8') + (SRC / 'style.css').read_text(encoding='utf-8') + ''.join('\n/* ' + p.name + ' */\n' + p.read_text(encoding='utf-8') for p in sorted((SRC / 'css').glob('*.css')))
body = (SRC / 'index.src.html').read_text(encoding='utf-8')
chapters = ''.join((p.read_text(encoding='utf-8') + '\n') for p in sorted((SRC / 'chapters').glob('*.html')) if not CHS or any(p.name.startswith(c) for c in CHS))
body = body.replace('<!--CHAPTERS-->', chapters)
js = (R / outjs).read_text(encoding='utf-8').replace('</script', '<\\/script')

TITLE = 'Munkatérhatárolások'
DESC = ('Interaktív tananyag a munkatérhatárolásokról: dúcolás, berlini dúcolat, szádfal, cölöpfal, jet-grouting- és zagyfal, '
        'talajszegezés, talajhorgony, csőtámasz, top-down, fagyasztott fal – animációs videókkal, a BME valós felvételeivel, kalkulátorokkal, 3D gödörtervezővel, kvízekkel.')
# saját tárhelyről kiszolgált betűk (fonts/ – @fontsource csomagokból), nincs Google Fonts hívás
fonts = ('<link rel="preload" href="fonts/barlow-condensed-latin-800-normal.woff2" as="font" type="font/woff2" crossorigin>'
         '<link rel="preload" href="fonts/inter-latin-400-normal.woff2" as="font" type="font/woff2" crossorigin>')
icon = ("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 34 34'%3E%3Crect width='34' height='34' rx='8' fill='%231d2024'/%3E"
        "%3Cpath d='M5 11h7v17h10V11h7' fill='none' stroke='%23f0a33a' stroke-width='2.6' stroke-linejoin='round'/%3E"
        "%3Cpath d='M12 15h10M12 21h10' stroke='%23cfc9bc' stroke-width='2.2'/%3E%3C/svg%3E")
# magyar elválasztás (Hyphenopoly 6, saját tárhelyről; a GUARD a hyphenators.hu függvényt használja)
hyph = ('<script src="vendor/hyphenopoly/Hyphenopoly_Loader.js"></script>\n'
        '<script>Hyphenopoly.config({ require: { "hu": "FORCEHYPHENOPOLY" }, setup: { hide: "none", selectors: { ".hyphenate": { minWordLength: 6, compound: "auto" } } } });</script>')
theme_boot = ("<script>try{var t=localStorage.getItem('mt-theme');if(t==='dark'||t==='light')document.documentElement.dataset.theme=t}catch(e){}</script>")
html = f'''<!doctype html>
<html lang="hu">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>{TITLE}</title>
<meta name="description" content="{DESC}">
<meta name="theme-color" content="#15171a">
<meta property="og:title" content="{TITLE} – interaktív tananyag">
<meta property="og:description" content="{DESC}">
<meta property="og:image" content="img/thumb/08.jpg">
<link rel="icon" href="{icon}">
{theme_boot}
{fonts}
{hyph}
<style>
{css}
</style>
</head>
<body>
{body}
<script>{js}</script>
</body>
</html>
'''
outname = f'dev-{BID}.html' if BID else 'index.html'
(R.parent / outname).write_text(html, encoding='utf-8')
print(outname, len(html) // 1024, 'KB')
