/**
 * Formatierung für Anzeige und Export (Locale-abhaengig, an einer Stelle gebündelt).
 */
import { CONFIG } from './config.js';

const currencyFormatter = new Intl.NumberFormat(CONFIG.locale, {
  style: 'currency',
  currency: CONFIG.currency,
  minimumFractionDigits: 2,
  maximumFractionDigits: 2
});

const decimalFormatter = new Intl.NumberFormat(CONFIG.locale, {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2
});

const dateTimeFormatter = new Intl.DateTimeFormat(CONFIG.locale, {
  dateStyle: 'short',
  timeStyle: 'medium'
});

/** Betrag als Währung, z. B. "1.234,56 EUR". */
export function formatCurrency(value) {
  return currencyFormatter.format(Number.isFinite(value) ? value : 0);
}

/** Dezimalzahl mit zwei Nachkommastellen. */
export function formatDecimal(value) {
  return decimalFormatter.format(Number.isFinite(value) ? value : 0);
}

/** Dauer in ms als HH:MM:SS (Stunden wachsen über 24 h hinaus). */
export function formatDuration(ms) {
  const totalSeconds = Math.max(0, Math.floor((Number.isFinite(ms) ? ms : 0) / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return [hours, minutes, seconds].map((part) => String(part).padStart(2, '0')).join(':');
}

/** Zeitstempel (epoch ms) als lokale Datums-/Zeitangabe. */
export function formatDateTime(timestamp) {
  if (!Number.isFinite(timestamp)) return '-';
  return dateTimeFormatter.format(new Date(timestamp));
}

/** ISO-Zeitstempel für maschinenlesbare Exporte. */
export function formatIso(timestamp) {
  if (!Number.isFinite(timestamp)) return '';
  return new Date(timestamp).toISOString();
}
