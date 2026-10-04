const form = document.querySelector('#registration-form');
const typeInput = document.querySelector('#reg-type');
const fieldInput = document.querySelector('#reg-field');
const regionOptions = document.querySelector('#reg-region-options');
const careerInput = document.querySelector('#reg-career');
const introInput = document.querySelector('#reg-intro');
const result = document.querySelector('#reg-result');
const error = document.querySelector('#reg-error');
const previewImage = document.querySelector('#preview-image');
const previewPlaceholder = document.querySelector('#preview-placeholder');
const illustrations = {
  '누수·수도':'expert-water.webp','하수구·변기':'case-water.webp','타일':'expert-tile.webp',
  '페인트':'expert-paintwood.webp','목공':'expert-paintwood.webp','에어컨':'category-aircon.webp',
  '청소':'expert-clean.webp','철거':'category-demolition.webp','전기·조명':'expert-light.webp',
  '문·창호':'category-door.webp','컴퓨터·IT':'expert-it.webp'
};

window.YESSURI_REGIONS.slice(1).forEach(region => {
  const label = document.createElement('label');
  label.className = 'registration-area-option';
  const checkbox = document.createElement('input');
  checkbox.type = 'checkbox';
  checkbox.name = 'serviceAreas';
  checkbox.value = region;
  const text = document.createElement('span');
  text.textContent = region;
  label.append(checkbox, text);
  regionOptions.append(label);
});

function selectedAreas() {
  return Array.from(regionOptions.querySelectorAll('input:checked'), input => input.value);
}

function updatePreview() {
  document.querySelector('#preview-type').textContent = typeInput.value ? `${typeInput.value} · 화면 예시` : '유형을 선택해 주세요 · 화면 예시';
  document.querySelector('#preview-field').textContent = fieldInput.value || '전문 분야를 선택해 주세요';
  const areas = selectedAreas();
  document.querySelector('#preview-region').textContent = areas.length
    ? `예시 출동 가능 지역(선택): 부산 ${areas.join(' · ')} · 화면 예시`
    : '출동 가능 지역을 선택해 주세요 · 화면 예시';
  document.querySelector('#preview-career').textContent = careerInput.value || '선택 전';
  document.querySelector('#preview-intro').textContent = introInput.value.trim() || '자기소개를 입력하면 여기에 표시됩니다.';
  document.querySelector('#reg-count').textContent = `${introInput.value.length} / 300`;
  const image = illustrations[fieldInput.value];
  previewImage.hidden = !image;
  previewPlaceholder.hidden = Boolean(image);
  if (image) previewImage.src = `assets/images/${image}`;
  else previewImage.removeAttribute('src');
  introInput.setCustomValidity('');
  error.hidden = true;
  result.hidden = true;
}

[typeInput,fieldInput,careerInput,introInput].forEach(input => {
  input.addEventListener('input', updatePreview);
  input.addEventListener('change', updatePreview);
});
regionOptions.addEventListener('change', updatePreview);

form.addEventListener('submit', event => {
  event.preventDefault();
  if (!selectedAreas().length) {
    error.textContent = '출동 가능 지역을 하나 이상 선택해 주세요.';
    error.hidden = false;
    regionOptions.querySelector('input').focus();
    return;
  }
  if (introInput.value.trim().length < 20) {
    introInput.setCustomValidity('자기소개를 20자 이상 입력해 주세요.');
    error.textContent = '자기소개를 20자 이상 입력해 주세요.';
    error.hidden = false;
  }
  if (!form.reportValidity()) return;
  result.textContent = '현재는 등록 시안입니다. 입력한 정보는 저장·게시되지 않았습니다.';
  result.hidden = false;
  result.scrollIntoView({behavior:'smooth',block:'nearest'});
});

updatePreview();
