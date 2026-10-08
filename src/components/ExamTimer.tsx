import { useEffect, useRef, useState } from 'react';
import { officialZh as t } from '../i18n/officialZh';
import { remainingSeconds } from '../utils/officialPractice';
import { Pause, Play, RotateCcw } from './icons';

/** 以截止时间计时，切换到后台时不会按 interval 次数累积误差。 */
export function ExamTimer({ minutes }: { minutes: number }) {
  const duration = minutes * 60;
  const [seconds, setSeconds] = useState(duration);
  const [running, setRunning] = useState(false);
  const end = useRef(0);
  useEffect(() => {
    if (!running) return;
    const tick = () => {
      const left = remainingSeconds(end.current);
      setSeconds(left);
      if (left === 0) setRunning(false);
    };
    tick();
    const interval = setInterval(tick, 250);
    document.addEventListener('visibilitychange', tick);
    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', tick);
    };
  }, [running]);
  function toggle() {
    if (running) {
      setSeconds(remainingSeconds(end.current));
      setRunning(false);
    } else if (seconds > 0) {
      end.current = Date.now() + seconds * 1000;
      setRunning(true);
    }
  }
  return <section className="official-timer" aria-label={t.timerTitle}>
    <div>
      <span className="eyebrow">{t.timerTitle} · {minutes} {t.minutes}</span>
      <div className="timer-value" role="timer" aria-live="off">
        {String(Math.floor(seconds / 60)).padStart(2, '0')}<span>:</span>{String(seconds % 60).padStart(2, '0')}
      </div>
    </div>
    <div className="official-timer-actions">
      <div className="row flex-wrap">
        <button className="button primary" disabled={seconds === 0} onClick={toggle}>
          {running ? <Pause size={17} /> : <Play size={17} />}
          {running ? t.pause : seconds === duration ? t.begin : t.resume}
        </button>
        <button className="button secondary" onClick={() => { setRunning(false); setSeconds(duration); }}>
          <RotateCcw size={17} />{t.reset}
        </button>
      </div>
      <p className="muted">{t.timerNote}</p>
      <p role="status">{seconds === 0 ? t.done : running ? t.running : seconds === duration ? t.ready : t.paused}</p>
    </div>
  </section>;
}
