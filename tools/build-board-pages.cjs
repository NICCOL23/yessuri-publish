const fs=require('fs'),path=require('path'),root=path.resolve(__dirname,'..');
const source=fs.readFileSync(path.join(root,'index.html'),'utf8');
const header=source.match(/<header class="site-header home-header">[\s\S]*?<\/header>/)[0].replace('href="#top"','href="index.html"');
const footer=source.match(/<footer id="home-footer">[\s\S]*?<\/footer>/)[0].replaceAll('href="#top"','href="index.html"').replace('현재는 예시 프로필을 확인하는 시안입니다. 실제 접수·연락 기능은 준비 중입니다.','업체 프로필은 예시입니다. 수리 질문은 게시판에서 접수하며, 실제 작업·거래 조건은 업체와 확인해 주세요.');
for(const[name,mode,title]of [['questions','list','수리 질문'],['question-write','write','질문하기'],['question','detail','질문 상세'],['board-notice','notice','게시판 이용·보관 안내'],['question-admin','admin','답변 관리'],['questions-example','examples','수리 질문 운영 확인용 예시']]){
const html=`<!doctype html>
<html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title} | YESSURI</title><meta name="description" content="부산 집수리부터 컴퓨터까지, 회원가입 없이 질문하고 게시판에서 답변을 확인하세요.">${['admin','write','examples'].includes(mode)?'<meta name="robots" content="noindex,nofollow">':''}
<link rel="icon" href="assets/icons/favicon.ico"><link rel="stylesheet" href="styles.css?v=12"><link rel="stylesheet" href="home-refresh.css?v=3"><link rel="stylesheet" href="header-brand-ys11.css?v=1"><link rel="stylesheet" href="home-end.css?v=1"><link rel="stylesheet" href="guide-subnav.css?v=2"><link rel="stylesheet" href="board-navigation.css?v=1"><link rel="stylesheet" href="board.css?v=1">
<script src="home-refresh.js?v=1" defer></script><script src="guide-subnav.js?v=2" defer></script><script src="board-navigation.js?v=1" defer></script><script src="regions.js?v=1" defer></script><script src="work-guide-catalog.js?v=2" defer></script><script src="board-config.js?v=1" defer></script><script src="board.js?v=1" defer></script>${mode==='examples'?'<script src="board-examples.js?v=1" defer></script>':''}</head><body class="board-page" data-board-page="${mode}"><a class="skip-link" href="#board-root">본문 바로가기</a>${header}<main class="board" id="board-root"><p>화면을 준비하고 있습니다.</p><noscript>수리 질문 게시판을 사용하려면 JavaScript를 켜주세요.</noscript></main>${footer}</body></html>\n`;
fs.writeFileSync(path.join(root,name+'.html'),html);
}
console.log('6 board pages generated with existing header/footer markup.');
const catalog=JSON.parse(fs.readFileSync(path.join(root,'data/work-catalog.json'),'utf8'));
fs.writeFileSync(path.join(root,'supabase/functions/board-api/catalog.json'),JSON.stringify(catalog.tasks.map(t=>({id:t.id,group_id:catalog.fields.find(f=>f.id===t.fieldId).groupId}))));
