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
