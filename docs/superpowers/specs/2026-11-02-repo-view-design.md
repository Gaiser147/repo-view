# repo-view — Morph mit lokalem Fokus

Stand: 2. November 2026. Designentwurf zur Freigabe, noch keine Implementierung.

## Ziel und bestätigte Richtung

Ein webbasiertes Werkzeug macht Größe, Struktur, Dependencies, Funktionen und CI-Workflows eines GitHub-Repositories räumlich erkundbar und bietet ein nachvollziehbares Rating. Die Codebase steht als leuchtende 3D-Punktwolke im Zentrum. Der Nutzer hat Morph gewählt: Dieselben Knoten verformen sich live zwischen organischer Wolke und geschichteter Ansicht. Die Fokusidee wurde positiv aufgenommen und ist als ergänzende Funktion vorgesehen.

Zielrepository: https://github.com/Gaiser147/repo-view. GitHub meldete beim Entwurf Größe 0; es gibt keine bestehende visuelle Identität. Referenz ist die Morph-Designstudie: /workspace/generated_images/exec-27903657-97a5-4293-8e6e-0fb77aac1221.png. Ergänzende Fokusreferenz: /workspace/generated_images/exec-567780d6-42bc-4a39-b9b4-eebc04efbab6.png. Alle dort gezeigten Kennzahlen sind erfundene Beispieldaten.

## Erwogene Ansätze

- Morph: zwei verständliche Zielansichten mit durchgehender Verformung. Gewählt, weil es Wolkenästhetik und geordnete Architektur verbindet.
- Spectrum: frei steuerbarer Zwischenzustand per Regler. Mehr räumliche Kontrolle, aber zusätzliche Bedienkomplexität; kein Bestandteil der ersten Version.
- Lens: lokale Auffaltung eines Clusters bei sichtbarem Gesamtkontext. Als ergänzender Fokus übernommen, kein Ersatz für Morph.

## Nutzung und erster Bildschirm

Operate-Oberfläche mit immersiver Visualisierung. Ein Repository öffnen, seine Struktur verstehen, eine Datei oder Funktion verfolgen und Änderungen über Commits untersuchen.

Oben: Repo, Branch, Suche, Ansichten und kompakter Health-Wert. Links: einklappbarer Dateibaum. Mitte: mindestens etwa zwei Drittel der Desktopfläche für den 3D-Graphen. Rechts: Inspector nur bei Auswahl, mit Dateigröße, LOC, Funktionen und Beziehungen. Unten: dauerhaft sichtbare Commit-Historie und kompakte CI-Leiste. Ansichten für Dependencies, Funktionen und Pipelines verändern den Kontext des Graphen, statt zusätzliche unabhängige Dashboards zu öffnen.

Einstieg erlaubt eine öffentliche GitHub-Repo-URL und bietet ein ausdrücklich markiertes Demo-Repository. Für das leere Zielrepo zeigt die echte Analyse einen hilfreichen Leerzustand. Demowerte ersetzen niemals unbemerkt echte Daten.

## Graph und Morph

Knoten repräsentieren auf großer Entfernung Packages/Verzeichnisse, näher Dateien und im ausgewählten Bereich Funktionen. Kanten unterscheiden Imports, auflösbare statische Funktionsaufrufe und Workflow-Abhängigkeiten; verschiedene Beziehungstypen werden gefiltert statt alle dauerhaft übereinandergelegt. Knotenfläche kann auf LOC oder Dateigröße umgeschaltet werden; eine Legende erklärt Einheit und Skalierung.

Der Schalter Cloud / Layers verformt den gesamten Graphen in etwa 1,2 bis 1,8 Sekunden, unterbrechbar und umkehrbar. Zwei vorberechnete Layouts verwenden stabile Knotenidentitäten. Kantenenden bleiben an ihren Knoten. Auswahl, Filter, Zoomtiefe und ausgewählter Commit bleiben erhalten; die Kamera hält den gewählten Bereich im Fokus. Die Referenz zeigt den Übergang schematisch, nicht zwei duplizierte Codebasen nebeneinander.

