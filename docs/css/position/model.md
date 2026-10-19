# 定位模型：占位、偏移与参照

一个角标应该跟着卡片移动，工具栏应该固定在屏幕上，标题又应该滚到顶部才停住。三者都能设置 top，但参照和占位规则不同。

## 先判断是否保留布局位置

| position | 是否脱流 | inset 的作用                     | 主要参照                           |
| -------- | -------- | -------------------------------- | ---------------------------------- |
| static   | 否       | 不适用                           | 所在布局上下文                     |
| relative | 否       | 从原布局位置偏移                 | 自身原位置；百分比另按包含块解析   |
| absolute | 是       | 参与定位和尺寸求解               | 绝对定位包含块                     |
| fixed    | 是       | 同绝对定位，但使用固定定位包含块 | 通常是视口，也可能是祖先建立的参照 |
| sticky   | 否       | 定义滚动时需保持的边缘距离       | 最近滚动视口，同时受包含块限制     |

定位不替代 display：relative 元素仍可作为 Flex 项目，absolute 元素内部也仍可使用 Grid。要分别问外部如何放置、内部如何布局。

## Relative：移动画面，不让兄弟补位

```html
<div class="stack">
  <div class="first">First</div>
  <div class="second">Second</div>
</div>
```

```css
.stack > div {
  height: 40px;
}
.first {
  position: relative;
  top: 20px;
}
```

假定默认横排、无 margin，first 原本占据 0～40px，偏移后画在 20～60px；second 仍从 40px 开始，因此两者重叠 20px。父盒自动高度仍按原布局位置计算，视觉溢出还可能影响滚动范围。

把 first 改为 absolute，它不再按普通流占位，second 会成为第一个流内子盒。仅看画面上的重叠，不能断定是否脱流。

## Inset 不是通用的 margin

`inset: 10px 20px` 对应 top/bottom 为 10px，left/right 为 20px；初始值是 auto，而不是 0。逻辑偏移使用 inset-inline、inset-block，映射见[逻辑方向](../values/logical-directions.md)。

`relative` 同时设置 left/right 时，不会把盒拉宽；默认 ltr 中 left 决定偏移，rtl 则由 right 决定。`absolute` 的两侧约束却可能共同求解 auto 宽度，见[绝对与固定定位](./absolute-fixed.md)。

## 建立定位参照不等于建立所有边界

`position: relative` 即使没有 inset，也可以为绝对定位后代建立包含块；它本身不自动建立 BFC，也不在 z-index 为 auto 时自动创建层叠上下文。

`absolute`/fixed 不按普通流撑高祖先，但仍可产生溢出。`sticky` 还保留流内占位，不能理解成“到阈值后切换成 fixed”。分别判断占位、参照和边界，才能解释定位结果。

定位规则依据 [CSS Positioned Layout 3](https://www.w3.org/TR/css-position-3/#position-property)。
