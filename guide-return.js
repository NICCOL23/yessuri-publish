(() => {
 const api=window.YESSURI_SEARCH_STATE,params=new URLSearchParams(location.search),bar=document.getElementById('search-return-bar');
 if(!bar||params.get('fromSearch')!=='1')return;
 const record=api.read('yessuri:search-return'),requested=api.safeFind(params.get('search')||'');
 const target=requested||(record&&Date.now()-record.created<86400000&&api.safeFind(record.url));
 if(!target)return;
 const link=bar.querySelector('a');link.href=target.href;bar.hidden=false;
 const header=document.querySelector('.directory-header');
 const update=()=>{document.documentElement.style.setProperty('--search-header-height',header.getBoundingClientRect().height+'px');document.documentElement.style.setProperty('--search-return-height',bar.getBoundingClientRect().height+'px');};
 document.documentElement.classList.add('has-search-return');update();
 new ResizeObserver(update).observe(header);new ResizeObserver(update).observe(bar);
 link.addEventListener('click',()=>{if(record&&api.safeFind(record.url)?.href===target.href)api.write('yessuri:search-restore',record.state);});
 if(location.hash==='#check-title'){const align=()=>document.getElementById('check-title').scrollIntoView({block:'start',behavior:'instant'});requestAnimationFrame(align);document.fonts.ready.then(align);}
})();
