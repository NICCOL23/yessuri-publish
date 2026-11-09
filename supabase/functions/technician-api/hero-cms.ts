type HeroDependencies = {
    db: any;
    slide?: number;
    bucket: string;
    admin: (request: Request) => Promise<{ hash: string }>;
    decode: (photo: unknown) => Promise<Uint8Array>;
    sha: (value: string) => Promise<string>;
};
const uuidPattern = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/;
const fileRoutePattern = /^\/api\/hero-images\/([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})\.jpg$/;
function fail(message: string, status = 400): never {
    throw Object.assign(new Error(message), { status });
}
function requireValue(value: unknown, message: string, status = 400): asserts value {
    if (!value) fail(message, status);
}

export function validateHeroContent(input: unknown) {
    requireValue(input && typeof input === 'object' && !Array.isArray(input), '히어로 내용을 확인해 주세요.');
    const source = input as Record<string, unknown>;
    const limits: Record<string, number> = {
        badge: 40, title1: 40, title2: 40, description1: 100, description2: 100,
        buttonText: 24, buttonHref: 300, desktopImage: 300, mobileImage: 300, alt: 160,
    };
    requireValue(Object.keys(source).length === Object.keys(limits).length, '히어로 항목을 확인해 주세요.');
    const content: Record<string, string> = {};
    for (const [field, maximum] of Object.entries(limits)) {
        const value = source[field];
        requireValue(typeof value === 'string' && value.trim().length > 0 && value.length <= maximum && !/[\u0000-\u001f\u007f]/.test(value), '입력 길이와 필수 항목을 확인해 주세요.');
        content[field] = value.trim();
    }
    const href = content.buttonHref;
    if (/^https?:\/\//.test(href)) {
        let url: URL;
        try { url = new URL(href); } catch { fail('버튼 연결 주소를 확인해 주세요.'); }
        requireValue(['http:', 'https:'].includes(url.protocol) && !url.username && !url.password
            && /^[a-zA-Z0-9.-]+$/.test(url.hostname)
            && /^https?:\/\/[a-zA-Z0-9.-]+(?::[0-9]{1,5})?(?:[/?#][a-zA-Z0-9_~!$&()*+,;=:@%/?#.-]*)?$/.test(href), '버튼 연결 주소를 확인해 주세요.');
    } else {
        requireValue(/^\/?[a-zA-Z0-9_-]+\.html(?:[?#][a-zA-Z0-9_~!$&()*+,;=:@%/?#.-]*)?$/.test(href), '내부 HTML 페이지 또는 http·https 주소를 입력해 주세요.');
    }
    const originalImages = new Set([
        '/assets/images/hero-branded-20261020-v1/home-desktop.webp',
        '/assets/images/hero-branded-20261020-v1/home-mobile.webp',
        '/assets/images/hero-branded-20261020-v1/interior-desktop.webp',
        '/assets/images/hero-branded-20261020-v1/interior-mobile.webp',
        '/assets/images/hero-tv-20261021-v1/devices-tv-desktop.webp',
        '/assets/images/hero-tv-20261021-v1/devices-tv-mobile.webp',
    ]);
    for (const field of ['desktopImage', 'mobileImage']) {
        requireValue(originalImages.has(content[field]) || fileRoutePattern.test(content[field]), '관리자에서 올린 히어로 사진을 선택해 주세요.');
    }
    return content;
}

async function heroRpc(dependencies: HeroDependencies, operation: string, payload: Record<string, unknown> = {}) {
    const { data, error } = await dependencies.db.rpc(dependencies.slide && dependencies.slide > 1 && ['state','published','draft','publish','restore'].includes(operation) ? 'technician_hero_cms_slide'+dependencies.slide+'_v1' : 'technician_hero_cms_v1', { op: operation, p: payload });
    if (error) {
        const message = String(error.message || '');
        if (message.includes('permission denied')) fail('관리자 로그인이 필요합니다.', 403);
        if (message.includes('version conflict')) fail('다른 화면에서 내용이 바뀌었습니다. 새로고침 후 확인해 주세요.', 409);
        if (message.includes('command conflict')) fail('재시도 내용이 달라졌습니다. 현재 내용을 다시 확인해 주세요.', 409);
        if (message.includes('not found')) fail('요청한 히어로 자료를 찾을 수 없습니다.', 404);
        if (message.includes('invalid hero')) fail('히어로 입력 내용과 사진을 확인해 주세요.');
        fail('히어로 자료를 처리하지 못했습니다. 현재 상태를 다시 확인해 주세요.', 500);
    }
    return data;
}

async function heroImage(dependencies: HeroDependencies, id: string, hash?: string) {
    const metadata = await heroRpc(dependencies, hash ? 'private-image' : 'public-image', { id, hash });
    requireValue(metadata?.path === 'hero-content/' + id + '.jpg', '히어로 사진 경로를 확인하지 못했습니다.', 500);
    const { data, error } = await dependencies.db.storage.from(dependencies.bucket).download(metadata.path);
    requireValue(data && !error, '히어로 사진을 읽을 수 없습니다.', 404);
    return new Response(data, { headers: {
        'Content-Type': 'image/jpeg', 'Cache-Control': 'no-store',
        'X-Content-Type-Options': 'nosniff',
    } });
}

export async function heroCmsRoute(request: Request, route: string, input: unknown, dependencies: HeroDependencies): Promise<unknown | Response | undefined> {
    const slide = Number(new URL(request.url).searchParams.get('slide') || '1');
    if (route.startsWith('/api/hero') || route.startsWith('/api/admin/hero')) requireValue([1,2,3].includes(slide), '히어로 선택을 확인해 주세요.');
    dependencies = {...dependencies, slide};
    if (route === '/api/hero-content') {
        requireValue(request.method === 'GET', '지원하지 않는 요청입니다.', 405);
        return heroRpc(dependencies, 'published');
    }
    const publicImage = route.match(fileRoutePattern);
    if (publicImage) {
        requireValue(request.method === 'GET', '지원하지 않는 요청입니다.', 405);
        return heroImage(dependencies, publicImage[1]);
    }
    const privateImage = route.match(/^\/api\/admin\/hero\/images\/([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})\.jpg$/);
    const action = route.match(/^\/api\/admin\/hero\/(draft|publish|restore|image)$/)?.[1];
    if (route !== '/api/admin/hero' && !privateImage && !action) return undefined;
    const session = await dependencies.admin(request);
    if (privateImage) {
        requireValue(request.method === 'GET', '지원하지 않는 요청입니다.', 405);
        return heroImage(dependencies, privateImage[1], session.hash);
    }
    if (route === '/api/admin/hero') {
        requireValue(request.method === 'GET', '지원하지 않는 요청입니다.', 405);
        return heroRpc(dependencies, 'state', { hash: session.hash });
    }
    requireValue(request.method === 'POST' && input && typeof input === 'object' && !Array.isArray(input), '입력 내용을 확인해 주세요.');
    const payload = input as Record<string, unknown>;
    requireValue(typeof payload.operationId === 'string' && uuidPattern.test(payload.operationId), '요청 식별자를 확인해 주세요.');
    const operationId = payload.operationId;
    const requestDigest = await dependencies.sha(route + '?slide='+slide + '\n' + JSON.stringify({ ...payload, operationId: undefined }));
    const common = { hash: session.hash, operationId, requestDigest };
    if (action === 'image') {
        const bytes = await dependencies.decode(payload.photo);
        const stage = await heroRpc(dependencies, 'stage-image', common);
        requireValue(stage?.path === 'hero-content/' + operationId + '.jpg', '히어로 사진 경로를 확인하지 못했습니다.', 500);
        if (stage.status !== 'ready') {
            const { error } = await dependencies.db.storage.from(dependencies.bucket).upload(stage.path, bytes, { contentType: 'image/jpeg', upsert: false });
            if (error && !['409', 'Duplicate'].includes(String(error.statusCode || error.error))) fail('사진을 올리지 못했습니다. 같은 요청으로 다시 시도해 주세요.', 500);
            await heroRpc(dependencies, 'ready-image', { ...common, bytes: bytes.length });
        }
        return {
            id: operationId,
            path: '/api/hero-images/' + operationId + '.jpg',
            privatePath: '/api/admin/hero/images/' + operationId + '.jpg',
        };
    }
    requireValue(Number.isSafeInteger(payload.version) && Number(payload.version) > 0, '현재 편집 버전을 확인해 주세요.');
    const changes: Record<string, unknown> = { ...common, version: payload.version };
    if (action === 'draft') changes.content = validateHeroContent(payload.content);
    if (action === 'restore') {
        requireValue(typeof payload.revisionId === 'string' && uuidPattern.test(payload.revisionId), '복원할 버전을 선택해 주세요.');
        changes.revisionId = payload.revisionId;
    }
    return heroRpc(dependencies, action!, changes);
}
