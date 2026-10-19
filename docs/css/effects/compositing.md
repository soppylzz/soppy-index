# 阴影、裁剪与组合绘制：效果作用于哪一层

看起来都在“改外观”的属性，可能分别作用于盒轮廓、内容透明轮廓、元素组或背后画面。先确定输入，才能选对效果。

## 背景透明与组透明

```html
<div class="panel"><strong class="text">Important text</strong></div>
```

```css
.panel {
  background: teal;
  opacity: 0.5;
}
.text {
  opacity: 1;
}
```

父盒和后代先形成绘制结果，再应用组透明度，所以文字仍一起变淡。若只想背景透明，改用带 alpha 的背景色。Opacity 为 0 也不自动删除布局、阻止点击或移除键盘焦点。

## 阴影按盒还是按像素轮廓

| 效果                    | 输入与作用                                 |
| ----------------------- | ------------------------------------------ |
| box-shadow              | 盒轮廓；可有 spread、inset，多重阴影       |
| filter:drop-shadow(...) | 输入图像的 alpha 轮廓，可跟随透明图片形状  |
| filter:blur(...) 等     | 元素自身及其绘制内容形成的输入             |
| backdrop-filter         | 元素背后的适用画面，需要可见的透明区域观察 |

`box-shadow` 不增加布局占位，也不能替代边框的盒模型行为。`filter` 函数有顺序，先模糊后加阴影与反过来可能得到不同结果。

## 裁剪与遮罩

`clip-path` 用路径决定哪些区域可见；mask 使用遮罩的 alpha 或亮度等信息控制可见程度，可产生渐变透明。它们不会按可见轮廓重新安排周围普通流内容，也不能直接当作文字环绕形状；浮动环绕可另用 shape-outside。

`border-radius` 主要影响边框与背景形状；overflow 管溢出边界；clip-path 管裁剪路径。视觉相似时，也要检查命中、滚动和层叠副作用。规则见 [CSS Masking 1](https://www.w3.org/TR/css-masking-1/)。

## 混合需要确定背后是什么

`mix-blend-mode` 将元素与背后内容混合，background-blend-mode 则在自身背景层之间混合。`isolation: isolate` 可创建隔离组，避免内部混合直接跨出预期边界。

```css
.poster {
  isolation: isolate;
}
.poster .label {
  mix-blend-mode: multiply;
}
```

`.label` 的混合受 poster 隔离组约束，结果仍依赖组内实际画面；它不是固定颜色替换。模型见 [Compositing and Blending 1](https://www.w3.org/TR/compositing-1/)。

这些效果可能增加离屏绘制、内存和合成成本，但不能仅凭属性名推断耗时或图层数。性能需结合具体面积、动画和浏览器记录判断。
