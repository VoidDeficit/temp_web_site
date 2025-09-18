const select = document.getElementById('templateSelect');
const form = document.getElementById('inputForm');
const preview = document.getElementById('preview');
const titleBox = document.getElementById('titleBox');

// Dropdown füllen
templates.forEach((t,i)=>{
  const opt = document.createElement('option');
  opt.value = i; opt.textContent = t.name;
  select.appendChild(opt);
});

function sanitizeKey(key){ return key.replace(/ /g,'_'); }
function unsanitizeKey(key){ return key.replace(/_/g,' '); }

function fillPlaceholders(str,data){
  return str.replace(/{{\s*([a-zA-Z0-9_äöüÄÖÜß]+)\s*}}/g,(m,k)=>{
    const key=sanitizeKey(k);
    return data[key]!==undefined?data[key]:m;
  });
}

// Feld-Renderer (input oder select)
function createInput(key,f,value,nameOverride){
  let el;
  if(f.options && Array.isArray(f.options)){
    el = document.createElement('select');
    (f.options).forEach(opt=>{
      const o = document.createElement('option');
      o.value = opt; o.textContent = opt;
      if(opt===(value||f.value)) o.selected = true;
      el.appendChild(o);
    });
    el.disabled = f.editable===false;
  } else {
    el = document.createElement('input');
    el.type = "text";
    el.value = value || f.value || "";
    el.readOnly = f.editable===false;
  }
  el.name = nameOverride || key;
  return el;
}

// Formular bauen
function buildForm(t){
  form.innerHTML='';

  // normale Felder (kein repeat, kein perServer)
  for(const key in t.fields){
    const f = t.fields[key];
    if(!f.repeat && !f.perServer){
      const label = document.createElement('label');
      label.textContent = unsanitizeKey(key)+(f.multi?' (mehrere durch Komma)':'')+':';
      const input = createInput(key,f,f.value);
      form.appendChild(label);
      form.appendChild(input);
    }
  }

  // Repeat-Feld
  const repeatFieldKey = Object.keys(t.fields).find(k=>t.fields[k].repeat);
  if(repeatFieldKey){
    const f = t.fields[repeatFieldKey];
    const label = document.createElement('label');
    label.textContent = unsanitizeKey(repeatFieldKey)+(f.multi?' (mehrere durch Komma)':'')+':';
    const input = createInput(repeatFieldKey,f,f.value);
    input.addEventListener('input',()=>buildRepeatFields(t));
    form.appendChild(label);
    form.appendChild(input);
  }

  buildRepeatFields(t);
}

// Repeat dynamisch
function buildRepeatFields(t){
  form.querySelectorAll('.dynamic-repeat').forEach(el=>el.remove());

  const repeatFieldKey = Object.keys(t.fields).find(k=>t.fields[k].repeat);
  if(!repeatFieldKey) return;
  const repeatInput = form.querySelector(`[name='${repeatFieldKey}']`);
  const repeatValues = (repeatInput.value||'').split(',').map(s=>s.trim()).filter(s=>s);

  repeatValues.forEach(val=>{
    const div = document.createElement('div');
    div.className='dynamic-repeat';

    // perServer fields
    for(const key in t.fields){
      const f = t.fields[key];
      if(f.perServer){
        const label = document.createElement('label');
        label.textContent = `${unsanitizeKey(key)} für ${val}:`;
        const input = createInput(key,f,f.value,`${key}_${val}`);
        div.appendChild(label);
        div.appendChild(input);
      }
    }

    // editable pairs
    if(t.pairs && t.pairs.length>0){
      t.pairs.forEach((pair,i)=>{
        if(pair.editable){
          for(const key in pair){
            if(["editable","perServer"].includes(key)) continue;
            const label = document.createElement('label');
            label.textContent = `${unsanitizeKey(key)} für ${val} (Pair #${i+1})`;
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

// Template-Wechsel
select.addEventListener('change',()=>{
  buildForm(templates[select.value]);
  updatePreview();
});
buildForm(templates[0]);

// Preview
function updatePreview(){
  const t = templates[select.value];
  const data={};
  [...form.elements].forEach(el=>{ if(el.name) data[el.name]=el.value; });
  for(const key in t.fields){ if(!t.fields[key].editable) data[key]=t.fields[key].value; }
  titleBox.innerText = fillPlaceholders(t.title,data);
  preview.innerText = fillPlaceholders(t.text,data);
}

// CSV Download
function downloadCSV(){
  const t = templates[select.value];
  const data={};
  [...form.elements].forEach(el=>{ if(el.name) data[el.name]=el.value; });
  for(const key in t.fields){ if(!data[key] && t.fields[key].value!==undefined) data[key]=t.fields[key].value; }

  const repeatFieldKey = Object.keys(t.fields).find(k=>t.fields[k].repeat);
  const repeatValues = repeatFieldKey ? (data[repeatFieldKey]||'').split(',').map(s=>s.trim()).filter(s=>s) : [''];

  // Header = Reihenfolge wie definiert
  let csvFields = Object.keys(t.fields);
  if(t.pairs && t.pairs.length>0){
    t.pairs.forEach(p=>{
      Object.keys(p).forEach(k=>{
        if(!["editable","perServer"].includes(k) && !csvFields.includes(k)){
          csvFields.push(k);
        }
      });
    });
  }

  const header = csvFields.map(f=>unsanitizeKey(f));
  const csvLines=[header.join(';')];

  repeatValues.forEach(val=>{
    let row = {};
    if(repeatFieldKey) row[repeatFieldKey] = val;

    csvFields.forEach(f=>{
      if(f===repeatFieldKey) return;
      const el = form.querySelector(`[name='${f}_${val}']`);
      row[f] = el ? el.value : (data[f]||'');
    });

    if(t.pairs && t.pairs.length>0){
      t.pairs.forEach((pair,i)=>{
        let pairRow={...row};
        for(const key in pair){
          if(["editable","perServer"].includes(key)) continue;
          const el=form.querySelector(`[name='pair_${i}_${key}_${val}']`);
          pairRow[key] = el ? el.value : pair[key];
        }
        csvLines.push(csvFields.map(f=>pairRow[f]||'').join(';'));
      });
    } else {
      csvLines.push(csvFields.map(f=>row[f]||'').join(';'));
    }
  });

  let filename = t.filename || 'daten.csv';
  filename = filename.replace(/{{\s*([a-zA-Z0-9_]+)\s*}}/g,(m,key)=>{
    let val = data[key] || '';
    if(t.fields[key] && t.fields[key].multi){
      val = val.split(',').map(s=>s.trim()).join('_');
    }
    return val;
  });

  const bom="\uFEFF";
  const blob=new Blob([bom+csvLines.join('\n')],{type:'text/csv;charset=utf-8;'});
  const link=document.createElement('a');
  link.href=URL.createObjectURL(blob);
  link.download=filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
