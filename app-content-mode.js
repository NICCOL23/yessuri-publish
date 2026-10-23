/* Opt in only for installed mobile app pages; ordinary web pages remain unchanged. */
(() => {
 'use strict';
 const display=matchMedia('(display-mode:standalone)');
 const mobile=matchMedia('(max-width:760px)');
 const sync=()=>document.body.classList.toggle('ys-installed-mobile',mobile.matches&&(display.matches||navigator.standalone===true));
 display.addEventListener('change',sync);
 mobile.addEventListener('change',sync);
 sync();
})();
