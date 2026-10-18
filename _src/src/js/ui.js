// Oldalkeret: téma, navigáció, szintléc, videók, galéria, YouTube, fülek, kvíz, igaz/hamis
import { $, $$, h, fmt, clamp, fireTheme } from './core.js';
import { VIDEOS, VGROUPS, YT, CHAPTERS, MAXDEPTH } from './data.js';

/* ---------------------------------------------------------------- téma */
function initTheme() {
  const root = document.documentElement;
  try { const t = localStorage.getItem('mt-theme'); if (t === 'dark' || t === 'light') root.dataset.theme = t; } catch (e) {}
  const btn = $('#themeBtn');
  if (!btn) return;
  const paint = () => {
    const dark = root.dataset.theme ? root.dataset.theme === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches;
    btn.innerHTML = dark
      ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="4.2"/><path d="M12 2.5v2.2M12 19.3v2.2M4.6 4.6l1.6 1.6M17.8 17.8l1.6 1.6M2.5 12h2.2M19.3 12h2.2M4.6 19.4l1.6-1.6M17.8 6.2l1.6-1.6"/></svg>'
      : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5Z"/></svg>';
    btn.setAttribute('aria-label', dark ? 'Világos téma' : 'Sötét téma');
  };
  btn.addEventListener('click', () => {
    const dark = root.dataset.theme ? root.dataset.theme === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches;
    root.dataset.theme = dark ? 'light' : 'dark';
    try { localStorage.setItem('mt-theme', root.dataset.theme); } catch (e) {}
    paint(); fireTheme();
  });
  matchMedia('(prefers-color-scheme: dark)').addEventListener?.('change', paint);
  paint();
}

/* ---------------------------------------------------------------- navigáció + szintléc */
function initNav() {
  const chs = CHAPTERS.map((c) => ({ ...c, el: document.getElementById(c.id) })).filter((c) => c.el);
  // felső menü
  const topnav = $('#topnav');
  const sheetList = $('#navsheetList');
  for (const c of chs) {
    if (c.id === 'bevezeto') continue;
    if (topnav && ['alapok', 'ducolas', 'falak', 'szegezes', 'megtamasztas', 'kulonleges', 'tervezo', 'videotar', 'teszt'].includes(c.id))
      topnav.append(h('a', { href: '#' + c.id, 'data-ch': c.id }, c.id === 'tervezo' ? '3D' : c.id === 'teszt' ? 'Teszt' : c.t.replace('Munkaárok dúcolása', 'Dúcolás').replace('Határoló falak', 'Falak')));
    sheetList?.append(h('a', { href: '#' + c.id }, h('span', { class: 'num' }, '−' + fmt(c.d, 1) + ' m'), c.t));
  }
  const sheet = $('#navsheet');
  $('#menuBtn')?.addEventListener('click', () => { sheet.hidden = false; });
  sheet?.addEventListener('click', (e) => { if (e.target === sheet || e.target.closest('a') || e.target.closest('.x')) sheet.hidden = true; });

  // szintléc
  const rail = $('#rail');
  const items = $('#railItems'), ticks = $('#railTicks'), marker = $('#railMarker');
  const pos = (d) => (d / MAXDEPTH) * 100;
  if (rail) {
    for (let d = 0; d <= MAXDEPTH; d += 5) ticks.append(h('span', { style: { top: pos(d) + '%' } }, d === 0 ? '±0' : '−' + d));
    for (const c of chs) items.append(h('a', { class: 'rail-item', href: '#' + c.id, 'data-ch': c.id, style: { top: pos(c.d) + '%' } }, c.t));
    const wl = h('div', { class: 'rail-water', style: { top: pos(8.2) + '%' } });
    $('.rail-in', rail).append(wl);
    const setStep = () => rail.style.setProperty('--rail-step', (rail.clientHeight / MAXDEPTH) + 'px');
    setStep(); addEventListener('resize', setStep);
  }
  const ro = $('#depthVal');
  let cur = null;
  const upd = () => {
    const y = scrollY + innerHeight * 0.32 * Math.min(1, scrollY / 300);
    let i = 0;
    for (let k = 0; k < chs.length; k++) if (chs[k].el.offsetTop <= y) i = k;
    const a = chs[i], b = chs[i + 1];
    let d = a.d;
    if (b) { const t = clamp((y - a.el.offsetTop) / Math.max(1, b.el.offsetTop - a.el.offsetTop), 0, 1); d = a.d + (b.d - a.d) * t; }
    else d = Math.min(MAXDEPTH, a.d + clamp((y - a.el.offsetTop) / Math.max(1, a.el.offsetHeight), 0, 1) * (MAXDEPTH - a.d));
    if (marker) marker.style.top = pos(d) + '%';
    if (rail) rail.classList.toggle('show', scrollY > (document.getElementById('bevezeto')?.offsetHeight || 400) - 160);
    if (ro) ro.textContent = d < 0.05 || scrollY < 20 ? '±0,0' : '−' + fmt(d, 1);
    if (cur !== a.id) {
      cur = a.id;
      $$('[data-ch]').forEach((el) => el.classList.toggle('on', el.dataset.ch === cur));
      if (rail) rail.style.setProperty('--grp', `var(--g${a.grp || 1})`);
    }
  };
  addEventListener('scroll', upd, { passive: true });
  addEventListener('resize', upd);
  upd();
}

