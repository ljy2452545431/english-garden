import { afterEach, describe, expect, it, vi } from "vitest";
import { emptyBoard } from "./board";
afterEach(() => {
  vi.unstubAllGlobals();
  vi.resetModules();
});
function storage(openFails = false) {
  const rows = new Map<string, unknown>(),
    transactions: any[] = [];
  const createObjectStore = vi.fn();
  const db = {
    createObjectStore,
    transaction: (store: string, mode: string) => {
      const tx: any = { store, mode };
      tx.objectStore = () => ({
        get: (key: string) => {
          tx.key = key;
          tx.request = { result: rows.get(`${store}:${key}`) };
          return tx.request;
        },
        put: (value: unknown, key: string) => {
          tx.key = key;
          tx.value = value;
          tx.request = { result: key };
          return tx.request;
        },
      });
      transactions.push(tx);
      return tx;
    },
  };
  const open = vi.fn(() => {
    const request: any = { result: db };
    queueMicrotask(() => {
      if (openFails) request.onerror?.();
      else {
        request.onupgradeneeded?.();
        request.onsuccess?.();
      }
    });
    return request;
  });
  vi.stubGlobal("indexedDB", { open });
  async function next() {
    await vi.waitFor(() => expect(transactions.length).toBeGreaterThan(0));
    return transactions.shift();
  }
  function complete(tx: any) {
    tx.request.onsuccess();
    if (tx.mode === "readwrite") rows.set(`${tx.store}:${tx.key}`, tx.value);
    tx.oncomplete();
  }
  return { rows, open, createObjectStore, next, complete };
}
describe("本机作品事务", () => {
  it("仅在 transaction complete 后确认保存，读写账号草稿互相隔离", async () => {
    const f = storage();
    const api = await import("./board-storage");
    const draft = { title: "A 的草稿", document: emptyBoard() };
    let done = false;
    const write = api.writeDraft("A", draft).then(() => {
      done = true;
    });
    const tx = await f.next();
    tx.request.onsuccess();
    await Promise.resolve();
    expect(done).toBe(false);
    f.complete(tx);
    await write;
    expect(f.createObjectStore.mock.calls.map((call) => call[0])).toEqual([
      "drafts",
      "images",
    ]);
    const readA = api.readDraft("A");
    f.complete(await f.next());
    expect(await readA).toEqual(draft);
    const readB = api.readDraft("B");
    f.complete(await f.next());
    expect(await readB).toBeUndefined();
    expect(f.open).toHaveBeenCalledOnce();
  });
  it("图片缓存按账号及图片编号隔离", async () => {
    const f = storage();
    const api = await import("./board-storage");
    const blob = new Blob(["private"]);
    const write = api.writeImage("A", "id", blob);
    const tx = await f.next();
    expect(tx.key).toBe("A:id");
    f.complete(tx);
    await write;
    const readA = api.readImage("A", "id");
    f.complete(await f.next());
    expect(await readA).toBe(blob);
    const readB = api.readImage("B", "id");
    f.complete(await f.next());
    expect(await readB).toBeUndefined();
  });
  it("abort/error 不报告保存成功", async () => {
    const f = storage();
    const api = await import("./board-storage");
    const aborted = api.writeDraft("A", { title: "a", document: emptyBoard() });
    const checkAbort = expect(aborted).rejects.toThrow("未完成");
    const tx = await f.next();
    tx.request.onsuccess();
    tx.onabort();
    await checkAbort;
    expect(f.rows.size).toBe(0);
    const failed = api.readDraft("A");
    const checkError = expect(failed).rejects.toThrow("已满或不可用");
    (await f.next()).onerror();
    await checkError;
  });
  it("打开失败后可重新打开，不缓存失败 Promise", async () => {
    const f = storage(true);
    const api = await import("./board-storage");
    await expect(api.readDraft("A")).rejects.toThrow("本机作品存储不可用");
    await expect(api.readDraft("A")).rejects.toThrow("本机作品存储不可用");
    expect(f.open).toHaveBeenCalledTimes(2);
  });
});
