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

## 3. Kostenmodell

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

## 4. Architektur

Modularer Aufbau mit klarer Trennung von Kostenlogik, Takt, Persistenz und Darstellung. Die Kostenlogik
ist DOM-frei und damit ohne Browser testbar.

```
                      +--------------------+
                      |      app.js        |   Bootstrap / Verdrahtung
                      +---------+----------+
                                |
      +-------------+-----------+-----------+--------------+
      |             |                       |              |
+-----v-----+ +-----v------+        +-------v------+ +-----v------+
| ticker.js | | ui.js      |        | storage.js   | | exporter.js|
| Sekunden- | | DOM,       |        | localStorage | | Text / CSV |
| takt      | | Eingaben   |        | (Autosave)   | | Download   |
+-----+-----+ +-----+------+        +-------+------+ +-----+------+
      |             |                       |              |
      +-------------+-----------+-----------+--------------+
                                |
                      +---------v----------+      +-------------+
                      |   costEngine.js    |<-----+  config.js  |
                      | Rate, Segmente,    |      |  Vorgaben,  |
                      | Zeitmessung        |      |  Grenzen    |
                      +---------+----------+      +-------------+
                                |
                      +---------v----------+
                      |     format.js      |  de-DE Formatierung
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
| `js/app.js` | Zusammenschaltung der Module, Autosave, Lebenszyklus |
| `tests/costEngine.test.js` | Tests des Kostenmodells (deterministisch, ohne Browser) |

### Entwurfsentscheidungen

| Entscheidung | Begründung | Nachteil |
|---|---|---|
| Kein Framework, kein Build | Sofort lauffähig, langlebig, leicht auditierbar, im Intranet ohne Toolchain einsetzbar | Kein Komponenten-Ökosystem, State-Handling selbst gebaut |
| Zeitbasis `Date.now()` statt `performance.now()` | Ein Reload kann ein laufendes Meeting fortsetzen (Zeitstempel bleiben gültig) | Anfällig für Systemuhr-Sprünge; negative Deltas werden auf 0 begrenzt |
| Segmentweise Akkumulation | Korrekte Summen bei Parameteränderungen, nachvollziehbarer Verlauf | Etwas mehr Zustand als eine einfache Multiplikation |
| Anzeige-Takt 1000 ms | Verhalten einer Stoppuhr, ruhiges Bild, sparsam | Zwischenwerte unterhalb einer Sekunde nicht sichtbar (`CONFIG.tickMs` änderbar) |
| `localStorage` | Kein Backend, keine Datenschutzfragen | Zustand ist an Browser und Gerät gebunden |

## 5. Annahmen

Explizit als Annahmen ausgewiesen, da nicht spezifiziert:

1. **Ein gemeinsamer Stundensatz** für alle Teilnehmer (Mittelwert). Rollenspezifische Sätze siehe Abschnitt 7.
2. **Stundensatz = interner Verrechnungssatz** (Personalkosten). Der Overhead-Faktor ist optional (Vorgabe `1,00`)
   und deckt Lohnnebenkosten, Gemeinkosten und Arbeitsplatzkosten ab, wenn Vollkosten gewünscht sind.
3. **Pausen kosten nichts** – nur laufende Zeit wird verrechnet.
4. **Reload setzt eine laufende Messung fort**, inklusive der Zeit, in der die Seite geschlossen war
   (Annahme: das Meeting lief weiter). Für einen klaren Neustart `Zurücksetzen` verwenden.
5. **Währung EUR**, Locale `de-DE` (in `js/config.js` umstellbar).

## 6. Qualitätssicherung

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

## 7. Erweiterungsmöglichkeiten

Die Modulgrenzen sind so gewählt, dass folgende Ausbaustufen ohne Umbau des Kerns möglich sind:

| Ausbaustufe | Ansatz | Betroffene Module |
|---|---|---|
| Teilnehmerliste mit Rollen und individuellen Sätzen | `params.participants` durch Liste ersetzen, `ratePerSecond` summiert über Einträge | `costEngine`, `ui` |
| Budget-Grenze mit Warnschwelle (optisch/akustisch) | Schwellwert in `config`, Vergleich im Render-Pfad | `config`, `ui` |
| Kostenstelle / Kostenträger / Projekt je Meeting | zusätzliche Metadaten im Snapshot und im Export | `app`, `exporter` |
| Kalenderanbindung (ICS-Import geplanter Termine) | Teilnehmerzahl und Dauer vorbelegen | neues Modul `importer` |
| Offline-Nutzung als PWA | Service Worker und Manifest ergänzen | neue Dateien, `index.html` |
| Mehrsprachigkeit (DE/EN) | Textkonstanten aus `ui` in ein `i18n`-Modul auslagern | `ui`, neues Modul `i18n` |
| Reporting über mehrere Meetings | Segmentdaten in IndexedDB, Auswertung je Woche/Bereich | `storage`, neues Modul `report` |
| Vergleichsanzeige („Kosten vs. Entscheidung“) | Sollkosten je Agendapunkt gegen Ist-Kosten stellen | `ui`, `report` |

## 8. Lizenz

MIT