Layers gruppiert standardmäßig nach vorhandenen Top-Level-Packages beziehungsweise Verzeichnissen. Fachliche Ebenen wie Interface, Services oder Domain sind optionale, explizit konfigurierte Pfadzuordnungen; unzugeordnete Dateien bleiben sichtbar. Keine erfundene Architekturklassifizierung. Große Repos werden hierarchisch aggregiert, Detailkanten erscheinen erst bei Fokus oder Auswahl.

Fokus: ein Cluster lässt sich innerhalb der Wolke in lokale Unterebenen auffalten. Der Rest bleibt gedimmt sichtbar und behält seine Position. Erneuter Klick oder Escape schließt den Fokus. Pro Zeitpunkt ist ein Cluster aufgefaltet. Beim Wechsel in globale Layers wird lokale Auffaltung geschlossen, die Knotenauswahl bleibt erhalten. Eine ausgewählte Aufrufkette kann beide Bereiche verbinden.

## Commit-Historie und Pipelines

Die Zeitleiste zeigt zunächst bis zu 50 Commits des gewählten Branches mit Datum, Nachricht und Autor; ältere werden auf Anfrage geladen. Ein Commit-Klick lädt einen statischen Snapshot. Vorwärts-/Rückwärts-Schritte und Wiedergabe machen Änderungen nachvollziehbar. Wiedergabe wartet auf geladene Daten; sie suggeriert keine Live-Laufzeitüberwachung.

Unveränderte Knoten behalten möglichst ihre Position. Hinzugefügte erscheinen, entfernte verblassen kurz, geänderte werden zeitlich begrenzt hervorgehoben. Umbenennungen erhalten Identität, soweit Git sie zuverlässig zuordnet. Ein Text-Diff fasst Änderungen zusammen. Zwei-Commit-Vergleich ist eine spätere Erweiterung, keine Pflicht der ersten Version.

GitHub-Actions-Workflows werden als Jobs mit needs-Kanten gezeigt; Steps erscheinen im Inspector. Tatsächliche Run-Zustände für den ausgewählten Commit kommen aus GitHub. Ohne Run wird „Kein Run verfügbar“ gezeigt. Unbekannte Conditions und wiederverwendbare Workflows werden als solche markiert. Kein erfundener Erfolg. Andere CI-Anbieter sind zunächst außerhalb des Umfangs.

## Analyse und Rating — vorgeschlagener Erstumfang

Echte Daten für öffentliche GitHub-Repositories: Dateibaum, Blob-Größen, erkannte Sprachen und Commit-Metadaten. LOC und inhaltliche Analyse für lesbare Textdateien. Funktionsdefinitionen, statisch auflösbare lokale Imports und Aufrufe zunächst für JavaScript/TypeScript; andere Sprachen bleiben im Strukturgraphen sichtbar und sind ausdrücklich nicht funktionsanalysiert. Dependencies kommen zunächst aus package.json und unterstützten JS-Lockfiles. Dynamische Aufrufe werden nicht als sicher aufgelöst dargestellt.

Kein fremder Repository-Code wird ausgeführt. Ausgeschlossene Binärdateien, generierte/vendor-Dateien, Limits und unaufgelöste Beziehungen werden ausgewiesen. Erste Analysegrenzen: 5.000 Dateien im Strukturgraphen, 20 MB analysierter Text, 500 KB pro Datei; darüber Teilauswertung mit sichtbarer Abdeckung. API-Limits liefern einen klaren Zustand statt leerer oder erfundener Resultate. Snapshot-Caching erfolgt pro Commit-SHA. Kein privates GitHub-OAuth in Version 1; spätere Erweiterung.

