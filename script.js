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

// Vorschau aktualisieren (neu: perRepeat-aware conditions für proxy usw.)
function updatePreview() {
  const t = templates[select.value];
  const data = {};

  // Alle Formularwerte einsammeln (global)
  [...form.elements].forEach(el => {
    if (!el.name) return;
    const raw = readInputValue(el);
    // Für Title/Text multi-Felder: ',' -> '_' (wie gewünscht)
    const isMulti = (t.fields_vorlage[el.name]?.multi || t.fields_csv[el.name]?.multi);
    data[el.name] = (isMulti && raw) ? raw.split(',').map(s => s.trim()).join('_') : raw;
  });

  // Hilfs: Condition-Check mit Modes
  function checkCondition(value, cond) {
    const mode = cond.mode || "equals";
        if (cond.multi) {
            // Wert splitten und gegen jedes Teil prüfen
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
            try { return new RegExp(cond.value).test(checkVal); }
            catch (e) { return false; }
            default: return false;
        }
    }


  // Repeat-Feld bestimmen (nur ein repeat erlaubt)
  const repeatFieldKey = Object.keys(t.fields_csv).find(k => t.fields_csv[k].repeat);
  // get raw repeat values (not converted to underscores here because we need original values for comparisons)
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

  // Resolve simple refs for global preview (copy of earlier logic)
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

  // Apply conditions, but be perRepeat-aware:
  // - If a condition references a key that is perRepeat (defined in fields_vorlage or fields_csv),
  //   apply the condition for each repeatValue and join results with '_' for preview.
  function applyConditionsForPreview(fieldKey, fieldDef) {
    // base value (could be already transformed e.g. multi->_)
    let base = data[fieldKey] ?? fieldDef.value ?? '';

    if (!fieldDef.conditions || !fieldDef.conditions.length) return base;

    // if any condition references a perRepeat key -> do per-repeat evaluation
    const hasPerRepeatCond = fieldDef.conditions.some(c => {
      return (t.fields_vorlage[c.key]?.perRepeat) || (t.fields_csv[c.key]?.perRepeat);
    });

    if (hasPerRepeatCond && Array.isArray(repeatValues) && repeatValues.length) {
      // evaluate for each repeat value
      const results = repeatValues.map(rv => {
        // find first condition that matches for this repeat value
        for (const c of fieldDef.conditions) {
          // determine compare value for this cond's key for this repeat:
          // try per-repeat input first: `${c.key}_${rv}`, then fall back to global `data[c.key]`
          const perInput = form.querySelector(`[name='${c.key}_${rv}']`);
          const compareVal = perInput ? readInputValue(perInput) : ( (data[c.key] !== undefined) ? data[c.key] : (t.fields_vorlage[c.key]?.value ?? t.fields_csv[c.key]?.value ?? '') );
          if (checkCondition(compareVal, c)) return c.set;
        }
        // no cond matched -> try existing per-repeat value for the target field itself (if exists)
        const selfPer = form.querySelector(`[name='${fieldKey}_${rv}']`);
        if (selfPer) return readInputValue(selfPer);
        // else fallback to the repeat value itself or empty
        return rv || '';
      });
      // for preview we join with '_' as requested
      return results.join('_');
    } else {
      // non perRepeat: evaluate normally using global data
      for (const c of fieldDef.conditions) {
        const compareVal = data[c.key] !== undefined ? data[c.key] : (t.fields_vorlage[c.key]?.value ?? t.fields_csv[c.key]?.value ?? '');
        if (checkCondition(compareVal, c)) {
          return c.set;
        }
      }
      return base;
    }
  }

  // apply for all fields (vorlage + csv) so placeholders in title/text are filled
  for (const k in t.fields_vorlage) data[k] = applyConditionsForPreview(k, t.fields_vorlage[k]);
  for (const k in t.fields_csv) data[k] = applyConditionsForPreview(k, t.fields_csv[k]);

  // Title und Text füllen
  titleBox.innerText = fillPlaceholders(t.title, data);
  preview.innerText = fillPlaceholders(t.text, data);

  // rebuild perRepeat UI (so UI reflects current values)
  buildRepeatFields(t);
}

