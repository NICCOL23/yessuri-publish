// Only explicitly reviewed public fields may leave the private application flow.
export function profileFromReview(input: Record<string, unknown>, applicationId: string) {
  if (input.publicConsent !== true) throw Error('공개할 정보에 대한 신청자의 동의를 확인해 주세요.');
  const value = (key: string, min: number, max: number, label: string) => {
    if (typeof input[key] !== 'string') throw Error(label+'을 확인해 주세요.');
    const result = (input[key] as string).trim();
    if (result.length < min || result.length > max) throw Error(label+'의 길이를 확인해 주세요.');
    return result;
  };
  const list = (key: string, max: number, label: string) => {
    const items = input[key];
    if (!Array.isArray(items) || !items.length || items.length > max ||
        items.some(item => typeof item !== 'string' || !item.trim() || item.trim().length > 100)) {
      throw Error(label+'을 확인해 주세요.');
    }
    return [...new Set(items.map(item => item.trim()))];
  };
  const phonePublic = input.phonePublic === true;
  const phone = phonePublic ? value('phone', 9, 40, '공개 연락처') : null;
  if (phone && (!/^\+?[0-9 ()-]+$/.test(phone) || phone.replace(/\D/g,'').length < 9 || phone.replace(/\D/g,'').length > 15)) {
    throw Error('공개 연락처를 확인해 주세요.');
  }
  return {
    id: 'technician-'+applicationId,
    name: value('name',1,100,'공개 업체명'),
    fields: list('fields',30,'전문 분야'),
    service_areas: list('serviceAreas',30,'출장 지역'),
    intro: value('intro',0,6000,'공개 소개'),
    career: value('career',0,200,'경력'),
    profile_type: '기술자·업체',
    phone, phone_public: phonePublic,
    public_consent: true, publication_status: 'approved'
  };
}
