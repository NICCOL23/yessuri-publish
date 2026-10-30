const assert=require('node:assert/strict');
const {fixture,id,sourcePath}=require('./test-technician-representative-image.cjs');
const url='https://test.invalid/?route='+encodeURIComponent('/api/admin/applications/'+id+'/public-photos');
const jpeg=Buffer.from([255,216,255,192,0,17,8,0,1,0,1,3,1,17,0,2,17,0,3,17,0,255,217]).toString('base64');
const upload={action:'upload',imageConsent:true,photo:{type:'image/jpeg',data:jpeg}};
(async()=>{
 for(const options of [{role:'owner'},{role:'none'}]){const f=fixture(options);for(const action of ['upload','select','delete'])assert.equal((await f.request({url,body:{...upload,action}})).status,403);assert.equal(f.uploads,0);}
 const anonymous=fixture();assert.equal((await anonymous.request({url,token:false,body:upload})).status,403);
 const f=fixture();assert.equal((await f.request({url,method:'GET'})).status,200);assert.equal(f.stored.size,1);
 assert.equal((await f.request({url,body:{...upload,imageConsent:false}})).status,400);
 assert.equal((await f.request({url,body:{...upload,photo:{type:'image/jpeg',data:'invalid'}}})).status,400);
 assert.equal((await f.request({url,body:{...upload,photo:{type:'image/svg+xml',data:jpeg}}})).status,400);
 assert.equal((await f.request({url,body:upload})).status,200);assert.equal(f.profile.work_photos.length,1);assert.equal(f.profile.image,null,'upload does not replace representative implicitly');
 const first=f.profile.work_photos[0].image;
 assert.equal((await f.request({url:first,method:'GET',token:false})).status,200,'gallery image is public without authentication');
 assert.equal((await f.request({url,body:{action:'select',image:first,imageConsent:true}})).status,200);assert.equal(f.profile.image,first);
 assert.equal((await f.request({url,body:upload})).status,200);const second=f.profile.work_photos.find(p=>p.image!==first).image;
 assert.equal((await f.request({url,body:{action:'select',image:second,imageConsent:true}})).status,200);assert.equal(f.profile.image,second);assert.equal(f.profile.work_photos.length,2);
 assert.equal((await f.request({url,body:{action:'delete',image:first,confirm:false}})).status,400);
 assert.equal((await f.request({url,body:{action:'delete',image:sourcePath,confirm:true}})).status,404,'private source is never accepted as public image');
 assert.equal((await f.request({url,body:{action:'delete',image:first,confirm:true}})).status,200);assert.equal(f.profile.image,second);assert.equal(f.stored.size,2);assert.equal((await f.request({url:first,method:'GET',token:false})).status,404);
 assert.equal((await f.request({url,body:{action:'delete',image:second,confirm:true}})).status,200);assert.equal(f.profile.image,null);assert.equal(f.profile.work_photos.length,0);assert.equal(f.stored.size,1);assert.ok(f.stored.has(sourcePath),'application original must survive all public photo operations');
 assert.ok(f.operations.every(op=>['session','admin-detail'].includes(op)),'no application mutation or private upload reservation');
 const failure=fixture({updateFails:true});assert.equal((await failure.request({url,body:upload})).status,500);assert.equal(failure.stored.size,1,'failed upload rolls back public copy only');
 const missing=fixture({profileMissing:true});assert.equal((await missing.request({url,body:upload})).status,409);assert.equal(missing.uploads,0);
 console.log('PASS: admin-only photo upload/select/delete, validation, public gallery, representative change/removal, failed upload rollback; original application files and records unchanged');
})().catch(e=>{console.error(e);process.exitCode=1});
