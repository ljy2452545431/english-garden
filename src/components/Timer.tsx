import { useEffect,useRef,useState } from 'react';
import { Pause,Play,RotateCcw } from './icons';
import { zh as t } from '../i18n/zh';
export function Timer(){
 const [duration,setDuration]=useState(10),[seconds,setSeconds]=useState(600),[running,setRunning]=useState(false);
 const end=useRef(0);
 useEffect(()=>{if(!running)return;const tick=()=>{const left=Math.max(0,Math.ceil((end.current-Date.now())/1000));setSeconds(left);if(left===0)setRunning(false);};const id=setInterval(tick,300);return()=>clearInterval(id);},[running]);
 return <div className="timer-card"><div className="eyebrow">{t.focus}</div><div className="timer-value" aria-live="off">{String(Math.floor(seconds/60)).padStart(2,'0')}<span>:</span>{String(seconds%60).padStart(2,'0')}</div><div className="row justify-center">{[10,15,30].map(n=><button className={'pill '+(n===duration?'active':'')} key={n} onClick={()=>{setDuration(n);setSeconds(n*60);setRunning(false);}}>{n} {t.minutes}</button>)}</div><div className="row justify-center mt-4"><button className="button primary" onClick={()=>{end.current=Date.now()+seconds*1000;setRunning(!running);}}>{running?<Pause size={16}/>:<Play size={16}/>} {running?t.pause:t.begin}</button><button className="icon-button" aria-label={t.reset} onClick={()=>{setRunning(false);setSeconds(duration*60);}}><RotateCcw size={18}/></button></div>{seconds===0&&<p role="status">{t.timerDone}</p>}</div>;
}
