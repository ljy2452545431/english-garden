# 官方模拟资料来源

核验日期：2026-10-08。目录代码：`src/data/officialMaterials.ts`。

## 收录范围

- 1 份完整听力单科样卷：4部分、40题，配官方答案PDF。
- 1 份完整学术阅读单科样卷：3篇、40题，配官方答案PDF。
- 1 份完整学术写作单科样卷：Task 1和Task 2；范文/考官评语为通用评分示例，不标作对应卷标准答案。
- 官方口语三部分样题、3段示范音频、提示和逐字稿。
- 官方阅读判断题单项样例，以及听力题型PDF资料包。后二者不标作40题整卷。

同一Inspera试卷在多个合作方入口出现，不重复统计为多套试卷。Academic为当前学习方向；没有将General Training阅读冒充学术阅读。

## 官方出处

- [IELTS Academic样题与完整机考体验](https://ielts.org/take-a-test/preparation-resources/sample-test-questions/academic-test)
- [IDP机考熟悉测试与答案](https://ielts.idp.com/about/ielts-familiarisation-tests)
- [IDP四科练习和口语录音](https://ielts.idp.com/prepare/all-test-types/all-skills/practice-test)
- [British Council听力资料](https://takeielts.britishcouncil.org/prepare/ielts-free-practice-mock-tests/academic/listening)

目录保留官方直达地址及核验日期。题目、音频和PDF均从来源站点加载或打开，不在本公开仓库复制正文、录音或付费剑桥试卷。

## 使用与计分

官方机考体验本身不计时，部分工具与正式考试有差异。本站提供单科训练计时；30分钟听力为练习预算，不声称覆盖正式机考末尾的检查时间。完整听读写训练需要额外连续时间，不能塞进每天一小时。

完整听读卷提供40题答题草稿、0–40自填原始分及复盘笔记；原始分是学习者对照官方答案后的记录，不是本站自动批改或官方雅思等级分。官方页面的答案与成绩不自动同步本站。写作与口语没有唯一标准答案，AI尚未配置时不会生成虚构评分。

## 浏览器集成

- 自动化HTTP抓取Inspera曾返回403；Chromium正常页面实测200并加载真实题面。站内按用户点击加载跨域官方iframe，不代理、修改试卷或读取跨域答题数据。
- 官方机考采用桌面布局；本站使用960px题面、局部横向滚动及全屏入口。手机横屏更适合整卷练习，不宣称官方界面已改造为原生手机排版。
- 材料切换或离页会卸载官方iframe，官网内未提交作答可能丢失。站内草稿和复盘通过现有私密同步流程保留，提示用户先保存记录。
- 第三方服务可调整嵌入、网络及地区限制；始终提供官方新页入口。口语音频按需播放并显示加载失败信息。
- IDP介绍页面有SAMEORIGIN限制，因此不嵌入介绍页。PDF是否内嵌显示取决于浏览器，保留原站入口。
