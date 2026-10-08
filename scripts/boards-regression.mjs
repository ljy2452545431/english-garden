/** 两个既有账号低频业务验收；临时作品/图片清理，不输出凭据。 */
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
const credentials = await readFile(
  new URL("../../.english-garden-private/账号信息.txt", import.meta.url),
  "utf8",
);
const accounts = [
  ...credentials.matchAll(/账号：([^\r\n]+)\r?\n密码：([^\r\n]+)/g),
].map((match) => ({ username: match[1], password: match[2] }));
const sessions = [],
  timings = [];
let boardId, assetId;
async function call(path, body, token, method = body ? "POST" : "GET") {
  const start = performance.now(),
    binary = body instanceof Uint8Array;
  const response = await fetch(config.VITE_API_URL + path, {
    method,
    headers: {
      apikey: config.VITE_API_PUBLIC_KEY,
      ...(token ? { authorization: `Bearer ${token}` } : {}),
      ...(body
        ? { "content-type": binary ? "image/png" : "application/json" }
        : {}),
    },
    ...(body ? { body: binary ? body : JSON.stringify(body) } : {}),
    signal: AbortSignal.timeout(25000),
  });
  const data = response.headers.get("content-type")?.startsWith("image/")
    ? new Uint8Array(await response.arrayBuffer())
    : await response.json();
  timings.push({
    path: path.replace(/\/[a-f\d-]{36}$/i, "/:id"),
    method,
    status: response.status,
    ms: Math.round(performance.now() - start),
  });
  return {
    status: response.status,
    data: data instanceof Uint8Array ? data : data.data,
  };
}
const image = Uint8Array.from(
  Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+j0ioAAAAASUVORK5CYII=",
    "base64",
  ),
);
try {
  for (const account of accounts) {
    const result = await call("/api/login", account);
    assert.equal(result.status, 200);
    sessions.push(result.data);
  }
  const [a, b] = sessions;
  assert.equal((await call("/api/boards")).status, 401);
  const upload = await call("/api/board-assets", image, a.token);
  assert.equal(upload.status, 201);
  assetId = upload.data.asset.id;
  const node = {
    id: crypto.randomUUID(),
    kind: "image",
    x: 10,
    y: 10,
    width: 120,
    height: 120,
    rotation: 0,
    fill: "transparent",
    color: "#283443",
    fontSize: 24,
    text: "",
    assetId: assetId.toUpperCase(),
    points: [],
  };
  const document = {
    schema: 1,
    width: 1600,
    height: 1000,
    background: "#FFFFFF",
    nodes: [node],
  };
  const saved = await call(
    "/api/boards",
    { title: "临时画布验收", document },
    a.token,
  );
  assert.equal(saved.status, 201);
  boardId = saved.data.board.id;
  const loaded = await call(`/api/boards/${boardId}`, undefined, b.token);
  assert.deepEqual(loaded.data.board.document, document);
  const read = await call(`/api/board-assets/${assetId}`, undefined, b.token);
  assert.equal(read.status, 200);
  assert.deepEqual(read.data, image);
  const edited = await call(
    `/api/boards/${boardId}`,
    {
      title: "临时画布验收",
      version: loaded.data.board.version,
      document: { ...document, background: "#E8DDD3" },
    },
    b.token,
    "PATCH",
  );
  assert.equal(edited.status, 200);
  assert.equal(
    (
      await call(
        `/api/boards/${boardId}`,
        { title: "临时画布验收", version: saved.data.board.version, document },
        a.token,
        "PATCH",
      )
    ).status,
    409,
  );
  assert.equal(
    (await call(`/api/boards/${boardId}`, undefined, b.token, "DELETE")).status,
    403,
  );
  assert.equal(
    (await call(`/api/board-assets/${assetId}`, undefined, b.token, "DELETE"))
      .status,
    403,
  );
  assert.equal(
    (await call(`/api/board-assets/${assetId}`, undefined, a.token, "DELETE"))
      .status,
    409,
  );
  const assets = await call("/api/board-assets", undefined, a.token);
  assert.ok(assets.data.assets.some((asset) => asset.id === assetId));
  const partnerAssets = await call("/api/board-assets", undefined, b.token);
  assert.ok(!partnerAssets.data.assets.some((asset) => asset.id === assetId));
  for (const session of sessions) {
    const state = await call("/api/state", undefined, session.token);
    assert.equal(state.data.version, session.learning.version);
    assert.equal(
      JSON.stringify(state.data.state) ===
        JSON.stringify(session.learning.state),
      true,
      "学习记录应保持不变，不输出正文",
    );
  }
} finally {
  if (boardId)
    assert.equal(
      (
        await call(
          `/api/boards/${boardId}`,
          undefined,
          sessions[0].token,
          "DELETE",
        )
      ).status,
      200,
    );
  if (assetId)
    assert.equal(
      (
        await call(
          `/api/board-assets/${assetId}`,
          undefined,
          sessions[0].token,
          "DELETE",
        )
      ).status,
      200,
    );
  for (const session of sessions) await call("/api/logout", {}, session.token);
}
await writeFile(
  new URL("../docs/boards-regression.json", import.meta.url),
  JSON.stringify(
    {
      time: new Date().toISOString(),
      scope: "两账号低频业务/权限验证；非容量与P95/P99验收",
      crossUserRead: true,
      versionConflict: true,
      uppercaseReferenceProtected: true,
      ownerDeletionOnly: true,
      unchangedLearningState: true,
      temporaryDataRemoved: true,
      timings,
    },
    null,
    2,
  ),
);
console.log(
  JSON.stringify({
    crossUserRead: true,
    versionConflict: true,
    uppercaseReferenceProtected: true,
    ownerDeletionOnly: true,
    temporaryDataRemoved: true,
    requests: timings.length,
  }),
);
