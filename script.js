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

    // Nicht-Repeat, editable fields aus fields_vorlage
    for (const key in t.fields_vorlage) {
        const f = t.fields_vorlage[key];
        if (!f.editable) continue;

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

    // Repeat-Feld aus fields_csv
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

    // Placeholders in title/text, die nicht in fields_vorlage sind
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

        // editable perRepeat fields aus fields_vorlage UND fields_csv
        for (const key in {...t.fields_vorlage, ...t.fields_csv}) {
            const f = {...t.fields_vorlage, ...t.fields_csv}[key];
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

    // Conditions für Vorlagenfelder
    for (const key in t.fields_vorlage) {
        const f = t.fields_vorlage[key];
        if (f.conditions && f.conditions.length) {
            for (const cond of f.conditions) {
                if (data[cond.key] === cond.value) {
                    data[key] = cond.set;
                    break;
                } else if (data[key] === undefined) {
                    data[key] = f.value || '';
                }
            }
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
    [...form.elements].forEach(el => {
        if (!el.name) return;
        if (el.tagName === "SELECT" && el.multiple) {
            data[el.name] = Array.from(el.selectedOptions).map(o => o.value).join(',');
        } else {
            data[el.name] = el.value;
        }
    });

    // feste Werte übernehmen
    for (const key in t.fields_csv) {
        if (!data[key] && t.fields_csv[key].value !== undefined) {
            data[key] = t.fields_csv[key].value;
        }
    }

    const repeatFieldKey = Object.keys(t.fields_csv).find(k => t.fields_csv[k].repeat);
    let repeatValues = [''];
    if (repeatFieldKey) {
        if (form.querySelector(`[name='${repeatFieldKey}']`)?.tagName === "SELECT" && form.querySelector(`[name='${repeatFieldKey}']`).multiple) {
            repeatValues = Array.from(form.querySelector(`[name='${repeatFieldKey}']`).selectedOptions).map(o => o.value);
        } else {
            repeatValues = (data[repeatFieldKey] || '').split(',').map(s => s.trim()).filter(s => s);
        }
    }

    // Spaltenreihenfolge
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
            let valField;
            if (input) {
                if (input.tagName === "SELECT" && input.multiple) valField = Array.from(input.selectedOptions).map(o => o.value).join(',');
                else valField = input.value;
            } else {
                valField = data[f] || t.fields_csv[f]?.value || '';
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

        // Pairs
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

    // Dynamischer Dateiname
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
