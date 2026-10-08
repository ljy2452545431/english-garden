import { useEffect,useRef,useState } from 'react';
import { Mic,Square,Download,CloudUpload } from './icons';
import { zh as t } from '../i18n/zh';
import { uploadRecording } from '../server';
export function Recorder({token,title}:{token?:string;title:string}){
 const [url,setUrl]=useState(''),[blob,setBlob]=useState<Blob|null>(null),[recording,setRecording]=useState(false),[error,setError]=useState(''),[busy,setBusy]=useState(false);
 const recorder=useRef<MediaRecorder|null>(null),stream=useRef<MediaStream|null>(null),chunks=useRef<Blob[]>([]),timer=useRef<ReturnType<typeof setTimeout>|null>(null),currentUrl=useRef('');
 useEffect(()=>()=>{if(timer.current)clearTimeout(timer.current);if(recorder.current){recorder.current.onstop=null;recorder.current.ondataavailable=null;if(recorder.current.state==='recording')recorder.current.stop();}stream.current?.getTracks().forEach(t=>t.stop());if(currentUrl.current)URL.revokeObjectURL(currentUrl.current);},[]);
 async function start(){
  setError('');if(!navigator.mediaDevices?.getUserMedia||!window.MediaRecorder){setError('当前浏览器不支持录音，请在 HTTPS 的系统浏览器中打开。');return;}
  try{stream.current=await navigator.mediaDevices.getUserMedia({audio:true});const mime=['audio/webm;codecs=opus','audio/mp4','audio/ogg;codecs=opus'].find(m=>MediaRecorder.isTypeSupported(m));const r=new MediaRecorder(stream.current,mime?{mimeType:mime}:undefined);recorder.current=r;chunks.current=[];
   r.ondataavailable=e=>{if(e.data.size)chunks.current.push(e.data);};
   r.onstop=()=>{if(timer.current)clearTimeout(timer.current);const b=new Blob(chunks.current,{type:r.mimeType});if(currentUrl.current)URL.revokeObjectURL(currentUrl.current);const u=URL.createObjectURL(b);currentUrl.current=u;setBlob(b);setUrl(u);setRecording(false);stream.current?.getTracks().forEach(t=>t.stop());};r.start();setRecording(true);timer.current=setTimeout(()=>r.state==='recording'&&r.stop(),180000);
  }catch{setError('无法使用麦克风，请检查浏览器权限后重试。');}
 }
 return <div className="recorder"><p className="muted">{t.audioNote} 本次最多录制 3 分钟，刷新前请下载或保存。</p><button className={'button '+(recording?'danger':'primary')} onClick={()=>recording?recorder.current?.stop():start()}>{recording?<Square size={17}/>:<Mic size={17}/>} {recording?t.stop:t.mic}</button>{recording&&<span className="recording-indicator">正在录音…</span>}{url&&<div className="stack mt-4"><audio controls src={url}/><div className="row flex-wrap"><a className="button secondary" href={url} download={`${title}.${blob?.type.includes('mp4')?'m4a':blob?.type.includes('ogg')?'ogg':'webm'}`}><Download size={16}/>{t.download}</a>{token&&<button className="button secondary" disabled={busy} onClick={async()=>{if(!blob)return;setBusy(true);try{await uploadRecording(token,blob,title);setError('已保存到私密空间，可在两人空间查看和分享。');}catch(e){setError((e as Error).message);}finally{setBusy(false);}}}><CloudUpload size={16}/>{busy?t.saving:t.saveRecording}</button>}</div></div>}{error&&<p role="status" className="notice">{error}</p>}</div>;
}
