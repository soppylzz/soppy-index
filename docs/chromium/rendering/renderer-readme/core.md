> 英文原文：[本地副本](../../en/rendering/renderer-readme/core.md) · [Chromium 来源](https://chromium.googlesource.com/chromium/src/+/f5a9dd28d9af3a5450afb58ac199223fc6b49976/third_party/blink/renderer/core/README.md)。对应本地源码提交 `f5a9dd28d9af`（2026-09-12）；翻译日期：2026-10-09。代码、标识符及源码注释保留原样，译者补充以“译注”标识。

<a id="blink-renderer-core"></a>

# Blink 渲染器核心

本目录实现 Web 平台的核心渲染部分。

`core/` 与 `modules/`、`platform/` 的关系见 [renderer/README.md](https://chromium.googlesource.com/chromium/src/+/f5a9dd28d9af3a5450afb58ac199223fc6b49976/third_party/blink/renderer/README.md)。

Blink 代码架构和目录结构的入门介绍见 [How Blink Works](http://bit.ly/how-blink-works)。

渲染流水线的端到端介绍见 [Life of a Pixel](http://bit.ly/lifeofapixel)。

公开邮件列表为 [rendering-core-dev](https://groups.google.com/a/chromium.org/g/rendering-core-dev)。

核心渲染包括四个关键阶段：

- [DOM](dom.md)
- [样式](css.md)
- [布局](layout.md)
- [绘制](paint.md)

渲染的其他部分在 `core/` 之外实现，例如[合成](../compositing_readme.md)和[无障碍支持](https://chromium.googlesource.com/chromium/src/+/f5a9dd28d9af3a5450afb58ac199223fc6b49976/third_party/blink/renderer/modules/accessibility)。

`core/` 目录包含 [Blink Public API](https://chromium.googlesource.com/chromium/src/+/f5a9dd28d9af3a5450afb58ac199223fc6b49976/third_party/blink/public/README.md) 中类的具体实现，例如 `WebLocalFrameImpl`。[Content 模块](https://chromium.googlesource.com/chromium/src/+/f5a9dd28d9af3a5450afb58ac199223fc6b49976/content/README.md)使用这些公共 API。

核心渲染的输出是 `PaintArtifact`（见 [platform paint README](https://chromium.googlesource.com/chromium/src/+/f5a9dd28d9af3a5450afb58ac199223fc6b49976/third_party/blink/renderer/platform/graphics/paint/README.md)），它用于生成[渲染器合成器](../cc_readme.md)所需的图层列表。
