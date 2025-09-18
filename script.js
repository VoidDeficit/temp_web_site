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

function buildForm(t) {
  const prevValues = {};
  [...form.elements].forEach(el => {
    if (!el.name) return;
    prevValues[el.name] = readInputValue(el);
  });

  form.innerHTML = '';

  for (const key in t.fields_vorlage) {
    const f = t.fields_vorlage[key];
    if (!f || f.perRepeat) continue;
    if (f.editable === false) continue;

    const label = document.createElement('label');
    label.textContent = unsanitizeKey(key) + (f.multi ? ' (mehrere durch Komma)' : '') + ':';
    const input = createInputForField(f, key, prevValues[key]);
    form.appendChild(label);
    form.appendChild(input);
  }

  const repeatFieldKey = Object.keys(t.fields_csv).find(k => t.fields_csv[k].repeat);
  if (repeatFieldKey) {
    const f = t.fields_csv[repeatFieldKey];
    if (f.editable === false) return;

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

select.addEventListener('change', () => {
  buildForm(templates[select.value]);
  updatePreview();
});

buildForm(templates[0]);

function updatePreview() {
  const t = templates[select.value];
  const data = {};

  [...form.elements].forEach(el => {
    if (!el.name) return;
    const raw = readInputValue(el);
    const isMulti = (t.fields_vorlage[el.name]?.multi || t.fields_csv[el.name]?.multi);
    data[el.name] = (isMulti && raw) ? raw.split(',').map(s => s.trim()).join('_') : raw;
  });

  function checkCondition(value, cond) {
    const mode = cond.mode || "equals";
    if (cond.multi) {
      const parts = (value ?? "").toString().split(",").map(s => s.trim());
      return parts.some(part => singleCheck(part, cond, mode));
    } else {
      return singleCheck((value ?? "").toString(), cond, mode);
    }
  }

  function singleCheck(checkVal, cond, mode) {
    switch (mode) {
      case "equals": return checkVal === cond.value;
      case "contains": return checkVal.includes(cond.value);
      case "startsWith": return checkVal.startsWith(cond.value);
      case "endsWith": return checkVal.endsWith(cond.value);
      case "regex":
        try { return new RegExp(cond.value).test(checkVal); } catch (e) { return false; }
      default: return false;
    }
  }

  const repeatFieldKey = Object.keys(t.fields_csv).find(k => t.fields_csv[k].repeat);
  let repeatValues = [];
  if (repeatFieldKey) {
    const repeatEl = form.querySelector(`[name='${repeatFieldKey}']`);
    if (repeatEl) {
      if (repeatEl.tagName === "SELECT" && repeatEl.multiple) {
        repeatValues = Array.from(repeatEl.selectedOptions).map(o => o.value);
      } else {
        repeatValues = (readInputValue(repeatEl) || '').split(',').map(s => s.trim()).filter(Boolean);
      }
    }
  }

  function resolveRefs(fields) {
    for (const k in fields) {
      const f = fields[k];
      if (f && f.ref && data[f.ref] !== undefined) {
        data[k] = data[f.ref];
      }
    }
  }

  resolveRefs(t.fields_vorlage);
  resolveRefs(t.fields_csv);

  function applyConditionsForPreview(fieldKey, fieldDef) {
    let base = data[fieldKey] ?? fieldDef.value ?? '';
    if (!fieldDef.conditions || !fieldDef.conditions.length) return base;

    const hasPerRepeatCond = fieldDef.conditions.some(c => (t.fields_vorlage[c.key]?.perRepeat) || (t.fields_csv[c.key]?.perRepeat));
    if (hasPerRepeatCond && repeatValues.length) {
      const results = repeatValues.map(rv => {
        for (const c of fieldDef.conditions) {
          const perInput = form.querySelector(`[name='${c.key}_${rv}']`);
          const compareVal = perInput ? readInputValue(perInput) : ((data[c.key] !== undefined) ? data[c.key] : (t.fields_vorlage[c.key]?.value ?? t.fields_csv[c.key]?.value ?? ''));
          if (checkCondition(compareVal, c)) return c.set;
        }
        const selfPer = form.querySelector(`[name='${fieldKey}_${rv}']`);
        if (selfPer) return readInputValue(selfPer);
        return rv || '';
      });
      return results.join('_');
    } else {
      for (const c of fieldDef.conditions) {
        const compareVal = data[c.key] !== undefined ? data[c.key] : (t.fields_vorlage[c.key]?.value ?? t.fields_csv[c.key]?.value ?? '');
        if (checkCondition(compareVal, c)) return c.set;
      }
      return base;
    }
  }

  for (const k in t.fields_vorlage) data[k] = applyConditionsForPreview(k, t.fields_vorlage[k]);
  for (const k in t.fields_csv) data[k] = applyConditionsForPreview(k, t.fields_csv[k]);

  titleBox.innerText = fillPlaceholders(t.title, data);
  preview.innerText = fillPlaceholders(t.text, data);

  buildRepeatFields(t);
}

function downloadCSV() {
  const t = templates[select.value];
  const data = {};

  [...form.elements].forEach(el => {
    if (!el.name) return;
    data[el.name] = readInputValue(el);
  });

  function resolveRefs(fields) {
    for (const k in fields) {
      const f = fields[k];
      if (f && f.ref && data[f.ref] !== undefined) {
        data[k] = data[f.ref];
      }
    }
  }

  resolveRefs(t.fields_vorlage);
  resolveRefs(t.fields_csv);

  const repeatFieldKey = Object.keys(t.fields_csv).find(k => t.fields_csv[k].repeat);
  let repeatValues = [''];
  if (repeatFieldKey) {
    const repeatInput = form.querySelector(`[name='${repeatFieldKey}']`);
    if (repeatInput) {
      if (repeatInput.tagName === "SELECT" && repeatInput.multiple) {
        repeatValues = Array.from(repeatInput.selectedOptions).map(o => o.value);
      } else {
        repeatValues = (data[repeatFieldKey] || '').split(',').map(s => s.trim()).filter(Boolean);
      }
    }
  }

  function checkCondition(value, cond) {
    const checkVal = (value ?? "").toString();
    const mode = cond.mode || "equals";
    switch (mode) {
      case "equals": return checkVal === cond.value;
      case "contains": return checkVal.includes(cond.value);
      case "startsWith": return checkVal.startsWith(cond.value);
      case "endsWith": return checkVal.endsWith(cond.value);
      case "regex":
        try { return new RegExp(cond.value).test(checkVal); } catch (e) { return false; }
      default: return false;
    }
  }

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

  repeatValues.forEach(rv => {
    let baseRow = {};
    if (repeatFieldKey) baseRow[repeatFieldKey] = rv;

    csvFields.forEach(f => {
      if (f === repeatFieldKey) return;

      const perInput = form.querySelector(`[name='${f}_${rv}']`);
      if (perInput) { baseRow[f] = readInputValue(perInput); return; }

      const csvDef = t.fields_csv[f] || {};
      if (csvDef.ref && csvDef.perRepeat) {
        const refPer = form.querySelector(`[name='${csvDef.ref}_${rv}']`);
        if (refPer) { baseRow[f] = readInputValue(refPer); return; }
      }

      const conds = t.fields_csv[f]?.conditions ?? t.fields_vorlage[f]?.conditions;
      if (conds && conds.length) {
        let matched = false;
        for (const c of conds) {
          const condPerInput = form.querySelector(`[name='${c.key}_${rv}']`);
          const compareVal = condPerInput ? readInputValue(condPerInput) : (data[c.key] ?? t.fields_vorlage[c.key]?.value ?? t.fields_csv[c.key]?.value ?? '');
          if (checkCondition(compareVal, c)) { baseRow[f] = c.set; matched = true; break; }
        }
        if (matched) return;
      }

      baseRow[f] = data[f] ?? t.fields_csv[f]?.value ?? t.fields_vorlage[f]?.value ?? '';
    });

    if (t.pairs && t.pairs.length > 0) {
      t.pairs.forEach((pair, i) => {
        let pairRow = { ...baseRow };
        for (const k in pair) {
          if (["editable", "perRepeat"].includes(k)) continue;
          const el = form.querySelector(`[name='pair_${i}_${k}_${rv}']`);
          pairRow[k] = el ? readInputValue(el) : pair[k];
        }
        csvLines.push(csvFields.map(f => pairRow[f] || '').join(';'));
      });
    } else {
      csvLines.push(csvFields.map(f => baseRow[f] || '').join(';'));
    }
  });

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