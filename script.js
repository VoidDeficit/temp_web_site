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

// Master-Feld suchen
function findRepeatMaster(t) {
  let candidateKey = Object.keys({ ...t.fields_vorlage, ...t.fields_csv })
    .find(k => (t.fields_vorlage[k]?.repeat || t.fields_csv[k]?.repeat));
  if (!candidateKey) return null;

  const candidate = t.fields_vorlage[candidateKey] || t.fields_csv[candidateKey];
  if (candidate.ref) return candidate.ref;
  return candidateKey;
}

// Build Form
function buildForm(t) {
  const prevValues = {};
  [...form.elements].forEach(el => {
    if (!el.name) return;
    prevValues[el.name] = readInputValue(el);
  });

  form.innerHTML = '';

  // repeat master bestimmen
  const repeatFieldKey = Object.keys({ ...t.fields_vorlage, ...t.fields_csv })
    .find(k => (t.fields_vorlage[k]?.repeat || t.fields_csv[k]?.repeat));

  // Normale Felder (ohne perRepeat, ohne repeat master)
  for (const key in t.fields_vorlage) {
    const f = t.fields_vorlage[key];
    if (!f || f.perRepeat) continue;
    if (key === repeatFieldKey) continue; // Master nicht doppelt anzeigen
    if (f.editable === false) continue;

    const label = document.createElement('label');
    label.textContent = unsanitizeKey(key) + (f.multi ? ' (mehrere durch Komma)' : '') + ':';
    const input = createInputForField(f, key, prevValues[key]);
    form.appendChild(label);
    form.appendChild(input);
  }

  // Repeat-Master Feld einfügen
  if (repeatFieldKey) {
    const f = t.fields_vorlage[repeatFieldKey] ?? t.fields_csv[repeatFieldKey];
    if (f.editable !== false) {
      const label = document.createElement('label');
      label.textContent = unsanitizeKey(repeatFieldKey) + ' (Kommagetrennt für Wiederholungen):';
      const input = createInputForField(f, repeatFieldKey, prevValues[repeatFieldKey]);
      form.appendChild(label);
      form.appendChild(input);
      input.addEventListener('input', () => buildRepeatFields(t));
      input.addEventListener('change', () => buildRepeatFields(t));
    }
  }

  buildRepeatFields(t);
}


