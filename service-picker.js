(() => {
  const fields = [
    {label:'누수·수도', categories:['누수·수도'], details:['누수 점검','수도꼭지 교체','싱크대 배관']},
    {label:'하수구·변기', categories:['하수구·변기'], details:['싱크대 막힘','하수구 막힘','변기 막힘']},
    {label:'타일·욕실', categories:['타일'], details:['타일 보수','줄눈','실리콘 보수']},
    {label:'전기·조명', categories:['전기·조명'], details:['전등 교체','스위치·콘센트','전기 점검']},
    {label:'도배·장판', categories:[], details:[]},
    {label:'페인트', categories:['페인트'], details:[]},
    {label:'목공·문·창호', categories:['목공','문·창호'], details:['목공 보수','문·창호 보수']},
    {label:'철거·기타 보수', categories:['철거'], details:['철거']},
    {label:'에어컨', categories:['에어컨'], details:['수리','설치·이전','청소']},
    {label:'TV', categories:[], details:['화면 문제','전원 문제','소리 문제']},
    {label:'컴퓨터·노트북', categories:['컴퓨터·IT'], details:['전원·부팅','화면·속도','부품 점검']},
    {label:'청소·빌라 관리', categories:['청소'], details:['입주청소','거주청소','빌라 공용부 정기청소']}
  ];
  const query = document.querySelector('#hero-query');
  const mobileQuery = document.querySelector('#service-mobile-query');
  const panel = document.querySelector('#service-panel');
  const options = panel.querySelector('.service-options');
  const note = panel.querySelector('.service-panel-note');
  const back = panel.querySelector('.service-back');
  const backdrop = document.querySelector('.service-backdrop');
  const status = document.querySelector('#service-selection');
  const form = document.querySelector('#search-form');
  const mobile = matchMedia('(max-width:760px)');
  let selected = null, detail = '', currentField = null, ignoreFocus = false, composing = false;
  let savedOverflow = '', inertNodes = [];
  const normalize = text => text.normalize('NFKC').toLowerCase().replace(/[\s·/]/g,'');
  const selectedText = () => selected ? selected.label + (detail ? ' · ' + detail : '') : '';
  function setStatus() {
    status.hidden = !selected;
    status.textContent = selected ? selected.categories.length
      ? `선택: ${selectedText()} — 상위 분야의 예시 기술자를 검색합니다.`
      : `${selected.label} 분야는 현재 검색 지원 준비 중입니다. 다른 분야를 선택해 주세요.` : '';
  }
  function lockBackground() {
    savedOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    inertNodes = [...document.body.children].filter(el => el !== panel && el !== backdrop && !['SCRIPT','LINK'].includes(el.tagName)).map(el => [el,el.inert]);
    inertNodes.forEach(([el]) => { el.inert = true; });
  }
  function unlockBackground() {
    inertNodes.forEach(([el,value]) => { el.inert = value; });
    inertNodes = [];
    document.body.style.overflow = savedOverflow;
  }
  function positionPanel() {
    if (panel.hidden || mobile.matches) return;
    const rect = form.getBoundingClientRect();
    const width = Math.min(Math.max(rect.width,400),innerWidth - 24);
    const top = Math.min(rect.bottom + 8,innerHeight - 150);
    panel.style.width = `${width}px`;
    panel.style.left = `${Math.max(12,Math.min(rect.left,innerWidth-width-12))}px`;
    panel.style.top = `${Math.max(12,top)}px`;
    panel.style.maxHeight = `${Math.max(130,innerHeight-top-12)}px`;
  }
  function openPanel() {
    if (!panel.hidden) return;
    panel.hidden = false;
    query.setAttribute('aria-expanded','true');
    document.querySelector('.service-query-toggle').setAttribute('aria-expanded','true');
    mobileQuery.value = query.value;
    panel.setAttribute('aria-modal',String(mobile.matches));
    backdrop.hidden = !mobile.matches;
    if (mobile.matches) { lockBackground(); panel.querySelector('.service-close').focus(); }
    currentField = selected && selected.details.length ? selected : null;
    render();
    positionPanel();
  }
  function closePanel(restore = true) {
    if (panel.hidden) return;
    if (inertNodes.length) unlockBackground();
    panel.hidden = true; backdrop.hidden = true;
    query.setAttribute('aria-expanded','false');
    document.querySelector('.service-query-toggle').setAttribute('aria-expanded','false');
    if (restore) { ignoreFocus = true; query.focus({preventScroll:true}); ignoreFocus = false; }
  }
  function choose(field, sub = '', keepOpen = false) {
    selected = field; detail = sub;
    query.value = selectedText(); mobileQuery.value = query.value;
    setStatus();
    if (keepOpen) { currentField = field; render(); options.querySelector('button')?.focus(); }
    else closePanel();
  }
  function button(label, action, active = false, unsupported = false, hasDetails = false) {
    const el = document.createElement('button'); el.type = 'button'; el.className = 'service-option';
    const text = document.createElement('span'); text.textContent = label; el.append(text);
    el.setAttribute('aria-pressed',String(active));
    if (hasDetails) {
      el.classList.add('service-option-parent');
      el.setAttribute('aria-label',label + ', 세부 항목 보기');
      const icon = document.createElementNS('http://www.w3.org/2000/svg','svg');
      icon.setAttribute('viewBox','0 0 20 20'); icon.setAttribute('aria-hidden','true');
      icon.setAttribute('focusable','false'); icon.classList.add('service-option-chevron');
      const path = document.createElementNS('http://www.w3.org/2000/svg','path');
      path.setAttribute('d','M5 7.5 10 12.5 15 7.5'); icon.append(path); el.append(icon);
    }
    if (unsupported) { const hint=document.createElement('small'); hint.textContent='검색 지원 준비 중'; el.append(hint); }
    el.addEventListener('click',action);options.append(el);
  }
  function render() {
    options.replaceChildren();back.hidden = !currentField;
    if (currentField) {
      panel.querySelector('h2').textContent = currentField.label;
      note.textContent = currentField.categories.length ? '세부 선택은 선택 사항입니다. 전체 분야로 검색해도 됩니다.' : '이 분야는 현재 기술자 검색 지원 준비 중입니다.';
      button('이 분야 전체',()=>choose(currentField,'',true),selected===currentField&&!detail);
      currentField.details.forEach(sub=>button(sub,()=>choose(currentField,sub),selected===currentField&&detail===sub));
    } else {
      panel.querySelector('h2').textContent = '어디를 수리하고 싶으세요?';
      note.textContent = '분야를 선택하거나 수리명을 직접 입력하세요.';
      const term = selected && query.value===selectedText() ? '' : normalize(query.value);
      const ranked = fields.map((f,index)=>({f,index,match:!!term&&normalize([f.label,...f.details].join(' ')).includes(term)})).sort((a,b)=>Number(b.match)-Number(a.match)||a.index-b.index);
      ranked.forEach(({f})=>button(f.label,()=>choose(f,'',f.details.length>0),selected===f,!f.categories.length,f.details.length>0));
    }
  }
  function edit(source) {
    query.value=source.value;mobileQuery.value=source.value;
    selected=null;detail='';currentField=null;setStatus();
    if (panel.hidden) openPanel(); else render();
  }
  query.addEventListener('focus',()=>{if(!ignoreFocus)openPanel();});
  query.addEventListener('click',openPanel);
  document.querySelector('.service-query-trigger').addEventListener('click',openPanel);
  query.addEventListener('input',()=>edit(query));
  mobileQuery.addEventListener('input',()=>edit(mobileQuery));
  for (const input of [query,mobileQuery]) {
    input.addEventListener('compositionstart',()=>{composing=true;});
    input.addEventListener('compositionend',()=>{composing=false;});
    input.addEventListener('keydown',event=>{
      if(event.key==='Enter'&&(composing||event.isComposing||event.keyCode===229)){event.preventDefault();return;}
      if(event.key==='Enter'&&input===mobileQuery){event.preventDefault();closePanel();form.requestSubmit();}
      if(event.key==='ArrowDown'){event.preventDefault();openPanel();options.querySelector('button')?.focus();}
      if(event.key==='Escape'){event.preventDefault();closePanel();}
    });
  }
  back.addEventListener('click',()=>{currentField=null;render();options.querySelector('button')?.focus();});
  panel.querySelector('.service-clear').addEventListener('click',()=>{selected=null;detail='';currentField=null;query.value='';mobileQuery.value='';setStatus();render();if(mobile.matches)mobileQuery.focus();else{ignoreFocus=true;query.focus();ignoreFocus=false;}});
  panel.querySelector('.service-close').addEventListener('click',()=>closePanel());
  panel.querySelector('.service-apply').addEventListener('click',()=>closePanel());
  backdrop.addEventListener('click',()=>closePanel());
  document.addEventListener('pointerdown',event=>{if(!panel.hidden&&!mobile.matches&&!panel.contains(event.target)&&!document.querySelector('.service-query-trigger').contains(event.target))closePanel(false);});
  document.addEventListener('keydown',event=>{
    if(panel.hidden)return;
    if(event.key==='Escape'){event.preventDefault();closePanel();return;}
    if(event.key==='Tab'&&mobile.matches){
      const focusable=[...panel.querySelectorAll('button,input')].filter(el=>!el.hidden&&el.getClientRects().length);
      const first=focusable[0],last=focusable.at(-1);
      if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}
      else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}
    }
  });
  options.addEventListener('keydown',event=>{
    if(!['ArrowDown','ArrowUp','ArrowRight','ArrowLeft','Home','End'].includes(event.key))return;
    event.preventDefault();const items=[...options.querySelectorAll('button')];let i=items.indexOf(document.activeElement);
    i=event.key==='Home'?0:event.key==='End'?items.length-1:(i+(['ArrowUp','ArrowLeft'].includes(event.key)?-1:1)+items.length)%items.length;items[i]?.focus();
  });
  form.addEventListener('submit',event=>{
    if(composing){event.preventDefault();return;}
    if(!selected)return;
    event.preventDefault();
    if(!selected.categories.length){setStatus();closePanel();return;}
    const params=new URLSearchParams({region:document.querySelector('#hero-region').value||'전체',service:selectedText()});
    const mapped=selected.label==='목공·문·창호'&&detail ? [detail==='목공 보수'?'목공':'문·창호'] : selected.categories;
    if(mapped.length===1)params.set('category',mapped[0]);else params.set('categories',mapped.join(','));
    location.href=`find.html?${params}`;
  });
  addEventListener('resize',()=>{if(!panel.hidden)positionPanel();});
  addEventListener('scroll',positionPanel,true);
  mobile.addEventListener('change',()=>closePanel());
})();
