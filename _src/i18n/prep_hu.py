# A magyar forrás (_src/src) előkészítése az angol változathoz – a magyar oldal szövege és működése nem változik:
# EN jelző, nyelvfüggő számformátum, a formázás-őr angol szabályai, en-gb elválasztás, HU | EN nyelvváltó, angol videók útvonala.
# Idempotens. Használat: python3 _src/i18n/prep_hu.py
import os, re
SRC = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'src')
def load(f): return open(os.path.join(SRC, f), encoding='utf-8').read()
def save(f, t): open(os.path.join(SRC, f), 'w', encoding='utf-8').write(t)
def rep(t, a, b, n=1):
    c = t.count(a); assert c == n, (a[:90], c); return t.replace(a, b)
def en_import(t, f):
    if re.search(r"import \{[^}]*\bEN\b[^}]*\} from './core.js';", t): return t
    m = re.search(r"import \{([^}]*)\} from './core.js';", t); assert m, 'core import ' + f
    return t.replace(m.group(0), "import {" + m.group(1).rstrip() + ", EN } from './core.js';", 1)

t = load('js/core.js')
if 'export const EN =' not in t:
    t = rep(t, "export const $ = (s, r = document) => r.querySelector(s);",
            "export const EN = (document.documentElement.lang || '').toLowerCase().startsWith('en');   // angol oldal (en.html)\nexport const $ = (s, r = document) => r.querySelector(s);")
    t = rep(t, "  return Number(x).toLocaleString('hu-HU', { minimumFractionDigits: d, maximumFractionDigits: d }).replace(/\u00a0/g, '\u202f');",
            "  if (EN) return Number(x).toLocaleString('en-GB', { minimumFractionDigits: d, maximumFractionDigits: d }).replace(/,/g, '\u202f');   // angolul: tizedespont, ezres tagolás keskeny szóközzel\n  return Number(x).toLocaleString('hu-HU', { minimumFractionDigits: d, maximumFractionDigits: d }).replace(/\u00a0/g, '\u202f');")
    t = rep(t, "  const TERMS = ['berlini dúcolat',", "  const TERMS = EN ? ['soldier pile wall', 'trench sheeting', 'trench box', 'trench shoring', 'jet grout wall', 'slurry wall', 'self-hardening slurry wall', 'reinforced slurry wall', 'deep mixed wall', 'sheet pile wall', 'steel sheet piles', 'contiguous pile wall', 'secant pile wall', 'diaphragm wall', 'embedded retaining wall', 'embedment depth', 'passive earth pressure', 'active earth pressure', 'earth pressure at rest', 'ground anchor', 'soil nailing', 'soil nail', 'steel strut', 'raking strut', 'top-down construction', 'frozen wall', 'ground freezing', 'liquid nitrogen', 'hydraulic heave', 'angle of shearing resistance', 'undrained shear strength', 'neighbouring building', 'below the groundwater', 'above the groundwater', 'bentonite slurry', 'tremie concrete', 'according to'] : ['berlini dúcolat',")
    t = rep(t, "  const NUMW = /(^|[\\s(\\u00A0\\u2060„])((?:[Kk]ét|", "  const NUMW = EN ? /(^|[\\s(\\u00A0\\u2060“])((?:[Tt]wo|[Tt]hree|[Ff]our|[Ff]ive|[Ss]ix|[Ss]even|[Ee]ight|[Nn]ine|[Tt]en|[Ff]irst|[Ss]econd|[Tt]hird|[Ff]ourth|[Ff]ifth|[Bb]oth|[Aa]ll|[Ss]everal))(?=\\s\\S)\\s/g : /(^|[\\s(\\u00A0\\u2060„])((?:[Kk]ét|")
    t = rep(t, "(pl\\.|kb\\.|ill\\.|ún\\.|max\\.|min\\.|ld\\.|vö\\.|cca\\.|átl\\.|ill|ún|kb) (?=\\S)", "(pl\\.|kb\\.|ill\\.|ún\\.|max\\.|min\\.|ld\\.|vö\\.|cca\\.|átl\\.|ill|ún|kb|e\\.g\\.|i\\.e\\.|approx\\.|cf\\.|No\\.|Fig\\.) (?=\\S)")
    t = rep(t, "    for (let i = 0; i < 2; i++) s = s.replace(/(^|[\\s(\\u00A0\\u2060„])(a|az|A|Az|s|e|egy|Egy|és|És) (?=\\S)/g, '$1$2' + NB);",
            "    for (let i = 0; i < 2; i++) s = s.replace(EN ? /(^|[\\s(\\u00A0\\u2060“‘])(a|an|the|A|An|The|&) (?=\\S)/g : /(^|[\\s(\\u00A0\\u2060„])(a|az|A|Az|s|e|egy|Egy|és|És) (?=\\S)/g, '$1$2' + NB);")
    t = rep(t, "  const SHORTEND = new RegExp('(^|[\\\\s(\\u00A0\\u2060„])(a|az|A|Az|s|e|egy|Egy|és|És|pl\\\\.|kb\\\\.|ill\\\\.|ún\\\\.|max\\\\.|min\\\\.|",
            "  const SHORTEND = new RegExp(EN ? '(^|[\\\\s(\\u00A0\\u2060“‘])(a|an|the|A|An|The|e\\\\.g\\\\.|i\\\\.e\\\\.|approx\\\\.|\\\\d+(?:[,.]\\\\d+)?\\\\.?%?|' + NUMW.source.match(/\\(\\?:([^)]*)\\)/)[1] + ') $' : '(^|[\\\\s(\\u00A0\\u2060„])(a|az|A|Az|s|e|egy|Egy|és|És|pl\\\\.|kb\\\\.|ill\\\\.|ún\\\\.|max\\\\.|min\\\\.|")
    t = rep(t, "    if (H && H.hyphenators && H.hyphenators.hu) {\n      H.hyphenators.hu.then(", "    if (H && H.hyphenators && H.hyphenators[EN ? 'en-gb' : 'hu']) {\n      H.hyphenators[EN ? 'en-gb' : 'hu'].then(")
    save('js/core.js', t)

