# Meetingkosten

Live-Kostenzähler für Besprechungen: Anzahl Teilnehmer und Stundensatz eingeben, **Start** drücken – die
Kosten laufen im Sekundentakt nach oben, wie eine Stoppuhr mit Preisschild.

Die App ist eine reine Web-Anwendung ohne Build-Prozess und ohne Abhängigkeiten (HTML, CSS, ES-Module).
Alle Daten bleiben im Browser; es findet keine Datenübertragung an Server statt.

---

## 1. Schnellstart

| Variante | Vorgehen | Hinweis |
|---|---|---|
| Lokaler Server (empfohlen) | `npm start` oder `python3 -m http.server 8080`, dann <http://localhost:8080> | ES-Module benötigen `http(s)://`, ein Doppelklick auf `index.html` (`file://`) wird vom Browser blockiert |
| GitHub Pages / Intranet | Verzeichnisinhalt statisch ausliefern | Kein Backend, kein Build erforderlich |
| Einzeldatei | `dist/meetingkosten.html` herunterladen und per Doppelklick öffnen | Alles inline (kein Server, kein Netz); erzeugt mit `npm run build` |
| Als App mit Icon | siehe Abschnitt 3 | Installation über das Web-App-Manifest, eigenes Icon und Offline-Betrieb |
| Tests | `npm test` | Node-eigener Test-Runner, keine Installation nötig |

## 2. Bedienung

| Element | Wirkung |
|---|---|
| **Start / Pause / Weiter** | Startet, pausiert und setzt die Messung fort (Tastatur: `Leertaste`) |
| **Zurücksetzen** | Verwirft Zeit und Verlauf, Parameter bleiben erhalten (Tastatur: `R`, mit Sicherheitsabfrage) |
| **Anzahl Mitarbeiter** | Auch während des laufenden Meetings änderbar (`+` / `−`) |
| **Stundensatz (€/h)** | Freie Eingabe oder Schnellwahl-Chips |
| **Overhead-Faktor** | `1,00` = reiner Stundensatz, z. B. `1,30` bis `2,00` für Vollkosten |
| **Zusammenfassung kopieren** | Kurzfassung als Text in die Zwischenablage (protokolltauglich) |
| **Verlauf als CSV** | Segmentliste inkl. Summenzeile, Semikolon-getrennt (Excel de-DE) |

Kennzahlen in der Live-Anzeige: Gesamtkosten, Dauer, Kostenrate (€/h und €/min), Kosten je Teilnehmer
sowie der Aufwand in Personenstunden (Ph). Bei laufender Messung zeigt auch der Browser-Tab-Titel die
aktuellen Kosten – praktisch beim Teilen des Bildschirms.

## 3. Installation als App (Icon)

Die App ist eine PWA: sie lässt sich mit eigenem Icon installieren und läuft danach in einem eigenen
Fenster – auch ohne Netzverbindung (Service Worker `sw.js`, App-Shell im Cache).

**Voraussetzung:** Auslieferung über `https://` (oder `http://localhost`). Installierbar ist die App also
über GitHub Pages, ein Intranet-Hosting oder lokal über `npm start`. Für den Fall ohne Hosting gibt es die
Einzeldatei-Variante (siehe unten).

| Plattform | Weg zum Icon |
|---|---|
| Windows / macOS (Chrome, Edge) | Schaltfläche **„App installieren"** oben rechts in der App, oder das Installationssymbol im Adressfeld. Ergebnis: Icon im Startmenü bzw. Dock, eigenes Fenster |
| Android (Chrome) | Menü ⋮ → „App installieren" / „Zum Startbildschirm hinzufügen" |
| iPhone / iPad (Safari) | Teilen-Symbol → „Zum Home-Bildschirm" |
| Firefox (Desktop) | Kein PWA-Install; Lesezeichen in der Symbolleiste oder Einzeldatei-Variante verwenden |

### GitHub Pages aktivieren (einmalig)

