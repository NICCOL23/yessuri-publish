import {reviewedManagement,managementRpc} from './admin-management.ts';
type Dependencies={db:any;root:string;bucket:string;admin:(req:Request)=>Promise<any>;rpc:(op:string,p?:any)=>Promise<any>;decode:(p:any)=>Promise<Uint8Array>;sha:(s:string)=>Promise<string>};
function fail(message:string,status=400):never{throw Object.assign(Error(message),{status});}
function need(v:unknown,message:string,status=400){if(!v)fail(message,status);}
const uid=(s:any)=>typeof s==='string'&&/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(s);
const bounded=(v:any,max:number,label:string,min=0)=>{need(typeof v==='string'&&v.trim().length>=min&&v.length<=max,label+'을 확인해 주세요.');return v.trim();};
export function publicPhotosV2(profile:any){const seen=new Set<string>();return [...(profile.work_photos||[]).filter((p:any)=>p.kind!=='case'),...(profile.image?[{image:profile.image,imageAlt:profile.image_alt||profile.name+' 대표 이미지'}]:[])].filter((p:any)=>p&&typeof p.image==='string'&&!seen.has(p.image)&&seen.add(p.image));}
export function publicFilePath(image:any,root:string,id:string){try{const u=new URL(image),r=u.searchParams.get('route')||'',m=r.match(/^\/api\/public-profile-images\/([a-f0-9-]{36})\/([a-f0-9-]{36})\.jpg$/i);return u.origin===new URL(root).origin&&m&&m[1]===id?'public-profiles/'+id+'/'+m[2]+'.jpg':null;}catch{return null;}}
async function rpcError(db:any,name:string,args:any){const {data,error}=await db.rpc(name,args);if(error){const m=error.message||'';if(m.includes('permission denied'))fail('관리자 로그인이 필요합니다.',403);if(m.includes('not found'))fail('관리할 공개 업체 또는 신청을 찾지 못했습니다.',404);if(m.includes('version conflict'))fail('내용이 변경되었습니다. 새로고침 후 확인해 주세요.',409);if(m.includes('command conflict')||m.includes('command already processed'))fail('이미 처리된 요청이거나 재시도 내용이 다릅니다. 현재 상태를 다시 확인하세요.',409);if(m.includes('invalid classification'))fail('전문 분야·출장 지역은 목록에서 선택하거나 기타 항목으로 작성하세요.');if(m.includes('invalid'))fail('공개 정보·사진·동의 입력을 다시 확인해 주세요.');fail('관리자 변경을 저장하지 못했습니다. 현재 상태를 확인한 뒤 같은 요청으로 재시도하세요.',500);}return data;}
export async function drainPublicFiles(d:Dependencies){let pending=false;for(let n=0;n<20;n++){const job=await rpcError(d.db,'technician_profile_files_v2',{op:'claim',p:{}});if(!job?.path)break;need(/^public-profiles\/[a-f0-9-]{36}\/[a-f0-9-]{36}\.jpg$/.test(job.path),'잘못된 사진 정리 경로입니다.',500);const {error}=await d.db.storage.from(d.bucket).remove([job.path]);await rpcError(d.db,'technician_profile_files_v2',{op:error?'failed':'complete',p:{path:job.path}});if(error){pending=true;break;}}return {ok:!pending,pending};}
export async function adminV2Route(req:Request,route:string,input:any|undefined,d:Dependencies):Promise<any|undefined>{
 const profileRoute=route.match(/^\/api\/admin\/(?:profiles\/(technician-[a-f0-9-]{36})|applications\/([a-f0-9-]{36}))\/(profile-management|public-photos|work-cases|representative-image)$/i);
 if(route==='/api/admin/activity'&&req.method==='POST'){const s=await d.admin(req);return rpcError(d.db,'technician_admin_activity_v2',{p_hash:s.hash});}
 if(route==='/api/admin/profiles'&&req.method==='GET'){const s=await d.admin(req);const rows=await managementRpc(d.db,s.hash,'profiles');return {...rows,count:rows.profiles?.length||0};}
 if(route.startsWith('/api/admin/profiles?')&&req.method==='GET'){const s=await d.admin(req),q=new URL(route,'https://local').searchParams,raw=q.get('offset');need([...q.keys()].every(k=>k==='offset')&&q.getAll('offset').length===1&&raw!==null&&/^(0|[1-9][0-9]*)$/.test(raw),'업체 조회 시작 위치를 확인해 주세요.');const offset=Number(raw);need(Number.isSafeInteger(offset)&&offset>=0&&offset<=10000&&offset%100===0,'업체 조회 범위를 확인해 주세요.');const rows=await managementRpc(d.db,s.hash,'profiles',{offset}),profiles=rows.profiles;need(Array.isArray(profiles)&&profiles.length<=100,'업체 목록을 확인하지 못했습니다.',500);return{...rows,count:profiles.length,pagination:{offset,limit:100,hasMore:profiles.length===100}};}
 if(route==='/api/admin/retry-files'&&req.method==='POST'){await d.admin(req);return drainPublicFiles(d);}
 if(!profileRoute)return undefined;
 const s=await d.admin(req),id=(profileRoute[1]||'technician-'+profileRoute[2]).slice(11),profileId='technician-'+id,part=profileRoute[3];need(uid(id),'업체 식별자를 확인해 주세요.');
 const files=(op:string,p:any={})=>rpcError(d.db,'technician_profile_files_v2',{op,p:{...p,hash:s.hash,profileId}});
 if(part==='profile-management'){
  if(req.method==='GET')return managementRpc(d.db,s.hash,'profile-get',{profileId});
  need(req.method==='POST','지원하지 않는 요청입니다.',405);const p=input;need(p&&typeof p==='object','입력 내용을 확인해 주세요.');const operationId=p.operationId||crypto.randomUUID();need(uid(operationId),'요청 식별자를 확인해 주세요.');const requestDigest=await d.sha(route+'\n'+JSON.stringify({...p,operationId:undefined}));return managementRpc(d.db,s.hash,'profile-manage',{profileId,...reviewedManagement(p,id),operationId,requestDigest});
 }
 const profile=await files('snapshot'),all=profile.work_photos||[],photos=publicPhotosV2(profile),cases=all.filter((p:any)=>p.kind==='case');
 const response=(p:any)=>({photos:publicPhotosV2(p),cases:(p.work_photos||[]).filter((v:any)=>v.kind==='case'),image:p.image,version:JSON.stringify(p.work_photos||[])});
 if(req.method==='GET'){need(part!=='representative-image','지원하지 않는 요청입니다.',405);return response(profile);}
 need(req.method==='POST','지원하지 않는 요청입니다.',405);const p=input;need(p&&typeof p==='object','입력 내용을 확인해 주세요.');const operationId=p.operationId||crypto.randomUUID();need(uid(operationId),'요청 식별자를 확인해 주세요.');const requestDigest=await d.sha(route+'\n'+JSON.stringify({...p,operationId:undefined}));
 // Check committed operation before legacy client versions to make response-loss retry harmless.
 const replay=await rpcError(d.db,'technician_admin_command_v2',{p_hash:s.hash,operation_id:operationId,request_digest:requestDigest});if(replay.processed)return response(profile);
 const changes:any={image:profile.image,work_photos:all},removedFiles:any[]=[];let action='';
 const queueOld=(image:string)=>{const path=publicFilePath(image,d.root,id);if(path)removedFiles.push({path,image});};
 const upload=async(bytes:Uint8Array)=>{
  const path='public-profiles/'+id+'/'+operationId+'.jpg',image=d.root+'/functions/v1/technician-api?route='+encodeURIComponent('/api/public-profile-images/'+id+'/'+operationId+'.jpg');
  await files('stage',{path,image,operationId,requestDigest});
  const {error}=await d.db.storage.from(d.bucket).upload(path,bytes,{contentType:'image/jpeg',upsert:false});
  if(error&&!['409','Duplicate'].includes(String(error.statusCode||error.error)))fail('사진 업로드를 완료하지 못했습니다. 같은 요청으로 재시도하세요.',500);
  return {image,imageAlt:profile.name+' 공개 사진',imageType:'work'};
 };
 if(part==='work-cases'){
  need(p.version===JSON.stringify(all),'작업 사례가 변경되었습니다. 새로고침 후 확인해 주세요.',409);need(['save','delete'].includes(p.action),'작업을 확인해 주세요.');let next;
  if(p.action==='delete'){need(p.confirm===true&&cases.some((c:any)=>c.id===p.id),'삭제할 작업 사례를 확인해 주세요.');next=cases.filter((c:any)=>c.id!==p.id);action='work-case-delete';}
  else{need(!p.id||cases.some((c:any)=>c.id===p.id),'수정할 작업 사례가 없습니다.',404);need(p.id||cases.length<30,'작업 사례는 최대30개입니다.');const title=bounded(p.title,120,'제목',1),description=bounded(p.description,6000,'설명',1),date=bounded(p.date,10,'작업일',10);need(/^\d{4}-\d{2}-\d{2}$/.test(date)&&Number.isFinite(Date.parse(date+'T00:00:00Z'))&&new Date(date+'T00:00:00Z').toISOString().slice(0,10)===date,'작업일을 확인해 주세요.');need(Array.isArray(p.photos)&&p.photos.length<=10&&new Set(p.photos).size===p.photos.length&&p.photos.every((url:any)=>photos.some((ph:any)=>ph.image===url)),'이 업체의 공개 사진만 선택해 주세요.');const item={kind:'case',id:p.id||operationId,title,description,date,photos:p.photos.map((url:any)=>photos.find((ph:any)=>ph.image===url))};next=p.id?cases.map((c:any)=>c.id===p.id?item:c):[item,...cases];action='work-case-save';}
  changes.work_photos=[...all.filter((v:any)=>v.kind!=='case'),...next];
 }else if(part==='representative-image'){
  need(p.imageConsent===true,'선택한 사진의 공개를 확인해 주세요.');const detail=await d.rpc('admin-detail',{id,hash:s.hash});need(Number.isInteger(p.version)&&p.version===detail.application.version,'신청이 변경되었습니다.',409);need(uid(p.photoId)&&detail.photos.some((ph:any)=>ph.id===p.photoId),'이 신청의 사진을 선택해 주세요.',404);need(photos.length<10,'공개 사진은 최대10장입니다.');const photo=await d.rpc('photo',{id:p.photoId,hash:s.hash});need(photo.application_id===id,'이 신청의 사진을 선택해 주세요.',404);const {data:blob,error}=await d.db.storage.from(d.bucket).download(photo.storage_path);need(blob&&!error,'첨부사진을 읽을 수 없습니다.',404);const item=await upload(new Uint8Array(await blob.arrayBuffer()));changes.image=item.image;changes.image_alt=profile.name+' 대표 이미지';changes.image_type='work';changes.image_position='center';changes.work_photos=[...photos,item,...cases];action='representative-image';
 }else{
  need(['upload','replace','edit','reorder','select','delete'].includes(p.action),'사진 작업을 확인해 주세요.');if(['edit','reorder','replace'].includes(p.action))need(p.version===JSON.stringify(all),'사진이 변경되었습니다. 새로고침 후 확인해 주세요.',409);
  let ordered=photos.slice(),nextCases=cases;
  if(p.action==='upload'){need(p.imageConsent===true,'사진 공개 동의를 확인해 주세요.');need(photos.length<10,'공개 사진은 최대10장입니다.');ordered.push(await upload(await d.decode(p.photo)));}
  else if(p.action==='reorder'){need(Array.isArray(p.order)&&p.order.length===photos.length&&new Set(p.order).size===photos.length&&p.order.every((u:any)=>photos.some((ph:any)=>ph.image===u)),'사진 순서를 확인해 주세요.');ordered=p.order.map((u:any)=>photos.find((ph:any)=>ph.image===u));nextCases=cases.map((c:any)=>({...c,photos:(c.photos||[]).slice().sort((a:any,b:any)=>p.order.indexOf(a.image)-p.order.indexOf(b.image))}));}
  else{need(typeof p.image==='string'&&photos.some((ph:any)=>ph.image===p.image),'등록된 공개 사진을 선택해 주세요.',404);
   if(p.action==='select'){need(p.imageConsent===true,'대표 이미지 변경을 확인해 주세요.');changes.image=p.image;changes.image_alt=profile.name+' 대표 이미지';changes.image_type='work';changes.image_position='center';}
   else if(p.action==='delete'){need(p.confirm===true,'사진 삭제를 확인해 주세요.');need(!cases.some((c:any)=>(c.photos||[]).some((ph:any)=>ph.image===p.image)),'작업 사례에서 먼저 사진을 제외해 주세요.',409);ordered=photos.filter((ph:any)=>ph.image!==p.image);if(profile.image===p.image)changes.image=null;queueOld(p.image);}
   else{const caption=bounded(p.caption??'',500,'사진 설명');let replacement={...photos.find((ph:any)=>ph.image===p.image),caption,imageAlt:caption||profile.name+' 공개 사진'};if(p.action==='replace'){need(p.imageConsent===true,'사진 공개 동의를 확인해 주세요.');replacement={...replacement,...await upload(await d.decode(p.photo))};replacement.imageAlt=caption||profile.name+' 공개 사진';if(profile.image===p.image)changes.image=replacement.image;queueOld(p.image);}ordered=photos.map((ph:any)=>ph.image===p.image?replacement:ph);nextCases=cases.map((c:any)=>({...c,photos:(c.photos||[]).map((ph:any)=>ph.image===p.image?replacement:ph)}));}
  }changes.work_photos=[...ordered,...nextCases];action='photo-'+p.action;
 }
 const result=await files('commit',{changes,expectedVersion:profile.managementVersion,operationId,requestDigest,action,removedFiles});let pending=false;try{pending=(await drainPublicFiles(d)).pending;}catch{pending=true;}return {...response(result),pending};
}
