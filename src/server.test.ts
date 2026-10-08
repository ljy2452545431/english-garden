import { afterEach, describe, expect, it, vi } from 'vitest';
afterEach(()=>{vi.unstubAllGlobals();vi.unstubAllEnvs();vi.resetModules();vi.useRealTimers();});
async function client(){vi.stubEnv('VITE_API_URL','https://example.test');return await import('./server');}
describe('私密服务请求失败反馈',()=>{
 it('网络故障给中文提示',async()=>{
  const {request}=await client();vi.stubGlobal('fetch',vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));
  await expect(request('/api/login')).rejects.toThrow('无法连接私密服务');
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
