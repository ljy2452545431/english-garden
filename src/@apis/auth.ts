import { request, prepareServiceConnection, type User } from "@/server";
import { zh as t } from "../i18n/zh";
export interface LoginSession {
  token: string;
  user: User;
  learning?: { version: number; state: unknown };
}
const LOGIN_BUDGET_MS = 15000;

/** 新服务一次返回身份和学习记录；旧服务共用同一超时预算兼容读取。 */
export async function loginAndLoad(username: string, password: string) {
  const started = Date.now();
  await prepareServiceConnection(3000);
  const loginRemaining = LOGIN_BUDGET_MS - (Date.now() - started);
  if (loginRemaining <= 0) throw new Error(t.serviceTimeout);
  const session = await request<LoginSession>(
    "/api/login",
    undefined,
    { username, password },
    "POST",
    { timeoutMs: loginRemaining },
  );
  if (!session?.token || !session.user?.id)
    throw new Error(t.loginStateInvalid);
  const remaining = LOGIN_BUDGET_MS - (Date.now() - started);
  if (remaining <= 0) throw new Error(t.serviceTimeout);
  const learning =
    session.learning ??
    (await request<{ version: number; state: unknown }>(
      "/api/state",
      session.token,
      undefined,
      "GET",
      { timeoutMs: remaining },
    ));
  if (
    !session.token ||
    !session.user?.id ||
    !learning ||
    !Number.isSafeInteger(learning.version) ||
    learning.version < 0 ||
    !learning.state ||
    typeof learning.state !== "object" ||
    Array.isArray(learning.state)
  ) {
    throw new Error(t.loginStateInvalid);
  }
  return { ...session, learning };
}
