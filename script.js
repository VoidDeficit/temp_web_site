const select = document.getElementById('templateSelect');
const form = document.getElementById('inputForm');
const preview = document.getElementById('preview');
const titleBox = document.getElementById('titleBox');

// Dropdown Template Auswahl
templates.forEach((t, i) => {
  const opt = document.createElement('option');
  opt.value = i;
  opt.textContent = t.name;
  select.appendChild(opt);
});

function sanitizeKey(key) { return key.replace(/ /g, '_'); }
function unsanitizeKey(key) { return key.replace(/_/g, ' '); }

// Hilfs: Input/Select erzeugen (option unterstützt)
function createInputForField(f, name, existingValue = undefined) {
  let input;
  if (f.options && Array.isArray(f.options)) {
    input = document.createElement('select');
    if (f.multi) input.multiple = true;
    f.options.forEach(optVal => {
      const opt = document.createElement('option');
      opt.value = optVal;
      opt.textContent = optVal;
      input.appendChild(opt);
    });
    // set value(s)
    const valToSet = (existingValue !== undefined) ? existingValue : (f.value ?? '');
    if (input.multiple) {
      const vals = ('' + valToSet).split(',').map(s => s.trim()).filter(Boolean);
      Array.from(input.options).forEach(o => { o.selected = vals.includes(o.value); });
    } else {
      if (valToSet !== '') input.value = valToSet;
    }
  } else {
    input = document.createElement('input');
    input.type = 'text';
    input.value = existingValue !== undefined ? existingValue : (f.value || '');
  }
  input.name = name;
  return input;
}

// Hilfs: Wert von einem Input sicher auslesen (selects + multiple)
function readInputValue(el) {
  if (!el) return '';
  if (el.tagName === 'SELECT') {
    if (el.multiple) return Array.from(el.selectedOptions).map(o => o.value).join(',');
    return el.value;
  }
  return el.value;
}

function fillPlaceholders(str, data) {
  return str.replace(/{{\s*([a-zA-Z0-9_äöüÄÖÜß]+)\s*}}/g, (m, k) => {
    const key = sanitizeKey(k);
    return data[key] !== undefined ? data[key] : m;
  });
}

// Build Form
function buildForm(t) {
  const prevValues = {};
  [...form.elements].forEach(el => {
    if (!el.name) return;
    prevValues[el.name] = readInputValue(el);
  });

  form.innerHTML = '';

  // Nicht-Repeat, editable fields aus fields_vorlage
  for (const key in t.fields_vorlage) {
    const f = t.fields_vorlage[key];
    if (!f || f.perRepeat) continue;   // perRepeat wird später gebaut
    if (f.editable === false) continue; // Nur editable:true anzeigen

    const label = document.createElement('label');
    label.textContent = unsanitizeKey(key) + (f.multi ? ' (mehrere durch Komma)' : '') + ':';
    const input = createInputForField(f, key, prevValues[key]);
    form.appendChild(label);
    form.appendChild(input);
  }

  // Repeat-Feld aus fields_csv (nur eines erlaubt)
  const repeatFieldKey = Object.keys(t.fields_csv).find(k => t.fields_csv[k].repeat);
  if (repeatFieldKey) {
    const f = t.fields_csv[repeatFieldKey];
    if (f.editable === false) return; // nur anzeigen, wenn editable:true

    const label = document.createElement('label');
    label.textContent = unsanitizeKey(repeatFieldKey) + ' (mehrere durch Komma für CSV-Loop):';
    const input = createInputForField(f, repeatFieldKey, prevValues[repeatFieldKey]);
    form.appendChild(label);
    form.appendChild(input);
    input.addEventListener('input', () => buildRepeatFields(t));
    input.addEventListener('change', () => buildRepeatFields(t));
  }

  buildRepeatFields(t);
}

