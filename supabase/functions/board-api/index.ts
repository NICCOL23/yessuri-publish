import { createClient } from 'npm:@supabase/supabase-js@2';
import catalog from './catalog.json' with { type: 'json' };
import {groups, acceptsWork, fieldFilter} from './field-rules.mjs';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const db = createClient(SUPABASE_URL, KEY, { auth: { persistSession: false, autoRefreshToken: false } });

const districts = new Set(['중구','서구','동구','영도구','부산진구','동래구','남구','북구','해운대구','사하구','금정구','강서구','연제구','수영구','사상구','기장군']);
const origins = new Set(['https://yessuri.com','https://www.yessuri.com','https://niccol23.github.io','http://127.0.0.1:8097','http://localhost:8097']);
const encoder = new TextEncoder();
const uuid = (s: unknown) => typeof s === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(s);
class UserError extends Error { constructor(message: string, public status=400){super(message);} }
function check(value: unknown, message: string, status=400): asserts value { if(!value)throw new UserError(message,status); }
function text(v: unknown,min: number,max: number,label: string){check(typeof v==='string',label+'을 확인해 주세요.');const s=v.trim();check(s.length>=min&&s.length<=max,label+' 길이를 확인해 주세요.');return s;}
async function privateOp(operation: string,payload: object){const {data,error}=await db.rpc('board_server_private',{operation,payload});if(error)throw Error('private operation failed');return data;}
const hex=(a: ArrayBuffer)=>Array.from(new Uint8Array(a),b=>b.toString(16).padStart(2,'0')).join('');
const sha=async(s: string)=>hex(await crypto.subtle.digest('SHA-256',encoder.encode(s)));
async function rate(req: Request,action: string,limit: number,id=''){
  const ip=req.headers.get('cf-connecting-ip')||req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()||'unknown';
  const hmac=await crypto.subtle.importKey('raw',encoder.encode(KEY),{name:'HMAC',hash:'SHA-256'},false,['sign']);
  const bucket=action+':'+hex(await crypto.subtle.sign('HMAC',hmac,encoder.encode(ip+':'+id)));
  const r=await privateOp('rate',{bucket,window:Math.floor(Date.now()/3600000)*3600,limit});
  check(r.allowed,'요청이 많습니다. 잠시 후 다시 시도해 주세요.',429);
}
function password(v: unknown){check(typeof v==='string'&&Array.from(v).length>=6&&encoder.encode(v).length<=128,'글 비밀번호는 6자 이상, 128바이트 이하로 입력해 주세요.');return v;}
async function hashPassword(p: string,salt?: string){salt ||= crypto.randomUUID();const key=await crypto.subtle.importKey('raw',encoder.encode(p),'PBKDF2',false,['deriveBits']);const h=hex(await crypto.subtle.deriveBits({name:'PBKDF2',hash:'SHA-256',salt:encoder.encode(salt),iterations:600000},key,256));return 'pbkdf2$600000$'+salt+'$'+h;}
function equal(a: string,b: string){let diff=a.length^b.length;for(let i=0;i<Math.max(a.length,b.length);i++)diff|=(a.charCodeAt(i)||0)^(b.charCodeAt(i)||0);return diff===0;}
function fields(p: Record<string,unknown>){
  const group_id=text(p.group_id,1,20,'분야');check(groups.has(group_id),'분야를 선택해 주세요.');
  const district=text(p.district,1,20,'지역');check(districts.has(district),'부산 구·군을 선택해 주세요.');
  const work_id=p.work_id ? text(p.work_id,1,100,'세부 작업') : '';
  if(work_id)check(acceptsWork(group_id,work_id),'선택한 분야와 작업이 맞지 않습니다.');
  return {nickname:text(p.nickname,1,30,'닉네임'),district,group_id,work_id,title:text(p.title,2,120,'제목'),body:text(p.body,10,10000,'질문 내용')};
}
async function admin(req: Request){
  const token=req.headers.get('authorization')?.replace(/^Bearer\s+/i,'');check(token,'관리자 로그인이 필요합니다.',401);
  const {data:{user},error}=await db.auth.getUser(token);check(user&&!error,'관리자 로그인이 만료되었습니다.',401);
  const {data}=await db.from('board_admins').select('user_id,display_name,role_label,experience').eq('user_id',user.id).eq('active',true).maybeSingle();
  check(data,'관리자 권한이 없습니다.',403);return data;
}
async function owner(req: Request,id: string){const token=req.headers.get('x-edit-token');check(token&&token.length<200,'글 비밀번호를 다시 확인해 주세요.',401);const s=await privateOp('session_check',{hash:await sha(token)});check(s.id===id,'글 관리 시간이 만료되었습니다. 비밀번호를 다시 확인해 주세요.',401);}
async function question(id: string,includeHidden=false){check(uuid(id),'질문 주소를 확인해 주세요.',404);let q=db.from('board_questions').select('*').eq('id',id);if(!includeHidden)q=q.eq('state','published');const {data,error}=await q.maybeSingle();check(data&&!error,'삭제되었거나 공개되지 않은 질문입니다.',404);return data;}
async function photos(id: string){const {data,error}=await db.from('board_photos').select('id,position,storage_path,content_type,bytes').eq('question_id',id).order('position');if(error)throw Error('photo query failed');return data||[];}
async function upload(file: File,qid: string,position: number){
  check(file.size>0&&file.size<=2097152,'사진은 한 장당 2MB 이하로 첨부해 주세요.');
  const raw=new Uint8Array(await file.arrayBuffer());
  const jpeg=raw[0]===255&&raw[1]===216&&raw[2]===255, png=raw[0]===137&&raw[1]===80&&raw[2]===78&&raw[3]===71;
  check(jpeg||png,'JPG 또는 PNG 사진만 첨부할 수 있습니다.');
  // Bound dimensions before decoding; prevents a small compressed file causing huge allocations.
  let w=0,h=0;
  if(png){const v=new DataView(raw.buffer);check(raw.length>=24,'손상된 사진입니다.');w=v.getUint32(16);h=v.getUint32(20);}
  else {let i=2;while(i+8<raw.length){if(raw[i]!==255){i++;continue;}const m=raw[i+1];if(m===0xda||m===0xd9)break;if(m===0xd8||m===0x01){i+=2;continue;}const len=(raw[i+2]<<8)|raw[i+3];if([0xc0,0xc1,0xc2].includes(m)){h=(raw[i+5]<<8)|raw[i+6];w=(raw[i+7]<<8)|raw[i+8];break;}if(len<2)break;i+=len+2;}}
  check(w>0&&h>0&&w*h<=16000000&&w<=8000&&h<=8000,'사진 크기가 너무 크거나 손상되었습니다. 다른 사진을 선택해 주세요.');
  let image;try{const { Image }=await import('https://deno.land/x/imagescript@1.3.0/mod.ts');image=await Image.decode(raw);}catch{throw new UserError('사진을 읽을 수 없습니다.');}
  if(Math.max(image.width,image.height)>1600)image.resize(Math.round(image.width*1600/Math.max(image.width,image.height)),Math.round(image.height*1600/Math.max(image.width,image.height)));
  const bytes=await image.encodeJPEG(82);check(bytes.length<=2097152,'사진 용량을 줄여 다시 첨부해 주세요.');
  const id=crypto.randomUUID(),path=qid+'/'+id+'.jpg';const {error}=await db.storage.from('board-photos').upload(path,bytes,{contentType:'image/jpeg',upsert:false});if(error)throw Error('photo upload failed');
  return {id,storage_path:path,position,content_type:'image/jpeg',bytes:bytes.length};
}
async function limitedBody(req: Request,limit: number){check(Number(req.headers.get('content-length')||0)<=limit,'첨부 용량이 너무 큽니다.',413);const reader=req.body?.getReader();check(reader,'요청 내용을 확인해 주세요.');const parts: Uint8Array[]=[];let length=0;while(true){const {value,done}=await reader.read();if(done)break;length+=value.length;if(length>limit){await reader.cancel();throw new UserError('첨부 용량이 너무 큽니다.',413);}parts.push(value);}const bytes=new Uint8Array(length);let offset=0;for(const part of parts){bytes.set(part,offset);offset+=part.length;}return bytes;}
async function parseForm(req: Request){const bytes=await limitedBody(req,7500000);const f=await new Response(bytes,{headers:{'Content-Type':req.headers.get('content-type')||''}}).formData();let p;try{p=JSON.parse(String(f.get('data')||'{}'));}catch{throw new UserError('질문 입력을 확인해 주세요.');}const files=f.getAll('photos');check(files.length<=3&&files.every(x=>x instanceof File),'사진은 최대 3장입니다.');return {p,files:files as File[]};}

