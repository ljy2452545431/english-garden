import {test} from 'node:test';
import assert from 'node:assert/strict';
import {validateBoard,validImage} from '../functions/garden/board-schema.ts';
const node=()=>({id:crypto.randomUUID(),kind:'text',x:0,y:0,width:200,height:100,rotation:0,fill:'transparent',color:'#112233',fontSize:20,text:'hello',assetId:null,points:[]});
const doc=()=>({schema:1,width:1200,height:800,background:'#FFFFFF',nodes:[node()]});
test('完整画布可保存，拒绝未知字段、重复节点和无界坐标',()=>{
 assert.deepEqual(validateBoard(doc()).schema,1);
 for(const mutate of [d=>({...d,url:'https://evil'}),d=>({...d,nodes:[{...node(),x:Infinity}]}),d=>({...d,nodes:[d.nodes[0],d.nodes[0]]}),d=>({...d,nodes:[{...node(),html:'<script>'}]}),d=>({...d,width:0})])assert.throws(()=>validateBoard(mutate(doc())));
});
test('图片必须引用 UUID，笔画限制点数及字段类型',()=>{
 assert.throws(()=>validateBoard({...doc(),nodes:[{...node(),kind:'image'}]}));
 assert.throws(()=>validateBoard({...doc(),nodes:[{...node(),kind:'stroke',points:[[1,2]]}]}));
 assert.throws(()=>validateBoard({...doc(),nodes:[{...node(),points:[[1,2]]}]}));
 assert.throws(()=>validateBoard({...doc(),nodes:[{...node(),kind:'text',assetId:crypto.randomUUID()}]}));
});
test('仅真实 PNG JPEG WebP 标记被允许，SVG 和伪造 MIME 被拒绝',()=>{
 assert.equal(validImage('image/png',new Uint8Array([137,80,78,71,13,10,26,10])),true);
 assert.equal(validImage('image/jpeg',new Uint8Array([255,216,255,224])),true);
 assert.equal(validImage('image/webp',new TextEncoder().encode('RIFF1234WEBP')),true);
 assert.equal(validImage('image/svg+xml',new TextEncoder().encode('<svg/>')),false);
 assert.equal(validImage('image/png',new TextEncoder().encode('<svg/>')),false);
});
