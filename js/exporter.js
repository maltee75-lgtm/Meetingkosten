/**
 * Export der Ergebnisse: Kurzfassung als Text (Clipboard) und Verlauf als CSV.
 * Alles rein lokal - es werden keine Daten an Server übertragen.
 */
import { formatCurrency, formatDecimal, formatDuration, formatDateTime, formatIso } from './format.js';

/** Managementtaugliche Kurzfassung, z. B. für Protokoll oder Chat. */
export function buildSummaryText(sample, title) {
  const rows = [
    ['Dauer', formatDuration(sample.elapsedMs)],
    ['Teilnehmer', String(sample.params.participants)],
    ['Stundensatz', `${formatCurrency(sample.params.hourlyRate)} / Person / h`],
    ['Overhead-Faktor', formatDecimal(sample.params.overhead)],
    ['Kostenrate', `${formatCurrency(sample.ratePerHour)} / h`],
    ['Aufwand', `${formatDecimal(sample.personHours)} Personenstunden`],
    ['Kosten gesamt', formatCurrency(sample.cost)],
    ['Kosten je Teilnehmer', formatCurrency(sample.costPerParticipant)]
  ];
  if (sample.startedAt) {
    rows.push(['Start', formatDateTime(sample.startedAt)]);
  }
  const width = Math.max(...rows.map(([label]) => label.length)) + 2;
  return [
    `Meetingkosten${title ? `: ${title}` : ''}`,
    ...rows.map(([label, value]) => `${`${label}:`.padEnd(width)}${value}`)
  ].join('\n');
}

const CSV_SEPARATOR = ';';

function csvCell(value) {
  const text = String(value ?? '');
  return /[";\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

/**
 * Verlauf als CSV (Semikolon-getrennt, Excel-freundlich in de-DE).
 * Eine Zeile pro Segment plus Summenzeile.
 */
export function buildSegmentsCsv(sample, title) {
  const header = [
    'Segment',
    'Von (ISO)',
    'Bis (ISO)',
    'Dauer (s)',
    'Teilnehmer',
    'Stundensatz',
    'Overhead',
    'Kosten',
    'Ursache'
  ];
  const rows = sample.segments.map((segment, index) => [
    index + 1,
    formatIso(segment.from),
    formatIso(segment.to),
    Math.round(segment.durationMs / 1000),
    segment.participants,
    segment.hourlyRate,
    segment.overhead,
    segment.cost.toFixed(4),
    segment.reason
  ]);

  const openDelta = sample.elapsedMs - sample.segments.reduce((sum, s) => sum + s.durationMs, 0);
  if (openDelta > 0) {
    rows.push([
      rows.length + 1,
      '',
      '',
      Math.round(openDelta / 1000),
      sample.params.participants,
      sample.params.hourlyRate,
      sample.params.overhead,
      (sample.cost - sample.segments.reduce((sum, s) => sum + s.cost, 0)).toFixed(4),
      'laufend'
    ]);
  }

  rows.push([
    'Summe',
    '',
    '',
    Math.round(sample.elapsedMs / 1000),
    '',
    '',
    '',
    sample.cost.toFixed(4),
    title || ''
  ]);

  return [header, ...rows].map((row) => row.map(csvCell).join(CSV_SEPARATOR)).join('\r\n');
}

/** Dateiname ohne Sonderzeichen, mit Zeitstempel. */
export function buildFileName(title, extension) {
  const stamp = new Date().toISOString().slice(0, 16).replace(/[:T]/g, '-');
  const slug = (title || 'meeting')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40) || 'meeting';
  return `meetingkosten_${slug}_${stamp}.${extension}`;
}

/** Datei im Browser herunterladen (Blob + temporärer Link). */
export function downloadFile(fileName, content, mimeType = 'text/plain;charset=utf-8') {
  const blob = new Blob(['﻿', content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

/** In die Zwischenablage kopieren, mit Fallback für aeltere/unsichere Kontexte. */
export async function copyToClipboard(text) {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch (error) {
    console.warn('Meetingkosten: Clipboard-API nicht verfügbar.', error);
  }
  try {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.setAttribute('readonly', 'readonly');
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    const ok = document.execCommand('copy');
    textarea.remove();
    return ok;
  } catch (error) {
    console.warn('Meetingkosten: Kopieren fehlgeschlagen.', error);
    return false;
  }
}
