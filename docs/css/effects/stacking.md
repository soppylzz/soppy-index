# 绘制顺序与层叠上下文：z-index 在哪里比较

两个盒子重叠时，先确定它们属于哪些层叠上下文，再比较相应层级。Z-index 不是全页面共享的排名。

## 一个上下文内部怎样绘制

对常见的 CSS 2 普通块与定位结构，可先使用以下简化顺序，由后向前理解：

1. 当前上下文根盒的背景与边框。
2. 负 z-index 的子层叠上下文。
3. 普通流块级盒的背景与边框。
4. 非定位浮动。
5. 普通流行内内容。
6. z-index 为 auto 或 0 的定位内容及相关上下文。
7. 正 z-index 的子层叠上下文。

同层级还涉及树顺序，后绘制者通常在前。浮动和行内内容有细分步骤，Flex/Grid 的 order 也可能影响绘制顺序；这个顺序不能替代完整算法。详见 [CSS 2.2 绘制顺序](https://www.w3.org/TR/CSS22/zindex.html)。

## 子元素的 9999 为什么输给兄弟的 2

```html
<div class="layout">
  <div class="low"><div class="badge">Badge</div></div>
  <div class="peer">Peer</div>
</div>
```

```css
.low {
  position: relative;
  z-index: 1;
}
.badge {
  position: absolute;
  z-index: 9999;
}
.peer {
  position: relative;
  z-index: 2;
}
```

假定盒子重叠、无其他上下文：low 内部先完成排序，再以整体层级 1 与 peer 的 2 比较。因此 badge 不能越过 peer；修改 badge 无效，需检查 low 或调整结构。

把 low 的 z-index 改为 auto，通常不再由它创建新上下文，badge 就可能参与更外层的排序。`auto` 与 0 因此不等价。

## 哪些属性会建立层叠上下文

常见建立者包括根元素，以及：

| 条件                                                       | 关键边界                       |
| ---------------------------------------------------------- | ------------------------------ |
| relative/absolute 且 z-index 非 auto                       | 仅 relative 不足以建立         |
| fixed、sticky                                              | 即使 z-index:auto 也建立       |
| Flex/Grid 项目且 z-index 非 auto                           | 不要求先设置 position          |
| opacity 小于 1、非 none 的 transform                       | 即使没有明显视觉变化也可能建立 |
| isolation:isolate、适用的 filter、clip-path、mask、contain | 需看属性的具体适用条件         |

不要把“创建 BFC”“创建绝对定位包含块”“创建层叠上下文”当成同一件事。Overflow:hidden 单独裁剪普通块，并不因此自动创建层叠上下文。

## 裁剪、合成层与 Top Layer

提高 z-index 不会取消已有裁剪边界；修复弹层被裁切，需要检查结构和裁剪参照。层叠上下文描述绘制语义，也不保证浏览器为它分配独立合成层。

通过 `showModal()` 打开的 dialog、显示的 popover 等可进入 Top Layer，位于普通文档层叠之上。普通元素的巨大 z-index 不能覆盖它们；多个 Top Layer 元素还有自己的顺序。参见 [HTML Top Layer](https://html.spec.whatwg.org/multipage/interaction.html#top-layer)。

排查遮挡时，从重叠元素向上寻找第一个分叉的层叠上下文，再检查裁剪；不要从增加数字开始。
