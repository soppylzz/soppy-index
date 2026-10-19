# 行内排版：行盒、行高与基线

图片下面留了一条缝，或者设了 24px 行高却看到更高的一行，原因通常在行盒求解，而非某个隐藏的 margin。

## 文字不是放进一个 height 等于字号的矩形

字体提供上升部、下降部等度量；font-size 决定 em 尺度，字形的实际墨迹不保证装在这个方框里。`line-height` 给行内排版提供高度需求，额外 leading 分配到文字度量两侧，负 leading 也可能产生绘制重叠。

`line-height: normal` 由字体与浏览器按规则决定，不是统一固定的 1.2；无单位数值则明确表达字号比例。

一个行盒综合该行 inline box、原子行内盒、父元素提供的零宽文字参照（strut）和 vertical-align 后的上下边界。它不等于这一行所有子元素 height 的简单最大值。

## 无单位行高与百分比继承不同的东西

```html
<div class="ratio"><span>Large text</span></div>
<div class="percent"><span>Large text</span></div>
```

```css
.ratio,
.percent {
  font-size: 16px;
}
.ratio {
  line-height: 1.5;
}
.percent {
  line-height: 150%;
}
span {
  font-size: 32px;
}
```

`.ratio` 的子项继承比例 1.5，用自己的字号得到 48px；percent 的 150% 在父元素上先算为 24px，子项继承这个长度。固定 px 行高也继承长度。

这只是对应 inline box 的行高需求，最终行盒仍结合其他内容求解。普通非替换 inline 的 height 不控制它的行高，上下 padding/border 可以画出，却不按完整边框盒高度撑开行距。

## 图片底部空隙从哪里来

```html
<p class="caption"><img src="photo.jpg" alt="Mountain" />Label</p>
```

图片这样的行内替换盒默认参与基线对齐，其底边通常落在文字基线上；行盒仍为文字下降部留空间，因此图片下方可能有空隙。

单独成行的图片可设 `display: block`；需要与文字同行时，可按目标设 `vertical-align: bottom` 或 middle。后者改变对齐方式，前者改变布局参与方式。把父 line-height 归零可能伤害同一行文字，不是通用修复。

## Vertical-align 的 middle 不代表整行几何居中

`baseline` 对齐基线；middle 将盒中点对齐父基线加半个 x-height 的位置；top/bottom 则参与行盒顶底对齐。它主要用于行内级盒和表格单元格，不能给普通块设 vertical-align 就完成垂直居中。

`inline-block` 的基线通常来自最后一个流内行盒；没有这样的行盒或适用 overflow 条件改变时，会使用底部 margin edge。两个同高 inline-block 仍可能因基线不同而看起来不齐。

行盒与基线规则见 [CSS 2.2 行高计算](https://www.w3.org/TR/CSS22/visudet.html#line-height)。
