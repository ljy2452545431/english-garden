import { expect, it, vi } from "vitest";
import { createBoardImageCache } from "./board-image-cache";
it("移除失败图片立即清除其错误，其他仍引用的失败图片保留反馈", async () => {
  const publish = vi.fn(),
    load = vi.fn(async (id: string) => {
      if (id !== "good") throw new Error(id + "读取失败");
      return new Blob();
    });
  const c = createBoardImageCache({
    load,
    publish,
    create: () => "blob:good",
    revoke: vi.fn(),
  });
  c.update(["badA", "badB", "good"]);
  await vi.waitFor(() =>
    expect(publish.mock.lastCall![0].urls.good).toBe("blob:good"),
  );
  c.update(["badB", "good"]);
  expect(publish.mock.lastCall![0].error).toBe("badB读取失败");
  expect(load).toHaveBeenCalledTimes(3);
  c.update(["good"]);
  expect(publish.mock.lastCall![0]).toEqual({
    urls: { good: "blob:good" },
    error: "",
  });
  expect(load).toHaveBeenCalledTimes(3);
  c.dispose();
});
it("新增图片只加载新增项，未变化URL保留，移除与dispose准确释放", async () => {
  const load = vi.fn(async (_id: string) => new Blob(["x"])),
    create = vi.fn((_: Blob) => "blob:" + create.mock.calls.length),
    revoke = vi.fn(),
    publish = vi.fn();
  const c = createBoardImageCache({ load, create, revoke, publish });
  c.update(["A"]);
  await vi.waitFor(() =>
    expect(publish.mock.lastCall?.[0].urls.A).toBeTruthy(),
  );
  const first = publish.mock.lastCall![0].urls.A;
  c.update(["A", "B"]);
  await vi.waitFor(() =>
    expect(publish.mock.lastCall?.[0].urls.B).toBeTruthy(),
  );
  expect(load.mock.calls.map((x) => x[0])).toEqual(["A", "B"]);
  expect(publish.mock.lastCall![0].urls.A).toBe(first);
  c.update(["B"]);
  expect(revoke).toHaveBeenCalledWith(first);
  c.dispose();
  expect(revoke).toHaveBeenCalledTimes(2);
});
it("正在读取的图片移除后不发布；并发槽释放后加载排队图片且可显式重加", async () => {
  const jobs = new Map<string, (b: Blob) => void>(),
    load = vi.fn((id: string) => new Promise<Blob>((r) => jobs.set(id, r))),
    create = vi.fn(() => "blob:new"),
    revoke = vi.fn(),
    publish = vi.fn();
  const c = createBoardImageCache({ load, create, revoke, publish });
  c.update(["A", "B", "C", "D"]);
  c.update(["B", "C", "D"]);
  jobs.get("A")!(new Blob());
  await vi.waitFor(() => expect(load).toHaveBeenCalledTimes(4));
  expect(create).not.toHaveBeenCalled();
  c.update(["A"]);
  jobs.get("B")!(new Blob());
  await vi.waitFor(() => expect(load).toHaveBeenCalledTimes(5));
  c.dispose();
  c.dispose();
  c.update(["Z"]);
  expect(load).toHaveBeenCalledTimes(5);
  for (const release of jobs.values()) release(new Blob());
  await Promise.resolve();
});
it("切换账号也共享三条读取上限，旧请求完成不会向新账号发布URL", async () => {
  const releases: Array<(blob: Blob) => void> = [],
    oldPublish = vi.fn(),
    newPublish = vi.fn();
  const old = createBoardImageCache({
    load: () => new Promise<Blob>((r) => releases.push(r)),
    publish: oldPublish,
  });
  old.update(["A", "B", "C"]);
  old.dispose();
  const load = vi.fn(async () => new Blob()),
    current = createBoardImageCache({ load, publish: newPublish });
  current.update(["D"]);
  expect(load).not.toHaveBeenCalled();
  releases[0](new Blob());
  await vi.waitFor(() => expect(load).toHaveBeenCalledOnce());
  expect(Object.keys(newPublish.mock.lastCall![0].urls)).toEqual(["D"]);
  expect(oldPublish).toHaveBeenCalledOnce();
  current.dispose();
  releases.slice(1).forEach((r) => r(new Blob()));
  await Promise.resolve();
});
it("默认Blob URL方法可释放，非Error失败有可见提示", async () => {
  const create = vi
      .spyOn(URL, "createObjectURL")
      .mockReturnValue("blob:default"),
    revoke = vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {}),
    publish = vi.fn();
  const c = createBoardImageCache({ load: async () => new Blob(), publish });
  c.update(["A"]);
  await vi.waitFor(() => expect(create).toHaveBeenCalled());
  c.dispose();
  expect(revoke).toHaveBeenCalledWith("blob:default");
  const failed = createBoardImageCache({
    load: async () => {
      throw "网络失败";
    },
    publish,
  });
  failed.update(["A"]);
  await vi.waitFor(() =>
    expect(publish.mock.lastCall![0].error).toBe("网络失败"),
  );
  failed.dispose();
  vi.restoreAllMocks();
});
it("最多3个进行中，失败不重复拉取，离开scope后不创建或发布私密URL", async () => {
  const releases: Array<(b: Blob) => void> = [],
    load = vi.fn(() => new Promise<Blob>((r) => releases.push(r))),
    create = vi.fn(() => "blob:private"),
    revoke = vi.fn(),
    publish = vi.fn();
  const c = createBoardImageCache({ load, create, revoke, publish });
  c.update(["A", "B", "C", "D"]);
  expect(load).toHaveBeenCalledTimes(3);
  c.update(["A", "B", "C", "D"]);
  expect(load).toHaveBeenCalledTimes(3);
  c.dispose();
  const before = publish.mock.calls.length;
  releases.forEach((r) => r(new Blob(["x"])));
  await Promise.resolve();
  await Promise.resolve();
  expect(create).not.toHaveBeenCalled();
  expect(publish).toHaveBeenCalledTimes(before);
  expect(load).toHaveBeenCalledTimes(3);
  const failure = vi.fn(async () => {
      throw new Error("unavailable");
    }),
    failed = createBoardImageCache({ load: failure, create, revoke, publish });
  failed.update(["X"]);
  await vi.waitFor(() =>
    expect(publish.mock.lastCall![0].error).toBe("unavailable"),
  );
  failed.update(["X", "Y"]);
  await vi.waitFor(() => expect(failure).toHaveBeenCalledTimes(2));
  failed.update(["X", "Y"]);
  expect(failure).toHaveBeenCalledTimes(2);
  failed.dispose();
});
