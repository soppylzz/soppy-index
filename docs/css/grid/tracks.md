# 轨道尺寸：fr 分配什么，为什么 1fr 仍会撑破容器

1fr 不保证轨道始终相等：弹性分配仍受内容下限与其他轨道约束。先确定轨道范围，再计算剩余空间。

## 在确定空间中计算弹性轨道

```html
<div class="layout">
  <div>Fixed</div>
  <div>One share</div>
  <div>Two shares</div>
</div>
```

```css
.layout {
  display: grid;
  width: 500px;
  grid-template-columns: 100px minmax(0, 1fr) minmax(0, 2fr);
  gap: 10px;
}
```

content-box、无项目 margin/padding/border：500px 扣固定列 100px 和两个 10px gap，剩 380px；弹性列分别约为 126.67px、253.33px。

fr 分配固定轨道、gap 等之外的空间；百分比则按容器参照计算，三列各 33.333% 再加 gap 可能溢出。

此处固定了确定空间和零下限；内容约束或不确定尺寸需按完整算法求解，见 [Grid 2](https://www.w3.org/TR/css-grid-2/#fr-unit)。

## 裸 1fr 隐含 auto 下限

```html
<div class="columns">
  <div class="main">AnExtremelyLongUnbreakableIdentifierThatCannotFit</div>
  <div>Aside</div>
</div>
```

```css
.columns {
  display: grid;
  width: 320px;
  grid-template-columns: 1fr 80px;
}
.main {
  white-space: nowrap;
}
```

裸 1fr 相当于 minmax(auto, 1fr)，本例内容最小需求可能抬高下限，使左轨超过剩余 240px。

```css
.columns {
  grid-template-columns: minmax(0, 1fr) 80px;
}
```

下限改为 0 后左轨可取 240px，但 nowrap 内容仍可能溢出；轨道收缩与内容显示分别处理。

`min-width: 0` 放开项目下限，minmax(0, 1fr) 放开轨道下限；简单例子可能都有效，但跨列、多项目或显式约束下不能视为等价。内容尺寸见[自动尺寸](../box/sizing.md)。

## Auto、min-content、max-content 与 minmax

| 轨道值             | 描述的约束                                               |
| ------------------ | -------------------------------------------------------- |
| 120px              | 固定长度轨道，内容仍可能溢出                             |
| min-content        | 按最小内容贡献参与轨道求解                               |
| max-content        | 按最大内容贡献参与轨道求解                               |
| auto               | 结合内容、项目最小需求等确定范围，还可能在对齐阶段被拉伸 |
| minmax(120px, 1fr) | 下限 120px，上限参与弹性分配                             |

`minmax()` 的最小值不能是 fr，例如 minmax(1fr, 2fr) 无效。多个下限合计超过可用空间时，布局可以溢出，fr 不会无条件把它们压到小于最小值。

轨道综合相关项目的内容贡献，包括跨轨道项目，不只看第一个子盒。算法见 [Grid 2](https://www.w3.org/TR/css-grid-2/#algo-track-sizing)。

### 自动最小尺寸并非所有项目都保留 min-content

Grid 项目的 auto 最小尺寸采用内容下限，需满足计算 overflow 为非滚动类型、至少跨一个 auto 最小轨道等条件；跨多条轨道时，所跨轨道还不能包含弹性轨道。不满足时可为零，不能把 Flex 的自动最小尺寸口诀直接复制到 Grid。规则见 [Grid 2](https://www.w3.org/TR/css-grid-2/#min-size-auto)。

轨道的 `fit-content(200px)` 将自动下限、内容上限与给定限制共同求解，通常可理解为 `max(auto minimum, min(200px, max-content))`；内容最小需求超过 200px 时仍可超出，不是硬性的 max-width。它与盒宽的 fit-content 关键字属于不同使用位置。

fr 因子总和不足 1 时也不保证分完空间：确定宽 300px、只有一列 minmax(0, 0.5fr) 且无其他约束时，轨道可只取 150px。不确定尺寸时的 fr 则需按内容求解，不能直接乘容器宽。

## Auto-fill 与 auto-fit：空轨道是否保留

```css
.cards {
  display: grid;
  width: 500px;
  gap: 10px;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
}
```

假定只有两个自动放置、没有跨列的项目。500px 能容纳三条最低 150px 的轨道及两个 10px gap：auto-fill 保留第三条空轨道，三列最终各为 160px。

`auto-fit` 会折叠放置后为空的轨道及相关 gap，两项各得 245px；三条轨道均被占用时，两者相同。跨越轨道的项目也影响是否为空，不按某一行单独判断。

```css
.cards {
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 150px), 1fr));
}
```

`min(100%, 150px)` 避免容器窄于 150px 时最低列宽仍过大，但不替代内容断行。自动重复规则见 [Grid 2](https://www.w3.org/TR/css-grid-2/#auto-repeat)。