t = load('js/ui.js')
if 'function initLang' not in t:
    t = rep(t, "fr.src = `video/${n}.html#autoplay`;", "fr.src = `video/${EN ? 'en/' : ''}${n}.html#autoplay`;")
    t = rep(t, "h('img', { src: `img/thumb/${n}.jpg`,", "h('img', { src: `img/thumb/${EN ? 'en/' : ''}${n}.jpg`,")
    t = en_import(t, 'ui')
    t = rep(t, "  initTheme(); initNav();", "  initTheme(); initLang(); initNav();")
    t += """
// nyelvváltó: a választás megmarad (alap-lang), a másik nyelvű oldal ugyanott nyílik meg (alap-pos)
function initLang() {
  const sw = $('#langSw'), KEY = 'alap-pos'; const hh = () => { const tb = $('.topbar'); return tb ? tb.offsetHeight : 0; };
  if (sw) sw.addEventListener('click', () => {
    try { localStorage.setItem('alap-lang', EN ? 'hu' : 'en'); } catch (e) { }
    const H0 = hh(); let best = null; document.querySelectorAll('main [id]').forEach((n) => { if (n.closest('svg')) return; const r = n.getBoundingClientRect(); if (r.height && r.top <= H0 + 1 && r.bottom > H0) best = n; });
    try { sessionStorage.setItem(KEY, JSON.stringify({ id: best ? best.id : '', off: best ? H0 - best.getBoundingClientRect().top : 0, y: scrollY, t: Date.now() })); } catch (e) { }
    sw.setAttribute('href', (EN ? './' : 'en') + (best ? '#' + best.id : ''));
  });
  let p = null; try { p = JSON.parse(sessionStorage.getItem(KEY) || 'null'); sessionStorage.removeItem(KEY); } catch (e) { }
  if (p && Date.now() - p.t < 20000) { if ('scrollRestoration' in window.history) window.history.scrollRestoration = 'manual';
    const go = () => { const n = p.id && document.getElementById(p.id); const y = n ? n.getBoundingClientRect().top + scrollY - hh() + p.off : p.y; scrollTo({ top: Math.max(0, y), behavior: 'instant' }); };
    requestAnimationFrame(go); addEventListener('load', () => { go(); setTimeout(go, 600); }, { once: true }); }
}
"""
    save('js/ui.js', t)

