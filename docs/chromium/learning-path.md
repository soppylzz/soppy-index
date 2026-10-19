# 面向前端开发者的 Chromium 学习路线

这份路线是译者的学习建议，与官方原文分开。建议先围绕一个问题读通实现链路，再扩大范围：**一次 DOM / CSS 修改，如何最终变成屏幕上的像素？** 随后学习导航如何更换文档、主线程如何安排任务，以及页面与浏览器进程如何通信。

以下源码路径相对于你的 Chromium checkout 根目录 `/Users/soppylzz/code/reference/chromium/`；官方链接固定到本次核对的提交 `f5a9dd28d9af`。路径存在不代表文档每段叙述都已同步到该版本，迁移计划、旧 API 和平台策略仍需结合实现判断。

## 第一轮：读已翻译的主线

| 顺序 | 阅读材料 | 带着什么问题读 | 建议产出 |
| --- | --- | --- | --- |
| 1 | [源码目录](overview/source_tree_overview.md)、[Blink 总览](rendering/how-blink-works.pdf) | Blink、Content、V8、cc、Viz 分别负责什么？ | 画出进程、线程与组件边界；总览按 2018 年历史材料读 |
| 2 | [渲染核心](rendering/renderer-readme/core.md)、[DOM](rendering/renderer-readme/dom.md) | DOM tree、shadow tree、flat tree、layout tree 为何不同？ | 用一个带 slot 的组件画树，并解释事件 target 的变化 |
| 3 | [CSS 入口](rendering/renderer-readme/css.md)、[布局](rendering/renderer-readme/layout.md)、[绘制](rendering/renderer-readme/paint.md) | 样式变化什么时候需要布局、什么时候只需绘制或更新属性？ | 跟踪一次 class 变化，区分失效标记和实际重算 |
| 4 | [cc](rendering/cc_readme.md)、[cc 工作原理](rendering/how_cc_works.md)、[一帧的生命周期](rendering/life_of_a_frame.md) | Paint、raster、commit、activate、draw、presentation 各是什么？ | 将一段 Performance trace 与流水线对照，不把提交帧等同于显示到屏幕 |
| 5 | [进程隔离](overview/process_model_and_site_isolation.md)、[FrameTree](navigation/frame_trees.md)、[导航](navigation/navigation.md)、[历史](navigation/session_history.md)、[BFCache](navigation/bfcache.md) | URL、文档、frame、进程、历史条目为何不能一一对应？ | 分别解释 pushState、普通导航、前进后退和 BFCache 恢复 |
| 6 | [线程与任务](overview/threading_and_tasks.md)、[Mojo](overview/mojo_and_services.md) | 异步任务在哪条 sequence 执行？消息回复与对象生命周期有何关系？ | 追踪一次任务投递或 Mojo 请求，标出调用方、接收方、回调和销毁位置 |

WebUI 三篇建议在主线后选读：[WebUI](webui_explainer.md) → [Lit 用法](webui_using_lit.md) → [Lit 风格指南](webui_lit_style_guide.md)。如果准备开发 `chrome://` 内部页面，可以提前阅读；如果主要目标是理解普通网页性能，不必先深入 GN 构建和 Polymer 迁移。

## 第二轮：优先补充这些官方文档

已复制的 CSS README 只是入口，建议首先补齐样式计算与失效；它们能把“改 class 会触发重算”的前端经验连接到具体数据结构。

