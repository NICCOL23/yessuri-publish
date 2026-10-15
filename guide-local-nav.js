/* Guide-only section navigation. Other pages keep the original disclosure menu. */
(() => {
 const nav=document.getElementById('guide-local-nav');if(!nav)return;
 const links=[...nav.querySelectorAll('a')],sections=links.map(a=>document.getElementById(a.hash.slice(1)));
 const header=document.querySelector('.directory-header'),returnBar=document.getElementById('search-return-bar');
 let frame=0;
 function offset(){return (header?.getBoundingClientRect().height||0)+(returnBar&&!returnBar.hidden?returnBar.getBoundingClientRect().height:0)+16;}
 function syncLinks(){links.forEach(a=>{const u=new URL(location.href);u.hash=a.dataset.section;a.href=u.pathname+u.search+u.hash;});}
 function mark(id){links.forEach(a=>{if(a.dataset.section===id)a.setAttribute('aria-current','location');else a.removeAttribute('aria-current');});}
 function track(){frame=0;const edge=offset()+12;let current=sections[0];for(const section of sections)if(section.getBoundingClientRect().top<=edge)current=section;
  if(innerHeight+scrollY>=document.documentElement.scrollHeight-4)current=sections.at(-1);
  mark(current.id);
 }
 function schedule(){if(!frame)frame=requestAnimationFrame(track);}
 function navigate({focus=false}={}){syncLinks();const section=sections.find(s=>'#'+s.id===location.hash);if(!section){schedule();return;}
  const heading=section.querySelector('h1,h2')||section;
  if(focus){heading.tabIndex=-1;heading.focus({preventScroll:true});}
  window.scrollTo({top:Math.max(0,section.getBoundingClientRect().top+scrollY-offset()),behavior:'instant'});mark(section.id);
 }
 links.forEach(a=>a.addEventListener('click',e=>{if(e.button!==0||e.metaKey||e.ctrlKey||e.shiftKey||e.altKey)return;e.preventDefault();syncLinks();if(location.hash!==a.hash)history.pushState(history.state,'',a.href);navigate({focus:true});}));
 // A work selection can update the query without reloading; keep real link destinations in sync.
 new MutationObserver(syncLinks).observe(document.getElementById('wg-selection'),{childList:true,subtree:true});
 document.getElementById('wg-region').addEventListener('change',syncLinks);
 window.addEventListener('scroll',schedule,{passive:true});window.addEventListener('resize',schedule);
 window.addEventListener('hashchange',()=>navigate({focus:true}));window.addEventListener('popstate',()=>navigate({focus:true}));
 new ResizeObserver(schedule).observe(document.querySelector('main'));
 syncLinks();requestAnimationFrame(()=>navigate());document.fonts.ready.then(()=>navigate());
 window.addEventListener('load',()=>navigate(),{once:true});
})();
