export default async page => {
  const original = await page.evaluate(() => localStorage.getItem('english-garden.preferences'));
  const results = [];
  const assert = (ok, name) => { if (!ok) throw new Error(name); results.push(name); };
  const prefs = () => page.evaluate(() => JSON.parse(localStorage.getItem('english-garden.preferences')));
  async function navigate(label, desktop=false) { await page.locator(desktop ? '.sidebar nav' : '.bottom-nav').getByRole('button',{name:label,exact:true}).click(); }
  try {
    await page.setViewportSize({width:390,height:844});
    await page.goto('http://127.0.0.1:4173/english-garden/');
    await page.getByRole('button',{name:'先体验站内课程',exact:true}).click();
    await navigate('我的花园');
    await page.getByRole('button',{name:'应用搭配：莓果手帐',exact:true}).click();
    assert((await prefs()).theme==='rose' && (await prefs()).texture==='dots', '预设实际应用');
    await page.getByLabel('搭配名称',{exact:true}).fill('手机搭配验收');
    await page.getByRole('button',{name:'收藏当前搭配',exact:true}).click();
    assert((await prefs()).looks[0].name==='手机搭配验收', '收藏外观快照');
    await page.getByRole('button',{name:'恢复默认外观',exact:true}).click();
    assert((await prefs()).theme==='garden' && (await prefs()).looks.length>0, '恢复默认保留收藏');
    await page.getByRole('button',{name:'撤回上次调整',exact:true}).click();
    assert((await prefs()).theme==='rose', '撤回调整');
    await page.getByLabel('专注计时：收起',{exact:true}).click();
    await page.getByLabel('今日笔记上移',{exact:true}).click();
    assert((await prefs()).hidden.includes('timer') && (await prefs()).order[2]==='note', '模块收起和排序');
    await navigate('今日学习');
    assert(await page.locator('.module-tasks').count()===1 && await page.locator('.module-timer').count()===0, '实际首页任务保留和模块收起');
    await navigate('我的花园');
    await page.reload();
    await page.getByRole('button',{name:'先体验站内课程',exact:true}).click();
    await navigate('我的花园');
    assert((await prefs()).theme==='rose' && (await prefs()).hidden.includes('timer'), '刷新保留个人外观');
    await page.getByRole('button',{name:'应用搭配：手机搭配验收',exact:true}).click();
    assert(!(await prefs()).hidden.includes('timer'), '收藏应用恢复原有布局');
    for (const theme of ['松林','纸页','莓果','海岸','夜读']) {
      await page.getByRole('button',{name:theme,exact:true}).click();
      await page.getByRole('button',{name:'大字号',exact:true}).click();
      for (const width of [320,390,1440]) {
        await page.setViewportSize({width,height:900});
        assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth), `${theme}大字${width}无横向溢出`);
      }
    }
    await page.getByRole('button',{name:'恢复默认外观',exact:true}).click();
    await page.evaluate(()=>scrollTo({top:0,behavior:'instant'}));await page.waitForTimeout(350);await page.screenshot({path:'.browser-qa/studio-desktop.png',fullPage:true});
    await page.setViewportSize({width:390,height:844});
    await page.waitForTimeout(350);await page.screenshot({path:'.browser-qa/studio-mobile.png',fullPage:true});
    await navigate('今日学习');
    await page.waitForTimeout(800);await page.screenshot({path:'.browser-qa/today-mobile.png',fullPage:true});
    await navigate('学习课堂');
    for (const label of ['词汇温室','听力','阅读','语法','写作','口语']) {
      const tab=page.locator('.skill-tabs').getByRole('tab',{name:label,exact:true});
      await tab.click();
      assert(await tab.getAttribute('aria-selected')==='true', `${label}标签切换`);
    }
    await page.emulateMedia({reducedMotion:'reduce'});
    await navigate('我的花园');
    assert(await page.getByRole('button',{name:'应用搭配：晚间阅读',exact:true}).isVisible(), '减少动态时仍可操作');
    await page.evaluate(result=>window.__appearanceQA=result, results);
  } finally {
    await page.evaluate(value=>{ if(value===null)localStorage.removeItem('english-garden.preferences');else localStorage.setItem('english-garden.preferences',value); },original);
  }
}
