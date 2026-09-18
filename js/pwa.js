/**
 * Installation als App und Offline-Betrieb.
 *
 * Beides ist optional: ohne Service Worker (z. B. bei Aufruf über file://)
 * läuft die App unverändert weiter, nur ohne Offline-Cache und ohne
 * Installationsangebot des Browsers.
 */

/** Service Worker registrieren, wenn die Umgebung es zulässt. */
export function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return;
  // file:// unterstützt keine Service Worker, eingebettete Vorschauen sollen keinen registrieren.
  if (!location.protocol.startsWith('http')) return;
  if (window.top !== window.self) return;

  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch((error) => {
      console.warn('Meetingkosten: Offline-Betrieb nicht verfügbar.', error);
    });
  });
}

/**
 * Installationsangebot des Browsers an eine Schaltfläche binden.
 * Chrome, Edge und Android liefern dafür das Ereignis `beforeinstallprompt`;
 * iOS/iPadOS kennt es nicht, dort führt der Weg über "Teilen > Zum Home-Bildschirm".
 *
 * @param {HTMLElement} button  Schaltfläche, die nur bei Installierbarkeit sichtbar wird
 * @param {(message: string) => void} [notify]  optionale Rückmeldung an die Oberfläche
 */
export function setupInstallPrompt(button, notify = () => {}) {
  if (!button) return;
  let deferredPrompt = null;

  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault();
    deferredPrompt = event;
    button.hidden = false;
  });

  button.addEventListener('click', async () => {
    if (!deferredPrompt) return;
    button.disabled = true;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    deferredPrompt = null;
    button.disabled = false;
    if (outcome === 'accepted') {
      button.hidden = true;
      notify('Meetingkosten wurde installiert.');
    }
  });

  window.addEventListener('appinstalled', () => {
    deferredPrompt = null;
    button.hidden = true;
  });

  // Bereits installiert und im eigenen Fenster gestartet: kein Angebot nötig.
  if (window.matchMedia('(display-mode: standalone)').matches) {
    button.hidden = true;
  }
}
