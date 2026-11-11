/* Photo destinations only. Reuses loaded case data; no network/storage/mutations. */
(()=>{'use strict';if(document.body.dataset.technicianPage!=='admin'&&!(document.body.dataset.technicianPage==='detail'&&new URLSearchParams(location.search).get('admin')==='1'))return;let locked=false,active=null;const cases=new Map();const el=(tag,text)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;return n;};
function note(host,kind){if(locked||!host)return null;let n=Array.from(host.children).find(c=>c.classList.contains('photo-use-note')&&c.dataset.kind===kind);if(!n){n=el('div');n.className='photo-use-note';n.dataset.kind=kind;n.setAttribute('aria-label','사진 사용 위치');host.append(n);}return n;}
function hero(slot) {
  if (locked || ![1, 2, 3].includes(Number(slot))) return;
  const usage = document.getElementById('hero-photo-usage');
  if (!usage) return;
  usage.textContent = '예스수리 메인 ' + slot + '번째 히어로의 PC·휴대폰 화면에 사용됩니다. 수정 내용을 저장한 뒤 게시하면 새 사진이 반영됩니다.';
}
function field(host){const n=note(host,'field');if(n)n.textContent='사용 위치: 메인 ‘어떤 수리가 필요하세요?’ 분야 박스의 아이콘입니다. 변경은 게시 후 반영되며 검색·등록 신청의 분야 연결은 유지됩니다.';}
function privatePhoto(figure){
  const gallery=figure?.closest('.file-grid');
  if(locked||!gallery||gallery.previousElementSibling?.matches('.photo-use-note[data-kind="private"]'))return;
  const details=el('details');
  details.className='photo-use-note';
  details.dataset.kind='private';
  details.append(
    el('summary','대표 이미지 사용 안내'),
    el('p','첨부사진은 비공개입니다. ‘대표 이미지로 등록’하면 선택한 사진이 메인·전문가 찾기 카드와 업체 소개에 공개됩니다. 신청서 원본 사진은 그대로 유지됩니다.')
  );
  gallery.before(details);
}
function publicIntro(host){const n=note(host,'intro');if(n){n.textContent='업체가 공개 상태일 때의 사용 위치입니다. 대표 사진은 메인·전문가 찾기 카드에도 쓰이며, 실제 목록 표시는 공개 상태·검색 조건에 따릅니다.';host.querySelector('h2')?.nextElementSibling?.after(n);}}
function selectProfile(id){if(locked)return;if(active!==id){active=id;cases.clear();}}
function renderPublic(n){if(locked)return;n.replaceChildren();const rep=n.dataset.representative==='true';n.append(el('strong',rep?'대표 사진':'작업 사진'));n.append(el('p',rep?'공개 시: 업체 카드 · 업체 소개 대표 사진':'공개 시: 업체 소개 → 작업 사진'));const loaded=cases.get(n.dataset.profile);if(!loaded){n.append(el('p','사례 연결은 아직 확인되지 않았습니다.'));return;}const linked=loaded.filter(c=>(c.photos||[]).some(p=>p?.image===n.dataset.image));if(!linked.length){n.append(el('p','사례 연결: 불러온 자료에는 없음.'));return;}const d=el('details'),s=el('summary','불러온 사례 '+linked.length+'건 · 제목 보기'),list=el('ul');for(const c of linked)list.append(el('li',c.title||'제목 없는 작업 사례'));d.append(s,list);n.append(d);if(rep)n.append(el('p','작업 사례에 선택되어 있어도 현재 대표 사진은 사례 사진 목록에서 제외됩니다.'));}
function publicPhoto(host,{profile,image,representative}){const n=note(host,'public');if(!n)return;n.dataset.profile=profile;n.dataset.image=image;n.dataset.representative=String(representative);renderPublic(n);}
function setCases(id,data){if(locked||id!==active||!Array.isArray(data))return;cases.set(id,data.map(c=>({title:c.title,photos:(c.photos||[]).map(p=>({image:p?.image}))})));for(const n of document.querySelectorAll('.photo-use-note[data-kind=public]'))if(n.dataset.profile===id)renderPublic(n);}
function workCase(host,title){const n=note(host,'case');if(n)n.textContent=('사용 위치: 공개 업체 소개의 작업 사례 ‘'+(title||'제목 없음')+'’ 사진 목록. 현재 대표 사진은 사례 사진 목록에서 제외됩니다.');}
window.YESSURI_PHOTO_USAGE=Object.freeze({hero,field,privatePhoto,publicIntro,selectProfile,publicPhoto,setCases,workCase});addEventListener('yessuri:admin-profile-switch',()=>{active=null;cases.clear();});addEventListener('yessuri:admin-locked',()=>{locked=true;active=null;cases.clear();document.querySelectorAll('.photo-use-note').forEach(n=>n.remove());});
})();
