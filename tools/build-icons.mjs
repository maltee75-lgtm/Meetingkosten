/**
 * Erzeugt aus den SVG-Mastern in icons/ alle PNG-Groessen und favicon.ico.
 *
 * Aufruf:  npm run build:icons     (benoetigt Playwright: npm i -D playwright)
 *
 * Master sind die SVG-Dateien - die PNG/ICO-Dateien sind generierte Artefakte,
 * werden aber mit eingecheckt, damit die App ohne Build-Schritt auslieferbar bleibt.
 * Kleine Groessen (16-48 px) werden absichtlich aus icon-small.svg gerendert:
 * Zifferblatt und Krone loesen dort nicht mehr auf.
 */
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const ICONS_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'icons');

/** [Quell-SVG, Ziel-PNG, Kantenlaenge in px] */
const PNG_JOBS = [
  ['icon.svg', 'icon-1024.png', 1024],
  ['icon.svg', 'icon-512.png', 512],
  ['icon.svg', 'icon-192.png', 192],
  ['icon.svg', 'apple-touch-icon.png', 180],
  ['icon.svg', 'icon-64.png', 64],
  ['icon-maskable.svg', 'icon-maskable-512.png', 512],
  ['icon-maskable.svg', 'icon-maskable-192.png', 192],
  ['icon-small.svg', 'icon-48.png', 48],
  ['icon-small.svg', 'icon-32.png', 32],
  ['icon-small.svg', 'icon-16.png', 16]
];

/** Groessen im favicon.ico (Reihenfolge = Reihenfolge im Verzeichnis der Datei) */
const ICO_SIZES = [16, 32, 48, 64];

async function loadPlaywright() {
  try {
    return await import('playwright');
  } catch {
    console.error('Playwright fehlt. Einmalig installieren:  npm i -D playwright && npx playwright install chromium');
    process.exit(1);
  }
}

/**
 * Baut eine ICO-Datei aus vorhandenen PNGs (PNG-Payload, von Windows Vista an
 * und von allen aktuellen Browsern unterstuetzt). Spart eine Abhaengigkeit.
 */
async function buildIco(sizes, targetPath) {
  const images = [];
  for (const size of sizes) {
    images.push({ size, data: await readFile(path.join(ICONS_DIR, `icon-${size}.png`)) });
  }

  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); // reserviert
  header.writeUInt16LE(1, 2); // Typ 1 = Icon
  header.writeUInt16LE(images.length, 4);

  const directory = Buffer.alloc(16 * images.length);
  let offset = header.length + directory.length;
  images.forEach((image, index) => {
    const entry = index * 16;
    directory.writeUInt8(image.size === 256 ? 0 : image.size, entry + 0); // Breite
    directory.writeUInt8(image.size === 256 ? 0 : image.size, entry + 1); // Hoehe
    directory.writeUInt8(0, entry + 2); // Farbpalette: keine
    directory.writeUInt8(0, entry + 3); // reserviert
    directory.writeUInt16LE(1, entry + 4); // Farbebenen
    directory.writeUInt16LE(32, entry + 6); // Bit pro Pixel
    directory.writeUInt32LE(image.data.length, entry + 8);
    directory.writeUInt32LE(offset, entry + 12);
    offset += image.data.length;
  });

  await writeFile(targetPath, Buffer.concat([header, directory, ...images.map((image) => image.data)]));
  return images.reduce((sum, image) => sum + image.data.length, 0);
}

const { chromium } = await loadPlaywright();
const browser = await chromium.launch({
  // Im Container liegt Chromium an fester Stelle; sonst nimmt Playwright seinen eigenen Download.
  executablePath: process.env.CHROMIUM_PATH || undefined,
  args: ['--no-sandbox']
});
const page = await browser.newPage();

for (const [source, target, size] of PNG_JOBS) {
  const svg = await readFile(path.join(ICONS_DIR, source), 'utf8');
  await page.setViewportSize({ width: size, height: size });
  // SVG inline einsetzen: Chromium blockiert file://-Unterressourcen in setContent.
  await page.setContent(
    `<style>html,body{margin:0;padding:0;background:transparent}svg{display:block;width:${size}px;height:${size}px}</style>${svg}`
  );
  await page.locator('svg').waitFor();
  await page.screenshot({ path: path.join(ICONS_DIR, target), omitBackground: true });
  console.log(`${target.padEnd(28)} ${String(size).padStart(4)} px  aus ${source}`);
}

await browser.close();

const icoBytes = await buildIco(ICO_SIZES, path.join(ICONS_DIR, 'favicon.ico'));
console.log(`${'favicon.ico'.padEnd(28)} ${ICO_SIZES.join(', ')} px  (${icoBytes} Byte Bilddaten)`);
