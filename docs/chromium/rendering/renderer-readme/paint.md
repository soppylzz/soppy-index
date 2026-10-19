> 英文原文：[Chromium 来源](https://chromium.googlesource.com/chromium/src/+/f5a9dd28d9af3a5450afb58ac199223fc6b49976/third_party/blink/renderer/core/paint/README.md)。对应本地源码提交 `f5a9dd28d9af`（2026-09-12）；翻译日期：2026-10-09。代码、标识符及源码注释保留原样，译者补充以“译注”标识。

<!---
  The live version of this document can be viewed at:
  https://chromium.googlesource.com/chromium/src/+/main/third_party/blink/renderer/core/paint/README.md
-->

<a id="renderercorepaint"></a>

# renderer/core/paint

本目录把 `LayoutObject` 树转换为供合成器高效使用的渲染格式：包含 display item 列表的 `cc::Layer` 列表，以及相应的 `cc::PropertyTree`。整体介绍见[概述](#Overview)。Display list 与绘制属性树的实现见 [platform paint README](https://chromium.googlesource.com/chromium/src/+/f5a9dd28d9af3a5450afb58ac199223fc6b49976/third_party/blink/renderer/platform/graphics/paint/README.md)。代码由 [rendering 团队](https://www.chromium.org/teams/rendering)维护。

- [术语](#glossaries)
  - [参与层叠排序的元素与层叠上下文](#stacked-elements-and-stacking-contexts)
  - [其他术语](#other-glossaries)
- [概述](#overview)
  - [合成算法](#compositing-algorithm)
- [PrePaint](#prepaint)
  - [绘制失效](#paint-invalidation)
    - [文字的绘制失效](#paint-invalidation-of-text)
    - [::first-line 的特殊性](#specialty-of-first-line)
  - [构建绘制属性树](#building-paint-property-trees)
    - [Fragment（布局片段）](#fragments)
- [Paint](#paint)
  - [绘制结果缓存](#paint-result-caching)
    - [Display item 缓存](#display-item-caching)
    - [子序列缓存](#subsequence-caching)
  - [空绘制阶段优化](#empty-paint-phase-optimization)
  - [属性树更新优化](#property-tree-update-optimization)
  - [记录命中测试信息](#hit-test-information-recording)
  - [滚动条绘制](#scrollbar-painting)
- [HTML-in-Canvas](#html-in-canvas)
  - [层叠与布局](#stacking-and-layout)
  - [Canvas Transform](#canvas-transform)
  - [绘制](#painting)
  - [合成与图层划分](#compositing-and-layerization)
  - [嵌套 HTML-in-Canvas](#nested-html-in-canvas)
- [像素对齐与模糊](#pixel-snapping-and-bluriness)

<a id="glossaries"></a>

## 术语

<a id="stacked-elements-and-stacking-contexts"></a>

### 参与层叠排序的元素与层叠上下文

本节主要解释 [CSS 2.1 附录 E：层叠上下文的详细说明](http://www.w3.org/TR/CSS21/zindex.html)。为了与规范一致，本节使用 element，其他章节使用 object。

绘制时，元素分为以下几类。

**参与层叠排序的对象（stacked object）**在 stacking context 内按 z 顺序排列，包括：

- 真正的 stacking context：具有非 auto 的 z-index，或 transform、opacity、blend-mode 等影响层叠属性的元素。
- 普通流中形成层叠的替换元素：没有非 auto 的 z-index，但为内部元素形成 stacking context 的[替换元素](https://html.spec.whatwg.org/C/#replaced-elements)，例如 SVG `<foreignObject>`、HTML `<video>`。与普通 stacking context 的区别是，它们在 foreground 阶段绘制，而非 positioned descendants 阶段。
- 不是真正 stacking context，但绘制时被当作 stacking context、又不管理其他 stacked 元素的对象，即 `z-index:auto` 的定位元素（规范 E.2.8）。其 z 顺序由真正的 stacking context 管理。由于排序时 `z-index:auto` 和 `z-index:0` 等价，并可能按 DOM 顺序交错，它们也必须作为 stacked element 由外层上下文管理。但其 stacked 后代不由自身管理，而由其父 stacking context 管理。

Stacked element 不是规范正式术语，本文用它统称参与 stacking context 中 z-index 排序的元素。实现上，它由关联 `PaintLayer` 的 `PaintLayerStackingNode` 表示，作为 self-painting PaintLayer，由 `PaintLayerPainter` 执行规范中的整套绘制步骤。对于那些不管理 stacked 后代的对象，后代由外层 stacking context 负责。

**不参与层叠排序的伪层叠上下文**本身不是 stacked，但像建立了 stacking context 一样绘制后代，排除 stacked 内容。它们包括 inline-block、inline-table、行内替换元素（E.2.7.2.1.4），非定位浮动元素（E.2.5），[flex item](http://www.w3.org/TR/css-flexbox-1/#painting)、[grid item](http://www.w3.org/TR/css-grid-1/#z-order) 及自定义滚动条部件。

这些对象由 `ObjectPainter::PaintAllPhasesAtomically()` 执行整套绘制步骤，但跳过定位或具有非 auto z-index 的后代，具体通过跳过具有 self-painting layer 的后代实现。

剩余一类是其他普通元素。

> 译注：这部分术语解释依赖元素类别和属性组合，例如非定位普通块设置 z-index 并不自动形成层叠上下文。原文对“不管理后代”类型的序数引用存在歧义，此处按前面的行为描述表达。

<a id="other-glossaries"></a>

### 其他术语

- [`PaintLayer`](https://chromium.googlesource.com/chromium/src/+/f5a9dd28d9af3a5450afb58ac199223fc6b49976/third_party/blink/renderer/core/paint/paint_layer.h)：Blink 的历史实现细节，用来代表部分布局对象，处理绘制、命中测试等操作。原文表示希望未来移除此类，更多信息见类注释。
- Painting container：`PaintLayer` 在绘制顺序中的父级。对于 stacked layer，是形成包含它的 stacking context 的祖先；否则就是父 layer。
- Painting container chain：从一个 PaintLayer 到 frame 或 page 根之间的 painting container 链，终点取决于是否跨越 frame 边界。
- Visual rect：[display item](https://chromium.googlesource.com/chromium/src/+/f5a9dd28d9af3a5450afb58ac199223fc6b49976/third_party/blink/renderer/platform/graphics/paint/README.md#display-items) 将绘制的全部像素的包围盒，位于其所属 transform 属性节点的坐标空间，在 paint 时逐项计算。见[构建属性树](#building-paint-property-trees)。
- Isolation node / boundary：在某些情况下，可建立一道边界，使子树不受祖先变化影响。属性树中以 isolation node 实现，作为后代属性节点的根。原文中 `contain:paint` 建立这种边界。
- Local property tree state：每个 fragment 对应的 `PropertyTreeState`。所有 fragment 都有明确定义的局部状态，常缓存在 `FragmentData` 的 `LocalBorderBoxProperties` 中；部分 FragmentData 不保存该对象，只是内存优化。

<a id="overview"></a> <a id="Overview"></a>

## 概述

主要职责是将布局输出的 `LayoutObject` 树转为合成器输入，即包含 display item 的 `cc::Layer` 列表和关联 `cc::PropertyNode`。

该过程跨两个文档生命周期阶段：

- [PrePaint](#PrePaint)，`kInPrePaint`：执行[绘制失效](#Paint-invalidation)，让需要重绘的 display item 失效；[构建绘制属性树](#Building-paint-property-trees)。
- [Paint](#Paint)，`kInPaint`：遍历 LayoutObject 树生成 display item 列表，将共享属性树状态的连续项目分为 paint chunk；然后提交给合成器，根据 chunk 决定创建哪些 cc layer，将 chunk 放入 layer 列表，并把 Blink 属性节点转换为 cc 属性节点。

如何输出绘制、合成数据结构以供调试，见 [Debugging blink objects](https://docs.google.com/document/d/1vgQY11pxRQUDAufxSsc2xKyQCKGPftZ5wZnjY2El4w8/view)。

<a id="compositing-algorithm"></a>

### 合成算法

Pre-paint 生成属性树。Paint 时，每个 display item 关联一个属性树状态，相邻且状态相同的项目组成 `PaintChunk`。随后 `PaintArtifactCompositor` 对 chunk 列表进行 layerization，即划分合成图层。

参与合成的属性节点转换为 cc 属性节点；不参与合成的节点由 `PaintChunksToCcLayer` 转为描述状态操作的 meta display item。

```
from layout
  |
  v
+------------------------------+
| LayoutObject/PaintLayer tree |
+------------------------------+
  |     |
  |     | PrePaintTreeWalk::Walk()
  |     |   PaintPropertyTreeBuider::UpdatePropertiesForSelf()
  |     v
  |   +--------------------------------+
  |<--|         Property trees         |
  |   +--------------------------------+
  |                                  |
  | LocalFrameView::PaintTree()      |
  |   FramePainter::Paint()          |
  |     PaintLayerPainter::Paint()   |
  |       ObjectPainter::Paint()     |
  v                                  |
+---------------------------------+  |
| DisplayItemList/PaintChunk list |  |
+---------------------------------+  |
  |                                  |
  |<---------------------------------+
  | LocalFrameView::PushPaintArtifactToCompositor()
  |   PaintArtifactCompositor::Update()
  |
  +---+---------------------------------+
  |   v                                 |
  | +----------------------+            |
  | | Chunk list for layer |            |
  | +----------------------+            |
  |   |                                 |
  |   | PaintChunksToCcLayer::Convert() |
  v   v                                 v
+----------------+ +-----------------------+
| cc::Layer list | |   cc property trees   |
+----------------+ +-----------------------+
  |                  |
  +------------------+
  | to compositor
  v
```

相关数据结构的调试方法仍见 [Debugging blink objects](https://docs.google.com/document/d/1vgQY11pxRQUDAufxSsc2xKyQCKGPftZ5wZnjY2El4w8/view)。

<a id="prepaint"></a> <a id="PrePaint"></a>

## PrePaint

[`PrePaintTreeWalk`](https://chromium.googlesource.com/chromium/src/+/f5a9dd28d9af3a5450afb58ac199223fc6b49976/third_party/blink/renderer/core/paint/pre_paint_tree_walk.h) 在 `InPrePaint` 生命周期状态中，从根 FrameView 开始、跨 frame 边界遍历布局树。遍历遵循树中顺序，以高效计算 DOM 顺序相关的层级关系，例如父包含块。

它的两个主要目标是[绘制失效](#Paint-invalidation)和[构建绘制属性树](#Building-paint-property-trees)。

<a id="paint-invalidation"></a> <a id="Paint-invalidation"></a>

### 绘制失效

[`PaintInvalidator`](https://chromium.googlesource.com/chromium/src/+/f5a9dd28d9af3a5450afb58ac199223fc6b49976/third_party/blink/renderer/core/paint/paint_invalidator.h) 标记需要产生不同于缓存结果的绘制内容。

PrePaint 之前，样式、布局、合成变化等会为对象标记“需要检查绘制失效”。PrePaint 中以先序、跨 frame 方式遍历标记过的子树和对象，让将生成不同 display item 的 client 失效。

遍历开始时，为根 `LayoutView` 创建根 `PaintInvalidatorContext`；之后每访问一个对象，都基于父级传来的 context 创建自己的 context，跟踪将启动当前对象绘制的 painting layer。

`PaintInvalidator` 初始化当前对象的 context，然后调用 `LayoutObject::InvalidatePaint()`，再由对象自己的 invalidator，例如 `BoxPaintInvalidator`，完成失效处理。

<a id="paint-invalidation-of-text"></a>

#### 文字的绘制失效

`TextFragmentPainter` 绘制文字，以 `FragmentItem::GetDisplayItemClient()` 返回的、所属的 `LayoutText` 或 `LayoutInline` 为 client。绘制将改变时，应像其他 LayoutObject 一样使这些 client 失效。

<a id="specialty-of-first-line"></a>

#### ::first-line 的特殊性

`::first-line` 伪样式动态应用于块首行的全部 FragmentItem，实际样式由 first-line 样式与其他适用样式组合计算。

首行包含 LayoutInline 时，会组合 first-line 与 inline 的样式，只应用到 inline 的首行部分。Blink 以 `kPseudoIdFirstLineInherited` 标识这一组合样式。

普通文字失效机制不适用于首行：`ComputedStyle::VisualInvalidationDiff()` 检测不到首行样式变化，而且普通失效以整个 LayoutObject 为单位，不感知首行。因此有专用路径：首行计算样式改变时，样式系统通过 `LayoutObject::ApplyFirstLineChanges()` 通知布局系统，使所有参与首行的 LayoutObject 失效。

<a id="building-paint-property-trees"></a> <a id="Building-paint-property-trees"></a>

### 构建绘制属性树

[`PaintPropertyTreeBuilder`](https://chromium.googlesource.com/chromium/src/+/f5a9dd28d9af3a5450afb58ac199223fc6b49976/third_party/blink/renderer/core/paint/paint_property_tree_builder.h) 负责构建属性树，概念见 [platform paint README](https://chromium.googlesource.com/chromium/src/+/f5a9dd28d9af3a5450afb58ac199223fc6b49976/third_party/blink/renderer/platform/graphics/paint/README.md#Paint-properties)。

每个 PaintLayer 的 LayoutObject 有一个或多个 FragmentData。如果 fragment 引入属性节点，就持有 `ObjectPaintProperties`。例如对象有 transform 时，`ObjectPaintProperties::Transform()` 指向代表该变换的 `TransformPaintPropertyNode`。

LayoutObject 的 `NeedsPaintPropertyUpdate`、`SubtreeNeedsPaintPropertyUpdate`、`DescendantNeedsPaintPropertyUpdate` 脏标记控制每次 PrePaintTreeWalk 遍历多少布局树。

某些标记会在隔离边界清除。例如增删属性节点改变树拓扑时，后代可能要引用新的父节点，因此通常强制遍历整个子树。但隔离边界下，后代能够引用的最高层节点就是边界元素自身建立的 isolation node，因此可知其内部无需因外部变化而更新。

实现上，隔离边界使用 clip、transform、effect 树中的 alias node；它们本身不贡献绘制结果，只作为子树节点的父节点。Alias node 与 isolation node 在此同义。这些节点放在元素常规属性节点之下，因此隔离的是元素子树，而非元素自身对祖先变化的响应。

示例树：

```
                        +----------------------+
                        | 1. Root LayoutObject |
                        +----------------------+
                          /                  \
           +-----------------+            +-----------------+
           | 2. LayoutObject |            | 3. LayoutObject |
           +-----------------+            +-----------------+
             /                              /             \
  +-----------------+          +-----------------+    +-----------------+
  | 4. LayoutObject |          | 5. LayoutObject |    | 6. LayoutObject |
  +-----------------+          +-----------------+    +-----------------+
                                 /             \
                   +-----------------+     +-----------------+
                   | 7. LayoutObject |     | 8. LayoutObject |
                   +-----------------+     +-----------------+
```

假设元素 3 新增 `transform:translateX(10px)`，通常按深度优先执行：

1. 根 1 因后代需更新而被访问。
2. 访问 2，但它无需更新，所以不继续访问 4。
3. 访问 3，添加 transform 属性节点，并标记全部子树需要更新。
4. 按 5、7、8、6 顺序访问。5、6 的 transform 改为以 3 的 transform 为父节点；7、8 虽被访问和更新，但结果未改变。

如果 5 具有 `contain:paint`，前半过程相同。更新 5 的父 transform 引用后，在隔离边界忽略强制子树更新标记，不再访问 7、8；6 仍按原方式更新。

并非所有子树遍历都能在隔离边界停止，具体见 [`PaintPropertyTreeBuilder`](https://chromium.googlesource.com/chromium/src/+/f5a9dd28d9af3a5450afb58ac199223fc6b49976/third_party/blink/renderer/core/paint/paint_property_tree_builder.h) 中 `IsolationPiercing` 与 `IsolationBlocked` 更新原因。

<a id="fragments"></a>

#### Fragment（布局片段）

没有多列或分页时，LayoutObject 与 FragmentData 一一对应；存在多列、分页时可能有多个 FragmentData。如果 LayoutObject 引入属性节点，每个 fragment 都有一个，对应父节点来自同一列中祖先 LayoutObject 的 fragment。

例如三列布局中，父子对象都有 transform，则父子各有三个 FragmentData，每个都有自己的 TransformPaintPropertyNode；子对象第 i 个 fragment 的 transform 指向父对象第 i 个 fragment 的 transform。

每个 FragmentData 都有自己的 `ClipPaintPropertyNode`，并存储独立的 `PaintOffset`、`PaginationOffset` 和 `LocalBorderBoxProperties`。

<a id="paint"></a> <a id="Paint"></a>

## Paint

在一个 PaintLayer 内，按绘制顺序遍历 PhysicalFragment 树，生成 display item 列表。实现采用静态 painter 类，例如 [`BoxFragmentPainter`](https://chromium.googlesource.com/chromium/src/+/f5a9dd28d9af3a5450afb58ac199223fc6b49976/third_party/blink/renderer/core/paint/box_fragment_painter.cc)，将项目加入 [`PaintController`](https://chromium.googlesource.com/chromium/src/+/f5a9dd28d9af3a5450afb58ac199223fc6b49976/third_party/blink/renderer/platform/graphics/paint/paint_controller.h)。整个 LocalFrameView 只有一个 PaintController。

遍历中维护当前属性树状态，见 `PaintController::UpdateCurrentPaintChunkProperties`。PaintController 将连续且共享状态的 display item 分组成 [`PaintChunk`](https://chromium.googlesource.com/chromium/src/+/f5a9dd28d9af3a5450afb58ac199223fc6b49976/third_party/blink/renderer/platform/graphics/paint/paint_chunk.h)。

<a id="paint-result-caching"></a>

### 绘制结果缓存

PaintController 缓存上一次绘制的 display item。若某个 painter 将产生相同结果，则跳过绘制，复用缓存。

<a id="display-item-caching"></a>

#### Display item 缓存

如果将创建的 `DrawingDisplayItem` 与上次完全相同，就直接复用旧项目。

<a id="subsequence-caching"></a>

#### 子序列缓存

可行时，在 `PaintLayerPainter::PaintContents()` 创建作用域内的 `SubsequenceRecorder`，将其中生成的所有 display item 记为 subsequence。若确定 layer 将产生与上次完全相同的项目，就整体复用缓存子序列。

是否创建子序列、是否可复用受多项条件影响，见原文所指 `PaintLayerPainter.cpp` 中的 `ShouldCreateSubsequence()`、`shouldRepaintSubsequence()`。

<a id="empty-paint-phase-optimization"></a>

### 空绘制阶段优化

多个 paint phase 会多次遍历布局树。如果某 layer 在某阶段没有内容，可跳过这一遍历。原文已优化 `PaintPhaseDescendantOutlinesOnly`、`PaintPhaseFloat`。

Paint invalidation 时，如果对象有某阶段需绘制的内容，则在所属 self-painting layer 设置 `NeedsPaintPhaseXXX`。Paint 时先检查标记，未设置就跳过。

Layer 结构变化但未触发变化子树绘制失效时，需手动更新这些标记。例如样式变化新建 self-painting layer 时，将外层 self-painting layer 的阶段标记复制过来，保守假定新 layer 需要相同阶段。

<a id="property-tree-update-optimization"></a>

### 属性树更新优化

某些样式更新可直接修改属性树，不必运行需要遍历布局树的 builder。`PaintLayer::StyleDidChange` 检查是否符合快速更新条件，若符合则加入待更新列表。不能立即执行，否则无法正确检测 paint offset 的变化。

更新稍后在 `PrePaintTreeWalk::WalkTree` 执行。如果 pre-paint 遍历到一个有待更新项的节点，则将其标记为需要完整更新，并从待更新列表移除。

对象进入 display-locked 状态，或结束 forced scope 而实际锁定时，会移除该文档全部待执行 opacity 更新。理论上只需移除锁定范围内对象的更新，但判断成本太高，因此全部清除。

当前优化检查适用于 transform 和 opacity 更新。

<a id="hit-test-information-recording"></a>

### 记录命中测试信息

命中测试遵循绘制顺序，因此复用绘制系统，在绘制背景时记录相关信息，供合成器执行 cc 侧命中测试。即使没有可绘制内容，也记录这些信息。

1. Paint chunk bounds：扩展当前 chunk 的边界，确保包含可命中区域。
2. [`HitTestData::touch_action_rects`](https://chromium.googlesource.com/chromium/src/+/f5a9dd28d9af3a5450afb58ac199223fc6b49976/third_party/blink/renderer/platform/graphics/paint/hit_test_data.h)：记录[允许特定手势的区域](http://docs.google.com/document/u/1/d/1ksiqEPkDeDuI_l5HvWlq1MfzFyDxSnsNB8YXIaXa3sE/view)，以及因阻塞式 touch handler 而不能直接处理触摸的区域。
3. [`HitTestData::wheel_event_rects`](https://chromium.googlesource.com/chromium/src/+/f5a9dd28d9af3a5450afb58ac199223fc6b49976/third_party/blink/renderer/platform/graphics/paint/hit_test_data.h)：记录因阻塞式 wheel handler 而不能直接执行默认处理的[区域](https://docs.google.com/document/d/1ar4WhVnLA-fmw6atgP-23iq-ys_NfFoGb3LA5AgaylA/view)。
4. [`scroll_translation`](https://chromium.googlesource.com/chromium/src/+/f5a9dd28d9af3a5450afb58ac199223fc6b49976/third_party/blink/renderer/platform/graphics/paint/hit_test_data.h) 与 [`scroll_hit_test_rect`](https://chromium.googlesource.com/chromium/src/+/f5a9dd28d9af3a5450afb58ac199223fc6b49976/third_party/blink/renderer/platform/graphics/paint/hit_test_data.h)：创建主线程滚动命中区域，旧称 [non-fast scrollable region](https://docs.google.com/document/d/1IyYJ6bVF7KZq96b_s5NrAzGtVoBXn_LQnya9y4yT3iw/view)，迫使命中透明性混合的非合成滚动容器、非合成滚动条和 resize handle 在主线程做命中测试。`scroll_translation` 非空时，还可在需合成滚动时强制创建标记为可滚动的特殊 cc layer。
5. [Hit-test opaqueness](https://chromium.googlesource.com/chromium/src/+/f5a9dd28d9af3a5450afb58ac199223fc6b49976/cc/input/hit_test_opaqueness.h)：表示能否可靠地直接命中某 chunk，或忽略它。Layerization 时，[paint artifact compositor](https://chromium.googlesource.com/chromium/src/+/f5a9dd28d9af3a5450afb58ac199223fc6b49976/third_party/blink/renderer/platform/graphics/paint/README.md#paint-artifact-compositor) 把 chunk 的命中透明性汇总到 cc layer，cc 再结合主线程滚动命中区域决定由合成器还是主线程处理。
6. [`HitTestData::xr_regions`](https://chromium.googlesource.com/chromium/src/+/f5a9dd28d9af3a5450afb58ac199223fc6b49976/third_party/blink/renderer/platform/graphics/paint/hit_test_data.h)：Android XR 用它跟踪页面目标的命中、绘制顺序。为了保护眼动输入隐私，系统绘制可交互元素的 hover 效果，因此需要元素信息及其层叠关系。

<a id="scrollbar-painting"></a>

### 滚动条绘制

非自定义滚动条会生成 [`ScrollbarDisplayItem`](https://chromium.googlesource.com/chromium/src/+/f5a9dd28d9af3a5450afb58ac199223fc6b49976/third_party/blink/renderer/platform/graphics/paint/scrollbar_display_item.h)，包含 [`cc::Scrollbar`](https://chromium.googlesource.com/chromium/src/+/f5a9dd28d9af3a5450afb58ac199223fc6b49976/cc/input/scrollbar.h) 以及生成 paint record 或 cc 滚动条图层所需的信息。

PaintArtifactCompositor 更新时决定是否合成滚动条。若不合成，就实际绘制为 paint record；否则根据类型创建 `cc::SolidColorScrollbarLayer`、`cc::PaintedScrollbarLayer` 或 `cc::PaintedOverlayScrollbarLayer`。自定义滚动条仍直接绘制为 drawing display item。

<a id="html-in-canvas"></a>

## HTML-in-Canvas

这是由 `CanvasDrawElement` 运行时 feature flag 控制的功能。它允许通过 `drawElementImage()`，或类似 WebGL / WebGPU API，将 `<canvas>` 的 DOM 后代子树绘制到具有 `layoutsubtree` 属性的 canvas 中，同时保留布局、命中测试、无障碍等浏览器能力。见 [explainer](https://github.com/WICG/html-in-canvas)。

> 译注：这里描述所收录源码中的功能与开关，不表示该 API 已成为通用标准或在稳定版默认可用。

<a id="stacking-and-layout"></a>

### 层叠与布局

- `layoutsubtree` 使 canvas 后代参与布局。`StyleAdjuster::AdjustStyleForDisplay` 将直接子元素块化并设为 static 定位。带 `drawable` 的后代，以及迁移期间的直接子元素，在 `StyleAdjuster::AdjustComputedStyle` 中隐含 `isolation:isolate`，并经 `LayoutObject::ComputeIsFixedContainer` 为 fixed、absolute 后代建立包含块。
- Element 提供 `IsCanvasOrInCanvasSubtree()`、`IsInCanvasSubtree()` 判断是否参与此功能；`CanvasForDrawing()` 获取 drawable 元素对应的 canvas。

<a id="canvas-transform"></a>

### Canvas Transform

- `HTMLCanvasElement.getElementTransform()` 返回将元素应用 CSS transform 前的 border box 映射到 canvas 坐标空间的变换。通过 `canvas.updateElementGeometry(element, { canvasTransform })` 设置，或由 `drawElementImage()` 自动设置；通过 `canvas.clearElementGeometry(element)` 清除。
- 存在 canvas transform 时，`PaintLayer::UpdateTransform()` 将它前置拼接到 CSS transform 之前。
- 属性树在 `AnchorPositionScrollTranslation` 与 `Translate` 之间插入 `ElementCanvasTransform` 节点，使 GeometryMapper 在 CSS transform 之前应用 canvas transform。

<a id="painting"></a>

### 绘制

- `PaintLayerPainter::PaintChildren` 绘制 layoutsubtree canvas 子元素时，使用 `PaintFlag::kOmitCompositingInfo` 阻止后代合成，使用 `PaintFlag::kPrivacyPreserving` 防止绘制或失效过程中泄漏跨源 iframe / 图片、已访问链接、拼写标记、系统主题等敏感信息。
- 未指定 layoutsubtree 时，PaintChildren 提前返回，不渲染 canvas fallback 内容。
- HTMLCanvasElement 按绘制顺序保存已绘制后代列表。命中测试到达 canvas 的 PaintLayer 时逆序遍历，最后绘制者先测试。设计上跳过后代与 canvas 之间的层级，因此中间 clip 不会阻止命中后代。

<a id="compositing-and-layerization"></a>

### 合成与图层划分

- `CompositingReasonFinder::DirectReasonsForPaintProperties` 为 drawable 元素指定 `CompositingReason::kCanvasChild`，强制生成 `EffectPaintPropertyNode`，见 `RequiresCompositingForCanvasChild()`，最终为每个 canvas child 创建 cc layer。其 `DrawsContent()` 为 false，所以参与命中测试但不直接渲染。
- Canvas drawable 元素下方的内容禁用合成图层，嵌套 layoutsubtree canvas 的直接子元素除外。这让完整内容保留在 canvas child 的 cc layer 中，供 `ContentLayerClientImpl::GetCanvasChildPaintRecord` 使用，也避免额外图层直接渲染。

<a id="nested-html-in-canvas"></a>

### 嵌套 HTML-in-Canvas

Layoutsubtree canvas 可以嵌套，需要合成、绘制、事件分派协作：

- 通常抑制 canvas child 后代合成，但嵌套 canvas 的直接子元素仍获得 `kCanvasChild`，嵌套 canvas 本身的合成则被抑制。
- 为先更新内部 canvas 再由外部绘制，`RunCanvasOnpaintSteps` 跨 frame 按文档逆序、文档内按树逆序触发 paint 事件。
- `HTMLCanvasPainter::PaintReplaced` 绘制嵌套 canvas 时，录制带其 `DOMNodeId` 的 `cc::CustomDataOp` 占位符。
- Layerization 时，`PaintArtifactCompositor::GetCanvasChildPaintRecord` 使用在 `LocalFrameView::PushPaintArtifactToCompositor` 初始化的 `GetCanvasSnapshotCallback` 获取内部 canvas 的非加速快照，再以 `cc::PaintRecord::ReplaceCustomData` 将全部占位符替换为实际渲染的 PaintRecord 快照。

<a id="pixel-snapping-and-bluriness"></a>

## 像素对齐与模糊

绘制未对齐屏幕像素时可能模糊。Chromium 几乎在渲染的每个阶段，都尽可能或在必要时对齐像素。相关文档和问题链接见[此文档](https://docs.google.com/document/d/14qWYuGOJRELueTORi2ais5BIJGdo8HADXe07BjjThIs/edit)。

> 译注：原文指向 `cc/input/hit_test_opaqueness.h`、`cc/input/scrollbar.h` 的相对路径层级有误，中文版本已按本地源码核对并修正。
