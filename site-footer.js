/* Shared footer: edit this template once to update every page instance. */
(() => {
  'use strict';
  const base = new URL('.', document.currentScript.src);
  class YessuriSiteFooter extends HTMLElement {
    connectedCallback() {
      if (!this.syncAppMode) {
        this.appDisplay = matchMedia('(display-mode:standalone)');
        this.appMobile = matchMedia('(max-width:760px)');
        this.syncAppMode = () => {
          const app = this.appMobile.matches && (this.appDisplay.matches || navigator.standalone === true);
          this.toggleAttribute('app-compact', app);
          if (app) this.measureAppNav();
          else this.style.removeProperty('--app-footer-nav-height');
        };
        this.scheduleAppNav = () => {
          cancelAnimationFrame(this.navFrame);
          this.navFrame = requestAnimationFrame(this.syncAppMode);
        };
        this.navResize = new ResizeObserver(this.scheduleAppNav);
        this.navMutation = new MutationObserver(records => {
          if (records.some(record => record.target !== this && !this.contains(record.target))) this.scheduleAppNav();
        });
      }
      this.appDisplay.addEventListener('change', this.syncAppMode);
      this.appMobile.addEventListener('change', this.syncAppMode);
      window.addEventListener('resize', this.scheduleAppNav);
      window.addEventListener('load', this.scheduleAppNav);
      this.navMutation.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['class', 'style', 'hidden'] });
      this.syncAppMode();
      if (this.shadowRoot) return;
      const root = this.attachShadow({ mode: 'open' });
      const url = path => new URL(path, base).href;
      this.toggleAttribute('has-mobile-nav', !!document.querySelector('nav.mobile-nav'));
      root.innerHTML = `
        <link rel="stylesheet" href="${url('site-footer.css?v=4')}">
        <footer aria-label="사이트 하단">
          <div class="footer-inner">
            <div class="brand-block">
              <a class="brand" href="${url('index.html')}" aria-label="YESSURI 예스수리 홈">
                <img src="${url('assets/images/yessuri-ys11-brand-color.png')}" alt="YESSURI" width="235" height="81">
                <span class="korean" aria-hidden="true">예스수리</span>
              </a>
              <p class="description">부산 우리 동네 집수리 연결 플랫폼</p>
            </div>
            <div class="footer-right">
              <nav aria-label="하단 메뉴">
                <a href="${url('index.html')}">홈</a>
                <a href="${url('find.html')}">전문가 찾기</a>
                <a href="${url('guide.html')}">비용·이용안내</a>
                <a href="${url('register.html')}">기술자 등록</a>
              </nav>
              <p class="copyright">© 2026 YESSURI</p>
            </div>
          </div>
        </footer>`;
    }
    measureAppNav() {
      const nav = document.querySelector('nav.mobile-nav');
      if (nav !== this.measuredNav) {
        this.navResize.disconnect();
        this.measuredNav = nav;
        if (nav) this.navResize.observe(nav);
      }
      let height = 0;
      if (nav) {
        const style = getComputedStyle(nav);
        const rect = nav.getBoundingClientRect();
        const viewport = document.documentElement.clientHeight;
        // A DOM node alone does not mean a bottom bar covers the screen.
        if (style.position === 'fixed' && style.display !== 'none' && style.visibility === 'visible' && Number(style.opacity) > 0 &&
            rect.width > 0 && rect.height > 0 && rect.top < viewport && rect.bottom >= viewport - 1) {
          height = Math.ceil(viewport - Math.max(0, rect.top));
        }
      }
      const value = height + 'px';
      if (this.style.getPropertyValue('--app-footer-nav-height') !== value) this.style.setProperty('--app-footer-nav-height', value);
    }
    disconnectedCallback() {
      this.appDisplay?.removeEventListener('change', this.syncAppMode);
      this.appMobile?.removeEventListener('change', this.syncAppMode);
      window.removeEventListener('resize', this.scheduleAppNav);
      window.removeEventListener('load', this.scheduleAppNav);
      cancelAnimationFrame(this.navFrame);
      this.navResize?.disconnect();
      this.navMutation?.disconnect();
    }
  }
  if (!customElements.get('yessuri-site-footer')) customElements.define('yessuri-site-footer', YessuriSiteFooter);
})();
