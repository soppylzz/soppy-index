# 行内格式化与文本溢出

[本组导航](./README.md)

行内格式化上下文将文本和 inline-level box 排到行盒中。行高由字体度量、父 strut、各 inline box 的 line-height、vertical-align 等共同决定，不一定等于最大元素 height。字形还可超出自身 em 区域。

无单位 line-height 以比例继承，后代用自己的字号计算；百分比先按声明元素字号算出长度，再把该长度继承。大字号子项可能因继承较小固定行高而绘制重叠。vertical-align 主要用于 inline-level 和 table-cell，不是块元素通用居中方案。

inline 图片默认基线对齐，行盒留给下降字形的空间可能呈现底部空隙。按布局改 display:block 或 vertical-align，不能为消除一处空隙无差别把正文父 line-height 归零。

单行 ellipsis 还需受限宽度、overflow 裁剪和 nowrap；多行 clamp 的语法支持要按目标环境确认。overflow-wrap:anywhere 可在必要时断长词，word-break 和 hyphens 与语言规则有关。被截断的关键内容需有可访问的完整查看方式。

## 样式示例与推导

```css
#unitless {
  font-size: 16px;
  line-height: 1.5;
}
#percent {
  font-size: 16px;
  line-height: 150%;
}
.child {
  font-size: 32px;
}
```

两个父盒字号都是 16px，但继承的东西不同：

1. `#unitless` 的 `1.5` 作为比例传给 32px 的子元素，子元素行高算为 48px。
2. `#percent` 的 `150%` 先按父字号算成 24px 长度，子元素继承的是这段长度。

这只是子元素的行高计算，不保证整行最终高度恰好为 48px 或 24px；同一行里的其他盒和字体度量也参与形成行盒。

依据 [CSS 2.2 行高计算](https://www.w3.org/TR/CSS22/visudet.html#line-height) 与 [CSS Text 3](https://www.w3.org/TR/css-text-3/)。
