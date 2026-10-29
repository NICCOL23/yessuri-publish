const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const app=fs.readFileSync(path.join(__dirname,'../app.js'),'utf8');
const code=app.slice(app.indexOf('let homeRotationTimer;'),app.indexOf('let toastTimer;'));
class Element{
 constructor(id){this.dataset={expertId:id};this.children=[];this.style={};this.handlers={};this.hover=false;this.focused=false;}
 append(...nodes){this.children.push(...nodes)}
 replaceChildren(...nodes){this.children=nodes;nodes.forEach(node=>node.parent=this)}
 after(node){this.afterElement=node}
 remove(){}
 setAttribute(){}
 addEventListener(name,handler){this.handlers[name]=handler}
 contains(){return this.focused}
 matches(){return this.hover}
 getBoundingClientRect(){return{top:100,bottom:260,height:160}}
 replaceWith(node){const index=this.parent.children.indexOf(this);this.parent.children[index]=node;node.parent=this.parent}
 animate(){}
}
async function fixture(realCount,exampleCount,{offline=false,mobile=false}={}){
 const real=Array.from({length:realCount},(_,i)=>({id:i?'real-'+i:'yescom',isExample:false}));
 const examples=Array.from({length:exampleCount},(_,i)=>({id:'example-'+i,isExample:true}));
 const grid=new Element(),link=new Element(),document={hidden:false,activeElement:null,createElement:()=>new Element(),querySelector:()=>link};let tick,delay;
 const window={innerHeight:900,addEventListener(){},matchMedia:q=>({matches:q.includes('767')&&mobile,addEventListener(){}}),YESSURI_PUBLIC_READY:Promise.resolve(),YESSURI_PUBLIC_API:{search:async({page,size})=>{if(offline&&page>1)throw Error('offline');return {items:real.slice((page-1)*size,page*size),total:realCount,totalPublic:realCount}}},YESSURI_EXPERT_CARD:{actualCount:()=>realCount,example:p=>p.isExample,selectFeatured:items=>items,create:p=>new Element(p.id)}};
 vm.runInNewContext(code,{window,document,expertGrid:grid,experts:()=>[...real.slice(0,12),...examples],Map,Set,setInterval:(fn,ms)=>{tick=fn;delay=ms;return 1},clearInterval(){},console});await new Promise(setImmediate);
 return{grid,document,real,examples,ids:()=>grid.children.map(node=>node.dataset.expertId),get tick(){return tick},get delay(){return delay}};
}
(async()=>{
 for(const [realCount,exampleCount] of [[1,57],[25,57],[0,57],[25,0]]){
  const f=await fixture(realCount,exampleCount);assert.equal(f.ids().length,12);assert.equal(f.delay,12000);if(realCount)assert.equal(f.ids()[0],'yescom');
  if(realCount===1)assert.equal(f.ids().filter(id=>id.startsWith('example-')).length,11);
  const seen=new Set(f.ids());
  for(let i=0;i<180;i++){const before=f.ids();await f.tick();const after=f.ids();assert.equal(after.length,12);assert.equal(new Set(after).size,12);assert.equal(after.filter((id,n)=>id!==before[n]).length,1);after.forEach(id=>seen.add(id));}
  assert.equal(seen.size,realCount+exampleCount,'all real and example profiles should remain in rotation');
 }
 const offline=await fixture(25,57,{offline:true});const before=offline.ids();await offline.tick();assert.equal(offline.ids().filter((id,n)=>id!==before[n]).length,1);
 const mobile=await fixture(1,57,{mobile:true});const mobileBefore=mobile.ids();await mobile.tick();assert.deepEqual(mobile.ids(),mobileBefore);
 const protectedCards=await fixture(1,57);protectedCards.grid.children.forEach(card=>card.focused=true);const protectedBefore=protectedCards.ids();await protectedCards.tick();assert.deepEqual(protectedCards.ids(),protectedBefore);
 const small=await fixture(1,3);assert.equal(small.ids().length,4);assert.equal(small.tick,undefined);
 console.log('PASS: yescom + 11 examples initially; all real/example profiles rotate, 12 slots, 12-second interval, one-card replacement, pagination, no duplicates, network fallback, interaction/mobile protection');
})().catch(error=>{console.error(error);process.exitCode=1});
