# 弹性尺寸：basis、grow、shrink 与自动最小尺寸

Grow 相同不保证等宽，flex: 1 也不保证不溢出。需要先确定基准，再分配空间，最后结合尺寸约束。

## Basis 提供计算起点，不承诺最终尺寸

```html
<div class="row">
  <div class="first">First</div>
  <div class="second">Second</div>
</div>
```

```css
.row {
  display: flex;
  width: 500px;
}
.first,
.second {
  flex-grow: 1;
  flex-shrink: 1;
  min-width: 0;
  margin: 0;
  padding: 0;
  border: 0;
}
.first {
  flex-basis: 100px;
}
.second {
  flex-basis: 200px;
}
```

以下固定 row 横向，无 gap、max-width 或其他约束，box-sizing 为 content-box。两项基准尺寸合计 300px，容器剩余 200px。

Basis 为 auto 时参考主尺寸属性：row 通常看 width，column 看 height；主尺寸也是 auto 时按内容求解。明确 basis 与 width 不相加，也不进行层叠竞争。

内容、比例与盒模型也影响基准。本文先用明确长度排除这些因素，算法见 [Flexbox 1](https://www.w3.org/TR/css-flexbox-1/#resolve-flexible-lengths)。

## Grow 分配增量，不直接分配最终宽度

上例 grow 都为 1，剩余 200px 各分 100px，所以最终为 200px 与 300px，不是各 250px。

第二项 grow 改为 2，增量按 1:2 分配，最终约为 166.67px、333.33px。比例针对新增空间，不针对最终宽度。

因子总和小于 1 时不一定分完空间：单个项目 basis: 100px、grow: 0.5，容器宽 300px 时只吸收剩余 200px 的一半，最终宽 200px。

## Shrink 按因子乘基准尺寸分摊不足

把最初容器改为 240px，其他条件不变：两项合计 300px，需要减少 60px。

收缩权重为 `shrink * base size`，本例是 100:200，分别减少 20px、40px，最终为 80px、160px。相同 shrink 不等于减相同像素。

若其中一项 shrink 为 0，它不参与这次收缩，其他项需要承担更多不足；若都不收缩，容器可以溢出，不会自动改成换行。是否允许换行由 flex-wrap 控制。

## Min/max 会改变分配，受限项目需要冻结

回到容器宽 500px、basis 为 100px 和 200px、grow 都为 1，给第一项 max-width: 150px。最初按比例得到的 200px 超过上限，不能只把第一项截到 150px、却让第二项停在 300px。

最终第一项为 150px，第二项继续吸收空间至 350px。算法会约束检查、冻结受限项目并重新分配，不是末尾简单截断。

这种共同求解属于布局中使用值的确定，不是 max-width 声明覆盖 flex-grow。阶段区别见[值处理](../properties/processing.md)。

## Flex: 1 为什么仍然可能溢出

```html
<div class="layout">
  <div class="main">AnExtremelyLongUnbreakableIdentifierThatCannotFit</div>
  <div class="aside">Aside</div>
</div>
```

```css
.layout {
  display: flex;
  width: 320px;
}
.main {
  flex: 1 1 0;
  white-space: nowrap;
}
.aside {
  flex: 0 0 80px;
  min-width: 0;
}
```

无 gap、margin、padding、border 时，main 理应剩 240px，但主轴 auto 最小尺寸可能保留内容下限。计算 overflow 为非滚动类型时通常采用内容相关下限，还受比例、指定尺寸等影响。

可以按需求明确放开下限：

```css
.main {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
}
```

`min-width: 0` 放开盒下限；配合已有 nowrap、hidden、ellipsis 才表达截断。若要换行，应去掉 nowrap，并按需设置 overflow-wrap。

Column 对应检查 min-height: 0，嵌套时找到阻止收缩的实际项目。滚动类型 overflow 的 auto 最小尺寸可为零，不应把“隐藏内容”与“解除尺寸下限”混为一种机制。规则见 [Flexbox 1](https://www.w3.org/TR/css-flexbox-1/#min-size-auto)。

## 常见简写表达不同策略

| 简写          | 主要含义                     |
| ------------- | ---------------------------- |
| flex: initial | 0 1 auto；不增长，允许收缩   |
| flex: auto    | 1 1 auto；以自动基准参与伸缩 |
| flex: none    | 0 0 auto；不伸缩             |
| flex: 1 1 0   | 明确以零长度为基准参与伸缩   |

单值 flex: 1 在浏览器中常展开为 1 1 0%，规范的省略基准为零长度。主尺寸不确定时，0% 可能按内容处理，与明确 0 不同；推导时宜写全分量。
