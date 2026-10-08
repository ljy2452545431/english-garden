# 双人英语学习后端

Node.js 24 内置 HTTP、SQLite、密码学模块，无第三方依赖。GitHub Pages 只托管静态前端，不能存放数据库或运行私密 API。本目录须部署到具有持久磁盘的 Node.js 服务器，再由 HTTPS 反向代理对外提供 API。个人博客不需要修改。

## 本地运行

在此目录执行 `node --env-file=.env index.mjs`。先复制 `.env.example` 为 `.env`，只填本项目环境变量。默认监听 `127.0.0.1:8787`；网站的后端地址设置为该地址。生产必须使用 HTTPS API，静态前端中不能放 AI 密钥。

Windows 管理员优先执行 `pwsh -File ./bootstrap-interactive.ps1` 创建两位同学账号，密码用隐藏输入收集，直接通过管道进入 Node.js，不写临时文件或命令历史。脚本会使用同目录 `.env` 的配置。用户名为 3–40 位字母数字或下划线/短横线，密码至少 12 位，昵称 1–40 字。

其他系统可执行 `node --env-file=.env bootstrap.mjs`。此命令从标准输入读取一个 JSON 数组，读到 EOF 后执行；最多两个账号，字段为 `username`、`password`、`displayName`。建议使用管理员的安全密码输入工具直接提供标准输入；请不要把真实密码写入 shell 命令、源码或 Git。若自行通过受限临时文件输入，执行后立即删除。

无公开注册接口。SQLite 触发器也禁止插入第三个账号。新数据库的两个账号请由你们确定，代码没有内置密码。bootstrap 和服务使用同一个 `DB_PATH`。

## 部署要求

需要管理员提供服务器账户及可用的 HTTPS API 域名，不能仅凭 GitHub 仓库完成后端上线。建议服务器反向代理到 `127.0.0.1:8787`，使用进程管理器自动重启，SQLite 放持久盘。`ALLOWED_ORIGINS` 必须精确包含学习网站来源（协议+域名+端口，没有路径），不允许 `*`。生产配置建议仅保留实际来源。`HOST=0.0.0.0` 仅用于已配置网络隔离的容器。

Docker 可在本目录构建 `docker build -t english-garden-api .`。运行示例 `docker run -d --name english-garden-api --restart unless-stopped -p 127.0.0.1:8787:8787 --env-file .env -e HOST=0.0.0.0 -e DB_PATH=/data/garden.sqlite -v english-garden-data:/data english-garden-api`。镜像使用非 root 账户与持久卷；`.env` 只作为服务器上的私密运行配置，不会复制进镜像。反向代理仍需 HTTPS。容器账号创建入口为 `docker exec -i english-garden-api node bootstrap.mjs`，安全提供标准输入，不在命令中拼接密码。若先在本地生成数据库，迁移后必须正确设置卷中数据库文件权限。

限制数据库目录的文件系统权限，只有服务账户可读写。备份应使用 SQLite 在线备份或停服后复制数据库及相关 WAL 文件；不要在活跃写入时只复制主数据库文件。备份与日志不放网站目录，也不提交仓库。没有外部自注册账号，两位已授权同学共享同一空间。

登录令牌 12 小时有效，仅保存 SHA-256 哈希；同账号再次登录使旧令牌失效。前端令牌仅内存保存，刷新后重新登录。密码用随机盐+scrypt 存储；登录计算异步执行。服务端无 cookie 身份验证，所有非公共 API 需要 `Authorization: Bearer <token>`。HTTPS 是生产必需条件。来源限制不是身份验证，真正的权限依赖会话。

## API 契约

响应统一为 `{success:true,data:...,error:null}`，失败为 `{success:false,data:null,error:{code,message}}`。不返回密码、盐、会话哈希或密钥。

| 方法/地址 | 请求 | 返回 data |
|---|---|---|
| GET `/health` | 无 | `{status:"ok"}`，不含敏感信息 |
| POST `/api/login` | `{username,password}` | `{token,user:{id,username,displayName}}` |
| GET `/api/me` | 令牌 | `{id,username,displayName}` |
| POST `/api/logout` | 令牌 | `{loggedOut:true}` |
| GET `/api/state` | 令牌 | `{version,state}` |
| PATCH `/api/state` | `{version,state:{...}}` | `{version,state}`，版本冲突 409 |
| GET `/api/space` | 令牌 | `{users:[{id,displayName,state}],messages:[{id,userId,displayName,text,createdAt}]}` |
| POST `/api/messages` | `{text}` | 新留言，1–1000 字，HTTP 201 |
| POST `/api/ai-feedback` | `{kind:"writing"或"speaking",text,prompt?}` | `{feedback,practiceOnly:true,provider,model}` |
| POST `/api/recordings?title=标题&shared=false` | 原始音频二进制、Content-Type | 新录音元信息，HTTP 201 |
| GET `/api/recordings` | 令牌 | `{recordings:[{id,userId,title,mime,size,shared,createdAt}]}` |
| GET `/api/recordings/:id` | 令牌 | 音频二进制，只允许本人或已共享给同伴 |
| PATCH `/api/recordings/:id` | `{shared:true或false}` | 更新元信息，仅本人 |
| DELETE `/api/recordings/:id` | 令牌 | `{deleted:true}`，仅本人 |

