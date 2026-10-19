# 普通流：从块排列到行内排版

两个 div 即使足够窄也通常上下排列，文字和 span 却能连续排进一行。要解释位置，先看盒参与哪种布局，而不是只看空间是否放得下。

本文固定默认横排、从左到右书写；盒类型与属性作用见[display](../box/display.md)。

## 一个段落可以在外部参与块布局，内部排文字

```html
<div class="article">
  <p class="paragraph">Read <span>one idea</span> at a time.</p>
  <p class="paragraph">Then explain it independently.</p>
</div>
```

```css
.article {
  width: 320px;
}
.paragraph {
  margin: 0;
}
```

两个 p 的块级盒沿块轴依次排列；每个 p 内部的文字与 span 沿行内轴排进行盒，空间不足时按断行规则换行。给 p 设置 width: 100px 只改变尺寸，不会让两段自动并排。

块级是外部角色，块容器是内部能力：inline-block 外部入行，内部仍可排普通块。

## 格式化上下文：这些盒按什么规则协作

| 上下文                 | 主要处理什么                       |
| ---------------------- | ---------------------------------- |
| BFC，块级格式化上下文  | 块排列、浮动关系及适用的外边距折叠 |
| IFC，行内格式化上下文  | 文字与行内级盒的行排列、断行和对齐 |
| Flex/Grid 格式化上下文 | 弹性项目或网格项目的空间分配       |

普通 block 不逐层建立新 BFC，嵌套块可共享上下文，内部文字再按 IFC 排版。

行盒由排版生成，不是 HTML 中新增的元素。一行的高度受 line-height、字体度量与 vertical-align 等共同影响，不等于“最大 font-size”或“最高字形”。换行还取决于 white-space 和合法断点；长词超出宽度时，不保证浏览器一定从任意字符处折断。

## 流内占位与视觉位置分别判断

```html
<div class="list">
  <div class="first">First</div>
  <div class="second">Second</div>
</div>
```

```css
.first,
.second {
  height: 40px;
  margin: 0;
  padding: 0;
  border: 0;
}
.first {
  position: relative;
  top: 20px;
}
```

以 list 内容起点为 0：first 原占 0～40px，偏移后画在 20～60px；second 仍从 40px 开始，因而重叠 20px。偏移没有把兄弟推到 60px。

| 方式            | 是否保留普通流占位   | 还要考虑什么               |
| --------------- | -------------------- | -------------------------- |
| static          | 保留                 | 默认布局                   |
| relative        | 保留                 | 相对原位置偏移             |
| sticky          | 保留                 | 滚动参照与包含块约束       |
| absolute、fixed | 不按普通流占位       | 以相应包含块求尺寸与位置   |
| float           | 不按普通流块排列占位 | 仍影响相关行盒及浮动避让   |
| transform       | 不因此改变原占位     | 改变视觉坐标与可滚动溢出等 |

“脱离普通流”不等于不影响任何布局：浮动仍影响环绕；absolute 也可能扩展可滚动区域。反过来，visibility: hidden、opacity: 0 不会因不可见就取消占位，display: none 则不生成布局盒。定位方案见 [CSS 2.2](https://www.w3.org/TR/CSS22/visuren.html#positioning-scheme)。

## 匿名盒：DOM 节点不等于布局单位

```html
<div class="mixed">
  Before
  <div>Middle block</div>
  After
</div>
```

默认 display 下，mixed 同时有文本和块级子盒。前后行内内容会被组织到匿名块盒，和中间块盒依次排列。普通段落里直接出现的文本也会形成匿名行内盒。

匿名盒没有对应 DOM 节点，querySelector 选不到；源码空白也不一定形成可见盒。规则见 [CSS Display 3](https://www.w3.org/TR/css-display-3/#anonymous)。
