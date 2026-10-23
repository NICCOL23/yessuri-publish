/* Shared installed-mobile expert-card component. */
(() => {
 'use strict';
 const display=matchMedia('(display-mode:standalone)');
 const mobile=matchMedia('(max-width:760px)');
 const instances=new Map();
 let enabled=false;
 function apply(card){
  if(!enabled||instances.has(card))return card;
  const profile=card.querySelector('.ys-expert-profile');
  const actions=card.querySelector('.ys-expert-actions');
  if(!profile||!actions)return card;
  const links=[...card.querySelectorAll('.ys-expert-photo,h3 a')];
  instances.set(card,{profile,actions,aria:profile.getAttribute('aria-label'),links:links.map(link=>[link,link.getAttribute('tabindex')])});
  card.classList.add('ys-app-expert-card');
  links.forEach(link=>link.tabIndex=-1);
  profile.classList.add('ys-card-open');
  profile.setAttribute('aria-label',card.querySelector('h3').textContent+' 프로필 보기');
  card.append(profile);
  return card;
 }
 function restore(card,state){
  card.classList.remove('ys-app-expert-card');
  state.profile.classList.remove('ys-card-open');
  state.actions.append(state.profile);
  if(state.aria===null)state.profile.removeAttribute('aria-label');
  else state.profile.setAttribute('aria-label',state.aria);
  for(const [link,value] of state.links){if(value===null)link.removeAttribute('tabindex');else link.setAttribute('tabindex',value);}
 }
 function refresh(){
  if(!enabled)return;
  for(const card of instances.keys())if(!card.isConnected)instances.delete(card);
  document.querySelectorAll('#expert-grid .ys-expert-card,#find-grid .ys-expert-card').forEach(apply);
 }
 function sync(){
  const next=mobile.matches&&(display.matches||navigator.standalone===true);
  if(next===enabled)return;
  enabled=next;
  document.body.classList.toggle('ys-app-expert-layout',enabled);
  if(enabled)refresh();
  else{for(const [card,state] of instances)restore(card,state);instances.clear();}
 }
 document.querySelectorAll('#expert-grid,#find-grid').forEach(grid=>new MutationObserver(refresh).observe(grid,{childList:true,subtree:true}));
 display.addEventListener('change',sync);
 mobile.addEventListener('change',sync);
 window.YESSURI_APP_EXPERT_CARD={apply,refresh};
 sync();
})();
