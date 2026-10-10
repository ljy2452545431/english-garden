import { afterEach, describe, expect, it, vi } from 'vitest';
afterEach(()=>{vi.unstubAllGlobals();vi.unstubAllEnvs();vi.resetModules();vi.useRealTimers();});
async function client(){vi.stubEnv('VITE_API_URL','https://example.test');return await import('./server');}
describe('私密服务请求失败反馈',()=>{
 it('选中的官方备用线路用于JSON、图片和录音，所有写请求只发一次且拒绝重定向',async()=>{
  const primary='https://cdhmiwrhirjntpelgnvq.supabase.co/functions/v1/garden',backup='https://cdhmiwrhirjntpelgnvq.functions.supabase.co/garden';
  vi.stubEnv('VITE_API_URL',primary);const api=await import('./server');
  const fetcher=vi.fn(async(url:RequestInfo|URL,_init?:RequestInit)=>{
   if(String(url)===primary+'/health')throw new TypeError('blocked');
   if(String(url).endsWith('/health'))return new Response(JSON.stringify({success:true,data:{status:'ok'}}));
   return new Response(JSON.stringify({success:true,data:{ok:true}}));
  });vi.stubGlobal('fetch',fetcher);
  await api.prepareServiceConnection();await api.request('/api/login',undefined,{username:'ljy',password:crypto.randomUUID()},'POST');
  await api.binaryRequest('/api/board-assets/id','session');await api.uploadRecording('session',new Blob(['audio'],{type:'audio/webm'}),'练习');
  const url=await api.recordingUrl('session','id');URL.revokeObjectURL(url);
  const business=fetcher.mock.calls.filter(([url])=>!String(url).endsWith('/health'));expect(business).toHaveLength(4);
  expect(business.every(([url,init])=>String(url).startsWith(backup)&&init?.redirect==='error')).toBe(true);
  expect(business.filter(([,init])=>init?.method==='POST')).toHaveLength(2);
 });
 it('网络故障给中文提示',async()=>{
  const {request}=await client();vi.stubGlobal('fetch',vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));
  await expect(request('/api/login')).rejects.toMatchObject({code:'NETWORK_UNREACHABLE'});
 });
 it('错误保留HTTP状态，版本冲突仍可恢复',async()=>{
  const {request}=await client();vi.stubGlobal('fetch',vi.fn().mockResolvedValue(new Response(JSON.stringify({success:false,error:{code:'VERSION_CONFLICT',message:'记录已更新'}}),{status:409})));
  await expect(request('/api/state')).rejects.toMatchObject({status:409,code:'VERSION_CONFLICT'});
 });
 it('连接超时停止请求、显示中文，不自动重试',async()=>{
  vi.useFakeTimers();const {request}=await client();
  const fetch=vi.fn((_url:RequestInfo|URL,init?:RequestInit)=>new Promise((_resolve,reject)=>init?.signal?.addEventListener('abort',()=>reject(new DOMException('aborted','AbortError')))));
  vi.stubGlobal('fetch',fetch);
  const result=expect(request('/api/login',undefined,{},'POST',{timeoutMs:10})).rejects.toThrow('连接私密服务超时');
  await vi.advanceTimersByTimeAsync(11);await result;
  expect(fetch).toHaveBeenCalledTimes(1);
 });
});
