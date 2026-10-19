# 外边距折叠：哪些间距不能直接相加

相邻块的 30px 和 20px 外边距可能只形成 30px 间距。先判断哪些 margin 相接并组成同一折叠集合，再计算间距。

以下只讨论默认横排普通块布局中的上下外边距。左右外边距、Flex/Grid 项目之间的外边距不按这套规则折叠。

## 相邻兄弟：相接外边距合并计算

```html
<div class="group">
  <div class="first">First</div>
  <div class="second">Second</div>
</div>
```

```css
.first,
.second {
  height: 40px;
  padding: 0;
  border: 0;
  margin: 0;
}
.first {
  margin-bottom: 30px;
}
.second {
  margin-top: 20px;
}
```

两者在同一 BFC、没有 clearance 等干扰时，边框盒之间相距 30px。兄弟各自有 border/padding 也不必阻断这处折叠，因为它们不位于两段相接 margin 之间。

| 同一折叠集合中的值 | 结果  | 计算方式                     |
| ------------------ | ----- | ---------------------------- |
| 30px、20px         | 30px  | 全为非负时取最大值           |
| -30px、-20px       | -30px | 全为非正时取绝对值最大的负值 |
| 30px、-20px        | 10px  | 最大正值与最负值相加         |
| 30px、20px、-10px  | 20px  | 整个集合只取最大正值与最负值 |

折叠集合可能超过两个 margin，计算时保留整个集合的最大正值与最负值。例如 30px、-20px、20px 的结果为 10px；若先将前两项压成 10px，再与 20px 取最大值，会错误得到 20px。负结果允许盒重叠，不会被强制限制为 0。

## 父子：子元素的 margin 为什么像跑到了父盒外面

```html
<div class="outer">
  <div class="parent">
    <div class="child">Child</div>
  </div>
</div>
```

```css
.outer {
  display: flow-root;
}
.parent {
  background: #def;
  margin: 0;
}
.child {
  height: 40px;
  margin: 20px 0 0;
}
```

Outer 的 flow-root 隔开外部。Parent 与 child 之间没有顶部 border/padding、行盒或 clearance，20px 可与父 margin 的 0 折叠，因此背景顶边与 child 对齐，间距留在 parent 外。

在 parent 上加 padding-top: 1px 或 border-top: 1px solid transparent，会分隔相接边缘；child 的 20px margin 改在父盒内部。使用 flow-root 则通过独立上下文隔断父子折叠，不需要补一像素。

### 顶部能折叠，不代表底部也能折叠

| 情况 | 主要条件，须同时满足相应规则 |
| --- | --- |
| 父与首个流内块子项顶部 | 无顶部 border/padding、无中间行盒，子项无阻断该关系的 clearance，父不以新 BFC 隔开内容 |
| 父与末个流内块子项底部 | 无底部 border/padding 等阻隔，父 height 为 auto，并符合 min-height、clearance 等限制 |
| 空块自身上下两侧 | 无 border/padding、行盒等阻隔，height 为 auto 或 0、最小高度为零，且满足流与上下文条件 |

固定 height 不会单独阻止顶部父子折叠，但会改变底部折叠条件。非零 min-height 主要阻止空块上下贯通，并在涉及贯通折叠时限制底部关系，不能一概说它禁止所有父子底部折叠。源码缩进和可折叠空白通常不构成行盒阻隔；真实文字则可能形成行盒。

## 空块可能把上下两侧连成一个集合

```css
.empty {
  height: auto;
  min-height: 0;
  margin: 20px 0 30px;
}
```

假定这个块没有 border、padding、行盒或其他阻断折叠的内容，且不建立独立 BFC，其自身上下 margin 可以折叠。若它位于两个普通块之间，相接的兄弟 margin 也可能通过它连成更大的折叠集合。

所以 DOM 中夹着一个空 div，也不保证两侧间距隔开。完整条件见 [CSS 2.2 的外边距折叠](https://www.w3.org/TR/CSS22/box.html#collapsing-margins)。

## 建立 BFC 不代表内部所有 margin 都不再折叠

给 group 设置 flow-root 只隔开其内部与父边界，first 和 second 之间仍可折叠。即使两个兄弟各自设置 flow-root，它们自身外部相接的上下 margin 仍可能折叠；BFC 根的外部与其内部要分开判断。

若把 group 改为 display: flex 且 flex-direction: column，两个子盒变成 Flex 项目，其 margin 不折叠，原例间距才是 `30 + 20 = 50px`。Flex/Grid 的 gap 则提供项目间间隔，不参与 margin 折叠；选择方案时应以布局需求为准。

## 按间距意图选择修复方式

父盒内部留白用 padding；兄弟间距可统一单向 margin，或在已有 Flex/Grid 中用 gap；独立流边界用 flow-root，不必借裁剪间接建立。

浮动盒、绝对定位盒、inline-block 等的 margin 不按普通流块折叠；clearance 又会改变部分相接条件。不要把“所有垂直 margin 取最大值”当成通用计算公式。
