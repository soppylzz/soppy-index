# Flex：空间分配和自动最小尺寸

[本组导航](./README.md)

Flex 是一维布局，每一行独立分配主轴空间。row 对应 inline axis，column 对应 block axis；justify 处理主轴，align 处理交叉轴，不能永远记成横/竖。order 和 reverse 改视觉排列，不改 DOM 阅读或通常的 Tab 顺序。

`flex-grow` 分配正 free space，`flex-shrink` 结合 base size 加权分摊负空间，basis 是计算起点；最终宽度还受 min/max、padding/border 限制。grow 的比例不是最终 border box 宽度比例。`flex:1` 浏览器常展开为 1 1 0%，在不确定主轴尺寸中与 0 长度可能有差别。

row item 的自动最小宽度可保留 min-content，长不可断词阻止收缩。min-width:0 放开盒尺寸下限，但不会自动让文字断行；需要 overflow-wrap、裁剪或业务允许的省略。column 滚动区域相应检查 min-height:0。

wrap 后每行单独布局；gap 只在项目之间留间隔。auto margin 先吸收空闲空间，再轮到 justify-content，适合导航末端按钮。

## 样式示例与推导

```css
#layout {
  width: 320px;
  display: flex;
}
#a {
  flex: 1;
  white-space: nowrap;
}
#b {
  flex: 0 0 80px;
}
#layout.changed #a {
  min-width: 0;
}
```

设容器内容宽 320px、第二项固定占 80px，第一项理论上剩 240px。接着检查第一项的最小尺寸：默认自动最小宽度可能保留长不可断词的 min-content 宽，使它不能收缩到 240px。给第一项设 `min-width: 0` 后，盒才可收缩；但文字仍可能从盒里溢出，需另选换行、裁剪或省略。**盒能收缩**与**内容能放下**是两道问题。

依据 [Flexbox 1](https://www.w3.org/TR/css-flexbox-1/)，尤其自动最小尺寸与弹性长度解析。
