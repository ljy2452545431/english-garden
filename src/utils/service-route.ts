import { zh as t } from "../i18n/zh";

export const SERVICE_PROBE_BUDGET_MS = 10000;
export type ServiceDiagnostic = {
  host: string;
  status:
    | "pending"
    | "healthy"
    | "network"
    | "http"
    | "invalid"
    | "timeout"
    | "cancelled";
  durationMs: number;
  httpStatus?: number;
};
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
const unavailable = (diagnostics: ServiceDiagnostic[]) =>
  Object.assign(new Error(t.serviceNetwork), {
    code: "CONNECTION_UNAVAILABLE",
    diagnostics,
  });
export function createServiceRoute(
  configuredBase: string,
  fetcher: typeof fetch = (...args) => fetch(...args),
) {
  let selected = configuredBase.replace(/\/$/, ""),
    inflight: Promise<string> | undefined;
  let latest: ServiceDiagnostic[] = [];
  const diagnostics = () => latest.map((item) => ({ ...item }));
  const candidates = serviceCandidates(configuredBase);
  function prepare(timeoutMs = SERVICE_PROBE_BUDGET_MS): Promise<string> {
    if (inflight) return inflight;
    latest = [];
    if (!candidates.length) return Promise.resolve(selected);
    if (!Number.isFinite(timeoutMs) || timeoutMs <= 0)
      return Promise.reject(unavailable(diagnostics()));
    const controller = new AbortController(),
      started = Date.now();
    let done = false;
    latest = candidates.map((base) => ({
      host: new URL(base).hostname,
      status: "pending",
      durationMs: 0,
    }));
    const update = (
      index: number,
      status: ServiceDiagnostic["status"],
      httpStatus?: number,
    ) => {
      if (done) return;
      latest = latest.map((item, position) =>
        position === index
          ? {
              ...item,
              status,
              durationMs: Math.max(0, Date.now() - started),
              ...(httpStatus === undefined ? {} : { httpStatus }),
            }
          : item,
      );
    };
    const operation = new Promise<string>((resolve, reject) => {
      const timer = setTimeout(
        () => finish(undefined),
        Math.min(SERVICE_PROBE_BUDGET_MS, timeoutMs),
      );
      function finish(base: string | undefined) {
        if (done) return;
        latest = latest.map((item) =>
          item.status === "pending"
            ? {
                ...item,
                status: base ? "cancelled" : "timeout",
                durationMs: Math.max(0, Date.now() - started),
              }
            : item,
        );
        done = true;
        clearTimeout(timer);
        controller.abort();
        if (base) {
          selected = base;
          resolve(base);
        } else reject(unavailable(diagnostics()));
      }
      const failed = () => {
        if (!done && latest.every((item) => item.status !== "pending"))
          finish(undefined);
      };
      candidates.forEach((base, index) => {
        const check = async () => {
          let response: Response;
          try {
            response = await fetcher(base + "/health", {
              method: "GET",
              redirect: "error",
              signal: controller.signal,
            });
          } catch {
            update(index, "network");
            failed();
            return;
          }
          if (done) return;
          if (!response.ok) {
            update(index, "http", response.status);
            failed();
            return;
          }
          // 正文读取也在统一计时器内；只保留状态码，不记录响应正文或异常消息。
          update(index, "pending", response.status);
          let value;
          try {
            value = await response.json();
          } catch (error) {
            update(index, error instanceof SyntaxError ? "invalid" : "network");
            failed();
            return;
          }
          if (done) return;
          if (value?.success !== true || value?.data?.status !== "ok") {
            update(index, "invalid");
            failed();
            return;
          }
          update(index, "healthy");
          finish(base);
        };
        void check();
      });
    });
    const shared = operation.finally(() => {
      if (inflight === shared) inflight = undefined;
    });
    inflight = shared;
    return shared;
  }
  function confirm(base: string): boolean {
    if (!candidates.includes(base)) return false;
    selected = base;
    return true;
  }
  return { prepare, base: () => selected, diagnostics, confirm };
}
const connection = createServiceRoute(import.meta.env.VITE_API_URL ?? "");
export const prepareServiceConnection = (timeoutMs = SERVICE_PROBE_BUDGET_MS) =>
  connection.prepare(timeoutMs);
export const serviceBase = () => connection.base();
export const getServiceDiagnostics = () => connection.diagnostics();
/** 仅在同项目业务读取完整成功后记住可用线路。 */
export const confirmServiceBase = (base: string) => connection.confirm(base);
