> 英文原文：[本地副本](../en/rendering/cc_readme.md) · [Chromium 来源](https://chromium.googlesource.com/chromium/src/+/f5a9dd28d9af3a5450afb58ac199223fc6b49976/cc/README.md)。对应本地源码提交 `f5a9dd28d9af`（2026-09-12）；翻译日期：2026-10-09。代码、标识符及源码注释保留原样，译者补充以“译注”标识。

<a id="cc"></a>

# cc/

本目录包含合成器（compositor）的实现，渲染器进程和浏览器进程都会使用它。在渲染器中，客户端是 Blink；在浏览器中，客户端包括 UI 和 Android 浏览器合成器。

合成器的公共 API 是 `LayerTreeHost`、`Layer` 及其派生类型。嵌入方创建 `LayerTreeHost`（单线程、多线程或同步模式），然后为其挂接一棵 `Layer` 树。

图层更新时会请求一次 commit：将图层树结构、每个图层的数据以及所属 host 的数据，原子地推送到由 `LayerImpl`、`LayerTreeHostImpl` 和 `LayerTreeImpl` 构成的对应结构中。在此过程中，拥有 `Layer` 树和嵌入方对象的主线程会被阻塞。

多线程模式下，commit 将主线程的图层树提交到 pending tree（待激活树）。它是供栅格化使用的暂存树。当失效内容所需的栅格化完成到足够程度时，这棵树就可以激活。Activate 与 commit 类似，将数据从 pending tree 推送到 active tree（活动树）。有了 pending tree，上一帧仍可滚动或执行动画，而来自主线程的全部更新可以原子地呈现给用户。

单线程合成器直接提交到 active tree，随后暂停绘制，直到内容可以绘制。

Active tree 负责绘制。`Scheduler` 及其 `SchedulerStateMachine` 决定何时绘制、何时提交等。合成器中的“绘制”指 `LayerImpl::AppendQuads` 将一组 `DrawQuad` 和 `RenderPass` 汇集为 `CompositorFrame`，再通过 `CompositorFrameSink` 发送。

各个合成器产生的 `CompositorFrame` 会发往 GPU 进程中的 `SurfaceManager`。`Display` 发起请求时，`SurfaceAggregator` 将这些帧汇总，交给 `viz::DirectRenderer`，由它最终绘制整个合成后的浏览器内容。显示合成器的更多信息见 `//components/viz`。

图形栈设计文档见 [chromium-graphics](https://www.chromium.org/developers/design-documents/chromium-graphics)。

<a id="other-docs"></a>

## 其他文档

- [cc 的工作原理](how_cc_works.md)

<a id="glossaries"></a>

## 术语表

<a id="active-compositorframe"></a>

### Active CompositorFrame

> 译注：原文保留了此标题，但没有提供定义。

<a id="active-tree"></a>

### Active Tree（活动树）

图层合成器用来提交 `CompositorFrame` 的图层和属性树集合。滚动、双指缩放和动画等合成效果通过修改活动树实现，并由此生成、提交新的 `CompositorFrame`。

<a id="compositorframe"></a>

### CompositorFrame（合成器帧）

一组 `RenderPass`（每个 pass 又是 `DrawQuad` 列表）及其元数据。从概念上说，它包含如何绘制整个场景的指令，例如变换、纹理 ID 等，场景将在一个 surface 中呈现。

<a id="copyoutputrequest-or-copy-request"></a>

### CopyOutputRequest（复制输出请求，也称 Copy Request）

请求将合成器输出的一部分复制为纹理或位图。这类请求会强制合成器为待复制内容使用独立的 `RenderPass`，以便该 pass 绘制完成后执行复制。

<a id="elementid"></a>

### ElementID

由 cc 的客户端选择，可作为跨更新保持稳定的标识。例如 Blink 使用 `ElementID` 稳定地标识负责合成动画的对象，而 cc 不需要理解该对象。更多信息见 [element_id.h](https://codesearch.chromium.org/chromium/src/cc/paint/element_id.h)。

<a id="directrenderer"></a>

### DirectRenderer

一种抽象，为 `Display` 提供 API，将已经完整聚合的 `CompositorFrame` 绘制到物理输出。其子类实现不同后端，原文列举了 GL、Skia 和软件后端。见 [viz::DirectRenderer](https://codesearch.chromium.org/chromium/src/components/viz/service/display/direct_renderer.h)。

<a id="layer"></a>

### Layer（图层）

概念上是一块可出现在屏幕上的内容，具有相对视口的已知位置。`Layer` 类仅用于主线程，与 `LayerTreeHost` 一同构成合成器的主要 API。

<a id="layerimpl"></a>

### LayerImpl

与 `Layer` 对应，但位于合成器线程。

<a id="layertree"></a>

### LayerTree（图层树）

> 译注：原文未提供定义。

<a id="occlusion-culling"></a>

### Occlusion Culling（遮挡剔除）

跳过被前方不透明内容遮住、因而不可见的内容，以避免无用工作。通常指当某些 `DrawQuad` 被前方其他 `DrawQuad` 遮挡时，跳过它们的绘制。

<a id="property-trees"></a>

### Property Trees（属性树）

参见 [Compositor Property Trees](https://docs.google.com/presentation/d/1V7gCqKR-edNdRDv0bDnJa_uEs6iARAU2h5WhgxHyejQ/preview) 和 [Blink Property Trees](https://docs.google.com/presentation/u/1/d/1ak7YVrJITGXxqQ7tyRbwOuXB1dsLJlfpgC4wP7lykeo/preview) 演示文稿。

<a id="display"></a>

### Display

接收各个 surface 的 `CompositorFrame` 并将其绘制到物理输出的控制类。见 [viz::Display](https://codesearch.chromium.org/chromium/src/components/viz/service/display/display.h)。

<a id="draw"></a>

### Draw（绘制）

将像素填入物理输出；技术上也可能输出到离屏纹理。这是显示合成器产生最终输出的步骤。

<a id="drawquad"></a>

### DrawQuad

绘制工作的一个单元。每个 `DrawQuad` 都有自己的纹理 ID、变换、偏移等信息。

<a id="shared-quad-state"></a>

### Shared Quad State

由多个绘制四边形共用的一组状态。关联同一 shared quad state 的 `DrawQuad` 都使用其中的属性，再加上各自结构中独有的信息。

<a id="render-pass"></a>

### Render Pass

一组将共同绘制到同一渲染目标的 `DrawQuad`；目标可以是纹理或物理输出。通常所有 `DrawQuad` 都属于一个 `RenderPass`。当某种效果要求先把一组 `DrawQuad` 绘制到缓冲区，再对缓冲区整体应用效果，而非分别作用于每个四边形时，就会使用额外的 `RenderPass`。

<a id="render-surface"></a>

### Render Surface

现在与 `RenderPass` 同义。历史上它属于图层树数据结构，与 `RenderPass` 一一对应；`RenderSurfaceImpl` 是仍然保留的历史部分。

<a id="surface"></a>

### Surface

> 译注：原文未提供定义。

<a id="record"></a>

### Record

> 译注：原文未提供定义。

<a id="raster"></a>

### Raster

> 译注：原文未提供定义。

<a id="paint"></a>

### Paint

> 译注：原文未提供定义。

<a id="pending-compositorframe"></a>

### Pending CompositorFrame

> 译注：原文未提供定义。

<a id="pending-tree"></a>

### Pending Tree（待激活树）

由一次主帧更新（或 `BeginMainFrame`、commit）生成的图层与属性树集合。它使图层合成器能在不覆盖活动树的前提下执行栅格化；完成之前，活动树仍可继续使用。

<a id="composite"></a>

### Composite（合成）

将多个输入汇合为一个图形输出。实际工作中，图层合成器从录制的绘制内容执行栅格化、管理内存，处理滚动、双指缩放和动画等合成效果，最终生成 `CompositorFrame`。显示合成器执行最终的“合成”，将结果绘制到一个物理输出。

<a id="invalidation"></a>

### Invalidation（失效）

失效是内容更新的一个单元。来自 Blink 或 UI 的任何内容更新，都必须附带失效信息，告诉合成器哪些内容需要重新栅格化。例如一个有背景色的 `10×10` div 宽度增加 5 像素时，新覆盖的区域至少产生 `5×10` 的失效区域。

理想情况下，失效区域应是相对上一帧必须重新栅格化的最小内容集合。它通过 `Layer::SetNeedsDisplay(Rect)` 传给合成器。跟踪失效既是为了减少栅格化工作，也为了支持 tile 的局部栅格化。失效最终也会产生 damage。

<a id="damage"></a>

### Damage（最终画面变化区域）

Damage 与 invalidation 类似，但针对最终显示结果。Invalidation 描述两帧内容之间的差异，damage 描述两个 `CompositorFrame` 之间的差异。`DamageTracker` 跟踪这些差异，从而支持 partial swap：只绘制最终帧中需要更新到屏幕的部分，并仅交换这部分内容。当变化区域较小时，这能显著节省功耗。

内容失效会在屏幕上产生 damage。对图层的某些操作同样会产生 damage，例如移动图层、改变不透明度等属性、添加或移除图层、调整图层顺序。这些操作产生屏幕更新，却不一定导致内容失效，也就不一定需要栅格化工作。

<a id="tiles"></a>

### Tiles（图块）

对图层中一块内容的抽象。图块可能已经栅格化，也可能尚未栅格化；也可能已知是纯色。`PictureLayerImpl` 间接持有一个稀疏的 tile 集合，表示其可栅格化内容。图块失效时，会以新的图块替换。

<a id="prepare-tiles"></a>

### Prepare Tiles（准备图块）

为需要栅格化的图块确定优先级并安排任务。这是把绘制内容（raster source / recording source）转换为图块所持有的栅格资源的系统入口。如果栅格化依赖尚未解码的图像，也会在这里启动相应图像解码。

<a id="device-scale-factor"></a>

### Device Scale Factor（设备缩放因子）

内容在输出设备上的显示缩放比例。对于高分辨率显示器，如果按一逻辑像素对应一物理像素呈现，一切都会太小，因此会为每个逻辑像素使用更多物理像素。两者的比例就是设备缩放因子。原文举例：ChromeOS 常见值为 1 或 2，Windows 常见值介于 1 和 2 之间。
