/** 已授权的双账号小规模回归；不输出密码/令牌，结束恢复测试前状态。 */
import { readFile,writeFile } from 'node:fs/promises';
import { performance } from 'node:perf_hooks';
const env=Object.fromEntries((await readFile(new URL('../.env.local',import.meta.url),'utf8')).trim().split(/\r?\n/).map(line=>{const i=line.indexOf('=');return[line.slice(0,i),line.slice(i+1)];}));
const privateFile=new URL('../../.english-garden-private/账号信息.txt',import.meta.url);
const accounts=[...(await readFile(privateFile,'utf8')).matchAll(/账号：([^\r\n]+)\r?\n密码：([^\r\n]+)/g)].map(m=>({username:m[1],password:m[2]}));
const API=env.VITE_API_URL;const apikey=env.VITE_API_PUBLIC_KEY;const result=[];const times=[];
function check(ok,label){if(!ok)throw new Error(label+' 未通过');result.push(label);}
async function call(path,{token,body,method='GET',raw}={}){const started=performance.now();const response=await fetch(API+path,{method,headers:{apikey,...(token?{authorization:'Bearer '+token}:{}),...(body?{'content-type':'application/json'}:{}),...(raw?{'content-type':'audio/wav'}:{})},...(body?{body:JSON.stringify(body)}:raw?{body:raw}:{}),signal:AbortSignal.timeout(45000)});times.push(performance.now()-started);const data=response.headers.get('content-type')?.includes('json')?await response.json():new Uint8Array(await response.arrayBuffer());return{status:response.status,json:data};}
let a,b;let original;let audioId;let messageId;
try{
 check((await call('/api/state')).status===401,'匿名请求拒绝');
 a=(await call('/api/login',{method:'POST',body:accounts[0]})).json.data;
 b=(await call('/api/login',{method:'POST',body:accounts[1]})).json.data;
 check(a?.user.username==='ljy'&&b?.user.username==='jfl','真实两账号登录');
 const state=await call('/api/state',{token:a.token});original=state.json.data;
 check(state.status===200&&typeof original.version==='number','真实数据库状态读取');
 const written=await call('/api/state',{method:'PATCH',token:a.token,body:{version:original.version,state:{...original.state,completed:[1],notes:{private:'smoke-private-note'}}}});
 check(written.status===200,'真实数据库状态写入');
 const conflict=await call('/api/state',{method:'PATCH',token:a.token,body:{version:original.version,state:{completed:[]}}});check(conflict.status===409,'版本冲突拒绝');
 const partner=await call('/api/state',{token:b.token});check(!partner.json.data.state.notes?.private,'个人笔记隔离');
 const space=await call('/api/space',{token:b.token});check(space.json.data.users.length===2&&!JSON.stringify(space.json.data).includes('smoke-private-note'),'双人摘要不泄露笔记');
 const message=await call('/api/messages',{method:'POST',token:a.token,body:{text:'[验收测试] 一起学习测试留言，将在测试后清理。'}});messageId=message.json.data.id;check(message.status===201,'真实双人留言写入');
 check((await call('/api/space',{token:b.token})).json.data.messages.some(m=>m.id===messageId),'搭档读取留言');
 const wav=new Uint8Array(2044);const view=new DataView(wav.buffer);function text(offset,s){for(let i=0;i<s.length;i++)wav[offset+i]=s.charCodeAt(i);}text(0,'RIFF');view.setUint32(4,2036,true);text(8,'WAVE');text(12,'fmt ');view.setUint32(16,16,true);view.setUint16(20,1,true);view.setUint16(22,1,true);view.setUint32(24,8000,true);view.setUint32(28,16000,true);view.setUint16(32,2,true);view.setUint16(34,16,true);text(36,'data');view.setUint32(40,2000,true);
 const audio=await call('/api/recordings?title=smoke-test',{method:'POST',token:a.token,raw:wav});audioId=audio.json.data?.id;check(audio.status===201&&audioId,'真实私有Storage上传');
 check((await call(`/api/recordings/${audioId}`,{token:b.token})).status===404,'伙伴不能访问未分享录音');
 check((await call(`/api/recordings/${audioId}`,{token:a.token})).json.byteLength===wav.byteLength,'真实音频二进制读取');
 check((await call(`/api/recordings/${audioId}`,{method:'PATCH',token:a.token,body:{shared:true}})).status===200,'录音显式分享');
 check((await call(`/api/recordings/${audioId}`,{token:b.token})).status===200,'搭档播放已分享录音');
 const ai=await call('/api/ai-feedback',{method:'POST',token:a.token,body:{kind:'writing',text:'I am learning English with a friend.'}});check(ai.status===503,'未配置AI明确返回未启用');
 const direct=await fetch('https://cdhmiwrhirjntpelgnvq.supabase.co/rest/v1/states?select=*',{headers:{apikey,authorization:'Bearer '+a.token},signal:AbortSignal.timeout(20000)});check(direct.status===403,'登录用户直连REST拒绝');
 const anonymous=await fetch('https://cdhmiwrhirjntpelgnvq.supabase.co/rest/v1/states?select=*',{headers:{apikey},signal:AbortSignal.timeout(20000)});check([401,403].includes(anonymous.status),'匿名直连REST拒绝');
}finally{
 if(audioId&&a)await call(`/api/recordings/${audioId}`,{method:'DELETE',token:a.token});
 if(original&&a){const latest=(await call('/api/state',{token:a.token})).json.data;await call('/api/state',{method:'PATCH',token:a.token,body:{version:latest.version,state:original.state}});}
 if(a){await call('/api/logout',{method:'POST',token:a.token,body:{}});check((await call('/api/me',{token:a.token})).status===401,'退出后的API令牌失效');}
 if(b)await call('/api/logout',{method:'POST',token:b.token,body:{}});
 const report={time:new Date().toISOString(),checks:result,requestCount:times.length,maxMs:Math.round(Math.max(...times)),meanMs:Math.round(times.reduce((a,b)=>a+b,0)/times.length),performanceStatus:'功能回归样本；未确定容量目标，不作为性能达标证明',messageId};
 await writeFile(new URL('../docs/live-smoke-result.json',import.meta.url),JSON.stringify(report,null,2));
 console.log(JSON.stringify(report,null,2));
}
