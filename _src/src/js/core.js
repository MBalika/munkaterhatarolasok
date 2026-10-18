// Közös segédek minden widgethez.
// Használat egy fejezetmodulban:
//   import { register, slider, seg, stat, svg, h, fmt, onTheme } from './core.js';
//   register('m0calc', (root) => { ... });   // a <div class="w" data-w="m0calc"> elemre fut, lustán (görgetéskor)

export const $ = (s, r = document) => r.querySelector(s);
export const $$ = (s, r = document) => [...r.querySelectorAll(s)];
export const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
export const lerp = (a, b, t) => a + (b - a) * t;
export const smooth = (t) => { t = clamp(t, 0, 1); return t * t * (3 - 2 * t); };
export const rad = (d) => (d * Math.PI) / 180;
export const deg = (r) => (r * 180) / Math.PI;

/** Magyar számformátum: fmt(1.234, 2) → "1,23" */
export function fmt(x, d = 1) {
  if (x === null || x === undefined || !isFinite(x)) return '–';
  return Number(x).toLocaleString('hu-HU', { minimumFractionDigits: d, maximumFractionDigits: d }).replace(/ /g, ' ');
}

/** DOM-építő: h('div', {class:'x', onclick: fn}, 'szöveg', child) */
export function h(tag, attrs = {}, ...kids) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v === null || v === undefined || v === false) continue;
    if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2), v);
    else if (k === 'html') el.innerHTML = v;
    else if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
    else el.setAttribute(k, v === true ? '' : v);
  }
  for (const c of kids.flat()) if (c !== null && c !== undefined && c !== false) el.append(c.nodeType ? c : document.createTextNode(String(c)));
  return el;
}

const SVGNS = 'http://www.w3.org/2000/svg';
/** SVG-építő: svg('rect', {x:0, y:0, width:10, height:5, class:'f-steel'}, parent) */
export function svg(tag, attrs = {}, parent = null) {
  const el = document.createElementNS(SVGNS, tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v === null || v === undefined || v === false) continue;
    if (k === 'text') el.textContent = v;
    else if (k === 'html') el.innerHTML = v;
    else el.setAttribute(k, v);
  }
  if (parent) parent.appendChild(el);
  return el;
}
/** Új <svg class="fig" viewBox> létrehozása egy szülőben */
export function figure(parent, w, h_, cls = 'fig') {
  const s = svg('svg', { viewBox: `0 0 ${w} ${h_}`, class: cls, role: 'img' });
  parent.appendChild(s);
  return s;
}
/** Elem tartalmának ürítése */
export function clear(el) { while (el.firstChild) el.removeChild(el.firstChild); return el; }

