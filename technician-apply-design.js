(() => {
 const enhance=window.YESSURI_TECHNICIAN_APPLY_FORM;
 window.YESSURI_TECHNICIAN_APPLY_FORM=()=>{
 enhance?.();
 if(document.querySelector('.design-privacy'))return;
 const form=document.querySelector('#application-form');if(!form)return;
 if(!new URLSearchParams(location.search).has('id'))document.querySelector('.page-title h1').textContent='기술자 사전 등록 신청';
 if(!new URLSearchParams(location.search).has('id'))document.querySelector('.page-title p').textContent='2027년 정식 오픈을 목표로 준비 중입니다. 명함이 없는 개인 기술자도 신청할 수 있습니다.';
 const aside=document.querySelector('.layout>.aside');
 const info=document.createElement('div');info.className='design-privacy';
 info.innerHTML='<strong>신청 내용과 사진은 비공개로 접수됩니다.</strong><p>등록 신청 목록에서 본인 글과 비밀번호로 확인·수정할 수 있습니다. 공개 프로필은 별도 확인 후 등록합니다. 자동 문자·이메일 알림은 없습니다.</p>';
 document.querySelector('.tabs').after(info);aside.hidden=true;
 const note=form.querySelector('#t-areaNotes');const box=document.createElement('div');box.className='field design-area-note';
 const label=note.previousElementSibling,help=note.nextElementSibling;
 box.append(label,note,help);form.querySelector('.section:nth-of-type(2) .fields').append(box);
 for(const [id,text] of [['service-field-title','전문 분야'],['service-area-title','출장 가능 지역']]){
  const label=document.getElementById(id);if(label){const req=label.querySelector('.required');label.replaceChildren(document.createTextNode(text+' '));if(req)label.append(req);}
 }
 };
})();