`Settings → Pages → Build and deployment → Source: Deploy from a branch`, Branch wählen (`main` oder
`claude/meeting-cost-calculator-un91il`), Ordner `/ (root)`, speichern. Die App ist dann unter
`https://<benutzer>.github.io/Meetingkosten/` erreichbar und installierbar.
**Hinweis:** Bei einem öffentlichen Repository ist die Seite öffentlich erreichbar; für ein privates
Repository benötigt GitHub Pages einen bezahlten Plan.

### Ohne Hosting: Einzeldatei plus Verknüpfung

1. `dist/meetingkosten.html` und `icons/favicon.ico` (Windows) bzw. `icons/icon-1024.png` (macOS) speichern.
2. Datei per Doppelklick öffnen – die App läuft vollständig lokal.
3. Icon setzen:
   - **Windows:** Rechtsklick auf die Datei → *Verknüpfung erstellen* → Rechtsklick auf die Verknüpfung →
     *Eigenschaften* → *Anderes Symbol…* → `favicon.ico` auswählen.
   - **macOS:** `icon-1024.png` öffnen, mit ⌘C kopieren, im Finder die Datei auswählen → *Informationen*
     (⌘I) → kleines Icon oben anklicken → ⌘V.

### Icon-Dateien

Master sind die SVG-Dateien, die PNG/ICO-Dateien werden daraus erzeugt (`npm run build:icons`) und sind
mit eingecheckt, damit die App ohne Build-Schritt auslieferbar bleibt.

| Datei | Verwendung |
|---|---|
| `icons/icon.svg` | Master; Favicon in modernen Browsern |
| `icons/icon-small.svg` | Reduzierte Variante (nur €-Zeichen) für 16–48 px |
| `icons/icon-maskable.svg` | Android-Variante mit Safe Zone (wird rund/quadratisch beschnitten) |
| `icons/icon-192.png`, `icon-512.png`, `icon-1024.png` | Manifest, Homescreen, Startmenü |
| `icons/icon-maskable-192.png`, `-512.png` | Manifest, `purpose: maskable` |
| `icons/apple-touch-icon.png` (180 px) | iPhone / iPad Home-Bildschirm |
| `icons/favicon.ico` (16/32/48/64) | Windows-Verknüpfungen, ältere Browser |

## 4. Kostenmodell

```
Rate [€/s] = Teilnehmer × Stundensatz [€/h] × Overhead-Faktor ÷ 3600
Kosten     = Σ (Segmentdauer [s] × Rate des Segments [€/s])
```

**Segmentweise Akkumulation:** Ändert sich während des Meetings ein Parameter (Teilnehmer kommt dazu,
Satz wird korrigiert), wird das laufende Segment mit der bisherigen Rate abgeschlossen und verbucht.
Die neue Rate gilt erst ab diesem Zeitpunkt. Damit ist die Summe auch bei wechselnder Besetzung korrekt
und über die Segmentliste nachvollziehbar (Audit-Trail, exportierbar).

Beispiel: 30 min mit 5 Personen à 80 €/h, danach 30 min mit 8 Personen à 80 €/h

| Segment | Dauer | Teilnehmer | Rate | Kosten |
|---|---|---|---|---|
| 1 | 30 min | 5 | 400,00 €/h | 200,00 € |
| 2 | 30 min | 8 | 640,00 €/h | 320,00 € |
| **Summe** | **60 min** | – | – | **520,00 €** |

Eine rückwirkende Rechnung mit der Endbesetzung (8 Personen × 1 h = 640 €) wäre um 120 € zu hoch.

## 5. Architektur

Modularer Aufbau mit klarer Trennung von Kostenlogik, Takt, Persistenz und Darstellung. Die Kostenlogik
ist DOM-frei und damit ohne Browser testbar.

