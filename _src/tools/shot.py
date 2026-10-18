#!/usr/bin/env python3
"""Képernyőkép az oldal egy eleméről (QA).
Használat: python3 _src/tools/shot.py '#ducolas' out.jpg [--page dev-ducolas.html] [--w 1440] [--dark] [--all] [--h 900] [--clip 0:2400]
  - a http://localhost:8765/ szervert használja (python3 -m http.server 8765 a repó gyökerében)
  - --all: minden widget azonnal indul (?all), különben görgetéssel indulnak
  - kiírja a konzolhibákat
"""
import asyncio, sys
from playwright.async_api import async_playwright

args = sys.argv[1:]
sel, out = args[0], args[1]
W = int(args[args.index('--w') + 1]) if '--w' in args else 1440
HH = int(args[args.index('--h') + 1]) if '--h' in args else 900
dark = '--dark' in args
allw = '--all' in args
clip = args[args.index('--clip') + 1] if '--clip' in args else None
page = args[args.index('--page') + 1] if '--page' in args else ''
url = 'http://localhost:8765/' + page + ('?all' if allw else '')

async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(args=['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'])
        ctx = await b.new_context(viewport={'width': W, 'height': HH}, device_scale_factor=1, color_scheme='dark' if dark else 'light')
        pg = await ctx.new_page()
        pg.on('console', lambda m: print('CONSOLE', m.type, m.text[:300]) if m.type in ('error', 'warning') else None)
        pg.on('pageerror', lambda e: print('PAGEERR', str(e)[:500]))
        await pg.goto(url, wait_until='load')
        await pg.add_style_tag(content='html{scroll-behavior:auto!important} .reveal{opacity:1!important;transform:none!important}')
        await pg.wait_for_timeout(800)
        el = await pg.query_selector(sel)
        if not el:
            print('nincs ilyen elem', sel); await b.close(); return
        await el.scroll_into_view_if_needed()
        # végiggörgetünk az elemen, hogy a lusta widgetek elinduljanak
        box = await el.bounding_box()
        y0 = await pg.evaluate('scrollY')
        top = y0 + box['y']
        for k in range(0, int(box['height']) + HH, HH // 2):
            await pg.evaluate(f'scrollTo(0,{top + k})')
            await pg.wait_for_timeout(120)
        await pg.evaluate(f'scrollTo(0,{top})')
        await pg.wait_for_timeout(1200)
        if clip:
            a, c = [int(x) for x in clip.split(':')]
            box = await el.bounding_box()
            await pg.screenshot(path=out, type='jpeg', quality=72, full_page=True, clip={'x': 0, 'y': y0 * 0 + top + a, 'width': W, 'height': c - a})
        else:
            await el.screenshot(path=out, type='jpeg', quality=72)
        print('ok', out)
        await b.close()

asyncio.run(main())
