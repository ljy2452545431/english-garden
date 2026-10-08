# 图标来源与许可

界面图标直接提取自 [iconfont 阿里巴巴矢量图标库的 Ant Design 官方图标集](https://www.iconfont.cn/collections/detail?cid=9402)，集合编号 **9402**。该平台公开接口将本集合标记为 `is_official: 1`，描述为「Ant Design 3.0 全新线性图标体系」。本次选取 36 个原始 SVG，生成 37 个兼容现有代码的组件。

本项目读取公开的 [集合详情 JSON](https://www.iconfont.cn/api/collection/detail.json?id=9402) 中 `show_svg` 的 `path d`，保存到 `src/components/icons/paths.ts`。没有登录、获取用户私有项目、加载 CDN 脚本或安装 Ant Design 图标运行库。应用仅渲染本地路径，不在用户浏览时访问 iconfont。逐图组件名、原名、平台图标编号见 [iconfont-manifest.json](./iconfont-manifest.json)。

## 许可

Ant Design Icons 的 [上游许可为 MIT](https://github.com/ant-design/ant-design-icons/blob/master/LICENSE)，版权归 Ant UED。许可原文已保留在 `public/icons/ANT-DESIGN-LICENSE.txt`，随网站发布。此许可归于 Ant Design 这套官方图标，不能理解为 iconfont 上所有第三方图标都采用 MIT。本集合的 iconfont `license` 字段为空；许可依据为官方图标体系的上游仓库。

## 调整与兼容

- 保留原始 1024 × 1024 路径，统一使用 `currentColor`，随主题着色。
- `ArrowUpRight` 使用官方 `arrowright` 旋转 -45°，变换不修改原路径。
- 组件名称保留旧接口以减少业务改动，名称不表示原始素材的名称。`Sprout → rocket` 表示成长，`Leaf → experiment` 表示练习探索，`Sun → bulb` 表示每日启发，`Palette → skin` 表示主题外观。其余完整映射在 manifest 内。
- 植物花园品牌由项目既有原创 `GardenScene` 插画表达，未把火箭或实验瓶称作植物图标。
- `size`、`className`、SVG 标准属性可用；图标已是填充轮廓路径，`strokeWidth` / `absoluteStrokeWidth` 兼容接收但不改变轮廓。默认视作装饰图标；有 `aria-label` / `aria-labelledby` 时开启图像语义。

## 重建

在项目根执行 `python scripts/build-iconfont.py`。脚本仅保存必要图标路径与公开来源编号，不保存平台创作者个人资料。脚本验证集合官方标识、viewBox 与纯 path 白名单，遇到不符合预期的 SVG 会停止。
