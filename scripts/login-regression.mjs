/** 已授权两账号低频登录回归。只读取记录，退出会话；绝不输出密码、令牌或私人正文。 */
import { readFile, writeFile } from 'node:fs/promises';
import { performance } from 'node:perf_hooks';
const config = Object.fromEntries((await readFile(new URL('../.env.local', import.meta.url), 'utf8')).trim().split(/\r?\n/).map(line => {
  const separator = line.indexOf('='); return [line.slice(0, separator), line.slice(separator + 1)];
}));
const credentials = await readFile(new URL('../../.english-garden-private/账号信息.txt', import.meta.url), 'utf8');
const accounts = [...credentials.matchAll(/账号：([^\r\n]+)\r?\n密码：([^\r\n]+)/g)].map(match => ({ username: match[1], password: match[2] }));
if (accounts.length !== 2) throw new Error('需要指定的两个测试账号');
const samples = [];
async function call(path, body, token) {
  const started = performance.now();
  const response = await fetch(config.VITE_API_URL + path, {
    method: body ? 'POST' : 'GET',
    headers: { apikey: config.VITE_API_PUBLIC_KEY, ...(body ? { 'content-type': 'application/json' } : {}), ...(token ? { authorization: `Bearer ${token}` } : {}) },
    ...(body ? { body: JSON.stringify(body) } : {}), signal: AbortSignal.timeout(15000),
  });
  const result = await response.json();
  return { ms: Math.round(performance.now() - started), status: response.status, result };
}
for (let round = 1; round <= 2; round++) for (const account of accounts) {
  let token;
  try {
    const login = await call('/api/login', account);
    token = login.result.data?.token;
    const data = login.result.data;
    if (login.status !== 200 || !login.result.success || data?.user?.username !== account.username || !token || !Number.isSafeInteger(data.learning?.version) || !data.learning.state) throw new Error('合并登录业务断言未通过');
    const state = await call('/api/state', undefined, token);
    if (state.status !== 200 || state.result.data.version !== data.learning.version || JSON.stringify(state.result.data.state) !== JSON.stringify(data.learning.state)) throw new Error('登录记录与真实数据库读取不一致');
    samples.push({ user: account.username, round, loginAndStateMs: login.ms, businessSuccess: true, matchingDatabaseState: true });
    console.log(JSON.stringify(samples.at(-1)));
  } finally {
    if (token) {
      if ((await call('/api/logout', {}, token)).status !== 200) throw new Error('退出失败');
      if ((await call('/api/me', undefined, token)).status !== 401) throw new Error('退出后令牌未失效');
    }
  }
}
const report = { time: new Date().toISOString(), scope: '两账号串行小样本，真实登录与数据库读取；不作为容量/P95/P99达标证明', samples, logoutRevocationVerified: true };
await writeFile(new URL('../docs/login-regression-result.json', import.meta.url), JSON.stringify(report, null, 2));
