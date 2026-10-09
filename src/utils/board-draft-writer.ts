import { writeDraft, type BoardDraft } from "./board-storage";
type Options = {
  delayMs?: number;
  write?: (owner: string, draft: BoardDraft) => Promise<unknown>;
};
type OwnerWrites = {
  pending: Set<Promise<void>>;
  tail?: Promise<void>;
  failure?: Error;
};
const owners = new Map<string, OwnerWrites>();
/** 重挂同一账号前等待旧写入完整完成；已失败的落盘明确拒绝，不能假装恢复成功。 */
export async function waitForDraftWrites(owner: string): Promise<void> {
  let writes = owners.get(owner);
  while (writes?.pending.size) {
    await Promise.allSettled([...writes.pending]);
    writes = owners.get(owner);
  }
  if (writes?.failure) throw writes.failure;
}
/** 调用者传入不可变草稿；只保留一次写入和最新待写草稿，owner 生命周期固定。 */
export function createDraftWriter(
  owner: string,
  onError: (error: Error) => void,
  options: Options = {},
) {
  const write = options.write ?? writeDraft,
    delay = Math.min(400, Math.max(0, options.delayMs ?? 250));
  let latest: BoardDraft | undefined,
    running: Promise<void> | undefined,
    timer: ReturnType<typeof setTimeout> | undefined,
    disposed = false;
  function clear() {
    if (timer !== undefined) {
      clearTimeout(timer);
      timer = undefined;
    }
  }
  async function drain() {
    while (latest) {
      const draft = latest;
      latest = undefined;
      try {
        await write(owner, draft);
      } catch (cause) {
        latest ??= draft;
        const error = cause instanceof Error ? cause : new Error(String(cause));
        try {
          onError(error);
        } catch {
          /* 展示失败不能丢失草稿。 */
        }
        throw error;
      }
    }
  }
  function flush(): Promise<void> {
    clear();
    if (running) return running;
    if (!latest) return Promise.resolve();
    const writes = owners.get(owner) ?? { pending: new Set<Promise<void>>() };
    owners.set(owner, writes);
    // 同 owner 不同组件实例也串行；前一次失败不阻止用户显式保存新稿。
    const operation = writes.tail
      ? writes.tail.catch(() => {}).then(drain)
      : drain();
    const promise = operation
      .then(
        () => {
          writes.failure = undefined;
        },
        (cause) => {
          writes.failure = cause;
          throw cause;
        },
      )
      .finally(() => {
        writes.pending.delete(promise);
        if (writes.tail === promise) writes.tail = undefined;
        if (
          !writes.pending.size &&
          !writes.failure &&
          owners.get(owner) === writes
        )
          owners.delete(owner);
        running = undefined;
      });
    writes.pending.add(promise);
    writes.tail = promise;
    running = promise;
    return promise;
  }
  function schedule(draft: BoardDraft) {
    if (disposed) throw new Error("草稿写入器已关闭");
    latest = draft;
    clear();
    timer = setTimeout(() => {
      timer = undefined;
      void flush().catch(() => {
        /* 已反馈，保留草稿不无限重试。 */
      });
    }, delay);
  }
  function dispose() {
    disposed = true;
    return flush();
  }
  return { schedule, flush, dispose };
}
