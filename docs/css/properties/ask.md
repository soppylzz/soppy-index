# CSS 属性相关面试题

每题独立推导，无其他规则干扰；先预测结果，再核对解析。

## 1. 简写会不会只修改写出来的部分？

```css
.card {
  border: 2px solid red;
  border: 1px;
}
```

不会。第二条简写把省略的 border-style 重置为 none，边框不显示。只改宽度应写 `border-width: 1px`，机制见[简写属性](./type.md)。

## 2. 为什么 ID 选择器会输给 class？加 important 后为什么又反过来？

```html
<p id="title" class="title">Layer before specificity.</p>
```

```css
@layer base, theme;

@layer base {
  #title {
    color: red;
  }
}
@layer theme {
  .title {
    color: blue;
  }
}
```

普通声明为蓝色：层先于 specificity 比较，theme 优先。两条都加 important 后层顺序反转，结果为红色；仅一条加 important，则先比较重要性。详见[声明优先级](./cascade.md)。

## 3. 恢复 div 的默认 display，应该用 initial、unset 还是 revert？

```html
<div class="panel">Restore the display.</div>
```

```css
.panel {
  display: flex;
}
.panel {
  display: initial;
}
```

`initial` 取 display 初始值 inline；unset 也为 inline，因为 display 不默认继承。`revert` 撤回作者来源，在浏览器默认 div 为 block、无用户样式干扰时回到 block，不恢复 flex。区别见[默认值与回退](./defaulting.md)。

## 4. 为什么 color 写了两次，变量无效时却没有回到 blue？

```html
<div class="parent">
  <p class="message">Check the fallback.</p>
</div>
```

```css
.parent {
  color: rebeccapurple;
  --tone: 12px;
}
.message {
  color: blue;
  color: var(--tone, green);
}
```

结果为父元素的紫色。Var() 声明先胜出，变量值 12px 有效所以不选 green；替换后的 color 计算时失效，继承父色，不重新层叠恢复 blue。

直接写 color: 12px 则解析时无效，blue 可以胜出；删除 --tone 且无其他定义时则使用 green。阶段对照见[计算时失效](./processing.md#计算时失效为什么没有重新采用前一条-color)。

## 5. @property 注册后，错误类型会回退到上一条声明吗？

```css
@property --count {
  syntax: "<number>";
  inherits: false;
  initial-value: 2;
}

.counter {
  --count: 7;
  --count: red;
  opacity: calc(var(--count, 9) / 10);
}
```

假定注册生效，--count 为 2，opacity 为 0.2。Red 先胜出，计算时类型检查失败；inherits: false 使其采用初始值 2，不恢复 7，也不使用 fallback 9。若允许继承，则需考虑父值。详见[注册初始值与回退](./processing.md#注册初始值与-var-回退分别在哪个阶段生效)。

## 6. Width 是 50%，为什么最后只有 180px？

```html
<div class="container">
  <div class="item">Constrained width.</div>
</div>
```

```css
.container {
  width: 400px;
}
.item {
  box-sizing: content-box;
  width: 50%;
  max-width: 180px;
  padding: 0;
  border: 0;
  margin: 0;
}
```

普通横排块布局、无其他约束时，width 计算值为 50%，布局候选宽为 200px，受 max-width 限制后使用值为 180px。两属性共同约束布局，不是权重竞争，详见[值处理阶段](./processing.md)。

## 7. 如何实现 0.5px 的边框？它一定是一个设备像素吗？

0.5 个 CSS 像素不一定对应一个设备像素。可以直接声明小数长度：

```html
<div class="card">A thin border.</div>
```

```css
.card {
  border: 0.5px solid #666;
}
```

0.5px 语法合法，实际细度受像素对齐与实现影响。规则见 [CSS Backgrounds and Borders 3](https://www.w3.org/TR/css-backgrounds-3/#the-border-width)。

也可以用伪元素绘制 1px 分隔线，再缩放：

```html
<div class="row">Account settings</div>
```

```css
.row {
  position: relative;
  padding: 16px;
}
.row::after {
  content: "";
  position: absolute;
  right: 0;
  bottom: 0;
  left: 0;
  height: 1px;
  background: #666;
  transform: scaleY(0.5);
  transform-origin: bottom;
  pointer-events: none;
}
```

伪元素布局高度为 1px，视觉厚度约为 0.5px；绝对定位不增加流内占位，单独缩放也不影响文字。它模拟分隔线，没有改变 row 的 border-width。

若需要四边，可以让伪元素先占两倍尺寸，再整体缩回：

```css
.card {
  position: relative;
  border: 0;
}
.card::after {
  content: "";
  position: absolute;
  top: 0;
  left: 0;
  width: 200%;
  height: 200%;
  box-sizing: border-box;
  border: 1px solid #666;
  transform: scale(0.5);
  transform-origin: top left;
  pointer-events: none;
}
```

假定 card 是无 padding 的普通块，伪元素两倍尺寸经缩放回到目标大小，边线变细。圆角半径也需按缩放比例调整。

无额外缩放且恰当对齐时，DPR 为 2 的 0.5 CSS px 对应约一个设备像素，DPR 为 3 时约为 1.5 个。清晰度仍需目标设备验证，像素关系见 [CSS Values 4](https://www.w3.org/TR/css-values-4/#absolute-lengths)。

缩放整个元素会同时缩放内容；@supports 只能检测语法，清晰度仍需设备验证。
