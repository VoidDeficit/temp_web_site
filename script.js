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

function fillPlaceholders(str, data) {
  return str.replace(/{{\s*([a-zA-Z0-9_äöüÄÖÜß]+)\s*}}/g, (m, k) => {
    const key = sanitizeKey(k);
    return data[key] !== undefined ? data[key] : m;
  });
}

// Build Form
function buildForm(t) {
  form.innerHTML = '';

    // Nicht-Repeat, editable fields für Vorlage
    for (const key in t.fields_vorlage) {
    const f = t.fields_vorlage[key];
    if (!f.editable) continue; // <-- nur editierbare Felder

    // Label + Input erstellen (Text oder Dropdown)
    const label = document.createElement('label');
    label.textContent = unsanitizeKey(key) + (f.multi ? ' (mehrere durch Komma)' : '') + ':';

    let input;
    if (f.options && Array.isArray(f.options)) {
        input = document.createElement('select');
        if (f.multi) input.multiple = true;
        f.options.forEach(optVal => {
        const opt = document.createElement('option');
        opt.value = optVal;
        opt.textContent = optVal;
        if (optVal === f.value) opt.selected = true;
        input.appendChild(opt);
        });
    } else {
        input = document.createElement('input');
        input.type = 'text';
        input.value = f.value || '';
    }

    input.name = key;
    form.appendChild(label);
    form.appendChild(input);
    }


  // Repeat-Feld
  const repeatFieldKey = Object.keys(t.fields_csv).find(k => t.fields_csv[k].repeat);
  if (repeatFieldKey) {
    const f = t.fields_csv[repeatFieldKey];
    if (f.editable) {
      const label = document.createElement('label');
      label.textContent = unsanitizeKey(repeatFieldKey) + ' (mehrere durch Komma für CSV-Loop):';
      let input;
      if (f.options && Array.isArray(f.options)) {
        input = document.createElement('select');
        if (f.multi) input.multiple = true;
        f.options.forEach(optVal => {
          const opt = document.createElement('option');
          opt.value = optVal;
          opt.textContent = optVal;
          if (optVal === f.value) opt.selected = true;
          input.appendChild(opt);
        });
      } else {
        input = document.createElement('input');
        input.type = 'text';
        input.value = f.value || '';
      }
      input.name = repeatFieldKey;
      form.appendChild(label);
      form.appendChild(input);
      input.addEventListener('input', () => buildRepeatFields(t));
      input.addEventListener('change', () => buildRepeatFields(t));
    }
  }

  // Fields aus Title/Text, die nicht in fields_vorlage sind
  const allPlaceholders = new Set((t.title + t.text).match(/{{\s*([a-zA-Z0-9_äöüÄÖÜß]+)\s*}}/g) || []);
  allPlaceholders.forEach(ph => {
    const key = ph.replace(/[{}]/g, '').trim();
    if (!(key in t.fields_vorlage) && !form.querySelector(`[name='${sanitizeKey(key)}']`)) {
      const label = document.createElement('label');
      label.textContent = key + ':';
      const input = document.createElement('input');
      input.name = sanitizeKey(key);
      input.value = '';
      form.appendChild(label);
      form.appendChild(input);
    }
  });

  buildRepeatFields(t);
}

