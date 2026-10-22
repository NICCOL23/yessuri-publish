/* Single source for the main navigation. Every page uses <yessuri-site-header>. */
(() => {
  'use strict';
  const base = new URL('.', document.currentScript.src);
  const navigation = [
    { key: 'find', href: 'find.html', label: '전문가 찾기' },
    { key: 'guide', href: 'guide.html', label: '비용·이용안내', children: [
      ['work-guide', '작업·비용 안내'], ['consultation', '상담·이용 절차'],
      ['repair-tips', '수리·관리 팁'], ['faq', '자주 묻는 질문']
    ] },
    { key: 'questions', href: 'questions.html', label: '수리 질문' },
    { key: 'technician', href: 'register.html', label: '기술자 모집·등록' }
  ];
  const url = path => new URL(path, base).href;
  class YessuriSiteHeader extends HTMLElement {
    connectedCallback() {
      const page = location.pathname.split('/').pop() || 'index.html';
      const group = /^(find|expert|favorites|compare|case|cases|request)\.html$/.test(page) ? 'find'
        : /^(guide|service-detail|computer-guide|boiler-guide)\.html$/.test(page) ? 'guide'
        : /^(questions?|question-.+|questions-example|board-notice)\.html$/.test(page) ? 'questions'
        : /^(technician-.+|register|register-form)\.html$/.test(page) ? 'technician' : '';
      const root = this.shadowRoot || this.attachShadow({ mode: 'open' });
      root.innerHTML = `
        <link rel="stylesheet" href="${url('site-header.css?v=2')}">
        <header aria-label="사이트 상단">
          <div class="header-inner">
            <a class="brand" href="${url('index.html#top')}" aria-label="YESSURI 예스수리 홈">
              <img src="${url('assets/images/yessuri-ys11-brand-color.png')}" alt="YESSURI" width="235" height="81">
              <span aria-hidden="true">예스수리</span>
            </a>
            <button class="menu-toggle" type="button" aria-controls="home-menu" aria-expanded="false" aria-label="메뉴 열기"><span aria-hidden="true">☰</span></button>
            <nav id="home-menu" aria-label="주요 메뉴">
              ${navigation.map(item => {
                const current = group === item.key ? ` aria-current="${page === item.href ? 'page' : 'location'}"` : '';
                const link = `<a class="nav-link${item.key === 'technician' ? ' register-link' : ''}" href="${url(item.href)}"${current}>${item.label}</a>`;
                return item.children ? `<div class="guide-nav">${link}<button class="guide-toggle" type="button" aria-label="비용·이용안내 하위 메뉴" aria-controls="guide-submenu" aria-expanded="false"><span class="chevron" aria-hidden="true"></span></button><div id="guide-submenu" hidden>${item.children.map(([id, label]) => `<a href="${url(item.href + '#' + id)}">${label}</a>`).join('')}</div></div>` : link;
              }).join('')}
            </nav>
          </div>
        </header>`;
      const toggle = root.querySelector('.menu-toggle');
      const menu = root.querySelector('nav');
      const guide = root.querySelector('.guide-nav');
      const guideToggle = root.querySelector('.guide-toggle');
      const submenu = root.querySelector('#guide-submenu');
      const desktop = matchMedia('(min-width:901px)');
      let timer;
      let openedByHover = false;
      const showGuide = open => {
        clearTimeout(timer);
        if (!open) openedByHover = false;
        submenu.hidden = !open;
        guideToggle.setAttribute('aria-expanded', String(open));
      };
      const closeMenu = (restoreFocus = false) => {
        menu.classList.remove('is-open');
        toggle.setAttribute('aria-expanded', 'false');
        toggle.setAttribute('aria-label', '메뉴 열기');
        showGuide(false);
        if (restoreFocus) toggle.focus();
      };
      toggle.addEventListener('click', () => {
        const open = toggle.getAttribute('aria-expanded') !== 'true';
        menu.classList.toggle('is-open', open);
        toggle.setAttribute('aria-expanded', String(open));
        toggle.setAttribute('aria-label', open ? '메뉴 닫기' : '메뉴 열기');
        if (!open) showGuide(false);
      });
      guideToggle.addEventListener('click', () => {
        if (openedByHover) { openedByHover = false; showGuide(true); }
        else showGuide(submenu.hidden);
      });
      guideToggle.addEventListener('keydown', event => {
        if (event.key === 'ArrowDown') {
          event.preventDefault(); showGuide(true); submenu.querySelector('a').focus();
        }
      });
      guide.addEventListener('mouseenter', () => {
        if (desktop.matches && matchMedia('(hover:hover)').matches && submenu.hidden) {
          showGuide(true); openedByHover = true;
        }
      });
      guide.addEventListener('mouseleave', () => { if (desktop.matches) timer = setTimeout(() => showGuide(false), 180); });
      guide.addEventListener('focusout', () => requestAnimationFrame(() => {
        if (!guide.contains(root.activeElement)) showGuide(false);
      }));
      root.addEventListener('keydown', event => {
        if (event.key !== 'Escape') return;
        if (!submenu.hidden) { showGuide(false); guideToggle.focus(); }
        else if (toggle.getAttribute('aria-expanded') === 'true') closeMenu(true);
      });
      menu.addEventListener('click', event => { if (event.target.closest('a')) closeMenu(); });
      root.addEventListener('click', event => { if (!guide.contains(event.target)) showGuide(false); });
      this._controller = new AbortController();
      const { signal } = this._controller;
      document.addEventListener('click', event => { if (!event.composedPath().includes(this)) closeMenu(); }, { signal });
      this.addEventListener('focusout', () => requestAnimationFrame(() => {
        if (document.activeElement !== this) closeMenu();
      }), { signal });
      desktop.addEventListener('change', () => closeMenu(), { signal });
    }
    disconnectedCallback() { this._controller?.abort(); }
  }
  if (!customElements.get('yessuri-site-header')) customElements.define('yessuri-site-header', YessuriSiteHeader);
})();
