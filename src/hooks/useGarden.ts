import { useEffect, useRef, useState } from 'react';
import { normalizeState, type LearningState } from '../utils/learning';
import { request, type User } from '../server';
import { loginAndLoad } from '../@apis/auth';
const KEY='english-garden.preview.v1';
function initial(){try{return normalizeState(JSON.parse(localStorage.getItem(KEY)??'null'));}catch{return normalizeState(null);}}
export function useGarden(){
  const [state,setState]=useState<LearningState>(initial);
  const [auth,setAuth]=useState<{token:string;user:User}|null>(null);
  const [status,setStatus]=useState('本机保存');
  const [active,setActive]=useState(false);
  const [recovery,setRecovery]=useState<LearningState|null>(null);
  const version=useRef(0),inflight=useRef<Promise<void>|null>(null),dirty=useRef(false),current=useRef(state),identity=useRef(auth),failures=useRef(0),paused=useRef(false),generation=useRef(0),recoveryRef=useRef<LearningState|null>(null);
  current.current=state;identity.current=auth;recoveryRef.current=recovery;
  const update=(fn:(prev:LearningState)=>LearningState)=>{if(recoveryRef.current){setStatus('请先在我的花园处理未同步记录，再继续编辑');return;}dirty.current=true;generation.current++;setState(fn);};
  const pendingKey=(id:string)=>`english-garden.pending.${id}`;
  function preserve(){const who=identity.current;if(!who||!dirty.current)return;try{sessionStorage.setItem(pendingKey(who.user.id),JSON.stringify({version:version.current,state:current.current}));}catch{setStatus('临时备份空间不足，请立即导出记录');}}
  async function flush(){
    if(inflight.current){await inflight.current;if(!dirty.current)return;}
    const who=identity.current;if(!who||!dirty.current||recoveryRef.current)return;
    const snapshot=current.current,edit=generation.current;preserve();setStatus('正在同步');
    const operation=(async()=>{try{
      const data=await request<{version:number;state:unknown}>('/api/state',who.token,{version:version.current,state:snapshot},'PATCH');
      if(identity.current?.token!==who.token)return;
      version.current=data.version;dirty.current=generation.current!==edit;failures.current=0;
      if(!dirty.current)sessionStorage.removeItem(pendingKey(who.user.id));else preserve();setStatus(dirty.current?'待同步':'已同步到私密空间');
    }catch(e){if((e as Error & {status?:number}).status===409){paused.current=true;recoveryRef.current=normalizeState(current.current);setRecovery(recoveryRef.current);}failures.current++;if(failures.current>=3)paused.current=true;preserve();setStatus((e as Error).message+'；记录已保留在当前标签页，请导出备份或重试同步');throw e;}})();
    inflight.current=operation;try{await operation;}finally{inflight.current=null;}
  }
  useEffect(()=>{
    if(!active)return;
    if(!auth){try{localStorage.setItem(KEY,JSON.stringify(state));setStatus('已保存在本机');}catch{setStatus('本机存储已满，请导出记录');}return;}
    if(!dirty.current)return;
    preserve();setStatus('待同步');
  },[state,auth,active]);
  useEffect(()=>{
    if(!auth)return;
    const timer=setInterval(()=>{if(dirty.current&&!inflight.current&&!paused.current)void flush().catch(()=>{});},1500);return()=>clearInterval(timer);
  },[auth]);
  useEffect(()=>{const before=(e:BeforeUnloadEvent)=>{if(identity.current&&dirty.current){preserve();e.preventDefault();e.returnValue='';}};window.addEventListener('beforeunload',before);return()=>window.removeEventListener('beforeunload',before);},[]);
  async function login(username:string,password:string){
    const result=await loginAndLoad(username,password);
    const data={token:result.token,user:result.user};
    const loaded=result.learning;
    const next={...normalizeState(loaded.state),nickname:data.user.displayName};
    recoveryRef.current=null;setRecovery(null);
    try{const raw=sessionStorage.getItem(pendingKey(data.user.id));if(raw){const pending=JSON.parse(raw);recoveryRef.current=normalizeState(pending.state);setRecovery(recoveryRef.current);}}catch{setStatus('临时备份无法读取，请保留当前标签页');}
    version.current=loaded.version;dirty.current=false;paused.current=Boolean(recoveryRef.current);failures.current=0;
    current.current=next;identity.current=data;setState(next);setAuth(data);setActive(true);setStatus('已连接私密空间');
  }
  async function logout(){
    if(auth){await flush();await request('/api/logout',auth.token,{},'POST');if(!recoveryRef.current)sessionStorage.removeItem(pendingKey(auth.user.id));}
    identity.current=null;dirty.current=false;setRecovery(null);setAuth(null);setState(initial());setActive(false);setStatus('已退出');
  }
  async function retrySync(){
    if(recoveryRef.current)throw new Error('存在不同版本的未同步记录，请先选择恢复或保留云端记录');
    paused.current=false;failures.current=0;await flush();
  }
  async function restorePending(){
    const who=identity.current;if(!who||!recovery)return;
    const latest=await request<{version:number;state:unknown}>('/api/state',who.token);
    version.current=latest.version;paused.current=false;failures.current=0;
    const next=normalizeState(recovery);current.current=next;setState(next);generation.current++;dirty.current=true;recoveryRef.current=null;setRecovery(null);await flush();
  }
  async function keepCloud(){
    const who=identity.current;if(!who)return;
    const latest=await request<{version:number;state:unknown}>('/api/state',who.token);
    const next=normalizeState(latest.state);version.current=latest.version;dirty.current=false;paused.current=false;failures.current=0;current.current=next;setState(next);recoveryRef.current=null;setRecovery(null);sessionStorage.removeItem(pendingKey(who.user.id));setStatus('已保留云端记录');
  }
  useEffect(()=>{const online=()=>{if(identity.current&&dirty.current&&!paused.current)void flush().catch(()=>{});else if(identity.current&&dirty.current&&!recovery){paused.current=false;failures.current=0;void flush().catch(()=>{});}};window.addEventListener('online',online);return()=>window.removeEventListener('online',online);},[recovery]);
  return {state,update,auth,status,active,recovery,restorePending,keepCloud,login,logout,retrySync,preview:()=>setActive(true)};
}
export type Garden=ReturnType<typeof useGarden>;
