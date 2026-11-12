'use strict';
const selectedSlide = Number(new URLSearchParams(location.search).get('slide')||1);
const form = document.getElementById('hero-form');
const statusBox = document.getElementById('status');
const reloadButton = document.getElementById('reload');
const reviewed = document.getElementById('reviewed');
const previewFrame = document.getElementById('preview-frame');
const config = window.YESSURI_TECHNICIAN;
const imageUrls = new Set();
const fields = ['badge','title1','title2','description1','description2','buttonText','buttonHref','alt'];
let state;
let images = {};
let dirty = false;
let busy = false;
let draftPreviewed = false;
let conflict = false;
let viewportWidth = 1440;
let locked = false;

function endpoint(path) {
    return config.endpoint + '?route=' + encodeURIComponent(path)+'&slide='+selectedSlide;
}
function headers() {
    let session;
    try { session = JSON.parse(sessionStorage.getItem('technician-admin') || 'null'); } catch { session = null; }
    return {apikey:config.publishableKey, 'x-admin-token':session?.token || ''};
}
function confirmAction(text) {
    const dialog = document.getElementById('confirm-dialog');
    document.getElementById('confirm-message').textContent = text;
    return new Promise(resolve => {
        const finish = value => {
            dialog.close();
            document.getElementById('confirm-ok').onclick = null;
            document.getElementById('confirm-cancel').onclick = null;
            dialog.oncancel = null;
            resolve(value);
        };
        document.getElementById('confirm-ok').onclick = () => finish(true);
        document.getElementById('confirm-cancel').onclick = () => finish(false);
        dialog.oncancel = event => { event.preventDefault(); finish(false); };
        dialog.showModal();
        document.getElementById('confirm-cancel').focus();
    });
}