/** Pontlista → SVG path "d" */
export const pathD = (pts, close = false) => pts.map((p, i) => (i ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join(' ') + (close ? ' Z' : '');

/** Lineáris skála */
export function scale(d0, d1, r0, r1) {
  const f = (x) => r0 + ((x - d0) / (d1 - d0)) * (r1 - r0);
  f.inv = (y) => d0 + ((y - r0) / (r1 - r0)) * (d1 - d0);
  return f;
}

/* ---------------------------------------------------------------- vezérlők */
function setP(input) {
  const p = ((input.value - input.min) / (input.max - input.min)) * 100;
  input.style.setProperty('--p', p + '%');
}

/**
 * Csúszka. slider(parent, {label:'Kohézió', sym:'c', min, max, step, value, unit:'kPa', d:1, hint, fmt:(v)=>string})
 * Visszaad: {el, input, get v(), set(v), on(fn)}; fn(v) minden változáskor.
 */
export function slider(parent, o) {
  const fns = [];
  const d = o.d ?? (String(o.step ?? 1).split('.')[1] || '').length;
  const show = o.fmt || ((v) => fmt(v, d));
  const val = h('span', { class: 'ctl-val' });
  const input = h('input', { type: 'range', min: o.min, max: o.max, step: o.step ?? 1, value: o.value, 'aria-label': o.label });
  const el = h('label', { class: 'ctl' },
    h('span', { class: 'ctl-top' }, h('span', { class: 'ctl-lab', html: o.label + (o.sym ? ` <i>${o.sym}</i>` : '') }), val),
    input,
    o.hint ? h('span', { class: 'ctl-hint', html: o.hint }) : null);
  const upd = () => { val.innerHTML = show(+input.value) + (o.unit ? `<small>${o.unit}</small>` : ''); setP(input); };
  input.addEventListener('input', () => { upd(); fns.forEach((f) => f(+input.value)); });
  upd();
  if (parent) parent.appendChild(el);
  return {
    el, input,
    get v() { return +input.value; },
    set(v, fire = true) { input.value = v; upd(); if (fire) fns.forEach((f) => f(+input.value)); },
    on(f) { fns.push(f); return this; },
  };
}

/**
 * Szegmentált választó. seg(parent, {label, options:[{v:'a', t:'Első'}], value:'a', vert:false})
 */
export function seg(parent, o) {
  const fns = [];
  let cur = o.value ?? o.options[0].v;
  const box = h('div', { class: 'seg' + (o.vert ? ' vert' : ''), role: 'radiogroup', 'aria-label': o.label || '' });
  const btns = o.options.map((op) => {
    const b = h('button', { type: 'button', role: 'radio', html: op.t, title: op.title || null });
    b.addEventListener('click', () => { api.set(op.v); });
    box.appendChild(b);
    return [op.v, b];
  });
  const el = o.label ? h('div', { class: 'ctl' }, h('span', { class: 'ctl-lab', html: o.label }), box) : box;
  const paint = () => btns.forEach(([v, b]) => { b.classList.toggle('on', v === cur); b.setAttribute('aria-checked', v === cur); });
  paint();
  if (parent) parent.appendChild(el);
  const api = {
    el,
    get v() { return cur; },
    set(v, fire = true) { cur = v; paint(); if (fire) fns.forEach((f) => f(cur)); },
    on(f) { fns.push(f); return api; },
  };
  return api;
}

/** Kapcsoló. toggle(parent, {label, value:false}) */
export function toggle(parent, o) {
  const fns = [];
  const input = h('input', { type: 'checkbox' });
  input.checked = !!o.value;
  const el = h('label', { class: 'tog' }, input, h('span', { html: o.label }));
  input.addEventListener('change', () => fns.forEach((f) => f(input.checked)));
  if (parent) parent.appendChild(el);
  return { el, input, get v() { return input.checked; }, set(v, fire = true) { input.checked = !!v; if (fire) fns.forEach((f) => f(input.checked)); }, on(f) { fns.push(f); return this; } };
}

/** Legördülő. select(parent, {label, options:[{v,t}], value}) */
export function select(parent, o) {
  const fns = [];
  const s = h('select', {}, ...o.options.map((op) => h('option', { value: op.v }, op.t)));
  s.value = o.value ?? o.options[0].v;
  const el = h('label', { class: 'selrow' }, h('span', { class: 'ctl-lab', html: o.label }), s);
  s.addEventListener('change', () => fns.forEach((f) => f(s.value)));
  if (parent) parent.appendChild(el);
  return { el, get v() { return s.value; }, set(v, fire = true) { s.value = v; if (fire) fns.forEach((f) => f(s.value)); }, on(f) { fns.push(f); return this; } };
}

/** Kijelző csempe. stat(parent, {label, unit}) → .set(value, state?, text?) ; state: 'ok'|'warn'|'bad'|null */
export function stat(parent, o) {
  const v = h('div', { class: 'stat-v' });
  const el = h('div', { class: 'stat' }, h('div', { class: 'stat-l', html: o.label }), v);
  if (parent) parent.appendChild(el);
  return {
    el,
    set(val, state = null, text = null) {
      v.innerHTML = (text ?? (typeof val === 'number' ? fmt(val, o.d ?? 1) : val)) + (o.unit ? `<small>${o.unit}</small>` : '');
      if (state) el.dataset.s = state; else delete el.dataset.s;
    },
  };
}

/** Szöveges ítélet doboz. verdict(parent) → .set(state, title, html) */
export function verdict(parent) {
  const el = h('div', { class: 'verdict' });
  if (parent) parent.appendChild(el);
  return { el, set(state, title, html = '') { el.dataset.s = state || ''; el.innerHTML = `<b>${title}</b>${html}`; } };
}

/**
 * Widget-váz. A <div class="w" data-w="..." data-title="..." data-sub="..." data-layout="wide|ctl-right">
 * elemhez fejlécet + vezérlő- és ábraoszlopot épít. Visszaad: {ctrls, viz, out, foot}
 * Ha a HTML-ben már van .w-head, nem ír újat.
 */
export function shell(root, o = {}) {
  const title = o.title ?? root.dataset.title ?? '';
  const sub = o.sub ?? root.dataset.sub ?? '';
  const tag = o.tag ?? root.dataset.tag ?? 'Interaktív';
  if (!root.querySelector(':scope > .w-head')) {
    root.prepend(h('div', { class: 'w-head' }, h('span', { class: 'w-tag' }, tag), h('span', { class: 'w-title', html: title }), sub ? h('span', { class: 'w-sub', html: sub }) : null));
  }
  const layout = o.layout ?? root.dataset.layout ?? '';
  const body = h('div', { class: 'w-body ' + layout });
  const ctrls = layout === 'wide' ? null : h('div', { class: 'w-ctrls' });
  const viz = h('div', { class: 'w-viz' });
  if (ctrls) body.append(ctrls);
  body.append(viz);
  root.append(body);
  const out = o.out === false ? null : h('div', { class: 'w-out' });
  if (out) root.append(out);
  const foot = o.foot ? h('div', { class: 'w-foot', html: o.foot }) : null;
  if (foot) root.append(foot);
  return { ctrls, viz, out, foot, body };
}

/* ---------------------------------------------------------------- téma */
const themeFns = [];
/** Aktuális CSS-változó érték (pl. canvas rajzhoz): cssVar('--water') */
export function cssVar(name, el = document.documentElement) { return getComputedStyle(el).getPropertyValue(name).trim(); }
/** Témaváltáskor (világos/sötét) újrarajzolás: onTheme(() => draw()) */
export function onTheme(fn) { themeFns.push(fn); }
export function fireTheme() { themeFns.forEach((f) => { try { f(); } catch (e) { console.error(e); } }); }
if (window.matchMedia) matchMedia('(prefers-color-scheme: dark)').addEventListener?.('change', fireTheme);
export const isDark = () => {
  const t = document.documentElement.dataset.theme;
  if (t) return t === 'dark';
  return window.matchMedia && matchMedia('(prefers-color-scheme: dark)').matches;
};

/* ---------------------------------------------------------------- canvas */
/** HiDPI canvas, a szélességhez igazítva. fitCanvas(canvas, aspect=0.56, draw) → {ctx, w, h}; átméretezéskor draw() */
export function fitCanvas(canvas, aspect, draw) {
  const st = { ctx: canvas.getContext('2d'), w: 0, h: 0 };
  const rs = () => {
    const w = canvas.clientWidth || canvas.parentElement.clientWidth;
    const hh = Math.round(w * aspect);
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = Math.round(w * dpr); canvas.height = Math.round(hh * dpr);
    canvas.style.height = hh + 'px';
    st.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    st.w = w; st.h = hh;
    draw && draw(st);
  };
  new ResizeObserver(rs).observe(canvas.parentElement);
  rs();
  return st;
}

/** requestAnimationFrame ciklus, ami csak akkor fut, ha az elem látszik. loop(el, (t, dt) => {...}) → {stop()} */
export function loop(el, fn) {
  let vis = false, raf = 0, last = 0, stopped = false;
  const tick = (t) => {
    if (stopped || !vis) { raf = 0; return; }
    const dt = last ? Math.min(0.05, (t - last) / 1000) : 0; last = t;
    fn(t / 1000, dt);
    raf = requestAnimationFrame(tick);
  };
  new IntersectionObserver((es) => {
    vis = es[0].isIntersecting;
    if (vis && !raf) { last = 0; raf = requestAnimationFrame(tick); }
  }, { rootMargin: '100px' }).observe(el);
  return { stop() { stopped = true; } };
}

/* ---------------------------------------------------------------- regisztráció, lusta indítás */
const REG = new Map();
/** register('nev', (root) => {...}) – a data-w="nev" elemekre fut, amikor a képernyő közelébe kerülnek */
export function register(name, fn) { REG.set(name, fn); }
export function bootWidgets() {
  const io = new IntersectionObserver((es) => {
    for (const e of es) {
      if (!e.isIntersecting) continue;
      const el = e.target; io.unobserve(el);
      const fn = REG.get(el.dataset.w);
      if (!fn) { console.warn('Nincs ilyen widget:', el.dataset.w); continue; }
      try { fn(el); el.dataset.ready = '1'; } catch (err) { console.error('Widget hiba:', el.dataset.w, err); }
    }
  }, { rootMargin: '600px 0px' });
  $$('[data-w]').forEach((el) => io.observe(el));
}
/** Minden widget azonnali indítása (teszteléshez: ?all) */
export function bootAll() { $$('[data-w]').forEach((el) => { if (el.dataset.ready) return; const fn = REG.get(el.dataset.w); if (fn) { try { fn(el); el.dataset.ready = '1'; } catch (e) { console.error(el.dataset.w, e); } } }); }

/* ---------------------------------------------------------------- talaj-rajz segédek (SVG) */
/**
 * Rétegzett talajmetszet SVG-be. soilSection(g, {x0, x1, y0, layers:[{to: y, cls:'f-soilB', name}], hatch:true})
 * y0 a terepszint (px), minden réteg a felette lévő aljától a megadott y-ig tart.
 */
export function soilSection(parent, o) {
  const g = svg('g', {}, parent);
  let top = o.y0;
  for (const L of o.layers) {
    svg('rect', { x: o.x0, y: top, width: o.x1 - o.x0, height: L.to - top, class: L.cls }, g);
    if (o.hatch !== false) svg('rect', { x: o.x0, y: top, width: o.x1 - o.x0, height: L.to - top, fill: `url(#${L.pat || 'pat-soil'})`, opacity: 0.55 }, g);
    top = L.to;
  }
  return g;
}

/** Nyíl SVG-ben: arrow(parent, x1,y1,x2,y2, {cls:'s-bad', w:2, head:7, color:'var(--bad)'})
 *  A szín a cls-ből (s-bad, s-ok, s-ink, s-water, s-acc, s-steel, s-grp, s-muted, s-warn) vagy a color-ból jön – a fej is. */
const ARROWC = { 's-bad': 'var(--bad)', 's-ok': 'var(--ok)', 's-ink': 'var(--ink)', 's-water': 'var(--water)', 's-acc': 'var(--accent)', 's-steel': 'var(--steelm2)', 's-grp': 'var(--grp)', 's-muted': 'var(--muted)', 's-warn': 'var(--warn)', 's-line': 'var(--line2)' };
export function arrow(parent, x1, y1, x2, y2, o = {}) {
  const g = svg('g', {}, parent);
  g.style.color = o.color || ARROWC[o.cls] || 'var(--ink)';
  const w = o.w ?? 2, hd = o.head ?? 7;
  const a = Math.atan2(y2 - y1, x2 - x1);
  svg('line', { x1, y1, x2: x2 - Math.cos(a) * hd * 0.7, y2: y2 - Math.sin(a) * hd * 0.7, 'stroke-width': w, 'stroke-linecap': 'round', stroke: 'currentColor' }, g);
  const p = [[x2, y2], [x2 - Math.cos(a - 0.42) * hd, y2 - Math.sin(a - 0.42) * hd], [x2 - Math.cos(a + 0.42) * hd, y2 - Math.sin(a + 0.42) * hd]];
  svg('path', { d: pathD(p, true), fill: 'currentColor' }, g);
  return g;
}

/** Méretvonal: dim(parent, x1,y1,x2,y2, 'szöveg', {off: 0, side: 1}) */
export function dim(parent, x1, y1, x2, y2, text, o = {}) {
  const g = svg('g', { class: 'dim' }, parent);
  svg('line', { x1, y1, x2, y2, class: 's-muted', 'stroke-width': 1 }, g);
  const tk = 4;
  const a = Math.atan2(y2 - y1, x2 - x1) + Math.PI / 2;
  for (const [x, y] of [[x1, y1], [x2, y2]]) svg('line', { x1: x - Math.cos(a) * tk, y1: y - Math.sin(a) * tk, x2: x + Math.cos(a) * tk, y2: y + Math.sin(a) * tk, class: 's-muted', 'stroke-width': 1 }, g);
  const mx = (x1 + x2) / 2 + (o.dx || 0), my = (y1 + y2) / 2 + (o.dy || 0);
  svg('text', { x: mx, y: my, class: 't-num halo', 'text-anchor': o.anchor || 'middle', 'dominant-baseline': 'middle', text }, g);
  return g;
}
