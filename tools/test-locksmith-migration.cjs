// 기존 YESSURI/Supabase/Mercur DB 대신 매 실행마다 새 로컬 검증 DB만 사용한다.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),lab=path.resolve(root,'../yessuri-marketplace-lab');
const {Pool}=require(path.join(lab,'backend/node_modules/pg'));
const results=[];const check=(name,ok)=>{assert(ok,name);results.push({name,result:'PASS'})};
async function run(){
 const cfg=JSON.parse(fs.readFileSync(path.join(lab,'runtime/private-config.json'),'utf8'));
 const connection=new URL(cfg.databaseUrl);
 assert.equal(connection.hostname,'127.0.0.1');assert.equal(connection.pathname,'/yessuri_trial');
 const name='yessuri_locksmith_verify_'+new Date().toISOString().replace(/\D/g,'').slice(0,14)+'_'+crypto.randomBytes(3).toString('hex');
 assert(/^yessuri_locksmith_verify_\d{14}_[a-f0-9]{6}$/.test(name));
 const controlURL=new URL(connection);controlURL.pathname='/postgres';const control=new Pool({connectionString:controlURL.toString(),max:1});let pool,created=false;
 try{
  await control.query('CREATE DATABASE "'+name+'"');created=true;
  connection.pathname='/'+name;pool=new Pool({connectionString:connection.toString(),max:1});
  check('기존 DB와 분리된 새 로컬 검증 DB', (await pool.query('SELECT current_database() db')).rows[0].db===name);
  await pool.query('CREATE TABLE public.board_questions(id integer primary key,group_id text not null)');
  const prior=fs.readFileSync(path.join(root,'supabase/migrations/202610230001_board_fields.sql'),'utf8');
  const next=fs.readFileSync(path.join(root,'supabase/migrations/202611020001_locksmith_board_field.sql'),'utf8');
  const values=sql=>[...sql.match(/group_id in \(([^)]+)\)/)[1].matchAll(/'([^']+)'/g)].map(m=>m[1]);
  const oldValues=values(prior),newValues=values(next);
  check('기존25개 분야/legacy 허용값 전부 보존',oldValues.length===25&&oldValues.every(v=>newValues.includes(v)));
  check('열쇠 분야만 추가·중복 없음',newValues.length===oldValues.length+1&&new Set(newValues).size===newValues.length&&newValues.includes('열쇠·도어락'));
  await pool.query(prior.replace('drop constraint board_questions_group_id_check','drop constraint if exists board_questions_group_id_check'));
  for(let i=0;i<oldValues.length;i++)await pool.query('INSERT INTO board_questions(id,group_id) VALUES($1,$2)',[i+1,oldValues[i]]);
  const before=JSON.stringify((await pool.query('SELECT * FROM board_questions ORDER BY id')).rows);
  await pool.query(next);
  check('마이그레이션 후 기존 질문 행 불변',before===JSON.stringify((await pool.query('SELECT * FROM board_questions ORDER BY id')).rows));
  await pool.query('INSERT INTO board_questions(id,group_id) VALUES($1,$2)',[100,'열쇠·도어락']);
  check('신규 분야 저장·재조회', (await pool.query('SELECT group_id FROM board_questions WHERE id=100')).rows[0].group_id==='열쇠·도어락');
  let rejected=false;try{await pool.query('INSERT INTO board_questions(id,group_id) VALUES(101,$1)',['미허용 분야'])}catch(e){rejected=e.code==='23514'}
  check('미허용 분야는 계속 차단',rejected);
  check('기존 행 수와 값 재확인',before===JSON.stringify((await pool.query('SELECT * FROM board_questions WHERE id<100 ORDER BY id')).rows));
 }finally{
  if(pool)await pool.end();
  // 이번 실행에서 직접 만든 정확한 검증 DB만 정리한다. 운영/기존 DB는 대상이 될 수 없다.
  if(created)await control.query('DROP DATABASE "'+name+'"');
  await control.end();
 }
}
run().catch(e=>{results.push({name:'마이그레이션 검증 중단',result:'FAIL',detail:e.message});process.exitCode=1}).finally(()=>{const out=path.join(root,'docs/locksmith-20261102');fs.mkdirSync(out,{recursive:true});fs.writeFileSync(path.join(out,'migration-results.json'),JSON.stringify({production_access:false,results},null,2));console.log(JSON.stringify(results));});
