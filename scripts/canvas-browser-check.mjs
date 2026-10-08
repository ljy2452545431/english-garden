/** 用已有 Playwright page 执行，不登录、不更改云端学习记录。 */
export default async function check(page) {
  const original = await page.evaluate(() =>
    localStorage.getItem("english-garden.preferences"),
  );
  const checks = [];
  const assert = (ok, name) => {
    if (!ok) throw new Error(name);
    checks.push(name);
  };
  const prefs = () =>
    page.evaluate(() =>
      JSON.parse(localStorage.getItem("english-garden.preferences")),
    );
  try {
    await page.goto("http://127.0.0.1:4173/english-garden/");
    await page.setViewportSize({ width: 1440, height: 900 });
    await page
      .getByRole("button", { name: "先体验站内课程", exact: true })
      .click();
    await page
      .locator(".sidebar nav")
      .getByRole("button", { name: "我的花园", exact: true })
      .click();
    await page
      .getByRole("button", { name: "恢复默认外观", exact: true })
      .click();
    const source = page.locator(
      '[data-card-id="tasks"] .creative-canvas__handle',
    );
    const target = page.locator(
      '[data-card-id="note"] .creative-canvas__handle',
    );
    await source.scrollIntoViewIfNeeded();
    const s = await source.boundingBox(),
      d = await target.boundingBox();
    await page.mouse.move(s.x + s.width / 2, s.y + s.height / 2);
    await page.mouse.down();
    await page.mouse.move(d.x + d.width / 2, d.y + d.height / 2, { steps: 12 });
    await page.mouse.up();
    assert((await prefs()).order[3] === "tasks", "鼠标拖拽重排并保存");
    await page
      .locator('[data-card-id="tasks"] .creative-canvas__handle')
      .focus();
    await page.keyboard.press("ArrowUp");
    assert((await prefs()).order[2] === "tasks", "键盘重排");
    await page.setViewportSize({ width: 390, height: 844 });
    await page
      .locator(".creative-canvas__tool")
      .getByText("心意", { exact: true })
      .click();
    const sticker = page.locator(".creative-canvas__sticker").last();
    await sticker.scrollIntoViewIfNeeded();
    const before = (await prefs()).decorations[0];
    const rect = await sticker.boundingBox();
    const cdp = await page.context().newCDPSession(page);
    await cdp.send("Emulation.setTouchEmulationEnabled", { enabled: true });
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchStart",
      touchPoints: [
        { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 },
      ],
    });
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchMove",
      touchPoints: [
        { x: rect.x + rect.width / 2 + 45, y: rect.y + rect.height / 2 + 10 },
      ],
    });
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchEnd",
      touchPoints: [],
    });
    assert((await prefs()).decorations[0].x > before.x, "触摸拖拽贴纸保存位置");
    await cdp.send("Emulation.setTouchEmulationEnabled", { enabled: false });
    await cdp.detach();
    await page
      .getByRole("button", { name: "旋转选中贴纸", exact: true })
      .click();
    assert(
      (await prefs()).decorations[0].rotation !== before.rotation,
      "旋转贴纸",
    );
    await page
      .locator(".bottom-nav")
      .getByRole("button", { name: "今日学习", exact: true })
      .click();
    assert(
      (await page.locator(".decoration-strip span").count()) === 1,
      "装饰实际显示在首页",
    );
    await page
      .locator(".bottom-nav")
      .getByRole("button", { name: "我的花园", exact: true })
      .click();
    await page.locator(".creative-canvas__sticker").click();
    await page
      .getByRole("button", { name: "移除选中贴纸", exact: true })
      .click();
    assert((await prefs()).decorations.length === 0, "移除贴纸");
    await page
      .getByRole("button", { name: "撤回上次调整", exact: true })
      .click();
    assert((await prefs()).decorations.length === 1, "撤回贴纸移除");
    for (const width of [320, 390, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      assert(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
        `${width}画布无溢出`,
      );
    }
    await page.evaluate(() => scrollTo({ top: 0, behavior: "instant" }));
    await page.screenshot({
      path: ".browser-qa/canvas-desktop.png",
      fullPage: false,
    });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.screenshot({
      path: ".browser-qa/canvas-mobile.png",
      fullPage: false,
    });
    await page.evaluate((result) => (window.__canvasChecks = result), checks);
  } finally {
    await page.evaluate((value) => {
      if (value === null) localStorage.removeItem("english-garden.preferences");
      else localStorage.setItem("english-garden.preferences", value);
    }, original);
  }
}
