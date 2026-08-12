# Konzept: Nachweisbare Souveränität entlang der Architekturkette

**Stand:** 20.07.2026
**Status:** Konzept zur Entscheidung
**Betrifft:** Sovereignty-Modul im EAM

---

## Zusammenfassung

Das EAM bewertet heute die digitale Souveränität von Geschäftsfähigkeiten, Anwendungen und Infrastruktur. Die Bewertung wird dabei **vererbt**: Trägt ein Element keine eigenen Werte, übernimmt es automatisch die Werte des übergeordneten Elements.

Das erzeugt ein strukturelles Problem: Eine virtuelle Maschine, für die nie jemand eine Bewertung vorgenommen hat, erscheint im System als „hoch souverän" — allein weil das Rechenzentrum, in dem sie steht, so bewertet wurde. **Wir dokumentieren damit Souveränität, die nicht nachgewiesen ist.**

Der Vorschlag: Vererbung abschaffen. Jedes Element trägt seine eigene, eigenständig verantwortete Bewertung. Das System vergleicht diese Bewertungen anschließend entlang der Kette vom Geschäftsbedarf bis zur Infrastruktur und weist konkret aus, **an welcher Stelle die Kette bricht**.

Aus einer Kennzahl wird damit eine Mängelliste mit benannten Verantwortlichkeiten.

---

## 1. Ausgangslage

### Was heute existiert

Das Sovereignty-Modul ist funktional aufgebaut und im Kern richtig modelliert:

- Vier Bewertungsdimensionen: **Strategische Autonomie, Resilienz, Sicherheit, Kontrolle**
- Fünfstufige Reifegradskala von *keine* bis *sehr hoch*
- Getrennte Erfassung von **Anforderung** (was das Geschäft braucht) und **Ist-Zustand** (was die Technik liefert)
- Die vollständige Abhängigkeitskette ist im Datenmodell bereits abgebildet

### Wo es klemmt

| Problem | Auswirkung |
|---|---|
| **Vererbung statt Bewertung** | Nicht bewertete Elemente erscheinen als bewertet. Lücken in der Erfassung sind unsichtbar. |
| **Ergebnis ist eine Zahl** | Das System meldet „Souveränitätslücke: 1,4". Es sagt nicht, *welches* Element die Lücke verursacht. |
| **Nur der schlechteste Wert zählt** | Gibt es mehrere Schwachstellen, wird nur eine sichtbar. Nach deren Behebung taucht die nächste auf. |
| **Keine Betroffenheitssicht** | Es ist nicht ersichtlich, wie viele Geschäftsfähigkeiten von einer einzelnen schwachen Komponente abhängen. |

---

## 2. Zielbild

### Grundprinzip

> **Jedes Element trägt seine eigene Bewertung. Entlang jedes Pfades von oben nach unten darf die Souveränität nicht abnehmen.**

Das Fundament muss mindestens so stark sein wie das, was darauf aufbaut. Eine Anwendung, die für sich „hohe Souveränität" beansprucht, kann dies nicht auf einer Infrastruktur mit niedriger Bewertung tun.

### Was das konkret ändert

Die Beziehung zwischen VM und Rechenzentrum bleibt bestehen — ihre Bedeutung ändert sich:

- **Heute:** Das Rechenzentrum *gibt seine Werte an die VM weiter.*
- **Künftig:** Das Rechenzentrum *begrenzt, was die VM glaubhaft behaupten kann.*

Aus einer Annahme wird eine Prüfung.

### Beispiel

Eine Geschäftsfähigkeit „Abrechnung" fordert hohe Resilienz. Darunter hängen eine Anwendung und deren Infrastruktur:

| Ebene | Element | Bewertung Resilienz | Befund |
|---|---|---|---|
| Geschäftsfähigkeit | Abrechnung | **hoch gefordert** | betroffen |
| Anwendung | Billing | hoch | in Ordnung |
| Infrastruktur | VM-web-03 | **niedrig** | **verletzt die Anforderung** |

