# 对齐与换行：剩余空间最后怎样放置

Flex 对齐处理的是尺寸分配后剩余的空间。先确认轴、可用空间和操作对象，再判断属性为何没有效果。

## 弹性分配之后，主轴还有多少空闲空间

```html
<div class="toolbar">
  <div class="brand">Notes</div>
  <div class="actions">Actions</div>
</div>
```

```css
.toolbar {
  display: flex;
  width: 400px;
  gap: 20px;
  justify-content: space-between;
}
.brand,
.actions {
  flex: 0 0 100px;
  min-width: 0;
  margin: 0;
  padding: 0;
  border: 0;
}
```

普通横排、无其他约束时，两项共 200px、gap 为 20px，剩 180px 由 space-between 放入项间，最终间距 200px。Gap 不是最终间距上限。

若改为 flex: 1 1 0，两项先各长到 190px，对齐阶段没有多余空间，项间只剩 20px gap。

常见主轴值的差别在于剩余空间放在哪里：

| 值                             | 正空闲空间的分布                 |
| ------------------------------ | -------------------------------- |
| flex-start / flex-end / center | 起点 / 末端 / 两端平分           |
| space-between                  | 只分到项目之间                   |
| space-around                   | 每项两侧均分，内部间距为边缘两倍 |
| space-evenly                   | 边缘与内部间距相同               |

Flex 不使用 justify-items / justify-self 对齐单个项目；主轴通常用 auto margin，交叉轴用 align-self。`place-items: center` 不能在 Flex 中自动完成双轴居中。

## Auto margin 先于 justify-content 吸收空间

```css
.toolbar {
  justify-content: flex-start;
}
.actions {
  margin-left: auto;
}
```

两项各 100px 时，actions 左 auto margin 吸收剩余 180px，加 gap 后间距仍为 200px；需要适配文字方向时改用相应逻辑外边距。

多个 auto margin 平分正空闲空间，且先于 justify-content 处理；没有正空间就不会凭空制造间隔。规则见 [Flexbox 1](https://www.w3.org/TR/css-flexbox-1/#auto-margins)。

## Align-items 对齐行内项目，align-content 分布多行

| 属性 | 操作对象 | 需要注意的条件 |
| --- | --- | --- |
| align-items | 每个项目在其所在行中的交叉轴对齐 | 默认 stretch 的拉伸还需交叉尺寸为 auto 等条件 |
| align-self | 单个项目的交叉轴对齐 | 可覆盖容器的 align-items，auto margin 也会影响结果 |
| align-content | 多行 Flex 容器中，各行在交叉轴上的分布 | nowrap 的单行容器不适用；wrap 容器即使实际只有一行也不同 |

```html
<div class="cards">
  <div class="card">A</div>
  <div class="card">B</div>
  <div class="card">C</div>
</div>
```

```css
.cards {
  display: flex;
  flex-wrap: wrap;
  width: 220px;
  height: 200px;
  gap: 10px;
  align-content: space-between;
  align-items: center;
}
.card {
  flex: 0 0 100px;
  height: 40px;
  min-width: 0;
  margin: 0;
  padding: 0;
  border: 0;
}
```

第一行能放两项，第三项进入第二行。每行交叉尺寸在这些条件下为 40px，两行与基本行间 gap 合计 90px，剩余 110px 由 align-content 额外分配到行间，实际行间距为 120px。

`align-items` 只在各自行内对齐，不移动整个行组；行组居中用 align-content: center。交叉尺寸明确为 40px 时，stretch 也不会直接把项目拉满 200px。

`align-items: baseline` 对齐项目的基线，不是对齐边框底边；文字字号不同的表单或工具栏中，两者视觉结果不同。`stretch` 也需要交叉尺寸为 auto、无自动交叉外边距等条件。

## Gap、换行与行内增长一起看

若上例改为 flex: 1 1 100px，分行后每行独立增长，最后一项可扩展到整行宽度。它不会自动继承上一行的列边界；这也是 Flex 卡片最后一行常显得不同的原因。

`gap` 只在项目或行之间留空间，不增加边缘 padding，也不折叠。跨行列线需要一致时，用 Grid 比为最后一项补特殊宽度更直接。

## 居中之前，先保证溢出内容仍可访问

内容大于容器时，center 可能让两端都溢出，起点内容不一定能滚回查看。可以考虑适用的 safe center，在空间不足时退回安全起点。

排查次序：轴与受限尺寸 → 弹性和 min/max → auto margin → 剩余空间 → 对齐。规则见 [Flexbox 1](https://www.w3.org/TR/css-flexbox-1/#alignment)。
