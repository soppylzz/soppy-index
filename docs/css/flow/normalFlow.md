# 普通流与 Margin Collapse

[本组导航](./README.md)

普通流中 block box 通常沿块轴排列，inline content 在行盒里排版。absolute、fixed 脱离普通流；relative 与 transform 只移动显示位置时，兄弟仍按原布局空间排列。

在默认横排块布局里，相邻且满足条件的垂直 margin 可折叠。全正数取最大，全负数取最负，正负混合为最大正值加最负值；不应把横向 margin 或 flex/grid item margin 套入该公式。

父与首/末普通流块子项也可能折叠；border、padding、内联内容、clearance 或格式化上下文边界会改变条件。空块还可能把首尾 margin 连在一起。`flow-root` 能阻止跨自身边界的父子折叠，却不会自动禁止内部所有普通块兄弟的折叠。

## 样式示例与推导

```css
#first {
  margin-bottom: 30px;
}
#second {
  margin-top: 20px;
}
#parent.changed {
  display: flex;
  flex-direction: column;
}
```

先确认两个盒是同一普通流中的相邻块，且中间没有阻断折叠的内容或边界。此时 30px 与 20px 都是正外边距，取较大者，间距为 30px。把父盒改成列向 Flex 后，两个子项变成 Flex item，它们的外边距不折叠，间距为 `30 + 20 = 50px`。

依据 [CSS 2.2 视觉格式化模型](https://www.w3.org/TR/CSS22/visuren.html)；现代 display 与 overflow 细节还应结合对应模块规范。
