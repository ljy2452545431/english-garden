import { zh as t } from './i18n/zh';
export type User={id:string;username:string;displayName:string};
const API=import.meta.env.VITE_API_URL?.replace(/\/$/,'')??'';
const publicKey=import.meta.env.VITE_API_PUBLIC_KEY??'';
export const configured=Boolean(API);
export async function request<T>(path:string,token?:string,body?:unknown,method?:string,options:{timeoutMs?:number}={}):Promise<T>{
  if(!API)throw new Error('私密服务尚未配置');
  const controller=new AbortController();const timeout=setTimeout(()=>controller.abort(),options.timeoutMs??25000);
  try{
    const res=await fetch(`${API}${path}`,{method:method??(body?'POST':'GET'),headers:{...(body?{'Content-Type':'application/json'}:{}),...(publicKey?{apikey:publicKey}:{}),...(token?{Authorization:`Bearer ${token}`}:{})},...(body?{body:JSON.stringify(body)}:{}),signal:controller.signal});
    let result;try { result=await res.json(); } catch { throw new Error(t.serviceInvalid); }if(!res.ok||!result.success)throw Object.assign(new Error(result.error?.message??'服务暂时不可用'),{status:res.status,code:result.error?.code});return result.data as T;
  }catch(error){
    if(controller.signal.aborted)throw new Error(t.serviceTimeout);
    if(error instanceof TypeError)throw new Error(t.serviceNetwork);
    throw error;
  }finally{clearTimeout(timeout);}
}
export async function uploadRecording(token:string,blob:Blob,title:string){
  if(!API)throw new Error('私密服务尚未配置');
  const res=await fetch(`${API}/api/recordings?title=${encodeURIComponent(title)}`,{method:'POST',headers:{...(publicKey?{apikey:publicKey}:{}),Authorization:`Bearer ${token}`,'Content-Type':blob.type},body:blob});
  const json=await res.json();if(!res.ok)throw new Error(json.error?.message??'录音保存失败');return json.data;
}
export async function recordingUrl(token:string,id:string){
  const res=await fetch(`${API}/api/recordings/${encodeURIComponent(id)}`,{headers:{...(publicKey?{apikey:publicKey}:{}),Authorization:`Bearer ${token}`}});
  if(!res.ok)throw new Error('无法读取录音');return URL.createObjectURL(await res.blob());
}