t = load('index.src.html')
if 'id="langSw"' not in t:
    t = rep(t, '    <button class="iconbtn" id="themeBtn" type="button" aria-label="Téma váltása"></button>\n',
            '    <a class="langbtn" id="langSw" href="en" hreflang="en" lang="en" aria-label="English version"><b>HU</b><span>EN</span></a>\n    <button class="iconbtn" id="themeBtn" type="button" aria-label="Téma váltása"></button>\n')
    save('index.src.html', t)

t = load('style.css')
if '.langbtn' not in t:
    t += """
/* nyelvváltó (HU | EN): a kitöltött az aktuális nyelv; mobilon csak a másik nyelv kódja */
.langbtn { flex: none; display: inline-flex; align-items: center; gap: 2px; padding: 3px; border: 1px solid var(--line2, var(--line)); background: var(--surface); border-radius: 999px; text-decoration: none; font-family: var(--f-mono); font-size: 12.5px; font-weight: 500; letter-spacing: .04em; }
.langbtn b, .langbtn span { display: inline-grid; place-items: center; min-width: 30px; padding: 4px 8px; border-radius: 999px; }
.langbtn b { background: var(--ink); color: var(--surface); font-weight: 500; }
.langbtn span { color: var(--muted); }
.langbtn:hover span { background: var(--surface2, var(--surface)); color: var(--ink); }
@media (max-width: 560px) { .langbtn b { display: none; } .langbtn span { min-width: 0; padding: 5px 9px; color: var(--ink); } }
"""
    save('style.css', t)

# --- formázási javítás (mindkét nyelven): a gondolatjel (–, —) nem kezdhet sort
t = load('js/core.js')
if "/* gondolatjel */" not in t:
    t = rep(t, "    // rövidítések\n", "    // rövidítések\n    s = s.replace(/(\\S) ([–—]) /g, '$1' + NB + '$2 ');   /* gondolatjel */\n")
    t = rep(t, "      const ms = /^ ([=≤≥≈→←×±<>⇒+−/]) /.exec(b.nodeValue);", "      if (/^ [–—] /.test(b.nodeValue) && /\\S$/.test(a.nodeValue)) b.nodeValue = NB + b.nodeValue.slice(1);   /* gondolatjel a csomóponthatáron */\n      const ms = /^ ([=≤≥≈→←×±<>⇒+−/]) /.exec(b.nodeValue);")
    save('js/core.js', t)
print('kész')
# --- angol többes szám a 3D gödörtervezőben: „1 anchor row / 2 anchor rows”, „1 slab / 2 slabs” (a magyar szöveg változatlan)
t = load('js/sim3d.js')
if "'anchor rows'" not in t:
    t = rep(t, "add(stat, `${n} ${sup === 'horgony' ? 'horgonysor' : 'dúcsor (csőtámasz)'}`,",
            "add(stat, `${n} ${EN ? (sup === 'horgony' ? (n === 1 ? 'anchor row' : 'anchor rows') : (n === 1 ? 'strut row (tubular struts)' : 'strut rows (tubular struts)')) : sup === 'horgony' ? 'horgonysor' : 'dúcsor (csőtámasz)'}`,")
    t = rep(t, "`${M.levels.length} ${M.sup === 'topdown' ? 'födém' : 'szint'}`",
            "`${M.levels.length} ${EN ? (M.sup === 'topdown' ? (M.levels.length === 1 ? 'slab' : 'slabs') : (M.levels.length === 1 ? 'level' : 'levels')) : M.sup === 'topdown' ? 'födém' : 'szint'}`")
    save('js/sim3d.js', en_import(t, 'sim3d'))
print('kész (2)')
# --- formázási javítás (mindkét nyelven): a hosszú nyíllánc („a → b → c …”) a nyilak után törhet (390 px-en eddig kilógott)
t = load('chapters/07_kulonleges.html')
if 'munkaszint&nbsp;→<wbr>' not in t:
    t = rep(t, '<b>körbezárás szádfallal → ideiglenes munkaszint → horgonyzás → víz alatti betonozás → horgony rögzítése</b>',
            '<b>körbezárás szádfallal&nbsp;→<wbr> ideiglenes munkaszint&nbsp;→<wbr> horgonyzás&nbsp;→<wbr> víz alatti betonozás&nbsp;→<wbr> horgony rögzítése</b>')
    save('chapters/07_kulonleges.html', t)
print('kész (3)')
