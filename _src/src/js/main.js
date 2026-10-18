// Belépési pont – a fejezetmodulok a betöltéskor regisztrálják a widgeteiket, kvízeiket.
import { bootWidgets, bootAll } from './core.js';
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
}
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
