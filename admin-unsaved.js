/* Admin UI: fills only missing admin leave guards. No network/storage. */
(()=>{'use strict';if(document.body.dataset.technicianPage!=='admin'&&!(document.body.dataset.technicianPage==='detail'&&new URLSearchParams(location.search).get('admin')==='1'))return;const ask=window.confirm.bind(window),entries=[],baselines=new WeakMap();let locked=false;
const value=e=>e.type==='file'?Array.from(e.files||[]).map(f=>[f.name,f.size,f.lastModified].join(':')).join('|'):e.type==='checkbox'||e.type==='radio'?String(e.checked):e.value;
const scope='#reset-form,#admin-public-photos';
// Answer/status/photo captions already have their own existing guard.
const controls=()=>Array.from(document.querySelectorAll('#reset-form textarea,#reset-form input[type=checkbox],#public-photo-file,#admin-public-photos form input[type=checkbox]'));
function scan(){for(const e of controls())if(!baselines.has(e))baselines.set(e,value(e));}
function formDirty(){return controls().some(e=>baselines.has(e)&&value(e)!==baselines.get(e));}
function dirtyEntries(nativeOnly=false){if(locked)return[];return entries.filter(e=>(!nativeOnly||e.native)&&e.dirty());}
function clear(){for(const e of entries)e.discard();for(const c of controls())baselines.set(c,value(c));}
function notify(){if(locked)return;scan();for(const section of document.querySelectorAll(scope)){let hint=section.querySelector(':scope > .admin-unsaved-hint');const dirty=controls().filter(e=>section.contains(e)).some(e=>baselines.has(e)&&value(e)!==baselines.get(e));if(!hint&&!dirty)continue;if(!hint){hint=document.createElement('p');hint.className='hint admin-unsaved-hint';hint.setAttribute('role','status');section.append(hint);}const text=dirty?'저장하지 않은 변경이 있습니다. 이동하기 전에 해당 작업을 완료하거나 입력을 취소하세요.':'';if(hint.textContent!==text)hint.textContent=text;}}
function mayLeave(){return !dirtyEntries().length||ask('아직 저장하지 않은 변경이 있습니다. 이동하면 입력한 내용은 사라집니다. 저장하지 않고 이동할까요?');}
function onNavigate(event){if(locked||event.defaultPrevented||!(event.target instanceof Element))return;const link=event.target.closest('a[href]'),manual=event.target.closest('.admin-session-actions button,#admin-logout');if(!link&&!manual)return;if(link){if(link.hasAttribute('download')||(link.target&&link.target!=='_self'))return;const next=new URL(link.href,location.href);if(!['http:','https:'].includes(next.protocol))return;if(next.origin===location.origin&&next.pathname===location.pathname&&next.search===location.search)return;}if(!mayLeave()){event.preventDefault();event.stopImmediatePropagation();}else if(dirtyEntries().length)clear();}
window.YESSURI_UNSAVED=Object.freeze({register(label,dirty,discard=()=>{},native=true){entries.push({label,dirty,discard,native});}});
entries.push({label:'신청 답변·사진 입력',dirty:formDirty,discard:()=>{},native:true});
document.addEventListener('click',onNavigate,true);
window.addEventListener('beforeunload',e=>{if(dirtyEntries(true).length){e.preventDefault();e.returnValue='';}});
window.addEventListener('yessuri:admin-profile-switch-request',e=>{if(!locked&&formDirty()&&!mayLeave())e.preventDefault();});
document.addEventListener('input',notify);document.addEventListener('change',notify);
new MutationObserver(notify).observe(document.getElementById('root'),{childList:true,subtree:true});
window.addEventListener('yessuri:admin-locked',()=>{locked=true;entries.length=0;});scan();
})();
