(() => {
 const enhance=window.YESSURI_TECHNICIAN_APPLY_FORM;
 window.YESSURI_TECHNICIAN_APPLY_FORM=()=>{
  enhance?.();const form=document.querySelector('#application-form');if(!form||form.dataset.foldSample)return;form.dataset.foldSample='true';
  const sections=[...form.querySelectorAll(':scope > .section')];
  function fold(section,title){
   const details=document.createElement('details');details.className='section optional-fold';
   const summary=document.createElement('summary');summary.textContent=title;
   const body=document.createElement('div');body.className='optional-body';
   const heading=section.querySelector('.section-title');
   for(const child of [...section.childNodes])if(child!==heading)body.append(child);
   details.append(summary,body);section.replaceWith(details);return details;
  }
  const intro=fold(sections[2],'추가 소개 작성 · 선택');
  intro.querySelector('.fields').append(form.querySelector('.design-area-note'));
  const photos=fold(sections[3],'명함·작업 사진 첨부 · 선택');
  for(const panel of [intro,photos])if([...panel.querySelectorAll('input,textarea')].some(el=>el.value.trim()))panel.open=true;
  // Custom validation may find a too-long optional field inside a closed panel.
  // Reveal it before the browser paints the error so the field stays reachable.
  new MutationObserver(()=>{
   for(const panel of [intro,photos])if(panel.querySelector('[aria-invalid="true"]'))panel.open=true;
  }).observe(form,{subtree:true,attributes:true,attributeFilter:['aria-invalid']});
 };
})();
