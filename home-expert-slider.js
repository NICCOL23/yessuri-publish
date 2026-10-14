/* Full original cards with external navigation and optional autoplay. */
(function(){
 const element=document.getElementById('home-expert-slider');
 const grid=document.getElementById('expert-grid');
 if(!element||!grid||typeof window.Swiper!=='function'||grid.children.length<2)return;
 const controls=document.querySelector('.expert-slider-controls');
 const frame=document.querySelector('.expert-slider-frame');
 grid.classList.add('swiper-wrapper');
 Array.from(grid.children).forEach(card=>card.classList.add('swiper-slide'));
 const reduced=window.matchMedia('(prefers-reduced-motion: reduce)');
 let stopped=reduced.matches;
 let hovered=false,focused=false;
 const count=grid.children.length;
 const toggle=controls.querySelector('.expert-slider-toggle');
 const swiper=new Swiper(element,{
  slidesPerView:1,spaceBetween:16,slidesPerGroup:1,loop:count>=4,speed:reduced.matches?0:350,
  grabCursor:true,preventClicks:true,preventClicksPropagation:true,watchOverflow:true,
  watchSlidesProgress:true,
  breakpoints:{768:{slidesPerView:Math.min(count,2),spaceBetween:20},1100:{slidesPerView:Math.min(count,3),spaceBetween:20}},
  autoplay:{delay:5000,disableOnInteraction:false,pauseOnMouseEnter:false,stopOnLastSlide:count<4},
  navigation:{prevEl:frame.querySelector('.expert-slider-prev'),nextEl:frame.querySelector('.expert-slider-next')},
  pagination:{el:controls.querySelector('.expert-slider-pagination'),clickable:true,bulletElement:'button'},
  a11y:{containerRoleDescriptionMessage:'전문가 슬라이드',itemRoleDescriptionMessage:'전문가 카드',prevSlideMessage:'이전 전문가',nextSlideMessage:'다음 전문가',paginationBulletMessage:'{{index}}번 전문가 보기',slideLabelMessage:'{{index}} / {{slidesLength}}'},
  on:{init:markVisible,slideChangeTransitionEnd:markVisible,resize:markVisible}
 });
 function markVisible(){requestAnimationFrame(()=>{const box=element.getBoundingClientRect();grid.querySelectorAll('.swiper-slide').forEach(card=>{const r=card.getBoundingClientRect();card.inert=(r.right<=box.left+2||r.left>=box.right-2)&&!card.contains(document.activeElement);});controls.querySelectorAll('.swiper-pagination-bullet').forEach((bullet,i)=>{bullet.type='button';bullet.setAttribute('aria-label',`${i+1}번 전문가 보기`);if(bullet.classList.contains('swiper-pagination-bullet-active'))bullet.setAttribute('aria-current','true');else bullet.removeAttribute('aria-current');});});}
 function update(){toggle.textContent=stopped?'자동 재생 시작':'자동 재생 정지';toggle.setAttribute('aria-pressed',String(stopped));if(stopped||hovered||focused||swiper.isLocked)swiper.autoplay.stop();else swiper.autoplay.start();controls.hidden=swiper.isLocked;frame.querySelectorAll('.expert-slider-arrow').forEach(button=>button.hidden=swiper.isLocked);const help=document.querySelector('.expert-slider-help');if(help)help.hidden=swiper.isLocked;}
 toggle.addEventListener('click',()=>{stopped=!stopped;update();});
 element.addEventListener('mouseenter',()=>{hovered=true;update();});
 element.addEventListener('mouseleave',()=>{hovered=false;update();});
 element.addEventListener('focusin',event=>{focused=true;update();const card=event.target.closest('.swiper-slide');if(!card)return;const r=card.getBoundingClientRect(),box=element.getBoundingClientRect();if(r.left<box.left-1||r.right>box.right+1)swiper.slideToLoop(Number(card.dataset.swiperSlideIndex));});
 element.addEventListener('focusout',()=>{requestAnimationFrame(()=>{focused=element.contains(document.activeElement);update();});});
 swiper.on('resize',()=>{update();});
 reduced.addEventListener('change',e=>{stopped=e.matches;swiper.params.speed=e.matches?0:350;update();});
 controls.hidden=false;update();
})();
