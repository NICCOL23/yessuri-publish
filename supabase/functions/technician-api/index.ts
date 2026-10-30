import {createClient} from 'npm:@supabase/supabase-js@2';
import {profileFromReview} from './public-profile.ts';
const IS_TEST=false;
const URL_ROOT=Deno.env.get('SUPABASE_URL')!,KEY=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const db=createClient(URL_ROOT,KEY,{auth:{persistSession:false,autoRefreshToken:false}});
const RPC=IS_TEST?'technician_rpc_test':'technician_rpc',BUCKET=IS_TEST?'technician-private-test':'technician-private';
const encoder=new TextEncoder(),states=['접수','확인 중','자료 보완 요청','검토 완료'];
const origins=new Set(['https://yessuri.com','https://www.yessuri.com','https://niccol23.github.io','http://127.0.0.1:8097','http://127.0.0.1:8099']);
class UserError extends Error{constructor(message:string,public status=400){super(message);}}
function check(v:unknown,message:string,status=400):asserts v{if(!v)throw new UserError(message,status);}
const uuid=(v:unknown)=>typeof v==='string'&&/^[a-f0-9-]{36}$/i.test(v);
const hex=(bytes:Uint8Array)=>Array.from(bytes,b=>b.toString(16).padStart(2,'0')).join('');
const random=()=>hex(crypto.getRandomValues(new Uint8Array(32)));
async function sha(s:string){return hex(new Uint8Array(await crypto.subtle.digest('SHA-256',encoder.encode(s))));}
function text(v:unknown,min:number,max:number,label:string){check(typeof v==='string',label+'을 확인해 주세요.');const s=v.trim();check(s.length>=min&&s.length<=max,label+'의 길이를 확인해 주세요.');return s;}
function pw(v:unknown){check(typeof v==='string'&&v.length>=8&&v.length<=128,'비밀번호는 8~128자로 설정해 주세요.');return v;}
async function passwordHash(p:string,salt=hex(crypto.getRandomValues(new Uint8Array(16)))){const key=await crypto.subtle.importKey('raw',encoder.encode(p),'PBKDF2',false,['deriveBits']);const hash=await crypto.subtle.deriveBits({name:'PBKDF2',salt:encoder.encode(salt),iterations:600000,hash:'SHA-256'},key,256);return 'pbkdf2-600000:'+salt+':'+hex(new Uint8Array(hash));}
async function passwordMatches(p:string,h:string){const[,salt,expected]=h.split(':');if(!salt||!expected)return false;const actual=(await passwordHash(p,salt)).split(':')[2];let diff=actual.length^expected.length;for(let i=0;i<actual.length;i++)diff|=actual.charCodeAt(i)^(expected.charCodeAt(i)||0);return diff===0;}
async function rpc(op:string,p:Record<string,unknown>={}){const{data,error}=await db.rpc(RPC,{op,p});if(error){if(error.message.includes('permission denied'))throw new UserError('본인 확인 또는 관리자 로그인이 필요합니다.',403);if(error.message.includes('not found'))throw new UserError('신청을 찾을 수 없습니다.',404);if(error.message.includes('version conflict'))throw new UserError('신청이 변경되었습니다. 새로고침 후 확인해 주세요.',409);if(error.message.includes('invalid photos'))throw new UserError('사진은 합계5장까지 첨부할 수 있습니다.');throw Error('registration operation failed: '+op);}return data;}
function fields(p:any){const result:Record<string,string>={};const limits:Record<string,number>={company:100,contact:60,phone:40,fields:2000,areas:1000,areaNotes:1000,intro:6000,links:2000,notes:6000};for(const[k,max]of Object.entries(limits))result[k]=text(p[k]??'',['company','contact','phone','fields','areas'].includes(k)?1:0,max,k);check(/^[0-9+()\s-]{7,40}$/.test(result.phone),'연락 가능한 전화번호를 확인해 주세요.');return result;}
async function readBody(req:Request){check((req.headers.get('content-type')||'').split(';')[0]==='application/json','지원하지 않는 요청 형식입니다.',415);const reader=req.body?.getReader();check(reader,'입력 내용을 확인해 주세요.');let size=0;const chunks:Uint8Array[]=[];while(true){const{value,done}=await reader.read();if(done)break;size+=value.length;if(size>7500000){await reader.cancel();throw new UserError('전송할 사진 용량을 줄여 주세요.',413);}chunks.push(value);}const bytes=new Uint8Array(size);let offset=0;for(const c of chunks){bytes.set(c,offset);offset+=c.length;}let p;try{p=JSON.parse(new TextDecoder().decode(bytes));}catch{throw new UserError('입력 내용을 확인해 주세요.');}check(p&&typeof p==='object'&&!Array.isArray(p),'입력 내용을 확인해 주세요.');return p;}
async function rate(req:Request,action:string,max:number,seconds:number){const ip=req.headers.get('x-forwarded-for')?.split(',')[0].trim()||req.headers.get('cf-connecting-ip')||'unknown';const key=await sha(action+':'+ip);const d=await rpc('rate',{key,max,seconds});check(d.allowed,'반복 시도가 많습니다. 잠시 후 다시 시도해 주세요.',429);return key;}
async function session(req:Request,role:'owner'|'admin'){const token=req.headers.get(role==='admin'?'x-admin-token':'x-owner-token')||'';if(!/^[a-f0-9]{64}$/.test(token))return null;const hash=await sha(token),s=await rpc('session',{hash});return s.role===role?{...s,hash}:null;}
async function owner(req:Request,id:string){const s=await session(req,'owner');check(s&&s.application_id===id,'신청 목록에서 본인 글을 선택하고 비밀번호로 확인해 주세요.',403);return s;}
async function admin(req:Request){const s=await session(req,'admin');check(s,'관리자 로그인이 필요합니다.',403);return s;}
async function auth(req:Request,id?:string){const s=await session(req,'admin')||await session(req,'owner');check(s&&(s.role==='admin'||s.application_id===id),'본인 확인이 필요합니다.',403);return s;}
async function cleanup(){const d=await rpc('cleanup');if(d.paths?.length){const{error}=await db.storage.from(BUCKET).remove(d.paths);if(!error)await rpc('cleanup-done',{paths:d.paths});}}
async function decodePhoto(p:any){check(p&&p.type==='image/jpeg'&&typeof p.data==='string'&&p.data.length<=1398110&&/^[A-Za-z0-9+/]*={0,2}$/.test(p.data),'사진을 다시 선택해 주세요. 전송용 이미지는1MB 이하여야 합니다.');let raw:Uint8Array;try{raw=Uint8Array.from(atob(p.data),c=>c.charCodeAt(0));}catch{throw new UserError('올바른 사진이 아닙니다.');}check(raw.length>0&&raw.length<=1048576&&raw[0]===255&&raw[1]===216&&raw[2]===255,'올바른 JPG 전송 이미지가 아닙니다.');let w=0,h=0;for(let i=2;i+8<raw.length;){if(raw[i]!==255){i++;continue;}const marker=raw[i+1];if(marker===0xda||marker===0xd9)break;const len=(raw[i+2]<<8)|raw[i+3];if([0xc0,0xc1,0xc2].includes(marker)){h=(raw[i+5]<<8)|raw[i+6];w=(raw[i+7]<<8)|raw[i+8];break;}check(len>=2,'손상된 사진입니다.');i+=len+2;}check(w>0&&h>0&&w*h<=4000000&&w<=4000&&h<=4000,'전송 사진 크기가 너무 크거나 손상되었습니다.');let bytes:Uint8Array;try{const{Image}=await import('https://deno.land/x/imagescript@1.3.0/mod.ts');const image=await Image.decode(raw);if(Math.max(image.width,image.height)>1280){const scale=1280/Math.max(image.width,image.height);image.resize(Math.round(image.width*scale),Math.round(image.height*scale));}bytes=await image.encodeJPEG(80);}catch{throw new UserError('사진을 읽을 수 없습니다. 다른 사진을 선택해 주세요.');}check(bytes.length<=2097152,'사진 용량을 줄여 주세요.');return bytes;}
async function preparePhotos(list:any,id:string){check(Array.isArray(list)&&list.length<=5,'사진은 합계5장까지 첨부할 수 있습니다.');const planned=list.map(()=>{const pid=crypto.randomUUID();return{id:pid,storage_path:id+'/'+pid+'.jpg'};});if(!planned.length)return[];await rpc('reserve-uploads',{id,photos:planned});const uploaded:any[]=[];
 try{for(let n=0;n<list.length;n++){const p=list[n];const bytes=await decodePhoto(p);const item=planned[n],{error}=await db.storage.from(BUCKET).upload(item.storage_path,bytes,{contentType:'image/jpeg',upsert:false});if(error)throw Error('private photo upload failed');uploaded.push({...item,bytes:bytes.length});}return uploaded;
 }catch(e){await rpc('abandon-uploads',{ids:planned.map(p=>p.id)});await cleanup();throw e;}}
