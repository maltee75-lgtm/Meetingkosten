/**
 * UI-Schicht: bindet DOM-Elemente, liest Eingaben, rendert die Anzeige.
 * Enthaelt keine Kostenlogik - die liegt vollständig in costEngine.js.
 */
import { CONFIG } from './config.js';
import { formatCurrency, formatDecimal, formatDuration, formatDateTime } from './format.js';

const STATUS_TEXT = {
  idle: 'Bereit',
  running: 'Läuft',
  paused: 'Pausiert'
};

function byId(id) {
  const element = document.getElementById(id);
  if (!element) throw new Error(`Meetingkosten: Element #${id} fehlt im HTML.`);
  return element;
}

function clamp(value, { min, max }) {
  return Math.min(max, Math.max(min, value));
}

/**
 * @param {object} handlers
 * @param {() => void} handlers.onToggle
 * @param {() => void} handlers.onReset
 * @param {(patch: object) => void} handlers.onParamsChange  Teilnehmer/Satz/Overhead
 * @param {(title: string) => void} handlers.onTitleChange
 * @param {() => void} handlers.onCopy
 * @param {() => void} handlers.onCsv
 */
export function createUi(handlers) {
  const el = {
    status: byId('status'),
    cost: byId('cost'),
    clock: byId('clock'),
    ratePerHour: byId('ratePerHour'),
    ratePerMinute: byId('ratePerMinute'),
    costPerParticipant: byId('costPerParticipant'),
    personHours: byId('personHours'),
    btnToggle: byId('btnToggle'),
    btnReset: byId('btnReset'),
    btnCopy: byId('btnCopy'),
    btnCsv: byId('btnCsv'),
    exportHint: byId('exportHint'),
    form: byId('paramsForm'),
    title: byId('title'),
    participants: byId('participants'),
    hourlyRate: byId('hourlyRate'),
    overhead: byId('overhead'),
    segmentRows: byId('segmentRows'),
    segmentCount: byId('segmentCount')
  };

  const numericFields = [
    { input: el.participants, key: 'participants', limits: CONFIG.limits.participants },
    { input: el.hourlyRate, key: 'hourlyRate', limits: CONFIG.limits.hourlyRate },
    { input: el.overhead, key: 'overhead', limits: CONFIG.limits.overhead }
  ];

  let renderedSegments = -1;
  let hintTimer = null;

  // --- Eingaben -------------------------------------------------------------
  numericFields.forEach(({ input, key, limits }) => {
    // Waehrend des Tippens: nur übernehmen, wenn der Wert plausibel ist.
    input.addEventListener('input', () => {
      const value = Number.parseFloat(input.value.replace(',', '.'));
      if (!Number.isFinite(value)) return;
      handlers.onParamsChange({ [key]: clamp(value, limits) });
    });
    // Nach dem Verlassen des Feldes: Wert normalisieren und zurückschreiben.
    input.addEventListener('change', () => {
      const parsed = Number.parseFloat(input.value.replace(',', '.'));
      const value = clamp(Number.isFinite(parsed) ? parsed : CONFIG.defaults[key], limits);
      input.value = String(value);
      handlers.onParamsChange({ [key]: value });
    });
  });

  el.title.addEventListener('input', () => handlers.onTitleChange(el.title.value));

  // Plus/Minus-Schaltflächen und Schnellwahl-Chips
  el.form.addEventListener('click', (event) => {
    const stepButton = event.target.closest('[data-step]');
    if (stepButton) {
      const key = stepButton.dataset.step;
      const field = numericFields.find((entry) => entry.key === key);
      if (!field) return;
      const current = Number.parseFloat(field.input.value.replace(',', '.')) || 0;
      const value = clamp(current + Number(stepButton.dataset.delta), field.limits);
      field.input.value = String(value);
      handlers.onParamsChange({ [key]: value });
      return;
    }

    const presetButton = event.target.closest('[data-preset]');
    if (presetButton) {
      const key = presetButton.dataset.preset;
      const field = numericFields.find((entry) => entry.key === key);
      if (!field) return;
      const value = clamp(Number(presetButton.dataset.value), field.limits);
      field.input.value = String(value);
      handlers.onParamsChange({ [key]: value });
    }
  });

  // --- Steuerung ------------------------------------------------------------
  el.btnToggle.addEventListener('click', () => handlers.onToggle());
  el.btnReset.addEventListener('click', () => handlers.onReset());
  el.btnCopy.addEventListener('click', () => handlers.onCopy());
  el.btnCsv.addEventListener('click', () => handlers.onCsv());

  // Tastatur: Leertaste = Start/Pause, R = Zurücksetzen (nicht in Eingabefeldern).
  document.addEventListener('keydown', (event) => {
    const target = event.target;
    const isFormField = target instanceof HTMLElement &&
      (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable);
    if (isFormField || event.metaKey || event.ctrlKey || event.altKey) return;

    if (event.code === 'Space') {
      event.preventDefault();
      handlers.onToggle();
    } else if (event.key === 'r' || event.key === 'R') {
      event.preventDefault();
      handlers.onReset();
    }
  });

  // --- Ausgabe --------------------------------------------------------------
  function renderSegments(sample) {
    if (sample.segments.length === renderedSegments) return;
    renderedSegments = sample.segments.length;
    el.segmentCount.textContent = String(sample.segments.length);

    if (sample.segments.length === 0) {
      el.segmentRows.innerHTML =
        '<tr class="table__empty"><td colspan="6">Noch keine abgeschlossenen Segmente.</td></tr>';
      return;
    }

    const rows = sample.segments.map((segment, index) => {
      const cells = [
        String(index + 1),
        formatDateTime(segment.from),
        formatDuration(segment.durationMs),
        String(segment.participants),
        formatDecimal(segment.hourlyRate * segment.overhead),
        formatCurrency(segment.cost)
      ];
      return `<tr>${cells.map((cell) => `<td>${cell}</td>`).join('')}</tr>`;
    });
    el.segmentRows.innerHTML = rows.join('');
  }

  return {
    /** Eingabefelder auf den Modellzustand setzen (Init, Reset, Restore). */
    syncInputs(params, title) {
      if (document.activeElement !== el.title) el.title.value = title ?? '';
      numericFields.forEach(({ input, key }) => {
        if (document.activeElement === input) return;
        input.value = String(params[key]);
      });
    },

    render(sample) {
      const state = sample.running ? 'running' : sample.elapsedMs > 0 ? 'paused' : 'idle';
      el.status.dataset.state = state;
      el.status.textContent = STATUS_TEXT[state];

      el.cost.textContent = formatCurrency(sample.cost);
      el.clock.textContent = formatDuration(sample.elapsedMs);
      el.ratePerHour.textContent = `${formatCurrency(sample.ratePerHour)}/h`;
      el.ratePerMinute.textContent = formatCurrency(sample.ratePerMinute);
      el.costPerParticipant.textContent = formatCurrency(sample.costPerParticipant);
      el.personHours.textContent = formatDecimal(sample.personHours);

      el.btnToggle.textContent = sample.running ? 'Pause' : sample.elapsedMs > 0 ? 'Weiter' : 'Start';
      el.btnToggle.classList.toggle('btn--running', sample.running);
      el.btnReset.disabled = !sample.running && sample.elapsedMs === 0;
      el.btnCopy.disabled = sample.elapsedMs === 0;
      el.btnCsv.disabled = sample.elapsedMs === 0;

      document.title = sample.running
        ? `${formatCurrency(sample.cost)} - Meetingkosten`
        : 'Meetingkosten';

      renderSegments(sample);
    },

    /** Kurze Rückmeldung zu Export-Aktionen. */
    showHint(message) {
      el.exportHint.textContent = message;
      if (hintTimer) clearTimeout(hintTimer);
      hintTimer = setTimeout(() => {
        el.exportHint.textContent = '';
      }, 4000);
    },

    /** Erzwingt das Neuzeichnen der Segmenttabelle (z. B. nach Reset). */
    invalidateSegments() {
      renderedSegments = -1;
    }
  };
}
