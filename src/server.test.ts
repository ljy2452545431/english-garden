import { afterEach, describe, expect, it, vi } from "vitest";
afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.resetModules();
  vi.useRealTimers();
});
async function client() {
  vi.stubEnv("VITE_API_URL", "https://example.test");
  return await import("./server");
}
describe("私密服务请求失败反馈", () => {
  it("选中的官方备用线路用于JSON、图片和录音，所有写请求只发一次且拒绝重定向", async () => {
    const primary =
        "https://cdhmiwrhirjntpelgnvq.supabase.co/functions/v1/garden",
      backup = "https://cdhmiwrhirjntpelgnvq.functions.supabase.co/garden";
    vi.stubEnv("VITE_API_URL", primary);
    const api = await import("./server");
    const fetcher = vi.fn(
      async (url: RequestInfo | URL, _init?: RequestInit) => {
        if (String(url) === primary + "/health") throw new TypeError("blocked");
        if (String(url).endsWith("/health"))
          return new Response(
            JSON.stringify({ success: true, data: { status: "ok" } }),
          );
        return new Response(
          JSON.stringify({ success: true, data: { ok: true } }),
        );
      },
    );
    vi.stubGlobal("fetch", fetcher);
    await api.prepareServiceConnection();
    await api.request(
      "/api/login",
      undefined,
      { username: "ljy", password: crypto.randomUUID() },
      "POST",
    );
    await api.binaryRequest("/api/board-assets/id", "session");
    await api.uploadRecording(
      "session",
      new Blob(["audio"], { type: "audio/webm" }),
      "练习",
    );
    const url = await api.recordingUrl("session", "id");
    URL.revokeObjectURL(url);
    const business = fetcher.mock.calls.filter(
      ([url]) => !String(url).endsWith("/health"),
    );
    expect(business).toHaveLength(4);
    expect(
      business.every(
        ([url, init]) =>
          String(url).startsWith(backup) && init?.redirect === "error",
      ),
    ).toBe(true);
    expect(business.filter(([, init]) => init?.method === "POST")).toHaveLength(
      2,
    );
  });
  it("网络故障给中文提示", async () => {
    const { request } = await client();
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new TypeError("Failed to fetch")),
    );
    await expect(request("/api/login")).rejects.toMatchObject({
      code: "NETWORK_UNREACHABLE",
    });
  });
  it("错误保留HTTP状态，版本冲突仍可恢复", async () => {
    const { request } = await client();
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            success: false,
            error: { code: "VERSION_CONFLICT", message: "记录已更新" },
          }),
          { status: 409 },
        ),
      ),
    );
    await expect(request("/api/state")).rejects.toMatchObject({
      status: 409,
      code: "VERSION_CONFLICT",
    });
  });
  it("连接超时停止请求、显示中文，不自动重试", async () => {
    vi.useFakeTimers();
    const { request } = await client();
    const fetch = vi.fn(
      (_url: RequestInfo | URL, init?: RequestInit) =>
        new Promise((_resolve, reject) =>
          init?.signal?.addEventListener("abort", () =>
            reject(new DOMException("aborted", "AbortError")),
          ),
        ),
    );
    vi.stubGlobal("fetch", fetch);
    const result = expect(
      request("/api/login", undefined, {}, "POST", { timeoutMs: 10 }),
    ).rejects.toThrow("连接私密服务超时");
    await vi.advanceTimersByTimeAsync(11);
    await result;
    expect(fetch).toHaveBeenCalledTimes(1);
  });
});
const primary = "https://cdhmiwrhirjntpelgnvq.supabase.co/functions/v1/garden";
const backup = "https://cdhmiwrhirjntpelgnvq.functions.supabase.co/garden";
const ok = () =>
  new Response(JSON.stringify({ success: true, data: { ok: true } }));