Health ist eine heuristische Analysebewertung, keine Sicherheitszertifizierung. Vorschlag: Wartbarkeit 40 %, Dependency-Struktur 35 %, CI-Konfiguration/-Zustand 25 %. Regeln, Gewichte, konkrete Befunde und analysierte Abdeckung sind aufklappbar. Fehlende Kategorien werden als nicht bewertet ausgewiesen; ein Gesamtscore erscheint nur bei allen drei verfügbaren Kategorien. Komplexitäts- und Zyklusbefunde verlinken auf betroffene Dateien. Test-Coverage und Security erhalten ohne passende Quellen keinen Zahlenwert; keine Schlussfolgerung „sicher“, nur weil keine Befunde vorliegen. Demo-Rating ist getrennt markiert.

## Gestaltung, Bewegung und Zugänglichkeit

Fast schwarzer blauer Hintergrund, elektrische blaue/cyanfarbene Knoten mit hellen Kernen, gezieltes Bloom und leichter Tiefennebel. Mint kennzeichnet Auswahl, Amber Hinweise und Koralle Fehler; Status trägt zusätzlich Symbol und Text. Semantische Farbmodi wie Sprache oder Komplexität haben jeweils eine eigene Legende. Texte und Bedienelemente bleiben scharf und kontrastreich.

Keine permanente Kamerarotation während Arbeit. Bewegte Lichtimpulse nur für gewählte Pfade oder konkrete Änderungen. Kamera, Morph und Offenlegung bilden eine orchestrierte Bewegung. Reduced Motion reduziert Morph auf direkten Layoutwechsel und deaktiviert Hintergrundbewegung. Globale Animation-Pause. Tastaturbedienbarer Dateibaum und Inspector bieten Zugriff auf dieselben Daten ohne 3D-Zeigerinteraktion.

Auf kleinen Bildschirmen nimmt der Graph den Hauptbereich ein; Baum und Inspector öffnen als wechselbare Panels. Die Zeitleiste wird kompakter. Geräte mit schwacher Grafik bekommen weniger Partikel, kein Bloom und bei fehlendem WebGL eine brauchbare Baum-/Listenansicht.

## Umsetzungsvorschlag und Grenzen

Noch nicht vom Nutzer festgelegte technische Wahl: React, TypeScript und Vite; Three.js über React Three Fiber für echte interaktive 3D-Grafik; schlanker Node-Dienst für GitHub-Zugriff, begrenzte statische Analyse und Caching. Zugangsdaten bleiben serverseitig. Parserdetails, Layoutalgorithmus, State-Management und Hosting sind Builder-Entscheidungen innerhalb dieser Grenzen. Keine Veröffentlichung oder externe Hosting-Einrichtung ist mit diesem Entwurf beauftragt.

Die erste Umsetzung umfasst Morph, lokalen Fokus, Demo und echte öffentliche Repo-Analyse im beschriebenen Umfang, Commit-Snapshots, GitHub-Actions-Ansicht und erklärbares Rating. Kein Kollaborationssystem, kein Editor, keine Laufzeittelemetrie, keine umfassende Mehrsprachenanalyse.

## Abnahmekriterien

1. Wolke und Layer sind echte navigierbare 3D-Layouts desselben Graphen; Morph erhält Auswahl und Verbindungen.
2. Fokus faltet ein Package lokal auf und lässt sich ohne Kontextverlust schließen.
3. Zoom legt Details kontrolliert frei; Suche und Dateibaum fokussieren dieselben Objekte.
4. Commit-Wechsel ändern nachweislich Daten und zeigen hinzugefügte/entfernte/geänderte Elemente; Ladezustände bleiben sichtbar.
5. Pipelines und Rating verwenden belegbare Quellen oder klare Nicht-verfügbar-/Demo-Zustände.
6. Leerzustand, API-Fehler, große Repos, Reduced Motion, Tastaturpfad und kleine Viewports sind nutzbar.

Nach Designfreigabe folgen Implementierungsplan und Umsetzung im Zielrepository. Bisher wurde kein Produktcode erstellt.
