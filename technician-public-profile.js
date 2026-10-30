/* Admin application detail only. Only explicitly selected attachments may be published. */
(() => {
  'use strict';
  const element = (tag, text, className) => {
    const node = document.createElement(tag);
    if (text) node.textContent = text;
    if (className) node.className = className;
    return node;
  };
  const split = value => [...new Set(value.split(/[,，\n]+/).map(s => s.trim()).filter(Boolean))];
  function mount({application, api, photos = []}) {
    mountPhotoButtons({application, api, photos});
    const anchor = document.querySelector('#root .layout > div > section.card');
    if (!anchor) return;
    const section = element('section', '', 'card section');
    section.id = 'admin-public-profile';
    section.append(element('h2','공개 프로필 등록'));
    section.append(element('p','공개할 내용으로 수정한 뒤 신청자의 공개 동의를 확인해 주세요. 비공개 첨부사진·담당자명·접수번호·답변은 복사하지 않습니다.'));
    const open = element('button','공개 프로필 등록','btn primary');
    open.type = 'button';
    open.setAttribute('aria-expanded','false');
    open.setAttribute('aria-controls','admin-public-profile-form');
    const form = element('form');
    form.id = 'admin-public-profile-form';
    form.hidden = true;
    const inputs = {};
    function field(key, label, value, max, required = false, multiline = false) {
      const wrap = element('div','','field section');
      const input = element(multiline ? 'textarea' : 'input');
      input.id = 'public-profile-'+key;
      input.value = value || '';
      input.maxLength = max;
      input.required = required;
      const title = element('label',label);
      title.htmlFor = input.id;
      wrap.append(title,input);
      form.append(wrap);
      inputs[key] = input;
    }
    field('name','공개 업체명',application.company,100,true);
    field('fields','전문 분야 (여러 분야는 쉼표로 구분)',application.fields,2000,true);
    field('serviceAreas','출장 지역 (예: 해운대구, 수영구)',application.areas,1000,true);
    field('intro','공개 소개 (개인정보가 포함되어 있지 않은지 확인)',application.intro,6000,false,true);
    field('career','공개 경력', '',200);
    field('phone','공개 연락처',application.phone,40);
    inputs.phone.type = 'tel';
    function checkbox(key, text) {
      const label = element('label','','check section');
      const input = element('input');
      input.type = 'checkbox';
      input.id = 'public-profile-'+key;
      label.append(input,document.createTextNode(text));
      form.append(label);
      inputs[key] = input;
    }
    checkbox('phonePublic','신청자가 위 연락처의 공개와 전화 연결에 동의했습니다. (선택)');
    checkbox('publicConsent','위에 작성한 업체명·전문 분야·출장 지역·소개·경력의 공개에 신청자가 동의했음을 확인했습니다. (필수)');
    inputs.publicConsent.required = true;
    const status = element('p');
    status.setAttribute('role','status');
    const error = element('p','','error');
    error.setAttribute('role','alert');
    const submit = element('button','확인한 내용으로 공개 등록','btn primary');
    submit.type = 'submit';
    form.append(error,submit);
    section.append(open,form,status);
    anchor.after(section);
    let checking = false, saving = false;
    function registered(profile) {
      form.hidden = true;
      open.hidden = true;
      status.replaceChildren(document.createTextNode('이 신청의 프로필이 이미 등록되어 있습니다. '));
      const link = element('a','공개 프로필 보기','btn');
      link.href = 'expert.html?id='+encodeURIComponent(profile.id);
      status.append(link);
    }
    open.addEventListener('click', async () => {
      if (checking) return;
      checking = true;
      open.disabled = true;
      status.textContent = '등록 여부를 확인하고 있습니다.';
      try {
        const result = await api('admin/applications/'+application.id+'/public-profile');
        if (result.profile) { registered(result.profile); return; }
        status.textContent = '';
        form.hidden = !form.hidden;
        open.setAttribute('aria-expanded',String(!form.hidden));
        if (!form.hidden) inputs.name.focus();
      } catch (err) { status.textContent = err.message; }
      finally { checking = false; open.disabled = false; }
    });
    form.addEventListener('submit', async event => {
      event.preventDefault();
      if (saving) return;
      error.textContent = '';
      if (!inputs.publicConsent.checked) { error.textContent = '신청자의 공개 동의를 확인해 주세요.'; return; }
      saving = true;
      // Freeze the reviewed snapshot while the publish request is in flight.
      const data = {
        version: application.version,
        name: inputs.name.value, fields: split(inputs.fields.value), serviceAreas: split(inputs.serviceAreas.value),
        intro: inputs.intro.value, career: inputs.career.value,
        phone: inputs.phonePublic.checked ? inputs.phone.value : '',
        phonePublic: inputs.phonePublic.checked, publicConsent: inputs.publicConsent.checked
      };
      const controls = [...form.querySelectorAll('input,textarea,button')];
      controls.forEach(control => { control.disabled = true; });
      open.disabled = true;
      try {
        const result = await api('admin/applications/'+application.id+'/public-profile', data);
        registered(result.profile);
        status.firstChild.textContent = '공개 프로필 등록을 완료했습니다. ';
      } catch (err) { error.textContent = err.message; }
      finally {
        saving = false;
        controls.forEach(control => { control.disabled = false; });
        open.disabled = false;
      }
    });
  }
  function mountPhotoButtons({application, api, photos}) {
    if (!photos.length) return;
    const figures = document.querySelectorAll('#root .file-grid figure.photo');
    let saving = false;
    const buttons = [];
    photos.forEach((photo, index) => {
      const figure = figures[index];
      if (!figure) return;
      const button = element('button','대표 이미지로 등록','btn');
      button.type = 'button';
      button.setAttribute('aria-label','첨부사진 '+(index+1)+' 대표 이미지로 등록');
      const status = element('p','','hint');
      status.setAttribute('role','status');
      figure.append(button,status);
      buttons.push(button);
      button.addEventListener('click', async () => {
        if (saving || !window.confirm('첨부사진 '+(index+1)+'을 공개 대표 이미지로 등록할까요? 신청자가 사진 공개에 동의했는지 확인해 주세요. 선택한 사진은 메인 카드와 공개 프로필에 표시됩니다.')) return;
        saving = true;
        buttons.forEach(node => { node.disabled = true; });
        status.textContent = '대표 이미지를 등록하고 있습니다.';
        try {
          await api('admin/applications/'+application.id+'/representative-image', {
            version: application.version, photoId: photo.id, imageConsent: true
          });
          for (const node of buttons) node.textContent = '대표 이미지로 등록';
          button.textContent = '대표 이미지 등록됨';
          status.replaceChildren(document.createTextNode('메인 카드와 프로필에 반영했습니다. '));
          const link = element('a','프로필 확인');
          link.href = 'expert.html?id='+encodeURIComponent('technician-'+application.id);
          status.append(link);
        } catch (err) { status.textContent = err.message; }
        finally {
          saving = false;
          buttons.forEach(node => { node.disabled = false; });
        }
      });
    });
  }
  window.YESSURI_TECHNICIAN_PUBLIC_PROFILE = {mount};
})();
