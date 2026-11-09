'use strict';
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
    return config.endpoint + '?route=' + encodeURIComponent(path);
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
    statusBox.classList.toggle('error', error);
}
function controls() {
    form.querySelectorAll('input,button').forEach(control => { control.disabled = busy || locked; });
    document.getElementById('preview-published').disabled = busy || !state;
    document.querySelectorAll('.viewport-button').forEach(button => { button.disabled = busy || !state; });
    reviewed.disabled = busy || dirty || !draftPreviewed || conflict;
    document.getElementById('publish').disabled = busy || dirty || !draftPreviewed || !reviewed.checked || conflict;
    document.getElementById('save').disabled = busy || conflict || !state;
    document.getElementById('preview-draft').disabled = busy || !state || conflict;
    document.querySelectorAll('[data-restore]').forEach(button => { button.disabled = busy || dirty || conflict; });
    document.getElementById('dirty-state').textContent = dirty ? '저장하지 않은 변경' : '초안 저장됨';
}
function changed() {
    dirty = true;
    draftPreviewed = false;
    reviewed.checked = false;
    controls();
}
async function api(path, data) {
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
            throw new Error('관리자 로그인이 만료되었거나 권한이 없습니다. 관리자 첫 화면에서 다시 로그인하세요.');
        }
        if (response.status === 409) {
            conflict = true;
            reloadButton.hidden = false;
            throw new Error('다른 창에서 내용이 바뀌었습니다. 입력 내용은 유지되어 있습니다. 최신 상태를 불러오기 전에 필요한 내용을 복사하세요.');
        }
        throw new Error(result.error || result.message || '요청을 처리하지 못했습니다.');
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
    for (const url of imageUrls) URL.revokeObjectURL(url);
    imageUrls.clear();
    ['desktop','mobile'].forEach(async kind => {
        const path = images[kind + 'Image'];
        const image = document.getElementById(kind + '-thumb');
        image.removeAttribute('src');
        try { image.src = await imageSource(path); } catch { image.alt = '사진을 불러오지 못했습니다.'; }
        document.getElementById(kind + '-name').textContent = path.split('/').pop();
    });
}
function history() {
    const list = document.getElementById('history');
    list.replaceChildren();
    state.revisions.slice().reverse().forEach(revision => {
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
        item.append(content,button);
        list.append(item);
    });
    document.getElementById('version-label').textContent = '현재 버전 ' + state.version;
}
function fill() {
    fields.forEach(name => { form.elements[name].value = state.draft[name]; });
    images = {desktopImage:state.draft.desktopImage,mobileImage:state.draft.mobileImage};
    updateThumbnails();
    dirty = false;
    conflict = false;
    reviewed.checked = false;
    draftPreviewed = false;
    reloadButton.hidden = true;
    history();
}
function content() {
    return Object.fromEntries([...fields.map(name => [name,form.elements[name].value.trim()]), ...Object.entries(images)]);
}
function preview(mode) {
    previewFrame.src = 'hero-preview.html?mode=' + mode + '&v=' + state.version;
    document.getElementById('open-preview').href = 'hero-preview.html?mode=' + mode;
    document.getElementById('preview-mode').textContent = mode === 'draft' ? '저장한 초안' : '현재 게시본';
    document.getElementById('preview-help').textContent = mode === 'draft'
        ? '저장한 초안입니다. PC와 휴대폰 버튼으로 화면을 확인한 뒤 아래 확인란을 선택하세요.'
        : '현재 홈페이지 게시본입니다. 초안 미리보기에서 수정 내용을 확인하세요.';
    draftPreviewed = mode === 'draft' && !dirty;
    reviewed.checked = false;
    controls();
}
async function load() {
    busy = true;
    controls();
    try {
        state = await api('/api/state');
        fill();
        preview('published');
        message('저장된 내용을 불러왔습니다. 수정한 뒤 초안을 저장하세요.');
    } catch (error) { message(error.message,true); }
    finally { busy = false; controls(); }
}
form.addEventListener('input', changed);
form.addEventListener('submit', async event => {
    event.preventDefault();
    if (!form.reportValidity()) return;
    busy = true;
    controls();
    try {
        state = await api('/api/draft', {content:content(),version:state.version});
        fill();
        message('초안을 저장했습니다. 저장한 초안 미리보기에서 확인하세요.');
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
            const result = await api('/api/image', {photo:{type:'image/jpeg',data:dataUrl.split(',')[1]}});
            images[input.dataset.imageField] = result.path;
            updateThumbnails();
            changed();
            message('사진을 준비했습니다. 초안 저장 후 미리보기에서 확인하세요.');
        } catch (error) { message('사진을 준비하지 못했습니다. 정상적인 이미지 파일인지 확인하세요. ' + error.message,true); }
        finally { input.value = ''; busy = false; controls(); }
    });
});
document.getElementById('preview-draft').addEventListener('click', () => {
    preview('draft');
    if (dirty) message('미리보기에는 마지막으로 저장한 초안이 표시됩니다. 현재 입력을 반영하려면 먼저 초안을 저장하세요.');
});
document.getElementById('preview-published').addEventListener('click', () => preview('published'));
function fitPreview() {
    const container = document.querySelector('.frame-scroll');
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
    if (!await confirmAction('확인한 초안을 예스수리 홈페이지에 게시할까요?')) return;
    busy = true;
    controls();
    try {
        state = await api('/api/publish',{version:state.version});
        fill();
        preview('published');
        message('홈페이지에 게시했습니다. 게시 기록에서 이전 내용으로 복원할 수 있습니다.');
    } catch (error) { message(error.message,true); }
    finally { busy = false; controls(); }
});
async function restore(id) {
    if (!await confirmAction('선택한 기록으로 홈페이지를 복원할까요? 현재 초안도 복원한 내용으로 바뀝니다.')) return;
    busy = true;
    controls();
    try {
        state = await api('/api/restore',{revisionId:id,version:state.version});
        fill();
        preview('published');
        message('선택한 내용으로 복원했습니다. 복원 전 게시본도 기록에 남아 있습니다.');
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
        if (!response.ok || !session.admin) throw new Error();
        document.getElementById('root').hidden = false;
        await load();
    } catch {
        if (locked) return;
        const root = document.getElementById('root');
        root.replaceChildren();
        const heading = document.createElement('h1');
        heading.textContent = '관리자 로그인이 필요합니다.';
        const link = document.createElement('a');
        link.href = 'technician-admin.html';
        link.textContent = '관리자 첫 화면에서 로그인';
        root.append(heading,link);
        root.hidden = false;
    }
}
start();
