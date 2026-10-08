import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createHandler} from '../functions/garden/app.ts';
import {route} from '../functions/garden/helpers.ts';

const aid='00000000-0000-4000-8000-000000000001',bid='00000000-0000-4000-8000-000000000002';
const config={url:'https://example.supabase.co',serviceKey:'private-service-test',publicKey:'public-test',origins:['https://ljy2452545431.github.io']};
function fixture(options={}) {
  const states=new Map([[aid,{version:0,state:{}}],[bid,{version:0,state:{}}]]),recordings=new Map(),audio=new Map(),revoked=new Set(),leases=new Set();let messageId=0;const messages=[];const calls=[];let forceLimit=false;let conflict=false;let deleteFails=Boolean(options.deleteFails);
  const result=(value,status=200)=>new Response(JSON.stringify(value),{status,headers:{'content-type':'application/json'}});
  const fakeFetch=async(url,init={})=>{
    const parsed=new URL(url);const path=parsed.pathname;calls.push({path,init});const body=init.body&&typeof init.body==='string'?JSON.parse(init.body):{};const header=new Headers(init.headers);
    if(parsed.hostname==='api.deepseek.com')return options.aiFetch?.(url,init)??result({choices:[{message:{content:'练习建议'}}]});
    if(path==='/auth/v1/token') return body.password==='wrong'?result({},400):result({access_token:body.email==='outsider@test.example'?'outsider':body.email==='bob@test.example'?'b':'a',user:{id:body.email==='outsider@test.example'?'outsider':body.email==='bob@test.example'?bid:aid,email:body.email}});
    if(path==='/auth/v1/user') {const token=header.get('authorization')?.slice(7);return ['a','b','outsider'].includes(token)?result({id:token==='a'?aid:token==='b'?bid:'outsider',email:`${token}@test.example`}):result({},401);}
    if(path==='/auth/v1/logout') return result(null);
    assert.equal(header.get('authorization'),'Bearer private-service-test');
    if(path==='/rest/v1/members') {const id=parsed.searchParams.get('id')?.slice(3);return result(id===aid?[{id:aid,display_name:'小花'}]:id===bid?[{id:bid,display_name:'小树'}]:[]);}
    if(path==='/rest/v1/garden_revoked_sessions') {
      if(init.method==='POST'){revoked.add(body.token_hash);return result([body]);}return result(revoked.has(parsed.searchParams.get('token_hash')?.slice(3))?[{token_hash:'revoked'}]:[]);
    }
    if(path==='/rest/v1/rpc/garden_take_limit')return result(!forceLimit);
    if(path==='/rest/v1/rpc/garden_save_state') {
      const state=states.get(body.p_user);if(conflict||state.version!==body.p_version)return result(null);state.version++;state.state=body.p_state;return result(state);
    }
    if(path==='/rest/v1/rpc/garden_space_users') return result([{id:aid,displayName:'小花',state:{completed:states.get(aid).state.completed??[]}},{id:bid,displayName:'小树',state:{completed:[]}}]);
    if(path==='/rest/v1/rpc/garden_acquire_ai') {if(leases.size>=2)return result('busy');leases.add(body.p_lease);return result('ok');}
    if(path==='/rest/v1/garden_ai_leases') {leases.delete(parsed.searchParams.get('id')?.slice(3));return result([]);}
    if(path==='/rest/v1/states') {const state=states.get(parsed.searchParams.get('user_id')?.slice(3));return result([{version:state.version,body:state.state}]);}
    if(path==='/rest/v1/messages') {
      if(init.method==='POST'){const m={id:++messageId,...body,created_at:'2026-10-08T00:00:00Z',members:{display_name:body.user_id===aid?'小花':'小树'}};messages.push(m);return result([m]);}return result([...messages].reverse());
    }
    if(path==='/rest/v1/rpc/garden_reserve_recording') {recordings.set(body.p_id,{id:body.p_id,user_id:body.p_user,title:body.p_title,mime:body.p_mime,size:body.p_size,shared:body.p_shared,created_at:'2026-10-08T00:00:00Z'});return result(true);}
    if(path==='/rest/v1/recordings') {
      const id=parsed.searchParams.get('id')?.slice(3);let rows=id?[recordings.get(id)].filter(Boolean):[...recordings.values()];const filter=parsed.searchParams.get('or');if(filter){const owner=filter.match(/user_id.eq.([^,]+)/)?.[1];rows=rows.filter(r=>r.user_id===owner||r.shared);}
      if(init.method==='PATCH'){rows.forEach(r=>Object.assign(r,body));return result(rows);}if(init.method==='DELETE'){rows.forEach(r=>recordings.delete(r.id));return result(rows);}return result(rows);
    }
    if(path.startsWith('/storage/v1/object')) {
      if(init.method==='DELETE'){if(deleteFails)throw new Error('storage delete unavailable');for(const key of body.prefixes)audio.delete(key);return result([]);}
      const key=path.split('garden-recordings/')[1];if(init.method==='POST'){audio.set(key,init.body);if(options.commitThenThrow)throw new Error('response lost after durable commit');return result({Key:key});}return new Response(audio.get(key),{status:audio.has(key)?200:404});
    }
    throw new Error('Unexpected upstream '+path);
  };
  const handler=createHandler({...config,...options.config},{fetch:fakeFetch,aiTimeoutMs:options.aiTimeoutMs});
  const call=async(path,body,token,method=body?'POST':'GET',headers={})=>{
    const response=await handler(new Request('https://example.supabase.co/functions/v1/garden'+path,{method,headers:{'content-type':'application/json',...(token?{authorization:`Bearer ${token}`}:{}) ,...headers},...(body===undefined?{}:{body:JSON.stringify(body)})}));return {status:response.status,...await response.json()};
  };
  return {handler,call,calls,leases,recordings,audio,setDeleteFailure:value=>deleteFails=value,anotherHandler:()=>createHandler({...config,...options.config},{fetch:fakeFetch,aiTimeoutMs:options.aiTimeoutMs}),setLimit:value=>forceLimit=value,setConflict:value=>conflict=value};
}
test('身份验证、双人 allowlist、状态隔离及摘要和409契约',async()=>{
  const {call}=fixture();assert.equal((await call('/api/state')).status,401);
  assert.equal((await call('/api/login',{username:'outsider@test.example',password:'ok'})).status,403);
  assert.equal((await call('/api/login',{username:'alice@test.example',password:'wrong'})).status,401);
  const logged=await call('/api/login',{username:'alice@test.example',password:'ok'});assert.equal(logged.data.token,'a');
  assert.equal((await call('/api/me',undefined,'a')).data.displayName,'小花');
  assert.equal((await call('/api/state',{version:0,state:{completed:[1],notes:'private'}},'a','PATCH')).data.version,1);
  assert.deepEqual((await call('/api/state',undefined,'b')).data.state,{});
  assert.equal((await call('/api/state',{version:0,state:{}},'a','PATCH')).status,409);
  assert.equal(JSON.stringify((await call('/api/space',undefined,'b')).data).includes('private'),false);
  await call('/api/logout',{},'a');assert.equal((await call('/api/me',undefined,'a')).status,401);
});
test('指定用户名 ljy / jfl 映射到私有邮箱，其他短用户名拒绝',async()=>{
  const f=fixture();
  const logged=await f.call('/api/login',{username:'ljy',password:'ok'});
  assert.equal(logged.status,200);assert.equal(logged.data.user.username,'ljy');
  const authRequest=f.calls.find(c=>c.path==='/auth/v1/token');assert.equal(JSON.parse(authRequest.init.body).email,'ljy@english-garden.local');
  assert.equal((await f.call('/api/login',{username:'jfl',password:'ok'})).data.user.username,'jfl');
  assert.equal((await f.call('/api/login',{username:'unknown',password:'ok'})).status,400);
});
test('CORS、输入限制、全局RPC限流、消息文本及未配置AI',async()=>{
  const f=fixture();const {call,handler}=f;
  assert.equal((await call('/health',undefined,undefined,'GET',{origin:'https://evil.example'})).status,403);
  const preflight=await handler(new Request('https://example.supabase.co/functions/v1/garden/api/state',{method:'OPTIONS',headers:{origin:config.origins[0]}}));assert.equal(preflight.status,204);assert.match(preflight.headers.get('access-control-allow-headers'),/apikey/);
  const text='<script>alert(1)</script>';assert.equal((await call('/api/messages',{text},'a')).data.text,text);assert.equal((await call('/api/space',undefined,'b')).data.messages[0].text,text);
  assert.equal((await call('/api/messages',{text:'x'.repeat(1001)},'a')).status,400);
  assert.equal((await call('/api/state',{version:-1,state:{}},'a','PATCH')).status,400);
  assert.equal((await call('/api/state',{version:0,state:{text:'x'.repeat(1048576)}},'a','PATCH')).status,413);
  assert.equal((await call('/api/ai-feedback',{kind:'writing',text:'Hello'},'a')).status,503);
  f.setLimit(true);assert.equal((await call('/api/state',undefined,'a')).status,429);
});
test('私有Storage真实二进制契约、共享切换、同伴不能删除',async()=>{
  const {handler,call}=fixture();const raw=new Uint8Array([1,2,3,4]);
  const response=await handler(new Request('https://example.supabase.co/functions/v1/garden/api/recordings?title=hello',{method:'POST',headers:{authorization:'Bearer a','content-type':'audio/webm'},body:raw}));assert.equal(response.status,201);const recording=(await response.json()).data;assert.equal(recording.shared,false);
  assert.equal((await call('/api/recordings',undefined,'b')).data.recordings.length,0);
  assert.equal((await call('/api/recordings/'+recording.id,undefined,'b')).status,404);
  await call('/api/recordings/'+recording.id,{shared:true},'a','PATCH');
  const played=await handler(new Request('https://example.supabase.co/functions/v1/garden/api/recordings/'+recording.id,{headers:{authorization:'Bearer b'}}));assert.deepEqual(new Uint8Array(await played.arrayBuffer()),raw);
  assert.equal((await call('/api/recordings/'+recording.id,{},'b','DELETE')).status,403);
  assert.equal((await call('/api/recordings/'+recording.id,{},'a','DELETE')).data.deleted,true);
  assert.equal((await call('/api/recordings',undefined,'a')).data.recordings.length,0);
  const invalid=await handler(new Request('https://example.supabase.co/functions/v1/garden/api/recordings',{method:'POST',headers:{authorization:'Bearer a','content-type':'text/html'},body:raw}));assert.equal(invalid.status,415);
});
test('AI数据库原子租约契约：成功、超时释放、无重试',async()=>{
  const f=fixture({config:{aiProvider:'deepseek',aiKey:'fake',aiModel:'test'}});assert.equal((await f.call('/api/ai-feedback',{kind:'speaking',text:'Hello'},'a')).data.practiceOnly,true);assert.equal(f.leases.size,0);
  let tries=0;const slow=fixture({config:{aiProvider:'deepseek',aiKey:'fake',aiModel:'test'},aiTimeoutMs:15,aiFetch:async(url,init)=>{tries++;return new Promise((resolve,reject)=>init.signal.addEventListener('abort',()=>reject(new Error('aborted'))));}});
  assert.equal((await slow.call('/api/ai-feedback',{kind:'writing',text:'Hello'},'a')).status,504);assert.equal(tries,1);assert.equal(slow.leases.size,0);
});
test('无配置fail safe与路由兼容',()=>{
  assert.throws(()=>createHandler({...config,serviceKey:''}),/配置/);
  assert.throws(()=>createHandler({...config,aiProvider:'deepseek',aiKey:'x',aiBase:'https://evil.example'}),/官方/);
  assert.equal(route('/garden/api/state'),'/api/state');assert.equal(route('/functions/v1/garden/api/state'),'/api/state');assert.equal(route('/api/state'),'/api/state');
});
test('多个Edge实例共享数据库租约预算，第三个AI请求立即拒绝',async()=>{
  const waiting=[];
  const f=fixture({config:{aiProvider:'deepseek',aiKey:'fake',aiModel:'test'},aiFetch:async()=>new Promise(resolve=>waiting.push(()=>resolve(new Response(JSON.stringify({choices:[{message:{content:'练习参考'}}]})))))});
  const request=token=>new Request('https://example.supabase.co/functions/v1/garden/api/ai-feedback',{method:'POST',headers:{authorization:`Bearer ${token}`,'content-type':'application/json'},body:JSON.stringify({kind:'writing',text:'Hello'})});
  const first=f.handler(request('a'));const second=f.anotherHandler()(request('b'));
  while(waiting.length<2) await new Promise(resolve=>setTimeout(resolve,1));
  const third=await f.anotherHandler()(request('a'));assert.equal(third.status,429);assert.equal((await third.json()).error.code,'AI_BUSY');
  waiting.forEach(resolve=>resolve());assert.equal((await first).status,200);assert.equal((await second).status,200);assert.equal(f.leases.size,0);
});
test('Storage提交后丢失响应：先清理对象，再移除配额元信息',async()=>{
  const f=fixture({commitThenThrow:true});
  const response=await f.handler(new Request('https://example.supabase.co/functions/v1/garden/api/recordings',{method:'POST',headers:{authorization:'Bearer a','content-type':'audio/webm'},body:new Uint8Array([1,2,3])}));
  assert.equal(response.status,503);assert.equal(f.audio.size,0);assert.equal(f.recordings.size,0);
  const storageDelete=f.calls.findIndex(c=>c.path==='/storage/v1/object/garden-recordings'&&c.init.method==='DELETE');
  const metadataDelete=f.calls.findIndex(c=>c.path==='/rest/v1/recordings'&&c.init.method==='DELETE');
  assert.ok(storageDelete>=0&&metadataDelete>storageDelete);
});
test('Storage清理失败保留可恢复记录计入配额，恢复后本人可删除',async()=>{
  const f=fixture({commitThenThrow:true,deleteFails:true});
  const response=await f.handler(new Request('https://example.supabase.co/functions/v1/garden/api/recordings',{method:'POST',headers:{authorization:'Bearer a','content-type':'audio/webm'},body:new Uint8Array([1,2,3])}));
  assert.equal(response.status,503);assert.equal(f.audio.size,1);assert.equal(f.recordings.size,1);
  const recording=(await f.call('/api/recordings',undefined,'a')).data.recordings[0];assert.equal(recording.shared,false);
  f.setDeleteFailure(false);assert.equal((await f.call('/api/recordings/'+recording.id,{},'a','DELETE')).status,200);
  assert.equal(f.audio.size,0);assert.equal(f.recordings.size,0);
});
