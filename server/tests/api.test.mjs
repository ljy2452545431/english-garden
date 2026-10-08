import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createApp} from '../app.mjs';
import {randomUUID} from 'node:crypto';
const aliceTestPassword=randomUUID(),bobTestPassword=randomUUID(),aiTestKey=randomUUID();

async function fixture(t, options={}) {
  const app=createApp({dbPath:':memory:',origins:['http://localhost:5173'],...options});
  app.createUser('alice',aliceTestPassword,'小花');
  app.createUser('bob',bobTestPassword,'小树');
  await new Promise(resolve=>app.server.listen(0,'127.0.0.1',resolve));
  t.after(()=>new Promise(resolve=>app.server.close(()=>{app.close();resolve();})));
  const base=`http://127.0.0.1:${app.server.address().port}`;
  async function call(path,body,token,method=body?'POST':'GET') {
    const response=await fetch(base+path,{method,headers:{'content-type':'application/json',...(token?{authorization:`Bearer ${token}`}:{})},...(body?{body:JSON.stringify(body)}:{})});
    return {status:response.status,...await response.json()};
  }
  return {app,call,base};
}
test('真实 SQLite 账号约束、登录、状态版本和两人空间',async t=>{
  const {app,call}=await fixture(t);
  assert.throws(()=>app.createUser('third','third secure password','第三人'),/最多/);
  assert.equal((await call('/api/state')).status,401);
  assert.equal((await call('/api/login',{username:'alice',password:'wrong'})).status,401);
  const a=(await call('/api/login',{username:'alice',password:aliceTestPassword})).data.token;
  const b=(await call('/api/login',{username:'bob',password:bobTestPassword})).data.token;
  assert.equal((await call('/api/state')).status,401);
  assert.equal((await call('/api/state',{version:0,state:{day:4,completed:[1],notes:'private-note'}},a,'PATCH')).data.version,1);
  assert.equal((await call('/api/state',{version:0,state:{day:5}},a,'PATCH')).status,409);
  assert.deepEqual((await call('/api/state',null,b)).data.state,{});
  const message='<img src=x onerror=alert(1)>';
  assert.equal((await call('/api/messages',{text:message},a)).data.text,message);
  const space=(await call('/api/space',null,b)).data;
  assert.equal(space.users.length,2); assert.equal(space.messages[0].text,message);
  assert.deepEqual(space.users[0].state,{completed:[1]});assert.equal(JSON.stringify(space).includes('private-note'),false);
  assert.equal(JSON.stringify(space).includes('password'),false);
  assert.equal((await call('/api/messages',{text:'x'.repeat(1001)},a)).status,400);
  await call('/api/logout',{},a); assert.equal((await call('/api/me',null,a)).status,401);
});
test('CORS、消息限流、AI 未配置',async t=>{
  const {call,base}=await fixture(t,{messageLimit:1});
  assert.equal((await fetch(base+'/health',{headers:{origin:'https://evil.example'}})).status,403);
  const token=(await call('/api/login',{username:'alice',password:aliceTestPassword})).data.token;
  assert.equal((await call('/api/messages',{text:'你好'},token)).status,201);
  assert.equal((await call('/api/messages',{text:'再见'},token)).status,429);
  assert.equal((await call('/api/ai-feedback',{kind:'writing',text:'Hello'},token)).status,503);
});
test('AI超时有界，不重试；转写反馈不提供发音分数',async t=>{
  let calls=0;
  const fakeFetch=async (url,options)=>{calls++;return new Promise((resolve,reject)=>options.signal.addEventListener('abort',()=>reject(options.signal.reason),{once:true}));};
  const {call}=await fixture(t,{ai:{provider:'deepseek',apiKey:'test-only',model:'deepseek-chat',baseUrl:'https://api.deepseek.com'},aiTimeoutMs:30,fetchImpl:fakeFetch});
  const token=(await call('/api/login',{username:'alice',password:aliceTestPassword})).data.token;
  assert.equal((await call('/api/ai-feedback',{kind:'speaking',text:'Hello'},token)).status,504);
  assert.equal(calls,1);
});
test('AI 成功、错误恢复、输入限制及官方地址限制',async t=>{
  assert.throws(()=>createApp({dbPath:':memory:',ai:{provider:'deepseek',apiKey:'test',model:'x',baseUrl:'https://evil.example'}}),/官方/);
  let mode='ok';let sent;
  const fakeFetch=async(url,options)=>{sent=options;return mode==='ok'?{ok:true,json:async()=>({choices:[{message:{content:'练习反馈：建议使用完整句。'}}]})}:{ok:false};};
  const {call}=await fixture(t,{ai:{provider:'mimo',apiKey:aiTestKey,model:'test-model',baseUrl:'https://api.xiaomimimo.com/v1'},fetchImpl:fakeFetch});
  const token=(await call('/api/login',{username:'alice',password:aliceTestPassword})).data.token;
  const result=await call('/api/ai-feedback',{kind:'speaking',text:'Hello'},token);
  assert.equal(result.status,200);assert.equal(result.data.practiceOnly,true);
  assert.equal(sent.headers['api-key'],aiTestKey);assert.equal(sent.redirect,'error');
  assert.match(JSON.parse(sent.body).messages[0].content,/绝不能评价发音/);
  assert.equal((await call('/api/ai-feedback',{kind:'writing',text:'x'.repeat(12001)},token)).status,400);
  mode='error';assert.equal((await call('/api/ai-feedback',{kind:'writing',text:'Hello'},token)).status,502);
  mode='ok';assert.equal((await call('/api/ai-feedback',{kind:'writing',text:'Hello'},token)).status,200);
  assert.equal((await call('/api/ai-feedback',{kind:'writing',text:'Hello'},token)).status,429);
});
test('JSON 契约、会话替换和乐观并发只允许一方写入',async t=>{
  const {call,base}=await fixture(t);
  const login=()=>call('/api/login',{username:'alice',password:aliceTestPassword});
  const first=(await login()).data.token;const second=(await login()).data.token;
  assert.equal((await call('/api/me',null,first)).status,401);
  assert.equal((await call('/api/me',null,second)).data.displayName,'小花');
  const writes=await Promise.all([call('/api/state',{version:0,state:{day:1}},second,'PATCH'),call('/api/state',{version:0,state:{day:2}},second,'PATCH')]);
  assert.deepEqual(writes.map(r=>r.status).sort(),[200,409]);
  assert.equal((await call('/api/state',{version:-1,state:{}},second,'PATCH')).status,400);
  assert.equal((await call('/api/unknown',null,second)).status,404);
  assert.equal((await fetch(base+'/api/login',{method:'POST',body:'{' })).status,400);
  assert.equal((await fetch(base+'/api/login',{method:'POST',body:JSON.stringify({password:'x'.repeat(1153434)})})).status,413);
  assert.equal((await call('/api/state',{version:1,state:{journal:'x'.repeat(100000)}},second,'PATCH')).status,200);
  assert.equal((await call('/api/state',{version:2,state:{journal:'x'.repeat(1048576)}},second,'PATCH')).status,413);
  const options=await fetch(base+'/api/state',{method:'OPTIONS',headers:{origin:'http://localhost:5173'}});
  assert.equal(options.status,204);assert.equal(options.headers.get('access-control-allow-origin'),'http://localhost:5173');
});
test('录音真实BLOB、默认私有、共享、主人修改删除、大小及MIME限制',async t=>{
  const {call,base}=await fixture(t);
  const a=(await call('/api/login',{username:'alice',password:aliceTestPassword})).data.token;
  const b=(await call('/api/login',{username:'bob',password:bobTestPassword})).data.token;
  const bytes=Buffer.from('audio fixture binary');
  const upload=async(token,mime='audio/webm',data=bytes)=>fetch(base+'/api/recordings?title=Hello',{method:'POST',headers:{authorization:`Bearer ${token}`,'content-type':mime},body:data});
  const response=await upload(a);assert.equal(response.status,201);const recording=(await response.json()).data;
  assert.equal(recording.shared,false);
  assert.equal((await call('/api/recordings',null,b)).data.recordings.length,0);
  assert.equal((await call(`/api/recordings/${recording.id}`,null,b)).status,404);
  const audio=await fetch(base+`/api/recordings/${recording.id}`,{headers:{authorization:`Bearer ${a}`}});
  assert.deepEqual(Buffer.from(await audio.arrayBuffer()),bytes);assert.equal(audio.headers.get('content-type'),'audio/webm');
  await call(`/api/recordings/${recording.id}`,{shared:true},a,'PATCH');
  assert.equal((await call('/api/recordings',null,b)).data.recordings[0].shared,true);
  assert.equal((await fetch(base+`/api/recordings/${recording.id}`,{headers:{authorization:`Bearer ${b}`}})).status,200);
  assert.equal((await call(`/api/recordings/${recording.id}`,{},b,'DELETE')).status,403);
  assert.equal((await call(`/api/recordings/${recording.id}`,{shared:false},b,'PATCH')).status,403);
  assert.equal((await call(`/api/recordings/${recording.id}`,{shared:'true'},a,'PATCH')).status,400);
  await call(`/api/recordings/${recording.id}`,{shared:false},a,'PATCH');
  assert.equal((await call('/api/recordings',null,b)).data.recordings.length,0);
  assert.equal((await upload(a,'text/html')).status,415);
  assert.equal((await upload(a,'audio/webm',Buffer.alloc(0))).status,400);
  assert.equal((await upload(a,'audio/webm',Buffer.alloc(5*1024*1024+1))).status,413);
  assert.equal((await call(`/api/recordings/${recording.id}`,{},a,'DELETE')).status,200);
  assert.equal((await call(`/api/recordings/${recording.id}`,null,a)).status,404);
});
test('AI 全局并发最多两次，繁忙立即返回，恢复后能使用',async t=>{
  const waiting=[];
  const fakeFetch=async()=>new Promise(resolve=>waiting.push(()=>resolve({ok:true,json:async()=>({choices:[{message:{content:'练习建议'}}]})})));
  const {call}=await fixture(t,{ai:{provider:'deepseek',apiKey:'test',model:'x'},fetchImpl:fakeFetch});
  const a=(await call('/api/login',{username:'alice',password:aliceTestPassword})).data.token;
  const b=(await call('/api/login',{username:'bob',password:bobTestPassword})).data.token;
  const input={kind:'writing',text:'Hello world'};
  const first=call('/api/ai-feedback',input,a);const second=call('/api/ai-feedback',input,b);
  while(waiting.length<2) await new Promise(resolve=>setTimeout(resolve,5));
  assert.equal((await call('/api/ai-feedback',input,a)).status,429);
  waiting.splice(0).forEach(resolve=>resolve());
  assert.equal((await first).status,200);assert.equal((await second).status,200);
  const next=call('/api/ai-feedback',input,b);while(waiting.length<1) await new Promise(resolve=>setTimeout(resolve,5));waiting[0]();
  assert.equal((await next).status,200);
});
