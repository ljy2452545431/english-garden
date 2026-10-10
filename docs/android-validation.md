# Android 1.0.0 验证记录

日期：2026-10-10（Asia/Shanghai）。包名 `cn.englishgarden.app`，versionCode 1，最低API26，target/compile API35。原生Java外壳，WebViewAssetLoader只加载本站路径内置内容。

## 已通过

- JDK21 / Gradle8.11.1 / AGP8.9.2真实release编译及lint：0 errors；2条warning分别为可更新依赖及已审查的JavaScript开启。
- APK v2签名验证成功，单一签名者，release关闭WebView调试；密钥、密码均在仓库外。
- 独立aapt检查包名、版本、最低系统及权限：仅INTERNET、RECORD_AUDIO，无相册或全盘存储权限。
- ZIP检查414份内置MP3、当前网页入口JS `index-tNOUmRm4.js`；无.env/密码/签名密钥路径。
- 代码复审：HTTPS origin/path限制、SSL错误拒绝、禁混合内容、无JS bridge、麦克风最小授权、文件选择/SAF导出、导出20MB及独立20秒预算、销毁与迟到回调隔离。
- 网页104项测试通过；正式网页关闭speechSynthesis后真实音频播放、停止、失败重试通过。浏览器验证不能替代原生APK运行验证。

## 待设备验证

本机Android模拟器在App安装前卡于WHPX/kernel启动阶段，API29/35及旧/新模拟器均受影响。不能据此判断App启动失败，也不能宣称已通过原生运行验收。

小米真机待确认：首次启动与离线音频、登录双人同步、麦克风允许/拒绝、图片/JSON选择、录音/PNG/JSON保存、系统返回与安全区。没有把“构建成功”或桌面Chrome测试作为这些项目的通过证据。

安装步骤见 `android-install.md`。后端未改动，无生产压测或故障注入。
