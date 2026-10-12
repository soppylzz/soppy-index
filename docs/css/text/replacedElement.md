# 替换元素、固有比例与适配

[本组导航](./README.md)

img、video、iframe 等内容由普通 CSS 子盒布局之外的资源或文档提供，外盒仍由 CSS 布局。表单控件是否按 replaced element 处理依赖具体类型，不能泛化所有 input。

固有 width/height/ratio 与 CSS 的 auto、min/max 共同求解尺寸。图片 HTML width/height 可提前提供比例，减少加载后的位移；响应式常用 max-inline-size:100% 与 height:auto。aspect-ratio 是 preferred ratio，至少一个轴自动时更有作用，明确双轴或约束可能决定不同结果。

object-fit 控制 replaced content 在 content box 内适配：contain 完整留空，cover 保比覆盖裁剪，fill 可变形；object-position 决定对齐。background-size 管装饰背景，不能替代 img 的 alt、加载与响应式图片语义。

## 样式示例与推导

```css
#image {
  width: 120px;
  height: 120px;
  object-fit: contain;
}
#image.changed {
  object-fit: cover;
}
```

若图片固有尺寸为 160 × 80px、CSS 盒为 120 × 120px，`contain` 会把图像缩到 120 × 60px 并留出竖向空白；`cover` 会缩到 240 × 120px 并裁掉水平方向的超出部分。两种情况的元素盒仍为 120 × 120px。

依据 [CSS Images 3](https://www.w3.org/TR/css-images-3/#sizing) 与 [CSS Sizing 4（草案）](https://www.w3.org/TR/css-sizing-4/#aspect-ratio)。
