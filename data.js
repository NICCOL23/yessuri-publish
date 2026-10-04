// 화면 확인용 예시 데이터입니다. 실제 등록 기술자 정보가 아닙니다.
window.YESSURI_EXPERTS = [
  {
    id:'bada-repair', name:'바다 집수리', serviceAreas:['해운대구','수영구','기장군'], profileType:'개인 기술자 유형', publicationStatus:'approved', phonePublic:false,
    fields:['누수·수도','하수구·변기'], career:'경력 8년', icon:'💧',
    image:'expert-water.webp', imageAlt:'싱크대 배관을 살피는 기술자 예시 일러스트',
    intro:'싱크대 배관, 수도 설비, 하수구 문제를 살펴보는 집수리 분야의 예시 프로필입니다.'
  },
  {
    id:'tile-studio', name:'동네 타일공방', serviceAreas:['수영구','남구','해운대구'], profileType:'사업자·업체 유형', publicationStatus:'approved', phonePublic:false,
    fields:['타일','문·창호'], career:'경력 12년', icon:'▦',
    image:'expert-tile.webp', imageAlt:'욕실 타일을 시공하는 기술자 예시 일러스트',
    intro:'욕실과 주방의 타일 보수 작업을 소개하기 위한 예시 프로필입니다.'
  },
  {
    id:'bright-home', name:'밝은 집 케어', serviceAreas:['남구','수영구'], profileType:'개인 기술자 유형', publicationStatus:'approved', phonePublic:false,
    fields:['전기·조명','에어컨'], career:'경력 6년', icon:'✳',
    image:'expert-light.webp', imageAlt:'실내 조명을 설치하는 기술자 예시 일러스트',
    intro:'실내 조명과 에어컨 관련 작업을 소개하기 위한 예시 프로필입니다.'
  },
  {
    id:'busan-home-repair', name:'부산 홈리페어', serviceAreas:['부산진구','연제구','동래구'], profileType:'사업자·업체 유형', publicationStatus:'approved', phonePublic:false,
    fields:['페인트','목공'], career:'경력 10년', icon:'⌑',
    image:'expert-paintwood.webp', imageAlt:'페인트와 목공 작업을 하는 기술자 예시 일러스트',
    intro:'벽면 페인트와 생활 목공 작업을 소개하기 위한 예시 프로필입니다.'
  },
  {
    id:'clean-day', name:'깨끗한 하루', serviceAreas:['동래구','금정구','연제구'], profileType:'개인 기술자 유형', publicationStatus:'approved', phonePublic:false,
    fields:['청소','철거'], career:'경력 5년', icon:'✧',
    image:'expert-clean.webp', imageAlt:'집을 청소하는 전문가 예시 일러스트',
    intro:'집 안 청소와 정리 작업을 소개하기 위한 예시 프로필입니다.'
  },
  {
    id:'local-it', name:'우리동네 IT', serviceAreas:['해운대구','기장군'], profileType:'사업자·업체 유형', publicationStatus:'approved', phonePublic:false,
    fields:['컴퓨터·IT'], career:'경력 7년', icon:'⌘',
    image:'expert-it.webp', imageAlt:'컴퓨터를 점검하는 기술자 예시 일러스트',
    intro:'가정용 컴퓨터 점검과 간단한 IT 도움을 소개하기 위한 예시 프로필입니다.'
  }
];

// 정적 시안의 표시 기준입니다. 실제 승인·비공개 통제는 서버에서 처리해야 합니다.
window.YESSURI_IS_PUBLIC_EXPERT = person => person?.publicationStatus === 'approved';
window.YESSURI_PUBLIC_EXPERTS = () => window.YESSURI_EXPERTS.filter(window.YESSURI_IS_PUBLIC_EXPERT);
window.YESSURI_SERVES_REGION = (person, region) => region === '전체' || person.serviceAreas?.includes(region) === true;
window.YESSURI_AREAS_LABEL = person => person.serviceAreas?.join(' · ') || '지역 미설정';

// 공개 승인, 실제 번호, 공개 동의가 모두 있는 프로필에만 전화 연결을 허용합니다.
window.YESSURI_PHONE_HREF = function (person) {
  if (!window.YESSURI_IS_PUBLIC_EXPERT(person) || person.phonePublic !== true || typeof person.phone !== 'string') return null;
  const raw = person.phone.trim();
  if (!/^\+?[0-9 ()-]+$/.test(raw)) return null;
  const digits = raw.replace(/\D/g, '');
  if (digits.length < 9 || digits.length > 15) return null;
  return `tel:${raw.startsWith('+') ? '+' : ''}${digits}`;
};