// CSV Export (neu: perRepeat-aware condition evaluation für proxy etc.)
function downloadCSV() {
  const t = templates[select.value];
  const data = {};

  // Formularwerte lesen (global + repeat field raw)
  [...form.elements].forEach(el => {
    if (!el.name) return;
    data[el.name] = readInputValue(el);
  });

  // resolve simple refs globally
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

  // Repeat-Feld ermitteln
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

  // Condition check helper
  function checkCondition(value, cond) {
    const checkVal = (value ?? "").toString();
    const mode = cond.mode || "equals";
    switch (mode) {
      case "equals": return checkVal === cond.value;
      case "contains": return checkVal.includes(cond.value);
      case "startsWith": return checkVal.startsWith(cond.value);
      case "endsWith": return checkVal.endsWith(cond.value);
      case "regex":
        try { return new RegExp(cond.value).test(checkVal); }
        catch (e) { return false; }
      default: return false;
    }
  }

  // CSV fields header
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

  // für jede Wiederholung eine Reihe (oder mehrere Reihen wenn pairs)
  repeatValues.forEach(rv => {
    let baseRow = {};
    if (repeatFieldKey) baseRow[repeatFieldKey] = rv;

    // füllen der csv-Felder
    csvFields.forEach(f => {
      if (f === repeatFieldKey) return;

      // 1) perRepeat input (vorlage oder extra) z.B. fieldname_rv
      const perInput = form.querySelector(`[name='${f}_${rv}']`);
      if (perInput) {
        baseRow[f] = readInputValue(perInput);
        return;
      }

      const csvDef = t.fields_csv[f] || {};

      // 2) if csv field has ref and is perRepeat, try the perRepeat ref input
      if (csvDef.ref && csvDef.perRepeat) {
        const refPer = form.querySelector(`[name='${csvDef.ref}_${rv}']`);
        if (refPer) {
          baseRow[f] = readInputValue(refPer);
          return;
        }
      }

      // 3) evaluate conditions for this csv field:
      const conds = t.fields_csv[f]?.conditions ?? t.fields_vorlage[f]?.conditions;
      if (conds && conds.length) {
        // if any condition references a perRepeat key, evaluate per this rv
        let matched = false;
        for (const c of conds) {
          // obtain compare value (prefer perRepeat input for c.key)
          const condPerInput = form.querySelector(`[name='${c.key}_${rv}']`);
          const compareVal = condPerInput ? readInputValue(condPerInput) : (data[c.key] ?? t.fields_vorlage[c.key]?.value ?? t.fields_csv[c.key]?.value ?? '');
          if (checkCondition(compareVal, c)) {
            baseRow[f] = c.set;
            matched = true;
            break;
          }
        }
        if (matched) return;
      }

      // 4) fallback: global data or default from fields_csv or fields_vorlage
      baseRow[f] = data[f] ?? t.fields_csv[f]?.value ?? t.fields_vorlage[f]?.value ?? '';
    });

    // nun pairs (falls vorhanden)
    if (t.pairs && t.pairs.length > 0) {
      t.pairs.forEach((pair, i) => {
        let pairRow = { ...baseRow };
        for (const k in pair) {
          if (["editable", "perRepeat"].includes(k)) continue;
          // per-pair perRepeat input if exists
          const el = form.querySelector(`[name='pair_${i}_${k}_${rv}']`);
          pairRow[k] = el ? readInputValue(el) : pair[k];
        }
        csvLines.push(csvFields.map(f => pairRow[f] || '').join(';'));
      });
    } else {
      csvLines.push(csvFields.map(f => baseRow[f] || '').join(';'));
    }
  });

  // filename (multi -> _)
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