# Grid 模型：用共享轨道约束二维布局

Flex 各行独立分配空间，Grid 则用共享行列轨道约束项目。需要跨行对齐列边界时，应从轨道模型理解布局。

## 容器定义轨道，项目放入区域

```html
<div class="cards">
  <div class="card">A</div>
  <div class="card">B</div>
  <div class="card">C</div>
  <div class="card">D</div>
</div>
```

```css
.cards {
  display: grid;
  width: 320px;
  grid-template-columns: 100px 100px;
  grid-template-rows: 60px 60px;
  gap: 12px;
}
```

默认横排 ltr、无其他声明时，四个流内直接子盒成为项目，默认自动放置按行填入两列，列宽不会按每行项目数量重新分配。

Grid 与 inline-grid 仅在容器外部参与方式上不同；孙元素不自动成为外层项目，绝对定位子盒不按普通项目占格。规则见 [Grid 2](https://www.w3.org/TR/css-grid-2/#grid-items)。

默认 template 没有显式轨道，auto-flow 为 row，隐式轨道尺寸为 auto。普通项目 margin 不折叠，float/clear 不按浮动方式控制项目；匿名文本和脱流子盒也需区别于普通项目。

## 网格线、轨道、单元格与区域分别是什么

| 概念           | 在本例中怎样理解                                 |
| -------------- | ------------------------------------------------ |
| line，网格线   | 两列有三条列边界线，正向编号为 1、2、3           |
| track，轨道    | 两条相邻同方向网格线之间的一整列或一整行         |
| cell，单元格   | 一条行轨道和一条列轨道相交的最小区域             |
| area，网格区域 | 由两条行线和两条列线围成的矩形，可覆盖多个单元格 |
| gap，沟槽      | 轨道之间的间隔，不在容器边缘自动增加留白         |

区域不等于项目实际盒尺寸，对齐和 min/max 仍参与。本例轨道组宽 212px，容器宽 320px，两者不能混淆。

行列使用逻辑轴：默认横排下列沿水平方向展开，行沿竖直方向展开；改变 writing-mode 后，不能继续把列宽固定理解为屏幕水平方向长度。

## 显式与隐式轨道不是两种布局模式

```css
.cards {
  display: grid;
  grid-template-columns: repeat(2, 100px);
  grid-template-rows: 60px;
  grid-auto-rows: 80px;
  gap: 12px;
}
```

第一行显式轨道高 60px；第三、第四项需要新行，由 grid-auto-rows 生成 80px 高的隐式轨道。

越界显式放置也能生成隐式轨道。Template 定义显式轨道，auto-rows/columns 定义隐式尺寸，auto-flow 决定自动放置方向。

## 普通嵌套 Grid 与 subgrid 的区别

一个项目设置 display: grid，通常为后代建立独立轨道；即使它和父容器都写 1fr 1fr，两套轨道也不自动共享。

```html
<div class="form">
  <div class="field">
    <label for="email">Email address</label>
    <input id="email" type="email" />
  </div>
  <div class="field">
    <label for="name">Name</label>
    <input id="name" />
  </div>
</div>
```

```css
.form {
  display: grid;
  grid-template-columns: max-content minmax(0, 1fr);
  gap: 12px;
}
.field {
  display: grid;
  grid-column: 1 / -1;
  grid-template-columns: subgrid;
}
```

Field 跨父网格两列，subgrid 让其内部列线和内容贡献参与父轨道；行轴未设 subgrid，仍独立求解。它不是将所有后代都改成父项目，见 [Grid 2](https://www.w3.org/TR/css-grid-2/#subgrids)。

共享轨道解决对齐关系，轨道具体多宽还需要结合内容、fr 和最小尺寸求解，见[轨道尺寸](./tracks.md)。
