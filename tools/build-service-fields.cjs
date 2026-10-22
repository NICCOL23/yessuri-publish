const fs=require('fs'),path=require('path'),assert=require('assert');
const root=path.resolve(__dirname,'..');
const items=JSON.parse(fs.readFileSync(path.join(root,'data/service-fields.json'),'utf8'));
assert(items.length>0);assert.equal(new Set(items.map(f=>f.value)).size,items.length);
for(const f of items){assert(f.label&&f.description&&f.href);assert(fs.existsSync(path.join(root,f.image.split('#')[0])),f.image);}
assert.equal(new Set(items.map(f=>f.id)).size,items.length);
for(const f of items){assert(/^[a-z][a-z-]*$/.test(f.id));assert.equal(f.href,'service-detail.html?field='+f.id);assert(f.detail&&Array.isArray(f.detail.fieldIds)&&Array.isArray(f.detail.links));}
const runtime=path.join(root,'service-fields.js');
fs.writeFileSync(runtime,fs.readFileSync(runtime,'utf8').replace(/const items=\[[^\n]*\];/,'const items='+JSON.stringify(items)+';'));
for(const [file,id] of [['find.html','find-category'],['request.html','repair-type']]){
 const p=path.join(root,file),html=fs.readFileSync(p,'utf8');
 fs.writeFileSync(p,html.replace(new RegExp('(<select id="'+id+'"[^>]*>)([\\s\\S]*?)(</select>)'),(_,open,options,end)=>open+options.match(/<option[^>]*>[\s\S]*?<\/option>/)[0]+items.map(f=>'<option value="'+f.value+'">'+f.label+'</option>').join('')+end));
}
const p=path.join(root,'technician-recruit.html');fs.writeFileSync(p,fs.readFileSync(p,'utf8').replace(/(<ul class="recruit-fields" data-service-field-list>)[\s\S]*?(<\/ul>)/,(_,a,b)=>a+items.map(f=>'<li>'+f.label+'</li>').join('')+b));
const catalog=JSON.parse(fs.readFileSync(path.join(root,'data/work-catalog.json'),'utf8'));
for(const f of items){for(const id of f.detail.fieldIds)assert(catalog.fields.some(x=>x.id===id),'Unknown field: '+id);for(const id of f.detail.taskIds)assert(catalog.tasks.some(x=>x.id===id),'Unknown task: '+id);assert(catalog.tasks.some(t=>f.detail.fieldIds.includes(t.fieldId)||f.detail.taskIds.includes(t.id)||t.expertCategory===f.value),'Empty field: '+f.id);for(const l of f.detail.links)assert(l.catalogService?catalog.computerServices.some(s=>s.id===l.catalogService):fs.existsSync(path.join(root,l.href)),'Unknown detail link');}
for(const t of catalog.tasks)assert(t.expertCategory==='전체'||items.some(f=>f.value===t.expertCategory),'Unknown category: '+t.id);
console.log(items.length+' shared fields; '+catalog.tasks.length+' task mappings validated');
