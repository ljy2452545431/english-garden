// 仅隔离的本机真实 SQLite 环境；不对生产或 AI 提供商发起压测。
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {performance} from 'node:perf_hooks';
import {createApp} from '../app.mjs';
const names=['TARGET_TPS','TARGET_P95_MS','TARGET_P99_MS','TARGET_ERROR_RATE','TEST_CONCURRENCY','TEST_SECONDS'];
const settings=Object.fromEntries(names.map(name=>[name,Number(process.env[name])]));
if(names.some(name=>!Number.isFinite(settings[name])||settings[name]<0) || settings.TEST_CONCURRENCY<1 || settings.TEST_SECONDS<1) throw new Error('运行前必须指定已确认的 TARGET_TPS / TARGET_P95_MS / TARGET_P99_MS / TARGET_ERROR_RATE(0–1) / TEST_CONCURRENCY / TEST_SECONDS；不能依据结果反向设置目标');
const directory=mkdtempSync(join(tmpdir(),'garden-perf-'));
const app=createApp({dbPath:join(directory,'test.sqlite')});
app.createUser('alice','isolated-test-password-a','测试同学甲');app.createUser('bob','isolated-test-password-b','测试同学乙');
await new Promise(resolve=>app.server.listen(0,'127.0.0.1',resolve));
const base=`http://127.0.0.1:${app.server.address().port}`;
const tokens=await Promise.all(['alice','bob'].map(async(username,index)=>{const response=await fetch(base+'/api/login',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({username,password:`isolated-test-password-${index?'b':'a'}`})});return (await response.json()).data.token;}));
const latency=[];let successes=0,failures=0;const statuses={};
const started=performance.now();const deadline=started+settings.TEST_SECONDS*1000;
await Promise.all(Array.from({length:settings.TEST_CONCURRENCY},async(_,worker)=>{
  while(performance.now()<deadline) {
    const start=performance.now();
    try {const response=await fetch(base+'/api/state',{headers:{authorization:`Bearer ${tokens[worker%2]}`}});const result=await response.json();statuses[response.status]=(statuses[response.status]??0)+1;if(response.ok&&result.success&&result.data.version===0&&JSON.stringify(result.data.state)==='{}') successes++;else failures++;}
    catch {failures++;} finally {latency.push(performance.now()-start);}
  }
}));
const elapsed=(performance.now()-started)/1000;latency.sort((a,b)=>a-b);
const percentile=p=>latency[Math.max(0,Math.ceil(latency.length*p)-1)]??null;
const actual={businessSuccessTps:successes/elapsed,p95Ms:percentile(.95),p99Ms:percentile(.99),errorRate:failures/(successes+failures),successes,failures,statuses,elapsedSeconds:elapsed};
const passed=actual.businessSuccessTps>=settings.TARGET_TPS&&actual.p95Ms<=settings.TARGET_P95_MS&&actual.p99Ms<=settings.TARGET_P99_MS&&actual.errorRate<=settings.TARGET_ERROR_RATE;
console.log(JSON.stringify({environment:'isolated localhost, two users, real file SQLite, empty learning states',node:process.version,settings,actual,passed,scope:'仅状态读取；不代表完整容量、AI、持续负载或线上通过',rawLatencyMs:latency},null,2));
await new Promise(resolve=>app.server.close(resolve));app.close();rmSync(directory,{recursive:true,force:true});
if(!passed) process.exitCode=1;
