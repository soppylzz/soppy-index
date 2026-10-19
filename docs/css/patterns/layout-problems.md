# 综合布局题：先说约束，再选方案

面试中的“写一个居中”通常缺少前提：元素是否有固定尺寸、能否脱流、内容会不会增高、是否需要同行。这些条件决定方案，而不只是背一组属性。

## 居中：对齐盒，还是对齐文字

```html
<div class="frame"><div class="card">Content</div></div>
```

```css
.frame {
  display: grid;
  min-height: 240px;
  place-items: center;
}
.card {
  max-width: 100%;
}
```

Grid 在两个轴对齐项目，不要求预先知道 card 宽高；内容过大时仍需设计溢出策略。Flex 双轴居中使用 justify-content 与 align-items，place-items 不能在 Flex 中自动完成同样效果。

普通块水平居中可用受限宽度和 margin-inline:auto；它不自动垂直居中。Text-align:center 对齐行内内容，不居中普通块本身。绝对定位居中适合脱流浮层，参照与百分比见[绝对定位](../position/absolute-fixed.md)。

## 固定侧栏与自适应正文

```html
<div class="layout">
  <aside>Navigation</aside>
  <main>Long content</main>
</div>
```

```css
.layout {
  display: grid;
  grid-template-columns: 14rem minmax(0, 1fr);
  gap: 1rem;
}
.layout > main {
  min-width: 0;
  overflow-wrap: anywhere;
}
@media (width < 40rem) {
  .layout {
    grid-template-columns: minmax(0, 1fr);
  }
}
```

`minmax` 放开轨道下限，min-width 与断行处理项目和内容。窄屏切单列，而不是继续压缩到侧栏比整个屏幕还宽。

Flex 也能实现：侧栏 flex:0 0 14rem，正文 flex:1 1 0 并处理自动最小尺寸。Grid 更直接表达共享列约束；浮动方案适合解释历史代码，需另外处理环绕与包含。

## 三栏、中间自适应与等高

三栏可用 `grid-template-columns: 12rem minmax(0, 1fr) 12rem`，DOM 保持合理阅读顺序。不能为了视觉顺序依赖 order 让键盘焦点来回跳。

同一 Grid 行内或 Flex 行内项目可以借 stretch 呈现等高，但多行 Flex 不共享统一列轨道，也不自动让所有行都同高。需要区分“同一行等高”“所有卡片统一高度”和“内容不被截断”三种需求。

## 页脚贴底，但内容长时继续下移

```html
<div class="page">
  <header>Header</header>
  <main>Main content</main>
  <footer>Footer</footer>
</div>
```

```css
.page {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  min-height: 100dvh;
}
.page > main {
  flex: 1;
}
```

页面默认外边距需按项目设计处理。Min-height 允许内容长时继续增高，main 的增长占用短内容时的剩余空间，footer 不脱流。若改 fixed，页脚可能遮正文；若改固定 height，又需专门设计内部滚动。

这类“短页贴底”不同于 sticky 吸顶，也不是固定屏幕底部的操作栏。

## 还应能独立解释的追问

图片方形裁剪见[替换元素](../text/replaced-elements.md)，标题省略与长词见[文本换行](../text/wrapping.md)，0.5px 边框见[属性面试题](../properties/ask.md)。遇到新题，先确认尺寸来源、流内或脱流、溢出与阅读顺序，再比较方案的代价。