| 优先级 | Chromium 源码文档 | 推荐原因 |
| --- | --- | --- |
| 高 | [core/css/style-calculation.md](https://chromium.googlesource.com/chromium/src/+/f5a9dd28d9af3a5450afb58ac199223fc6b49976/third_party/blink/renderer/core/css/style-calculation.md) | 理解规则索引、选择器匹配、ComputedStyle 的生成，认识 StyleEngine、StyleResolver、RuleSet |
| 高 | [core/css/style-invalidation.md](https://chromium.googlesource.com/chromium/src/+/f5a9dd28d9af3a5450afb58ac199223fc6b49976/third_party/blink/renderer/core/css/style-invalidation.md) | 理解失效集合如何减少需要重算的节点，以及为何先标记、稍后统一处理；原文不覆盖 sibling invalidation |
| 高 | [core/layout/layout_ng.md](https://chromium.googlesource.com/chromium/src/+/f5a9dd28d9af3a5450afb58ac199223fc6b49976/third_party/blink/renderer/core/layout/layout_ng.md) | 从 LayoutObject 继续认识 ConstraintSpace、布局算法与 PhysicalFragment；其中仍有历史迁移表述和 TODO |
| 高 | [platform/graphics/paint/README.md](https://chromium.googlesource.com/chromium/src/+/f5a9dd28d9af3a5450afb58ac199223fc6b49976/third_party/blink/renderer/platform/graphics/paint/README.md) | 补足 PaintArtifact、PaintChunk、transform / clip / effect / scroll 四类属性树，与 core/paint 职责衔接 |
| 高 | [platform/scheduler/TaskSchedulingInBlink.md](https://chromium.googlesource.com/chromium/src/+/f5a9dd28d9af3a5450afb58ac199223fc6b49976/third_party/blink/renderer/platform/scheduler/TaskSchedulingInBlink.md) | 区分通用 base 任务系统与 Blink 的 frame 归属、TaskType、优先级；不要把 base 的通用投递建议直接套到 renderer |
| 高 | [docs/navigation_concepts.md](https://chromium.googlesource.com/chromium/src/+/f5a9dd28d9af3a5450afb58ac199223fc6b49976/docs/navigation_concepts.md) | 补齐 same-document / cross-document、导航发起者、pending / committed / visible URL 的区别 |
| 中 | [docs/render_document.md](https://chromium.googlesource.com/chromium/src/+/f5a9dd28d9af3a5450afb58ac199223fc6b49976/docs/render_document.md) | 理解为什么推动 RenderFrameHost 按文档隔离，以及不能在导航后无条件复用旧对象引用；按项目设计文档读，不据其阶段列表推断当前 rollout |
| 中 | [bindings/core/v8/V8BindingDesign.md](https://chromium.googlesource.com/chromium/src/+/f5a9dd28d9af3a5450afb58ac199223fc6b49976/third_party/blink/renderer/bindings/core/v8/V8BindingDesign.md) | 深入 Isolate、Context、World，连接 iframe、扩展隔离与 JavaScript 调用 DOM 的边界 |
| 后续 | [platform/heap/BlinkGCAPIReference.md](https://chromium.googlesource.com/chromium/src/+/f5a9dd28d9af3a5450afb58ac199223fc6b49976/third_party/blink/renderer/platform/heap/BlinkGCAPIReference.md) | 在开始修改 C++ DOM 类、排查对象生命周期时，学习 MakeGarbageCollected、Member、Persistent 与 tracing |

这些入口已对照本地文件核验。文档中的具体断言仍要看上下文，例如“同文档导航涉及历史条目”不意味着 `replaceState()` 每次新增条目；实现文档中的概括不替代 Web API 的规范语义。

## 将阅读与已有实验连接起来

这些是建议自行执行的练习，本次翻译没有运行它们，也没有把以下预期写成实测结果。

- [DOM 读写示例](../browser/dom/geometry.md)：修改 class 后读取几何，结合 Performance 查看是否出现同步样式或布局工作。回到 StyleEngine、样式失效说明，解释读取为什么可能迫使浏览器提前更新；不要仅从 JS 耗时反推发生了哪一步。
- [Web Components 示例](../browser/web-components/web-components.md)：给组件分配 slot，比较 DOM 查询、视觉位置与事件路径。对照 NodeTraversal 和 FlatTreeTraversal 的职责，注意 open / closed、composed 与 retargeting 的不同作用。
- [生命周期](../browser/lifecycle/experiment.md)与 [History 实验](../browser/navigation/experiment.md)：比较普通导航、pushState、刷新和前进后退。记录 pageshow.persisted，并结合浏览器 BFCache 诊断；页面恢复快不等于已经证明命中 BFCache。
- [通信机制](../browser/communication/cross-context-communication.md)：把页面消息的发送、接收、ack 和清理，与 Mojo 的 Remote、Receiver、回调生命周期进行概念对照。两者是不同 API，不要推断具有相同权限、传输格式或跨进程保证。

在源码中追踪时，每次只选一个入口。例如从 `Node::appendChild` 看 DOM 修改如何通知后续系统；从 `LocalFrameView` 看生命周期更新；从 `PaintArtifactCompositor` 看 chunk 如何成为 layer；从 `NavigationRequest`、`RenderFrameHostImpl` 看导航提交。先读声明与类注释，再沿调用链前进，最后看测试描述的边界条件。

## 阅读时始终区分三个层次

1. **Web 标准**：页面能依赖的可观察语义，例如 DOM 事件、History API；不要把 Chromium 类名当作跨浏览器规范。
2. **Chromium 实现**：某个源码版本如何分线程、分进程、缓存或调度，可以随版本和平台变化。
3. **本机观测**：在具体 Chrome 版本、设备、页面和开关下得到的 trace、日志。记录条件，再判断它支持什么结论。

每轮阅读结束，写一段“触发条件 → 参与对象 → 状态变化 → 可观察结果”，比先记住大量内部类名更容易形成完整理解。
