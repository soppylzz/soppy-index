# 盒模型与尺寸求解

[本组导航](./README.md)

一个盒依次有 content、padding、border、margin。横排普通块的外部占用还受包含块、auto margin 与 width 约束，不是“宽度等于所有数字相加”就能解释所有布局。

`content-box` 的 width 指 content，border box 再加 padding 和 border；`border-box` 指包含 padding/border 的目标尺寸，content 不会因此成为负值。margin 始终在 border box 外。普通非替换 inline 的 width/height 不按普通块规则控制尺寸。

| 情况                     | 关键约束                              |
| ------------------------ | ------------------------------------- |
| 普通块 width:auto        | 结合 margin/padding/border 填可用空间 |
| width:100% + content-box | 百分比仅给内容，附加 padding 可能溢出 |
| 百分比 height            | 普通流中需可确定的参照高度            |
| min/max                  | 进一步钳制尺寸，可能改变最终求解      |

布局 API 含义见 [DOM 测量](../../browser/dom/dom.md)，不要把 offsetWidth 的整数边框盒与 rect 的变换后浮点边界混为一谈。

## 样式示例与推导

```css
#box {
  width: 200px;
  padding: 20px;
  border: 4px solid teal;
}
#box.changed {
  box-sizing: border-box;
}
```

先确定 `width` 指哪个盒，再做加减法：

1. 默认 `content-box`：内容宽 200px，两侧各有 20px padding 和 4px border，边框盒宽为 `200 + 2 * 20 + 2 * 4 = 248px`。
2. 加上 `.changed` 后变成 `border-box`：边框盒宽固定为 200px，内容宽为 `200 - 2 * 20 - 2 * 4 = 152px`。

margin 位于边框外，不进入这两个盒的宽度。

依据 [CSS 2.2 视觉格式化模型](https://www.w3.org/TR/CSS22/visuren.html)；现代 display 与 overflow 细节还应结合对应模块规范。
