/* Shared footer: edit this template once to update every page instance. */
(() => {
  'use strict';
  const base = new URL('.', document.currentScript.src);
  class YessuriSiteFooter extends HTMLElement {
    connectedCallback() {
      if (this.shadowRoot) return;
      const root = this.attachShadow({ mode: 'open' });
      const url = path => new URL(path, base).href;
      this.toggleAttribute('has-mobile-nav', !!document.querySelector('nav.mobile-nav'));
      root.innerHTML = `
        <link rel="stylesheet" href="${url('site-footer.css?v=2')}">
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
  }
  if (!customElements.get('yessuri-site-footer')) customElements.define('yessuri-site-footer', YessuriSiteFooter);
})();