```
                          +----------------------+
                          |       app.js         |  Bootstrap / Verdrahtung
                          +----------+-----------+
                                     |
       +-----------+-----------------+-------------+--------------+
       |           |                 |             |              |
 +-----v-----+ +---v-----+    +------v-----+ +-----v------+ +-----v----+
 | ticker.js | | ui.js   |    | storage.js | | exporter.js| | pwa.js   |
 | Sekunden- | | DOM,    |    | local-     | | Text / CSV | | Install  |
 | takt      | | Eingabe |    | Storage    | | Download   | | Offline  |
 +-----+-----+ +---+-----+    +------+-----+ +-----+------+ +-----+----+
       |           |                 |             |              |
       +-----------+--------+--------+-------------+              v
                            |                               +----------+
                  +---------v----------+   +------------+   |  sw.js   |
                  |   costEngine.js    |<--| config.js  |   | App-     |
                  | Rate, Segmente,    |   | Vorgaben,  |   | Shell-   |
                  | Zeitmessung        |   | Grenzen    |   | Cache    |
                  +---------+----------+   +------------+   +----------+
                            |
                  +---------v----------+
                  |     format.js      |  Formatierung (de-DE)
                  +--------------------+
```

| Modul | Verantwortung |
|---|---|
| `js/config.js` | Vorgabewerte, Grenzen, Takt, Währung, Speicher-Schlüssel |
| `js/costEngine.js` | Kostenmodell, Zeitmessung, Segmente, Snapshot/Restore |
| `js/ticker.js` | Drift-freier Anzeige-Takt (`setTimeout` auf Sollzeitpunkt statt `setInterval`) |
| `js/storage.js` | Persistenz im `localStorage`, defensiv gegen blockierten Zugriff |
| `js/ui.js` | DOM-Bindung, Eingabeprüfung, Rendering, Tastaturkürzel |
| `js/exporter.js` | Zusammenfassung, CSV, Datei-Download, Zwischenablage |
| `js/format.js` | Formatierung von Währung, Dauer, Datum (Locale `de-DE`) |
| `js/pwa.js` | Service-Worker-Registrierung und Installationsangebot des Browsers |
| `js/app.js` | Zusammenschaltung der Module, Autosave, Lebenszyklus |
| `sw.js` | Service Worker: App-Shell im Cache, Offline-Betrieb (stale while revalidate) |
| `manifest.webmanifest` | Web-App-Manifest: Name, Farben, Icons, Anzeigemodus `standalone` |
| `tools/build-standalone.mjs` | Erzeugt `dist/meetingkosten.html` (Einzeldatei, ohne Abhängigkeiten) |
| `tools/build-icons.mjs` | Erzeugt PNG-Größen und `favicon.ico` aus den SVG-Mastern (benötigt Playwright) |
| `tests/costEngine.test.js` | Tests des Kostenmodells (deterministisch, ohne Browser) |

### Entwurfsentscheidungen

| Entscheidung | Begründung | Nachteil |
|---|---|---|
| Kein Framework, kein Build | Sofort lauffähig, langlebig, leicht auditierbar, im Intranet ohne Toolchain einsetzbar | Kein Komponenten-Ökosystem, State-Handling selbst gebaut |
| Zeitbasis `Date.now()` statt `performance.now()` | Ein Reload kann ein laufendes Meeting fortsetzen (Zeitstempel bleiben gültig) | Anfällig für Systemuhr-Sprünge; negative Deltas werden auf 0 begrenzt |
| Segmentweise Akkumulation | Korrekte Summen bei Parameteränderungen, nachvollziehbarer Verlauf | Etwas mehr Zustand als eine einfache Multiplikation |
| Anzeige-Takt 1000 ms | Verhalten einer Stoppuhr, ruhiges Bild, sparsam | Zwischenwerte unterhalb einer Sekunde nicht sichtbar (`CONFIG.tickMs` änderbar) |
| `localStorage` | Kein Backend, keine Datenschutzfragen | Zustand ist an Browser und Gerät gebunden |
| PWA statt nativer App | Ein Code-Stand für Windows, macOS, Android und iOS; Installation mit Icon ohne Store, Offline-Betrieb | Kein Store-Auftritt, iOS-Installation nur über Safari-Teilen-Menü |
| Einzeldatei als zweite Auslieferung | Nutzbar ohne Hosting und ohne Serverstart (Doppelklick), gut per E-Mail verteilbar | Generiertes Duplikat; nach Quelländerungen `npm run build` nötig |

