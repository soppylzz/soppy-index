# 表格布局：内容怎样共同约束列宽

两行里的单元格能自动共享列边界，来自表格布局的列约束，而不是每行分别排一次 Flex。数据表还应使用 table、th、td 表达行列语义。

## 表格先建立行列结构

```html
<table class="records">
  <caption>
    Tasks
  </caption>
  <colgroup>
    <col class="name-column" />
    <col />
  </colgroup>
  <thead>
    <tr>
      <th scope="col">Name</th>
      <th scope="col">Description</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <th scope="row">Draft</th>
      <td>Short description</td>
    </tr>
    <tr>
      <th scope="row">Published</th>
      <td>A longer description</td>
    </tr>
  </tbody>
</table>
```

Table-row、table-cell 等 display 值提供 CSS 盒角色，结构不完整时还可能补匿名盒；这些视觉角色不能替代 HTML 表头与单元格关系。基础角色见[display](../box/display.md)。

## Auto 与 fixed 分别让谁影响列宽

| table-layout | 列宽的重要输入                       | 取舍                               |
| ------------ | ------------------------------------ | ---------------------------------- |
| auto         | 多行内容的最小、最大需求及显式约束   | 适应内容，但新增长内容可能改变布局 |
| fixed        | 表格宽度、列的指定宽度、首行单元格等 | 更容易稳定列宽，后续内容可能溢出   |

```css
.records {
  width: 100%;
  table-layout: fixed;
  border-collapse: collapse;
}
.name-column {
  width: 8rem;
}
.records th,
.records td {
  border: 1px solid #789;
  padding: 8px;
  overflow-wrap: anywhere;
}
```

要发挥 fixed 模型的作用，表格宽度需要按适用规则确定，不能只设 table-layout:fixed 后仍期待所有 auto 场景都固定。内容不会因为列宽确定就自动省略，需要另外设计断行或截断。

## 两套边框模型

`separate` 让单元格保留独立边框，border-spacing 控制间距；collapse 合并相邻边框，冲突由样式、宽度、来源等规则解决，不是两条边框简单叠加。`border-spacing` 不在合并模型中提供同样间距。

单元格的 vertical-align 可以进行顶部、中部、基线等对齐，但 margin 不按普通块那套方式使用。行高与单元格跨行也受整行约束，height 不总是严格的最终上限。

## 宽数据表如何适配窄屏

可将 table 放入受限的横向滚动容器，保留表头和数据关系；不要为了塞进屏幕无差别把所有行列改成 block。固定表头、复杂跨行和滚动组合要单独验证。

自动布局的具体分配存在实现细节，面试重点是区分输入、约束和溢出。基础模型见 [CSS 2.2 Tables](https://www.w3.org/TR/CSS22/tables.html)。
