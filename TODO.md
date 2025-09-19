# TODOs – Template & CSV System

## 1. Allgemein

- [ ] Review Code auf konsistente Nutzung von `sanitizeKey` / `unsanitizeKey`.
- [ ] Einheitliche Benennung der Felder zwischen `fields_vorlage` und `fields_csv`.
- [ ] Logging einbauen für Debugging der Repeat- und perRepeat-Felder.

## 2. Templates

- [ ] Templates Dropdown automatisch laden und Default auswählen.
- [ ] Sicherstellen, dass alle Templates `fields_vorlage` und `fields_csv` korrekt definiert sind.
- [ ] Überprüfen, ob `filename` Platzhalter korrekt ersetzt werden.

## 3. Repeat-Felder

- [ ] Master Repeat-Feld korrekt bestimmen (`repeat:true`).
- [ ] `perRepeat:true` Felder korrekt pro Loop erzeugen.
- [ ] Felder mit `ref` auf Master-Wert korrekt auflösen.
- [ ] Editierbare Felder vs. non-editable Felder korrekt anzeigen / verbergen.

## 4. CSV Export

- [ ] Nur CSV-Felder (`fields_csv`) übernehmen.
- [ ] Repeat-Werte pro Master-Wert korrekt ausgeben.
- [ ] perRepeat-Werte pro Master-Wert korrekt ausgeben.
- [ ] Felder mit `ref` korrekt auflösen.
- [ ] Pairs korrekt pro Repeat-Wert ausgeben.
- [ ] Mehrfachwerte (`multi:true`) korrekt trennen.
- [ ] Bedingungen (`conditions`) korrekt prüfen und anwenden.
- [ ] CSV-Dateiname mit Platzhaltern korrekt generieren.

## 5. Pairs

- [ ] Repeat- und perRepeat-Pairs korrekt erzeugen.
- [ ] Editable-Feld-Check (`editable:false`) korrekt anwenden.
- [ ] Alle Pair-Werte dynamisch ausgeben, sowohl in Vorschau als auch CSV.

## 6. UI

- [ ] Repeat-Felder dynamisch erzeugen / löschen beim Input-Change.
- [ ] perRepeat-Felder sauber innerhalb des Repeat-Blocks darstellen.
- [ ] Preview aktualisiert korrekt bei jeder Änderung.
- [ ] Eingaben mit mehreren Werten (multi) korrekt darstellen.
- [ ] Label-Texte und Input-Names konsistent generieren.

## 7. Tests / Validation

- [ ] Testfälle mit mehreren Repeat-Werten (z. B. 3+ Server).
- [ ] Testfälle mit perRepeat + ref.
- [ ] Testfälle mit multi-Werten.
- [ ] Testfälle mit Pairs und perRepeat.
- [ ] Testfälle mit conditions auf Repeat- und perRepeat-Felder.

## 8. Dokumentation

- [X] README mit Erklärung aller Felder, Parameter und Repeat-Logik.
- [ ] Beispiele für `fields_vorlage` + `fields_csv`.
- [ ] CSV-Beispiele für Repeat + perRepeat + Pairs.
- [ ] Schritt-für-Schritt-Erklärung für Benutzer.
