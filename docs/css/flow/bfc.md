# BFC：内部独立，不代表外部布局完全隔离

Flow-root 能让父盒包住浮动，也能阻止父子 margin 折叠。它改变的是内部格式化上下文；理解这个边界，才能判断哪些关系被隔开、哪些仍然存在。

## 一个盒可以在外部参与布局，在内部建立新上下文

```html
<div class="page">
  <div class="panel">
    <div class="figure">Float inside panel</div>
  </div>
  <div class="next">Next block</div>
</div>
```

```css
.page,
.panel {
  display: flow-root;
}
.figure {
  float: left;
  width: 90px;
  height: 80px;
}
```

Panel 与 next 在 page 的 BFC 中排块，panel 又建立内部 BFC，figure 属于后者。

Next 不直接为 figure 环绕或清除，但仍随 panel 的自动高度排布；独立边界不取消尺寸依赖或样式继承。

## 建立方式：相同边界不等于相同行为

| 建立者或条件 | 额外行为或限制 |
| --- | --- |
| 根元素 | 建立文档的初始 BFC |
| display: flow-root | 直接建立独立流布局，不要求浮动、裁剪或脱流 |
| float 非 none | 自身浮动，内部独立 |
| position: absolute 或 fixed | 自身脱离普通流，内部独立 |
| display: inline-block | 外部作为原子行内级盒 |
| table-cell、table-caption | 同时受表格布局规则约束 |
| 适用块盒的 overflow 计算值为 hidden、auto、scroll 等 | 同时引入裁剪或滚动行为 |

适用的 layout/paint containment、多列容器等也会引入独立格式化边界，不必把所有触发条件当成无差别的“修复按钮”。Flex/Grid 容器内部是各自的格式化上下文；项目内部若为流布局，也可能建立独立流上下文。判断时应明确讨论容器内部，还是项目内部。

`overflow: visible/clip` 不单独建立 BFC，需检查两轴计算值，见[溢出](../box/overflow.md)。独立上下文定义见 [CSS Display 3](https://www.w3.org/TR/css-display-3/#establish-an-independent-formatting-context)。

## 内部浮动为何影响自动高度

普通父块不把浮动按流内子块计入自动高度；BFC 根的自动高度会包含参与其内部上下文的相关浮动。上例在无边距、边框、内边距与其他尺寸约束时，panel 的内容高为 80px。

嵌套上下文会改变归属，所以不能扫描所有 DOM 后代的 float，把它们的底边直接作为父高。完整的零高、flow-root 和 clearfix 对比见[浮动与父盒高度](./float.md#父盒只含浮动时高度怎样计算)，高度规则见 [CSS 2.2](https://www.w3.org/TR/CSS22/visudet.html#root-height)。

## 外部浮动：避开整个盒，不只是缩短行盒

```html
<div class="layout">
  <div class="sidebar">Sidebar</div>
  <div class="main">Main content</div>
</div>
```

```css
.layout {
  display: flow-root;
  width: 320px;
}
.sidebar {
  float: left;
  width: 90px;
  height: 80px;
  margin: 0 12px 0 0;
}
.main {
  display: flow-root;
}
```

Main 的边框盒不能与外部同一 BFC 中相关浮动的外边距盒重叠。能放下时可在旁边，宽度约束导致放不下时可能落到下面，不能保证“BFC 自动实现右栏”。

不建立独立 BFC 时，可能只有 main 内的行盒避让，块背景仍延伸到浮动后面。Clear 则要求盒落到相关浮动下方，和允许侧旁避让不同。关系见 [CSS 2.2 块级格式化上下文](https://www.w3.org/TR/CSS22/visuren.html#block-formatting)。

## Margin：隔开内部，不取消外部兄弟的折叠

| 相接关系                                          | 父盒设置 flow-root 后      |
| ------------------------------------------------- | -------------------------- |
| 父盒与首尾子块                                    | 不跨该边界折叠             |
| 内部普通块兄弟                                    | 仍可能折叠                 |
| 两个同属外层 BFC 的流内块兄弟，各自又为 flow-root | 自身外部 margin 仍可能折叠 |

例如两个有内容的相邻块，各自设置 flow-root，前者 margin-bottom: 30px、后者 margin-top: 20px。在默认横排、同一外层 BFC、无 clearance 等干扰时，间距仍为 30px。

这与它们内部的子 margin 不穿过自身边界并不矛盾。逐项条件和负 margin 算法见[外边距折叠](./margin-collapse.md)。

## BFC 不解决什么

建立 BFC 不会让不可断长词自动换行，不会解除 min-width 等尺寸约束，也不提供 CSS 作用域、堆叠隔离或合成层保证。遇到长内容撑破 Flex/Grid，应检查其最小尺寸与断行策略，而非继续叠加 BFC 触发属性。

需要流边界用 flow-root，需要滚动选 overflow，需要外部入行用 inline-block；建立相同边界不意味着可无条件互换。
