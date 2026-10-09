# Chromium 官方文档选读

[返回仓库首页](../../README.md) · [前端开发者学习路线](learning-path.md) · [Browser 知识与实验](../browser/core/README.md)

本目录收录精选 Chromium 官方文档，保留英文原文与对应中文翻译，便于对照学习浏览器实现。

- `en/` 存储英文原文。
- 当前目录按相同相对路径、文件名存储中文版本。
- `assets/` 保存中文文档使用的源码图示及从原 PDF 提取的图示。

## 阅读索引

| 主题            | 中文版本                                                           | 英文原文                                                   |
| --------------- | ------------------------------------------------------------------ | ---------------------------------------------------------- |
| 源码目录        | [源码目录概览](overview/source_tree_overview.md)                   | [English](en/overview/source_tree_overview.md)             |
| 进程与安全      | [进程模型与站点隔离](overview/process_model_and_site_isolation.md) | [English](en/overview/process_model_and_site_isolation.md) |
| 线程与任务      | [线程与任务](overview/threading_and_tasks.md)                      | [English](en/overview/threading_and_tasks.md)              |
| 跨进程通信      | [Mojo 与服务](overview/mojo_and_services.md)                       | [English](en/overview/mojo_and_services.md)                |
| 导航结构        | [FrameTree](navigation/frame_trees.md)                             | [English](en/navigation/frame_trees.md)                    |
| 导航过程        | [一次导航的生命周期](navigation/navigation.md)                     | [English](en/navigation/navigation.md)                     |
| 会话历史        | [会话历史](navigation/session_history.md)                          | [English](en/navigation/session_history.md)                |
| 页面恢复        | [BFCache](navigation/bfcache.md)                                   | [English](en/navigation/bfcache.md)                        |
| Blink 总览      | [Blink 的工作原理](<rendering/How Blink works.md>)                 | [PDF，17 页](<en/rendering/How Blink works.pdf>)           |
| 渲染核心        | [Core](rendering/renderer-readme/core.md)                          | [English](en/rendering/renderer-readme/core.md)            |
| 节点与树        | [DOM](rendering/renderer-readme/dom.md)                            | [English](en/rendering/renderer-readme/dom.md)             |
| 样式入口        | [CSS](rendering/renderer-readme/css.md)                            | [English](en/rendering/renderer-readme/css.md)             |
| 布局            | [Layout](rendering/renderer-readme/layout.md)                      | [English](en/rendering/renderer-readme/layout.md)          |
| 绘制            | [Paint](rendering/renderer-readme/paint.md)                        | [English](en/rendering/renderer-readme/paint.md)           |
| Blink 合成      | [合成算法](rendering/compositing_readme.md)                        | [English](en/rendering/compositing_readme.md)              |
| cc 入口与术语   | [cc README](rendering/cc_readme.md)                                | [English](en/rendering/cc_readme.md)                       |
| cc 内部机制     | [cc 的工作原理](rendering/how_cc_works.md)                         | [English](en/rendering/how_cc_works.md)                    |
| 帧流水线        | [一帧的生命周期](rendering/life_of_a_frame.md)                     | [English](en/rendering/life_of_a_frame.md)                 |
| Chrome 内部页面 | [WebUI 详解](webui_explainer.md)                                   | [English](en/webui_explainer.md)                           |
| WebUI 组件      | [Lit 用法与迁移](webui_using_lit.md)                               | [English](en/webui_using_lit.md)                           |
| WebUI 编码约定  | [Lit 风格指南](webui_lit_style_guide.md)                           | [English](en/webui_lit_style_guide.md)                     |

## 来源与版本

20 篇 Markdown 英文副本已与本地 Chromium 源码提交 [`f5a9dd28d9af`](https://chromium.googlesource.com/chromium/src/+/f5a9dd28d9af3a5450afb58ac199223fc6b49976/)（2026-09-12）逐文件核对一致；翻译日期为 2026-10-09。各译文页首链接到本地原文与对应提交中的官方路径。该提交日期是源码快照日期，不是每篇文档的写作或最后修订日期。

《How Blink works》PDF 自述最后更新于 **2018-08-14**。对应中文使用同名 Markdown，属于格式例外；按历史架构材料阅读，其中已经失效的旧资料路径在文末列明。

中文保留关键标识符、示例代码与源码注释；原文的 TODO 和未完成术语也保留，不补写成官方结论。译者纠错、历史说明以“译注”标识，[学习路线](learning-path.md)则是独立建议。PDF 图中文字保留英文，正文提供中文解释。

中文版本将已收录文档互链到本地译文，将未收录的相对源码引用定位到官方路径，并保留原有外部资料链接。英文原文不改动，因此其中基于 Chromium 原目录的相对链接可能不能在本仓库直接使用；可从译文页首进入官方原文。外部 Google 文档、视频及历史链接可能受权限或迁移影响。

原文、代码与图示的版权和许可沿用其上游声明，参见 [Chromium LICENSE](https://chromium.googlesource.com/chromium/src/+/f5a9dd28d9af3a5450afb58ac199223fc6b49976/LICENSE)。这些文档描述 Chromium 实现；跨浏览器行为仍应结合规范，不将历史设计、当前实现与本机实验结果混为一谈。