// Repeat-Felder
function buildRepeatFields(t) {
  const prev = {};
  [...form.elements].forEach(el => {
    if (!el.name) return;
    prev[el.name] = readInputValue(el);
  });

  form.querySelectorAll('.dynamic-repeat').forEach(el => el.remove());

  const repeatFieldKey = Object.keys(t.fields_csv).find(k => t.fields_csv[k].repeat);
  if (!repeatFieldKey) return;
  const repeatInput = form.querySelector(`[name='${repeatFieldKey}']`);
  if (!repeatInput) return;

  let repeatValues = [];
  if (repeatInput.tagName === "SELECT" && repeatInput.multiple) {
    repeatValues = Array.from(repeatInput.selectedOptions).map(o => o.value);
  } else {
    repeatValues = (repeatInput.value || '').split(',').map(s => s.trim()).filter(s => s);
  }
  if (!repeatValues.length) return;

  repeatValues.forEach(val => {
    const div = document.createElement('div');
    div.className = 'dynamic-repeat';

    // Alle perRepeat Felder aus fields_vorlage und fields_csv
    const allFields = { ...t.fields_vorlage, ...t.fields_csv };
    for (const key in allFields) {
      const f = allFields[key];
      if (!f || !f.perRepeat) continue;
      if (f.editable === false) continue; // nur editable Felder anzeigen

      const label = document.createElement('label');
      label.textContent = `${unsanitizeKey(key)} für ${val}` + (f.multi ? ' (mehrere durch Komma)' : '') + ':';

      const inputName = `${key}_${val}`;
      const existingValue = prev[inputName] !== undefined ? prev[inputName] : (f.value || '');
      const input = createInputForField(f, inputName, existingValue);

      div.appendChild(label);
      div.appendChild(input);
    }

    // Editable Pairs perRepeat
    if (t.pairs && t.pairs.length > 0) {
      t.pairs.forEach((pair, i) => {
        if (!pair.editable || !pair.perRepeat) return;
        for (const key in pair) {
          if (["editable", "perRepeat"].includes(key)) continue;
          const label = document.createElement('label');
          label.textContent = `${unsanitizeKey(key)} für ${val} (Pair #${i + 1})`;
          const input = document.createElement('input');
          input.name = `pair_${i}_${key}_${val}`;
          input.value = prev[`pair_${i}_${key}_${val}`] !== undefined ? prev[`pair_${i}_${key}_${val}`] : (pair[key] || '');
          div.appendChild(label);
          div.appendChild(input);
        }
      });
    }

    form.appendChild(div);
  });
}

// Repeat-Felder (per Repeat-Wert) inkl. Pairs
function buildRepeatFields(t) {
  // preserve existing perRepeat values before removing
  const prev = {};
  [...form.elements].forEach(el => {
    if (!el.name) return;
    prev[el.name] = readInputValue(el);
  });

  const old = form.querySelectorAll('.dynamic-repeat');
  old.forEach(el => el.remove());

  const repeatFieldKey = Object.keys(t.fields_csv).find(k => t.fields_csv[k].repeat);
  if (!repeatFieldKey) return;
  const repeatInput = form.querySelector(`[name='${repeatFieldKey}']`);
  if (!repeatInput) return;

  let repeatValues = [];
  if (repeatInput.tagName === "SELECT" && repeatInput.multiple) {
    repeatValues = Array.from(repeatInput.selectedOptions).map(o => o.value);
  } else {
    repeatValues = (repeatInput.value || '').split(',').map(s => s.trim()).filter(s => s);
  }
  if (!repeatValues.length) return;

  repeatValues.forEach(val => {
    const div = document.createElement('div');
    div.className = 'dynamic-repeat';

    // Alle perRepeat Felder aus fields_vorlage und fields_csv
    const allFields = { ...t.fields_vorlage, ...t.fields_csv };
    for (const key in allFields) {
      const f = allFields[key];
      if (!f || !f.perRepeat || !f.editable) continue;

      const label = document.createElement('label');
      label.textContent = `${unsanitizeKey(key)} für ${val}` + (f.multi ? ' (mehrere durch Komma)' : '') + ':';

      const inputName = `${key}_${val}`;
      const existingValue = prev[inputName] !== undefined ? prev[inputName] : (f.value || '');
      const input = createInputForField(f, inputName, existingValue);

      div.appendChild(label);
      div.appendChild(input);
    }

    // Editable Pairs perRepeat
    if (t.pairs && t.pairs.length > 0) {
      t.pairs.forEach((pair, i) => {
        if (!pair.editable || !pair.perRepeat) return;
        for (const key in pair) {
          if (["editable", "perRepeat"].includes(key)) continue;
          const label = document.createElement('label');
          label.textContent = `${unsanitizeKey(key)} für ${val} (Pair #${i + 1})`;
          const input = document.createElement('input');
          input.name = `pair_${i}_${key}_${val}`;
          input.value = prev[`pair_${i}_${key}_${val}`] !== undefined ? prev[`pair_${i}_${key}_${val}`] : (pair[key] || '');
          div.appendChild(label);
          div.appendChild(input);
        }
      });
    }

    form.appendChild(div);
  });
}

