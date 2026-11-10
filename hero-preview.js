(() => {
    'use strict';
    const selectedSlide=Number(new URLSearchParams(location.search).get('slide')||1);
    const config = window.YESSURI_TECHNICIAN;
    const status = document.getElementById('preview-status');
    const frame = document.getElementById('site-preview');
    const urls = new Set();
    let locked = false;
    function endpoint(route) {
        return config.endpoint + '?route=' + encodeURIComponent(route)+'&slide='+selectedSlide;
    }
    function headers() {
        let session;
        try { session = JSON.parse(sessionStorage.getItem('technician-admin') || 'null'); } catch { session = null; }
        return {apikey:config.publishableKey,'x-admin-token':session?.token || ''};
    }
    function clear() {
        locked = true;
        frame.src = 'about:blank';
        frame.hidden = true;
        for (const url of urls) URL.revokeObjectURL(url);
        urls.clear();
    }
    window.addEventListener('yessuri:admin-locked', clear);
    window.addEventListener('pagehide', clear);
    async function imageSource(path) {
        if (!path.startsWith('/api/hero-images/')) return path.replace(/^\//,'');
        const response = await fetch(endpoint(path.replace('/api/hero-images/','/api/admin/hero/images/')), {
            headers:headers(),credentials:'omit',cache:'no-store',
        });
        if (!response.ok) throw new Error('초안 사진을 불러오지 못했습니다.');
        const url = URL.createObjectURL(await response.blob());
        if (locked) { URL.revokeObjectURL(url); throw new Error('관리자 화면이 잠겼습니다.'); }
        urls.add(url);
        return url;
    }
    function apply(content, desktop, mobile) {
        const doc = frame.contentDocument;
        const panel = doc.getElementById('hero-panel-'+selectedSlide);
        if (!panel) throw new Error('미리보기 화면을 준비하지 못했습니다.');
        const badge = panel.querySelector('.local-service-badge');
        const badgeIcon = badge.querySelector('svg');
        badge.replaceChildren(...(badgeIcon ? [badgeIcon,doc.createTextNode(content.badge)] : [doc.createTextNode(content.badge)]));
        const heading = panel.querySelector('h1,h2');
        const accent = doc.createElement('span');
        accent.textContent = content.title2;
        heading.replaceChildren(doc.createTextNode(content.title1),accent);
        const description = panel.querySelector('.hero-description');
        description.replaceChildren(doc.createTextNode(content.description1),doc.createElement('br'),doc.createTextNode(content.description2));
        frame.contentWindow.YESSURI_TEXT_COLOR?.hero(panel,content.textColors);
        const button = panel.querySelector('.home-quote');
        button.textContent = content.buttonText;
        button.setAttribute('href',content.buttonHref);
        const source = panel.querySelector('picture source');
        const image = panel.querySelector('picture img');
        source.srcset = desktop;
        image.src = mobile;
        image.alt = content.alt;
        const background = doc.querySelectorAll('.full-bg-scene')[selectedSlide-1];
        if (background) {
            background.querySelector('source').srcset = desktop;
            background.querySelector('img').src = mobile;
        }
    }
    async function start() {
        try {
            const response = await fetch(endpoint('/api/admin/hero'),{headers:headers(),credentials:'omit',cache:'no-store'});
            const state = await response.json();
            if (!response.ok) throw new Error('관리자 로그인을 확인해 주세요.');
            const mode = new URLSearchParams(location.search).get('mode') === 'draft' ? 'draft' : 'published';
            const content = state[mode];
            const [desktop,mobile] = await Promise.all([imageSource(content.desktopImage),imageSource(content.mobileImage)]);
            if (locked) return;
            frame.onload = () => {
                if (locked) return;
                try {
                    apply(content,desktop,mobile);
                    frame.contentDocument.querySelector('.hero-swiper')?.swiper?.slideTo(selectedSlide-1,0);
                    status.textContent = mode === 'draft' ? '저장한 초안 미리보기 · 아직 홈페이지에 게시되지 않은 내용입니다.' : '현재 게시본 미리보기';
                    frame.hidden = false;
                } catch (error) { status.textContent = error.message; }
            };
            frame.src = 'index.html?hero-preview=1';
        } catch (error) {
            if (locked) return;
            status.textContent = error.message;
            const link = document.createElement('a');
            link.href = 'technician-admin.html';
            link.textContent = '관리자 첫 화면에서 로그인';
            document.getElementById('root').append(link);
        }
    }
    start();
})();