Ergebnis: Die Geschäftsfähigkeit „Abrechnung" ist kompromittiert. Ursache ist eindeutig benannt: VM-web-03, Dimension Resilienz, gefordert *hoch*, vorhanden *niedrig*.

---

## 3. Darstellung

### Vier Zustände, drei Dringlichkeitsstufen

| Zustand | Bedeutung | Erforderliche Handlung |
|---|---|---|
| 🔴 **Rot** | Eine formulierte Geschäftsanforderung wird verletzt | Beheben — Compliance-relevant |
| 🟡 **Gelb** | Die Architektur widerspricht sich, es liegt aber keine Geschäftsanforderung vor | Anforderung nachtragen oder Bewertung korrigieren |
| ⚪ **Grau** | Keine Bewertung vorhanden | Bewertung durchführen |
| 🟢 **Grün** | Anforderung erfüllt | keine |

Ein Element mit auch nur einem roten Befund gilt als rot — es wird nicht gemittelt. Andernfalls würde sich genau der Befund herausrechnen, wegen dem man hinschaut.

**Hinweis zur Einführungsphase:** Da Geschäftsanforderungen heute kaum erfasst sind, werden anfangs die meisten Befunde *gelb* sein. Das ist beabsichtigt — Gelb macht das Modul vom ersten Tag an nutzbar, auch ohne vorherige Erfassungskampagne. Befunde wandern automatisch von Gelb nach Rot, sobald die zugehörige Geschäftsanforderung hinterlegt wird.

### Zwei Marker je Element im Diagramm

Eine Geschäftsfähigkeit besitzt selbst keine technische Bewertung — sie kann per Definition nichts verletzen. Sie kann aber sehr wohl *betroffen* sein. Deshalb erhält jedes Element im Architekturdiagramm zwei unabhängige Marker:

- **Kern (Füllfarbe):** Verletzt dieses Element selbst eine Anforderung?
- **Ring (Rahmen):** Ist unterhalb dieses Elements etwas gebrochen?

Die Geschäftsfähigkeit bleibt innen neutral und erhält einen roten Ring — *„ich bin nicht die Ursache, aber ich bin betroffen."* Die VM ist innen rot — sie ist die Ursache. Ein Klick führt vom Symptom zur Ursache.

**Ausnahme Hierarchie-Wurzel:** Eine Geschäftsfähigkeit ohne übergeordnete Geschäftsfähigkeit hat nichts, dem sie widersprechen könnte — sie ist per Definition in sich konsistent. Ihr Kern bleibt daher nicht dauerhaft grau, sondern wird grün, sobald ihre eigenen Anforderungen erfasst ("ausgefüllt") sind, und bleibt nur grau, solange das nicht der Fall ist. Rot ist für den Kern einer Wurzel-Geschäftsfähigkeit ausgeschlossen.

---

## 4. Nutzen

**Nachweisbarkeit statt Annahme.** Eine Bewertung im System bedeutet künftig, dass jemand bewertet hat — nicht, dass ein übergeordnetes Element zufällig gut dasteht. Das ist die Voraussetzung dafür, Souveränitätsaussagen gegenüber Dritten überhaupt belegen zu können.

**Handlungsfähige Ergebnisse.** Statt einer Kennzahl entsteht eine priorisierbare Liste konkreter Fundstellen — mit Element, Dimension, gefordertem und vorhandenem Wert.

**Sichtbare Erfassungslücken.** Grau ist eine eigene Aussage. Der Erfassungsstand wird messbar und steuerbar, statt hinter geerbten Werten zu verschwinden.

**Priorisierung nach Wirkung.** Da eine Infrastruktur typischerweise viele Anwendungen trägt, ergibt sich die Umkehrsicht automatisch: *„VM-web-03 kompromittiert 7 Geschäftsfähigkeiten."* Das ist die Sicht, die für Investitionsentscheidungen gebraucht wird — sie beantwortet, welche einzelne Maßnahme den größten Effekt hat.

