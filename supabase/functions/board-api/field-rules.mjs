import fieldData from './fields.json' with {type:'json'};
import catalog from './catalog.json' with {type:'json'};
export const legacyGroups=fieldData.legacy.map(f=>f.id);
export const groups=new Set([...legacyGroups,...fieldData.fields.map(f=>f.id)]);
export function acceptsWork(group,work){return !work||!!fieldData.fields.find(f=>f.id===group)?.works.includes(work)||catalog.some(t=>t.id===work&&t.group_id===group);}
export function fieldFilter(group){
 if(!groups.has(group))return null;
 const f=fieldData.fields.find(f=>f.id===group);
 return f?'group_id.eq.'+group+',and(group_id.in.('+legacyGroups.join(',')+'),work_id.in.('+f.works.join(',')+'))':'group_id.eq.'+group;
}

// A rule set belongs to one request; no draft data or cross-request mutable cache.
export function createFieldRules(content,retired=[]){
 if(!Array.isArray(content)||content.length<1||content.length>200||!Array.isArray(retired))throw Error('invalid published field catalog');
 const current=new Set(),known=new Set(legacyGroups);
 for(const [rows,published] of [[content,true],[retired,false]])for(const f of rows){
  const value=f?.value,original=fieldData.fields.some(o=>o.id===value);
  if(!f||typeof value!=='string'||(!original&&!/^custom-[a-f0-9]{12}$/.test(value))||known.has(value)||('active' in f&&typeof f.active!=='boolean'))throw Error('invalid published field catalog');
  known.add(value);if(published&&f.active!==false)current.add(value);
 }
 const isKnown=group=>typeof group==='string'&&known.has(group);
 const canSelect=(group,existingGroup='')=>current.has(group)||(group===existingGroup&&isKnown(group));
 const workAllowed=(group,work)=>isKnown(group)&&acceptsWork(group,work);
 const filter=group=>{
  if(!isKnown(group))return null;
  const original=fieldData.fields.find(f=>f.id===group);
  return original?.works.length?'group_id.eq.'+group+',and(group_id.in.('+legacyGroups.join(',')+'),work_id.in.('+original.works.join(',')+'))':'group_id.eq.'+group;
 };
 return Object.freeze({isKnown,canSelect,acceptsWork:workAllowed,fieldFilter:filter});
}