// Repeat-Felder (per Repeat-Wert) inkl. Pairs
function buildRepeatFields(t) {
  const old = form.querySelectorAll('.dynamic-repeat');
  old.forEach(el => el.remove());

  const repeatFieldKey = Object.keys(t.fields_csv).find(k => t.fields_csv[k].repeat);
  if (!repeatFieldKey) return;
  const repeatInput = form.querySelector(`[name='${repeatFieldKey}']`);

  let repeatValues = [];
  if (repeatInput) {
    if (repeatInput.tagName === "SELECT" && repeatInput.multiple) {
      repeatValues = Array.from(repeatInput.selectedOptions).map(o => o.value);
    } else {
      repeatValues = (repeatInput.value || '').split(',').map(s => s.trim()).filter(s => s);
    }
  }
  if (!repeatValues.length) return;

  repeatValues.forEach(val => {
    const div = document.createElement('div');
    div.className = 'dynamic-repeat';

    // editable perServer fields
    for (const key in t.fields_vorlage) {
      const f = t.fields_vorlage[key];
      if (f.editable && f.perRepeat) {
        const label = document.createElement('label');
        label.textContent = `${unsanitizeKey(key)} für ${val}` + (f.multi ? ' (mehrere durch Komma)' : '') + ':';

        let input;
        if (f.options && Array.isArray(f.options)) {
          input = document.createElement('select');
          if (f.multi) input.multiple = true;
          f.options.forEach(optVal => {
            const opt = document.createElement('option');
            opt.value = optVal;
            opt.textContent = optVal;
            if (optVal === f.value) opt.selected = true;
            input.appendChild(opt);
          });
        } else {
          input = document.createElement('input');
          input.type = 'text';
          input.value = f.value || '';
        }

        input.name = `${key}_${val}`;
        div.appendChild(label);
        div.appendChild(input);
      }
    }

    // editable pairs perRepeat
    if (t.pairs && t.pairs.length > 0) {
      t.pairs.forEach((pair, i) => {
        if (!pair.editable) return;
        for (const key in pair) {
          if (["editable", "perRepeat"].includes(key)) continue;
          const label = document.createElement('label');
          label.textContent = `${unsanitizeKey(key)} für ${val} (Pair #${i + 1})`;
          const input = document.createElement('input');
          input.name = `pair_${i}_${key}_${val}`;
          input.value = pair[key] || '';
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

// Vorschau
function updatePreview() {
  const t = templates[select.value];
  const data = {};
  [...form.elements].forEach(el => {
    if (!el.name) return;
    if (el.tagName === "SELECT" && el.multiple) {
      data[el.name] = Array.from(el.selectedOptions).map(o => o.value).join(',');
    } else {
      data[el.name] = el.value;
    }
  });

  // Conditions anwenden
  for (const key in t.fields_vorlage) {
    const f = t.fields_vorlage[key];
    if (f.conditions) {
      f.conditions.forEach(cond => {
        if (data[cond.key] === cond.value) {
          data[key] = cond.set;
        } else if (data[key] === undefined) {
          data[key] = f.value || '';
        }
      });
    } else {
      if (data[key] === undefined) data[key] = f.value || '';
    }
  }

  titleBox.innerText = fillPlaceholders(t.title, data);
  preview.innerText = fillPlaceholders(t.text, data);
}


// CSV Export
function downloadCSV() {
  const t = templates[select.value];
  const data = {};

  // Alle Formularwerte holen (editierbare Felder)
  [...form.elements].forEach(el => {
    if (!el.name) return;
    if (el.tagName === "SELECT" && el.multiple) {
      data[el.name] = Array.from(el.selectedOptions).map(o => o.value).join(',');
    } else {
      data[el.name] = el.value;
    }
  });

  // Statische/feste Werte aus fields_csv übernehmen (editable:false)
  for (const key in t.fields_csv) {
    if (!data[key] && t.fields_csv[key].value !== undefined) {
      data[key] = t.fields_csv[key].value;
    }
  }

  // Repeat-Feld für CSV
  const repeatFieldKey = Object.keys(t.fields_csv).find(k => t.fields_csv[k].repeat);
  let repeatValues = [''];
  if (repeatFieldKey) {
    const repeatInput = form.querySelector(`[name='${repeatFieldKey}']`);
    if (repeatInput?.tagName === "SELECT" && repeatInput.multiple) {
      repeatValues = Array.from(repeatInput.selectedOptions).map(o => o.value);
    } else {
      repeatValues = (data[repeatFieldKey] || '').split(',').map(s => s.trim()).filter(s => s);
    }
  }

  // CSV-Spalten: alle CSV-Felder, inkl. Repeat und Pairs
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

  // Zeilen pro Repeat-Wert
  repeatValues.forEach(val => {
    let row = {};
    if (repeatFieldKey) row[repeatFieldKey] = val;

    csvFields.forEach(f => {
      if (f === repeatFieldKey) return;

      const input = form.querySelector(`[name='${f}_${val}']`);
      let valField;

      if (input) {
        valField = (input.tagName === "SELECT" && input.multiple)
          ? Array.from(input.selectedOptions).map(o => o.value).join(',')
          : input.value;
      } else {
        // Fallback auf CSV-Feld oder Vorlage
        valField = data[f] || t.fields_csv[f]?.value || t.fields_vorlage[f]?.value || '';
      }

      // Conditions prüfen (CSV & Vorlage)
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

    // Pairs berücksichtigen
    if (t.pairs && t.pairs.length > 0) {
      t.pairs.forEach((pair, i) => {
        let pairRow = { ...row };
        for (const key in pair) {
          if (["editable", "perRepeat"].includes(key)) continue;
          const el = form.querySelector(`input[name='pair_${i}_${key}_${val}']`);
          pairRow[key] = el ? el.value : pair[key];
        }
        csvLines.push(csvFields.map(f => pairRow[f] || '').join(';'));
      });
    } else {
      csvLines.push(csvFields.map(f => row[f] || '').join(';'));
    }
  });

  // Dateiname dynamisch
  let filename = t.filename || 'daten.csv';
  filename = filename.replace(/{{\s*([a-zA-Z0-9_]+)\s*}}/g, (m, key) => {
    let valFile = data[key] || '';
    if (t.fields_csv[key] && t.fields_csv[key].multi) {
      valFile = valFile.split(',').map(s => s.trim()).join('_');
    }
    return valFile;
  });

  const bom = "\uFEFF";
  const blob = new Blob([bom + csvLines.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
