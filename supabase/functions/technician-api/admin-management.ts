import {profileFromReview} from './public-profile.ts';

// Consent dates are business dates in Korea, not the UTC calendar day.
export function koreanBusinessDate(timestamp=Date.now()) {
 return new Date(timestamp+9*60*60*1000).toISOString().slice(0,10);
}

// No credentials, applicant bodies, or photo bytes are copied into audit events.
export function reviewedManagement(input:Record<string,any>,id:string) {
 const actions=['create','update','hide','restore','withdraw'];
 if(!actions.includes(input.action))throw Error('관리 작업을 확인해 주세요.');
 const result:Record<string,unknown>={action:input.action,expectedVersion:input.version??'none'};
 if(['create','update','restore'].includes(input.action)){
  const c=input.consent;
  if(!c||!Array.isArray(c.scope)||!c.scope.includes('profile')||c.scope.some((s:any)=>!['profile','phone','photos'].includes(s)))throw Error('공개 동의 범위를 확인해 주세요.');
  if(typeof c.confirmedAt!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(c.confirmedAt)||!Number.isFinite(Date.parse(c.confirmedAt+'T00:00:00Z'))||new Date(c.confirmedAt+'T00:00:00Z').toISOString().slice(0,10)!==c.confirmedAt||c.confirmedAt>koreanBusinessDate())throw Error('동의 확인일을 확인해 주세요.');
  if(typeof c.evidence!=='string'||c.evidence.trim().length<3||c.evidence.length>200||typeof(c.note??'')!=='string'||(c.note||'').length>500)throw Error('동의 근거 식별자와 메모를 확인해 주세요.');
  if(input.phonePublic===true&&!c.scope.includes('phone'))throw Error('연락처 공개 동의를 별도로 확인해 주세요.');
  result.profile=profileFromReview({...input,publicConsent:true},id);
  result.consent={scope:[...new Set(c.scope)],confirmedAt:c.confirmedAt,evidence:c.evidence.trim(),note:(c.note||'').trim()};
 }
 return result;
}

export async function managementRpc(db:any,hash:string,op:string,p:Record<string,unknown>={}){
 const {data,error}=await db.rpc('technician_admin_management',{op,p:{...p,hash}});
 if(error){
  if(error.message.includes('permission denied'))throw Object.assign(Error('관리자 로그인이 필요합니다.'),{status:403});
  if(error.message.includes('version conflict'))throw Object.assign(Error('공개 정보가 변경되었습니다. 새로고침 후 다시 확인해 주세요.'),{status:409});
  if(error.message.includes('not found'))throw Object.assign(Error('대상 신청 또는 프로필을 찾지 못했습니다.'),{status:404});
  if(error.message.includes('invalid photo consent'))throw Object.assign(Error('기존 사진도 다시 공개됩니다. 사진 공개 동의를 확인해 주세요.'),{status:400});
  if(error.message.includes('invalid consent'))throw Object.assign(Error('동의 확인일·공개 범위·근거를 확인해 주세요.'),{status:400});
  if(error.message.includes('invalid profile'))throw Object.assign(Error('공개 업체 정보와 전문 분야·지역을 확인해 주세요.'),{status:400});
  throw Error('관리자 기록을 처리하지 못했습니다. 변경 결과를 다시 확인해 주세요.');
 }
 return data;
}
