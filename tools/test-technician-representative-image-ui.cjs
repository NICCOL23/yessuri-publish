// Local browser integration with fixture data only; no production reads or writes.
const fs=require('fs'),path=require('path'),http=require('http'),assert=require('node:assert/strict');
const {chromium}=require(process.env.YESSURI_PLAYWRIGHT_MODULE||'playwright');
const root=path.resolve(__dirname,'..'),id='12345678-1234-1234-1234-123456789abc',photoId='22222222-2222-4222-8222-222222222222';
const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a3ioAAAAASUVORK5CYII=','base64');
const server=http.createServer((req,res)=>{
 const name=new URL(req.url,'http://test').pathname;
 if(name==='/published.png'){res.writeHead(200,{'content-type':'image/png'});res.end(png);return;}
 const file=path.resolve(root,'.'+name);if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return;}
 fs.readFile(file,(err,data)=>{res.writeHead(err?404:200,{'content-type':({'.html':'text/html','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.png':'image/png','.webp':'image/webp'})[path.extname(file)]||'application/octet-stream'});res.end(err?'missing':data)});
});
(async()=>{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const origin='http://127.0.0.1:'+server.address().port;
 const browser=await chromium.launch({channel:'msedge',headless:true});
 try{
  const context=await browser.newContext({viewport:{width:1440,height:1000},serviceWorkers:'block'});
  await context.addInitScript(()=>{window.TECHNICIAN_CLOUD_TEST=true;sessionStorage.setItem('technician-admin',JSON.stringify({token:'a'.repeat(64),expiresAt:Date.now()+600000}));});
  let published=false,posts=0,fail=false;
  const profile=()=>({id:'technician-'+id,name:'시험 업체',fields:['컴퓨터·IT'],serviceAreas:['전체'],image:published?origin+'/published.png':null,imageAlt:'시험 업체 대표 이미지',isExample:false,publicationStatus:'approved',intro:'소개',phonePublic:false});
  await context.route('**/*',route=>{
   const url=new URL(route.request().url());if(url.origin===origin)return route.continue();
   if(url.pathname.endsWith('/search_public_experts'))return route.fulfill({json:{items:[profile()],total:1,totalPublic:1,page:1}});
   if(url.pathname.endsWith('/technician-api')){
    const api=url.searchParams.get('route')||'';
    if(api.includes('/photos/'))return route.fulfill({body:png,contentType:'image/png'});
    if(api.endsWith('/representative-image')){posts++;const body=route.request().postDataJSON();assert.equal(body.photoId,photoId);assert.equal(body.imageConsent,true);if(fail)return route.fulfill({status:409,json:{error:'먼저 공개 프로필을 등록해 주세요.'}});published=true;return route.fulfill({json:{profile:profile()}});}
    if(api.endsWith('/public-profile'))return route.fulfill({json:{profile:profile()}});
    return route.fulfill({json:{application:{id,version:3,company:'시험 업체',contact:'담당',phone:'01012345678',fields:'컴퓨터·IT',areas:'전체',status:'접수',created_at:new Date().toISOString(),expires_at:new Date().toISOString()},photos:[{id:photoId,url:'/api/photos/'+photoId}],messages:[],history:[]}});
   }
   return route.abort();
  });
  const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(origin+'/technician-detail.html?id='+id+'&admin=1');
  const button=page.getByRole('button',{name:'첨부사진 1 대표 이미지로 등록',exact:true});await button.waitFor();assert.equal(posts,0);
  page.once('dialog',dialog=>dialog.dismiss());await button.click();assert.equal(posts,0,'cancel must not publish');
  fail=true;page.once('dialog',dialog=>dialog.accept());await button.click();await page.getByText('먼저 공개 프로필을 등록해 주세요.',{exact:true}).waitFor();assert.equal(await button.isEnabled(),true);
  fail=false;page.once('dialog',dialog=>dialog.accept());await button.click();await page.getByText('대표 이미지 등록됨',{exact:true}).waitFor();assert.equal(posts,2);
  await page.goto(origin+'/expert.html?id=technician-'+id);await page.locator('#expert-icon img').waitFor();
  assert.equal(await page.locator('#expert-icon img').getAttribute('src'),origin+'/published.png');assert.equal(await page.locator('#work-heading').innerText(),'작업 사진');assert.equal(await page.locator('.work-figure img').count(),0);await page.getByText('등록된 작업 사진이 없습니다.',{exact:true}).waitFor();
  await page.goto(origin+'/index.html');const card=page.locator('#expert-grid .ys-expert-card').filter({hasText:'시험 업체'});await card.waitFor();assert.equal(await card.locator('img').getAttribute('src'),origin+'/published.png');
  await page.goto(origin+'/technician-detail.html?id='+id);await page.locator('.file-grid').first().waitFor();assert.equal(await page.getByRole('button',{name:'첨부사진 1 대표 이미지로 등록',exact:true}).count(),0);
  assert.deepEqual(errors,[]);console.log('PASS: admin attachment button, cancel, error recovery, explicit selected image, profile avatar and image, homepage card, no owner publication button');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1}).finally(()=>server.close());
