# Overflow、滚动容器与裁剪

[本组导航](./README.md)

内容超过盒尺寸后，先区分“裁掉看不见的部分”和“允许滚到看不见的部分”。`hidden` 两者兼有，可由脚本滚动；`clip` 只裁剪，不建立普通滚动容器，也不单独创建 BFC；`auto` 在需要时可滚动。滚动条是否占布局空间由平台决定，`scroll` 也不保证实体滚动条始终可见。

当一个轴不是 visible/clip，另一个轴的 visible 可计算为 auto，clip 可计算为 hidden。必须看 computed values，而不是只看一条作者声明。Sticky 还会受最近滚动容器影响，见 [定位](../layout/position.md)。

ellipsis 需要受限 inline 空间和裁剪，单行通常还需 nowrap；flex item 常要 min-width:0。overscroll-behavior 管理滚动边界传播，scroll snap 管理停靠，二者不是同一种滚动控制，也不等于阻止所有 touch 默认行为。

## 样式示例与推导

```css
.scroller {
  height: 80px;
  overflow: hidden;
}
.scroller.clip {
  overflow: clip;
}
.scroller.auto {
  overflow: auto;
}
.long {
  height: 240px;
}
```

`overflow: hidden` 可由脚本改变滚动位置；`clip` 只裁剪且本身不形成可滚动容器；`auto` 在内容溢出时可滚动。切换取值可能重置已有滚动位置，比较时应从同一初始状态开始。

依据 [CSS Overflow 3](https://www.w3.org/TR/css-overflow-3/)；滚动 API 来自 [CSSOM View](https://www.w3.org/TR/cssom-view/)。
