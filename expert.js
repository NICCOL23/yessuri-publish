const profileId = new URLSearchParams(window.location.search).get('id');
const person = window.YESSURI_PUBLIC_EXPERTS().find(expert => expert.id === profileId);

if (!person) {
  document.querySelector('#not-found').hidden = false;
} else {
  document.title = `${person.name} | YESSURI 예시 프로필`;
  document.querySelector('#profile-content').hidden = false;
  document.querySelector('#expert-icon').textContent = person.icon;
  document.querySelector('#expert-name').textContent = person.name;
  document.querySelector('#expert-region').textContent = `예시 출동 가능 지역: 부산 ${window.YESSURI_AREAS_LABEL(person)} · ${person.profileType} 예시`;
  document.querySelector('#expert-region-fact').textContent = `부산 ${window.YESSURI_AREAS_LABEL(person)} · 예시`;
  document.querySelector('#expert-fields-fact').textContent = person.fields.join(' · ');
  document.querySelector('#expert-career').textContent = person.career;
  document.querySelector('#expert-intro').textContent = person.intro;
  window.YESSURI_FAVORITES.bindButton(document.querySelector('#expert-favorite'), person.id);
  window.YESSURI_COMPARE.bindButton(document.querySelector('#expert-compare'), person.id, document.querySelector('#expert-compare-status'));
  const phoneHref = window.YESSURI_PHONE_HREF(person);
  document.querySelector('#contact-heading').textContent = phoneHref ? '전화로 문의하기' : '전화 연결 준비 중';
  document.querySelector('#contact-button').textContent = phoneHref ? '전화 연결하기' : '전화 연결 준비 중';
  if (phoneHref) {
    document.querySelector('#contact-description').textContent = '기술자가 공개에 동의한 번호로 전화 앱을 엽니다. 통화 연결과 응답 여부는 전화 앱에서 확인해 주세요.';
    document.querySelector('#contact-footnote').textContent = '전화 연결을 누르면 기기의 전화 앱으로 이동합니다.';
  }
  const image = document.querySelector('#expert-image');
  image.src = `assets/images/${person.image}`;
  image.alt = person.imageAlt;
  const tags = document.querySelector('#expert-fields');
  person.fields.forEach(field => {
    const tag = document.createElement('span');
    tag.textContent = field;
    tags.append(tag);
  });
  document.querySelector('#contact-button').addEventListener('click', () => {
    if (phoneHref) {
      window.location.href = phoneHref;
      return;
    }
    const toast = document.querySelector('#toast');
    toast.textContent = '예시 프로필에는 실제 전화번호가 연결되지 않았습니다.';
    toast.classList.add('show');
    window.setTimeout(() => toast.classList.remove('show'), 3500);
  });
}
