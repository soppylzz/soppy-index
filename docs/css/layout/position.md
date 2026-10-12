# Position 与 Sticky 的约束

[本组导航](./README.md)

先看元素是否给兄弟保留原位置：`static` 正常参与布局；`relative` 先占位，再按 inset 偏移视觉位置；`absolute` / `fixed` 不按普通流为兄弟占位。`sticky` 仍占位，但滚动到阈值后可在最近的 scrollport 内偏移，且不能越过包含块末端。

Sticky 失效先检查对应轴是否有非 auto inset、实际滚动的是哪个祖先、是否存在可移动距离，以及 flex/grid stretch 是否让 item 与容器一样高。overflow:hidden 也能建立滚动容器，可能截获 sticky 的参照；clip 与 hidden 不同。

Absolute 同时指定左右 inset 而 width:auto 可拉伸，明确 width 后还要按约束求解 auto margin/inset。relative 祖先常只为创建包含块，见 [包含块](./containBlock.md)。常规居中可优先 Grid place-items 或 Flex，避免把坐标求解当万能布局。

## 样式示例与推导

```css
#layout {
  height: 140px;
  overflow: auto;
}
#sticky {
  position: sticky;
  top: 0;
  height: 30px;
}
#spacer {
  height: 360px;
}
```

滚动容器有足够内容、sticky 所在包含块也提供足够移动范围时，滚动后 `#sticky` 会贴近容器的顶部 inset。它仍占原来的流内位置，并受包含块末端限制。

依据 [CSS Position 3](https://www.w3.org/TR/css-position-3/)。
