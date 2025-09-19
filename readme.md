# Template CSV Generator

Dieses Tool ermöglicht das dynamische Erstellen von Formularen auf Basis von Templates und das Exportieren der Eingaben in CSV-Dateien. Es unterstützt:

- **Repeat-Felder** (Loop-Werte)
- **perRepeat-Felder** (Felder, die pro Repeat erzeugt werden)
- **Referenzen (`ref`)**
- **Bedingungen (`conditions`)**
- **Pairs** (zusätzliche Felder pro Repeat)
- **Platzhalter in Titel, Text und Dateiname**

---

## 1. Template-Struktur

Ein Template besteht aus:

```js
{
  name: "Template Name",
  title: "Titel mit Platzhaltern {{field}}",
  text: "Text mit Platzhaltern {{field}}",
  filename: "dateiname.csv",
  fields_vorlage: { ... }, // Felder für Formular und CSV
  fields_csv: { ... },     // Felder, die in CSV übernommen werden
  pairs: [ ... ]           // optionale Paar-Felder
}
```

---

## 2. Felddefinition

Jedes Feld in `fields_vorlage` oder `fields_csv` kann folgende Parameter haben:

| Parameter        | Typ    | Beschreibung                                                                                 |
| ---------------- | ------ | -------------------------------------------------------------------------------------------- |
| `value`        | string | Standardwert des Feldes. Wird verwendet, falls kein Input vorhanden ist.                     |
| `editable`     | bool   | Wenn `false`, wird das Feld **nicht** im Formular angezeigt.                         |
| `repeat`       | bool   | Kennzeichnet das Feld als**Repeat-Master** (Loop). Mehrere Werte durch Komma getrennt. |
| `perRepeat`    | bool   | Feld wird**für jede Wiederholung des Repeat-Masters einzeln angezeigt**.              |
| `multi`        | bool   | Bei Select-Feldern: mehrere Auswahlwerte möglich (durch Komma getrennt).                    |
| `ref`          | string | Referenz auf ein anderes Feld. Wert wird automatisch übernommen.                            |
| `conditions`   | array  | Bedingungen, die den Wert ändern können (siehe Abschnitt 3).                               |
| `options`      | array  | Array von Select-Optionen.                                                                   |
| `uniqueResult` | bool   | Wenn `true`, werden bei Conditions nur eindeutige Ergebnisse übernommen.                  |

**Beispiel:**

```js
server_csv: { 
  ref: "server",        // Wert von "server" übernehmen
  editable: false,      // nicht editierbar
  repeat: true,         // Loop-Master
  multi: true,          // mehrere Werte erlaubt
  conditions: []        // keine Bedingungen
}
```

---

## 3. Conditions

Bedingungen erlauben die dynamische Anpassung von Feldwerten:

```js
conditions: [
  { key: "status", mode: "equals", value: "active", set: "ja" }
]
```

- `key`: Feldname, auf das die Bedingung geprüft wird
- `mode`: Vergleichsmodus (`equals`, `contains`, `startsWith`, `endsWith`, `regex`)
- `value`: Wert, der geprüft wird
- `set`: Wert, der gesetzt wird, wenn Bedingung zutrifft

**Beispiel:**
Wenn das Feld `status` den Wert `active` hat, wird dieses Feld auf `"ja"` gesetzt.

---

## 4. Repeat- und perRepeat-Felder

Im System gibt es zwei Arten von Feldern, die für Wiederholungen verwendet werden können:

1. **fields_vorlage**: Felder, die primär für die Vorschau/Template-Logik genutzt werden.
2. **fields_csv**: Felder, die explizit für den CSV-Export bestimmt sind.

Beide können **Repeat-Felder** besitzen. Wichtig: Jedes Feld muss separat ein `repeat`-Flag haben, wenn es geloopt werden soll.

---

#### Beispielstruktur

