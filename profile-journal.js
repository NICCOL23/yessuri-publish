/* Shared profile layout. Public source data is unchanged. */
(() => {
  const make=(tag,text='',className='')=>{const node=document.createElement(tag);node.textContent=text;node.className=className;return node;};
  const appendPhoto=(parent,person,photo,label)=>window.YESSURI_WORK_GALLERY.photo(parent,photo,label);
  function mount({person}) {
    if(document.body.classList.contains('profile-journal'))return;
    const root=document.querySelector('#profile-content'),hero=root.querySelector('.profile-hero');
    const about=document.querySelector('#about-heading').closest('section'),work=document.querySelector('#work-heading').closest('section');
    const facts=about.querySelector('.fact-list'),contact=root.querySelector('.contact-card');
    document.body.classList.add('profile-journal');
    const photos=[...new Map((person.workPhotos||[]).filter(p=>p.image&&p.image!==person.image).map(p=>[p.image,p])).values()];

    const masthead=make('div','','journal-masthead'),identity=make('div','','journal-identity');
    const kicker=make('p','BUSAN · TECHNICIAN JOURNAL','journal-kicker');
    const title=make('h2',person.fields[0]+' 전문가의 작업 공간','journal-title');
    const subtitle=make('p','전문 분야와 출장 지역, 공개된 작업 기록을 살펴보세요.','journal-subtitle');
    const actions=make('div','','journal-actions');
    for(const selector of ['#expert-favorite','#expert-compare','.compare-detail-link','#expert-compare-status'])actions.append(hero.querySelector(selector));
    identity.append(kicker,hero.querySelector('.profile-heading'),title,subtitle,actions,hero.querySelector('.profile-tags'));
    const cover=make('figure','','journal-cover'),coverPhoto=photos[0];
    if(coverPhoto||person.isExample!==false){
      const image=window.YESSURI_EXPERT_CARD.photo({...person,...(coverPhoto||{})});image.loading='eager';image.decoding='async';
      cover.append(image,make('figcaption',person.isExample!==false?'분야 설명용 예시 이미지 · 실제 작업 사진이 아닙니다.':(coverPhoto?.caption||'업체에서 공개 등록한 작업 사진')));
    }else{
      cover.classList.add('journal-cover-empty');
      cover.append(make('strong','작업 공간을 소개해 주세요'),make('p','공개 작업 사진을 등록하면 이곳에 표시됩니다. 대표 이미지는 프로필 상단의 작은 칸에 표시됩니다.'));
    }
    masthead.append(identity,cover);hero.replaceChildren(masthead);hero.id='journal-top';

    const nav=make('nav','','journal-nav');nav.setAttribute('aria-label',person.name+' 프로필 목차');
    for(const [id,label] of [['journal-about','소개'],['journal-stories','작업 이야기'],['journal-photos','작업 사진'],['journal-info','기본 정보']]){
      const link=make('a',label);link.href='#'+id;nav.append(link);
    }
    about.id='journal-about';about.classList.add('journal-section','journal-about');
    const aboutBody=make('div','','journal-section-body');
    const intro=document.querySelector('#expert-intro');if(!person.intro)intro.textContent='주로 하는 작업, 전문 분야와 서비스 특징을 소개해 주세요.';aboutBody.append(intro);
    about.append(aboutBody);
    const stories=make('section','','journal-section journal-stories');stories.id='journal-stories';
    const storyHeading=make('h2','작업 이야기');stories.append(storyHeading);
    const storyBody=make('div','','journal-section-body');
    storyBody.append(make('p','작업 이야기를 소개해 주세요.','journal-empty-title'),make('p','작업 전 상태, 진행 과정, 완료 결과를 사진과 함께 정리하는 공간입니다. 아직 등록된 작업 이야기가 없습니다.','journal-reading-note'));
    const cases=(person.workPhotos||[]).filter(p=>p.kind==='case');
    if(cases.length){storyBody.replaceChildren();for(const item of cases){const article=make('article','','journal-case');const heading=make('h3',item.title),date=make('time',item.date);date.dateTime=item.date;const description=make('p',item.description,'journal-case-description');article.append(heading,date,description);const gallery=make('div','','journal-photo-grid');for(const photo of (item.photos||[]).filter(p=>p.image!==person.image))appendPhoto(gallery,person,photo,item.title);article.append(gallery);storyBody.append(article);}}
    stories.append(storyBody);

    work.id='journal-photos';work.classList.add('journal-section','journal-photos');
    const workBody=make('div','','journal-section-body');
    workBody.append(work.querySelector('.section-description'),work.querySelector('.work-figure'));work.append(workBody);
    const photoGrid=work.querySelector('.work-figure');photoGrid.classList.add('journal-photo-grid');photoGrid.replaceChildren();
    const galleryPhotos=person.isExample!==false?(photos.length?photos:[person]):photos;
    if(galleryPhotos.length){for(const [index,photo] of galleryPhotos.entries())appendPhoto(photoGrid,person,photo,(person.isExample!==false?'예시 사진 ':'공개 작업 사진 ')+(index+1));}
    else{window.YESSURI_WORK_GALLERY.render(photoGrid,[]);}
    const info=make('section','','journal-section journal-info');info.id='journal-info';info.append(make('h2','기본 정보'),facts);
    if(person.isExample===false)facts.querySelector('dt').textContent='출장 가능 지역';
    if(!person.career)facts.querySelector('#expert-career').parentElement.hidden=true;
    const layout=root.querySelector('.detail-grid'),primary=root.querySelector('.detail-primary');
    const pending=primary.querySelector('.pending-card');pending.classList.add('journal-section');
    primary.replaceChildren(hero,nav,about,stories,work,info,pending,contact);
    layout.replaceChildren(primary);
    const description=document.querySelector('meta[name="description"]');
    if(description)description.content=person.name+'의 기술자 소개, 전문 분야, 출장 지역과 공개 작업 사진을 확인하세요.';
  }
  window.YESSURI_PROFILE_JOURNAL={mount};
})();

