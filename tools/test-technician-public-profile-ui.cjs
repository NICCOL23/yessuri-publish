const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),path=require('node:path');
class Node {
 constructor(tag,text=''){this.tagName=tag;this.children=[];this.handlers={};this.attributes={};this.textContent=text;this.hidden=false;this.disabled=false;this.checked=false;this.value='';}
 append(...nodes){for(const node of nodes){node.parent=this;this.children.push(node)}}
 replaceChildren(...nodes){this.children=[];this.append(...nodes)}
 get firstChild(){return this.children[0]}
 setAttribute(key,value){this.attributes[key]=value}
 addEventListener(name,fn){this.handlers[name]=fn}
 after(node){this.sibling=node}
 focus(){this.focused=true}
 querySelectorAll(selector){return this.children.flatMap(node=>[...(selector.split(',').includes(node.tagName)?[node]:[]),...node.querySelectorAll(selector)])}
}
async function run({existing=false,fail=false}={}){
 const anchor=new Node('section'),window={},calls=[];
 const document={querySelector:()=>anchor,createElement:tag=>new Node(tag),createTextNode:text=>new Node('#text',text)};
 vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../technician-public-profile.js'),'utf8'),{window,document,console});
 const application={id:'application-id',version:7,company:'신청 업체',fields:'누수·수도, 타일',areas:'해운대구, 수영구',intro:'소개',phone:'010-1234-5678'};
 const api=async(route,data)=>{calls.push({route,data});if(fail&&data)throw Error('저장 실패');return {profile:existing||data?{id:'technician-application-id'}:null}};
 window.YESSURI_TECHNICIAN_PUBLIC_PROFILE.mount({application,api});
 const section=anchor.sibling,open=section.children[2],form=section.children[3],status=section.children[4];
 const input=key=>form.querySelectorAll('input,textarea').find(node=>node.id==='public-profile-'+key);
 assert.equal(form.hidden,true);assert.equal(calls.length,0);
 await open.handlers.click();assert.equal(calls.length,1);
 return {form,open,status,input,calls};
}
(async()=>{
 const s=await run();assert.equal(s.form.hidden,false);assert.equal(s.input('name').value,'신청 업체');assert.equal(s.input('phonePublic').checked,false);assert.equal(s.input('publicConsent').checked,false);
 await s.form.handlers.submit({preventDefault(){}});assert.equal(s.calls.length,1,'no publish before consent');
 s.input('publicConsent').checked=true;s.input('name').value='검토한 업체명';await s.form.handlers.submit({preventDefault(){}});
 const data=s.calls[1].data;assert.equal(data.name,'검토한 업체명');assert.equal(data.version,7);assert.equal(data.fields.length,2);assert.equal(data.serviceAreas.length,2);assert.equal(data.phone,'');assert.equal(data.phonePublic,false);assert.equal(s.form.hidden,true);assert.equal(s.open.hidden,true);assert.equal(s.status.children[1].href,'expert.html?id=technician-application-id');
 const existing=await run({existing:true});assert.equal(existing.form.hidden,true);assert.equal(existing.open.hidden,true);assert.equal(existing.calls.length,1);
 const failed=await run({fail:true});failed.input('publicConsent').checked=true;await failed.form.handlers.submit({preventDefault(){}});assert.equal(failed.form.hidden,false);assert.equal(failed.input('name').value,'신청 업체');assert.equal(failed.input('name').disabled,false);assert.equal(failed.open.disabled,false);
 console.log('PASS: review form prefills, explicit consent, reviewed values, phone opt-in default, success link, existing-profile guard, error preserves inputs');
})().catch(e=>{console.error(e);process.exitCode=1});
