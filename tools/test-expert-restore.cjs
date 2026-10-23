const fs=require('fs'),vm=require('vm'),assert=require('node:assert/strict');
const ctx={window:{},Date};vm.runInNewContext(fs.readFileSync('data.js','utf8'),ctx);vm.runInNewContext(fs.readFileSync('search-state.js','utf8'),ctx);
const source=fs.readFileSync('find.js','utf8');const block=source.match(/  if\(!server\)\{\n    \/\/ Keep[\s\S]*?\n  \}/)[0];
for(const count of [0,5,57]){const rows=ctx.window.YESSURI_PUBLIC_EXPERTS();const test={server:false,matches:rows.slice(),searchIds:rows.slice(0,count).map(e=>e.id),current:new Map(rows.map(e=>[e.id,e])),searchState:ctx.window.YESSURI_SEARCH_STATE,searchHour:123};vm.runInNewContext(block,test);assert.equal(test.matches.length,57);assert.equal(new Set(test.matches.map(e=>e.id)).size,57);assert.deepEqual(test.matches.slice(0,count).map(e=>e.id),rows.slice(0,count).map(e=>e.id));}
console.log('PASS: saved 0/5/57 IDs all restore full 57 samples without duplicates; existing order preserved');
