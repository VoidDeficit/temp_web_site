const select = document.getElementById('templateSelect');
const form = document.getElementById('inputForm');
const preview = document.getElementById('preview');
const titleBox = document.getElementById('titleBox');

// Templates laden (aus template.js)
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

// Input / Select bauen
function buildInput(name, f, valOverride) {
  let input;
  const val = valOverride !== undefined ? valOverride : (f.value || '');
  if (f.options && Array.isArray(f.options)) {
    input = document.createElement('select');
    if (f.multi) input.multiple = true;
    f.options.forEach(optVal => {
      const opt = document.createElement('option');
      opt.value = optVal;
      opt.textContent = optVal;
      if (f.multi && val.split(',').includes(optVal)) {
        opt.selected = true;
      } else if (optVal === val) {
        opt.selected = true;
      }
      input.appendChild(opt);
    });
  } else {
    input = document.createElement('input');
    input.type = 'text';
    input.value = val;
  }
  input.name = name;
  return input;
}

// Formular bauen
function buildForm(t) {
  form.innerHTML = '';

  // Vorlage-Felder
  for (const key in t.fields_vorlage) {
    const f = t.fields_vorlage[key];
    if (f.editable) {
      const label = document.createElement('label');
      label.textContent = unsanitizeKey(key) + ':';
      const input = buildInput(key, f);
      form.appendChild(label);
      form.appendChild(input);
    }
  }

  // CSV-Felder (ohne repeat/perRepeat)
  for (const key in t.fields_csv) {
    const f = t.fields_csv[key];
    if (f.editable && !f.repeat && !f.perRepeat) {
      const label = document.createElement('label');
      label.textContent = unsanitizeKey(key) + (f.multi ? ' (mehrere)' : '') + ':';
      const input = buildInput(key, f);
      form.appendChild(label);
      form.appendChild(input);
    }
  }

  // Repeat Feld
  const repeatFieldKey = Object.keys(t.fields_csv).find(k => t.fields_csv[k].repeat);
  if (repeatFieldKey) {
    const f = t.fields_csv[repeatFieldKey];
    if (f.editable) {
      const label = document.createElement('label');
      label.textContent = unsanitizeKey(repeatFieldKey) + (f.multi ? ' (mehrere)' : '') + ':';
      const input = buildInput(repeatFieldKey, f);
      form.appendChild(label);
      form.appendChild(input);
      input.addEventListener('input', () => buildRepeatFields(t));
      input.addEventListener('change', () => buildRepeatFields(t));
    }
  }

  buildRepeatFields(t);
}

// Repeat Felder bauen
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

    // perRepeat CSV-Felder
    for (const key in t.fields_csv) {
      const f = t.fields_csv[key];
      if (f.editable && f.perRepeat) {
        const label = document.createElement('label');
        label.textContent = `${unsanitizeKey(key)} für ${val}:`;
        const input = buildInput(`${key}_${val}`, f);
        div.appendChild(label);
        div.appendChild(input);
      }
    }

    // Pairs mit editable & perRepeat
    if (t.pairs && t.pairs.length > 0) {
      t.pairs.forEach((pair, i) => {
        if (pair.editable && pair.perRepeat) {
          for (const key in pair) {
            if (["editable", "perRepeat"].includes(key)) continue;
            const label = document.createElement('label');
            label.textContent = `${unsanitizeKey(key)} für ${val} (Pair #${i + 1})`;
            const input = document.createElement('input');
            input.type = 'text';
            input.value = pair[key] || '';
            input.name = `pair_${i}_${key}_${val}`;
            div.appendChild(label);
            div.appendChild(input);
          }
        }
      });
    }

    form.appendChild(div);
  });
}

// Template Auswahl
select.addEventListener('change', () => {
  buildForm(templates[select.value]);
  updatePreview();
});
buildForm(templates[0]);

// Preview
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
  for (const key in t.fields_vorlage) {
    if (!t.fields_vorlage[key].editable) data[key] = t.fields_vorlage[key].value;
  }
  titleBox.innerText = fillPlaceholders(t.title, data);
  preview.innerText = fillPlaceholders(t.text, data);
}

// CSV Download
function downloadCSV() {
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

  // feste CSV-Werte übernehmen
  for (const key in t.fields_csv) {
    if (!data[key] && t.fields_csv[key].value !== undefined) {
      data[key] = t.fields_csv[key].value;
    }
  }

  const repeatFieldKey = Object.keys(t.fields_csv).find(k => t.fields_csv[k].repeat);
  let repeatValues = [''];
  if (repeatFieldKey) {
    if (form.querySelector(`[name='${repeatFieldKey}']`)?.tagName === "SELECT" &&
        form.querySelector(`[name='${repeatFieldKey}']`).multiple) {
      repeatValues = Array.from(form.querySelector(`[name='${repeatFieldKey}']`).selectedOptions).map(o => o.value);
    } else {
      repeatValues = (data[repeatFieldKey] || '').split(',').map(s => s.trim()).filter(s => s);
    }
  }

  let csvFields = Object.keys(t.fields_csv);
  if (t.pairs && t.pairs.length > 0) {
    t.pairs.forEach(p => {
      Object.keys(p).forEach(k => {
        if (!["editable", "perRepeat"].includes(k) && !csvFields.includes(k)) {
          csvFields.push(k);
        }
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
      const input = form.querySelector(`[name='${f}_${val}']`);
      if (input) {
        if (input.tagName === "SELECT" && input.multiple) {
          row[f] = Array.from(input.selectedOptions).map(o => o.value).join(',');
        } else {
          row[f] = input.value;
        }
      } else {
        row[f] = data[f] || '';
      }
    });

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

  let filename = t.filename || 'daten.csv';
  filename = filename.replace(/{{\s*([a-zA-Z0-9_]+)\s*}}/g, (m, key) => data[key] || '');
  const bom = "\uFEFF";
  const blob = new Blob([bom + csvLines.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
