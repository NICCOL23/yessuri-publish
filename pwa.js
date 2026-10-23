(() => {
  'use strict';
  const base = new URL('.', document.currentScript.src);
  const standalone = () => matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
  let promptEvent;
  window.addEventListener('beforeinstallprompt', event => {
    event.preventDefault(); promptEvent = event;
    window.dispatchEvent(new Event('yessuri-install-ready'));
  });
  window.addEventListener('appinstalled', () => {
    promptEvent = null;
    document.querySelectorAll('yessuri-site-header').forEach(el => el.shadowRoot?.querySelector('.pwa-install')?.setAttribute('hidden', ''));
  });
  window.YessuriPWA = {
    standalone,
    async install() {
      if (!promptEvent) { location.href = new URL('install.html', base).href; return; }
      const pending = promptEvent; promptEvent = null;
      await pending.prompt(); await pending.userChoice;
    }
  };
  if ('serviceWorker' in navigator && window.isSecureContext) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register(new URL('sw.js', base), {scope: base.pathname, updateViaCache: 'none'})
        .then(reg => reg.update().catch(() => {})).catch(() => {});
    });
  }
})();
