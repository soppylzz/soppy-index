# 多列与分页：一段内容如何跨越多个区域

Grid 把不同项目放入轨道，多列则让同一内容流在列之间继续排下去。前者安排项目，后者将内容碎片化，阅读顺序与适用场景不同。

## 多列适合连续阅读内容

```html
<article class="story">
  <h2 class="title">A long story</h2>
  <p>First part of the article.</p>
  <p>Second part of the article.</p>
</article>
```

```css
.story {
  columns: 16rem 2;
  column-gap: 2rem;
  column-rule: 1px solid #abc;
}
.title {
  column-span: all;
}
.story p {
  break-inside: avoid-column;
}
```

Columns 同时提供首选列宽与列数限制，实际列数还取决于可用空间；16rem 不是在任意容器中都必须坚持的硬下限。Column-rule 画列间分隔线，不像 border 那样额外占据列间布局宽度。

内容通常先填一列再流向下一列；默认横排下呈现从上到下再向右的阅读，不能用它代替需要横向逐行阅读的卡片 Grid。

## 高度、平衡与断开点

Column-fill 控制适用场景中的填充和平衡，容器高度约束会改变可用列片段。Break-before、break-after 决定盒边界处的断开偏好，break-inside 决定盒内部是否尽量避免拆开。

Avoid 不是绝对禁止：元素大于可用片段、约束冲突时，浏览器可能仍需拆分或溢出。Widows/orphans 则约束适用块中分页或分列时保留的行数，不是通用项目数量限制。

## 打印也是内容碎片化

```css
@media print {
  .toolbar {
    display: none;
  }
  .report {
    columns: auto;
  }
  .report h2 {
    break-after: avoid;
  }
  .report figure {
    break-inside: avoid;
  }
}
@page {
  margin: 15mm;
}
```

打印样式去除无用交互，尽量避免标题孤立或图文被拆散。Page 的 size/margin 与浏览器打印设置、设备能力共同影响输出，不能保证所有环境完全同版。

固定高度加 overflow:hidden 在纸上可能直接丢失内容，应重新设计打印约束；背景颜色是否输出还受用户设置影响。模型见 [CSS Multi-column 1](https://www.w3.org/TR/css-multicol-1/) 与 [CSS Fragmentation 3](https://www.w3.org/TR/css-break-3/)。
