import { afterEach, expect, it, vi } from "vitest";
import { createDraftWriter, waitForDraftWrites } from "./board-draft-writer";
import { emptyBoard } from "./board";
const draft = (title: string) => ({ title, document: emptyBoard() });
afterEach(() => vi.useRealTimers());
it("连续编辑合并成最新一份，刷新前flush不等待防抖", async () => {
  vi.useFakeTimers();
  const write = vi.fn(async () => undefined),
    error = vi.fn();
  const w = createDraftWriter("A", error, { write });
  w.schedule(draft("1"));
  w.schedule(draft("2"));
  expect(write).not.toHaveBeenCalled();
  await w.flush();
  expect(write).toHaveBeenCalledExactlyOnceWith("A", draft("2"));
  await w.dispose();
});
it("旧实例D1正在写且D2待写，新实例恢复等待全部写完；不同owner不等待", async () => {
  let finish!: (v: void) => void;
  let saved = "";
  const write = vi
    .fn()
    .mockImplementationOnce(() => new Promise<void>((r) => (finish = r)))
    .mockImplementation(async (_owner: string, value: { title: string }) => {
      saved = value.title;
    });
  const old = createDraftWriter("restore-owner", vi.fn(), { write });
  old.schedule(draft("D1"));
  void old.flush();
  old.schedule(draft("D2"));
  const disposing = old.dispose();
  let restored = false;
  const reading = waitForDraftWrites("restore-owner").then(() => {
    restored = true;
    return saved;
  });
  await waitForDraftWrites("other-owner");
  expect(restored).toBe(false);
  finish();
  await disposing;
  expect(await reading).toBe("D2");
});
it("同owner新旧实例flush串行，失败屏障明确拒绝；新稿成功后恢复", async () => {
  let finish!: () => void;
  const calls: string[] = [];
  const first = createDraftWriter("serial-owner", vi.fn(), {
    write: async (_, d) => {
      calls.push(d.title);
      await new Promise<void>((r) => (finish = r));
    },
  });
  const next = createDraftWriter("serial-owner", vi.fn(), {
    write: async (_, d) => {
      calls.push(d.title);
    },
  });
  first.schedule(draft("old"));
  const a = first.dispose();
  next.schedule(draft("new"));
  const b = next.flush();
  expect(calls).toEqual(["old"]);
  finish();
  await Promise.all([a, b]);
  expect(calls).toEqual(["old", "new"]);
  await next.dispose();
  const bad = createDraftWriter("failed-owner", vi.fn(), {
    write: async () => {
      throw new Error("quota");
    },
  });
  bad.schedule(draft("last"));
  await expect(bad.dispose()).rejects.toThrow("quota");
  await expect(waitForDraftWrites("failed-owner")).rejects.toThrow("quota");
  const retry = createDraftWriter("failed-owner", vi.fn(), {
    write: async () => {},
  });
  retry.schedule(draft("recovered"));
  await retry.dispose();
  await expect(waitForDraftWrites("failed-owner")).resolves.toBeUndefined();
});
it("写入期间只保留最新一份，串行落盘且账号不可变", async () => {
  vi.useFakeTimers();
  let release!: () => void;
  const write = vi
    .fn()
    .mockImplementationOnce(() => new Promise<void>((r) => (release = r)))
    .mockResolvedValue(undefined);
  const w = createDraftWriter("A", vi.fn(), { write });
  w.schedule(draft("1"));
  const flushing = w.flush();
  await Promise.resolve();
  w.schedule(draft("2"));
  w.schedule(draft("3"));
  expect(write).toHaveBeenCalledTimes(1);
  release();
  await flushing;
  expect(write.mock.calls.map((c) => [c[0], c[1].title])).toEqual([
    ["A", "1"],
    ["A", "3"],
  ]);
  await w.dispose();
});
it("失败明确报告且保留最后草稿，可flush重试；dispose保存最新并拒绝后续schedule", async () => {
  const error = vi.fn(),
    write = vi
      .fn()
      .mockRejectedValueOnce(new Error("quota"))
      .mockResolvedValue(undefined);
  const w = createDraftWriter("A", error, { write });
  w.schedule(draft("last"));
  await expect(w.flush()).rejects.toThrow("quota");
  expect(error).toHaveBeenCalledOnce();
  await w.dispose();
  expect(write).toHaveBeenCalledTimes(2);
  expect(() => w.schedule(draft("late"))).toThrow();
});
it("防抖250ms自动写入，失败不会无限自动重试", async () => {
  vi.useFakeTimers();
  const write = vi.fn().mockRejectedValue(new Error("offline")),
    error = vi.fn();
  const w = createDraftWriter("A", error, { write });
  w.schedule(draft("1"));
  await vi.advanceTimersByTimeAsync(250);
  expect(error).toHaveBeenCalledOnce();
  await vi.advanceTimersByTimeAsync(2000);
  expect(write).toHaveBeenCalledOnce();
  await expect(w.dispose()).rejects.toThrow("offline");
});
it("多个flush共享一个完成承诺，较新的草稿优先于失败旧稿；错误反馈抛错不吞原始失败", async () => {
  let reject!: (e: unknown) => void;
  const write = vi
    .fn()
    .mockImplementationOnce(() => new Promise<void>((_, r) => (reject = r)))
    .mockResolvedValue(undefined);
  const w = createDraftWriter(
    "A",
    () => {
      throw new Error("展示失败");
    },
    { write, delayMs: 999 },
  );
  w.schedule(draft("old"));
  const first = w.flush();
  expect(w.flush()).toBe(first);
  w.schedule(draft("new"));
  reject("网络失败");
  await expect(first).rejects.toThrow("网络失败");
  await w.flush();
  expect(write.mock.calls[1][1].title).toBe("new");
  await w.dispose();
});
