/**
 * Drift-freier Takt-Geber für die Anzeige.
 *
 * setInterval driftet und wird in Hintergrund-Tabs gedrosselt. Deshalb wird
 * jeder Tick per setTimeout auf den nächsten Sollzeitpunkt geplant. Die
 * Kostenberechnung selbst haengt ohnehin an Zeitstempeln (siehe costEngine),
 * der Ticker beeinflusst also nur die Aktualisierungsfrequenz der Darstellung.
 */
export function createTicker(onTick, intervalMs) {
  let handle = null;
  let nextAt = 0;

  function loop() {
    onTick();
    if (handle === null) return; // während onTick gestoppt
    nextAt += intervalMs;
    const delay = Math.max(0, nextAt - Date.now());
    handle = setTimeout(loop, delay);
  }

  return {
    start() {
      if (handle !== null) return;
      nextAt = Date.now() + intervalMs;
      handle = setTimeout(loop, intervalMs);
    },
    stop() {
      if (handle === null) return;
      clearTimeout(handle);
      handle = null;
    },
    isRunning() {
      return handle !== null;
    }
  };
}
