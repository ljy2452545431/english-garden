# 小米浏览器朗读兼容（2026-10-10）

原实现依赖 `speechSynthesis`。用户的小米浏览器不提供该能力时，换“系统浏览器”的提示没有帮助。现有课程朗读改用站内 MP3 和 HTMLAudioElement，不再调用浏览器TTS，不上传用户文字，也不依赖在线AI服务。

## 内容与构建

48周全部词汇与听力正文按唯一文本生成414份MP3，共17,110,787字节。Windows Microsoft Zira英文语音、正常合成语速、22.05kHz单声道64kbps；播放器以0.85倍速播放。属于基础合成教学音频，不是雅思官方真人试卷录音。

`scripts/build-course-audio.ps1`读取公开课程，使用本机SAPI和ffmpeg生成内容哈希文件，全部解码验证后更新`src/data/course-audio.json`。复跑会校验并复用已有文件。依赖ffmpeg（也可`python -m pip install imageio-ffmpeg`），不需要API密钥。课程更新后需重新运行脚本并提交新音频与映射。

## 播放边界

- 在用户点击事件中同步调用play，保留移动浏览器用户手势授权。
- 初次加载和缓冲停顿都有15秒等待上限；失败提示重试，不自动反复请求。
- 切换课程、切换任务、停止或卸载组件都会释放播放器；迟到事件不能干扰下一段。
- 网页首次加载音频需要网络；APK内置相同公开文件，可用于离线体验课程。账号同步仍需联网。

## 验证

- 414份MP3逐一完整解码通过，课程与文件映射单测覆盖48周。
- `scripts/audio-browser-check.mjs`在390×844 Chrome中禁用两项浏览器语音API，验证真实单词/听力解码播放、停止、切任务、网络失败后手动重试。运行前设置`PLAYWRIGHT_MODULE`为本机Playwright入口，结果见`audio-browser-result.json`。
- 新增播放器测试覆盖取消竞态、播放失败/权限拒绝、等待超时与恢复。
- 尚无用户的小米真机测试结果；模拟禁用API不等同完整小米浏览器验收。

行为依据：[MDN play()用户手势与Promise规则](https://developer.mozilla.org/en-US/docs/Web/API/HTMLMediaElement/play)。安卓本地网页方案参考[Android官方本地内容加载文档](https://developer.android.com/develop/ui/views/layout/webapps/load-local-content)。
