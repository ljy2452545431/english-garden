# 图标来源与许可

界面图标从阿里巴巴 iconfont 的公开集合提取 SVG 路径，随站点打包，不依赖外部字体、CDN 脚本或登录。共 42 个原始图标、43 个兼容组件。逐图平台编号、集合编号与组件映射见 [iconfont-manifest.json](./iconfont-manifest.json)。

## Ant Design 线性界面图标

来源：[iconfont 官方 Ant Design 集合 9402](https://www.iconfont.cn/collections/detail?cid=9402)，[公开集合 JSON](https://www.iconfont.cn/api/collection/detail.json?id=9402)。平台标记 `is_official: 1`，说明为「Ant Design 3.0 全新线性图标体系」。用于日历、阅读、耳机、锁、箭头等界面动作。

[上游 MIT 许可](https://github.com/ant-design/ant-design-icons/blob/master/LICENSE)原文保留在 `public/icons/ANT-DESIGN-LICENSE.txt`，版权归 Ant UED。该集合平台许可字段为空，许可依据是这套官方图标体系的上游仓库，不代表所有 iconfont 素材均采用 MIT。

## 植物、词汇、主题和今日图标

来源：[iconfont Remix Icon v2.5.0 集合 23534](https://www.iconfont.cn/collections/detail?cid=23534)，[公开集合 JSON](https://www.iconfont.cn/api/collection/detail.json?id=23534)。该集合为社区公开收录，**不是 iconfont 官方集合**，平台许可字段为空。

选取的四个图标对应开源 Remix Icon 2.5.0 上游素材，可核查 [植物](https://github.com/Remix-Design/RemixIcon/blob/v2.5.0/icons/Others/plant-line.svg)、[叶子](https://github.com/Remix-Design/RemixIcon/blob/v2.5.0/icons/Others/leaf-line.svg)、[调色盘](https://github.com/Remix-Design/RemixIcon/blob/v2.5.0/icons/Design/palette-line.svg)、[太阳](https://github.com/Remix-Design/RemixIcon/blob/v2.5.0/icons/Weather/sun-line.svg)。平台版本使用 1024 画布，上游使用 24 画布。许可依据为 [2.5.0 版本 Apache 2.0 许可](https://github.com/Remix-Design/RemixIcon/blob/v2.5.0/License)，原文随网站保留在 `public/icons/REMIX-ICON-LICENSE.txt`。不将其描述为新版 Remix Icon 许可。

- `Sprout → plant-line`：盆栽嫩芽作为学习花园品牌，替代火箭。
- `Leaf → leaf-line`：词汇温室与成长互动使用真实叶子，替代实验瓶。
- `Palette → palette-line`：外观设置使用调色盘，替代衣服。
- `Sun → sun-line`：今日学习使用太阳，替代灯泡。

四个图标采用同一线性图标家族；其余沿用 Ant Design 线性图标。品牌植物插画 `GardenScene` 是项目既有原创插画，不属于平台界面图标。

## 自由画布工具图标

画布继续从同一个 Remix Icon 2.5.0 集合 23534 提取，沿用上面的 Apache 2.0 许可原文。组件与平台原始名称如下；具体图标编号列于 manifest，不新增第三方图标集合。

- `MousePointer → cursor-line`：选择元素。
- `Move → drag-move-2-line`：平移画布。
- `Text → text`：添加文字。
- `StickyNote → sticky-note-line`：添加便签。
- `Square → checkbox-blank-line`：矩形工具；也作为音频停止方块，替换旧 `stop` 禁止符号。
- `Circle → checkbox-blank-circle-line`：圆形工具，与矩形区分。
- `Image → image-line`：图片及作品库。

这些路径保留平台原始形状，不通过 CSS 变形模拟其他工具。文字、选择、移动、便签和形状各有独立按钮标签。

## 渲染与重建

- 保存平台原始 1024 × 1024 `path d`，仅使用 `currentColor` 随主题取色。
- 箭头 `ArrowUpRight` 将 `arrowright` 内部旋转 -45°，不改路径。
- 默认作为装饰图标隐藏于辅助技术；传入 `aria-label` / `aria-labelledby` 时启用图像语义。
- `size`、`className` 与 SVG 标准属性可用。旧 `strokeWidth` / `absoluteStrokeWidth` 参数兼容接收，但轮廓由原始填充路径确定。
- 运行 `python scripts/build-iconfont.py` 重建本地路径与 manifest。脚本核查集合编号、Ant Design 官方标记、viewBox 和纯 path 属性白名单，遇到未知 SVG 结构停止；不保存创作者个人资料或任何账户数据。
