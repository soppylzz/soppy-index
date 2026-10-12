# CSS 单位与参照

[本组导航](./README.md)

CSS px 是抽象像素，设备像素映射受 DPR、缩放与屏幕影响。em 用于 font-size 时按父字号，用于其他属性时按当前计算字号；rem 按根字号。ch 是字体中 0 的 advance，不是所有字符平均宽度；lh/rlh 按行高参照。

百分比的基准由属性定义。普通横排 width 多按包含块宽度，height 常需明确高度；物理 margin/padding 百分比传统上按包含块 inline size。translate 的百分比按自身 reference box，border-radius 横纵百分比按自身对应轴。

svh/lvh/dvh 分别对应小、大、动态视口；传统 vh 对应大视口定义，移动浏览器工具栏策略会影响实际体验。100dvh 能随 UI 变化，但也会引起尺寸更新。模拟器不能替代手机地址栏、软键盘和缩放测试。

## 样式示例与推导

```css
#parent {
  font-size: 20px; /* Compare with 30px. */
  width: 300px;
}
#em {
  font-size: 2em;
  padding: 1em;
  width: 100px;
}
#rem {
  font-size: 2rem;
}
#percent {
  width: 50%;
}
```

逐个问“相对谁”：

- `#em` 的 `font-size: 2em` 相对父字号，父字号从 20px 到 30px 时，它从 40px 到 60px。
- 同一个盒的 `padding: 1em` 相对它**自己的计算字号**，因此也从 40px 到 60px。
- `#rem` 的 `2rem` 相对根字号，不随这里的父字号变化；`#percent` 的 50% 在父内容宽固定为 300px 时为 150px。

同是相对单位，参照却由属性和单位共同决定。

依据 [CSS Values 4（草案）](https://www.w3.org/TR/css-values-4/)。
