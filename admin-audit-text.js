/* Display-only interpretation of existing audit records. No network or storage. */
(() => {
 'use strict';
 const labels={login:'관리자 로그인',logout:'관리자 로그아웃','login-failure':'로그인 실패','access-denied':'접근 권한 확인 실패','session-expired':'로그인 시간 만료','request-failure':'관리 작업 요청 실패','request-rejected':'관리 작업 요청 거부','profile-create':'업체 공개 등록','profile-update':'공개 업체 정보 수정','profile-hide':'업체 일시 비공개','profile-restore':'업체 다시 공개','profile-withdraw':'업체 공개 철회','photo-upload':'공개 사진 추가','photo-select':'대표 이미지 변경','photo-replace':'공개 사진 교체','photo-delete':'공개 사진 삭제','photo-edit':'공개 사진 설명 수정','photo-reorder':'공개 사진 순서 변경','representative-image':'신청 사진을 대표 이미지로 등록','work-case-save':'작업 사례 저장','work-case-delete':'작업 사례 삭제','application-update':'신청 상태·답변 저장','view-application':'신청 내용 확인','password-reset':'신청자 비밀번호 재설정','public-photo-upload':'공개 사진 추가','public-photo-select':'대표 이미지 변경','public-photo-delete':'공개 사진 삭제','public-photo-edit':'공개 사진 설명 저장','public-photo-reorder':'공개 사진 순서 변경','public-photo-replace':'공개 사진 교체','hero-image-upload':'관리용 이미지 업로드','hero-draft-save':'히어로 초안 저장','hero-publish':'히어로 게시','hero-restore':'히어로 이전 버전 복원','field-draft-save':'수리 분야 초안 저장','field-publish':'수리 분야 게시','field-restore':'수리 분야 이전 버전 복원'};
 const sentences={login:'관리자가 로그인했습니다',logout:'관리자가 로그아웃했습니다','profile-create':'업체 소개를 공개 등록했습니다','profile-update':'공개 업체 정보를 수정했습니다','profile-hide':'업체 소개를 일시 비공개로 바꿨습니다','profile-restore':'업체 소개를 다시 공개했습니다','profile-withdraw':'업체 소개의 공개를 철회했습니다','application-update':'신청 상태·답변을 저장했습니다','view-application':'신청 내용을 확인했습니다','hero-image-upload':'관리용 이미지를 업로드했습니다','hero-draft-save':'메인 히어로 초안을 저장했습니다','hero-publish':'메인 히어로를 게시했습니다','hero-restore':'메인 히어로를 이전 버전으로 복원했습니다','field-draft-save':'수리 분야 초안을 저장했습니다','field-publish':'메인 수리 분야 설정을 게시했습니다','field-restore':'메인 수리 분야 설정을 이전 버전으로 복원했습니다'};
 const uuid=/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
 function key(event){if(event.target==='service-fields'&&['hero-draft-save','hero-publish','hero-restore'].includes(event.action))return event.action.replace('hero-','field-');return Object.hasOwn(labels,event.action)?event.action:'unclassified';}
 function actor(event){const id=event.operatorId||event.admin_id;return typeof id==='string'&&uuid.test(id)?'관리자 계정 · 끝 8자리 '+id.slice(-8):'관리자 확인 필요';}
 function target(event,k){const t=event.target;
  if(k==='hero-image-upload')return '관리용 이미지 보관 영역';
  if(t==='service-fields')return '메인 수리 분야 설정';
  if(['hero','hero-2','hero-3'].includes(t))return {'hero':'메인 히어로 1번 · 집수리','hero-2':'메인 히어로 2번 · 인테리어','hero-3':'메인 히어로 3번 · 수리·설치'}[t];
  if(t==='session')return '관리자 접속';if(t==='security')return '로그인·접근 권한';if(t==='admin-request')return '관리자 작업 요청';
  if(typeof t==='string'){
   const id=t.startsWith('technician-')?t.slice(11):t;
   if(uuid.test(id)){const profile=t.startsWith('technician-')||/^(profile-|photo-|public-photo-|work-case-|representative-image)/.test(k);return(profile?'업체 프로필':'신청서')+' · 끝 8자리 '+id.slice(-8);}
  }
  return '대상 확인 필요';
 }
 function context(k){
  if(k==='hero-draft-save'||k==='field-draft-save')return '초안 저장만으로 홈페이지에 공개되지는 않습니다.';
  if(k==='hero-publish'||k==='field-publish')return '홈페이지에 게시한 기록입니다. 지금의 내용은 해당 관리 화면에서 확인하세요.';
  if(k==='hero-restore')return '히어로 내용의 복원 기록이며 사이트 전체나 DB 전체를 복원한 것은 아닙니다.';
  if(k==='field-restore')return '수리 분야 설정의 복원 기록이며 실제 신청·업체 정보를 되돌린 것은 아닙니다.';
  if(k==='hero-image-upload')return '이미지를 보관한 기록입니다. 어느 화면에 게시됐는지는 이 기록만으로 확인할 수 없습니다.';
  if(k==='application-update')return '신청 검토 기록입니다. 이 작업만으로 업체 소개가 공개되지는 않습니다.';
  if(k==='profile-hide'||k==='profile-withdraw')return '업체 소개를 숨기거나 공개를 철회한 기록이며 신청서 삭제를 뜻하지 않습니다.';
  if(k==='profile-update')return '어떤 항목의 전후 값이 바뀌었는지는 현재 기록만으로 확인할 수 없습니다.';
  if(k==='login'||k==='logout'||k==='view-application')return '접속·조회 기록이며 이 작업 자체가 신청·업체 정보 수정은 아닙니다.';
  return '현재 상태는 해당 관리 화면에서 확인하세요. 이력은 되돌리기 기능이 아닙니다.';
 }
 function describe(event){
  const k=key(event),ok=event.outcome==='success',failed=event.outcome==='failure';
  const result=ok?'처리 완료':failed?'처리 실패':'결과 확인 필요';
  let title,detail;
  if(k==='unclassified'){title='작업 내용을 확인해야 합니다';detail='현재 분류되지 않은 기록입니다. 작업 종류와 처리 결과를 확인해 주세요.';}
  else if(failed){title=labels[k]+' 요청에 실패했습니다';if(k==='login-failure')title='로그인에 실패했습니다';if(k==='access-denied')title='관리자 접근 권한을 확인하지 못했습니다';detail='실패 기록만으로 변경이 전혀 없었다고 단정하지 않습니다. 현재 상태를 먼저 확인하세요.';}
  else if(ok){title=sentences[k]||labels[k]+' 작업을 처리했습니다';detail=context(k);}
  else{title=labels[k]+' · 결과 확인 필요';detail='성공 여부가 명확하지 않습니다. 현재 상태와 처리 결과를 확인하세요.';}
  return {key:k,actor:actor(event),target:target(event,k),title,detail,result,resultClass:ok?'success':failed?'failure':'unknown'};
 }
 window.YESSURI_AUDIT_TEXT=Object.freeze({key,describe,actionNames:Object.freeze({...labels,unclassified:'분류 확인이 필요한 기록'})});
})();
