import { zh as t } from "../i18n/zh";
/** 只派生同项目官方域名；自定义本机服务保持原来的直连配置。 */
export function serviceCandidates(base: string): string[] {
  const main = base.match(
    /^https:\/\/([a-z0-9]{20})\.supabase\.co\/functions\/v1\/garden\/?$/,
  );
  const alternate = base.match(
    /^https:\/\/([a-z0-9]{20})\.functions\.supabase\.co\/garden\/?$/,
  );
  const project = main?.[1] ?? alternate?.[1];
  if (!project) return [];
  const primary = `https://${project}.supabase.co/functions/v1/garden`,
    backup = `https://${project}.functions.supabase.co/garden`;
  return main ? [primary, backup] : [backup, primary];
}
const unavailable = () =>
  Object.assign(new Error(t.serviceNetwork), {
    code: "CONNECTION_UNAVAILABLE",
  });
export function createServiceRoute(
  configuredBase: string,
  fetcher: typeof fetch = (...args) => fetch(...args),
) {
  let selected = configuredBase.replace(/\/$/, ""),
    inflight: Promise<string> | undefined;
  const candidates = serviceCandidates(configuredBase);
  function prepare(timeoutMs = 3000): Promise<string> {
    if (inflight) return inflight;
    if (!candidates.length) return Promise.resolve(selected);
    if (!Number.isFinite(timeoutMs) || timeoutMs <= 0)
      return Promise.reject(unavailable());
    const controller = new AbortController();
    let done = false;
    const operation = new Promise<string>((resolve, reject) => {
      const timer = setTimeout(
        () => finish(undefined),
        Math.min(3000, timeoutMs),
      );
      function finish(base: string | undefined) {
        if (done) return;
        done = true;
        clearTimeout(timer);
        controller.abort();
        if (base) {
          selected = base;
          resolve(base);
        } else reject(unavailable());
      }
      let failures = 0;
      for (const base of candidates) {
        const check = async () => {
          const response = await fetcher(base + "/health", {
            method: "GET",
            redirect: "error",
            signal: controller.signal,
          });
          if (!response.ok) throw unavailable();
          const value = await response.json();
          if (value?.success !== true || value?.data?.status !== "ok")
            throw unavailable();
          return base;
        };
        void check().then(
          (value) => finish(value),
          () => {
            failures++;
            if (failures === candidates.length) finish(undefined);
          },
        );
      }
    });
    const shared = operation.finally(() => {
      if (inflight === shared) inflight = undefined;
    });
    inflight = shared;
    return shared;
  }
  return { prepare, base: () => selected };
}
const connection = createServiceRoute(import.meta.env.VITE_API_URL ?? "");
export const prepareServiceConnection = (timeoutMs = 3000) =>
  connection.prepare(timeoutMs);
export const serviceBase = () => connection.base();
