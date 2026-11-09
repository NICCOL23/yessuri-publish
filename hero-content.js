/* Published first-hero content. Original markup remains the fallback. */
(() => {
  'use strict';
  if (new URLSearchParams(location.search).get('hero-preview') === '1') return;
  const endpoint = 'https://buotlfllagjwxopnbeit.supabase.co/functions/v1/technician-api';
  const publicKey = 'sb_publishable_RDIjcpao1xq8Nb1kSow03g_-uDDaxMy';
  const panel = document.getElementById('hero-panel-1');
  if (!panel) return;
  function imageAddress(value) {
    if (typeof value !== 'string') throw Error('Invalid image');
    if (/^\/assets\/images\/[a-zA-Z0-9_./-]+\.(webp|jpg|png)$/i.test(value) && !value.includes('..')) return value;
    const route = /^\/api\/hero-images\/[a-f0-9-]{36}\.jpg$/i.test(value) ? value : null;
    if (route) return endpoint + '?route=' + encodeURIComponent(route);
    const parsed = new URL(value);
    if (parsed.origin !== new URL(endpoint).origin || parsed.pathname !== new URL(endpoint).pathname ||
        !/^\/api\/hero-images\/[a-f0-9-]{36}\.jpg$/i.test(parsed.searchParams.get('route') || '')) throw Error('Invalid image');
    return parsed.href;
  }
  function buttonAddress(value) {
    if (typeof value !== 'string') throw Error('Invalid link');
    if (/^\/?[a-zA-Z0-9_-]+\.html(?:[?#][^\s\\]*)?$/.test(value)) return value;
    const parsed = new URL(value);
    if (!['https:', 'http:'].includes(parsed.protocol) || parsed.username || parsed.password) throw Error('Invalid link');
    return parsed.href;
  }
  async function load() {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);
    try {
      const response = await fetch(endpoint + '?route=' + encodeURIComponent('/api/hero-content'), {
        headers: {apikey: publicKey}, credentials: 'omit', cache: 'no-store', signal: controller.signal,
      });
      if (!response.ok) return;
      const data = await response.json();
      const content = data.content;
      if (!content) return;
      for (const name of ['badge','title1','title2','description1','description2','buttonText','alt']) {
        if (typeof content[name] !== 'string' || !content[name].trim() || content[name].length > 200) return;
      }
      const desktop = imageAddress(content.desktopImage);
      const mobile = imageAddress(content.mobileImage);
      const href = buttonAddress(content.buttonHref);
      const badge = panel.querySelector('.local-service-badge');
      const icon = badge.querySelector('svg');
      badge.replaceChildren(...(icon ? [icon] : []), document.createTextNode(content.badge));
      const heading = panel.querySelector('#hero-heading');
      const second = document.createElement('span');
      second.textContent = content.title2;
      heading.replaceChildren(document.createTextNode(content.title1), second);
      panel.querySelector('.hero-description').replaceChildren(
        document.createTextNode(content.description1), document.createElement('br'), document.createTextNode(content.description2),
      );
      const button = panel.querySelector('.home-quote');
      button.textContent = content.buttonText;
      button.setAttribute('href', href);
      for (const picture of [panel.querySelector('picture'), document.querySelector('.full-bg-scene')]) {
        if (!picture) continue;
        picture.querySelector('source')?.setAttribute('srcset', desktop);
        const image = picture.querySelector('img');
        image.src = mobile;
        if (picture.closest('#hero-panel-1')) image.alt = content.alt;
      }
      window.dispatchEvent(new Event('resize'));
    } catch {
      // An unavailable content service leaves the original first hero usable.
    } finally { clearTimeout(timeout); }
  }
  load();
})();
