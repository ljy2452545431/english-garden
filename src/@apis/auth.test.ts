import { describe, expect, it, vi, afterEach } from "vitest";
const request = vi.fn();
const prepareServiceConnection = vi.fn();
vi.mock("../server", () => ({ request, prepareServiceConnection }));
const session = {
  token: crypto.randomUUID(),
  user: { id: "member-a", username: "ljy", displayName: "ljy" },
};
afterEach(() => {
  vi.restoreAllMocks();
  vi.resetAllMocks();
});
describe("登录并加载学习记录", () => {
  it("线路不可达不发送密码，探测耗时包含在总预算内", async () => {
    const { loginAndLoad } = await import("./auth");
    prepareServiceConnection.mockRejectedValueOnce(new Error("线路不可达"));
    await expect(loginAndLoad("ljy", "example")).rejects.toThrow("线路不可达");
    expect(request).not.toHaveBeenCalled();
    prepareServiceConnection.mockResolvedValueOnce(undefined);
    vi.spyOn(Date, "now")
      .mockReturnValueOnce(1000)
      .mockReturnValueOnce(4000)
      .mockReturnValueOnce(5000);
    request.mockResolvedValueOnce({
      ...session,
      learning: { version: 1, state: {} },
    });
    await loginAndLoad("ljy", "example");
    expect(request.mock.calls[0][4]).toEqual({ timeoutMs: 12000 });
    expect(prepareServiceConnection).toHaveBeenCalledWith(3000);
  });

  it("合并响应一次请求即可完成，保留云端版本", async () => {
    const { loginAndLoad } = await import("./auth");
    request.mockResolvedValueOnce({
      ...session,
      learning: { version: 7, state: { notes: { private: "saved" } } },
    });
    const result = await loginAndLoad("ljy", "example");
    expect(result.learning.version).toBe(7);
    expect(request).toHaveBeenCalledTimes(1);
  });
  it("旧后端兼容读取状态，但缺失状态不能登录成功", async () => {
    const { loginAndLoad } = await import("./auth");
    request
      .mockResolvedValueOnce(session)
      .mockResolvedValueOnce({ version: 2, state: {} });
    expect((await loginAndLoad("ljy", "example")).learning.version).toBe(2);
    expect(request).toHaveBeenCalledTimes(2);
    request.mockResolvedValueOnce({
      ...session,
      learning: { version: -1, state: {} },
    });
    await expect(loginAndLoad("ljy", "example")).rejects.toThrow("学习记录");
  });
  it("旧服务读取仅使用剩余预算，预算耗尽不再请求", async () => {
    const { loginAndLoad } = await import("./auth");
    vi.spyOn(Date, "now")
      .mockReturnValueOnce(1000)
      .mockReturnValueOnce(2000)
      .mockReturnValueOnce(6000);
    request
      .mockResolvedValueOnce(session)
      .mockResolvedValueOnce({ version: 2, state: {} });
    await loginAndLoad("ljy", "example");
    expect(request.mock.calls[1][4]).toEqual({ timeoutMs: 10000 });
    request.mockReset();
    vi.spyOn(Date, "now")
      .mockReturnValueOnce(1000)
      .mockReturnValueOnce(1001)
      .mockReturnValueOnce(16001);
    request.mockResolvedValueOnce(session);
    await expect(loginAndLoad("ljy", "example")).rejects.toThrow("超时");
    expect(request).toHaveBeenCalledTimes(1);
  });
  it("登录失败不读取状态，不重试密码请求", async () => {
    const { loginAndLoad } = await import("./auth");
    request.mockRejectedValueOnce(new Error("邮箱或密码错误"));
    await expect(loginAndLoad("ljy", "example")).rejects.toThrow(
      "邮箱或密码错误",
    );
    expect(request).toHaveBeenCalledTimes(1);
  });
});
