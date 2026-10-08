# 英语花园 · 两个人的 48 周学习网站

为每天至少学习 1 小时的两位英语初学者设计：把 48 周、336 天的计划、原创周课程、练习、学习记录和搭档互动放在一个适合手机使用的网站里，也适配电脑。以雅思学术类总分 6.0、单科 5.5 为暂定参考目标；是否报名取决于实际能力，不保证按时长完成就取得目标分。

学习网站采用**独立仓库 `english-garden`**，发布到 `https://ljy2452545431.github.io/english-garden/`。它不覆盖 `ljy2452545431.github.io` 个人博客仓库，也不替换博客首页或部署流程。

## 日常怎么使用

1. 用手机浏览器打开网站，登录各自账号 **ljy / jfl**。密码由管理员单独交给本人，源码不包含密码。刷新页面后重新登录。
2. 设置计划开始日期，进入“今日学习”。每天建议词汇 10 分钟、主任务 30 分钟、双人口语 15 分钟、复盘 5 分钟，查看任务和完成标准后再打卡。
3. 进入学习课堂，在站内做词卡复习、阅读与听辨练习、语法题、写作草稿和口语任务。可使用计时器、单词游戏和阶段综合测验。
4. 两人空间查看搭档完成天数，发送真实留言。个人笔记和作文只保存在本人状态里，搭档空间仅共享完成摘要。
5. 口语录音先回听，需要跨设备保存时上传云端。默认仅本人可见，可以手动共享或取消共享，只有本人能删除。
6. 在外观设置选花园、奶油、玫瑰、海洋、夜间五种主题，调整卡片顺序、留白、文字大小和动画。按个人喜欢选择，无需按性别限定配色。主题与布局保存在当前设备，不改变搭档的页面。

麦克风需要 HTTPS 和浏览器授权；浏览器不支持录音或语音合成时会提示。系统合成朗读声音取决于手机或电脑安装的语音，不是官方雅思听力音频。建议两人每天实际对话，交替提问、回答和反馈，避免只看文字打卡。

## 内容与评分边界

- 336 条每日计划对应 48 份原创周学习包，每周包含词汇、语法、阅读、听力脚本、口语与写作提示，可用于多日学习和复盘；**不是 336 套不同试卷**。
- 客观题自动判对错、保存练习记录，只统计练习正确率，不换算为雅思总分或单科分数。
- 后期 IELTS-style 微练习不是完整雅思考试：篇幅、题量、计时和难度不代表官方真题或完整模考。
- 站内课程、词卡、计时、录音和基础练习可以直接完成；正版完整题册、官方样题和报名保留官方入口。没有复制 Cambridge 付费试卷，也不把第三方课程冒充本站内容。因此“所有正式资料永远无需外部入口”目前不能实现。
- 完整模考需要连续学习时间与合法材料，不应拆成每天一小时后仍当作有效全真成绩。两人各自达到目标后再考虑报名。

内容来源与限制详见 [课程元信息](src/data/content-metadata.json)。

## 私密数据和 AI

GitHub Pages 托管公开的静态页面和原创课程，私密学习记录由 Supabase Auth、PostgreSQL 与私有 Storage 保存。最多两个白名单成员，无公开注册；未登录、非成员、已退出令牌均不能经 garden API 读取私密数据。数据库不允许浏览器直接通过 PostgREST 读写，全部数据请求经过服务端验证。

用户令牌仅保存在页面内存；个人学习记录可以导出备份，恢复前先导出现有数据。每人学习状态上限 1 MiB，云录音每人最多 20 条、单条最多 5 MiB。两人共享已下载的录音副本无法通过取消共享追回。密码、AI 密钥、service_role 和真实令牌不提交仓库。

AI 目前可接入 DeepSeek 或 MiMo，密钥只在 Supabase Secrets 或 Node 后端环境配置。未配置时明确显示未启用，其他课程照常可用。发送分析会把题目和正文交给配置的 AI 服务商；不要提交密码等敏感信息。每账号每分钟最多 3 次、整体最多并发 2 次，20 秒超时、没有自动重试。

AI 仅提供练习纠错、建议和鼓励，不是官方雅思成绩。口语只分析用户输入的转写文本，**不评价真实发音或流利度**，录音不会发送给文字 AI。免费 Supabase 额度不意味着 AI 调用免费。

## 本地启动

需要 Node.js 24 与 pnpm 10：

```text
pnpm install --frozen-lockfile
pnpm dev
```

打开开发命令显示的地址（网站 base 路径为 `/english-garden/`）。未配置后端时可以体验站内课程，跨设备同步、真实双人留言和云录音需要后端。

复制根 `.env.example` 为不提交的 `.env.local`，填公开配置：

```text
VITE_API_URL=https://你的项目编号.supabase.co/functions/v1/garden
VITE_API_PUBLIC_KEY=publishable或legacy anon公钥
```

这两个值会进入网页构建产物，不能填写 AI 密钥或 service_role。本地 Node 后端也可用，参见 [Node 后端说明](server/README.md)；免费云端推荐参见 [Supabase 完整部署步骤](supabase/README.md)。

## 发布到 GitHub Pages

在独立 `english-garden` 仓库的 Settings → Pages 选择 Source: GitHub Actions，不在博客仓库设置这个工作流。Settings → Secrets and variables → Actions → Variables 添加 `VITE_API_URL`、`VITE_API_PUBLIC_KEY`，它们是公开构建配置；AI 密钥只放后端 Secrets。

推送 main 或手动执行 [发布工作流](.github/workflows/deploy.yml)，流程会使用 pnpm 10、Node 24 和锁文件安装依赖，执行前端覆盖率测试、SQLite API 测试、Supabase HTTP 契约测试及类型检查，成功构建 `dist` 后发布独立项目 Pages。PR 只检查与构建，不发布。构建 job 只读取 Pages 配置，Pages 写权限仅授予发布 job。生产发布前 API URL 必须为 HTTPS。

Supabase 的 SQL、两位 Auth 用户、members 白名单、禁注册、ALLOWED_ORIGINS 和 `garden` 函数需按 [部署文档](supabase/README.md) 配置；`verify_jwt=false` 只关闭网关预检，函数内部必须保留真实 Auth 和成员验证。改变后端代码后需重新部署函数，前端 Actions 不会自动更改数据库或后端 Secrets。

Supabase Free 适合起步，但有额度、闲置暂停及可用性限制，不保证无限量或一直在线。[官方配额](https://supabase.com/pricing)。不要自行升级付费、生产压测或故障注入。

## 检查与已知限制

```text
pnpm test:coverage
pnpm build
node --test --experimental-test-coverage server/tests/api.test.mjs
node --experimental-strip-types --test --experimental-test-coverage supabase/tests/adapter.test.mjs
```

前端覆盖率门槛目前只统计 `src/utils` 学习逻辑，**不是全应用 80% 覆盖率**；组件交互和真实手机浏览器需要另行验收。Supabase adapter 的本地测试模拟上游 HTTP，不能替代真实 SQL、RLS 和 Storage 证据。已有真实双账号回归范围与容量待验证事项见 [验收记录](docs/validation.md)。

目前未配置 AI 时没有真实 AI 成功调用证据；语音合成不是全真听力，原创练习不能证明正式雅思分数；未完成目标负载容量验收，不宣称性能达标。
