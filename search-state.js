/* Shared safe storage and deterministic search ordering. */
(() => {
  const read = key => {try{return JSON.parse(sessionStorage.getItem(key));}catch{return null;}};
  const write = (key,value) => {try{sessionStorage.setItem(key,JSON.stringify(value));return true;}catch{return false;}};
  const hour = () => Math.floor(Date.now()/3600000);
  const rotate = (items,tick) => {
    const sorted=items.slice().sort((a,b)=>String(a.id).localeCompare(String(b.id),'en'));
    if(sorted.length<2)return sorted;
    const start=((tick*(sorted.length<=10?1:10))%sorted.length+sorted.length)%sorted.length;
    return sorted.slice(start).concat(sorted.slice(0,start));
  };
  const safeFind = value => {try{const u=new URL(value,location.href),expected=new URL('find.html',location.href);return u.origin===expected.origin&&u.pathname===expected.pathname?u:null;}catch{return null;}};
  const keyFor = value => {const u=safeFind(value);if(!u)return '';const p=new URLSearchParams();for(const key of ['q','region','category','categories','service','sort','page'])if(u.searchParams.has(key))p.set(key,u.searchParams.get(key));return p.toString();};
  window.YESSURI_SEARCH_STATE={read,write,hour,rotate,safeFind,keyFor};
})();
