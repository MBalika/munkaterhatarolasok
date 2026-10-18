#!/usr/bin/env python3
"""Teljes oldal ellenőrzése: konzolhibák, widgetek indulása, belső linkek, képek, kvízek.
Használat: python3 _src/tools/qa_all.py [page=index.html] [--shots outdir] [--w 1440] [--dark]
"""
import asyncio, sys, json, os
from playwright.async_api import async_playwright

args = sys.argv[1:]
page = args[0] if args and not args[0].startswith('--') else 'index.html'
W = int(args[args.index('--w') + 1]) if '--w' in args else 1440
shots = args[args.index('--shots') + 1] if '--shots' in args else None
dark = '--dark' in args

CHECK = r"""
(() => {
  const r = {};
  const ws = [...document.querySelectorAll('[data-w]')];
  r.widgets = ws.length;
  r.notReady = ws.filter(w => !w.dataset.ready).map(w => w.dataset.w);
  r.emptyWidgets = ws.filter(w => w.dataset.ready && w.querySelectorAll('svg,canvas,button,input').length === 0).map(w => w.dataset.w);
  r.quizzes = [...document.querySelectorAll('.quiz[data-quiz]')].map(q => [q.dataset.quiz, q.querySelector('.q-t') ? 'ok' : 'EMPTY']);
  r.tf = document.querySelectorAll('#tf .tf-item').length;
  const ids = new Set([...document.querySelectorAll('[id]')].map(e => e.id));
  r.badLinks = [...new Set([...document.querySelectorAll('a[href^="#"]')].map(a => a.getAttribute('href').slice(1)).filter(h => h && !ids.has(h)))];
  r.dupIds = [...document.querySelectorAll('[id]')].map(e => e.id).filter((v, i, a) => a.indexOf(v) !== i);
  r.vcards = [...document.querySelectorAll('.vcard[data-video]')].map(b => b.dataset.video);
  r.yt = [...document.querySelectorAll('[data-yt]')].map(b => b.dataset.yt);
  r.imgs = [...document.querySelectorAll('main img')].filter(i => i.complete && i.naturalWidth === 0 && !i.src.includes('ytimg')).map(i => i.getAttribute('src'));
  r.sections = [...document.querySelectorAll('section.ch')].map(s => [s.id, Math.round(s.offsetHeight)]);
  r.hscroll = document.documentElement.scrollWidth > innerWidth + 1;
  r.wide = [...document.querySelectorAll('main *')].filter(e => { const b = e.getBoundingClientRect(); return b.right > innerWidth + 2 && getComputedStyle(e).position !== 'fixed' && !e.closest('.tscroll,.gal,.formula,.techmap') ; }).slice(0, 12).map(e => (e.className && e.className.baseVal === undefined ? e.className : e.tagName) + ' ' + Math.round(e.getBoundingClientRect().right));
  return r;
})()
"""

async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(args=['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'])
        ctx = await b.new_context(viewport={'width': W, 'height': 900}, color_scheme='dark' if dark else 'light')
        pg = await ctx.new_page()
        errs = []
        pg.on('console', lambda m: errs.append(m.type + ': ' + m.text[:240]) if m.type == 'error' and 'ERR_TUNNEL' not in m.text and 'ytimg' not in m.text else None)
        pg.on('pageerror', lambda e: errs.append('PAGEERR: ' + str(e)[:400]))
        await pg.goto(f'http://localhost:8765/{page}?all', wait_until='load')
        await pg.add_style_tag(content='html{scroll-behavior:auto!important} .reveal{opacity:1!important;transform:none!important}')
        await pg.wait_for_timeout(4000)
        r = await pg.evaluate(CHECK)
        print(json.dumps(r, ensure_ascii=False, indent=1))
        print('ERRORS:', len(errs))
        for e in errs[:40]: print('  ', e)
        if shots:
            os.makedirs(shots, exist_ok=True)
            for sid, hgt in r['sections']:
                el = await pg.query_selector('#' + sid)
                await el.scroll_into_view_if_needed()
                await pg.wait_for_timeout(600)
                try:
                    await el.screenshot(path=f'{shots}/{sid}.jpg', type='jpeg', quality=62, timeout=120000)
                    print('shot', sid)
                except Exception as ex:
                    print('shot fail', sid, str(ex)[:120])
        await b.close()

asyncio.run(main())
