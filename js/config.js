/**
 * Zentrale Konfiguration der App.
 * Alle Vorgaben, Grenzen und Formatierungs-Einstellungen an einer Stelle,
 * damit Anpassungen (z. B. andere Währung, anderer Takt) ohne Code-Suche möglich sind.
 */

export const SECONDS_PER_HOUR = 3600;

export const CONFIG = Object.freeze({
  /** Anzeige-Takt in ms. 1000 = Sekundentakt (wie eine Stoppuhr). */
  tickMs: 1000,

  /** Intervall für das automatische Sichern des Zustands (ms). */
  autosaveMs: 5000,

  locale: 'de-DE',
  currency: 'EUR',

  /** Schlüssel im localStorage; Version im Namen erlaubt spätere Migrationen. */
  storageKey: 'meetingkosten.state.v1',

  defaults: Object.freeze({
    title: '',
    participants: 5,
    hourlyRate: 80,
    overhead: 1
  }),

  limits: Object.freeze({
    participants: { min: 1, max: 1000, step: 1 },
    hourlyRate: { min: 0, max: 100000, step: 5 },
    overhead: { min: 1, max: 5, step: 0.05 }
  })
});
