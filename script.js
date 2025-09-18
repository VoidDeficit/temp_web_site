const select = document.getElementById('templateSelect');
const form = document.getElementById('inputForm');
const preview = document.getElementById('preview');
const titleBox = document.getElementById('titleBox');

// Dropdown
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

// Build form
function buildForm(t) {
  form.innerHTML = '';

  // non-repeat editable fields
  for (const key in t.fields) {
    const f = t.fields[key];
    if (f.editable && !f.perServer && !f.repeat) {
      const label = document.createElement('label');
      label.textContent = unsanitizeKey(key) + (f.multi ? ' (mehrere durch Komma)' : '') + ':';
      const input = document.createElement('input');
      input.name = key;
      input.value = f.value || '';
      form.appendChild(label);
      form.appendChild(input);
    }
  }

  // Repeat field
  const repeatFieldKey = Object.keys(t.fields).find(k => t.fields[k].repeat);
  if (repeatFieldKey) {
    const f = t.fields[repeatFieldKey];
    if (f.editable) { // Nur anzeigen, wenn editable
      const label = document.createElement('label');
      label.textContent = unsanitizeKey(repeatFieldKey) + (f.multi ? ' (mehrere durch Komma)' : '') + ':';
      const input = document.createElement('input');
      input.name = repeatFieldKey;
      input.value = f.value || '';
      form.appendChild(label);
      form.appendChild(input);
      input.addEventListener('input', () => buildRepeatFields(t));
    }
  }

  // placeholders in title/text not in fields
  const allPlaceholders = new Set((t.title + t.text).match(/{{\s*([a-zA-Z0-9_äöüÄÖÜß]+)\s*}}/g) || []);
  allPlaceholders.forEach(ph => {
    const key = ph.replace(/[{}]/g, '').trim();
    if (!(key in t.fields) && !form.querySelector(`[name='${sanitizeKey(key)}']`)) {
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

// Repeat per value
function buildRepeatFields(t) {
  const old = form.querySelectorAll('.dynamic-repeat');
  old.forEach(el => el.remove());

  const repeatFieldKey = Object.keys(t.fields).find(k => t.fields[k].repeat);
  if (!repeatFieldKey) return;
  const repeatInput = form.querySelector(`input[name='${repeatFieldKey}']`);
  const repeatValues = (repeatInput?.value || '').split(',').map(s => s.trim()).filter(s => s);
  if (!repeatValues.length) return;

  repeatValues.forEach(val => {
    const div = document.createElement('div');
    div.className = 'dynamic-repeat';

    // editable perServer fields
    for (const key in t.fields) {
      const f = t.fields[key];
      if (f.editable && f.perServer) {
        const label = document.createElement('label');
        label.textContent = `${unsanitizeKey(key)} für ${val}` + (f.multi ? ' (mehrere durch Komma)' : '') + ':';
        const input = document.createElement('input');
        input.name = `${key}_${val}`;
        input.value = f.value || '';
        div.appendChild(label);
        div.appendChild(input);
      }
    }

    // editable pairs perServer
    if (t.pairs && t.pairs.length > 0) {
      t.pairs.forEach((pair, i) => {
        if (pair.editable) {
          for (const key in pair) {
            if (["editable", "perServer", "repeat"].includes(key)) continue;
            const label = document.createElement('label');
            label.textContent = `${unsanitizeKey(key)} für ${val} (Pair #${i + 1})`;
            const input = document.createElement('input');
            input.name = `pair_${i}_${key}_${val}`;
            input.value = pair[key] || '';
            div.appendChild(label);
            div.appendChild(input);
          }
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

// Preview
function updatePreview() {
  const t = templates[select.value];
  const data = {};
  [...form.elements].forEach(el => { if (el.name) data[el.name] = el.value; });
  for (const key in t.fields) { if (!t.fields[key].editable) data[key] = t.fields[key].value; }
  titleBox.innerText = fillPlaceholders(t.title, data);
  preview.innerText = fillPlaceholders(t.text, data);
}

// CSV Download
function downloadCSV() {
  const t = templates[select.value];
  const data = {};
  [...form.elements].forEach(el => {
    if (el.name) data[el.name] = el.value;
  });

  // Feste Werte auch übernehmen (editable:false)
  for (const key in t.fields) {
    if (!data[key] && t.fields[key].value !== undefined) {
      data[key] = t.fields[key].value;
    }
  }

  // Repeat-Feld ermitteln
  const repeatFieldKey = Object.keys(t.fields).find(k => t.fields[k].repeat);
  const repeatValues = repeatFieldKey ? (data[repeatFieldKey] || '').split(',').map(s => s.trim()).filter(s => s) : [''];

  // Spaltenreihenfolge: so wie in fields definiert
  let csvFields = Object.keys(t.fields);
  // + pairs dynamisch hinzufügen
  if (t.pairs && t.pairs.length > 0) {
    t.pairs.forEach(p => {
      Object.keys(p).forEach(k => {
        if (!["editable", "perServer", "repeat"].includes(k) && !csvFields.includes(k)) {
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
      if (f === repeatFieldKey) return; // schon gesetzt
      // Per-Server Eingabe prüfen
      const input = form.querySelector(`[name='${f}_${val}']`);
      if (input) row[f] = input.value;
      else {
        // Sonst globales Feld oder vordefinierter Wert
        row[f] = data[f] || '';
      }
    });

    // editable:false pairs auch berücksichtigen
    if (t.pairs && t.pairs.length > 0) {
      t.pairs.forEach((pair, i) => {
        let pairRow = { ...row };
        for (const key in pair) {
          if (["editable", "perServer", "repeat"].includes(key)) continue;
          const el = form.querySelector(`input[name='pair_${i}_${key}_${val}']`);
          pairRow[key] = el ? el.value : pair[key]; // vordefinierter Wert fallback
        }
        csvLines.push(csvFields.map(f => pairRow[f] || '').join(';'));
      });
    } else {
      csvLines.push(csvFields.map(f => row[f] || '').join(';'));
    }
  });

  // Dateiname dynamisch (mit Multi-Handling)
  let filename = t.filename || 'daten.csv';
  filename = filename.replace(/{{\s*([a-zA-Z0-9_]+)\s*}}/g, (m, key) => {
    let val = data[key] || '';
    if (t.fields[key] && t.fields[key].multi) {
      val = val.split(',').map(s => s.trim()).join('_');
    }
    return val;
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
