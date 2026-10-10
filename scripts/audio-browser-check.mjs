/** 真实MP3播放；屏蔽浏览器语音接口模拟小米缺少该能力，不登录、不写云端。 */
import { pathToFileURL } from 'node:url';
import { writeFile } from 'node:fs/promises';
const { chromium } = await import(pathToFileURL(process.env.PLAYWRIGHT_MODULE).href);
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
const results = [];
try {
  await page.addInitScript(() => {
    Object.defineProperty(window, 'speechSynthesis', { value: undefined, configurable: true });
    Object.defineProperty(window, 'SpeechSynthesisUtterance', { value: undefined, configurable: true });
    const NativeAudio = window.Audio;
    window.__courseAudios = [];
    window.Audio = function(...args) {
      const audio = new NativeAudio(...args);
      window.__courseAudios.push(audio);
      return audio;
    };
  });
  await page.goto(process.env.GARDEN_TEST_URL || 'http://127.0.0.1:4173/english-garden/');
  await page.getByRole('button', { name: '先体验站内课程', exact: true }).click();
  await page.locator('.bottom-nav').getByRole('button', { name: '学习课堂', exact: true }).click();
  await page.getByRole('button', { name: '朗读', exact: true }).click();
  await page.waitForFunction(() => window.__courseAudios.at(-1)?.currentTime > 0.05);
  results.push('语音接口缺失时单词MP3实际解码播放');
  await page.getByRole('tab', { name: '听力', exact: true }).click();
  await page.getByRole('button', { name: '朗读', exact: true }).click();
  await page.waitForFunction(() => window.__courseAudios.at(-1)?.currentTime > 0.1);
  const playing = await page.evaluate(() => {
    const a = window.__courseAudios.at(-1);
    return { seconds: a.currentTime, duration: a.duration, rate: a.playbackRate, paused: a.paused };
  });
  if (playing.paused || playing.duration <= 1 || playing.rate !== 0.85) throw new Error('听力音频未实际播放');
  await page.getByRole('button', { name: '停止朗读', exact: true }).click();
  if (!await page.evaluate(() => window.__courseAudios.at(-1).paused)) throw new Error('停止未生效');
  results.push({ listening: playing, stopPassed: true });
  await page.route('**/audio/*.mp3', route => route.abort());
  await page.getByRole('button', { name: '朗读', exact: true }).click();
  await page.getByText('音频未能加载，请检查网络后再点一次朗读。', { exact: true }).waitFor();
  await page.unroute('**/audio/*.mp3');
  await page.getByRole('button', { name: '朗读', exact: true }).click();
  await page.waitForFunction(() => window.__courseAudios.at(-1)?.currentTime > 0.1);
  results.push('网络失败明确提示，手动重试恢复播放');
  await page.getByRole('tab', { name: '阅读', exact: true }).click();
  if (!await page.evaluate(() => window.__courseAudios.at(-1).paused)) throw new Error('切换任务未停止');
  results.push('切换任务停止旧音频');
  const report = { time: new Date().toISOString(), url: page.url(), scope: 'Chrome390×844，真实音频、禁用语音API；非小米真机证明', results };
  await writeFile(new URL('../docs/audio-browser-result.json', import.meta.url), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
} finally { await browser.close(); }