Deno.serve(async(req)=>{
  const origin=req.headers.get('origin')||'';
  const cors={'Access-Control-Allow-Origin':origins.has(origin)?origin:'https://yessuri.com','Access-Control-Allow-Headers':'authorization,apikey,content-type,x-edit-token','Access-Control-Allow-Methods':'GET,POST,OPTIONS','Vary':'Origin','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'};
  const json=(data: unknown,status=200)=>new Response(JSON.stringify(data),{status,headers:{...cors,'Content-Type':'application/json; charset=utf-8'}});
  try{
    check(!origin||origins.has(origin),'허용되지 않은 요청입니다.',403);
    if(req.method==='OPTIONS')return new Response(null,{status:204,headers:cors});
    const u=new URL(req.url),action=u.searchParams.get('action')||'list';
    if(req.method==='GET'){
      if(action==='health')return json({ready:true});
      if(action==='photo'){
        const id=u.searchParams.get('id')||'';check(uuid(id),'사진을 찾을 수 없습니다.',404);
        const {data:p}=await db.from('board_photos').select('*').eq('id',id).maybeSingle();check(p,'사진을 찾을 수 없습니다.',404);
        const q=await question(p.question_id,true);if(q.state!=='published')await admin(req);const {data,error}=await db.storage.from('board-photos').download(p.storage_path);check(data&&!error,'사진을 불러올 수 없습니다.',404);
        return new Response(data,{headers:{...cors,'Content-Type':p.content_type,'Content-Disposition':'inline'}});
      }
      if(action==='detail'){
        const q=await question(u.searchParams.get('id')||'');
        const {data:answers,error}=await db.from('board_answers').select('id,body,related_work_id,created_at,updated_at,board_admins(display_name,role_label,experience)').eq('question_id',q.id).eq('published',true).order('created_at');if(error)throw Error('answers query failed');
        return json({question:q,photos:(await photos(q.id)).map(({storage_path,...p})=>p),answers});
      }
      if(action==='admin-list'){
        await admin(req);await rate(req,'admin-read',600);
        const {data,error}=await db.from('board_questions').select('*,board_answers(id,published,body,related_work_id,author_id,created_at),board_photos(id,position),board_reports(id,reason,note,state,created_at)').neq('state','pending').order('created_at',{ascending:false}).limit(200);if(error)throw Error('admin query failed');return json({questions:data});
      }
      check(action==='list','지원하지 않는 요청입니다.');await rate(req,'read',600);
      const page=Math.max(1,Math.min(1000,Number(u.searchParams.get('page'))||1)),group=u.searchParams.get('group')||'',district=u.searchParams.get('district')||'',search=(u.searchParams.get('q')||'').trim().slice(0,100);
      let q=db.from('board_questions').select('id,nickname,district,group_id,work_id,title,body,created_at,edited_at,board_answers(id),board_photos(id,position)',{count:'exact'}).eq('state','published').eq('board_answers.published',true);
      if(group&&groups.has(group))q=q.or(fieldFilter(group)!);if(district&&districts.has(district))q=q.eq('district',district);
      if(search){const safe=search.replace(/[%,().*\\]/g,' ');q=q.or('title.ilike.%'+safe+'%,body.ilike.%'+safe+'%');}
      if(u.searchParams.get('waiting')==='1')q=q.is('board_answers','null');
      const {data,error,count}=await q.order('created_at',{ascending:false}).order('id',{ascending:false}).range((page-1)*10,page*10-1);if(error)throw Error('list query failed');
      return json({questions:(data||[]).map(x=>({...x,body:x.body.slice(0,140)})),count,page});
    }
    check(req.method==='POST','지원하지 않는 요청입니다.',405);
    if(action==='cleanup'){
      const stored=await db.rpc('board_cleanup_secret');if(stored.error)throw Error('retention authorization unavailable');const secret=stored.data;check(secret&&equal(req.headers.get('x-cleanup-secret')||'',secret),'허용되지 않은 요청입니다.',403);
      const candidates=await db.rpc('board_retention_tasks',{operation:'candidates'});if(candidates.error)throw Error('retention query failed');
      let removed=0;for(const q of candidates.data||[]){if(q.paths.length){const {error}=await db.storage.from('board-photos').remove(q.paths);if(error)throw Error('retention photo removal failed');}const {error}=await db.from('board_questions').delete().eq('id',q.id).eq('state','deleted');if(error)throw Error('retention record removal failed');removed++;}
      const orphans=await db.rpc('board_retention_tasks',{operation:'orphans'});if(orphans.error)throw Error('orphan query failed');if(orphans.data?.length){const {error}=await db.storage.from('board-photos').remove(orphans.data);if(error)throw Error('orphan removal failed');}
      const expired=await db.rpc('board_retention_tasks',{operation:'expire'});if(expired.error)throw Error('retention expire failed');return json({removed});
    }
    if(action==='create'||action==='edit'){
      await rate(req,action,action==='create'?10:30);
      const {p,files}=await parseForm(req),f=fields(p);let qid=crypto.randomUUID();
      if(action==='create'){
        password(p.password);check(p.password===p.password_confirm,'비밀번호 확인이 일치하지 않습니다.');check(uuid(p.request_id),'등록 정보를 다시 확인해 주세요.');
        const {data:existing}=await db.from('board_questions').select('id').eq('request_id',p.request_id).eq('state','published').maybeSingle();if(existing)return json({id:existing.id});
      }else{qid=p.id;check(uuid(qid),'질문 주소를 확인해 주세요.');await owner(req,qid);await question(qid);}
      const old=action==='edit'?await photos(qid):[],keep=Array.isArray(p.keep_photos)?p.keep_photos:[];
      check(keep.every((id: unknown)=>old.some(x=>x.id===id)),'사진 선택을 확인해 주세요.');check(keep.length+files.length<=3,'사진은 최대 3장입니다.');
      const added: Awaited<ReturnType<typeof upload>>[]=[];
      try{
        for(let i=0;i<files.length;i++)added.push(await upload(files[i],qid,keep.length+i));
        const all=[...keep.map((id:string,i:number)=>({...old.find(x=>x.id===id),position:i})),...added];
        await privateOp(action,{...f,id:qid,request_id:p.request_id,password_hash:action==='create'?await hashPassword(p.password):undefined,photos:all});
        const removed=old.filter(x=>!keep.includes(x.id));if(removed.length)await db.storage.from('board-photos').remove(removed.map(x=>x.storage_path));
        return json({id:qid});
      }catch(e){if(added.length)await db.storage.from('board-photos').remove(added.map(x=>x.storage_path));throw e;}
    }
    let p;try{p=JSON.parse(new TextDecoder().decode(await limitedBody(req,65536)));}catch(e){if(e instanceof UserError)throw e;throw new UserError('입력 내용을 확인해 주세요.');}
    if(action==='verify'){
      check(uuid(p.id),'질문 주소를 확인해 주세요.');await rate(req,'verify-ip',30);await rate(req,'verify-post',8,p.id);await question(p.id);
      const pass=password(p.password),c=await privateOp('credential',{id:p.id});
      const hash=c.hash||'pbkdf2$600000$invalid$invalid',salt=hash.split('$')[2];
      check(equal(await hashPassword(pass,salt),hash),'비밀번호가 일치하지 않습니다.',403);
      const token=crypto.randomUUID()+crypto.randomUUID();await privateOp('session_create',{id:p.id,hash:await sha(token)});return json({token,expires_in:900});
    }
    if(action==='delete'){check(uuid(p.id),'질문 주소를 확인해 주세요.');await rate(req,'delete',20);await owner(req,p.id);await question(p.id);await privateOp('delete',{id:p.id});return json({deleted:true});}
    if(action==='report'){
      await rate(req,'report',10);await question(p.id);check(['spam','privacy','abuse','other'].includes(p.reason),'신고 사유를 선택해 주세요.');
      const note=typeof p.note==='string'?p.note.trim():'';check(note.length<=1000,'추가 설명은 1,000자 이내로 입력해 주세요.');
      const {error}=await db.from('board_reports').insert({question_id:p.id,reason:p.reason,note});if(error)throw Error('report save failed');return json({received:true});
    }
    if(action.startsWith('admin-')){
      const a=await admin(req);await rate(req,'admin-write',120);
      if(action==='admin-me')return json({admin:a});
      if(action==='admin-answer'){
        await question(p.id,true);const body=text(p.body,1,15000,'답변');if(p.related_work_id)check(catalog.some(t=>t.id===p.related_work_id),'관련 작업을 확인해 주세요.');
        if(p.answer_id){check(uuid(p.answer_id),'답변을 확인해 주세요.');const {data,error}=await db.from('board_answers').update({body,related_work_id:p.related_work_id||null,published:!!p.published,updated_at:new Date().toISOString()}).eq('id',p.answer_id).eq('question_id',p.id).select('id').single();check(data&&!error,'답변을 저장할 수 없습니다.');}
        else{const {error}=await db.from('board_answers').insert({question_id:p.id,author_id:a.user_id,body,related_work_id:p.related_work_id||null,published:!!p.published});if(error)throw Error('answer save failed');}
      }else if(action==='admin-state'){
        check(['published','hidden','deleted'].includes(p.state),'처리 상태를 확인해 주세요.');await question(p.id,true);
        const {error}=await db.from('board_questions').update({state:p.state,updated_at:new Date().toISOString(),deleted_at:p.state==='deleted'?new Date().toISOString():null}).eq('id',p.id);if(error)throw Error('moderation failed');
      }else if(action==='admin-report'){
        check(uuid(p.report_id),'신고를 확인해 주세요.');const {error}=await db.from('board_reports').update({state:'reviewed',reviewed_at:new Date().toISOString()}).eq('id',p.report_id);if(error)throw Error('report update failed');
      }else throw new UserError('지원하지 않는 요청입니다.');
      await privateOp('audit',{actor:a.user_id,id:p.id,action});return json({saved:true});
    }
    throw new UserError('지원하지 않는 요청입니다.');
  }catch(e){if(e instanceof UserError)return json({error:e.message},e.status);console.error('board operation failed',e instanceof Error?e.name:'unknown');return json({error:'처리하지 못했습니다. 입력 내용을 유지한 채 잠시 후 다시 시도해 주세요.'},500);}
});
