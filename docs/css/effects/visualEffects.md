# 颜色、背景与组合绘制

[本组导航](./README.md)

opacity 把元素与后代作为一组变透明，并在小于1时建立堆叠上下文；alpha background 只改变背景层。后代 computed opacity 仍可能是1，不能据此推断最终像素不受祖先影响。

多背景第一层在最上面。cover 保比覆盖可裁剪，contain 保比完整可能留白。currentColor 可让边框、SVG fill 和图标跟随文本色，减少主题中的重复硬编码。

box-shadow 按盒轮廓，drop-shadow 按渲染内容 alpha 轮廓；filter 处理自身结果，backdrop-filter 处理背后已绘制内容。大面积 blur、透明混合和固定背景可能增加绘制/合成成本，需要 trace 验证。mix-blend-mode 与背后内容混合，isolation 可限定混合边界；background-blend-mode 只混合自身背景层。

## 样式示例与推导

```css
#effect {
  background: rgb(20 120 90);
  opacity: 0.5;
}
#effect.changed {
  opacity: 1;
  background: rgb(20 120 90 / 0.5);
}
#child {
  opacity: 1;
  color: black;
}
```

先看透明度施加在哪一层：`opacity: 0.5` 把父元素和子项绘制成一组后再变淡，文字也受影响；把背景改成带 alpha 的颜色，只改变那层背景，子项文字仍按自己的颜色绘制。即使子项计算出的 `opacity` 是 1，也不能据此推断它的最终像素不受父级组透明度影响。

依据 [CSS Color 4](https://www.w3.org/TR/css-color-4/) 与 [Compositing and Blending 1](https://www.w3.org/TR/compositing-1/)。
