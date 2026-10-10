import { zh as t } from "./i18n/zh";
import {
  serviceBase,
  serviceCandidates,
  confirmServiceBase,
} from "./utils/service-route";
export { prepareServiceConnection } from "./utils/service-route";
export type User = { id: string; username: string; displayName: string };
const API = import.meta.env.VITE_API_URL?.replace(/\/$/, "") ?? "";
const publicKey = import.meta.env.VITE_API_PUBLIC_KEY ?? "";
/** 私密图片走同一鉴权入口，浏览器不接触服务端密钥。 */
export async function binaryRequest(
  path: string,
  token: string,
  body?: Blob,
): Promise<Response> {
  if (!API) throw new Error(t.serviceNetwork);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 25000);
  try {
    return await fetch(`${serviceBase()}${path}`, {
      method: body ? "POST" : "GET",
      headers: {
        ...(publicKey ? { apikey: publicKey } : {}),
        Authorization: `Bearer ${token}`,
        ...(body ? { "Content-Type": body.type } : {}),
      },
      ...(body ? { body } : {}),
      signal: controller.signal,
      redirect: "error",
    });
  } catch (error) {
    if (
      controller.signal.aborted ||
      (error as Error).name === "TimeoutError" ||
      (error as Error).name === "AbortError"
    )
      throw Object.assign(new Error(t.serviceTimeout), {
        code: "SERVICE_TIMEOUT",
      });
    throw Object.assign(new Error(t.serviceNetwork), {
      code: "NETWORK_UNREACHABLE",
    });
  } finally {
    clearTimeout(timeout);
  }
}
export const configured = Boolean(API);
type RequestOptions = { timeoutMs?: number };
const timeoutError = (status?: number) =>
  Object.assign(new Error(t.serviceTimeout), {
    code: "SERVICE_TIMEOUT",
    ...(status === undefined ? {} : { status }),
  });
/** 只有完整成功的只读请求才能确认新线路，写入始终只提交一次。 */
export async function request<T>(
  path: string,
  token?: string,
  body?: unknown,
  method?: string,
  options: RequestOptions = {},
): Promise<T> {
  if (!API) throw new Error("私密服务尚未配置");
  const verb = method ?? (body === undefined ? "GET" : "POST");
  const base = serviceBase();
  const alternate =
    verb.toUpperCase() === "GET" && body === undefined
      ? serviceCandidates(base).find((candidate) => candidate !== base)
      : undefined;
  const budget = options.timeoutMs ?? 25000;
  if (!Number.isFinite(budget) || budget <= 0) throw timeoutError();
  const started = Date.now();
  try {
    return await requestOnce<T>(
      base,
      path,
      token,
      body,
      verb,
      alternate ? Math.min(8000, budget / 2) : budget,
    );
  } catch (error) {
    const code = (error as { code?: string }).code;
    if (
      !alternate ||
      (error as { status?: number }).status !== undefined ||
      !["NETWORK_UNREACHABLE", "SERVICE_TIMEOUT"].includes(code ?? "")
    )
      throw error;
    const remaining = budget - (Date.now() - started);
    if (remaining <= 0) throw timeoutError();
    const result = await requestOnce<T>(
      alternate,
      path,
      token,
      body,
      verb,
      remaining,
    );
    confirmServiceBase(alternate);
    return result;
  }
}
async function requestOnce<T>(
  base: string,
  path: string,
  token: string | undefined,
  body: unknown,
  method: string,
  timeoutMs: number,
): Promise<T> {
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  let failureStatus: number | undefined;
  const operation = async () => {
    const response = await fetch(`${base}${path}`, {
      method,
      headers: {
        ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
        ...(publicKey ? { apikey: publicKey } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
      signal: controller.signal,
      redirect: "error",
    });
    // 已收到 HTTP 失败响应时，即使正文挂起也不能当作线路故障重试。
    if (!response.ok) failureStatus = response.status;
    let result;
    try {
      result = await response.json();
    } catch (cause) {
      if (!response.ok)
        throw Object.assign(new Error(t.serviceInvalid), {
          status: response.status,
          code: "INVALID_RESPONSE",
        });
      if (cause instanceof TypeError) throw cause;
      throw Object.assign(new Error(t.serviceInvalid), {
        code: "INVALID_RESPONSE",
      });
    }
    if (
      !result ||
      typeof result !== "object" ||
      typeof result.success !== "boolean"
    )
      throw Object.assign(new Error(t.serviceInvalid), {
        status: response.status,
        code: "INVALID_RESPONSE",
      });
    if (!response.ok || !result.success)
      throw Object.assign(
        new Error(result.error?.message ?? "服务暂时不可用"),
        { status: response.status, code: result.error?.code },
      );
    return result.data as T;
  };
  try {
    return await Promise.race([
      operation(),
      new Promise<never>((_resolve, reject) => {
        timer = setTimeout(() => {
          controller.abort();
          reject(timeoutError(failureStatus));
        }, timeoutMs);
      }),
    ]);
  } catch (error) {
    if (controller.signal.aborted) throw timeoutError(failureStatus);
    if (error instanceof TypeError)
      throw Object.assign(new Error(t.serviceNetwork), {
        code: "NETWORK_UNREACHABLE",
      });
    throw error;
  } finally {
    clearTimeout(timer);
  }
}
export async function uploadRecording(
  token: string,
  blob: Blob,
  title: string,
) {
  if (!API) throw new Error("私密服务尚未配置");
  const res = await binaryRequest(
    `/api/recordings?title=${encodeURIComponent(title)}`,
    token,
    blob,
  );
  const json = await res.json();
  if (!res.ok) throw new Error(json.error?.message ?? "录音保存失败");
  return json.data;
}
export async function recordingUrl(token: string, id: string) {
  const res = await binaryRequest(
    `/api/recordings/${encodeURIComponent(id)}`,
    token,
  );
  if (!res.ok) throw new Error("无法读取录音");
  return URL.createObjectURL(await res.blob());
}
