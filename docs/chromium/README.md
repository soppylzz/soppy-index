# Chromium 官方文档选读

本目录收录精选 Chromium 官方文档，提供中文翻译与固定版本的官方原文链接，便于对照学习浏览器实现。

- 中文文档按主题组织，页首保留固定提交的官方来源。
- 历史 PDF 位于 `rendering/how-blink-works.pdf`，图示按各文档链接访问。

## 阅读索引

| 主题 | 中文版本 | 英文原文 |
| --- | --- | --- |
| 源码目录 | [源码目录概览](overview/source_tree_overview.md) | [官方原文](https://chromium.googlesource.com/chromium/src/+/f5a9dd28d9af3a5450afb58ac199223fc6b49976/docs/source_tree_overview.md) |
| 进程与安全 | [进程模型与站点隔离](overview/process_model_and_site_isolation.md) | [官方原文](https://chromium.googlesource.com/chromium/src/+/f5a9dd28d9af3a5450afb58ac199223fc6b49976/docs/process_model_and_site_isolation.md) |
| 线程与任务 | [线程与任务](overview/threading_and_tasks.md) | [官方原文](https://chromium.googlesource.com/chromium/src/+/f5a9dd28d9af3a5450afb58ac199223fc6b49976/docs/threading_and_tasks.md) |
| 跨进程通信 | [Mojo 与服务](overview/mojo_and_services.md) | [官方原文](https://chromium.googlesource.com/chromium/src/+/f5a9dd28d9af3a5450afb58ac199223fc6b49976/docs/mojo_and_services.md) |
| 导航结构 | [FrameTree](navigation/frame_trees.md) | [官方原文](https://chromium.googlesource.com/chromium/src/+/f5a9dd28d9af3a5450afb58ac199223fc6b49976/docs/frame_trees.md) |
| 导航过程 | [一次导航的生命周期](navigation/navigation.md) | [官方原文](https://chromium.googlesource.com/chromium/src/+/f5a9dd28d9af3a5450afb58ac199223fc6b49976/docs/navigation.md) |
| 会话历史 | [会话历史](navigation/session_history.md) | [官方原文](https://chromium.googlesource.com/chromium/src/+/f5a9dd28d9af3a5450afb58ac199223fc6b49976/docs/session_history.md) |
| 页面恢复 | [BFCache](navigation/bfcache.md) | [官方原文](https://chromium.googlesource.com/chromium/src/+/f5a9dd28d9af3a5450afb58ac199223fc6b49976/docs/bfcache.md) |
| Blink 总览 | [How Blink works PDF](rendering/how-blink-works.pdf) | [PDF，17 页](rendering/how-blink-works.pdf) |
| 渲染核心 | [Core](rendering/renderer-readme/core.md) | [官方原文](https://chromium.googlesource.com/chromium/src/+/f5a9dd28d9af3a5450afb58ac199223fc6b49976/third_party/blink/renderer/core/README.md) |
| 节点与树 | [DOM](rendering/renderer-readme/dom.md) | [官方原文](https://chromium.googlesource.com/chromium/src/+/f5a9dd28d9af3a5450afb58ac199223fc6b49976/third_party/blink/renderer/core/dom/README.md) |
| 样式入口 | [CSS](rendering/renderer-readme/css.md) | [官方原文](https://chromium.googlesource.com/chromium/src/+/f5a9dd28d9af3a5450afb58ac199223fc6b49976/third_party/blink/renderer/core/css/README.md) |
| 布局 | [Layout](rendering/renderer-readme/layout.md) | [官方原文](https://chromium.googlesource.com/chromium/src/+/f5a9dd28d9af3a5450afb58ac199223fc6b49976/third_party/blink/renderer/core/layout/README.md) |
| 绘制 | [Paint](rendering/renderer-readme/paint.md) | [官方原文](https://chromium.googlesource.com/chromium/src/+/f5a9dd28d9af3a5450afb58ac199223fc6b49976/third_party/blink/renderer/core/paint/README.md) |
| Blink 合成 | [合成算法](rendering/compositing_readme.md) | [官方原文](https://chromium.googlesource.com/chromium/src/+/f5a9dd28d9af3a5450afb58ac199223fc6b49976/third_party/blink/renderer/platform/graphics/compositing/README.md) |
| cc 入口与术语 | [cc README](rendering/cc_readme.md) | [官方原文](https://chromium.googlesource.com/chromium/src/+/f5a9dd28d9af3a5450afb58ac199223fc6b49976/cc/README.md) |
| cc 内部机制 | [cc 的工作原理](rendering/how_cc_works.md) | [官方原文](https://chromium.googlesource.com/chromium/src/+/f5a9dd28d9af3a5450afb58ac199223fc6b49976/docs/how_cc_works.md) |
| 帧流水线 | [一帧的生命周期](rendering/life_of_a_frame.md) | [官方原文](https://chromium.googlesource.com/chromium/src/+/f5a9dd28d9af3a5450afb58ac199223fc6b49976/docs/life_of_a_frame.md) |
| Chrome 内部页面 | [WebUI 详解](webui_explainer.md) | [官方原文](https://chromium.googlesource.com/chromium/src/+/f5a9dd28d9af3a5450afb58ac199223fc6b49976/docs/webui/webui_explainer.md) |
| WebUI 组件 | [Lit 用法与迁移](webui_using_lit.md) | [官方原文](https://chromium.googlesource.com/chromium/src/+/f5a9dd28d9af3a5450afb58ac199223fc6b49976/docs/webui/webui_using_lit.md) |
| WebUI 编码约定 | [Lit 风格指南](webui_lit_style_guide.md) | [官方原文](https://chromium.googlesource.com/chromium/src/+/f5a9dd28d9af3a5450afb58ac199223fc6b49976/docs/webui/webui_lit_style_guide.md) |

## 来源与版本

20 篇 Markdown 的来源固定于 Chromium 源码提交 [`f5a9dd28d9af`](https://chromium.googlesource.com/chromium/src/+/f5a9dd28d9af3a5450afb58ac199223fc6b49976/)（2026-09-12）；翻译日期为 2026-10-09。各译文页首链接到对应提交中的官方路径。该提交日期是源码快照日期，不是每篇文档的写作或最后修订日期。

《How Blink works》PDF 自述最后更新于 **2018-08-14**。本仓库保留 PDF，按历史架构材料阅读。

中文保留关键标识符、示例代码与源码注释；原文的 TODO 和未完成术语也保留，不补写成官方结论。译者纠错、历史说明以“译注”标识，[学习路线](learning-path.md)则是独立建议。PDF 图中文字保留英文。

中文版本将已收录文档互链到本地译文，将未收录的相对源码引用定位到官方路径，并保留原有外部资料链接。本仓库不再维护英文副本，可从译文页首进入官方原文。外部 Google 文档、视频及历史链接可能受权限或迁移影响。

原文、代码与图示的版权和许可沿用其上游声明，参见 [Chromium LICENSE](https://chromium.googlesource.com/chromium/src/+/f5a9dd28d9af3a5450afb58ac199223fc6b49976/LICENSE)。这些文档描述 Chromium 实现；跨浏览器行为仍应结合规范，不将历史设计、当前实现与本机实验结果混为一谈。
