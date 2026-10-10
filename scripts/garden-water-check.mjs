/** 使用隔离 Playwright page；只修改本机外观，不登录、不写云端。 */
export async function check(page, url = 'http://127.0.0.1:4173/english-garden/') {
  const results = [];
  async function open(motion) {
    await page.goto(url);
    await page.evaluate(motion => localStorage.setItem('english-garden.preferences', JSON.stringify({motion})), motion);
    await page.reload();
    await page.getByRole('button', {name:'先体验站内课程', exact:true}).click();
  }
  const button = page.locator('.garden-water');
  const visibleDrops = () => page.locator('.water-drop').evaluateAll(els => els.some(e => Number(getComputedStyle(e).opacity) > .1 && getComputedStyle(e).visibility === 'visible'));
  for (const mode of ['low', 'full']) {
    await page.emulateMedia({reducedMotion:'no-preference'});
    await open(mode);
    await button.click(); await page.waitForTimeout(450);
    if (!await visibleDrops()) throw Error(mode + ' 无水滴反馈');
    await button.click(); await page.waitForTimeout(450);
    if (!await visibleDrops()) throw Error(mode + ' 重播失败');
    await page.waitForTimeout(1700);
    if ((await button.innerText()).includes('正在')) throw Error('播放结束未复位');
    await button.click(); await page.waitForTimeout(200);
    await page.emulateMedia({reducedMotion:'reduce'}); await page.waitForTimeout(200);
    if ((await button.innerText()).includes('正在') || await visibleDrops()) throw Error('系统减少动画未清理');
    await button.click();
    if (!(await button.innerText()).includes('再浇')) throw Error('减少动画没有静态反馈');
    results.push(mode + ':播放/重播/结束/中途减少动画通过');
  }
  await page.emulateMedia({reducedMotion:'no-preference'});
  await open('none');await button.click();await page.waitForTimeout(300);
  if (await visibleDrops() || !(await button.innerText()).includes('再浇')) throw Error('关闭动画契约错误');
  for (const width of [320,390,768,1440]) {
    await page.setViewportSize({width,height:900});
    const geometry = await page.evaluate(() => {
      const scene=document.querySelector('.garden-companion .garden-scene').getBoundingClientRect();
      const button=document.querySelector('.garden-water').getBoundingClientRect();
      return {gap:button.top-scene.bottom,overflow:document.documentElement.scrollWidth>innerWidth};
    });
    if (geometry.gap < 17 || geometry.overflow) throw Error('布局异常 '+JSON.stringify({width,...geometry}));
    results.push({width,...geometry});
  }
  return results;
}