// Repeat-Felder inkl. Pairs
function buildRepeatFields(t) {
  const prev = {};
  [...form.elements].forEach(el => {
    if (!el.name) return;
    prev[el.name] = readInputValue(el);
  });

  form.querySelectorAll('.dynamic-repeat').forEach(el => el.remove());

  const repeatFieldKey = findRepeatMaster(t);
  if (!repeatFieldKey) return;

  const repeatInput = form.querySelector(`[name='${repeatFieldKey}']`);
  if (!repeatInput) return;

  const repeatValues = (repeatInput.value || '').split(',').map(s => s.trim()).filter(Boolean);
  if (!repeatValues.length) return;

  repeatValues.forEach(rv => {
    const div = document.createElement('div');
    div.className = 'dynamic-repeat';

    const allFields = { ...t.fields_vorlage, ...t.fields_csv };
    for (const key in allFields) {
      const f = allFields[key];
      if (!f || !f.perRepeat) continue;

      const label = document.createElement('label');
      label.textContent = `${unsanitizeKey(key)} für ${rv}:`;

      const inputName = `${key}_${rv}`;
      const existingValue = prev[inputName] !== undefined ? prev[inputName] : (f.value || '');
      const input = createInputForField(f, inputName, existingValue);

      div.appendChild(label);
      div.appendChild(input);
    }

    if (t.pairs && t.pairs.length > 0) {
      t.pairs.forEach((pair, i) => {
        if (!pair.perRepeat) return;
        for (const key in pair) {
          if (["editable","perRepeat"].includes(key)) continue;
          const label = document.createElement('label');
          label.textContent = `${unsanitizeKey(key)} für ${rv} (Pair #${i+1})`;
          const input = document.createElement('input');
          input.name = `pair_${i}_${key}_${rv}`;
          input.value = prev[`pair_${i}_${key}_${rv}`] !== undefined ? prev[`pair_${i}_${key}_${rv}`] : pair[key] || '';
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
function updatePreview() {
  const t = templates[select.value];
  const data = {};

  [...form.elements].forEach(el => {
    if (!el.name) return;
    data[el.name] = el.tagName === "SELECT" && el.multiple
      ? Array.from(el.selectedOptions).map(o => o.value).join(',')
      : el.value;
  });

  function resolveRefs(fields) {
    for (const k in fields) {
      const f = fields[k];
      if (f && f.ref && data[f.ref] !== undefined) data[k] = data[f.ref];
    }
  }
  resolveRefs(t.fields_vorlage);
  resolveRefs(t.fields_csv);

  const repeatFieldKey = Object.keys(t.fields_csv).find(k => t.fields_csv[k].repeat);
  const repeatValues = repeatFieldKey
    ? (data[repeatFieldKey] || '').split(',').map(s => s.trim()).filter(Boolean)
    : [''];

  const pairData = repeatValues.map(rv => {
    const pd = {};
    if (t.pairs && t.pairs.length) {
      t.pairs.forEach((pair, i) => {
        Object.keys(pair).forEach(k => {
          if (!["editable","perRepeat"].includes(k)) pd[`pair${i}_${k}`] = pair[k];
        });
      });
    }
    return pd;
  });

  function checkCondition(value, cond) {
    const v = (value ?? "").toString();
    switch (cond.mode || "equals") {
      case "equals": return v === cond.value;
      case "contains": return v.includes(cond.value);
      case "startsWith": return v.startsWith(cond.value);
      case "endsWith": return v.endsWith(cond.value);
      case "regex": try { return new RegExp(cond.value).test(v); } catch(e){return false;}
      default: return false;
    }
  }

  function applyConditions(fieldKey, fieldDef) {
    let base = data[fieldKey] ?? fieldDef.value ?? '';
    if (!fieldDef.conditions?.length) return base;
    
    if (fieldDef.split) {
      const sourceVal = data[fieldDef.key] ?? '';
      const parts = sourceVal.split(',').map(s => s.trim()).filter(Boolean);
      return parts.map(p => {
        for (const c of fieldDef.conditions) if (checkCondition(p, c)) return c.set;
        return '';
      }).filter(Boolean).join(' ');
    }

    for (const c of fieldDef.conditions) {
      const compareVal = data[c.key] ?? '';
      if (checkCondition(compareVal, c)) return c.set;
    }
    return base;
  }

  for (const key in t.fields_vorlage) data[key] = applyConditions(key, t.fields_vorlage[key]);
  for (const key in t.fields_csv) data[key] = applyConditions(key, t.fields_csv[key]);

  repeatValues.forEach((rv, ri) => {
    const pd = pairData[ri];
    for (const k in pd) data[k] = pd[k];
  });

  titleBox.innerText = fillPlaceholders(t.title, data);
  preview.innerText = fillPlaceholders(t.text, data);
}

function downloadCSV() {
  const t = templates[select.value];
  const data = {};

  // Formularwerte sammeln
  [...form.elements].forEach(el => {
    if (!el.name) return;
    if (el.tagName === "SELECT" && el.multiple) {
      data[el.name] = Array.from(el.selectedOptions).map(o => o.value).join(',');
    } else {
      data[el.name] = el.value;
    }
  });

  // Refs auflösen
  function resolveRefs(fields) {
    for (const k in fields) {
      const f = fields[k];
      if (f?.ref && data[f.ref] !== undefined) {
        data[k] = data[f.ref];
      }
    }
  }
  resolveRefs(t.fields_vorlage);
  resolveRefs(t.fields_csv);

  // --- Master für repeat finden ---
  const repeatMasterKey = Object.keys(t.fields_vorlage)
    .find(k => t.fields_vorlage[k]?.repeat);

  let repeatValues = [''];
  if (repeatMasterKey && data[repeatMasterKey]) {
    repeatValues = data[repeatMasterKey].split(',').map(s => s.trim()).filter(Boolean);
  }

  // Hilfs: Condition prüfen
  function checkCondition(value, cond) {
    const val = (value ?? "").toString();
    switch (cond.mode) {
      case "equals": return val === cond.value;
      case "contains": return val.includes(cond.value);
      case "startsWith": return val.startsWith(cond.value);
      case "endsWith": return val.endsWith(cond.value);
      case "regex": try { return new RegExp(cond.value, 'i').test(val); } catch(e){ return false; }
      default: return false;
    }
  }

  function applyConditions(key, def, repeatVal = null) {
    let base = data[key] ?? def.value ?? '';
    if (!def.conditions?.length) return base;

    const results = [];
    def.conditions.forEach(c => {
      let source = repeatVal ?? (data[c.key] ?? '');
      let parts = c.split ? source.split(',').map(s=>s.trim()).filter(Boolean) : [source];
      parts.forEach(p => { if (checkCondition(p, c)) results.push(c.set); });
    });

    if (def.uniqueResult) return [...new Set(results)].join(' ');
    return results.join(' ');
  }

  // CSV-Felder + Header vorbereiten
  const csvFields = [...new Set([
    ...Object.keys(t.fields_csv),
    ...(t.pairs?.length ? t.pairs.flatMap(p => Object.keys(p).filter(k => !["editable","perRepeat"].includes(k))) : [])
  ])];
  const csvLines = [csvFields.map(f => unsanitizeKey(f)).join(';')];

  // --- CSV-Zeilen generieren ---
  repeatValues.forEach(rv => {
    const baseRow = {};

    // Master-Feld setzen
    if (repeatMasterKey) baseRow[repeatMasterKey] = rv;

    // Alle Felder füllen
    csvFields.forEach(f => {
      const def = t.fields_csv[f] ?? t.fields_vorlage[f] ?? {};
      if (def.perRepeat) {
        baseRow[f] = data[`${f}_${rv}`] ?? applyConditions(f, def, rv) ?? '';
      } else if (def.repeat) {
        // repeat:true in CSV-Feldern übernimmt den Master-Wert
        baseRow[f] = rv;
      } else {
        baseRow[f] = applyConditions(f, def) || (data[f] ?? (def.value ?? ''));
      }
    });

    // Pairs pro Repeat
    if (t.pairs?.length) {
      t.pairs.forEach(pair => {
        const row = { ...baseRow };
        Object.keys(pair).forEach(k => {
          if (!["editable","perRepeat","conditions"].includes(k)) row[k] = pair[k];
        });
        csvLines.push(csvFields.map(f => row[f] || '').join(';'));
      });
    } else {
      csvLines.push(csvFields.map(f => baseRow[f] || '').join(';'));
    }
  });

  // Dateiname mit Platzhaltern
  let filename = t.filename || 'daten.csv';
  filename = filename.replace(/{{\s*([a-zA-Z0-9_]+)\s*}}/g, (_, key) => {
    const def = t.fields_csv[key] ?? t.fields_vorlage[key];
    let val = applyConditions(key, def) || (data[key] ?? '');
    if (def?.multi) val = val.split(',').map(s => s.trim()).join('_');
    return val;
  });

  // CSV erzeugen
  const blob = new Blob(["\uFEFF" + csvLines.join('\n')], { type:'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
