# Containment 与内容可见性

[本组导航](./README.md) · [容器查询](../responsive/containerQueries.md) · [渲染流程](../../browser/core/rendering.md)

`contain` 为浏览器提供布局、绘制和尺寸依赖的隔离约束，不是通用样式作用域。`size` / `inline-size` 限制尺寸对后代内容的依赖，`layout` 与 `paint` 分别影响布局和绘制边界，`style` 主要限制计数器等效果，并不阻止普通选择器匹配或属性继承。`content` 组合 layout、paint、style；`strict` 还加入 size。[CSS Containment 2](https://www.w3.org/TR/css-contain-2/) 给出这些约束。

```css
.card-list {
  contain: layout paint;
}
.card-list > .item {
  content-visibility: auto;
  contain-intrinsic-size: auto 320px;
}
```

先看隔离边界：`.card-list` 的 `contain: layout paint` 限制布局和绘制影响范围，但不隔绝选择器与继承。再看可见性：子项的 `content-visibility: auto` 允许浏览器跳过暂时不相关的内容；`contain-intrinsic-size` 给跳过期间一个估计占位。`auto 320px` 不是实际高度承诺，内容被处理后的尺寸仍可不同。

错误地给依靠内容撑开的盒加 `contain: size`，可能令其自动尺寸塌陷。`content-visibility: auto` 也不移除 DOM；焦点、查找、可访问性和强制几何读取仍需按规范及实际浏览器处理。反复读取离屏子树几何信息可能抵消跳过渲染的收益，需用 Performance trace 验证。[CSS Containment 2](https://www.w3.org/TR/css-contain-2/) 涵盖内容可见性；[CSS Sizing 4](https://www.w3.org/TR/css-sizing-4/) 定义固有尺寸占位。