/* ---------------------------------------------------------------- videók */
const VMAP = Object.fromEntries(VIDEOS.map((v) => [v.n, v]));
const thumb = (n) => h('div', { class: 'vthumb' }, h('img', { src: `img/thumb/${n}.jpg`, alt: '', loading: 'lazy', decoding: 'async' }), h('span', { class: 'vplay' }), h('span', { class: 'vdur' }, VMAP[n]?.d || ''));
let order = VIDEOS.map((v) => v.n), curIdx = 0;
function openVideo(n) {
  const v = VMAP[n]; if (!v) return;
  curIdx = order.indexOf(n);
  const m = $('#vmodal');
  $('#vmTitle', m).textContent = `${v.n} · ${v.t}`;
  const fr = $('#vmFrame', m);
  fr.src = `video/${n}.html#autoplay`;
  $('#vmInfo', m).textContent = `${v.d} · zene: ${v.g}`;
  m.hidden = false;
  document.body.style.overflow = 'hidden';
  setTimeout(() => fr.focus(), 300);
}
function closeVideo() {
  const m = $('#vmodal'); if (!m || m.hidden) return;
  $('#vmFrame', m).src = 'about:blank';
  m.hidden = true;
  document.body.style.overflow = '';
}
function initVideos() {
  $$('.vcard[data-video]').forEach((b) => {
    const v = VMAP[b.dataset.video]; if (!v) return;
    b.classList.add('grp' + v.grp);
    b.append(thumb(v.n), h('div', { class: 'vmeta' }, h('div', { class: 'vk' }, `Animációs videó · ${v.n}`), h('b', {}, v.t), h('span', {}, v.s)));
    b.addEventListener('click', () => openVideo(v.n));
    b.setAttribute('aria-label', `Videó lejátszása: ${v.t}`);
  });
  const lib = $('#vlib');
  if (lib) {
    for (const g of VGROUPS) {
      lib.append(h('div', { class: 'vgroup grp' + g.grp }, g.t));
      const grid = h('div', { class: 'vgrid' });
      for (const n of g.ids) {
        const v = VMAP[n];
        grid.append(h('button', { class: 'vtile grp' + v.grp, type: 'button', onclick: () => openVideo(n), 'aria-label': 'Videó: ' + v.t }, thumb(n), h('span', { class: 'vk' }, `${n} · ${v.g}`), h('b', {}, v.t), h('span', { class: 'small muted', style: { padding: '0 4px' } }, v.s)));
      }
      lib.append(grid);
    }
  }
  const m = $('#vmodal');
  m?.addEventListener('click', (e) => { if (e.target === m) closeVideo(); });
  $('#vmClose')?.addEventListener('click', closeVideo);
  $('#vmPrev')?.addEventListener('click', () => openVideo(order[(curIdx - 1 + order.length) % order.length]));
  $('#vmNext')?.addEventListener('click', () => openVideo(order[(curIdx + 1) % order.length]));
  addEventListener('keydown', (e) => { if (e.key === 'Escape') { closeVideo(); closeLightbox(); } });
  addEventListener('message', (e) => { if (e.data && e.data.type === 'mt-video-close') closeVideo(); });
}