function message(text, error = false) {
    statusBox.textContent = text;
    statusBox.classList.toggle('error', error);if(error)window.YESSURI_SAVE_RESULT?.uncertain(text);
}
function controls() {
    window.YESSURI_PHOTO_CHECK?.update({state,dirty,busy});
    window.YESSURI_RESTORE_COMPARE?.status({dirty,busy});
    window.YESSURI_PHOTO_USAGE?.hero(selectedSlide);
    window.YESSURI_SAVE_RESULT?.update({state,dirty,busy});
    if (locked) return;
    window.dispatchEvent(new Event('yessuri:hero-controls'));
    document.getElementById('slide-select').disabled = busy;
    form.querySelectorAll('input,button').forEach(control => { control.disabled = busy || locked; });
    document.getElementById('preview-published').disabled = busy || !state;
    document.querySelectorAll('.viewport-button').forEach(button => { button.disabled = busy || !state; });
    reviewed.disabled = busy || dirty || !draftPreviewed || conflict;
    document.getElementById('publish').disabled = busy || dirty || !draftPreviewed || !reviewed.checked || conflict;
    document.getElementById('save').disabled = busy || conflict || !state;
    document.getElementById('preview-draft').disabled = busy || !state || conflict;
    document.querySelectorAll('[data-restore]').forEach(button => { button.disabled = busy || dirty || conflict; });
    window.YESSURI_HERO_HISTORY?.controls();
    document.getElementById('dirty-state').textContent = dirty ? '저장하지 않은 변경' : '수정 내용 저장됨';
    window.YESSURI_PUBLISH_COMPARE?.update({kind:'hero',state,dirty,busy,imageSource});
}
function changed() {
    dirty = true;
    draftPreviewed = false;
    reviewed.checked = false;
    controls();
}
async function apiRequest(path, data) {
    if(data&&['/api/draft','/api/publish','/api/restore'].includes(path))window.YESSURI_SAVE_RESULT?.begin(path.slice(5));
    if (locked) throw new Error('관리자 화면이 잠겼습니다. 다시 로그인하세요.');
    const route = path === '/api/state' ? '/api/admin/hero' : path.replace('/api/', '/api/admin/hero/');
    const response = await fetch(endpoint(route), {
        method:data ? 'POST' : 'GET',credentials:'omit',cache:'no-store',
        headers:{...headers(),...(data ? {'Content-Type':'application/json'} : {})},
        body:data ? JSON.stringify(data) : undefined,
    });
    const result = await response.json();
    if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
            throw Object.assign(new Error('관리자 로그인이 만료되었거나 권한이 없습니다. 관리자 첫 화면에서 다시 로그인하세요.'),{status:response.status});
        }
        if (response.status === 409) {
            conflict = true;
            reloadButton.hidden = false;
            throw Object.assign(new Error('다른 창에서 내용이 바뀌었습니다. 입력 내용은 유지되어 있습니다. 최신 상태를 불러오기 전에 필요한 내용을 복사하세요.'),{status:response.status});
        }
        throw Object.assign(new Error(result.error || result.message || '요청을 처리하지 못했습니다.'),{status:response.status});
    }
    if (locked) throw new Error('관리자 화면이 잠겼습니다. 다시 로그인하세요.');
    return result;
}
async function imageSource(path) {
    if (!path.startsWith('/api/hero-images/')) return path.replace(/^\//,'');
    const response = await fetch(endpoint(path.replace('/api/hero-images/','/api/admin/hero/images/')), {headers:headers(),credentials:'omit',cache:'no-store'});
    if (!response.ok) throw new Error('사진을 불러오지 못했습니다.');
    const url = URL.createObjectURL(await response.blob());
    if (locked) { URL.revokeObjectURL(url); throw new Error('관리자 화면이 잠겼습니다.'); }
    imageUrls.add(url);
    return url;
}
function updateThumbnails() {
    if (locked) return;
    for (const url of imageUrls) URL.revokeObjectURL(url);
    imageUrls.clear();
    ['desktop','mobile'].forEach(async kind => {
        const path = images[kind + 'Image'];
        const image = document.getElementById(kind + '-thumb');
        const label = document.getElementById(kind + '-name');
        if (!image || !label) return;
        image.removeAttribute('src');
        try {
            const source = await imageSource(path);
            if (locked) return;
            image.src = source;
        } catch {
            if (locked) return;
            image.alt = '사진을 불러오지 못했습니다.';
        }
        label.textContent = path.split('/').pop();
    });
}
function history() {
    const list = document.getElementById('history');
    list.replaceChildren();
    (window.YESSURI_HERO_HISTORY?.select(state.revisions) || state.revisions.slice().sort((a,b)=>b.version-a.version).slice(0,5)).forEach(revision => {
        const item = document.createElement('li');
        const content = document.createElement('div');
        const title = document.createElement('strong');
        title.textContent = revision.content.title1 + ' ' + revision.content.title2;
        const detail = document.createElement('div');
        detail.className = 'history-detail';
        const date = new Date(revision.createdAt);
        const action = {original:'원본 보존',publish:'게시',restore:'이전 버전 복원'}[revision.action] || revision.action || '게시 기록';
        detail.textContent = (Number.isNaN(date.getTime()) ? '' : date.toLocaleString('ko-KR', {timeZone:'Asia/Seoul'})) + ' · ' + action;
        content.append(title,detail);
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'secondary';
        button.dataset.restore = revision.id;
        button.textContent = '이 내용으로 복원';
        button.addEventListener('click', () => restore(revision.id));
        const actions=document.createElement('div');actions.className='hero-history-actions';actions.append(button);window.YESSURI_HERO_HISTORY?.decorate(actions,revision);item.append(content,actions);window.YESSURI_RESTORE_COMPARE?.mount({host:item,kind:"hero",state,revision,imageSource});
        list.append(item);
    });
    document.getElementById('version-label').textContent = '현재 버전 ' + state.version;
}
function fill() {
    window.YESSURI_PUBLISH_COMPARE?.invalidate();
    if (locked) return;
    fields.forEach(name => { form.elements[name].value = state.draft[name]; });
    images = {desktopImage:state.draft.desktopImage,mobileImage:state.draft.mobileImage};
    window.YESSURI_TEXT_COLORS_ADMIN?.fill({kind:'hero',content:state.draft,onChange:changed});
    updateThumbnails();
    dirty = false;
    conflict = false;
    reviewed.checked = false;
    draftPreviewed = false;
    reloadButton.hidden = true;
    history();
}
function content() {
    const result=Object.fromEntries([...fields.map(name => [name,form.elements[name].value.trim()]), ...Object.entries(images)]);const colors=window.YESSURI_TEXT_COLORS_ADMIN?.read()||{};if(Object.keys(colors).length)result.textColors=colors;return result;
}
function preview(mode) {
    if (locked) return;
    previewFrame.src = 'hero-preview.html?slide='+selectedSlide+'&mode=' + mode + '&v=' + state.version;
    document.getElementById('open-preview').dataset.previewUrl = 'hero-preview.html?slide='+selectedSlide+'&mode=' + mode;
    document.getElementById('preview-mode').textContent = mode === 'draft' ? '저장한 수정 내용' : '현재 게시본';
    const previewHelp = document.getElementById('preview-help');
    previewHelp.hidden = mode !== 'draft';
    previewHelp.textContent = '저장한 수정 내용입니다. PC와 휴대폰 버튼으로 화면을 확인한 뒤 아래 확인란을 선택하세요.';
    draftPreviewed = mode === 'draft' && !dirty;
    reviewed.checked = false;
    controls();
}
async function load() {
    busy = true;
    controls();
    try {
        const next = await api('/api/state');
        if (locked) return;
        state = next;
        fill();
        preview('published');
        message('');
    } catch (error) { message(error.message,true); }
    finally { busy = false; controls(); }
}
form.addEventListener('input', event => {
    if (event.target.id !== 'slide-select') changed();
});
function openPhotoDescription() {
    document.getElementById('hero-photo-description').open = true;
}

document.getElementById('alt').addEventListener('invalid', openPhotoDescription);

document.getElementById('buttonHref').addEventListener('invalid', () => {
    document.getElementById('hero-link-settings').open = true;
});

form.addEventListener('submit', async event => {
    event.preventDefault();
    if (!form.reportValidity()) return;
    try{window.YESSURI_TEXT_COLORS_ADMIN?.read();}catch(e){message(e.message,true);return;}
    busy = true;
    controls();
    try {
        const next = await api('/api/draft', {content:content(),version:state.version});
        if (locked) return;
        state = next;
        fill();
        window.YESSURI_SAVE_RESULT?.success('draft',state.version);message('수정 내용을 저장했습니다. 이번 저장으로 홈페이지는 바뀌지 않았습니다. 미리보기·변경 비교 후 게시하세요.');
    } catch (error) { message(error.message,true); }
    finally { busy = false; controls(); }
});
document.querySelectorAll('[data-image-field]').forEach(input => {
    input.addEventListener('change', async () => {
        const file = input.files[0];
        if (!file) return;
        if (!['image/jpeg','image/png','image/webp'].includes(file.type) || file.size > 5 * 1024 * 1024) {
            message('JPG·PNG·WebP 형식의 5MB 이하 사진을 선택하세요.',true);
            input.value = '';
            return;
        }
        busy = true;
        controls();
        try {
            const photo = await prepareHeroPhoto(file);
            const result = await api('/api/image', {photo});
            if (locked) return;
            images[input.dataset.imageField] = result.path;
            openPhotoDescription();
            updateThumbnails();
            changed();
            message('사진을 준비했습니다. 수정 내용 저장 후 미리보기에서 확인하세요.');
        } catch (error) { message('사진을 준비하지 못했습니다. 정상적인 이미지 파일인지 확인하세요. ' + error.message,true); }
        finally { input.value = ''; busy = false; controls(); }
    });
});
document.getElementById('preview-draft').addEventListener('click', () => {
    preview('draft');
    if (dirty) message('미리보기에는 마지막으로 저장한 수정 내용이 표시됩니다. 현재 입력을 반영하려면 먼저 수정 내용을 저장하세요.');
});
document.getElementById('open-preview').addEventListener('click', event => {
    if (!locked) window.open(event.currentTarget.dataset.previewUrl, '_blank', 'noopener');
});
document.getElementById('preview-published').addEventListener('click', () => preview('published'));
function fitPreview() {
    if (locked) return;
    const container = document.querySelector('.frame-scroll');
    if (!container) return;
    const scale = Math.min(1,container.clientWidth / viewportWidth);
    previewFrame.style.width = viewportWidth + 'px';
    previewFrame.style.transform = 'scale(' + scale + ')';
    container.style.height = Math.ceil(900 * scale) + 'px';
}
document.querySelectorAll('.viewport-button').forEach(button => button.addEventListener('click', () => {
    viewportWidth = Number(button.dataset.width);
    fitPreview();
    document.querySelectorAll('.viewport-button').forEach(item => item.setAttribute('aria-pressed', String(item === button)));
}));
new ResizeObserver(fitPreview).observe(document.querySelector('.frame-scroll'));
reviewed.addEventListener('change', controls);
document.getElementById('publish').addEventListener('click', async () => {
    if (!await confirmAction('확인한 수정 내용을 예스수리 홈페이지에 게시할까요?')) return;
    busy = true;
    controls();
    try {
        const next = await api('/api/publish',{version:state.version});
        if (locked) return;
        state = next;
        fill();
        preview('published');
        window.YESSURI_SAVE_RESULT?.success('publish',state.version);message('홈페이지 공개가 완료됐습니다. 저장한 수정 내용이 홈페이지에 반영됐습니다.');
    } catch (error) { message(error.message,true); }
    finally { busy = false; controls(); }
});
async function restore(id) {
    if (!await confirmAction('선택한 기록으로 홈페이지를 복원할까요? 저장한 수정 내용도 복원한 내용으로 바뀝니다.')) return;
    busy = true;
    controls();
    try {
        const next = await api('/api/restore',{revisionId:id,version:state.version});
        if (locked) return;
        state = next;
        fill();
        preview('published');
        window.YESSURI_SAVE_RESULT?.success('restore',state.version);message('이전 버전으로 공개 내용을 복원했습니다. 홈페이지와 수정 내용이 선택한 기록으로 바뀌었습니다.');
    } catch (error) { message(error.message,true); }
    finally { busy = false; controls(); }
}
reloadButton.addEventListener('click', async () => {
    if (!dirty || await confirmAction('입력 중인 변경을 버리고 최신 상태를 불러올까요?')) load();
});
window.addEventListener('beforeunload', event => {
    if (dirty) { event.preventDefault(); event.returnValue = ''; }
});
window.addEventListener('yessuri:admin-locked', () => {
    locked = true;
    for (const url of imageUrls) URL.revokeObjectURL(url);
    imageUrls.clear();
    previewFrame.src = 'about:blank';
    state = null;
    images = {};
    dirty = false;
    document.getElementById('confirm-dialog').close();
});
async function start() {
    document.getElementById('root').hidden = true;
    try {
        const response = await fetch(endpoint('/api/session'), {headers:headers(),credentials:'omit',cache:'no-store'});
        const session = await response.json();
        if (!response.ok || !session.admin) throw Object.assign(new Error(),{status:response.ok?401:response.status});
        document.getElementById('root').hidden = false;
        await load();
    } catch (error) {
        if (locked) return;
        const root = document.getElementById('root');
        root.replaceChildren();
        const heading = document.createElement('h1');
        const needsAuth=error?.status===401||error?.status===403;
        heading.textContent = needsAuth?'관리자 로그인이 필요합니다.':'관리자 연결을 확인해 주세요.';
        const link = document.createElement('a');
        link.href = 'technician-admin.html';
        link.textContent = needsAuth?'관리자 첫 화면에서 로그인':'관리자 첫 화면에서 다시 확인';
        root.append(heading,link);
        root.hidden = false;
        window.YESSURI_ERROR_HELP?.report(error,{route:'state'});
    }
}
start();

const slideSelector=document.getElementById('slide-select');
slideSelector.value=String(selectedSlide);
slideSelector.addEventListener('change',async()=>{
 const target=slideSelector.value;
 slideSelector.value=String(selectedSlide);
 if(dirty && !await confirmAction('저장하지 않은 변경을 버리고 다른 히어로로 이동할까요?')) return;
 if(locked) return;
 dirty=false;location.href='hero-admin.html?slide='+target;
});

window.YESSURI_UNSAVED?.register('편집 중인 수정 내용',()=>dirty,()=>{dirty=false;},false);

// Preserve request/auth/command behavior; add typed display-only recovery help.
async function api(...args){try{const result=await apiRequest(...args);window.YESSURI_ERROR_HELP?.clear();return result;}catch(error){window.YESSURI_ERROR_HELP?.report(error,{route:args[0]});throw error;}}

async function prepareHeroPhoto(file) {
            const bitmap = await createImageBitmap(file);
            const canvas = document.createElement('canvas');
            const scale = Math.min(1,1280 / Math.max(bitmap.width,bitmap.height));
            canvas.width = Math.max(1,Math.round(bitmap.width * scale));
            canvas.height = Math.max(1,Math.round(bitmap.height * scale));
            const ctx = canvas.getContext('2d');
            ctx.fillStyle = '#fff';
            ctx.fillRect(0,0,canvas.width,canvas.height);
            ctx.drawImage(bitmap,0,0,canvas.width,canvas.height);
            bitmap.close();
            let quality = .82;
            let blob;
            do {
                blob = await new Promise(resolve => canvas.toBlob(resolve,'image/jpeg',quality));
                quality -= .12;
            } while (blob?.size > 1048576 && quality > .2);
            if (!blob || blob.size > 1048576) throw new Error('사진 크기를 줄여 다시 선택하세요.');
            const dataUrl = await new Promise((resolve,reject) => {
                const reader = new FileReader();
                reader.onload = () => resolve(reader.result);
                reader.onerror = () => reject(new Error('사진을 읽지 못했습니다.'));
                reader.readAsDataURL(blob);
            });
    return {type:'image/jpeg',data:dataUrl.split(',')[1]};
}
