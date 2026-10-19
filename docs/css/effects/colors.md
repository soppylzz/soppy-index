# 颜色：颜色空间、透明通道与 currentColor

背景半透明和整个组件半透明看起来接近，却作用在不同步骤。先理解颜色值携带什么，再判断它如何参与绘制。

## 常用颜色表示各自表达什么

| 表示                   | 适合表达的内容                             |
| ---------------------- | ------------------------------------------ |
| 命名色、十六进制       | 固定颜色；#RRGGBBAA 最后两位是 alpha       |
| rgb(30 90 180 / 50%)   | RGB 通道与独立透明通道                     |
| hsl(210 70% 40%)       | 色相、饱和度、明度，便于按这些维度调整     |
| oklch(...)、color(...) | 明确使用其他颜色空间，需结合目标环境与色域 |
| currentColor           | 使用当前元素 color 的值                    |

HSL 的明度数值相同不保证视觉亮度相同；数值超出设备可显示色域时还会经历映射。面试中应先解释颜色模型与输出边界，不必背所有命名色。

## CurrentColor 让装饰跟随文字

```html
<button class="button">Save</button>
```

```css
.button {
  color: #2455a4;
  border: 1px solid currentColor;
  box-shadow: 0 0 0 2px currentColor;
}
.button:hover {
  color: #17366b;
}
```

修改 color 后，边框和阴影随之变化，不需要复制颜色字面值。Color 默认继承；currentColor 在元素上解析为它自己的 color，而非固定取父元素原始声明。

## Alpha 不会让后代共同变透明

```css
.panel {
  background: rgb(20 100 80 / 50%);
  color: black;
}
```

这里仅背景颜色带透明度，文字仍可完全不透明。若改成 opacity:0.5，则整个元素及其绘制后代作为组变淡，后代 opacity:1 也不能抵消，见[组合绘制](./compositing.md)。

`transparent` 表达透明颜色，不等于删除背景图片，也不等于 opacity:0。背景最终像素还取决于背后内容。

## 颜色计算与主题不是同一层

`color-mix` 等函数可从颜色计算新值；它们不会自动保证文字对比度。主题更适合用语义变量表达“正文、表面、危险状态”，再选择具体颜色，见[样式组织](../engineering/organization.md)。

颜色不能独自承担状态语义：错误提示还需要文字或图标。颜色空间与 alpha 定义见 [CSS Color 4](https://www.w3.org/TR/css-color-4/)，混色扩展见 [CSS Color 5 草案](https://www.w3.org/TR/css-color-5/)。
