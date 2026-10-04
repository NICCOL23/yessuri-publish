const form = document.querySelector('#repair-form');
const photoInput = document.querySelector('#repair-photo');
const typeInput = document.querySelector('#repair-type');
const regionInput = document.querySelector('#repair-region');
const descriptionInput = document.querySelector('#repair-description');
const photoError = document.querySelector('#photo-error');
const descriptionError = document.querySelector('#description-error');
const photoPreview = document.querySelector('#photo-preview');
const reviewPanel = document.querySelector('#review-panel');
const resultPanel = document.querySelector('#result-panel');
const allowedTypes = new Set(['image/jpeg','image/png','image/webp']);
let photoUrl = '';

function clearPhoto() {
  if (photoUrl) URL.revokeObjectURL(photoUrl);
  photoUrl = '';
  photoInput.value = '';
  photoInput.setCustomValidity('');
  document.querySelector('#photo-preview-image').removeAttribute('src');
  document.querySelector('#review-photo-image').removeAttribute('src');
  photoPreview.hidden = true;
  photoError.hidden = true;
}

photoInput.addEventListener('change', () => {
  if (photoUrl) URL.revokeObjectURL(photoUrl);
  photoUrl = '';
  photoPreview.hidden = true;
  photoError.hidden = true;
  photoInput.setCustomValidity('');
  const file = photoInput.files?.[0];
  if (!file) return;
  if (!allowedTypes.has(file.type) || file.size > 10 * 1024 * 1024) {
    photoInput.value = '';
    photoInput.setCustomValidity('JPG, PNG, WEBP 형식의 10MB 이하 사진을 선택해 주세요.');
    photoError.textContent = 'JPG, PNG, WEBP 형식의 10MB 이하 사진을 선택해 주세요.';
    photoError.hidden = false;
    return;
  }
  photoUrl = URL.createObjectURL(file);
  document.querySelector('#photo-preview-image').src = photoUrl;
  document.querySelector('#photo-file-name').textContent = file.name;
  photoPreview.hidden = false;
});

document.querySelector('#remove-photo').addEventListener('click', () => {
  clearPhoto();
  photoInput.focus();
});

descriptionInput.addEventListener('input', () => {
  document.querySelector('#description-count').textContent = `${descriptionInput.value.length} / 500`;
  descriptionInput.setCustomValidity('');
  descriptionError.hidden = true;
});

form.addEventListener('submit', event => {
  event.preventDefault();
  if (!photoInput.files?.[0]) {
    photoInput.setCustomValidity('사진을 선택해 주세요.');
    photoError.textContent = '수리할 곳의 사진을 선택해 주세요.';
    photoError.hidden = false;
  }
  if (descriptionInput.value.trim().length < 10) {
    descriptionInput.setCustomValidity('문제 설명을 10자 이상 입력해 주세요.');
    descriptionError.textContent = '문제 설명을 10자 이상 입력해 주세요.';
    descriptionError.hidden = false;
  }
  if (!form.reportValidity()) return;
  document.querySelector('#review-photo-image').src = photoUrl;
  document.querySelector('#review-type').textContent = typeInput.value;
  document.querySelector('#review-region').textContent = regionInput.value;
  document.querySelector('#review-description').textContent = descriptionInput.value.trim();
  form.hidden = true;
  reviewPanel.hidden = false;
  reviewPanel.scrollIntoView({behavior:'smooth',block:'start'});
});

document.querySelector('#edit-request').addEventListener('click', () => {
  reviewPanel.hidden = true;
  form.hidden = false;
  form.scrollIntoView({behavior:'smooth',block:'start'});
});

document.querySelector('#finish-request').addEventListener('click', () => {
  reviewPanel.hidden = true;
  resultPanel.hidden = false;
  resultPanel.scrollIntoView({behavior:'smooth',block:'start'});
});

document.querySelector('#back-to-edit').addEventListener('click', () => {
  resultPanel.hidden = true;
  form.hidden = false;
  form.scrollIntoView({behavior:'smooth',block:'start'});
});

window.addEventListener('pagehide', () => {
  if (photoUrl) URL.revokeObjectURL(photoUrl);
});
