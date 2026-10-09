export type ImageSnapshot = { urls: Record<string, string>; error: string };
type Options = {
  load: (id: string, active: () => boolean) => Promise<Blob>;
  publish: (value: ImageSnapshot) => void;
  create?: (blob: Blob) => string;
  revoke?: (url: string) => void;
};
// 旧账号的请求未完成时，新账号只排队；所有缓存实例合计最多三次读取。
let activeLoads = 0;
const pumps = new Set<() => void>();
/** 增量缓存：同 scope 失败仅尝试一次，移除后重新添加才重试。 */
export function createBoardImageCache(options: Options) {
  const create = options.create ?? URL.createObjectURL,
    revoke = options.revoke ?? URL.revokeObjectURL;
  const urls = new Map<string, string>(),
    loading = new Set<string>(),
    attempted = new Set<string>(),
    errors = new Map<string, string>();
  let desired = new Set<string>(),
    disposed = false;
  const publish = () => {
    if (!disposed)
      options.publish({
        urls: Object.fromEntries(urls),
        error: errors.values().next().value ?? "",
      });
  };
  async function load(id: string) {
    try {
      const blob = await options.load(id, () => !disposed && desired.has(id));
      if (!disposed && desired.has(id)) {
        urls.set(id, create(blob));
        publish();
      }
    } catch (cause) {
      if (!disposed && desired.has(id)) {
        errors.set(id, cause instanceof Error ? cause.message : String(cause));
        publish();
      }
    } finally {
      loading.delete(id);
      activeLoads--;
      if (!desired.has(id)) attempted.delete(id);
      for (const resume of pumps) resume();
    }
  }
  function pump() {
    if (disposed) return;
    for (const id of desired) {
      if (activeLoads >= 3) break;
      if (urls.has(id) || loading.has(id) || attempted.has(id)) continue;
      attempted.add(id);
      loading.add(id);
      activeLoads++;
      void load(id);
    }
  }
  function update(ids: readonly string[]) {
    if (disposed) return;
    desired = new Set(ids);
    for (const [id, url] of urls)
      if (!desired.has(id)) {
        revoke(url);
        urls.delete(id);
      }
    for (const id of errors.keys()) if (!desired.has(id)) errors.delete(id);
    for (const id of attempted)
      if (!desired.has(id) && !loading.has(id)) attempted.delete(id);
    publish();
    pump();
  }
  function dispose() {
    if (disposed) return;
    disposed = true;
    pumps.delete(pump);
    for (const url of urls.values()) revoke(url);
    urls.clear();
    desired.clear();
    attempted.clear();
    errors.clear();
  }
  pumps.add(pump);
  return { update, dispose };
}
