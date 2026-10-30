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
  let posts=0,fail=false;let gallery=[{image:origin+'/published.png?initial=1',imageAlt:'기존 사진'}],selected=gallery[0].image;
  const profile=()=>({id:'technician-'+id,name:'시험 업체',fields:['컴퓨터·IT'],serviceAreas:['전체'],image:selected,workPhotos:gallery,imageAlt:'시험 업체 대표 이미지',isExample:false,publicationStatus:'approved',intro:'소개',phonePublic:false});
  await context.route('**/*',route=>{
   const url=new URL(route.request().url());if(url.origin===origin)return route.continue();
   if(url.pathname.endsWith('/search_public_experts'))return route.fulfill({json:{items:[profile()],total:1,totalPublic:1,page:1}});
   if(url.pathname.endsWith('/technician-api')){
    const api=url.searchParams.get('route')||'';
    if(api.includes('/photos/'))return route.fulfill({body:png,contentType:'image/png'});
    if(api.endsWith('/public-photos')){
     if(route.request().method()==='POST'){
      posts++;const body=route.request().postDataJSON();
      if(fail)return route.fulfill({status:500,json:{error:'저장 실패'}});
      if(body.action==='upload'){assert.equal(body.imageConsent,true);assert.equal(body.photo.type,'image/jpeg');assert.ok(body.photo.data.length>0);gallery.push({image:origin+'/published.png?new='+posts,imageAlt:'추가 사진'});}
      if(body.action==='select')selected=body.image;
      if(body.action==='delete'){assert.equal(body.confirm,true);gallery=gallery.filter(p=>p.image!==body.image);if(selected===body.image)selected=null;}
     }
     return route.fulfill({json:{photos:gallery,image:selected}});
    }
    if(api.endsWith('/public-profile'))return route.fulfill({json:{profile:profile()}});
    return route.fulfill({json:{application:{id,version:3,company:'시험 업체',contact:'담당',phone:'01012345678',fields:'컴퓨터·IT',areas:'전체',status:'접수',created_at:new Date().toISOString(),expires_at:new Date().toISOString()},photos:[{id:photoId,url:'/api/photos/'+photoId}],messages:[],history:[]}});
   }
   return route.abort();
  });
  const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(origin+'/technician-detail.html?id='+id+'&admin=1');
  const manager=page.locator('#admin-public-photos');await manager.getByText('현재 대표 이미지',{exact:true}).waitFor();
  assert.equal(await page.locator('#root > .layout > div > section.card').first().locator('figure.photo').count(),1);
  const fileBytes=await page.evaluate(()=>{const c=document.createElement('canvas');c.width=40;c.height=40;c.getContext('2d').fillRect(0,0,40,40);return c.toDataURL('image/png').split(',')[1];});
  await manager.locator('input[type=file]').setInputFiles({name:'test.png',mimeType:'image/png',buffer:Buffer.from(fileBytes,'base64')});
  await manager.locator('input[type=checkbox]').check();
  fail=true;await manager.getByRole('button',{name:'사진 추가',exact:true}).click();await manager.getByText('저장 실패',{exact:true}).waitFor();assert.equal(await manager.getByRole('button',{name:'사진 추가',exact:true}).isEnabled(),true);
  fail=false;await manager.getByRole('button',{name:'사진 추가',exact:true}).click();await manager.locator('figure').nth(1).waitFor();
  assert.equal(gallery.length,2);assert.equal(selected,origin+'/published.png?initial=1');
  const added=manager.locator('figure').nth(1);page.once('dialog',d=>d.dismiss());
  await added.getByRole('button',{name:'대표 이미지로 변경',exact:true}).click();assert.equal(selected,origin+'/published.png?initial=1');
  page.once('dialog',d=>d.accept());await added.getByRole('button',{name:'대표 이미지로 변경',exact:true}).click();await manager.getByText('대표 이미지를 변경했습니다.',{exact:true}).waitFor();assert.equal(selected,gallery[1].image);
  await page.setViewportSize({width:390,height:844});assert.ok(await manager.evaluate(n=>n.getBoundingClientRect().right<=innerWidth));await page.setViewportSize({width:1440,height:1000});
  await page.goto(origin+'/expert.html?id=technician-'+id);await page.locator('#expert-icon img').waitFor();assert.equal(await page.locator('#expert-icon img').getAttribute('src'),selected);assert.equal(await page.locator('#profile-content').getByRole('heading',{name:'작업 사진·명함'}).count(),1);
  await page.goto(origin+'/technician-detail.html?id='+id+'&admin=1');await manager.locator('figure').nth(1).waitFor();
  page.once('dialog',d=>d.accept());await manager.locator('figure').filter({hasText:'현재 대표 이미지'}).getByRole('button',{name:'공개 사진 삭제',exact:true}).click();await manager.getByText('공개 사진을 삭제했습니다. 신청서 원본 사진은 유지됩니다.',{exact:true}).waitFor();assert.equal(selected,null);assert.equal(gallery.length,1);
  assert.equal(await page.locator('#root > .layout > div > section.card').first().locator('figure.photo').count(),1,'private source remains');
  await page.goto(origin+'/expert.html?id=technician-'+id);await page.locator('#profile-content').waitFor();assert.equal(await page.locator('#expert-icon img').count(),0);assert.equal(await page.locator('#expert-image').isVisible(),false);
  await page.goto(origin+'/technician-detail.html?id='+id);await page.locator('.file-grid').first().waitFor();assert.equal(await page.locator('#admin-public-photos').count(),0);
  assert.deepEqual(errors,[]);console.log('PASS: admin public photo upload, failure recovery, cancel/select, representative display, responsive layout, delete keeps original, no broken image after removal, owner cannot manage photos');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1}).finally(()=>server.close());