// Template change
select.addEventListener('change', () => {
  buildForm(templates[select.value]);
  updatePreview();
});

buildForm(templates[0]);

// Vorschau aktualisieren
// Title und Text aktualisieren
function updatePreview() {
  const t = templates[select.value];
  const data = {};

  // Alle Formularwerte einsammeln
  [...form.elements].forEach(el => {
    if (!el.name) return;
    let val;
    if (el.tagName === "SELECT" && el.multiple) {
      val = Array.from(el.selectedOptions).map(o => o.value).join(',');
    } else {
      val = el.value;
    }

    // Multi-Feld für Title/Text: ',' → '_'
    if ((t.fields_vorlage[el.name]?.multi || t.fields_csv[el.name]?.multi) && val) {
      val = val.split(',').map(s => s.trim()).join('_');
    }
    data[el.name] = val;
  });

  // Ref-Felder auflösen
  for (const key in t.fields_vorlage) {
    const f = t.fields_vorlage[key];
    if (f.ref && data[f.ref] !== undefined) {
      data[key] = data[f.ref];
    }
  }
  for (const key in t.fields_csv) {
    const f = t.fields_csv[key];
    if (f.ref && data[f.ref] !== undefined) {
      data[key] = data[f.ref];
    }
  }

  // Conditions anwenden
  function applyConditions(fieldKey, fieldDef) {
    let val = data[fieldKey] ?? fieldDef.value ?? '';
    if (fieldDef.conditions && fieldDef.conditions.length) {
      for (const c of fieldDef.conditions) {
        const checkVal = (data[c.key] ?? "").toString();
        let match = false;

        switch (c.mode || "equals") {
          case "equals":
            match = (checkVal === c.value);
            break;
          case "contains":
            match = checkVal.includes(c.value);
            break;
          case "startsWith":
            match = checkVal.startsWith(c.value);
            break;
          case "endsWith":
            match = checkVal.endsWith(c.value);
            break;
          case "regex":
            try {
              match = new RegExp(c.value).test(checkVal);
            } catch (e) { match = false; }
            break;
        }

        if (match) {
          val = c.set;
          break; // erste passende Bedingung gewinnt
        }
      }
    }
    return val;
  }

  for (const key in t.fields_vorlage) {
    data[key] = applyConditions(key, t.fields_vorlage[key]);
  }
  for (const key in t.fields_csv) {
    data[key] = applyConditions(key, t.fields_csv[key]);
  }

  // Title und Text mit aktualisierten multi-Werten
  titleBox.innerText = fillPlaceholders(t.title, data);
  preview.innerText = fillPlaceholders(t.text, data);

  buildRepeatFields(t); // UI wiederholen
}

