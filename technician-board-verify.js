/* Verify one selected application directly on the board; never search by password alone. */
(() => {
 'use strict';
 function bind(list,api){
  if(list.dataset.passwordVerifyBound)return;
  list.dataset.passwordVerifyBound='true';
  list.addEventListener('click',event=>{
   const link=event.target.closest('a.title-link');
   if(!link||!list.contains(link)||event.button||event.ctrlKey||event.metaKey||event.shiftKey||event.altKey)return;
   const url=new URL(link.href,location.href),id=url.searchParams.get('id');
   if(url.origin!==location.origin||!id||!/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(id))return;
   event.preventDefault();
   if(document.getElementById('board-password-dialog'))return;
   const dialog=document.createElement('dialog');dialog.id='board-password-dialog';
   dialog.setAttribute('aria-labelledby','board-password-title');
   dialog.setAttribute('aria-describedby','board-password-description');
   dialog.innerHTML='<form><h2 id="board-password-title">내 신청 확인</h2><p id="board-password-description">신청할 때 설정한 비밀번호를 입력해 주세요.</p><label class="field" for="board-password">비밀번호<input id="board-password" name="password" type="password" autocomplete="current-password" required maxlength="128"></label><p class="error" role="alert" id="board-password-error"></p><div class="actions"><button class="btn" type="button" data-cancel>취소하기</button><button class="btn primary" type="submit">내 신청 확인</button></div></form>';
   document.body.append(dialog);
   const form=dialog.querySelector('form'),password=dialog.querySelector('input'),error=dialog.querySelector('[role="alert"]');
   const controls=[...form.querySelectorAll('input,button')];let busy=false;
   dialog.querySelector('[data-cancel]').onclick=()=>dialog.close();
   dialog.addEventListener('close',()=>{password.value='';dialog.remove();if(link.isConnected)link.focus({preventScroll:true});});
   form.onsubmit=async submit=>{
    submit.preventDefault();if(busy)return;
    busy=true;error.textContent='';const value=password.value;password.value='';controls.forEach(control=>control.disabled=true);
    try{
     const result=await api('verify',{id,password:value});
     if(!dialog.open)return;
     if(result.id!==id)throw Error('신청 정보를 다시 확인해 주세요.');
     location.href='technician-detail.html?id='+encodeURIComponent(result.id);
    }catch(err){if(dialog.open){error.textContent=err.message;error.tabIndex=-1;error.focus();}}
    finally{busy=false;controls.forEach(control=>control.disabled=false);}
   };
   dialog.showModal();password.focus();
  });
 }
 window.YESSURI_TECHNICIAN_BOARD_VERIFY={bind};
})();
