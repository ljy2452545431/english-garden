/** 两个既有账号低频验证；临时搭配最终删除，不输出密码、令牌或学习正文。 */
import { readFile, writeFile } from "node:fs/promises";
import assert from "node:assert/strict";
const config = Object.fromEntries(
  (await readFile(new URL("../.env.local", import.meta.url), "utf8"))
    .trim()
    .split(/\r?\n/)
    .map((line) => {
      const index = line.indexOf("=");
      return [line.slice(0, index), line.slice(index + 1)];
    }),
);
const text = await readFile(
  new URL("../../.english-garden-private/账号信息.txt", import.meta.url),
  "utf8",
);
const accounts = [
  ...text.matchAll(/账号：([^\r\n]+)\r?\n密码：([^\r\n]+)/g),
].map((match) => ({ username: match[1], password: match[2] }));
assert.equal(accounts.length, 2);
const sessions = [],
  created = [],
  timings = [];
async function call(path, body, token, method = body ? "POST" : "GET") {
  const start = performance.now();
  const response = await fetch(config.VITE_API_URL + path, {
    method,
    headers: {
      apikey: config.VITE_API_PUBLIC_KEY,
      ...(token ? { authorization: `Bearer ${token}` } : {}),
      ...(body ? { "content-type": "application/json" } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
    signal: AbortSignal.timeout(20000),
  });
  const result = await response.json();
  timings.push({
    path: path.startsWith("/api/looks/") ? "/api/looks/:id" : path,
    method,
    status: response.status,
    ms: Math.round(performance.now() - start),
  });
  return { status: response.status, data: result.data };
}
const appearance = {
  theme: "rose",
  density: "comfortable",
  font: "normal",
  motion: "low",
  order: ["note", "tasks", "timer", "growth"],
  hidden: ["timer"],
  card: "outlined",
  texture: "dots",
  corners: "rounded",
  accent: "berry",
  layout: "focus",
  decorations: [
    { id: crypto.randomUUID(), kind: "heart", x: 0.35, y: 0.5, rotation: 12 },
  ],
};
try {
  for (const account of accounts) {
    const login = await call("/api/login", account);
    assert.equal(login.status, 200);
    assert.ok(login.data.token);
    sessions.push(login.data);
  }
  assert.equal((await call("/api/looks")).status, 401);
  for (let i = 0; i < 2; i++) {
    const saved = await call(
      "/api/looks",
      { name: "临时共享验收", appearance },
      sessions[i].token,
    );
    assert.equal(saved.status, 201);
    created.push({ id: saved.data.look.id, owner: i });
    const read = await call("/api/looks", undefined, sessions[1 - i].token);
    assert.equal(read.status, 200);
    const found = read.data.looks.find(
      (look) => look.id === saved.data.look.id,
    );
    assert.ok(found);
    assert.deepEqual(found.appearance, appearance);
    assert.equal(found.userId, sessions[i].user.id);
    assert.equal(
      (
        await call(
          "/api/looks/" + found.id,
          undefined,
          sessions[1 - i].token,
          "DELETE",
        )
      ).status,
      403,
    );
  }
  assert.equal(
    (
      await call(
        "/api/looks",
        { name: "invalid", appearance: { ...appearance, hidden: ["tasks"] } },
        sessions[0].token,
      )
    ).status,
    400,
  );
  for (const item of created) {
    assert.equal(
      (
        await call(
          "/api/looks/" + item.id,
          undefined,
          sessions[item.owner].token,
          "DELETE",
        )
      ).status,
      200,
    );
  }
  for (const session of sessions) {
    const read = await call("/api/looks", undefined, session.token);
    assert.ok(
      created.every(
        (item) => !read.data.looks.some((look) => look.id === item.id),
      ),
    );
    const state = await call("/api/state", undefined, session.token);
    assert.equal(state.data.version, session.learning.version);
    assert.deepEqual(state.data.state, session.learning.state);
  }
} finally {
  for (const item of created) {
    await call(
      "/api/looks/" + item.id,
      undefined,
      sessions[item.owner].token,
      "DELETE",
    );
  }
  for (const session of sessions) {
    assert.equal((await call("/api/logout", {}, session.token)).status, 200);
    assert.equal(
      (await call("/api/looks", undefined, session.token)).status,
      401,
    );
  }
}
const report = {
  time: new Date().toISOString(),
  scope: "两账号顺序低频真实业务验证，临时搭配清理；不是容量或P95/P99验收",
  crossUserRead: true,
  authorDeleteOnly: true,
  invalidAppearanceDenied: true,
  unchangedLearningState: true,
  logoutRevoked: true,
  timings,
};
await writeFile(
  new URL("../docs/shared-looks-regression.json", import.meta.url),
  JSON.stringify(report, null, 2),
);
console.log(
  JSON.stringify({
    crossUserRead: true,
    authorDeleteOnly: true,
    unchangedLearningState: true,
    logoutRevoked: true,
    requests: timings.length,
  }),
);