/* ---------------------------------------------------------------- galéria + nagyítás */
function closeLightbox() { const lb = $('#lightbox'); if (lb && !lb.hidden) { lb.hidden = true; document.body.style.overflow = ''; } }
function initGallery() {
  const lb = $('#lightbox');
  document.addEventListener('click', (e) => {
    const f = e.target.closest('.gal figure, figure.zoom');
    if (!f) return;
    const img = $('img', f); if (!img) return;
    $('img', lb).src = img.currentSrc || img.src;
    $('img', lb).alt = img.alt;
    $('p', lb).textContent = $('figcaption', f)?.textContent || img.alt || '';
    lb.hidden = false; document.body.style.overflow = 'hidden';
  });
  lb?.addEventListener('click', closeLightbox);
}

/* ---------------------------------------------------------------- YouTube (kattintásra töltődik) */
function initYT() {
  $$('[data-yt]').forEach((el) => {
    const id = el.dataset.yt; const title = el.dataset.title || YT[id] || 'Videó';
    el.classList.add('yt');
    const frame = h('div', { class: 'yt-frame', role: 'button', tabindex: '0', 'aria-label': 'YouTube-videó lejátszása: ' + title },
      h('img', { src: `https://i.ytimg.com/vi/${id}/hqdefault.jpg`, alt: '', loading: 'lazy' }), h('span', { class: 'ytbtn' }));
    const go = () => { frame.innerHTML = ''; frame.append(h('iframe', { src: `https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0`, title, allow: 'autoplay; encrypted-media; picture-in-picture; fullscreen', allowfullscreen: true })); };
    frame.addEventListener('click', go);
    frame.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go(); } });
    el.append(frame, h('div', { class: 'yt-cap' }, h('b', {}, title)));
  });
}

/* ---------------------------------------------------------------- fülek */
function initTabs() {
  $$('[data-tabs]').forEach((box) => {
    const btns = $$(':scope > .tabs-b button', box);
    const panels = $$(':scope > [data-panel]', box);
    const show = (k) => {
      btns.forEach((b) => b.classList.toggle('on', b.dataset.tab === k));
      panels.forEach((p) => { p.hidden = p.dataset.panel !== k; });
      // a rejtett panelben lévő widgetek indítása
      window.dispatchEvent(new Event('resize'));
    };
    btns.forEach((b) => b.addEventListener('click', () => show(b.dataset.tab)));
    show(btns[0]?.dataset.tab);
  });
}

/* ---------------------------------------------------------------- kvíz */
const QUIZ = new Map();
/**
 * defineQuiz('ducolas', 'Kvíz – dúcolás', [{q:'Kérdés?', a:['A','B','C'], c:1, e:'Magyarázat'}])
 * A HTML-ben: <div class="quiz" data-quiz="ducolas"></div>
 */
export function defineQuiz(key, title, qs) { QUIZ.set(key, { title, qs }); }
function shuffleOpts(q) {
  const idx = q.a.map((_, i) => i);
  for (let i = idx.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [idx[i], idx[j]] = [idx[j], idx[i]]; }
  if (q.fixed) return { ...q };
  return { ...q, a: idx.map((i) => q.a[i]), c: idx.indexOf(q.c) };
}
function initQuiz() {
  $$('.quiz[data-quiz]').forEach((box) => {
    const def = QUIZ.get(box.dataset.quiz); if (!def) { console.warn('Nincs kvíz:', box.dataset.quiz); return; }
    let qs, i, res;
    const head = h('div', { class: 'quiz-head' }, h('b', {}, def.title), h('span', {}));
    const body = h('div', { class: 'quiz-body' });
    box.append(head, body);
    const start = () => { qs = def.qs.map(shuffleOpts); i = 0; res = qs.map(() => null); render(); };
    const render = () => {
      body.innerHTML = '';
      $('span', head).textContent = `${res.filter((r) => r === true).length} / ${qs.length}`;
      if (i >= qs.length) {
        const ok = res.filter(Boolean).length;
        const msg = ok === qs.length ? 'Hibátlan! Mehetsz tovább a következő szintre.' : ok >= qs.length * 0.7 ? 'Szép eredmény – a hibásakat érdemes még egyszer átnézni.' : 'Érdemes a fejezetet (és a videót) még egyszer átnézni.';
        body.append(h('div', { class: 'q-res' }, h('b', {}, `${ok} / ${qs.length}`), h('p', {}, msg), h('button', { class: 'btn btn-line', type: 'button', onclick: start }, 'Újra')));
        return;
      }
      const q = qs[i];
      const exp = h('div', { class: 'q-exp', hidden: true });
      const next = h('button', { class: 'btn btn-line btn-sm', type: 'button', disabled: true, onclick: () => { i++; render(); } }, i === qs.length - 1 ? 'Eredmény' : 'Következő →');
      const opts = h('div', { class: 'q-opts' });
      q.a.forEach((t, k) => {
        const b = h('button', { type: 'button' }, h('i', {}, 'ABCDE'[k]), h('span', { html: t }));
        b.addEventListener('click', () => {
          if (res[i] !== null) return;
          res[i] = k === q.c;
          $$('button', opts).forEach((x, kk) => { x.disabled = true; if (kk === q.c) x.classList.add('right'); });
          if (k !== q.c) b.classList.add('wrong');
          exp.hidden = false; exp.innerHTML = (res[i] ? '<b>Helyes.</b> ' : '<b>Nem egészen.</b> ') + (q.e || '');
          next.disabled = false;
          $('span', head).textContent = `${res.filter((r) => r === true).length} / ${qs.length}`;
          dots();
        });
        opts.append(b);
      });
      const dotBox = h('div', { class: 'q-dots' });
      const dots = () => { dotBox.innerHTML = ''; res.forEach((r, k) => dotBox.append(h('i', { class: (r === true ? 'ok' : r === false ? 'bad' : '') + (k === i ? ' cur' : '') }))); };
      dots();
      body.append(h('div', { class: 'q-n' }, `${i + 1}. kérdés / ${qs.length}`), h('div', { class: 'q-t', html: q.q }), opts, exp, h('div', { class: 'q-nav' }, dotBox, next));
    };
    start();
  });
}

