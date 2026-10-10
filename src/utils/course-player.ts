import { audioText as t } from '../i18n/audio';
export interface CoursePlayback { speaking: boolean; error: string }
/** 公开课程音频本地播放；不依赖 speechSynthesis，也不上传用户文字。 */
export function createCoursePlayer(
  sourceFor: (text: string) => string | undefined,
  onChange: (state: CoursePlayback) => void,
  createAudio: () => HTMLAudioElement = () => new Audio(),
) {
  let current: HTMLAudioElement | undefined;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let disposed = false;
  function clearTimer() { clearTimeout(timer); timer = undefined; }
  function release() {
    clearTimer();
    const audio = current;
    current = undefined;
    if (!audio) return;
    audio.onplaying = audio.onended = audio.onerror = audio.onwaiting = null;
    audio.pause();
    audio.removeAttribute('src');
    audio.load();
  }
  function finish(error = '') {
    release();
    if (!disposed) onChange({ speaking: false, error });
  }
  function speak(text: string, rate = 0.85) {
    if (disposed) return;
    release();
    const source = sourceFor(text);
    if (!source) { finish(t.unavailable); return; }
    const audio = createAudio();
    current = audio;
    const failed = (error: string) => { if (current === audio) finish(error); };
    const wait = () => {
      if (current !== audio || disposed) return;
      clearTimer();
      timer = setTimeout(() => failed(t.timeout), 15000);
    };
    audio.src = source;
    audio.preload = 'auto';
    audio.playbackRate = Number.isFinite(rate) ? Math.min(1.5, Math.max(0.5, rate)) : 0.85;
    audio.onplaying = () => { if (current === audio) clearTimer(); };
    audio.onwaiting = wait;
    audio.onended = () => { if (current === audio) finish(); };
    audio.onerror = () => failed(t.failed);
    onChange({ speaking: true, error: '' });
    wait();
    // 必须在点击回调内直接 play，避免异步取音频后丢失用户手势授权。
    try {
      void audio.play()?.catch((error: Error) => failed(error.name === 'NotAllowedError' ? t.blocked : t.failed));
    } catch { failed(t.failed); }
  }
  return {
    speak,
    stop: () => finish(),
    dispose: () => { disposed = true; release(); },
  };
}