## 6. Annahmen

Explizit als Annahmen ausgewiesen, da nicht spezifiziert:

1. **Ein gemeinsamer Stundensatz** für alle Teilnehmer (Mittelwert). Rollenspezifische Sätze siehe Abschnitt 7.
2. **Stundensatz = interner Verrechnungssatz** (Personalkosten). Der Overhead-Faktor ist optional (Vorgabe `1,00`)
   und deckt Lohnnebenkosten, Gemeinkosten und Arbeitsplatzkosten ab, wenn Vollkosten gewünscht sind.
3. **Pausen kosten nichts** – nur laufende Zeit wird verrechnet.
4. **Reload setzt eine laufende Messung fort**, inklusive der Zeit, in der die Seite geschlossen war
   (Annahme: das Meeting lief weiter). Für einen klaren Neustart `Zurücksetzen` verwenden.
5. **Währung EUR**, Locale `de-DE` (in `js/config.js` umstellbar).

## 7. Qualitätssicherung

`npm test` prüft das Kostenmodell mit deterministischen Zeitstempeln:

- Rate pro Sekunde/Stunde
- zeitproportionaler Kostenanstieg
- Parameteränderung wirkt nur für die Zukunft (Segmentbildung)
- pausierte Zeit kostet nichts, doppelter Start/Pause bleibt wirkungslos
- rückwärts laufende Uhr erzeugt keine negativen Werte
- Zurücksetzen, Snapshot/Restore, Versionsprüfung des Snapshots
- Kosten je Teilnehmer und Dauerformat

Zusätzlich wurde die Oberfläche mit Chromium (Playwright) geprüft: Zählverhalten im Sekundentakt,
Parameteränderung während des Laufs, Pause per Leertaste, Wiederherstellung nach Reload, Export,
Zurücksetzen, Darstellung auf Mobilbreite, keine Konsolenfehler.

Für Installation und Offline-Betrieb geprüft: Manifest, Icons und `sw.js` werden mit korrektem MIME-Typ
ausgeliefert, der Service Worker erreicht den Zustand *activated*, ein Reload im Offline-Modus lädt die App
vollständig aus dem Cache und die Messung läuft dort weiter. Die Einzeldatei `dist/meetingkosten.html` wurde
über `file://` geprüft (Zählen, Segmentbildung, `localStorage`, CSV-Download, Fortsetzen nach Reload).

## 8. Erweiterungsmöglichkeiten

Die Modulgrenzen sind so gewählt, dass folgende Ausbaustufen ohne Umbau des Kerns möglich sind:

| Ausbaustufe | Ansatz | Betroffene Module |
|---|---|---|
| Teilnehmerliste mit Rollen und individuellen Sätzen | `params.participants` durch Liste ersetzen, `ratePerSecond` summiert über Einträge | `costEngine`, `ui` |
| Budget-Grenze mit Warnschwelle (optisch/akustisch) | Schwellwert in `config`, Vergleich im Render-Pfad | `config`, `ui` |
| Kostenstelle / Kostenträger / Projekt je Meeting | zusätzliche Metadaten im Snapshot und im Export | `app`, `exporter` |
| Kalenderanbindung (ICS-Import geplanter Termine) | Teilnehmerzahl und Dauer vorbelegen | neues Modul `importer` |
| Push-Erinnerung „Meeting läuft seit X" | Notification API im Service Worker | `sw.js`, `pwa.js` |
| Mehrsprachigkeit (DE/EN) | Textkonstanten aus `ui` in ein `i18n`-Modul auslagern | `ui`, neues Modul `i18n` |
| Reporting über mehrere Meetings | Segmentdaten in IndexedDB, Auswertung je Woche/Bereich | `storage`, neues Modul `report` |
| Vergleichsanzeige („Kosten vs. Entscheidung“) | Sollkosten je Agendapunkt gegen Ist-Kosten stellen | `ui`, `report` |

## 9. Lizenz

MIT
