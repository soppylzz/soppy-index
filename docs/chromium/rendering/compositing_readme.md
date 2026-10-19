> 英文原文：[Chromium 来源](https://chromium.googlesource.com/chromium/src/+/f5a9dd28d9af3a5450afb58ac199223fc6b49976/third_party/blink/renderer/platform/graphics/compositing/README.md)。对应本地源码提交 `f5a9dd28d9af`（2026-09-12）；翻译日期：2026-10-09。代码、标识符及源码注释保留原样，译者补充以“译注”标识。

<a id="sourceplatformgraphicscompositing"></a>

# `Source/platform/graphics/compositing`

本目录包含“Blink 合成算法”的实现。

这部分代码由 [paint 团队][paint-team-site]维护。

[paint-team-site]: https://www.chromium.org/teams/paint-team

本文介绍逐步发展中的 CAP 架构，而非它所替代的 SPv1 架构。

> 译注：这里保留原文的历史架构语境与旧目录名称；它描述的是这份设计说明中的算法，不代表所有版本实现细节均相同。

<a id="blink-compositing-algorithm"></a>

## Blink 合成算法

设计文档：goo.gl/6xP8Oe。

输入：`PaintArtifact`。输出：`cc::Layer` 对象列表和 `cc::PropertyTree` 属性树。

算法遍历 `PaintArtifact` 中的 `PaintChunk` 列表。当一个 `PaintChunk` 无法并入已有 `cc::Layer` 时，分配新的 `cc::Layer`。无法合并的原因包括：

1. `PaintChunk` 需要外部图层（见下文）。
2. `PaintChunk` 的 `PropertyTreeState` 上存在不兼容的直接合成原因，导致它无法并入任何已有图层。
3. `PaintChunk` 与一个更早绘制的 `cc::Layer` 重叠，且由于原因 2 无法并入该层；同时，在更晚绘制的图层中，也没有不受原因 1 和 2 限制、可供合并的 `cc::Layer`。

最坏情况下算法的时间复杂度为 `O(n^2)`，其中 `n` 是 `PaintChunk` 的数量。

当前，只要属性树节点被任意 `PaintChunk` 引用，就会复制到对应的 `cc::PropertyTree` 节点中，无论上述算法是否要求保留该节点。

<a id="flattening-property-tree-nodes"></a>

### 扁平化属性树节点

能够并入已有 `cc::Layer` 的 `PaintChunk`，其 `PropertyTreeState` 仍可能与该图层不同。此时，需要将两者状态之间有差异的节点“扁平化”。具体做法是输出成对的 display item，在消费 `PaintChunk` 时，将其属性树状态调整到当前状态。见 [`ConversionContext::Convert`](https://chromium.googlesource.com/chromium/src/+/f5a9dd28d9af3a5450afb58ac199223fc6b49976/third_party/blink/renderer/platform/graphics/compositing/paint_chunks_to_cc_layer.cc)。

<a id="foreign-layers"></a>

### 外部图层

一些 `PaintChunk` 的内容需要外部图层，即由本模块之外的代码管理的图层。例如参与合成的视频，以及 2D、3D（WebGL）canvas。

<a id="raster-invalidations"></a>

### 栅格化失效

`PaintChunk` 上的栅格化失效区域也会映射到其底层 `cc::Layer` 的坐标空间。

> 译注：原文的 `compositing/PaintChunksToCcLayer.cpp` 路径已经失效。上文源码链接已更新为本次快照中实际包含 `ConversionContext::Convert` 的 `paint_chunks_to_cc_layer.cc`，不表示旧文档的全部算法描述已与新实现逐行核对。
