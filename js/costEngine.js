/**
 * Kostenmodell und Zeitmessung ("Stoppuhr mit Preisschild").
 *
 * Kostenmodell:
 *   Rate [EUR/s] = Teilnehmer * Stundensatz [EUR/h] * Overhead-Faktor / 3600
 *
 * Wichtig: Parameter können sich während eines laufenden Meetings ändern
 * (jemand kommt dazu, jemand geht). Deshalb wird nicht rückwirkend mit der
 * aktuellen Rate gerechnet, sondern segmentweise akkumuliert: bei jeder
 * Parameteränderung wird das laufende Segment abgeschlossen und verbucht.
 * Das ergibt korrekte Summen und einen nachvollziehbaren Verlauf (Audit-Trail).
 *
 * Zeitbasis ist Date.now() (epoch ms), damit ein Reload der Seite ein laufendes
 * Meeting fortsetzen kann. Negative Deltas (z. B. Zeitumstellung, NTP-Sprung)
 * werden auf 0 begrenzt.
 */
import { CONFIG, SECONDS_PER_HOUR } from './config.js';

const SNAPSHOT_VERSION = 1;

/** Kostenrate pro Sekunde aus den Parametern. */
export function ratePerSecond({ participants, hourlyRate, overhead }) {
  const p = Number(participants) || 0;
  const rate = Number(hourlyRate) || 0;
  const factor = Number(overhead) || 0;
  return (p * rate * factor) / SECONDS_PER_HOUR;
}

/** Kostenrate pro Stunde (Anzeige "Burn Rate"). */
export function ratePerHour(params) {
  return ratePerSecond(params) * SECONDS_PER_HOUR;
}

function sanitizeParams(params) {
  return {
    participants: Number(params.participants) || 0,
    hourlyRate: Number(params.hourlyRate) || 0,
    overhead: Number(params.overhead) || 0
  };
}

/**
 * Erzeugt eine Engine-Instanz.
 * Die Engine ist frei von DOM-Zugriffen und damit einzeln testbar.
 */
export function createCostEngine(initialParams = CONFIG.defaults) {
  let params = sanitizeParams(initialParams);
  let running = false;
  /** Zeitpunkt des ersten Starts (nur für Zusammenfassung). */
  let startedAt = null;
  /** Beginn des aktuell laufenden Segments. */
  let segmentStart = null;
  let accruedMs = 0;
  let accruedCost = 0;
  let accruedPersonMs = 0;
  /** Abgeschlossene Segmente als Audit-Trail. */
  let segments = [];

  function liveMs(now) {
    if (!running || segmentStart === null) return 0;
    return Math.max(0, now - segmentStart);
  }

  /** Laufendes Segment abschließen und verbuchen. */
  function closeSegment(now, reason) {
    if (!running || segmentStart === null) return;
    const durationMs = liveMs(now);
    const cost = (durationMs / 1000) * ratePerSecond(params);
    if (durationMs > 0) {
      segments.push({
        from: segmentStart,
        to: now,
        durationMs,
        participants: params.participants,
        hourlyRate: params.hourlyRate,
        overhead: params.overhead,
        cost,
        reason
      });
      accruedMs += durationMs;
      accruedCost += cost;
      accruedPersonMs += durationMs * params.participants;
    }
    segmentStart = now;
  }

  return {
    /** Momentaufnahme für die Anzeige - verändert den Zustand nicht. */
    sample(now = Date.now()) {
      const live = liveMs(now);
      const perSecond = ratePerSecond(params);
      const elapsedMs = accruedMs + live;
      const cost = accruedCost + (live / 1000) * perSecond;
      const personMs = accruedPersonMs + live * params.participants;
      return {
        running,
        params: { ...params },
        elapsedMs,
        cost,
        ratePerSecond: perSecond,
        ratePerHour: perSecond * SECONDS_PER_HOUR,
        ratePerMinute: perSecond * 60,
        costPerParticipant: params.participants > 0 ? cost / params.participants : 0,
        personHours: personMs / 3_600_000,
        startedAt,
        segments: segments.slice()
      };
    },

    start(now = Date.now()) {
      if (running) return false;
      running = true;
      segmentStart = now;
      if (startedAt === null) startedAt = now;
      return true;
    },

    pause(now = Date.now()) {
      if (!running) return false;
      closeSegment(now, 'pause');
      running = false;
      segmentStart = null;
      return true;
    },

    /** Start/Pause umschalten; liefert den neuen Laufzustand zurück. */
    toggle(now = Date.now()) {
      if (running) {
        this.pause(now);
      } else {
        this.start(now);
      }
      return running;
    },

    reset() {
      running = false;
      startedAt = null;
      segmentStart = null;
      accruedMs = 0;
      accruedCost = 0;
      accruedPersonMs = 0;
      segments = [];
    },

    /**
     * Parameter ändern. Läuft die Uhr, wird das bisherige Segment
     * mit der alten Rate verbucht, bevor die neue Rate greift.
     */
    setParams(patch, now = Date.now()) {
      const next = sanitizeParams({ ...params, ...patch });
      const changed =
        next.participants !== params.participants ||
        next.hourlyRate !== params.hourlyRate ||
        next.overhead !== params.overhead;
      if (!changed) return false;
      closeSegment(now, 'parameter-change');
      params = next;
      return true;
    },

    isRunning() {
      return running;
    },

    /** Serialisierbarer Zustand für localStorage. */
    toJSON() {
      return {
        version: SNAPSHOT_VERSION,
        params: { ...params },
        running,
        startedAt,
        segmentStart,
        accruedMs,
        accruedCost,
        accruedPersonMs,
        segments: segments.slice()
      };
    },

    /** Zustand wiederherstellen (z. B. nach Reload). */
    restore(snapshot) {
      if (!snapshot || snapshot.version !== SNAPSHOT_VERSION) return false;
      params = sanitizeParams(snapshot.params || CONFIG.defaults);
      running = Boolean(snapshot.running);
      startedAt = Number.isFinite(snapshot.startedAt) ? snapshot.startedAt : null;
      segmentStart = running && Number.isFinite(snapshot.segmentStart) ? snapshot.segmentStart : null;
      if (running && segmentStart === null) running = false;
      accruedMs = Number(snapshot.accruedMs) || 0;
      accruedCost = Number(snapshot.accruedCost) || 0;
      accruedPersonMs = Number(snapshot.accruedPersonMs) || 0;
      segments = Array.isArray(snapshot.segments) ? snapshot.segments.slice() : [];
      return true;
    }
  };
}