**Vollständige Mängelliste.** Alle Schwachstellen einer Kette werden gleichzeitig ausgewiesen, nicht nur die schlechteste. Behebungsaufwand wird planbar, statt sich nach jeder Korrektur neu zu offenbaren.

---

## 5. Aufwand und Voraussetzungen

### Technisch: überschaubar

**Keine Datenmodell-Änderung erforderlich.** Die vorhandene Trennung zwischen Anforderung und Ist-Zustand bleibt exakt so bestehen. Es werden keine neuen Felder und keine neuen Objekttypen benötigt — die Regel arbeitet vollständig auf dem bestehenden Bestand.

Der Umbau betrifft im Wesentlichen:

1. Entfernen der Vererbungslogik (an zwei Stellen — Infrastruktur-Hierarchie und zusammengesetzte Anwendungen)
2. Auswertung entlang der Kette statt Sammeln in einer flachen Menge
3. Darstellung der Marker in Listen- und Diagrammansicht
4. Testabdeckung — für die bestehende Bewertungslogik existieren derzeit keine Tests

### Organisatorisch: der eigentliche Aufwand

Nach Abschalten der Vererbung entfallen die bisher automatisch gesetzten Werte. Der Bestand ist zunächst überwiegend **grau** — nicht, weil etwas kaputtgeht, sondern weil sichtbar wird, was nie bewertet wurde.

Der wesentliche Aufwand liegt daher nicht in der Entwicklung, sondern in der **fachlichen Bewertung der Bestandselemente**. Das ist zugleich der eigentliche Zweck der Maßnahme: Der heutige Zustand verbirgt diesen Aufwand, er beseitigt ihn nicht.

### Vorgeschlagenes Vorgehen

| Schritt | Inhalt |
|---|---|
| **1. Umstellung** | Vererbung entfernen, Kettenprüfung aktivieren. Ausgangslage ist transparent grau. |
| **2. Priorisierte Erfassung** | Bewertung entlang der geschäftskritischen Ketten — nicht flächendeckend, sondern dort, wo Anforderungen bestehen. |
| **3. Anforderungen hinterlegen** | Geschäftsseitige Anforderungen erfassen. Gelbe Befunde werden dadurch zu roten, belastbaren Aussagen. |
| **4. Steuerung** | Regelmäßige Auswertung nach Wirkung — welche Komponente gefährdet die meisten Geschäftsfähigkeiten? |

---

## 6. Anzumerken

Bei der Analyse sind drei bestehende Schwächen aufgefallen, die unabhängig von diesem Vorhaben bestehen und im Zuge des Umbaus mitbereinigt werden sollten:

- Es existieren **zwei voneinander abweichende Berechnungslogiken** (Oberfläche und Hintergrundberechnung), die sich in der Behandlung leerer Werte, im Umfang der einbezogenen Objekte und sogar im Vorzeichen der ausgewiesenen Lücke unterscheiden. Sie können für dieselbe Organisation unterschiedliche Ergebnisse liefern.
- Ein vorgesehenes **Gewichtungsfeld** für Anforderungen wird erfasst, aber nirgends ausgewertet.
- Die auf Geschäftsprozessen erfassten Anforderungen fließen derzeit **in keine Auswertung** ein.

---

## 7. Entscheidungsbedarf

1. Umstellung von Vererbung auf eigenständige Bewertung — **ja / nein**
2. Akzeptanz einer zunächst überwiegend grauen Ausgangslage als transparente Darstellung des tatsächlichen Erfassungsstands
3. Zuordnung der fachlichen Verantwortung für die Bewertung von Infrastruktur- und Anwendungselementen
4. Priorisierung: welche Geschäftsfähigkeiten werden zuerst durchgängig bewertet