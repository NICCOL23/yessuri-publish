(() => {
 const nav=document.getElementById('home-menu');if(!nav)return;
 const link=[...nav.querySelectorAll('a')].find(a=>a.getAttribute('href')==='guide.html');if(!link)return;
 const wrapper=document.createElement('div');wrapper.className='ys-guide-nav';link.before(wrapper);wrapper.append(link);
 const toggle=document.createElement('button');toggle.type='button';toggle.className='ys-guide-toggle';toggle.textContent='⌄';toggle.setAttribute('aria-label','비용·이용안내 하위 메뉴');toggle.setAttribute('aria-expanded','false');toggle.setAttribute('aria-controls','ys-guide-submenu');wrapper.append(toggle);
 const panel=document.createElement('div');panel.id='ys-guide-submenu';panel.className='ys-guide-submenu';panel.hidden=true;
 [['work-guide','작업·비용 안내'],['consultation','상담·이용 절차'],['repair-tips','수리·관리 팁'],['faq','자주 묻는 질문']].forEach(([id,label])=>{const a=document.createElement('a');a.href='guide.html#'+id;a.textContent=label;panel.append(a);});wrapper.append(panel);
 let timer;const show=open=>{clearTimeout(timer);panel.hidden=!open;toggle.setAttribute('aria-expanded',String(open));};
 toggle.addEventListener('click',e=>{e.stopPropagation();show(panel.hidden);});
 wrapper.addEventListener('mouseenter',()=>{if(matchMedia('(hover:hover) and (min-width:901px)').matches)show(true);});
 wrapper.addEventListener('mouseleave',()=>{if(matchMedia('(hover:hover) and (min-width:901px)').matches)timer=setTimeout(()=>show(false),180);});
 wrapper.addEventListener('focusout',()=>requestAnimationFrame(()=>{if(!wrapper.contains(document.activeElement))show(false);}));
 wrapper.addEventListener('keydown',e=>{if(e.key==='Escape'){e.stopPropagation();show(false);toggle.focus();}if(e.key==='ArrowDown'&&e.target===toggle){e.preventDefault();show(true);panel.querySelector('a').focus();}});
 panel.addEventListener('click',()=>show(false));document.addEventListener('click',e=>{if(!wrapper.contains(e.target))show(false);});
 new MutationObserver(()=>{if(!nav.classList.contains('is-open')&&matchMedia('(max-width:900px)').matches)show(false);}).observe(nav,{attributes:true,attributeFilter:['class']});
})();
