export const STATE_LIMIT = 1048576;
export const BODY_LIMIT = 1153434;
export const AUDIO_LIMIT = 5242880;
export const audioTypes = ['audio/webm','audio/ogg','audio/mp4','audio/mpeg','audio/wav','audio/x-wav','audio/aac'];
export class ApiError extends Error {
  status:number;code:string;
  constructor(status:number,code:string,message:string) { super(message);this.status=status;this.code=code; }
}
export function requireValue(condition:unknown,status:number,code:string,message:string):asserts condition {
  if(!condition) throw new ApiError(status,code,message);
}
export function object(value:unknown):value is Record<string,unknown> {
  return value!==null && typeof value==='object' && !Array.isArray(value);
}
export function route(path:string):string {
  const prefix=path.indexOf('/garden');
  return prefix<0?path:path.slice(prefix+7)||'/';
}
export async function bytes(request:Request,max:number):Promise<Uint8Array> {
  requireValue(Number(request.headers.get('content-length')??0)<=max,413,'BODY_TOO_LARGE','请求内容过长');
  const reader=request.body?.getReader();if(!reader)return new Uint8Array();
  const chunks:Uint8Array[]=[];let total=0;
  while(true) {
    const {done,value}=await reader.read();if(done)break;
    total+=value.byteLength;
    if(total>max) {await reader.cancel();throw new ApiError(413,'BODY_TOO_LARGE','请求内容过长');}
    chunks.push(value);
  }
  const output=new Uint8Array(total);let offset=0;for(const chunk of chunks){output.set(chunk,offset);offset+=chunk.length;}return output;
}
export async function json(request:Request):Promise<Record<string,unknown>> {
  const raw=await bytes(request,BODY_LIMIT);
  try {const parsed=JSON.parse(new TextDecoder().decode(raw)||'{}');requireValue(object(parsed),400,'INVALID_JSON','需要JSON对象');return parsed;}
  catch(error) {if(error instanceof ApiError)throw error;throw new ApiError(400,'INVALID_JSON','需要有效JSON');}
}
export function publicRecording(row:Record<string,unknown>) {
  return {id:row.id,userId:row.user_id,title:row.title,mime:row.mime,size:row.size,shared:row.shared,createdAt:row.created_at};
}