个人状态仅本人读写，两人空间只共享 `state.completed` 学习完成摘要与最近 100 条留言，不返回对方笔记、作文或错题正文。请不要在状态 JSON 中存密码或 API 密钥。服务端保持留言为纯文本，前端必须作为文本渲染，不能直接插入 HTML。

状态 JSON 最大 1 MiB，请求体最大约 1.1 MiB。状态写入版本由数据库原子条件更新；发生 409 时先读最新版本，再由用户决定合并。留言每账号每分钟最多 20 条，通用认证 API 每账号每分钟最多 120 次，登录每来源 IP 每分钟最多 10 次。代理环境默认按连接地址限制登录，对只有两人的部署可用，但共享代理地址会共享此上限；服务不信任任意转发头。

录音上传每分钟 10 次、每条最多 5 MiB、每人最多保存 20 条。支持 `audio/webm`、`audio/ogg`、`audio/mp4`、`audio/mpeg`、`audio/wav`、`audio/x-wav`、`audio/aac`。音频由浏览器录音生成；服务器验证声明的 MIME 并禁止嗅探，不进行语音内容识别或复杂媒体转码。录音默认只有本人可见，用户可手动共享与取消共享。数据库里保留真实二进制，列表不带音频大字段；前端使用带 Bearer 的 fetch 读取二进制后生成 Object URL，不能把令牌放到播放 URL 查询参数里。停止播放或卸载组件应释放 Object URL。取消共享不会收回同伴已经下载到设备里的副本。

## AI 配置

DeepSeek：`AI_PROVIDER=deepseek`、`AI_BASE_URL=https://api.deepseek.com`、`AI_MODEL` 填账户可用模型、`AI_API_KEY` 放服务器环境。官方文档：[首次 API 调用](https://api-docs.deepseek.com/en/)。

MiMo：`AI_PROVIDER=mimo`、`AI_BASE_URL=https://api.xiaomimimo.com/v1`、`AI_MODEL` 填账户可用模型。官方文档：[Chat API](https://mimo.mi.com/docs/en-US/api/chat)。MiMo 请求使用 `api-key` 与 `max_completion_tokens`；DeepSeek 使用 Bearer 与 `max_tokens`。官方 HTTPS 域名白名单，禁止重定向，不允许浏览器指定上游地址。

正文最多 12000 字、题目最多 2000 字，每账号每分钟最多 3 次，整体同时最多 2 次。请求总超时 20 秒，无自动重试，共享 Node.js HTTP 客户端连接池。未配置返回 503，超时 504，上游失败 502，不伪造成功反馈。AI 故障日志只记提供商、错误分类、上游状态、耗时，每 10 秒最多一条，不记录正文、账号密码或密钥。

提交 AI 时，正文与题目会发给你配置的服务商；使用前需同学知情。反馈仅是练习建议，不能代替官方雅思成绩。口语接口只分析转写文本，不提供发音、语音或真实流利度评分。录音保存在自己的服务器，不发给上述文字 AI；语音转写目前由前端平台能力或用户手动输入完成。

## 验证与性能状态

`node --test --experimental-test-coverage tests/api.test.mjs`：真实内存 SQLite SQL 契约、双账号上限、未登录拒绝、状态隔离、乐观并发、会话失效、留言文本边界、CORS、录音二进制与私有/共享/主人删除权限、录音 MIME 与超大拒绝、AI 超时/失败/恢复/限流/全局并发上限。AI 测试使用可控模拟上游，不产生真实费用；不能据此证明提供商可用性或容量。Node.js 24.3 的 `node:sqlite` 仍会显示实验提示。

隔离性能脚本为 `node tests/performance.mjs`。执行前必须由项目确认并设置 `TARGET_TPS`、`TARGET_P95_MS`、`TARGET_P99_MS`、`TARGET_ERROR_RATE`（0–1）、`TEST_CONCURRENCY`、`TEST_SECONDS`，否则脚本拒绝运行。它创建本机临时真实磁盘数据库与测试账号，打印原始延时、业务成功 TPS、P95/P99、错误率和状态码。速率限制仍生效，超过上限的 429 计为失败，不通过绕开限流制造容量结论。

当前验收：本地 API 回归已测；真实 SQL 和并发版本约束已测；生产稳态 TPS/P95/P99、真实数据量、大数据、AI 提供商真实延时与恢复、服务器资源上限、发布后同负载复测均**待验证**。缓存不适用（没有缓存层），PostgreSQL 不适用（采用 SQLite）。未提供目标指标和部署环境，因此不宣称性能通过。上述脚本只覆盖个人状态读，不能替代完整业务及线上容量验收。生产高并发、故障注入及配置变更需用户明确授权。
