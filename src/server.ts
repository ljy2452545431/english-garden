import { zh as t } from "./i18n/zh";
import { serviceBase } from "./utils/service-route";
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
export async function request<T>(
  path: string,
  token?: string,
  body?: unknown,
  method?: string,
  options: { timeoutMs?: number } = {},
): Promise<T> {
  if (!API) throw new Error("私密服务尚未配置");
  const controller = new AbortController();
  const timeout = setTimeout(
    () => controller.abort(),
    options.timeoutMs ?? 25000,
  );
  try {
    const res = await fetch(`${serviceBase()}${path}`, {
      method: method ?? (body ? "POST" : "GET"),
      headers: {
        ...(body ? { "Content-Type": "application/json" } : {}),
        ...(publicKey ? { apikey: publicKey } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
      signal: controller.signal,
      redirect: "error",
    });
    let result;
    try {
      result = await res.json();
    } catch (cause) {
      if (cause instanceof TypeError) throw cause;
      throw Object.assign(new Error(t.serviceInvalid), {
        code: "INVALID_RESPONSE",
      });
    }
    if (!res.ok || !result.success)
      throw Object.assign(
        new Error(result.error?.message ?? "服务暂时不可用"),
        { status: res.status, code: result.error?.code },
      );
    return result.data as T;
  } catch (error) {
    if (controller.signal.aborted)
      throw Object.assign(new Error(t.serviceTimeout), {
        code: "SERVICE_TIMEOUT",
      });
    if (error instanceof TypeError)
      throw Object.assign(new Error(t.serviceNetwork), {
        code: "NETWORK_UNREACHABLE",
      });
    throw error;
  } finally {
    clearTimeout(timeout);
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
