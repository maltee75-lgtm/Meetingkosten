/**
 * Erzeugt aus den Quellen eine einzelne, in sich geschlossene HTML-Datei:
 *   dist/meetingkosten.html
 *
 * Aufruf:  npm run build   (ohne externe Abhängigkeiten)
 *
 * Zweck: Die modulare Fassung (index.html + ES-Module) benötigt einen
 * http(s)-Aufruf, weil Browser ES-Module über file:// blockieren. Die
 * Einzeldatei lässt sich dagegen speichern und per Doppelklick öffnen -
 * praktisch, wenn kein Webserver oder Hosting zur Verfügung steht.
 *
 * Es gibt bewusst keinen Bundler: die Module werden in Abhängigkeitsreihenfolge
 * zusammengefügt, import/export-Zeilen entfernt und in eine IIFE gekapselt.
 * Voraussetzung dafür ist, dass die Modul-Oberflächen kollisionsfrei benannt sind.
 */
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');

/** Abhängigkeitsreihenfolge: ein Modul steht hinter allem, was es benutzt. */
const MODULE_ORDER = [
  'js/config.js',
  'js/format.js',
  'js/costEngine.js',
  'js/ticker.js',
  'js/storage.js',
  'js/exporter.js',
  'js/pwa.js',
  'js/ui.js',
  'js/app.js'
];

const read = (relativePath) => readFile(path.join(ROOT, relativePath), 'utf8');

/** import-Anweisungen entfernen und export-Schlüsselwörter abstreifen. */
function stripModuleSyntax(source) {
  return source
    .replace(/^import\b[^;]*;\s*$/gm, '')
    .replace(/^export\s+/gm, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

async function buildBundle() {
  const parts = [];
  for (const modulePath of MODULE_ORDER) {
    parts.push(`  /* ----- ${modulePath} ----- */\n${stripModuleSyntax(await read(modulePath))}`);
  }
  return `(() => {\n'use strict';\n\n${parts.join('\n\n')}\n})();`;
}

const [html, css, iconSvg] = await Promise.all([
  read('index.html'),
  read('css/style.css'),
  read('icons/icon-small.svg')
]);
const bundle = await buildBundle();

const faviconDataUri = 'data:image/svg+xml,' + encodeURIComponent(iconSvg.replace(/\n\s*/g, ' '));

let output = html
  // Externe Verweise entfernen: in einer Einzeldatei gibt es keine Nachbardateien.
  .replace(/^\s*<link rel="(icon|apple-touch-icon|manifest)"[^>]*>\n/gm, '')
  .replace(/^\s*<link rel="stylesheet"[^>]*>\n/gm, `  <style>\n${css}\n  </style>\n`)
  .replace(/^\s*<script type="module"[^>]*><\/script>\n/gm, `  <script>\n${bundle}\n  </script>\n`)
  // Installationsangebot entfällt: ohne Manifest und Service Worker nicht möglich.
  .replace(/^\s*<button type="button" id="btnInstall".*\n/gm, '')
  .replace(/\s*<details class="install-help">[\s\S]*?<\/details>\n/m, '\n')
  .replace('<title>Meetingkosten</title>', '<title>Meetingkosten</title>\n  <link rel="icon" href="' + faviconDataUri + '" />');

output = output.replace(
  '<!DOCTYPE html>',
  '<!DOCTYPE html>\n<!-- Erzeugt von tools/build-standalone.mjs - nicht direkt bearbeiten.\n     Quellen: index.html, css/style.css, js/*.js -->'
);

await mkdir(path.join(ROOT, 'dist'), { recursive: true });
const target = path.join(ROOT, 'dist', 'meetingkosten.html');
await writeFile(target, output, 'utf8');

const kib = (output.length / 1024).toFixed(1);
console.log(`dist/meetingkosten.html erzeugt (${kib} KiB, ${MODULE_ORDER.length} Module eingebettet)`);
for (const marker of ['<style>', '<script>', 'createCostEngine', 'buildSegmentsCsv']) {
  if (!output.includes(marker)) {
    console.error(`FEHLER: erwarteter Inhalt fehlt: ${marker}`);
    process.exit(1);
  }
}
if (/\b(import|export)\s/.test(output.slice(output.indexOf('<script>')))) {
  console.error('FEHLER: im Bundle sind noch import/export-Anweisungen enthalten.');
  process.exit(1);
}
console.log('Prüfung: keine Modul-Syntax, alle Bestandteile eingebettet.');
