/* Swiper 11.2.10: six existing sample profiles, five-second looping autoplay. */
(function(){
 const element=document.getElementById('home-expert-slider');
 const grid=document.getElementById('expert-grid');
 if(!element||!grid||typeof window.Swiper!=='function'||grid.children.length<2)return;
 const controls=document.querySelector('.expert-slider-controls');
 grid.classList.add('swiper-wrapper');
 Array.from(grid.children).forEach(card=>card.classList.add('swiper-slide'));
 const reduced=window.matchMedia('(prefers-reduced-motion: reduce)');
 let stopped=reduced.matches;
 const toggle=controls.querySelector('.expert-slider-toggle');
 const swiper=new Swiper(element,{
  slidesPerView:1,spaceBetween:16,slidesPerGroup:1,loop:true,speed:500,
  watchSlidesProgress:true,
  breakpoints:{768:{slidesPerView:2,spaceBetween:20},1100:{slidesPerView:3,spaceBetween:20}},
  autoplay:{delay:5000,disableOnInteraction:false,pauseOnMouseEnter:true},
  navigation:{prevEl:controls.querySelector('.expert-slider-prev'),nextEl:controls.querySelector('.expert-slider-next')},
  pagination:{el:controls.querySelector('.expert-slider-pagination'),clickable:true},
  a11y:{containerRoleDescriptionMessage:'전문가 슬라이드',itemRoleDescriptionMessage:'전문가 카드',prevSlideMessage:'이전 전문가',nextSlideMessage:'다음 전문가',paginationBulletMessage:'{{index}}번 전문가 보기',slideLabelMessage:'{{index}} / {{slidesLength}}'},
  on:{init:markVisible,slideChangeTransitionEnd:markVisible,resize:markVisible}
 });
 function markVisible(){requestAnimationFrame(()=>{const box=element.getBoundingClientRect();grid.querySelectorAll('.swiper-slide').forEach(card=>{const r=card.getBoundingClientRect();card.inert=r.right<=box.left+5||r.left>=box.right-5;});});}
 function update(){toggle.textContent=stopped?'자동 재생 시작':'자동 재생 정지';toggle.setAttribute('aria-pressed',String(stopped));if(stopped)swiper.autoplay.stop();else swiper.autoplay.start();}
 toggle.addEventListener('click',()=>{stopped=!stopped;update();});
 element.addEventListener('focusin',()=>swiper.autoplay.stop());
 element.addEventListener('focusout',()=>{requestAnimationFrame(()=>{if(!stopped&&!element.contains(document.activeElement))swiper.autoplay.start();});});
 reduced.addEventListener('change',e=>{stopped=e.matches;update();});
 controls.hidden=false;update();
})();
