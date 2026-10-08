import {test} from 'node:test';
import assert from 'node:assert/strict';
import {boardRoute} from '../functions/garden/board-routes.ts';
const owner=crypto.randomUUID(),friend=crypto.randomUUID();
const document=()=>({schema:1,width:1200,height:800,background:'#FFFFFF',nodes:[]});
function fixture(){
 const boards=new Map(),assets=new Map(),objects=new Map(),calls=[];let uploadFail=false,cleanupFail=false;
 const response=(status,data)=>new Response(JSON.stringify({data}),{status,headers:{'content-type':'application/json'}});
 const rest=async(path,method='GET')=>{
  calls.push(path);const id=new URL('https://test/'+path).searchParams.get('id')?.slice(3),table=path.split('?')[0],map=table==='garden_boards'?boards:assets;
  if(table==='members')return [{display_name:'作者'}];
  const rows=id?[map.get(id)].filter(Boolean):[...map.values()];if(method==='DELETE')rows.forEach(r=>map.delete(r.id));return rows;
 };
 const rpc=async(name,p)=>{
  if(name==='garden_create_board'){
   if([...boards.values()].filter(r=>r.user_id===p.p_user).length>=10)return null;
   const r={id:crypto.randomUUID(),user_id:p.p_user,title:p.p_title,document:p.p_document,version:0,updated_at:'2026-10-08T00:00:00Z'};boards.set(r.id,r);return r;
  }
  if(name==='garden_update_board'){
   const row=boards.get(p.p_id);if(!row||row.version!==p.p_version)return null;
   const next={...row,title:p.p_title,document:p.p_document,version:row.version+1};boards.set(row.id,next);return next;
  }
  if(name==='garden_reserve_board_asset'){
   if(assets.size>=20)return false;assets.set(p.p_id,{id:p.p_id,user_id:p.p_user,mime:p.p_mime,size:p.p_size});return true;
  }
  if(name==='garden_mark_board_asset_deleting')return ![...boards.values()].some(b=>b.document.nodes.some(n=>n.assetId===p.p_id));
  throw Error(name);
 };
 const upstream=async(path,init={})=>{
  if(init.method==='DELETE'){
   if(cleanupFail)throw Error('storage unavailable');for(const key of JSON.parse(init.body).prefixes)objects.delete(key);return response(200,{});
  }
  const key=path.split('garden-board-assets/')[1];if(init.method==='POST'){objects.set(key,init.body);if(uploadFail)throw Error('lost response');return response(200,{});}
  return new Response(objects.get(key),{status:objects.has(key)?200:404});
 };
 const call=async(path,method='GET',input,user=owner,mime='application/json')=>{
  try{
   const request=new Request('https://test'+path,{method,headers:{'content-type':mime},...(input===undefined?{}:{body:input instanceof Uint8Array?input:JSON.stringify(input)})});
   const result=await boardRoute({request,path,member:{id:user,displayName:'作者'},headers:{'cache-control':'no-store','x-content-type-options':'nosniff'},rest,rpc,limit:async()=>{},upstream,respond:response});
   if(result.headers.get('content-type')?.startsWith('image/'))return {status:result.status,raw:new Uint8Array(await result.arrayBuffer()),cache:result.headers.get('cache-control'),mime:result.headers.get('content-type')};
   return {status:result.status,...await result.json()};
  }catch(e){return {status:e.status??500,code:e.code};}
 };
 return {call,boards,assets,objects,calls,failUpload:()=>uploadFail=true,failCleanup:()=>cleanupFail=true};
}
test('双人读写、乐观并发冲突、作者删除权限与列表读取有界',async()=>{
 const f=fixture();const created=await f.call('/api/boards','POST',{title:'一起创作',document:document()});assert.equal(created.status,201);const {id}=created.data.board;
 assert.equal((await f.call('/api/boards/'+id,'GET',undefined,friend)).data.board.title,'一起创作');
 assert.equal((await f.call('/api/boards/'+id,'PATCH',{title:'搭档修改',version:0,document:document()},friend)).data.board.version,1);
 assert.equal((await f.call('/api/boards/'+id,'PATCH',{title:'过期',version:0,document:document()})).status,409);
 assert.equal((await f.call('/api/boards/'+id,'DELETE',undefined,friend)).status,403);
 await f.call('/api/boards');assert.ok(f.calls.at(-1).includes('limit=20'));assert.equal(f.calls.at(-1).includes('document'),false);
 assert.equal((await f.call('/api/boards/'+id,'DELETE')).status,200);assert.equal((await f.call('/api/boards/'+id)).status,404);
});
test('画布配额与字段白名单、非法ID被拒绝',async()=>{
 const f=fixture();for(let i=0;i<10;i++)assert.equal((await f.call('/api/boards','POST',{title:'画布',document:document()})).status,201);
 assert.equal((await f.call('/api/boards','POST',{title:'第11张',document:document()})).code,'BOARD_QUOTA');
 assert.equal((await f.call('/api/boards','POST',{title:'未知字段',document:document(),userId:friend})).status,400);
 assert.equal((await f.call('/api/boards/not-a-uuid')).status,400);
});
test('图片上传格式检查、只许本人删除且已引用时保护',async()=>{
 const f=fixture();const png=new Uint8Array([137,80,78,71,13,10,26,10]);
 assert.equal((await f.call('/api/board-assets','POST',new TextEncoder().encode('<svg/>'),owner,'image/png')).status,415);
 assert.equal((await f.call('/api/board-assets','POST',png,owner,'image/svg+xml')).status,415);
 const uploaded=await f.call('/api/board-assets','POST',png,owner,'image/png');assert.equal(uploaded.status,201);const {id}=uploaded.data.asset;
 const downloaded=await f.call('/api/board-assets/'+id,'GET',undefined,friend);assert.equal(downloaded.status,200);assert.deepEqual(downloaded.raw,png);assert.equal(downloaded.cache,'no-store');assert.equal(downloaded.mime,'image/png');
 assert.equal((await f.call('/api/board-assets/'+id,'DELETE',undefined,friend)).status,403);
 f.boards.set(crypto.randomUUID(),{document:{nodes:[{assetId:id}]}});assert.equal((await f.call('/api/board-assets/'+id,'DELETE')).code,'IMAGE_IN_USE');
 f.boards.clear();assert.equal((await f.call('/api/board-assets/'+id,'DELETE')).status,200);assert.equal(f.objects.size,0);
});
test('上传提交后丢失响应：清理对象后释放配额；清理失败保留元信息',async()=>{
 const png=new Uint8Array([137,80,78,71,13,10,26,10]);
 const clean=fixture();clean.failUpload();assert.equal((await clean.call('/api/board-assets','POST',png,owner,'image/png')).status,500);assert.equal(clean.assets.size,0);assert.equal(clean.objects.size,0);
 const pending=fixture();pending.failUpload();pending.failCleanup();await pending.call('/api/board-assets','POST',png,owner,'image/png');assert.equal(pending.assets.size,1);assert.equal(pending.objects.size,1);
});
test('上传大小、图片配额、请求方法及读取失败有明确边界',async()=>{
 const f=fixture(),png=new Uint8Array([137,80,78,71,13,10,26,10]);
 assert.equal((await f.call('/api/board-assets','POST',new Uint8Array(3145729),owner,'image/png')).status,413);
 for(let i=0;i<20;i++)assert.equal((await f.call('/api/board-assets','POST',png,owner,'image/png')).status,201);
 assert.equal((await f.call('/api/board-assets','POST',png,owner,'image/png')).code,'IMAGE_QUOTA');
 const missing=crypto.randomUUID();f.assets.set(missing,{id:missing,user_id:owner,mime:'image/png',size:8});assert.equal((await f.call('/api/board-assets/'+missing)).status,503);
 assert.equal((await f.call('/api/board-assets/not-uuid')).status,400);
 assert.equal((await f.call('/api/board-assets/'+crypto.randomUUID())).status,404);
 assert.equal((await f.call('/api/boards','PUT',{title:'画布',document:document()})).status,404);
});
test('图片管理列表仅查本人metadata、不产生公开URL且限制20条',async()=>{
 const f=fixture();const result=await f.call('/api/board-assets');assert.equal(result.status,200);assert.deepEqual(result.data,{assets:[]});
 assert.ok(f.calls.at(-1).includes(`user_id=eq.${owner}`));assert.ok(f.calls.at(-1).includes('limit=20'));assert.ok(f.calls.at(-1).includes('deleting'));
});
