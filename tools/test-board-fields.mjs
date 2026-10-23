import assert from 'node:assert/strict';
import {groups,acceptsWork,fieldFilter} from '../supabase/functions/board-api/field-rules.mjs';
import data from '../supabase/functions/board-api/fields.json' with {type:'json'};
import services from '../data/service-fields.json' with {type:'json'};
assert.deepEqual(data.fields.map(f=>f.id),services.map(f=>f.value));
for(const f of data.fields){assert(groups.has(f.id));assert(acceptsWork(f.id,''));for(const id of f.works)assert(acceptsWork(f.id,id));assert(fieldFilter(f.id).includes('group_id.in.('));}
assert(acceptsWork('general','bath-fixture'));
assert(acceptsWork('욕실·설비','bath-ceiling'));
assert(!acceptsWork('도배','bath-ceiling'));
assert(!acceptsWork('욕실·설비','not-a-work'));
assert.equal(fieldFilter('general'),'group_id.eq.general');
assert.equal(fieldFilter('invalid,group'),null);
console.log('19 fields, work validation, legacy editing/filtering and invalid selections passed');
