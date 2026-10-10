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
it("10000ms总上限覆盖悬挂fetch，超时后的迟到健康不能更改选定线路", async () => {
  vi.useFakeTimers();
  let resolve!: (response: Response) => void;
  const fetcher = vi.fn(() => new Promise<Response>((r) => (resolve = r)));
  const route = createServiceRoute(primary, fetcher);
  const check = expect(route.prepare(30000)).rejects.toMatchObject({
    code: "CONNECTION_UNAVAILABLE",
  });
  await vi.advanceTimersByTimeAsync(10001);
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

it("默认预算允许4秒返回，成功取消未完成线路且快照隔离", async () => {
  vi.useFakeTimers();
  const fetcher = vi.fn((url: RequestInfo | URL) =>
    String(url).startsWith(primary)
      ? new Promise<Response>((resolve) =>
          setTimeout(() => resolve(healthy()), 4000),
        )
      : new Promise<Response>(() => {}),
  );
  const route = createServiceRoute(primary, fetcher);
  const result = route.prepare();
  const pending = route.diagnostics();
  await vi.advanceTimersByTimeAsync(4000);
  expect(await result).toBe(primary);
  expect(route.diagnostics().map((item) => item.status)).toEqual([
    "healthy",
    "cancelled",
  ]);
  expect(route.diagnostics()[0].durationMs).toBe(4000);
  expect(pending.every((item) => item.status === "pending")).toBe(true);
  pending[0].status = "network";
  expect(route.diagnostics()[0].status).toBe("healthy");
});
it("区分网络失败和超时，失败报告只包含脱敏诊断", async () => {
  vi.useFakeTimers();
  const route = createServiceRoute(
    primary,
    vi.fn((url: RequestInfo | URL) =>
      String(url).startsWith(primary)
        ? Promise.reject(new TypeError("private body must not leak"))
        : new Promise<Response>(() => {}),
    ),
  );
  const result = expect(route.prepare(200)).rejects.toMatchObject({
    code: "CONNECTION_UNAVAILABLE",
    diagnostics: [
      { status: "network" },
      { status: "timeout", durationMs: 200 },
    ],
  });
  await vi.advanceTimersByTimeAsync(201);
  await result;
  expect(JSON.stringify(route.diagnostics())).not.toContain("private");
  expect(route.diagnostics().every((item) => !item.host.includes("/"))).toBe(
    true,
  );
});
it("重试清空旧诊断，旧请求迟到不能污染本轮", async () => {
  vi.useFakeTimers();
  const resolvers: Array<(response: Response) => void> = [];
  const route = createServiceRoute(
    primary,
    vi.fn(() => new Promise<Response>((resolve) => resolvers.push(resolve))),
  );
  const old = expect(route.prepare(100)).rejects.toMatchObject({
    code: "CONNECTION_UNAVAILABLE",
  });
  await vi.advanceTimersByTimeAsync(101);
  await old;
  const retry = route.prepare();
  expect(route.diagnostics().every((item) => item.status === "pending")).toBe(
    true,
  );
  resolvers[1](healthy());
  await vi.advanceTimersByTimeAsync(1);
  expect(route.diagnostics().every((item) => item.status === "pending")).toBe(
    true,
  );
  resolvers[2](healthy());
  await retry;
  const snapshot = route.diagnostics();
  resolvers[3](healthy());
  await vi.advanceTimersByTimeAsync(1);
  expect(route.diagnostics()).toEqual(snapshot);
  expect(route.base()).toBe(primary);
});
it("默认预算为10秒，HTTP和无效正文诊断保留状态码", async () => {
  const route = createServiceRoute(
    primary,
    vi
      .fn()
      .mockResolvedValueOnce(new Response("not json", { status: 200 }))
      .mockResolvedValueOnce(new Response("unavailable", { status: 503 })),
  );
  await expect(route.prepare()).rejects.toMatchObject({
    code: "CONNECTION_UNAVAILABLE",
  });
  expect(route.diagnostics()).toEqual([
    expect.objectContaining({ status: "invalid", httpStatus: 200 }),
    expect.objectContaining({ status: "http", httpStatus: 503 }),
  ]);
});
it("只允许同项目完整业务成功后确认的线路，不能指定任意域名", () => {
  const route = createServiceRoute(primary);
  expect(route.confirm(backup)).toBe(true);
  expect(route.base()).toBe(backup);
  expect(route.confirm("https://attacker.invalid")).toBe(false);
  expect(route.base()).toBe(backup);
  expect(createServiceRoute("http://localhost:8787").confirm(backup)).toBe(
    false,
  );
});
