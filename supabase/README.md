# 不买服务器：用 Supabase Free 托管两人学习空间

GitHub Pages 保留现有个人博客，学习网站以独立路径发布。Supabase 为学习网站提供登录、PostgreSQL、私有录音存储与 Edge Function；你们日常只打开学习网站，不需要打开数据库后台或安装软件。

截至 2026-10-08，Supabase Free 官方配额包含每项目 500 MB 数据库及 1 GB 文件存储，足够作为两人学习空间的起步方案；免费项目有用量、暂停及服务限制，不承诺永久配额或一直在线。AI 提供商费用另计，未配置 AI 时其余学习功能继续可用。[官方价格](https://supabase.com/pricing)、[官方账单说明](https://supabase.com/docs/guides/platform/billing-on-supabase)。本项目自身把录音限制为每人 20 条、每条 5 MiB，两人最多约 200 MiB。

## 一次性部署：推荐网页控制台操作

### 1. 创建免费项目

打开 [Supabase Dashboard](https://supabase.com/dashboard)，注册登录并创建 Organization，选择 **Free**，然后 New project。输入项目名（如 english-garden），设置数据库管理员密码并保存到密码管理器，选择可用且适合你们网络的区域。无需填写服务器 IP，也不要为了此项目启用付费升级。创建完成后记下 Project URL（`https://项目编号.supabase.co`）。数据库管理员密码不会填到学习网站。

### 2. 建表与私有录音桶

项目左侧 SQL Editor → New query，把本目录 `migrations/202610080001_garden.sql` 全部粘贴并运行一次。它创建成员白名单、个人状态、留言、录音元信息、原子限流与 AI 并发租约，并创建 `garden-recordings` 私有桶。

请在**全新的专用 Supabase 项目**执行，脚本没有删除或覆盖既有项目数据。迁移不是重复执行脚本；二次运行遇到“已存在”时不要删表重来，应先确认首次执行结果。需要迁移现有项目时单独审查冲突和备份。

Storage 中确认 `garden-recordings` 的 Public 为关闭。**不要**为这个桶添加允许 anon 或 authenticated 直接上传/下载的 storage.objects 策略；只有服务端验证权限后使用 service_role 访问，浏览器不能绕过双人权限。

### 3. 只创建你们两人的账号

Authentication → Users → Add user → Create new user，为你和朋友分别创建邮箱+密码账号。选择自动确认邮箱（Auto Confirm User），避免没有配置邮件服务时无法登录。密码至少 12 位，分别发送给本人，不填到 GitHub 或 SQL 脚本。

在 Authentication 的 General configuration / Sign In settings 中关闭 **Allow new users to sign up**，保留 Email 登录开启。不启用 Anonymous Sign-Ins，也不启用其他 OAuth 注册入口。[官方配置说明](https://supabase.com/docs/guides/auth/general-configuration)。本网站没有注册入口，但必须关闭 Auth 自身的开放注册。

复制两条用户记录的 UUID，在 SQL Editor 执行以下结构（将占位 UUID 换成真正 UUID，昵称可自行修改）:

```sql
insert into public.members(id,display_name) values
('你的 Auth 用户 UUID','我的昵称'),
('朋友的 Auth 用户 UUID','朋友的昵称');
```

这里没有密码，UUID 不是登录凭据。成员插入后自动初始化个人状态。数据库触发器最多允许两个成员，支持并发检查；Auth 中即使误建第三个账号，没有 members 白名单也不能打开两人学习数据。

### 4. 设置后端 Secrets

Edge Functions → Secrets 添加 `ALLOWED_ORIGINS`：

```text
https://ljy2452545431.github.io,http://localhost:5173,http://127.0.0.1:5173
```

生产稳定后可移除 localhost，只留网站真正来源。来源是协议+域名+端口，**没有** `/english-garden` 等路径，不能填 `*`。

Supabase 默认给 Edge Function 注入 `SUPABASE_URL`、`SUPABASE_ANON_KEY`、`SUPABASE_SERVICE_ROLE_KEY`，无需重新手工创建同名保留变量。[官方环境变量说明](https://supabase.com/docs/guides/functions/secrets)。service_role 仅在函数内部使用，不分享、不发聊天、不放网页、不提交 GitHub。关键变量缺失时函数返回 503，拒绝提供私密接口。

AI 暂时不需要时跳过。使用 DeepSeek 时添加 `AI_PROVIDER=deepseek`、`AI_BASE_URL=https://api.deepseek.com`、`AI_MODEL=你账户实际可用模型名` 和 `AI_API_KEY=你的服务端密钥`。使用 MiMo 时添加 `AI_PROVIDER=mimo`、`AI_BASE_URL=https://api.xiaomimimo.com/v1`、相应模型名和密钥。必须在 **Secrets 控制台**填写，不要把真实密钥写进 SQL 或部署命令历史。[DeepSeek 文档](https://api-docs.deepseek.com/en/)、[MiMo 文档](https://mimo.mi.com/docs/en-US/api/chat)。

### 5. 发布 garden 函数

Edge Functions → Deploy a new function → Via Editor，函数名称必须是 `garden`。打开本目录 `dashboard/garden.ts`，把整个文件内容粘贴到编辑器的 index.ts，发布。该文件是仓库源码自动合并后的单文件，网页编辑器无需配置多文件导入。后续修改源码后执行 `node supabase/scripts/build-dashboard.mjs` 重新生成；直接修改单文件会在下次生成时覆盖。[官方网页部署指南](https://supabase.com/docs/guides/functions/quickstart-dashboard)。

函数设置中关闭 **Enforce JWT Verification / Verify JWT**，与 `config.toml` 的 `verify_jwt=false` 一致。原因是 `/api/login` 尚无用户 JWT，必须先能登录；本函数对全部私密接口亲自调用 Auth 的 user endpoint 验证令牌，并查询成员白名单，不能删掉这些校验。公开接口只有 `/health` 和 `/api/login`。[官方函数身份验证文档](https://supabase.com/docs/guides/functions/auth)。

完成后 API 根地址为：

```text
https://你的项目编号.supabase.co/functions/v1/garden
```

### 6. 配置学习网站并重新构建

Project Settings → API Keys 获取 **Publishable key** 或 legacy **anon** key，它允许公开放在浏览器中。网站前端配置：

```text
VITE_API_URL=https://你的项目编号.supabase.co/functions/v1/garden
VITE_API_PUBLIC_KEY=你的publishable或anon公钥
```

不要填写 secret 或 service_role。前端每次请求带 `apikey` 公开项目键，登录后再带 `Authorization: Bearer 用户令牌`。约定两位用户名为 **ljy / jfl**，对应管理员在 Auth 中创建并自动确认的 `ljy@english-garden.local` / `jfl@english-garden.local`；登录时直接输入短用户名，不需要输入该内部邮箱。完整邮箱账号仍可登录，但必须在 members 中获得授权。令牌仅在内存保留，刷新页面后重新登录。修改构建变量后重新构建和发布，不能只在已发布页面改文件就期待变量生效。[官方请求头说明](https://supabase.com/docs/guides/functions/auth-headers)。

如果使用 GitHub Actions，可把 VITE_API_URL 与 VITE_API_PUBLIC_KEY 放学习网站仓库的 Actions variables；AI 密钥仍只放 Supabase Secrets。博客仓库的部署配置无需为此后端改变。

### 7. 部署后实际验收

用你们两人的手机分别登录。先保存打卡，刷新重新登录，确认记录仍在；用另一人确认只看到同伴完成天数，没有私人笔记正文。互相发留言，确认显示正确昵称。上传一条短录音，默认同伴看不到；手动共享后同伴可播放；取消共享后不能再次下载；只有本人能删除。

登录前访问 `/api/state` 应为 401；没有 members 的账号应为 403；来源不在白名单的浏览器请求应为 403。未配置 AI 应为明确 503，而不是虚假鼓励内容。配置 AI 后先用不含隐私的短文做一次真实调用，核查消费与反馈。音频不发给文字 AI；正文和题目会发给配置的 AI 服务商，需要同学知情。

以上步骤在真实 Supabase 账号未提供、未部署之前均为待验证。本项目不会凭离线测试宣布云端已经可用。不要把两人的邮箱、密码、token 或 service_role 截图发到公开仓库。

## CLI 部署（可选）

在项目根目录使用 Supabase CLI 登录并关联项目，然后部署：

```text
supabase login
supabase link --project-ref 你的项目编号
supabase functions deploy garden --no-verify-jwt
```

SQL 仍可通过 Dashboard 执行。已有数据库应先 review 再推迁移，避免不清楚的 `db push` 改动。部署账号凭据通过 CLI 官方登录获取，密钥通过 Dashboard Secrets 设置。

## 兼容接口与隐私边界

接口与 `server/README.md` 的 Node API 一致；Supabase 账号 ID 为 UUID、录音 ID 为 UUID，登录支持指定短用户名 ljy / jfl 或完整邮箱，内部邮箱返回 user.username 时显示短用户名。`GET /api/space` 中每个 `user.state` **仅包含 completed 摘要**，不返回个人笔记、写作正文或错题内容。`GET /api/state` 只读本人，`PATCH` 只写本人、乐观版本冲突 409。消息纯文本渲染，不能插入 HTML。

状态上限 1 MiB（SQL 根据 jsonb 标准化文本字节数检查），请求体约 1.1 MiB。PostgreSQL 空条件不通过猜类型处理，RPC 使用确定的 uuid/bigint/jsonb 参数；状态更新必须同时匹配成员 ID 与 version。数据库对 anon、authenticated 均无直接读写授权，启用 RLS 且不创建允许策略；全部数据只通过经过 Auth、成员白名单和令牌撤销校验的 garden API 访问，避免旧 JWT 绕过登出校验直连 PostgREST。

录音保存在私有 Storage，元信息不含播放 URL 或 token，读取经函数认证后直接返回二进制。每条 5 MiB、每人 20 条，创建配额由数据库事务锁保证；前端授权 fetch → Blob → Object URL 播放。取消共享不能收回同伴此前已经下载的副本。上传失败可能发生在 Storage 已提交但响应丢失之后，因此先删除对象，确认清理成功后才删除元信息。清理失败时保留元信息、继续计入20条配额，用户可在录音列表重试删除；不会把已提交对象变成不计配额的隐形文件。函数在上传中被强制中止时同样保留已有预留记录，管理员可对照 recordings 与 Storage 恢复或清理，不能清理正在上传的录音。

每账号通用 API 每分钟 120 次、留言 20 次、上传录音 10 次。AI 每账号每分钟 3 次、全项目最多同时两次，预算与租约由数据库原子 RPC 跨实例管理，45 秒租约用于崩溃回收。AI 总请求超时 20 秒、不重试；HTTP 上游禁止重定向，官方域名白名单。Supabase 单次依赖请求最多 8 秒，总函数逻辑预算 45 秒（AI 自身 20 秒），不依赖捕获错误来伪造成功。

Auth 退出后将本次令牌哈希加入撤销表，再调用 Supabase logout；退出记录最多保留两天，因此项目 JWT 有效期请保持默认 1 小时，不设超过 48 小时的会话访问令牌。函数不发给浏览器 refresh_token，刷新后要求重新登录。不要把用户令牌写 localStorage。

## 本地测试和验收状态

Node.js 24 可在项目根执行 `node --experimental-strip-types --test supabase/tests/adapter.test.mjs`。测试检查 Auth/membership 验证调用、跨用户过滤、摘要隐私、409/CORS/文本边界、Storage 二进制权限、AI 预算调用/超时释放/无重试、缺配置拒绝。它使用可控模拟 Supabase HTTP 端点，**不能证明真实 PostgreSQL SQL 已执行、RLS 已生效、Storage 已部署或 Supabase 的容量**。

SQL 契约、RLS、跨实例租约竞争、真实身份全流程、数据持久化、手机网络实际延时及 AI 提供商均须在真实或隔离 Supabase/PostgreSQL 环境复测。目标业务成功 TPS、P95/P99、错误率、并发与持续时间尚未确认，因此性能状态为 **待验证**；没有通过结论。生产高并发或故障注入必须得到明确授权，不用免费项目做未经许可的压测。

请在 Supabase 用量页观察数据库、Storage、函数调用和流量额度；免费项目可能在闲置后暂停，恢复需要控制台处理。[官方用量和计费说明](https://supabase.com/docs/guides/platform/billing-on-supabase)。如果不希望免费暂停，可再讨论付费方案，不自动启用升级。
