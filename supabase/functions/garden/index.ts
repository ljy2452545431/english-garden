import {createHandler} from './app.ts';
// Deno 仅存在于 Supabase Edge Runtime；密钥通过 Dashboard Secrets 注入。
const edgeRuntime=(globalThis as unknown as {Deno:{env:{get:(key:string)=>string|undefined};serve:(handler:(request:Request)=>Promise<Response>)=>void}}).Deno;
const env=(name:string)=>edgeRuntime.env.get(name)??'';
let handler:(request:Request)=>Promise<Response>;
try {
  handler=createHandler({url:env('SUPABASE_URL'),serviceKey:env('SUPABASE_SERVICE_ROLE_KEY'),publicKey:env('SUPABASE_ANON_KEY'),origins:env('ALLOWED_ORIGINS').split(',').map(s=>s.trim()).filter(Boolean),aiProvider:env('AI_PROVIDER'),aiKey:env('AI_API_KEY'),aiModel:env('AI_MODEL'),aiBase:env('AI_BASE_URL')||undefined},{logger:event=>console.warn(JSON.stringify(event))});
} catch {
  handler=async()=>new Response(JSON.stringify({success:false,data:null,error:{code:'NOT_CONFIGURED',message:'后端尚未配置完成'}}),{status:503,headers:{'content-type':'application/json','cache-control':'no-store'}});
}
edgeRuntime.serve(handler);
