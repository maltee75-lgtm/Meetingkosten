/**
 * Bootstrap: verdrahtet Kostenmodell (costEngine), Takt (ticker),
 * Persistenz (storage), Oberfläche (ui) und Export (exporter).
 */
import { CONFIG } from './config.js';
import { createCostEngine } from './costEngine.js';
import { createTicker } from './ticker.js';
import { createUi } from './ui.js';
import { loadState, saveState } from './storage.js';
import { registerServiceWorker, setupInstallPrompt } from './pwa.js';
import {
  buildSummaryText,
  buildSegmentsCsv,
  buildFileName,
  downloadFile,
  copyToClipboard
} from './exporter.js';

const engine = createCostEngine(CONFIG.defaults);
let title = CONFIG.defaults.title;

// --- Persistenz -------------------------------------------------------------
const snapshot = loadState();
let restoredRunning = false;
if (snapshot) {
  title = typeof snapshot.title === 'string' ? snapshot.title : title;
  engine.restore(snapshot.engine);
  restoredRunning = engine.isRunning();
}

function persist() {
  saveState({ title, engine: engine.toJSON() });
}

// --- UI ---------------------------------------------------------------------
const ui = createUi({
  onToggle: () => {
    engine.toggle();
    syncTicker();
    update();
    persist();
  },

  onReset: () => {
    const sample = engine.sample();
    if (sample.elapsedMs > 0 && !window.confirm('Messung zurücksetzen? Der bisherige Verlauf wird verworfen.')) {
      return;
    }
    engine.reset();
    ui.invalidateSegments();
    syncTicker();
    update();
    // Zeit und Verlauf werden verworfen, die Parameter bleiben erhalten.
    persist();
    ui.showHint('Messung zurückgesetzt.');
  },

  onParamsChange: (patch) => {
    engine.setParams(patch);
    update();
    persist();
  },

  onTitleChange: (value) => {
    title = value;
    persist();
  },

  onCopy: async () => {
    const text = buildSummaryText(engine.sample(), title);
    const ok = await copyToClipboard(text);
    ui.showHint(ok ? 'Zusammenfassung in der Zwischenablage.' : 'Kopieren nicht möglich - bitte Verlauf als CSV nutzen.');
  },

  onCsv: () => {
    const sample = engine.sample();
    downloadFile(buildFileName(title, 'csv'), buildSegmentsCsv(sample, title), 'text/csv;charset=utf-8');
    ui.showHint('CSV-Datei wurde erzeugt.');
  }
});

// --- Takt -------------------------------------------------------------------
const ticker = createTicker(() => update(), CONFIG.tickMs);

function syncTicker() {
  if (engine.isRunning()) {
    ticker.start();
  } else {
    ticker.stop();
  }
}

function update() {
  const sample = engine.sample();
  ui.syncInputs(sample.params, title);
  ui.render(sample);
}

// Beim Wechsel zurück in den Tab sofort aktualisieren: Hintergrund-Tabs werden
// von Browsern gedrosselt, die Berechnung selbst bleibt aber zeitstempelbasiert.
document.addEventListener('visibilitychange', () => {
  if (!document.hidden) update();
});

// Zustand regelmäßig und beim Verlassen der Seite sichern.
setInterval(() => {
  if (engine.isRunning()) persist();
}, CONFIG.autosaveMs);
window.addEventListener('pagehide', persist);

syncTicker();
update();

// Installation als App mit eigenem Icon und Offline-Betrieb (beides optional).
registerServiceWorker();
setupInstallPrompt(document.getElementById('btnInstall'), (message) => ui.showHint(message));

if (restoredRunning) {
  ui.showHint('Laufende Messung wurde fortgesetzt.');
}