async function official() {
  vi.stubEnv("VITE_API_URL", primary);
  return import("./server");
}
describe("安全读取有限切换线路", () => {
  it.each([401, 503])("HTTP %s 正文挂起仍不切换且保留状态", async (status) => {
    vi.useFakeTimers();
    const api = await official();
    const fetcher = vi.fn().mockResolvedValue({
      ok: false,
      status,
      json: () => new Promise(() => {}),
    });
    vi.stubGlobal("fetch", fetcher);
    const result = api
      .request("/api/state", undefined, undefined, "GET", { timeoutMs: 100 })
      .catch((error: unknown) => error);
    await vi.advanceTimersByTimeAsync(100);
    expect(await result).toMatchObject({ status, code: "SERVICE_TIMEOUT" });
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(vi.getTimerCount()).toBe(0);
  });
  it("自定义地址不派生备用线路", async () => {
    const api = await client();
    const fetcher = vi.fn().mockRejectedValue(new TypeError("offline"));
    vi.stubGlobal("fetch", fetcher);
    await expect(api.request("/api/state")).rejects.toMatchObject({
      code: "NETWORK_UNREACHABLE",
    });
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
  it("带正文 GET 不重试", async () => {
    const api = await official();
    const fetcher = vi.fn().mockRejectedValue(new TypeError("offline"));
    vi.stubGlobal("fetch", fetcher);
    await expect(
      api.request("/api/state", undefined, null, "GET"),
    ).rejects.toMatchObject({ code: "NETWORK_UNREACHABLE" });
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
  it("HTTP 错误正文读取失败不切换", async () => {
    const api = await official();
    const fetcher = vi.fn().mockResolvedValue({
      ok: false,
      status: 503,
      json: async () => {
        throw new TypeError("body failed");
      },
    });
    vi.stubGlobal("fetch", fetcher);
    await expect(api.request("/api/state")).rejects.toMatchObject({
      status: 503,
    });
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
  it("备用返回401不会粘性切换", async () => {
    const api = await official();
    const fetcher = vi
      .fn()
      .mockRejectedValueOnce(new TypeError("offline"))
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ success: false }), { status: 401 }),
      )
      .mockImplementation(async () => ok());
    vi.stubGlobal("fetch", fetcher);
    await expect(api.request("/api/state")).rejects.toMatchObject({
      status: 401,
    });
    await api.request("/api/state");
    expect(fetcher.mock.calls[2][0]).toBe(primary + "/api/state");
  });
  it("网络失败切换一次，完整成功后后续请求使用备用", async () => {
    const api = await official();
    const fetcher = vi
      .fn()
      .mockRejectedValueOnce(new TypeError("offline"))
      .mockImplementation(async () => ok());
    vi.stubGlobal("fetch", fetcher);
    await expect(api.request("/api/state", "session")).resolves.toEqual({
      ok: true,
    });
    await api.request("/api/state", "session");
    expect(fetcher.mock.calls.map(([url]) => url)).toEqual([
      primary + "/api/state",
      backup + "/api/state",
      backup + "/api/state",
    ]);
  });
  it.each([401, 403, 429, 500])("HTTP %s 不切换", async (status) => {
    const api = await official();
    const fetcher = vi.fn(
      async () =>
        new Response(
          JSON.stringify({ success: false, error: { message: "failed" } }),
          { status },
        ),
    );
    vi.stubGlobal("fetch", fetcher);
    await expect(api.request("/api/state")).rejects.toMatchObject({ status });
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
  it("无效正文不切换", async () => {
    const api = await official();
    const fetcher = vi.fn(async () => new Response("invalid"));
    vi.stubGlobal("fetch", fetcher);
    await expect(api.request("/api/state")).rejects.toMatchObject({
      code: "INVALID_RESPONSE",
    });
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
  it.each(["POST", "PATCH", "DELETE"])("%s 网络错误不重试", async (method) => {
    const api = await official();
    const fetcher = vi.fn().mockRejectedValue(new TypeError("offline"));
    vi.stubGlobal("fetch", fetcher);
    await expect(
      api.request("/api/state", "session", {}, method),
    ).rejects.toMatchObject({ code: "NETWORK_UNREACHABLE" });
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
  it("首线路8秒超时后切换，全部超时总计25秒", async () => {
    vi.useFakeTimers();
    const api = await official();
    const fetcher = vi.fn(
      (_url: RequestInfo | URL, init?: RequestInit) =>
        new Promise((_resolve, reject) =>
          init?.signal?.addEventListener("abort", () =>
            reject(new DOMException("aborted", "AbortError")),
          ),
        ),
    );
    vi.stubGlobal("fetch", fetcher);
    const result = expect(api.request("/api/state")).rejects.toMatchObject({
      code: "SERVICE_TIMEOUT",
    });
    await vi.advanceTimersByTimeAsync(8000);
    expect(fetcher).toHaveBeenCalledTimes(2);
    await vi.advanceTimersByTimeAsync(17000);
    await result;
    expect(vi.getTimerCount()).toBe(0);
  });
  it("调用方短预算两次共计不超过100毫秒", async () => {
    vi.useFakeTimers();
    const api = await official();
    const fetcher = vi.fn(
      (_url: RequestInfo | URL, init?: RequestInit) =>
        new Promise((_resolve, reject) =>
          init?.signal?.addEventListener("abort", () =>
            reject(new DOMException("aborted", "AbortError")),
          ),
        ),
    );
    vi.stubGlobal("fetch", fetcher);
    const result = expect(
      api.request("/api/state", undefined, undefined, "GET", {
        timeoutMs: 100,
      }),
    ).rejects.toMatchObject({ code: "SERVICE_TIMEOUT" });
    await vi.advanceTimersByTimeAsync(50);
    expect(fetcher).toHaveBeenCalledTimes(2);
    await vi.advanceTimersByTimeAsync(50);
    await result;
  });
});
