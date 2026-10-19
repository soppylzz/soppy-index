# 溢出与滚动：内容放不下后发生什么

`overflow` 决定超出盒尺寸的内容如何呈现与滚动，不会自动缩小内容。

## 先用同一组内容比较取值

```html
<div class="viewport">
  <div class="content">Content taller than its container.</div>
</div>
```

```css
.viewport {
  width: 200px;
  height: 80px;
  overflow: auto;
}
.content {
  height: 240px;
}
```

仅替换 overflow，从初始滚动位置比较：

| 取值    | 超出部分             | 用户滚动界面         | 脚本滚动 |
| ------- | -------------------- | -------------------- | -------- |
| visible | 可绘制在盒外         | ❌                   | ❌       |
| hidden  | 裁剪                 | ❌                   | ✅       |
| clip    | 裁剪                 | ❌                   | ❌       |
| scroll  | 裁剪到滚动视口       | 提供，外观取决于平台 | ✅       |
| auto    | 溢出时按滚动机制处理 | 按需提供             | ✅       |

脚本滚动列针对本例确有溢出、可产生滚动范围的普通块。给 hidden 元素设置 scrollTop: 40 可以改变可见内容；改为 clip 后不具备这种滚动能力。Visible 虽不使自己滚动，溢出内容仍可能计入祖先的滚动区域。规则见 [CSS Overflow 3](https://www.w3.org/TR/css-overflow-3/#overflow-properties)。

裁剪范围也不同：hidden 等通常在 padding edge 裁剪，clip 使用 overflow clip edge，可由 overflow-clip-margin 调整；不能只凭两者默认画面相似判为等价。

## 有滚动能力，不代表始终看得见滚动条

传统滚动条占用盒内空间，可改变换行；覆盖式滚动条叠在内容上。平台设置也影响显示，scroll 不保证始终画出滚动条。

```css
.viewport {
  overflow: auto;
  scrollbar-gutter: stable;
}
```

在采用传统滚动条的适用条件下，stable 可预留沟槽，减少滚动条出现时的横向位移；覆盖式滚动条不会因此强制预留同样空间。它也不是设置固定滚动条宽度的属性，定义见 [scrollbar-gutter](https://www.w3.org/TR/css-overflow-3/#scrollbar-gutter-property)。

## 两个轴的声明并不完全独立

```css
.viewport {
  overflow-x: hidden;
  overflow-y: visible;
}
```

这里 overflow-y 计算为 auto：任一轴不是 visible/clip 时，另一轴的 visible 计算为 auto，clip 计算为 hidden。

因此要检查两轴计算值；祖先可能成为 Sticky 的滚动参照，即使没有显眼滚动条。

## 裁剪、格式化上下文和布局尺寸分别判断

适用块盒的 hidden、auto、scroll 会建立 BFC，clip 本身不会。需要裁剪和独立流布局时可分别声明：

```css
.clipped {
  display: flow-root;
  overflow: clip;
}
```

BFC 负责格式化关系，overflow 裁剪负责哪些内容可见；一种属性同时影响二者，也不能把两种职责等同起来。

滚动还需内容超过相应可用尺寸。将上例 height: 80px 改为 auto，父盒可能直接长到 240px，不出现内部纵向滚动；改用 max-height: 80px 则可限制高度，又允许短内容时更矮。Flex/Grid 项目的自动最小尺寸也可能阻止盒收缩。

这些结论针对普通块。根元素与 body 的 overflow 存在向视口传播的特殊规则，不能直接用普通嵌套滚动盒推断整个页面的滚动。

## 截断显示不等于修复内容尺寸

```css
.title {
  width: 180px;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}
```

单行省略需受限宽度、nowrap 与裁剪共同配合。Text-overflow 不设置尺寸，也不单独触发裁剪。

`overflow-wrap: anywhere` 则允许必要断行，会影响内容尺寸，区别于隐藏。关键内容截断后应能查看全文。
