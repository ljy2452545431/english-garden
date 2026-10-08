import { useEffect, useState } from 'react';
export function useSpeech(){
  const [speaking,setSpeaking]=useState(false),[error,setError]=useState('');
  useEffect(()=>()=>{window.speechSynthesis?.cancel();},[]);
  function stop(){window.speechSynthesis?.cancel();setSpeaking(false);}
  function speak(text:string,rate=0.85){
    if(!('speechSynthesis' in window)){setError('这个浏览器不支持朗读，请换用手机系统浏览器。');return;}
    stop();setError('');const u=new SpeechSynthesisUtterance(text);u.lang='en-US';u.rate=rate;
    const voice=speechSynthesis.getVoices().find(v=>v.lang.startsWith('en'));if(voice)u.voice=voice;
    u.onstart=()=>setSpeaking(true);u.onend=()=>setSpeaking(false);u.onerror=()=>{setSpeaking(false);setError('朗读未能播放，请检查浏览器语音设置或重试。');};speechSynthesis.speak(u);
  }
  return{speaking,error,speak,stop};
}
