# 放置与对齐：项目占哪个区域，区域内怎样排列

放置决定项目占哪个区域，对齐决定它在区域内怎样摆放。先找边界，再看尺寸与剩余空间。

## 用网格线与 span 指定范围

```html
<div class="layout">
  <div class="header">Header</div>
  <div class="sidebar">Sidebar</div>
  <div class="main">Main</div>
</div>
```

```css
.layout {
  display: grid;
  grid-template-columns: 100px minmax(0, 1fr);
  gap: 12px;
}
.header {
  grid-column: 1 / -1;
}
.sidebar {
  grid-column: 1;
}
.main {
  grid-column: 2;
}
```

Header 跨两列，后两项进入后续可用行。1 / 3 表示第 1、3 条线之间的两列，1 / span 2 则指定从第 1 条线跨两条轨道。

负数从显式网格末端计数，-1 不是任意隐式网格的末端。放置越界可生成隐式轨道，见 [Grid 2](https://www.w3.org/TR/css-grid-2/#line-placement)。

## 命名区域表达整体结构

沿用相同 HTML，也可以用名称描述布局：

```css
.layout {
  display: grid;
  grid-template-columns: 100px minmax(0, 1fr);
  grid-template-areas:
    "header header"
    "sidebar main";
  gap: 12px;
}
.header {
  grid-area: header;
}
.sidebar {
  grid-area: sidebar;
}
.main {
  grid-area: main;
}
```

同名区域须为矩形，每行列数一致；点号为空格。名称通过 grid-area 绑定项目，不自动匹配 class，也不改变 DOM。

Grid-area 使用四个线值时，顺序是 row-start / column-start / row-end / column-end，不是普通 margin 的上右下左顺序。

## 自动放置与 dense 回填

```html
<div class="cards">
  <div class="wide">A</div>
  <div class="wide">B</div>
  <div>C</div>
</div>
```

```css
.cards {
  display: grid;
  grid-template-columns: repeat(3, 100px);
  grid-auto-flow: row;
  gap: 10px;
}
.wide {
  grid-column: span 2;
}
```

A 占第一行前两列，B 跨两列放不进剩余一格，因此进入第二行前两列。默认稀疏放置继续前进，C 进入第二行第三列，第一行留下空位。

Row dense 允许 C 回填第一行第三列，视觉顺序变为 A、C、B，但 DOM 和通常焦点顺序仍为 A、B、C，不宜用来随意重排有序表单。

Grid-auto-flow: column 则改变自动放置推进方向，并可能生成隐式列；order 和显式放置也会影响放置结果。完整算法见 [Grid 2 自动放置](https://www.w3.org/TR/css-grid-2/#auto-placement-algo)。

## 项目对齐与轨道组对齐分开计算

| 属性                        | 操作对象与方向                          |
| --------------------------- | --------------------------------------- |
| justify-items、justify-self | 项目在其区域内，沿行内轴对齐            |
| align-items、align-self     | 项目在其区域内，沿块轴对齐              |
| justify-content             | 整个轨道组沿容器行内轴对齐或分配空间    |
| align-content               | 整个轨道组沿容器块轴对齐或分配空间      |
| place-items                 | align-items 与 justify-items 的简写     |
| place-content               | align-content 与 justify-content 的简写 |

Grid 的 justify/align 按行内轴与块轴划分，不随 Flex 的 flex-direction 切换。默认横排时通常是水平与垂直，竖排时不能继续照搬。

```css
.board {
  display: grid;
  width: 400px;
  height: 200px;
  grid-template-columns: 100px 100px;
  grid-template-rows: 60px;
  gap: 20px;
  justify-content: center;
  align-content: center;
  place-items: center;
}
.tile {
  width: 40px;
  height: 20px;
}
```

假定 board 内有两个 tile，且没有其他内外边距或边框。轨道组宽 220px，居中后左右各留 90px；高 60px，居中后上下各留 70px。每个 tile 再在自己的 100 × 60px 区域内居中，区域左右各留 30px、上下各留 20px。

列改为两个 minmax(0, 1fr) 后填满可用宽度，justify-content 无空间移动轨道组；justify-items 仍可在区域内对齐项目。明确尺寸、固有比例和 min/max 也会限制拉伸。

## 允许重叠不等于退出布局

多个项目可以显式放入同一区域，它们仍是 Grid 项目，不必改为 absolute。绘制先后和 z-index 决定遮挡；Grid 项目即使没有 position，也可以通过非 auto 的 z-index 建立堆叠上下文。

auto margin 先吸收区域内相应正空闲空间，再处理普通对齐。区域、盒尺寸与绘制顺序须分别判断，规则见 [Grid 2](https://www.w3.org/TR/css-grid-2/#alignment)。
