/**
 * Erzeugt die Screenshots für das Web-App-Manifest.
 *
 * Aufruf:  npm run build:screenshots   (benötigt Playwright und dist/meetingkosten.html)
 *
 * Chrome auf Android zeigt beim Installieren einen ausführlicheren Dialog
 * ("richer install UI"), wenn das Manifest Name, Beschreibung und Screenshots
 * mit form_factor "narrow" enthält. Aufgenommen wird die Einzeldatei-Fassung
 * über file:// - sie ist optisch identisch und braucht keinen Server.
 */
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const APP_URL = 'file://' + path.join(ROOT, 'dist', 'meetingkosten.html');

/** Geraetetypisches Android-Format; alle Screenshots im gleichen Seitenverhaeltnis. */
const VIEWPORT = { width: 412, height: 915 };

async function loadPlaywright() {
  try {
    return await import('playwright');
  } catch {
    console.error('Playwright fehlt. Einmalig installieren:  npm i -D playwright && npx playwright install chromium');
    process.exit(1);
  }
}

const { chromium } = await loadPlaywright();
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH || undefined,
  args: ['--no-sandbox']
});
const page = await browser.newPage({ viewport: VIEWPORT, deviceScaleFactor: 1 });

// 1. Live-Anzeige mit laufender Messung - kein leerer Anfangszustand.
await page.goto(APP_URL);
await page.evaluate(() => {
  const title = document.getElementById('title');
  title.value = 'Design-Review';
  title.dispatchEvent(new Event('input', { bubbles: true }));
  document.getElementById('participants').value = '7';
  document.getElementById('participants').dispatchEvent(new Event('input', { bubbles: true }));
  document.getElementById('hourlyRate').value = '95';
  document.getElementById('hourlyRate').dispatchEvent(new Event('input', { bubbles: true }));
});
await page.click('#btnToggle');
await page.waitForTimeout(2600);
await page.screenshot({ path: path.join(ROOT, 'screenshots', 'android-live.png') });
console.log('screenshots/android-live.png  ', `${VIEWPORT.width}x${VIEWPORT.height}`);

// 2. Parameter und Verlauf
await page.click('[data-step="participants"][data-delta="1"]');
await page.waitForTimeout(1200);
await page.keyboard.press('Space');
await page.click('#logDetails > summary');
await page.evaluate(() => document.getElementById('paramsForm').scrollIntoView({ block: 'start' }));
await page.waitForTimeout(300);
await page.screenshot({ path: path.join(ROOT, 'screenshots', 'android-parameter.png') });
console.log('screenshots/android-parameter.png', `${VIEWPORT.width}x${VIEWPORT.height}`);

await browser.close();
