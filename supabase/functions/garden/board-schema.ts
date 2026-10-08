import {object,requireValue,bytes,ApiError} from './helpers.ts';
export const BOARD_LIMIT=524288,IMAGE_LIMIT=3145728;
export const uuid=/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
const color=/^#[a-f0-9]{6}$/i;
const number=(v:unknown,min:number,max:number)=>typeof v==='number'&&Number.isFinite(v)&&v>=min&&v<=max;
const exact=(v:Record<string,unknown>,keys:string[])=>Object.keys(v).length===keys.length&&Object.keys(v).every(k=>keys.includes(k));
export function validateBoard(value:unknown):Record<string,unknown>{
 requireValue(object(value)&&exact(value,['schema','width','height','background','nodes'])&&value.schema===1&&number(value.width,200,4096)&&number(value.height,200,4096)&&typeof value.background==='string'&&color.test(value.background),400,'INVALID_BOARD','画布大小或背景格式无效');
 requireValue(Array.isArray(value.nodes)&&value.nodes.length<=100,400,'INVALID_BOARD','画布最多100个元素');
 const ids=new Set<string>();
 for(const node of value.nodes){
  requireValue(object(node)&&exact(node,['id','kind','x','y','width','height','rotation','fill','color','fontSize','text','assetId','points']),400,'INVALID_BOARD','元素字段无效');
  requireValue(typeof node.id==='string'&&uuid.test(node.id)&&!ids.has(node.id)&&typeof node.kind==='string'&&['text','note','image','rect','ellipse','stroke'].includes(node.kind),400,'INVALID_BOARD','元素类型或编号无效');ids.add(node.id);
  requireValue(number(node.x,-4096,4096)&&number(node.y,-4096,4096)&&number(node.width,1,4096)&&number(node.height,1,4096)&&number(node.rotation,-180,180)&&number(node.fontSize,8,120),400,'INVALID_BOARD','元素位置或尺寸无效');
  requireValue(typeof node.fill==='string'&&(node.fill==='transparent'||color.test(node.fill))&&typeof node.color==='string'&&color.test(node.color)&&typeof node.text==='string'&&node.text.length<=4000,400,'INVALID_BOARD','元素文字或颜色无效');
  requireValue(node.kind==='image'?typeof node.assetId==='string'&&uuid.test(node.assetId):node.assetId===null,400,'INVALID_BOARD','图片引用无效');
  requireValue(Array.isArray(node.points)&&node.points.length<=2000&&(node.kind==='stroke'?node.points.length>=2:node.points.length===0)&&node.points.every(p=>Array.isArray(p)&&p.length===2&&number(p[0],-4096,4096)&&number(p[1],-4096,4096)),400,'INVALID_BOARD','笔画格式无效');
 }
 requireValue(new TextEncoder().encode(JSON.stringify(value)).length<=BOARD_LIMIT,413,'BOARD_TOO_LARGE','画布内容超过512 KiB');return value;
}
export async function boardInput(request:Request,update=false){
 const raw=await bytes(request,BOARD_LIMIT);let input:unknown;
 try{input=JSON.parse(new TextDecoder().decode(raw));}catch{throw new ApiError(400,'INVALID_JSON','需要有效JSON');}
 requireValue(object(input)&&exact(input,update?['version','title','document']:['title','document'])&&typeof input.title==='string'&&input.title.trim().length>=1&&input.title.trim().length<=80,400,'INVALID_BOARD','画布名称需要1–80字');
 if(update)requireValue(Number.isSafeInteger(input.version)&&Number(input.version)>=0,400,'INVALID_BOARD','版本格式无效');
 return {title:input.title.trim(),document:validateBoard(input.document),version:input.version};
}
export function validImage(mime:string,raw:Uint8Array){
 if(mime==='image/png')return [137,80,78,71,13,10,26,10].every((v,i)=>raw[i]===v);
 if(mime==='image/jpeg')return raw.length>=4&&raw[0]===255&&raw[1]===216&&raw[2]===255;
 return mime==='image/webp'&&raw.length>=12&&new TextDecoder().decode(raw.subarray(0,4))==='RIFF'&&new TextDecoder().decode(raw.subarray(8,12))==='WEBP';
}