/* ---------------------------------------------------------------- igaz/hamis */
let TF = [];
/** defineTF([{s:'Állítás', v:true, e:'Magyarázat'}]) – a HTML-ben: <div id="tf"></div> */
export function defineTF(list) { TF = list; }
function initTF() {
  const box = $('#tf'); if (!box || !TF.length) return;
  const items = h('div', { class: 'tf' });
  const score = h('div', { class: 'tf-score' });
  let ans = TF.map(() => null);
  const upd = () => {
    const done = ans.filter((a) => a !== null).length, ok = ans.filter((a) => a === true).length;
    score.innerHTML = `<span>Megválaszolva: <b>${done}/${TF.length}</b></span><span>Helyes: <b>${ok}</b></span>` + (done === TF.length ? `<span>${ok >= TF.length * 0.9 ? 'Kiváló!' : ok >= TF.length * 0.7 ? 'Jó eredmény!' : 'Érdemes ismételni.'}</span>` : '');
    const rb = h('button', { type: 'button', onclick: reset }, 'Újrakezdés');
    score.append(rb);
  };
  const reset = () => { ans = TF.map(() => null); build(); upd(); };
  const build = () => {
    items.innerHTML = '';
    TF.forEach((it, k) => {
      const e = h('div', { class: 'e', hidden: true, html: it.e || '' });
      const row = h('div', { class: 'tf-item' });
      const bt = h('button', { type: 'button' }, 'Igaz'), bf = h('button', { type: 'button' }, 'Hamis');
      const pick = (val, b) => {
        if (ans[k] !== null) return;
        ans[k] = val === it.v;
        b.classList.add('sel', ans[k] ? 'right' : 'wrong');
        bt.disabled = bf.disabled = true;
        row.classList.add(ans[k] ? 'ok' : 'bad');
        e.hidden = false; e.innerHTML = `<b>${it.v ? 'Igaz.' : 'Hamis.'}</b> ` + (it.e || '');
        upd();
      };
      bt.addEventListener('click', () => pick(true, bt)); bf.addEventListener('click', () => pick(false, bf));
      row.append(h('span', { class: 'n' }, String(k + 1).padStart(2, '0')), h('span', { class: 's', html: it.s }), h('span', { class: 'tf-btns' }, bt, bf), e);
      items.append(row);
    });
  };
  build(); upd();
  box.append(items, score);
}

/* ---------------------------------------------------------------- megjelenés görgetéskor */
function initReveal() {
  const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { rootMargin: '0px 0px -8% 0px' });
  $$('.reveal').forEach((el) => io.observe(el));
}

export function initUI() {
  initTheme(); initNav(); initVideos(); initGallery(); initYT(); initTabs(); initQuiz(); initTF(); initReveal();
}
