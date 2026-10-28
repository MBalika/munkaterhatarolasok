// Belépési pont – a fejezetmodulok a betöltéskor regisztrálják a widgeteiket, kvízeiket.
import { bootWidgets, bootAll, GUARD } from './core.js';
import { LAYOUT } from './layout.js';
import { initUI } from './ui.js';
import { initHero } from './hero.js';
import './ch_alapok.js';
import './ch_ducolas.js';
import './ch_falak.js';
import './ch_szegezes.js';
import './ch_megtamasztas.js';
import './ch_kulonleges.js';
import './ch_dontes.js';
import './sim3d.js';
import './tf.js';

function start() {
  initUI();
  initHero();
  if (/[?&]all\b/.test(location.search)) bootAll(); else bootWidgets();
  // formázás: nem törő egységek + magyar elválasztás (a dinamikus tartalmat MutationObserver követi)
  try { GUARD.start(); } catch (e) { console.error('Formázás-őr hiba', e); }
  try { LAYOUT.start(); } catch (e) { console.error('Elrendezés hiba', e); }
}
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
