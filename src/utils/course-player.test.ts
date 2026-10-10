import { afterEach, describe, expect, it, vi } from 'vitest';
import { createCoursePlayer } from './course-player';
import { audioText } from '../i18n/audio';
function setup(source = 'audio/test.mp3') {
  const audios: HTMLAudioElement[] = [];
  const onChange = vi.fn();
  const createAudio = vi.fn(() => {
    const audio = { play: vi.fn().mockResolvedValue(undefined), pause: vi.fn(), load: vi.fn(), removeAttribute: vi.fn(), playbackRate: 1 } as unknown as HTMLAudioElement;
    audios.push(audio);
    return audio;
  });
  const player = createCoursePlayer(() => source, onChange, createAudio);
  return { player, audios, onChange, createAudio };
}
afterEach(() => vi.useRealTimers());
describe('不依赖浏览器语音引擎的课程播放器', () => {
  it('用户点击时立即播放MP3；加载、播放结束状态正确', async () => {
    const { player, audios, onChange } = setup();
    player.speak('name', 0.85);
    expect(audios[0].play).toHaveBeenCalledOnce();
    expect(audios[0].src).toBe('audio/test.mp3');
    expect(audios[0].playbackRate).toBe(0.85);
    expect(onChange).toHaveBeenLastCalledWith({ speaking: true, error: '' });
    audios[0].onplaying?.call(audios[0], new Event('playing'));
    audios[0].onended?.call(audios[0], new Event('ended'));
    expect(onChange).toHaveBeenLastCalledWith({ speaking: false, error: '' });
    player.dispose();
  });
  it('缺少文件不会假装播放，也不要求换浏览器', () => {
    const { player, createAudio, onChange } = setup('');
    player.speak('missing');
    expect(createAudio).not.toHaveBeenCalled();
    expect(onChange).toHaveBeenLastCalledWith({ speaking: false, error: audioText.unavailable });
  });
  it('音频错误允许用户重试，不自动反复请求', () => {
    const { player, audios, onChange } = setup();
    player.speak('name');
    audios[0].onerror?.call(audios[0], new Event('error'));
    expect(onChange).toHaveBeenLastCalledWith({ speaking: false, error: audioText.failed });
    expect(audios).toHaveLength(1);
    player.speak('name');
    expect(audios).toHaveLength(2);
    player.dispose();
  });
  it('快速切换/停止后旧Promise失败不能覆盖新状态', async () => {
    const { player, onChange } = setup();
    let reject!: (error: Error) => void;
    player.speak('first');
    player.stop();
    // 第二个播放器在等待时手动停止，拒绝回调也不能恢复错误。
    const pending = new Promise<void>((_resolve, fail) => { reject = fail; });
    const create = () => ({ play: () => pending, pause: vi.fn(), removeAttribute: vi.fn(), load: vi.fn() }) as unknown as HTMLAudioElement;
    const isolated = createCoursePlayer(() => 'test.mp3', onChange, create);
    isolated.speak('second'); isolated.stop(); reject(new Error('late'));
    await Promise.resolve(); await Promise.resolve();
    expect(onChange).toHaveBeenLastCalledWith({ speaking: false, error: '' });
    isolated.dispose(); player.dispose();
  });
  it('快速换词会释放上一个播放器，旧结束事件不能停止新音频', () => {
    const { player, audios, onChange } = setup();
    player.speak('first');
    const oldEnded = audios[0].onended;
    player.speak('second');
    oldEnded?.call(audios[0], new Event('ended'));
    expect(audios[0].pause).toHaveBeenCalledOnce();
    expect(onChange).toHaveBeenLastCalledWith({ speaking: true, error: '' });
    player.dispose();
  });
  it('旧音频迟到的waiting事件不能清掉新音频超时或在停止后启动计时', () => {
    vi.useFakeTimers();
    const { player, audios, onChange } = setup();
    player.speak('first');
    const oldWaiting = audios[0].onwaiting;
    player.speak('second');
    oldWaiting?.call(audios[0], new Event('waiting'));
    vi.advanceTimersByTime(15000);
    expect(onChange).toHaveBeenLastCalledWith({ speaking: false, error: audioText.timeout });
    player.stop();
    oldWaiting?.call(audios[0], new Event('waiting'));
    expect(vi.getTimerCount()).toBe(0);
    player.dispose();
  });
  it('播放同步抛错也恢复按钮，不留下等待计时器', () => {
    const changed = vi.fn();
    const create = () => ({ play: () => { throw new Error('unsupported media'); }, pause: vi.fn(), removeAttribute: vi.fn(), load: vi.fn() }) as unknown as HTMLAudioElement;
    const player = createCoursePlayer(() => 'test.mp3', changed, create);
    player.speak('name');
    expect(changed).toHaveBeenLastCalledWith({ speaking: false, error: audioText.failed });
    player.dispose();
  });
  it('加载或播放中断最长等待15秒，停止释放资源', () => {
    vi.useFakeTimers();
    const { player, audios, onChange } = setup();
    player.speak('name', 100);
    expect(audios[0].playbackRate).toBe(1.5);
    vi.advanceTimersByTime(15000);
    expect(onChange).toHaveBeenLastCalledWith({ speaking: false, error: audioText.timeout });
    expect(audios[0].pause).toHaveBeenCalled();
    player.speak('name', Number.NaN);
    expect(audios[1].playbackRate).toBe(0.85);
    audios[1].onplaying?.call(audios[1], new Event('playing'));
    vi.advanceTimersByTime(16000);
    expect(onChange).toHaveBeenLastCalledWith({ speaking: true, error: '' });
    audios[1].onwaiting?.call(audios[1], new Event('waiting'));
    vi.advanceTimersByTime(15000);
    expect(onChange).toHaveBeenLastCalledWith({ speaking: false, error: audioText.timeout });
    player.dispose();
  });
  it('浏览器禁止播放与普通失败分别提示；销毁后不再更新界面', async () => {
    const changed = vi.fn();
    const create = () => ({ play: () => Promise.reject(Object.assign(new Error(), { name: 'NotAllowedError' })), pause: vi.fn(), removeAttribute: vi.fn(), load: vi.fn() }) as unknown as HTMLAudioElement;
    const player = createCoursePlayer(() => 'test.mp3', changed, create);
    player.speak('name'); await Promise.resolve(); await Promise.resolve();
    expect(changed).toHaveBeenLastCalledWith({ speaking: false, error: audioText.blocked });
    player.dispose(); changed.mockClear(); player.speak('name'); player.stop();
    expect(changed).not.toHaveBeenCalled();
  });
});
