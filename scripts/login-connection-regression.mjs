/** 隔离浏览器网络故障；真实账号只做低频登录，不修改学习数据。 */
import { readFile, writeFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";
const { chromium } = await import(
  pathToFileURL(process.env.PLAYWRIGHT_MODULE).href
);
const target =
  process.env.GARDEN_TEST_URL || "http://127.0.0.1:4173/english-garden/";
if (
  ![
    "http://127.0.0.1:4173/english-garden/",
    "https://ljy2452545431.github.io/english-garden/",
  ].includes(target)
)
  throw new Error("测试网址必须是已授权正式站或本机预览");
const credentials = await readFile(
  new URL("../../.english-garden-private/账号信息.txt", import.meta.url),
  "utf8",
);
const accounts = [
  ...credentials.matchAll(/账号：([^\r\n]+)\r?\n密码：([^\r\n]+)/g),
].map((m) => ({ username: m[1], password: m[2] }));
if (accounts.length !== 2) throw new Error("需要两个指定账号");
const browser = await chromium.launch({ headless: true, channel: "chrome" });
const results = [];
try {
  for (const [index, mode] of [
    "primary-blocked",
    "alternate-blocked",
    "both-blocked",
    "invalid-password",
  ].entries()) {
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
    });
    const page = await context.newPage();
    const posts = [];
    page.on("request", (req) => {
      if (req.method() === "POST" && req.url().endsWith("/api/login"))
        posts.push(new URL(req.url()).hostname);
    });
    await context.route("**/*.supabase.co/**", async (route) => {
      const url = route.request().url();
      const alternate = new URL(url).hostname.includes(".functions.");
      if (
        mode === "both-blocked" ||
        (mode === "primary-blocked" && !alternate) ||
        (mode === "alternate-blocked" && alternate)
      )
        return route.abort();
      if (mode === "invalid-password" && url.endsWith("/api/login"))
        return route.fulfill({
          status: 401,
          contentType: "application/json",
          body: JSON.stringify({
            success: false,
            error: { message: "邮箱或密码错误", code: "UNAUTHORIZED" },
          }),
        });
      return route.continue();
    });
    await page.goto(target);
    if (page.url() !== target) throw new Error("测试页面发生了未授权重定向");
    await page
      .getByRole("button", { name: "登录两人空间", exact: true })
      .first()
      .click();
    const account = accounts[index % 2];
    await page.locator("#username").fill(account.username);
    await page.locator("#password").fill(account.password);
    const successfulMode =
      mode === "primary-blocked" || mode === "alternate-blocked";
    const responsePromise = successfulMode
      ? page.waitForResponse(
          (r) =>
            r.url().endsWith("/api/login") && r.request().method() === "POST",
        )
      : null;
    const started = Date.now();
    await page
      .locator("form button[type=submit], form button.button.primary")
      .click();
    if (mode.endsWith("blocked") && mode !== "both-blocked") {
      await page
        .locator("#username")
        .waitFor({ state: "hidden", timeout: 18000 });
      if (
        posts.length !== 1 ||
        posts[0].includes(".functions.") !== (mode === "primary-blocked")
      )
        throw new Error(mode + ": 登录线路/请求次数不符");
      const response = await responsePromise;
      const data = (await response.json()).data;
      if (
        data?.user?.username !== account.username ||
        !data.token ||
        !data.learning?.state ||
        !Number.isSafeInteger(data.learning.version)
      )
        throw new Error("真实身份或学习状态断言失败");
      const logout = await context.request.post(
        response.url().replace("/api/login", "/api/logout"),
        {
          headers: {
            apikey: response.request().headers().apikey,
            authorization: `Bearer ${data.token}`,
          },
          data: {},
        },
      );
      if (!logout.ok()) throw new Error("测试会话退出失败");
    } else {
      await page.getByRole("alert").waitFor({ timeout: 6000 });
      if (posts.length !== (mode === "both-blocked" ? 0 : 1))
        throw new Error(mode + ": 密码请求次数不符");
      if (await page.locator("form button.button.primary").isDisabled())
        throw new Error("失败后按钮未恢复");
      if (mode === "both-blocked") {
        await page.getByText("查看连接诊断", { exact: true }).click();
        const diagnostic = await page
          .getByRole("textbox", { name: "连接诊断信息" })
          .inputValue();
        if (
          !diagnostic.includes("CONNECTION_UNAVAILABLE") ||
          diagnostic.includes(account.password) ||
          /Bearer|token/i.test(diagnostic)
        )
          throw new Error("诊断异常");
      }
    }
    results.push({
      mode,
      passed: true,
      elapsedMs: Date.now() - started,
      loginPosts: posts.length,
      loginHost: posts[0] ?? null,
    });
    await context.close();
  }
} finally {
  await browser.close();
}
const report = {
  time: new Date().toISOString(),
  scope: "390×844 Chromium；客户端隔离故障，不代表用户手机运营商网络或容量验收",
  results,
};
await writeFile(
  new URL("../docs/login-connection-result.json", import.meta.url),
  JSON.stringify(report, null, 2),
);
console.log(JSON.stringify(report, null, 2));
