# 英语花园 Android

原生 Java 外壳与 AndroidX WebViewAssetLoader，最低 Android 8.0，目标 Android 15。页面和课程音频随 APK 安装；账号登录、双人同步及云端功能仍需要联网。小米手机使用系统 Android WebView，不依赖小米浏览器的朗读 API。

## 重新构建

在项目根目录运行 `pwsh -File scripts/build-android.ps1`。需 JDK 21、Android SDK 35（build-tools 35.0.1）、pnpm。脚本从 Gradle 官方源下载固定版本并校验 SHA256，随后构建网页、复制静态资源、执行 Android release 构建及 lint，并验证签名。

输出位于仓库上一级的 `英语花园-安卓.apk`。签名密钥及 Windows DPAPI 加密密码位于仓库外 `.english-garden-private/android-signing/`。请妥善备份密钥与密码；后续覆盖安装必须使用相同签名，不可提交至仓库。DPAPI 密码文件仅当前 Windows 用户可解密。

## 安全边界

- 仅 `/english-garden/` 使用 APK 内资源，同正式网站 HTTPS origin；不读取任意本机文件。
- 无 JavaScript bridge，不允许 HTTP 混合内容，不忽略证书错误。
- 麦克风权限只在可信页面请求录音时申请，只授予音频捕获权限。
- 图片选择使用系统文档选择器，不申请相册全量访问权限。
- 外部链接交给系统浏览器；HTTPS 下载交给浏览器。站内 Blob 图片、录音、JSON 导出通过系统保存对话框落盘，单文件上限 20 MB，不申请全盘写入权限。
- 应用关闭会停止 WebView；登录策略保持网站本身的内存会话策略。

官方参考：[加载应用内内容](https://developer.android.com/develop/ui/views/layout/webapps/load-local-content?hl=zh-CN)、[AGP 与 Gradle 兼容性](https://developer.android.com/build/releases/about-agp)。