async function abandon(photos:any[]){if(photos.length){await rpc('abandon-uploads',{ids:photos.map(p=>p.id)});await cleanup();}}
function addPhotoUrls(d:any){return{...d,photos:(d.photos||[]).map((p:any)=>({...p,url:'/api/photos/'+p.id}))};}
function publicPhotos(profile:any){const seen=new Set();return [...(profile.image?[{image:profile.image,imageAlt:profile.image_alt||profile.name+' 대표 이미지'}]:[]),...(profile.work_photos||[])].filter((p:any)=>p&&typeof p.image==='string'&&!seen.has(p.image)&&seen.add(p.image));}
async function photoProfile(id:string){const{data,error}=await db.from('expert_profiles').select('id,name,image,image_alt,work_photos').eq('id','technician-'+id).eq('publication_status','approved').eq('public_consent',true).maybeSingle();if(error)throw Error('public photo profile lookup failed');check(data,'먼저 공개 프로필을 등록해 주세요.',409);return data;}
async function updatePhotoProfile(profile:any,changes:any){let q=db.from('expert_profiles').update(changes).eq('id',profile.id).eq('publication_status','approved').eq('public_consent',true).eq('work_photos',JSON.stringify(profile.work_photos||[]));q=profile.image===null?q.is('image',null):q.eq('image',profile.image);const{data,error}=await q.select('id,image,image_alt,work_photos').maybeSingle();if(error)throw Error('public photo profile update failed');check(data,'공개 사진이 변경되었습니다. 새로고침 후 다시 시도해 주세요.',409);return data;}
Deno.serve(async req=>{
 const origin=req.headers.get('origin')||'',allowed=!origin||origins.has(origin)||(IS_TEST&&/^http:\/\/(127\.0\.0\.1|localhost):\d+$/.test(origin));
 const headers={'Access-Control-Allow-Origin':allowed&&origin?origin:'https://yessuri.com','Access-Control-Allow-Headers':'apikey,content-type,x-owner-token,x-admin-token,x-cleanup-secret','Access-Control-Allow-Methods':'GET,POST,OPTIONS','Vary':'Origin','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'};
 const json=(d:unknown,status=200)=>new Response(JSON.stringify(d),{status,headers:{...headers,'Content-Type':'application/json; charset=utf-8'}});
 try{check(allowed,'허용되지 않은 요청입니다.',403);if(req.method==='OPTIONS')return new Response(null,{status:204,headers});const u=new URL(req.url),route=u.searchParams.get('route')||'/api/health';
  if(u.searchParams.get('action')==='cleanup'){const{data,error}=await db.rpc(IS_TEST?'technician_cleanup_secret_test':'technician_cleanup_secret');check(!error&&data&&req.headers.get('x-cleanup-secret')===data,'접근 권한이 없습니다.',403);await cleanup();return json({ok:true});}
  if(req.method==='GET'){
   const publicImage=route.match(/^\/api\/public-profile-images\/([a-f0-9-]{36})\/([a-f0-9-]{36})\.jpg$/i);
   if(publicImage){
    check(!IS_TEST,'사진을 찾을 수 없습니다.',404);
    const imageUrl=URL_ROOT+'/functions/v1/technician-api?route='+encodeURIComponent(route);
    const{data:profile,error:lookupError}=await db.from('expert_profiles').select('id,name,image,image_alt,work_photos').eq('id','technician-'+publicImage[1]).eq('publication_status','approved').eq('public_consent',true).maybeSingle();
    check(!lookupError&&profile&&publicPhotos(profile).some((p:any)=>p.image===imageUrl),'사진을 찾을 수 없습니다.',404);
    const{data,error}=await db.storage.from(BUCKET).download('public-profiles/'+publicImage[1]+'/'+publicImage[2]+'.jpg');
    check(data&&!error,'사진을 찾을 수 없습니다.',404);
    return new Response(data,{headers:{...headers,'Content-Type':'image/jpeg','Content-Disposition':'inline; filename="profile-image.jpg"'}});
   }
   if(route==='/api/health')return json({mode:IS_TEST?'isolated-test':'production',ready:true,maxPhotos:5,maxPhotoBytes:10485760,transferPhotoBytes:1048576,retentionMonths:6});
   if(route.startsWith('/api/applications?')){const query=new URL(route,'https://local');return json(await rpc('list',{page:Number(query.searchParams.get('page'))||1}));}
   if(route==='/api/applications')return json(await rpc('list',{page:1}));
   if(route==='/api/session')return json({owner:!!await session(req,'owner'),admin:!!await session(req,'admin')});
   if(route.startsWith('/api/photos/')){const id=route.split('/').pop()!;check(uuid(id),'사진을 찾을 수 없습니다.',404);const adminSession=await session(req,'admin'),ownerSession=await session(req,'owner'),s=adminSession||ownerSession;check(s,'본인 확인이 필요합니다.',403);const p=await rpc('photo',{id,hash:s.hash}),{data,error}=await db.storage.from(BUCKET).download(p.storage_path);check(data&&!error,'사진을 찾을 수 없습니다.',404);return new Response(data,{headers:{...headers,'Content-Type':'image/jpeg','Content-Disposition':'inline; filename="private-application-photo.jpg"'}});}
   if(route.startsWith('/api/admin/applications?')||route==='/api/admin/applications'){const s=await admin(req),q=new URL(route,'https://local'),state=q.searchParams.get('state')||'';check(!state||states.includes(state),'상태를 확인해 주세요.');return json(await rpc('admin-list',{hash:s.hash,state,page:Number(q.searchParams.get('page'))||1}));}
   const photoList=route.match(/^\/api\/admin\/applications\/([a-f0-9-]{36})\/public-photos$/i);
   if(photoList){const s=await admin(req),id=photoList[1];check(!IS_TEST,'테스트 접수의 사진은 공개할 수 없습니다.',409);await rpc('admin-detail',{id,hash:s.hash});const profile=await photoProfile(id);return json({photos:publicPhotos(profile),image:profile.image});}
   const publicProfile=route.match(/^\/api\/admin\/applications\/([a-f0-9-]{36})\/public-profile$/i);
   if(publicProfile){const s=await admin(req),id=publicProfile[1];await rpc('admin-detail',{id,hash:s.hash});check(!IS_TEST,'테스트 접수에서는 운영 프로필을 조회할 수 없습니다.',409);const{data,error}=await db.from('expert_profiles').select('id,name,publication_status').eq('id','technician-'+id).maybeSingle();if(error)throw Error('public profile lookup failed');return json({profile:data});}
   const detail=route.match(/^\/api\/(admin\/)?applications\/([a-f0-9-]{36})$/i);if(detail){const s=detail[1]?await admin(req):await auth(req,detail[2]);return json(addPhotoUrls(await rpc(detail[1]?'admin-detail':'detail',{id:detail[2],hash:s.hash})));}
   throw new UserError('요청을 찾을 수 없습니다.',404);
  }
  check(req.method==='POST','지원하지 않는 요청입니다.',405);const p=await readBody(req);
  if(route==='/api/verify'){
   const key=await rate(req,'verify',5,900),pass=typeof p.password==='string'&&p.password.length<=128?p.password:'';
   let a;
   if(p.id!==undefined){
    check(typeof p.id==='string'&&/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(p.id),'신청 목록에서 본인 글을 다시 선택해 주세요.');
    const{data,error}=await db.rpc(IS_TEST?'technician_password_target_test':'technician_password_target',{p_id:p.id});
    if(error)throw Error('password target lookup failed');a=data||{};
   }else{a=await rpc('find-receipt',{receipt:text(p.receipt||'',1,40,'접수번호').toUpperCase()});}
   const valid=await passwordMatches(pass,a.password_hash||'pbkdf2-600000:00000000000000000000000000000000:0000000000000000000000000000000000000000000000000000000000000000');check(a.id&&valid&&(!p.id||p.id===a.id),'신청 정보 또는 비밀번호를 확인해 주세요.',403);
   const token=random();await rpc('grant-owner',{id:a.id,expectedHash:a.password_hash,newHash:await sha(token)});await rpc('rate-clear',{key});return json({id:a.id,ownerSession:{token,expiresAt:Date.now()+900000}});
  }
  if(route==='/api/admin/login'){
   const key=await rate(req,'admin-login',5,900),email=text(p.username,3,250,'관리자 이메일'),pass=text(p.password,1,128,'비밀번호');const client=createClient(URL_ROOT,Deno.env.get('SUPABASE_ANON_KEY')||KEY,{auth:{persistSession:false,autoRefreshToken:false}});
   const{data,error}=await client.auth.signInWithPassword({email,password:pass});check(!error&&data.user,'관리자 로그인 정보를 확인해 주세요.',403);const token=random();await rpc('grant-admin',{user_id:data.user.id,newHash:await sha(token)});await rpc('rate-clear',{key});return json({ok:true,adminSession:{token,expiresAt:Date.now()+1800000}});
  }
  if(route==='/api/logout'){const role=p.role==='admin'?'admin':'owner',s=await session(req,role);if(s)await rpc('logout',{hash:s.hash});return json({ok:true});}
  if(route==='/api/applications'){
   await rate(req,'create',10,3600);const data=fields(p);check(p.consent===true,'개인정보 수집·이용 동의가 필요합니다.');const pass=pw(p.password);check(pass===p.passwordConfirm,'비밀번호 확인이 일치하지 않습니다.');check(uuid(p.request_id),'접수 요청을 확인해 주세요.');const existing=await rpc('find-request',{request_id:p.request_id}),token=random();
   if(existing.id){check(await passwordMatches(pass,existing.password_hash),'이미 처리된 요청입니다.',409);await rpc('grant-owner',{id:existing.id,expectedHash:existing.password_hash,newHash:await sha(token)});return json({id:existing.id,receipt:existing.receipt,ownerSession:{token,expiresAt:Date.now()+900000}});}
   const id=crypto.randomUUID(),receipt='YS-'+hex(crypto.getRandomValues(new Uint8Array(9))).toUpperCase(),photos=await preparePhotos(p.photos||[],id);
   try{const result=await rpc('create',{id,request_id:p.request_id,receipt,data,password_hash:await passwordHash(pass),photos,newHash:await sha(token)});return json({...result,ownerSession:{token,expiresAt:Date.now()+900000}},201);}catch(e){await abandon(photos);throw e;}
  }
  const ownerAction=route.match(/^\/api\/applications\/([a-f0-9-]{36})\/(edit|reply|delete|password)$/i);
  if(ownerAction){const[,id,op]=ownerAction,s=await owner(req,id);
   if(op==='delete'){check(p.confirm===true,'신청 삭제 확인이 필요합니다.');await rpc('delete',{id,hash:s.hash,confirm:true});await cleanup();return json({ok:true});}
   if(op==='password'){const old=await rpc('password-hash',{id,hash:s.hash});check(await passwordMatches(typeof p.currentPassword==='string'&&p.currentPassword.length<=128?p.currentPassword:'',old.password_hash),'현재 비밀번호를 확인해 주세요.',403);const pass=pw(p.password);check(pass===p.passwordConfirm,'비밀번호 확인이 일치하지 않습니다.');const token=random();await rpc('password',{id,hash:s.hash,expectedHash:old.password_hash,password_hash:await passwordHash(pass),newHash:await sha(token)});return json({ok:true,ownerSession:{token,expiresAt:Date.now()+900000}});}
   let mutation:any={id,hash:s.hash};if(op==='edit'){mutation.data=fields(p);check(Number.isInteger(p.version),'수정 버전을 확인해 주세요.');mutation.version=p.version;check(Array.isArray(p.keepPhotoIds)&&p.keepPhotoIds.every(uuid)&&new Set(p.keepPhotoIds).size===p.keepPhotoIds.length,'보관할 사진을 확인해 주세요.');mutation.keepPhotoIds=p.keepPhotoIds;check(p.keepPhotoIds.length+(p.photos?.length||0)<=5,'사진은 합계5장까지 첨부할 수 있습니다.');}else mutation.body=text(p.body,1,6000,'답변');
   const photos=await preparePhotos(p.photos||[],id);mutation.photos=photos;try{await rpc(op,mutation);await cleanup();return json({ok:true});}catch(e){await abandon(photos);throw e;}
  }
  const managePhotos=route.match(/^\/api\/admin\/applications\/([a-f0-9-]{36})\/public-photos$/i);
  if(managePhotos){
   const s=await admin(req),id=managePhotos[1];check(!IS_TEST,'테스트 접수의 사진은 공개할 수 없습니다.',409);
   await rpc('admin-detail',{id,hash:s.hash});
   check(['upload','select','delete'].includes(p.action),'사진 작업을 확인해 주세요.');
   const profile=await photoProfile(id),photos=publicPhotos(profile);
   if(p.action==='upload'){
    check(p.imageConsent===true,'추가할 사진의 공개를 확인해 주세요.');check(photos.length<10,'공개 사진은 최대 10장까지 등록할 수 있습니다.');
    const bytes=await decodePhoto(p.photo),imageId=crypto.randomUUID(),path='public-profiles/'+id+'/'+imageId+'.jpg';
    const image=URL_ROOT+'/functions/v1/technician-api?route='+encodeURIComponent('/api/public-profile-images/'+id+'/'+imageId+'.jpg');
    const{error}=await db.storage.from(BUCKET).upload(path,bytes,{contentType:'image/jpeg',upsert:false});if(error)throw Error('public photo upload failed');
    try{await updatePhotoProfile(profile,{work_photos:[...photos,{image,imageAlt:profile.name+' 공개 사진',imageType:'work'}]});}catch(e){await db.storage.from(BUCKET).remove([path]);throw e;}
   }else{
    check(typeof p.image==='string'&&photos.some((photo:any)=>photo.image===p.image),'등록된 공개 사진을 선택해 주세요.',404);
    if(p.action==='select'){check(p.imageConsent===true,'대표 이미지 변경을 확인해 주세요.');await updatePhotoProfile(profile,{image:p.image,image_alt:profile.name+' 대표 이미지',image_type:'work',image_position:'center',work_photos:photos});}
    else{
     check(p.confirm===true,'공개 사진 삭제를 확인해 주세요.');await updatePhotoProfile(profile,{work_photos:photos.filter((photo:any)=>photo.image!==p.image),...(profile.image===p.image?{image:null,image_alt:null}:{})});
     // Only remove our separate public copy, never an application attachment path.
     try{const imageUrl=new URL(p.image),imageRoute=imageUrl.searchParams.get('route')||'',match=imageRoute.match(/^\/api\/public-profile-images\/([a-f0-9-]{36})\/([a-f0-9-]{36})\.jpg$/i);if(imageUrl.origin===new URL(URL_ROOT).origin&&match&&match[1]===id)await db.storage.from(BUCKET).remove(['public-profiles/'+id+'/'+match[2]+'.jpg']);}catch{console.error('public copy cleanup failed');}
    }
   }
   const result=await photoProfile(id);return json({photos:publicPhotos(result),image:result.image});
  }
  const representativeImage=route.match(/^\/api\/admin\/applications\/([a-f0-9-]{36})\/representative-image$/i);
  if(representativeImage){
   const s=await admin(req),id=representativeImage[1];
   check(!IS_TEST,'테스트 접수의 사진은 공개할 수 없습니다.',409);
   check(p.imageConsent===true,'선택한 사진의 공개를 확인해 주세요.');
   const detail=await rpc('admin-detail',{id,hash:s.hash});
   check(Number.isInteger(p.version)&&p.version===detail.application.version,'신청이 변경되었습니다. 새로고침 후 다시 확인해 주세요.',409);
   check(uuid(p.photoId)&&detail.photos.some((photo:any)=>photo.id===p.photoId),'이 신청에 첨부된 사진을 선택해 주세요.',404);
   const{data:profile,error:lookupError}=await db.from('expert_profiles').select('id,name,image,image_alt,work_photos').eq('id','technician-'+id).eq('publication_status','approved').eq('public_consent',true).maybeSingle();
   if(lookupError)throw Error('public profile image lookup failed');
   check(profile,'먼저 공개 프로필을 등록해 주세요.',409);
   check(publicPhotos(profile).length<10,'공개 사진은 최대 10장까지 등록할 수 있습니다.');
   const photo=await rpc('photo',{id:p.photoId,hash:s.hash});
   check(photo.application_id===id,'이 신청에 첨부된 사진을 선택해 주세요.',404);
   const{data:bytes,error:downloadError}=await db.storage.from(BUCKET).download(photo.storage_path);
   check(bytes&&!downloadError,'첨부사진을 읽을 수 없습니다.',404);
   const imageId=crypto.randomUUID(),path='public-profiles/'+id+'/'+imageId+'.jpg';
   const imageUrl=URL_ROOT+'/functions/v1/technician-api?route='+encodeURIComponent('/api/public-profile-images/'+id+'/'+imageId+'.jpg');
   const{error:uploadError}=await db.storage.from(BUCKET).upload(path,bytes,{contentType:'image/jpeg',upsert:false});
   if(uploadError)throw Error('public profile image upload failed');
   try{
    const updated=await updatePhotoProfile(profile,{image:imageUrl,image_alt:profile.name+' 대표 이미지',image_type:'work',image_position:'center',work_photos:[...publicPhotos(profile),{image:imageUrl,imageAlt:profile.name+' 공개 사진',imageType:'work'}]});
    return json({profile:updated});
   }catch(error){await db.storage.from(BUCKET).remove([path]);throw error;}
  }
  const publishProfile=route.match(/^\/api\/admin\/applications\/([a-f0-9-]{36})\/public-profile$/i);
  if(publishProfile){
   const s=await admin(req),id=publishProfile[1];check(!IS_TEST,'테스트 접수는 운영 프로필로 등록할 수 없습니다.',409);
   const detail=await rpc('admin-detail',{id,hash:s.hash});
   check(Number.isInteger(p.version)&&p.version===detail.application.version,'신청이 변경되었습니다. 새로고침 후 다시 확인해 주세요.',409);
   let profile;try{profile=profileFromReview(p,id);}catch(e){throw new UserError(e instanceof Error?e.message:'공개 정보를 확인해 주세요.');}
   const{data,error}=await db.from('expert_profiles').insert(profile).select('id,name,publication_status').single();
   if(error){if(error.code==='23505')throw new UserError('이미 공개 프로필로 등록된 신청입니다. 중복 등록하지 않았습니다.',409);throw Error('public profile insert failed');}
   return json({profile:data},201);
  }
  const adminAction=route.match(/^\/api\/admin\/applications\/([a-f0-9-]{36})\/(update|reset-password)$/i);
  if(adminAction){const[,id,op]=adminAction,s=await admin(req);if(op==='update'){check(states.includes(p.status),'상태를 확인해 주세요.');await rpc('admin-update',{id,hash:s.hash,status:p.status,body:text(p.body||'',0,6000,'답변')});return json({ok:true});}check(p.identityConfirmed===true,'본인 확인 절차를 완료해 주세요.');const reason=text(p.reason,10,500,'본인 확인 처리 기록'),temporaryPassword=random().slice(0,24);await rpc('reset-password',{id,hash:s.hash,identityConfirmed:true,reason,password_hash:await passwordHash(temporaryPassword)});return json({temporaryPassword});}
  throw new UserError('요청을 찾을 수 없습니다.',404);
 }catch(e){if(!(e instanceof UserError))console.error('Technician operation failed:',e instanceof Error?e.message:'unknown');return json({error:e instanceof UserError?e.message:'처리 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.'},e instanceof UserError?e.status:500);}
});
