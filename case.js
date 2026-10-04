const caseId = new URLSearchParams(window.location.search).get('id');
const workExample = window.YESSURI_CASES.find(item => item.id === caseId);
if (!workExample) {
  document.querySelector('#case-not-found').hidden = false;
} else {
  document.title = `${workExample.title} | YESSURI`;
  document.querySelector('#case-content').hidden = false;
  document.querySelector('#case-category').textContent = `${workExample.category} · 예시`;
  document.querySelector('#case-title').textContent = workExample.title;
  document.querySelector('#case-problem').textContent = workExample.problem;
  document.querySelector('#case-approach').textContent = workExample.approach;
  const image = document.querySelector('#case-image');
  image.src = `assets/images/${workExample.image}`;
  image.alt = workExample.imageAlt;
}