```json
{
  "fields_vorlage": {
    "server": {
      "value": "server1,server2",
      "repeat": true,       // <- Repeat in Vorlage
      "editable": true,
      "multi": true,
      "ref": null,
      "perRepeat": false
    },
    "server_uname": {
      "value": "",
      "repeat": false,
      "editable": true,
      "multi": false,
      "ref": "server",      // <- referenziert 'server'
      "perRepeat": true
    }
  },
  "fields_csv": {
    "server": {
      "value": "server1,server2",
      "repeat": true,       // <- Repeat in CSV
      "editable": false,
      "multi": true,
      "ref": null,
      "perRepeat": false
    },
    "server_uname": {
      "value": "",
      "repeat": false,
      "editable": true,
      "multi": false,
      "ref": "server",
      "perRepeat": true      // <- perRepeat in CSV
    }
  }
}
```

## 5. Pairs

- `pairs` sind Felder, die **zusätzlich zu Repeat-Feldern** pro Wiederholung erzeugt werden.
- Jedes Paar kann eigene Felder mit `perRepeat` haben.
- Felder innerhalb eines Pairs können `editable`, `perRepeat` oder `ref` haben.

**Beispiel:**

```js
pairs: [
  {
    name: "IP",
    perRepeat: true,
    editable: true
  }
]
```

Wird pro Repeat-Wert als eigene Zeile in CSV angezeigt.

---

## 6. CSV-Export

- Nur Felder aus `fields_csv` werden übernommen.
- Repeat-Felder werden pro Loop-Wert in eigene Zeilen aufgeteilt.
- PerRepeat-Felder werden **nur für den aktuellen Loop-Wert** geschrieben.
- Felder mit `ref` übernehmen den Wert aus dem referenzierten Feld **für die aktuelle Loop-Iteration**.
- Conditions werden beim CSV-Export angewendet.

**Beispiel:**

Template:

```js
fields_csv: {
  server: { repeat: true, editable: true },
  server_csv: { perRepeat: true, ref: "server", editable: false },
  status: { value: "active" }
}
```

Formularwert:

```
server = server1,server2
```

CSV-Ausgabe:

| server  | server_csv | status |
| ------- | ---------- | ------ |
| server1 | server1    | active |
| server2 | server2    | active |

---

## 7. Platzhalter in Titel, Text und Dateiname

- Titel (`title`), Text (`text`) und Dateiname (`filename`) können Platzhalter `{{field}}` enthalten.
- Platzhalter werden beim Vorschau-/CSV-Export durch die entsprechenden Werte ersetzt.

**Beispiel:**

```js
title: "Server {{server_csv}} ist bereit"
```

- Für `server_csv = server1` → `"Server server1 ist bereit"`

---

## 8. Zusammenspiel Repeat + perRepeat + ref + Pairs (Schema)

```
Repeat-Master (repeat:true)
        │
        ├─ perRepeat-Feld (ref auf Master)
        │      └─ Wert pro Loop
        │
        └─ Pairs (perRepeat:true)
               └─ Wert pro Loop
```

**Beispiel:**

```
Master: server = server1, server2
PerRepeat: server_csv (ref: server)
Pairs: ip_address
```

Formular/CSV:

| server  | server_csv | ip_address  |
| ------- | ---------- | ----------- |
| server1 | server1    | 192.168.0.1 |
| server2 | server2    | 192.168.0.2 |

---

## 9. Zusammenfassung

1. **Felder definieren** mit `value`, `editable`, `repeat`, `perRepeat`, `ref`, `conditions`.
2. **Repeat-Master bestimmen** (`repeat: true`) → alle perRepeat-Felder erzeugen Loop-Eingaben.
3. **Pairs** optional pro Repeat erzeugen.
4. **CSV-Export** wendet `ref` + `conditions` korrekt pro Loop an.
5. **Platzhalter** in Titel/Text/Dateiname werden ersetzt.

---

## 10. Hinweise

- Felder mit `editable:false` werden **nicht** im Formular angezeigt, können aber über `ref` oder Repeat-Logik CSV-Werte liefern.
- Repeat-Felder unterstützen `multi: true` für mehrere Werte, die automatisch als Loop aufgeteilt werden.
- Alle Bedingungen (`conditions`) und Referenzen (`ref`) werden **pro Loop** korrekt ausgewertet.
