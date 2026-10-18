#!/usr/bin/env python3
"""Önálló videó-HTML-ek (NN_Nev_video.html) átalakítása a weboldalhoz.

Használat:  python3 _src/tools/import_videos.py <forrásmappa> [kimeneti mappa = video/]

Mit csinál:
  * a beágyazott MP3-at külön fájlba írja (video/NN.mp3) – így a HTML kisebb, a hang folyamosan töltődik,
  * a minden videóban azonos fű-textúrát egyszer írja ki (video/grass.jpg),
  * elrejti az MP4-export gombot,
  * #autoplay hash esetén magától indul (ha a böngésző engedi a hangot),
  * Esc-re üzen a szülő oldalnak, hogy zárja be a lejátszót.
Új videóváltozat esetén elég újra lefuttatni, majd commit + push.
"""
import base64, pathlib, re, sys

src = pathlib.Path(sys.argv[1])
out = pathlib.Path(sys.argv[2]) if len(sys.argv) > 2 else pathlib.Path(__file__).resolve().parents[2] / 'video'
out.mkdir(parents=True, exist_ok=True)

SNIPPET_HEAD = '<script>window.__NO_EXPORT=true;</script>'
SNIPPET_TAIL = r"""<script>
(function(){
  addEventListener('keydown', function(e){ if(e.key==='Escape'){ try{ parent.postMessage({type:'mt-video-close'}, '*'); }catch(_){} } });
  if(!/autoplay/.test(location.hash)) return;
  var silent='data:audio/wav;base64,UklGRrQBAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YZABAACAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA';
  var tries=0, iv=setInterval(function(){
    var st=document.getElementById('start'); tries++;
    if(st){ clearInterval(iv);
      var a=new Audio(silent); var p=a.play();
      if(p&&p.then){ p.then(function(){ a.pause(); st.click(); }).catch(function(){}); } else { st.click(); }
    } else if(tries>200){ clearInterval(iv); }
  },100);
})();
</script>"""

grass_done = False
files = sorted(p for p in src.glob('[0-9][0-9]_*video.html'))
if not files:
    sys.exit('Nem találtam NN_*video.html fájlt: ' + str(src))
for f in files:
    nn = f.name[:2]
    s = f.read_text(encoding='utf-8')
    m = re.search(r'data:audio/mpeg;base64,([A-Za-z0-9+/=]+)', s)
    if m:
        (out / f'{nn}.mp3').write_bytes(base64.b64decode(m.group(1)))
        s = s[:m.start()] + f'{nn}.mp3' + s[m.end():]
    g = re.search(r'data:image/jpeg;base64,([A-Za-z0-9+/=]+)', s)
    if g and len(g.group(1)) > 500_000:  # a nagy fű-textúra
        if not grass_done:
            (out / 'grass.jpg').write_bytes(base64.b64decode(g.group(1)))
            grass_done = True
        s = s[:g.start()] + 'grass.jpg' + s[g.end():]
    s = s.replace('<body>', '<body>' + SNIPPET_HEAD, 1)
    s = s.replace('</body>', SNIPPET_TAIL + '</body>', 1)
    (out / f'{nn}.html').write_text(s, encoding='utf-8')
    print(nn, f.name, f'{len(s)/1e6:.2f} MB html', f'{(out / (nn + ".mp3")).stat().st_size/1e6:.2f} MB mp3' if m else 'nincs mp3')
