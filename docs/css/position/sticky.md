# Sticky：跟着谁滚，又被谁限制

`sticky` 保留流内位置，只在滚动时调整偏移。解释它需要两个边界：最近滚动容器的 scrollport 决定贴近哪里，包含块决定最多能移动到哪里。

## 用独立滚动区观察吸顶

```html
<div class="scroller">
  <section class="chapter">
    <h2 class="heading">Chapter one</h2>
    <div class="body">Long content</div>
  </section>
  <div class="after">Next chapter</div>
</div>
```

```css
.scroller {
  height: 200px;
  overflow: auto;
}
.heading {
  position: sticky;
  top: 0;
  height: 40px;
  margin: 0;
  background: white;
}
.body {
  height: 400px;
}
.after {
  height: 400px;
}
```

假定无其他间距，chapter 高 440px。向下滚动时，heading 贴住 scroller 顶部；滚动超过约 400px 后，chapter 的底边开始把它一起带走。它不能为了继续吸顶而跑出自己的章节。

这里的高度数字用于解释边界，不是浏览器实测。增加 z-index 只能改变重叠时的绘制顺序，不能延长 chapter。

## 逐个排查不生效的原因

| 现象                     | 应检查什么                                            |
| ------------------------ | ----------------------------------------------------- |
| 完全没有吸顶             | 纵轴 top/bottom 是否至少一个非 auto；实际是否发生滚动 |
| 页面滚动却不吸顶         | 最近滚动祖先是否被 overflow:hidden/auto 等截获        |
| 只贴住一瞬间             | 包含块是否与 sticky 一样高，缺少移动距离              |
| Flex/Grid 中不移动       | stretch 是否把项目拉到接近包含块高度                  |
| 吸顶后内容透出来或被遮住 | 背景和层叠顺序，而不是 sticky 阈值                    |

`overflow: hidden` 可以建立滚动容器，即使用户看不到滚动条；`clip` 不提供同样的滚动参照。还要检查两轴计算值，见[溢出](../box/overflow.md)。

## 项目拉伸与过大元素

在 Grid 两栏中，侧栏 sticky 项目可能默认拉伸到整行高度；适用时用 `align-self: start` 让其按内容取高。换到 Flex 时先判断交叉轴方向，不能把这一行属性当成所有失效问题的修复。

`sticky` 高于可视滚动区也不代表必然失效。规范会调整有效的末端 inset 来容纳它，但用户未必能按预期看到全部内容；需要重新考虑高度约束或内部滚动。

`sticky` 会创建层叠上下文，但它不自动高于页面所有内容。规则见 [CSS Position 3 的 sticky 模型](https://www.w3.org/TR/css-position-3/#sticky-pos)。
