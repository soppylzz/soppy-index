# 列表、Marker 与计数器：编号不必写进每个文本

原生列表已经提供条目语义和编号机制。CSS 可以改变标记样式、生成章节号，但不应该为了一个装饰效果丢掉文档结构。

## List-item 会生成标记盒

```html
<ol class="steps">
  <li>Install</li>
  <li>Configure</li>
  <li>Run</li>
</ol>
```

```css
.steps {
  list-style-type: decimal-leading-zero;
  list-style-position: outside;
}
.steps > li::marker {
  color: teal;
  font-weight: bold;
}
```

`list-style` 在容器上可通过继承影响条目；outside 标记位于主盒之外，inside 则进入首行内容，长文本的后续行缩进可能不同。`list-style-image` 可使用图像，加载失败时还涉及类型回退。

`marker` 支持的样式属性有限，不是任意可设宽高、Flex 布局的普通块。去掉 list-style 也不等于自动移除了列表默认 padding/margin，应分别判断。

## 计数器由初始化、递增与读取组成

```html
<article class="guide">
  <h2>Overview</h2>
  <h2>Setup</h2>
</article>
```

```css
.guide {
  counter-reset: chapter;
}
.guide > h2 {
  counter-increment: chapter;
}
.guide > h2::before {
  content: counter(chapter) ". ";
}
```

`.guide` 初始化 chapter，两个 h2 依次递增，再在伪元素中读取 1、2。`counter-reset` 创建相应作用域，counter-increment 修改值，counter-set 可设置已有实例或按规则创建；嵌套列表需要结合计数器作用域理解。

`counter()` 读取一个计数器，counters() 可连接同名嵌套计数器，适合 1.2.3 形式。需要自定义编号体系时再考虑 @counter-style，不必手写每条编号。

## 生成内容不能承担唯一业务信息

`::before` / `::after` 的默认 `content: normal` 不生成内容盒；设置 `content: ""` 或生成文字、图像等内容后，才有相应的生成内容。它们可以装饰，但不是实际 DOM 子节点，也不能提供独立、可靠的按钮交互。

读屏对生成内容的呈现有环境差异；必需步骤、状态与按钮名称应保留在 HTML/可访问名称中。原生 ol 的编号还涉及 start、reversed、li value 等语义，不宜用 CSS 计数器覆盖后忘掉这些输入。

`marker` 与计数器模型见 [CSS Lists and Counters 3](https://www.w3.org/TR/css-lists-3/)。
