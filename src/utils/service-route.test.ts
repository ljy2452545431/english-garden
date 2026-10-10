import { afterEach, expect, it, vi } from "vitest";
import { createServiceRoute, serviceCandidates } from "./service-route";
const primary = "https://cdhmiwrhirjntpelgnvq.supabase.co/functions/v1/garden";
const backup = "https://cdhmiwrhirjntpelgnvq.functions.supabase.co/garden";
const healthy = () =>
  new Response(JSON.stringify({ success: true, data: { status: "ok" } }));
afterEach(() => vi.useRealTimers());
it("仅同项目的两种官方HTTPS地址可派生线路，拒绝域名伪装与任意路径", () => {
  expect(serviceCandidates(primary)).toEqual([primary, backup]);
  expect(serviceCandidates(backup + "/")).toEqual([backup, primary]);
  for (const bad of [
    "http://cdhmiwrhirjntpelgnvq.supabase.co/functions/v1/garden",
    primary + "?url=evil",
    primary + "#evil",
    primary + "/api",
    primary.replace(".co", ".co.evil.test"),
    primary.replace("https://", "https://attacker@"),
    "https://evil.test/functions/v1/garden",
    primary.replace(".co/", ".co:444/"),
  ])
    expect(serviceCandidates(bad)).toEqual([]);
});
it("主线路故障备线路健康时仅两次匿名GET，并行探测复用；下次明确登录重新检查", async () => {
  const fetcher = vi.fn(async (url: RequestInfo | URL, _init?: RequestInit) =>
    String(url).startsWith(primary)
      ? Promise.reject(new TypeError("network"))
      : healthy(),
  );
  const route = createServiceRoute(primary, fetcher);
  const first = route.prepare(3000),
    second = route.prepare(3000);
  expect(first).toBe(second);
  expect(await first).toBe(backup);
  expect(route.base()).toBe(backup);
  expect(fetcher).toHaveBeenCalledTimes(2);
  expect(await route.prepare(3000)).toBe(backup);
  expect(fetcher).toHaveBeenCalledTimes(4);
  for (const [, init] of fetcher.mock.calls) {
    expect(init!.method).toBe("GET");
    expect(init!.redirect).toBe("error");
    expect(init!.headers).toBeUndefined();
    expect(init!.body).toBeUndefined();
  }
});
it("全部超时/正文不结束也在预算内失败，取消所有探测，不发登录或密码", async () => {
  vi.useFakeTimers();
  const signals: AbortSignal[] = [],
    fetcher = vi.fn((_url: RequestInfo | URL, init?: RequestInit) => {
      signals.push(init!.signal as AbortSignal);
      return Promise.resolve({
        ok: true,
        json: () => new Promise(() => {}),
      } as Response);
    });
  const route = createServiceRoute(primary, fetcher);
  const failed = expect(route.prepare(100)).rejects.toMatchObject({
    code: "CONNECTION_UNAVAILABLE",
  });
  await vi.advanceTimersByTimeAsync(101);
  await failed;
  expect(signals.every((s) => s.aborted)).toBe(true);
  expect(fetcher).toHaveBeenCalledTimes(2);
  expect(route.base()).toBe(primary);
});
it("错误响应内容/HTTP失败都不被当作健康，失败可在下一次明确登录时再探测", async () => {
  const fetcher = vi
    .fn()
    .mockResolvedValueOnce(new Response(JSON.stringify({ status: "ok" })))
    .mockResolvedValueOnce(
      new Response(JSON.stringify({ success: true, data: { status: "ok" } }), {
        status: 503,
      }),
    )
    .mockImplementation(async () => healthy());
  const route = createServiceRoute(primary, fetcher);
  await expect(route.prepare()).rejects.toMatchObject({
    code: "CONNECTION_UNAVAILABLE",
  });
  expect(fetcher).toHaveBeenCalledTimes(2);
  await route.prepare();
  expect(fetcher).toHaveBeenCalledTimes(4);
  const custom = createServiceRoute("http://localhost:8787", fetcher);
  expect(await custom.prepare()).toBe("http://localhost:8787");
  expect(fetcher).toHaveBeenCalledTimes(4);
});
it("3000ms总上限覆盖悬挂fetch，超时后的迟到健康不能更改选定线路", async () => {
  vi.useFakeTimers();
  let resolve!: (response: Response) => void;
  const fetcher = vi.fn(() => new Promise<Response>((r) => (resolve = r)));
  const route = createServiceRoute(primary, fetcher);
  const check = expect(route.prepare(30000)).rejects.toMatchObject({
    code: "CONNECTION_UNAVAILABLE",
  });
  await vi.advanceTimersByTimeAsync(3001);
  await check;
  resolve(healthy());
  await Promise.resolve();
  await Promise.resolve();
  expect(route.base()).toBe(primary);
  expect(fetcher).toHaveBeenCalledTimes(2);
  await expect(route.prepare(0)).rejects.toMatchObject({
    code: "CONNECTION_UNAVAILABLE",
  });
  expect(fetcher).toHaveBeenCalledTimes(2);
});
