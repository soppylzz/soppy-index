# 文本换行与截断：断在哪里，显示多少

长链接撑破卡片和标题显示省略号是两类问题：前者需要提供断行机会，后者需要限制显示。隐藏溢出不等于消除了内容的尺寸需求。

## White-space 先决定空白与换行规则

| 常用值       | 连续空白                           | 源码换行   | 自动折行 |
| ------------ | ---------------------------------- | ---------- | -------- |
| normal       | 折叠                               | 按空白处理 | 允许     |
| nowrap       | 折叠                               | 按空白处理 | 不允许   |
| pre          | 保留                               | 保留       | 不允许   |
| pre-wrap     | 保留                               | 保留       | 允许     |
| pre-line     | 折叠                               | 保留       | 允许     |
| break-spaces | 保留，并为保留空白提供相应断行机会 | 保留       | 允许     |

`white-space` 在较新的文本模型中是简写，理解上述常用组合后，再查对应长属性。HTML 文本中的空格如何显示也受这一步控制，不只取决于源码是否换行。

## Word-break 与 overflow-wrap 解决不同层次

`word-break: normal` 按语言默认规则断行；break-all 允许在单词内部更激进地断行，keep-all 则限制中日韩文本的一些断行。`hyphens: auto` 依赖语言、词典和实现，应提供正确 lang。

`overflow-wrap: anywhere` 在长片段无法正常放下时允许任意位置断行，并把这些机会计入 min-content；旧的 break-word 值也能救急断行，但不以同样方式降低 min-content。这个差异会影响 Flex/Grid 的内容下限。

```html
<div class="card"><p class="address">AnExtremelyLongUnbreakableIdentifier</p></div>
```

```css
.card {
  display: flex;
  width: 180px;
}
.address {
  min-width: 0;
  overflow-wrap: anywhere;
}
```

`min-width: 0` 放开项目下限，anywhere 提供内容断行；二者分别处理盒约束与文本机会。若仍有 nowrap，就不能期待正常折行。

## 对齐与字间距不改变元素布局角色

`text-align` 对齐块容器内的行内内容，start/end 随书写方向映射；它不把普通块盒本身居中。`justify` 分配行内间距，最后一行另受 text-align-last 等规则影响。

`letter-spacing` 调整字符间距，word-spacing 调整词间距，都会影响换行与内容宽度；不是改变 font-size。`text-indent` 控制适用行的首行缩进，text-decoration 负责下划线等装饰，不是边框。链接若依赖下划线表达可操作性，移除后需要保留清楚的辨识方式。

## 单行省略号需要完整的限制链

```css
.title {
  display: block;
  max-width: 20rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
```

受限行内空间使内容放不下，nowrap 保持一行，overflow 裁剪，ellipsis 标记被截断的位置。只写 text-overflow 不设置宽度、不强制一行，也不自动建立裁剪。

## 多行截断与完整内容入口

```css
.summary {
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 3;
  overflow: hidden;
}
```

这是常见的兼容组合，不能把其中每条声明单独替换后仍假定行为相同。标准 line-clamp 与旧组合应按目标浏览器验证。截断不表示文字从 DOM 消失，也不能代替“展开全文”等可用入口；不要只依赖鼠标悬停 title。

断行与内在尺寸依据 [CSS Text 3](https://www.w3.org/TR/css-text-3/#overflow-wrap-property)，截断模型见 [CSS Overflow 4 草案](https://www.w3.org/TR/css-overflow-4/#line-clamp)。
