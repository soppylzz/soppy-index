# 逻辑方向：起始边不一定是左边

把英语组件放到 RTL 页面，margin-left 仍在左边，但它未必还是内容起始边。逻辑属性把“跟随文字布局”与“固定屏幕方向”分开表达。

## 先确定行内轴，再确定块轴

`inline` 轴沿一行文字排列，block 轴沿新行排列。writing-mode 决定轴的方向关系，direction 主要影响行内方向及双向排版。

| 模式                | inline-start → inline-end | block-start → block-end |
| ------------------- | ------------------------- | ----------------------- |
| horizontal-tb + ltr | 左 → 右                   | 上 → 下                 |
| horizontal-tb + rtl | 右 → 左                   | 上 → 下                 |
| vertical-rl + ltr   | 上 → 下                   | 右 → 左                 |

不要把 block 永久翻译成竖直方向，也不要把 inline 永久翻译成横向。Flex 的 row 沿行内轴，column 沿块轴；Grid 的 justify 对应行内轴，align 对应块轴。

## 用一组声明观察映射

```html
<article class="note" dir="rtl">Example text</article>
```

```css
.note {
  inline-size: 160px;
  block-size: 80px;
  padding-inline-start: 12px;
  border-inline-start: 4px solid teal;
  margin-block: 16px;
}
```

默认横排中，inline-size 对应 width；RTL 时起始 padding 和边框位于右边。若改为 vertical-rl 且 ltr，160px 对应物理高度，起始边位于顶部。

常用对应关系是 width/height → inline-size/block-size，margin-left/right → margin-inline-start/end，top 等定位边 → inset-block-start 等。但必须先确认目标语义，不能机械替换。

## 逻辑属性与物理属性不是两个盒模型

```css
.note {
  margin-left: 8px;
  margin-inline-start: 16px;
}
```

横排 ltr 下两者映射到同一边，参与层叠，条件相同时后者生效；rtl 下则分别影响左右两边。混用时要检查最终映射，不要以为总是两套值相加。

## RTL 不等于完整镜像

方向箭头、播放图标、数字与代码有不同语义。文本的双向算法也不等于简单倒序；应由 HTML 的 dir、必要的 bdi 等提供语义，而不是只靠 text-align:right 模拟 RTL。

屏幕固定边缘、阴影光源等可以继续用物理方向。组件内容起始边、阅读间距更适合逻辑方向。依据 [CSS Logical Properties 1](https://www.w3.org/TR/css-logical-1/) 与 [Writing Modes 3](https://www.w3.org/TR/css-writing-modes-3/)。
