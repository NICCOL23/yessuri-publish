(() => {
 'use strict';
 if(document.body.dataset.boardPage!=='list')return;
 const display=matchMedia('(display-mode:standalone)'),mobile=matchMedia('(max-width:760px)'),dates=new Map();let enabled=false;
 function refresh(){if(!enabled)return;for(const time of dates.keys())if(!time.isConnected)dates.delete(time);document.querySelectorAll('.b-cell-date time').forEach(time=>{if(dates.has(time))return;const date=new Date(time.dateTime);if(Number.isNaN(date.getTime()))return;dates.set(time,{text:time.textContent,aria:time.getAttribute('aria-label'),title:time.getAttribute('title')});time.setAttribute('aria-label',time.textContent);time.title=time.textContent;const parts=new Intl.DateTimeFormat('ko-KR',{month:'2-digit',day:'2-digit',timeZone:'Asia/Seoul'}).formatToParts(date);time.textContent=parts.find(p=>p.type==='month').value+'.'+parts.find(p=>p.type==='day').value;});}
 function sync(){const next=mobile.matches&&(display.matches||navigator.standalone===true);if(next===enabled)return;enabled=next;if(enabled)refresh();else{for(const [time,value]of dates){time.textContent=value.text;for(const key of ['aria-label','title']){const v=key==='title'?value.title:value.aria;if(v===null)time.removeAttribute(key);else time.setAttribute(key,v);}}dates.clear();}}
 const root=document.querySelector('#board-root');if(root)new MutationObserver(refresh).observe(root,{childList:true,subtree:true});display.addEventListener('change',sync);mobile.addEventListener('change',sync);sync();
})();