// CSV Export
function downloadCSV() {
  const t = templates[select.value];
  const data = {};

  // Formularwerte lesen (select + inputs)
  [...form.elements].forEach(el => {
    if (!el.name) return;
    data[el.name] = readInputValue(el);
  });

  // ref-Felder auflösen (global)
  function resolveRefs(fields) {
    for (const key in fields) {
      const f = fields[key];
      if (f && f.ref && data[f.ref] !== undefined) {
        data[key] = data[f.ref];
      }
    }
  }
  resolveRefs(t.fields_vorlage);
  resolveRefs(t.fields_csv);

  // Repeat-Feld ermitteln
  const repeatFieldKey = Object.keys(t.fields_csv).find(k => t.fields_csv[k].repeat);
  let repeatValues = [''];
  if (repeatFieldKey) {
    const repeatInput = form.querySelector(`[name='${repeatFieldKey}']`);
    if (repeatInput) {
      if (repeatInput.tagName === "SELECT" && repeatInput.multiple) {
        repeatValues = Array.from(repeatInput.selectedOptions).map(o => o.value);
      } else {
        repeatValues = (data[repeatFieldKey] || '').split(',').map(s => s.trim()).filter(s => s);
      }
    }
  }

  // Spalten bestimmen
  let csvFields = Object.keys(t.fields_csv);
  if (t.pairs && t.pairs.length > 0) {
    t.pairs.forEach(p => {
      Object.keys(p).forEach(k => {
        if (!["editable", "perRepeat"].includes(k) && !csvFields.includes(k)) csvFields.push(k);
      });
    });
  }

  const header = csvFields.map(f => unsanitizeKey(f));
  const csvLines = [header.join(';')];

  repeatValues.forEach(val => {
    let row = {};
    if (repeatFieldKey) row[repeatFieldKey] = val;

    csvFields.forEach(f => {
      if (f === repeatFieldKey) return;

      // Prüfe perRepeat input first
      const input = form.querySelector(`[name='${f}_${val}']`);
      let valField;
      if (input) {
        valField = readInputValue(input);
      } else {
        // Wenn csv-Feld ref zu einer vorlage-perRepeat besitzt, hole perRepeat-Wert
        const csvDef = t.fields_csv[f] || {};
        if (csvDef.ref && csvDef.perRepeat) {
          valField = data[`${csvDef.ref}_${val}`] ?? data[csvDef.ref] ?? t.fields_vorlage[csvDef.ref]?.value ?? '';
        } else {
          valField = data[f] ?? t.fields_csv[f]?.value ?? t.fields_vorlage[f]?.value ?? '';
        }
      }

      // Conditions prüfen (csv oder Vorlage)
      const conds = t.fields_csv[f]?.conditions ?? t.fields_vorlage[f]?.conditions;
      if (conds && conds.length) {
        for (const c of conds) {
          if (data[c.key] === c.value) {
            valField = c.set;
            break;
          }
        }
      }

      row[f] = valField;
    });

    // Pairs einfügen (pro Repeat)
    if (t.pairs && t.pairs.length > 0) {
      t.pairs.forEach((pair, i) => {
        let pairRow = { ...row };
        for (const key in pair) {
          if (["editable", "perRepeat"].includes(key)) continue;
          const el = form.querySelector(`[name='pair_${i}_${key}_${val}']`);
          pairRow[key] = el ? readInputValue(el) : pair[key];
        }
        csvLines.push(csvFields.map(f => pairRow[f] || '').join(';'));
      });
    } else {
      csvLines.push(csvFields.map(f => row[f] || '').join(';'));
    }
  });

  // Dateiname dynamisch (multi -> _)
  let filename = t.filename || 'daten.csv';
  filename = filename.replace(/{{\s*([a-zA-Z0-9_]+)\s*}}/g, (m, key) => {
    let valFile = data[key] || '';
    if ((t.fields_csv[key] && t.fields_csv[key].multi) || (t.fields_vorlage[key] && t.fields_vorlage[key].multi)) {
      valFile = valFile.split(',').map(s => s.trim()).join('_');
    }
    return valFile;
  });

  const bom = "\uFEFF";
  const blob = new Blob([bom + csvLines.join('\n')], { type:'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
