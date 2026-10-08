import {ApiError,requireValue,bytes} from './helpers.ts';
import {boardInput,uuid,validImage,IMAGE_LIMIT} from './board-schema.ts';
type Row=Record<string,any>;
type Context={request:Request;path:string;member:{id:string;displayName:string};headers:Record<string,string>;rest:(path:string,method?:string,input?:unknown)=>Promise<any>;rpc:(name:string,input?:unknown)=>Promise<any>;limit:(key:string,max:number)=>Promise<void>;upstream:(path:string,init?:RequestInit)=>Promise<Response>;respond:(status:number,data?:unknown)=>Response;logger?:(value:Record<string,unknown>)=>void};
const board=(row:Row,name?:string)=>({id:row.id,title:row.title,userId:row.user_id,displayName:name??row.members?.display_name??'同学',version:row.version,updatedAt:row.updated_at,...(row.document?{document:row.document}:{})});
const asset=(row:Row)=>({id:row.id,userId:row.user_id,mime:row.mime,size:row.size});
export async function boardRoute(c:Context):Promise<Response|null>{
 const {request,path,member,rest,rpc,limit,upstream,respond,headers}=c;
 if(path==='/api/board-assets'&&request.method==='GET')return respond(200,{assets:(await rest(`garden_board_assets?user_id=eq.${member.id}&select=id,user_id,mime,size,deleting&order=created_at.desc,id.desc&limit=20`)).map((row:Row)=>({...asset(row),deleting:row.deleting===true}))});
 if(path==='/api/boards'&&request.method==='GET')return respond(200,{boards:(await rest('garden_boards?select=id,title,user_id,version,updated_at,members(display_name)&order=updated_at.desc,id.desc&limit=20')).map((row:Row)=>board(row))});
 if(path==='/api/boards'&&request.method==='POST'){
  const input=await boardInput(request);await limit('boards:'+member.id,20);
  const result=await rpc('garden_create_board',{p_user:member.id,p_title:input.title,p_document:input.document});
  requireValue(result!==null,409,'BOARD_QUOTA','每人最多10张画布，请删除旧画布');return respond(201,{board:board(result,member.displayName)});
 }
 const id=path.match(/^\/api\/boards\/([^/]+)$/)?.[1];
 if(id){
  requireValue(uuid.test(id),400,'INVALID_BOARD','画布编号无效');
  if(request.method==='PATCH'){
   const input=await boardInput(request,true);await limit('boards:'+member.id,20);
   const result=await rpc('garden_update_board',{p_id:id,p_version:input.version,p_title:input.title,p_document:input.document});
   requireValue(result!==null,409,'VERSION_CONFLICT','画布已被搭档更新或删除，请重新打开后再编辑');
   const names=await rest(`members?id=eq.${result.user_id}&select=display_name`);return respond(200,{board:board(result,names[0]?.display_name)});
  }
  const rows=await rest(`garden_boards?id=eq.${id}&select=*,members(display_name)`);requireValue(rows.length===1,404,'BOARD_NOT_FOUND','画布不存在或已经删除');
  if(request.method==='GET')return respond(200,{board:board(rows[0])});
  if(request.method==='DELETE'){
   requireValue(rows[0].user_id===member.id,403,'FORBIDDEN','只能删除自己创建的画布');await limit('boards:'+member.id,20);
   await rest(`garden_boards?id=eq.${id}&user_id=eq.${member.id}`,'DELETE');return respond(200,{deleted:true});
  }
 }
 if(path==='/api/board-assets'&&request.method==='POST'){
  const mime=request.headers.get('content-type')?.split(';')[0].trim().toLowerCase()??'';
  requireValue(['image/png','image/jpeg','image/webp'].includes(mime),415,'INVALID_IMAGE','仅支持 PNG、JPEG、WebP 图片');await limit('board-assets:'+member.id,10);
  const raw=await bytes(request,IMAGE_LIMIT);requireValue(validImage(mime,raw),415,'INVALID_IMAGE','图片内容与格式不一致');const id=crypto.randomUUID();
  requireValue(await rpc('garden_reserve_board_asset',{p_id:id,p_user:member.id,p_mime:mime,p_size:raw.length}),409,'IMAGE_QUOTA','每人最多20张图片，总计30 MiB');
  try{
   const response=await upstream(`/storage/v1/object/garden-board-assets/${member.id}/${id}`,{method:'POST',headers:{'content-type':mime,'x-upsert':'false'},body:raw as BodyInit});requireValue(response.ok,503,'STORAGE_UNAVAILABLE','图片上传失败，请稍后重试');
  }catch(error){
   try{const cleanup=await upstream('/storage/v1/object/garden-board-assets',{method:'DELETE',headers:{'content-type':'application/json'},body:JSON.stringify({prefixes:[`${member.id}/${id}`]})});requireValue(cleanup.ok,503,'STORAGE_UNAVAILABLE','图片清理尚未完成');await rest(`garden_board_assets?id=eq.${id}&user_id=eq.${member.id}`,'DELETE');}catch{try{c.logger?.({event:'board_asset_cleanup_pending',assetId:id});}catch{/* 日志不影响错误返回 */}}
   throw error;
  }
  return respond(201,{asset:asset({id,user_id:member.id,mime,size:raw.length})});
 }
 const assetId=path.match(/^\/api\/board-assets\/([^/]+)$/)?.[1];
 if(assetId){
  requireValue(uuid.test(assetId),400,'INVALID_IMAGE','图片编号无效');const rows=await rest(`garden_board_assets?id=eq.${assetId}&select=*`);requireValue(rows.length===1,404,'IMAGE_NOT_FOUND','图片不存在');const row=rows[0];
  if(request.method==='GET'){
   const response=await upstream(`/storage/v1/object/authenticated/garden-board-assets/${row.user_id}/${row.id}`);requireValue(response.ok,503,'STORAGE_UNAVAILABLE','图片读取失败，请稍后重试');return new Response(response.body,{headers:{...headers,'content-type':row.mime,'content-length':String(row.size),'content-disposition':'inline'}});
  }
  if(request.method==='DELETE'){
   requireValue(row.user_id===member.id,403,'FORBIDDEN','只能删除自己上传的图片');await limit('board-assets:'+member.id,10);
   requireValue(await rpc('garden_mark_board_asset_deleting',{p_id:assetId,p_user:member.id}),409,'IMAGE_IN_USE','图片仍被画布使用，先移除画布中的图片并保存');
   const response=await upstream('/storage/v1/object/garden-board-assets',{method:'DELETE',headers:{'content-type':'application/json'},body:JSON.stringify({prefixes:[`${row.user_id}/${row.id}`]})});requireValue(response.ok,503,'STORAGE_UNAVAILABLE','图片删除失败，请重试');
   await rest(`garden_board_assets?id=eq.${assetId}&user_id=eq.${member.id}`,'DELETE');return respond(200,{deleted:true});
  }
 }
 if(path.startsWith('/api/boards')||path.startsWith('/api/board-assets'))throw new ApiError(404,'NOT_FOUND','画布接口不存在');return null;
}
