> 英文原文：[Chromium 来源](https://chromium.googlesource.com/chromium/src/+/f5a9dd28d9af3a5450afb58ac199223fc6b49976/third_party/blink/renderer/core/layout/README.md)。对应本地源码提交 `f5a9dd28d9af`（2026-09-12）；翻译日期：2026-10-09。代码、标识符及源码注释保留原样，译者补充以“译注”标识。

<!---
  The live version of this document can be viewed at:
  https://chromium.googlesource.com/chromium/src/+/main/third_party/blink/renderer/core/layout/README.md
-->

<a id="blink-layout"></a>

# Blink 布局

`renderer/core/layout` 包含布局对象的实现，覆盖文档生命周期中的以下状态：

- LayoutSubtreeChange：`InLayoutSubtreeChange`、`LayoutSubtreeChangeClean`。
- PreLayout：`InPreLayout`。
- PerformLayout：`InPerformLayout`。
- AfterPerformLayout：`AfterPerformLayout`、`LayoutClean`。

实现细节见 [LayoutNG](https://chromium.googlesource.com/chromium/src/+/f5a9dd28d9af3a5450afb58ac199223fc6b49976/third_party/blink/renderer/core/layout/layout_ng.md)。代码由 [layout 团队](http://dev.chromium.org/teams/layout-team)维护。

<a id="box-model"></a>

## 盒模型

[CSS 盒模型](https://www.w3.org/TR/css-box-3/#the-css-box-model)由嵌套盒组成，从外到内为 margin box、border box（`LayoutBox` 的主要坐标空间）、padding box（也称 client box）、content box。

依据 [css-overflow-3](https://www.w3.org/TR/css-overflow-3/#scrollbar-layout)，非覆盖式滚动条应插入 border 内边缘与 padding 外边缘之间。下面在规范图示基础上加入了滚动条：

        |-------------------------------------------------|
        |                                                 |
        |                  margin-top                     |
        |                                                 |
        |    |---------------------------------------|    |
        |    |                                       |    |
        |    |             border-top                |    |
        |    |                                       |    |
        |    |    |--------------------------|--|    |    |
        |    |    |                          |  |    |    |
        |    |    |       padding-top        |##|    |    |
        |    |    |                          |##|    |    |
        |    |    |    |----------------|    |##|    |    |
        |    |    |    |                |    |  |    |    |
        | ML | BL | PL |  content box   | PR |SW| BR | MR |
        |    |    |    |                |    |  |    |    |
        |    |    |    |----------------|    |  |    |    |
        |    |    |                          |  |    |    |
        |    |    |      padding-bottom      |  |    |    |
        |    |    |                          |  |    |    |
        |    |    |--------------------------|--|    |    |
        |    |    |     scrollbar height ####|SC|    |    |
        |    |    |-----------------------------|    |    |
        |    |                                       |    |
        |    |           border-bottom               |    |
        |    |                                       |    |
        |    |---------------------------------------|    |
        |                                                 |
        |                margin-bottom                    |
        |                                                 |
        |-------------------------------------------------|

        BL = border-left
        BR = border-right
        ML = margin-left
        MR = margin-right
        PL = padding-left
        PR = padding-right
        SC = scroll corner
        SW = scrollbar width

在水平书写、从右向左的方向中，垂直滚动条若存在，会位于左侧。水平滚动条若存在，则始终位于底部。

<a id="scroll-origin-vs-offset-vs-position"></a>

## 滚动原点、偏移与位置

`LayoutBox` 存在可滚动溢出时，会关联一个 `PaintLayerScrollableArea`。当盒滚动到内容起点时，scroll origin 表示 content rect（可见内容部分）的左上角，在以 overflow rect 左上角为原点的坐标系中的位置。

对于从左到右、从上到下流动的内容，scroll origin 为 `(0, 0)`，即滚动到开头时，content rect 和 overflow rect 左上角重合。

对于从右到左流动的内容，包括 `direction:ltr` 下的 `writing-mode:vertical-rl`、`flex-direction:row-reverse` 等情况，原点的 x 坐标为正。对于从下到上流动的内容，原文举例 `flex-direction:column-reverse` 及垂直书写模式结合 `direction:ltr`，原点的 y 坐标为正。

> 译注：这里按原文保留示例，但不能仅凭单个属性判断滚动方向。具体还取决于主轴、交叉轴和溢出方向；原文这组属性组合应结合后面的示意图和实际版本核对。

`scrollOffset`（或 offset）表示滚动视口相对“滚到内容开头时位置”的位移，类型是 `ScrollOffset`。`scrollPosition`（或 position）则表示 overflow rect 坐标系中的点，类型为 `gfx::PointF`。

示意图：

- [从左到右、从上到下](https://raw.githubusercontent.com/chromium/chromium/f5a9dd28d9af3a5450afb58ac199223fc6b49976/third_party/blink/renderer/core/layout/doc/ltr-tb-scroll.png)
- [从右到左、从下到上](https://raw.githubusercontent.com/chromium/chromium/f5a9dd28d9af3a5450afb58ac199223fc6b49976/third_party/blink/renderer/core/layout/doc/rtl-bt-scroll.png)
- [从右到左、从上到下](https://raw.githubusercontent.com/chromium/chromium/f5a9dd28d9af3a5450afb58ac199223fc6b49976/third_party/blink/renderer/core/layout/doc/rtl-tb-scroll.png)

计算 scroll origin 时，若盒从右向左布局，且存在正交方向的滚动条，例如 `direction:rtl` 块中的垂直滚动条，需要将其尺寸计入。以下两个例子表明，无论垂直滚动条位于左侧还是右侧都一样，`|/|` 表示滚动条：

                                   content
                                     rect
                                 |<-------->|
                        scroll
                        origin
                    |----------->|
                     _______________________
                    |          |/|          |
                    |          |/|          |
                    |          |/|          |
    direction:rtl   |          |/|   box    |
                    |          |/|          |
                    |          |/|          |
                    |__________|/|__________|

                          overflow rect
                    |<--------------------->|

                                   content
                                     rect
                                 |<-------->|
                        scroll
                        origin
                    |----------->|
                     _________________________
                    |            |          |/|
                    |            |          |/|
                    |            |          |/|
    writing-mode:   |            |    box   |/|
      vertical-rl   |            |          |/|
                    |            |          |/|
                    |____________|__________|/|

                          overflow rect
                    |<--------------------->|

<a id="coordinate-spaces"></a>

## 坐标空间

布局与绘制频繁使用四种坐标空间，实际可理解为两类坐标及其变体：

- Physical coordinates（物理坐标）：对应屏幕、打印页等输出的物理方向，通常用于绘制，因此向绘制提供数据的布局逻辑也可能产生这类值。CSS 的 `top`、`right`、`bottom`、`left` 属于此空间。
- Logical coordinates（逻辑坐标）：布局使用的通用定位方式，适配不同 `writing-mode`、`direction`。以 `before`、`after`、`start`、`end` 命名的属性属于此空间，分别也称 logical top、bottom、left、right。
- 不翻转行内方向的逻辑坐标：即不考虑文字方向的 logical block coordinates，例如 `LogicalLeft`、`LogicalRight`。

`writing-mode: vertical-rl; direction: ltr` 的示例：

                       'top' / 'start' side

                        block-flow direction
              <------------------------------------ |
              ------------------------------------- |
              |        c   |          s           | |
    'left'    |        o   |          o           | |   inline     'right'
       /      |        n   |          m           | |  direction      /
    'after'   |        t   |          e           | |              'before'
     side     |        e   |                      | |                side
              |        n   |                      | |
              |        t   |                      | |
              ------------------------------------- v

                    'bottom' / 'end' side

再看一个相对定位元素：

    <style>
    html {
        writing-mode: vertical-rl;
    }
    </style>
    <div id="container" style="background-color: lightBlue; width: 300px; height: 200px;">
      <div id="relpos" style="position: relative; top: 50px; left: -60px; width: 70px; height: 80px; background-color: red;"></div>
    </div>

在 `800×600` frame 中的最终位置：

    container: (492, 8  300x200)
    relpos:    (662, 58 70x80)

这里的 8px 是 HTML body 默认外边距，见 [HTML 渲染规则](https://html.spec.whatwg.org/multipage/rendering.html#the-page)，实现位于 `../html/resources/html.css`。

涉及尺寸的完整说明见[示意图](https://raw.githubusercontent.com/chromium/chromium/f5a9dd28d9af3a5450afb58ac199223fc6b49976/third_party/blink/renderer/core/layout/resources/flipped-blocks-relpos.svg)。更多书写模式与方向组合见[演示页面](http://pauljadam.com/demos/csstext.html)，其中 `horizontal-bt` 已过时。

<a id="containing-block-vs-container"></a>

### Containing block 与 container

有两个类似但不同的方法：`LayoutObject::Container()` 返回 CSS 定义的包含块；`LayoutObject::ContainingBlock()` 返回包围元素的非匿名块，如果 CSS 包含块是相对定位的 inline，则返回包围该 inline 的非匿名块。

`LayoutObject` 还有针对 fixed、absolute、paint invalidation 等用途的包含块方法。代码只说“containing element”时含义并不明确，必须注意它通过哪个方法获取。

<a id="geometry-mapping"></a>

## 几何映射

TODO(wkorman)：原文待补充以下内容：

- `mapToVisualRectInAncestorSpace()`。
- `mapAncestorToLocal()`。
- `Widget`、`FrameView` 树；原文计划依据 http://crbug.com/637460 移除前者。
- `GeometryMapper`，或引用 paint README 中对应章节。目前可先看 [Web page geometries](https://docs.google.com/document/d/1WZKlOSUK4XI0Le0fgCsyUTVw0dTwutZXGWwzlHXewiU/preview) 设计文档。

<a id="scrolling"></a>

## 滚动

TODO(wkorman)：原文尚待补充概述。目前可先看 BlinkOn 的 [Scrolling in Blink](https://docs.google.com/presentation/d/1pwx0qBW4wSmYAOJxq2gb3SMvSTCHz2L2TFx_bjsvm8E/preview)。

原文中的 Root layer scrolling 是一次滚动架构重构，让根 `PaintLayer` 负责此前由 `FrameView` 处理的滚动。见 [Root Layer Scrolling](https://bit.ly/root-layer-scrolling)。

<a id="glossaries"></a>

## 术语

以下简要说明盒流、行内流与文字朝向。更多信息见 [CSS Writing Modes Level 3](https://www.w3.org/TR/css-writing-modes-3/)。

[CSS Logical Properties Level 1](https://drafts.csswg.org/css-logical-props/) 体现 CSSWG 的逻辑坐标命名方式：`block-start`、`block-end`、`inline-start`、`inline-end`；轴已隐含或无关时可简称 start、end。

Blink 中许多代码早于此规范，因此命名尚未完全一致，期望逐步统一。另见规范中的 physical、flow-relative、line-relative [抽象盒术语](https://www.w3.org/TR/css-writing-modes-3/#abstract-box)。

- `writing-mode`：水平或垂直书写，垂直时块流可向左或向右。垂直书写模式会转置几何，参见 `transposed{Rect,Point,Size}()`。
- `direction` / `dir`：盒的 inline base direction，即 ltr 或 rtl，参见 `isLeftToRightDirection()`。
- `text-orientation`：行内文字的朝向，仅对垂直模式有意义。
- Orthogonal flow（正交流）：盒的书写模式与其包含块垂直，会产生复杂情况，见[规范](https://www.w3.org/TR/css-writing-modes-3/#orthogonal-flows)。
