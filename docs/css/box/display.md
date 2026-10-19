# Display：盒生成、外部排列与内部布局

把 span 改成 block 后，内容为什么另起一行？把父元素改成 flex 后，子元素为什么又能并排？两个变化都来自 display，但改变的层面不同：前者改变盒在外部怎样参与布局，后者改变盒内部排列子项的算法。

HTML 决定语义，display 决定显示盒。Div 默认通常显示为 block、span 通常为 inline，是浏览器默认样式，不是标签不可更改的能力。

## 先把 display 的取值分清

| 分类         | 常见值                                   | 解决的问题                       |
| ------------ | ---------------------------------------- | -------------------------------- |
| 外部显示类型 | block、inline                            | 这个盒怎样参与父级布局？         |
| 内部显示类型 | flow、flow-root、flex、grid、table、ruby | 盒内部采用什么布局？             |
| 列表项       | list-item                                | 是否额外生成列表标记？           |
| 布局内部角色 | table-row、table-cell 等                 | 在表格等特定布局中承担什么角色？ |
| 盒生成控制   | none、contents                           | 是否生成自身及后代的盒？         |

许多熟悉的单词写法同时包含外部与内部类型：

| 常见写法                               | 对应含义                    |
| -------------------------------------- | --------------------------- |
| block                                  | block flow                  |
| inline                                 | inline flow                 |
| inline-block                           | inline flow-root            |
| flow-root                              | block flow-root             |
| flex、grid、table                      | 默认块级外部 + 对应内部布局 |
| inline-flex、inline-grid、inline-table | 行内级外部 + 对应内部布局   |

这解释了 inline-flex 为什么既能跟文字在一行，又能把内部子项按 Flex 排列。外部 inline 不等于内部也必须是普通行内文字。分类定义见 [CSS Display 3](https://www.w3.org/TR/css-display-3/#the-display-properties)。

## block、inline、inline-block：先看同一个盒的变化

以下默认横排，目标是普通非替换元素，未浮动、未绝对定位，也不是 Flex/Grid 项目。替换元素如 img 的内容由外部资源提供，其固有尺寸会参与求解，不能套用普通文字 span 的全部结论。

```html
<div class="container">Before <span class="label">A label</span> After</div>
```

```css
.container {
  width: 300px;
}
.label {
  display: inline;
  box-sizing: content-box;
  width: 120px;
  height: 40px;
  padding: 8px;
  border: 1px solid teal;
}
```

每次仅替换 label 的 display：

- Block：按块级盒排列，与前后行内内容分开；即使宽度足够小，也不会自动与下一个普通块并排。
- Inline：随文字进入行盒，内容可以跨行分片；width/height 不控制这个非替换行内盒的尺寸。
- Inline-block：整体作为一个原子行内级盒进入行盒，外盒不能像普通 inline 那样跨行拆开，内部文字仍可换行。

`block` 与 inline-block 在本例中的内容盒为 120 × 40px，加 padding 和 border 后，边框盒为 138 × 58px。`inline` 则不能用这两个指定尺寸做相同加法。

### 宽高与间距的速查

✅ 适用　❌ 不适用。以下仍限定在上述普通流条件。

| 属性                               |       block        |         inline         | inline-block |
| ---------------------------------- | :----------------: | :--------------------: | :----------: |
| width / height                     |         ✅         |           ❌           |      ✅      |
| width: auto                        |   通常填可用空间   |       随内容排版       | 通常收缩适配 |
| 左右 margin                        |         ✅         |           ✅           |      ✅      |
| 上下 margin                        |   满足条件时折叠   |           ❌           |    不折叠    |
| 左右 padding / border              |         ✅         |           ✅           |      ✅      |
| 上下 padding / border 计入外部高度 |         ✅         | 仅绘制，不按其高度撑行 |      ✅      |
| 左右 auto margin 居中              | 需可分配空间等条件 |           ❌           |      ❌      |
| vertical-align 外部对齐            |         ❌         |           ✅           |      ✅      |

`inline` 上下 padding/border 可以画到行盒外，却不按完整边框盒高度撑开行距，因而可能重叠。`line-height` 参与行盒高度求解，不能把它当成所有盒通用的 height。

### inline-block 的空隙有两种来源

相邻 inline-block 之间的源代码空白可形成词间空隙，这是文本排版，不一定是 margin。另一个常见空隙在底部：inline-block 默认按基线对齐，所在行还可能为基线下方留空间。

前者应检查空白及布局方式；后者应根据需求调整 vertical-align 或改变外部布局。图片本该独立成块时可以设为 block，仍需与文字同行时则不宜盲目改块。将父元素 font-size 或 line-height 归零可能影响其他文字，不能作为无条件重置。

## 内部布局：flow、flow-root、Flex 与 Grid

外部 block/inline 决定盒怎样参与父布局；内部类型决定它怎样排列子盒。这两层必须分别判断：

| 内部类型 | 布局模型 | 是否明确建立独立上下文 | 常见完整写法 |
| --- | --- | --- | --- |
| flow | 普通流：块按块规则排列，文字按行内规则排列 | 不仅凭 flow 建立新上下文，取决于外部类型等条件 | block flow、inline flow |
| flow-root | 普通流，但为内部建立独立 BFC | 独立的块级格式化上下文 | block flow-root、inline flow-root |
| flex | 直接子盒成为 Flex 项目，沿主轴分配空间 | 独立的 Flex 格式化上下文 | block flex、inline flex |
| grid | 直接子盒成为 Grid 项目，共享行列轨道 | 独立的 Grid 格式化上下文 | block grid、inline grid |

Flow-root 没有把普通流换成弹性或网格算法，它增加的是 BFC 边界。Flex/Grid 则同时改变直接子盒的排列与尺寸分配规则。不能把四者都概括成“独立容器”。

### 同一组子盒，换内部类型后怎样排列

```html
<div class="layout">
  <div class="item">A</div>
  <div class="item">B</div>
  <div class="item">C</div>
</div>
```

```css
.layout {
  display: block;
  width: 300px;
  margin: 0;
  padding: 0;
  border: 0;
}
.item {
  width: 80px;
  height: 40px;
  margin: 0;
  padding: 0;
  border: 0;
}
```

默认横排、content-box、无其他约束。依次替换 layout 的声明，不叠加不同方案：

| 父盒声明 | 三个子盒的排列 | 父盒 auto 内容高 |
| --- | --- | --- |
| display: block | A、B、C 各占一个块位置，上下排列 | 120px |
| display: flow-root | 同样上下排列 | 120px |
| display: flex | 默认 row，A、B、C 沿主轴并排 | 40px |
| display: grid; grid-template-columns: 80px 80px | A/B 第一行，C 第二行 | 80px |

本例没有浮动与相接 margin，所以 block 和 flow-root 画面相同：独立边界不改变普通块的纵向排列。

### 普通流与独立普通流：差异出在边界

将内容换成一个浮动盒：

```html
<div class="frame">
  <div class="figure">Float</div>
</div>
```

```css
.frame {
  display: block;
  margin: 0;
  padding: 0;
  border: 0;
}
.figure {
  float: left;
  width: 80px;
  height: 60px;
  margin: 0;
}
```

`.frame` 无其他内容、无 padding/border、auto 高度且未通过其他方式建立 BFC 时：block 的内容高为 0，flow-root 的内容高为 60px。后者的自动高度计入内部所属浮动，并非取消了 float。

独立 BFC 还阻止首尾流内子块与父盒跨边界折叠，但内部普通块兄弟仍可折叠。它不提供裁剪或样式隔离，详见 [BFC](../flow/bfc.md)。

### Flex 与 Grid：直接子盒成为项目

Flex 沿主轴弹性分配，各行独立；Grid 按共享行列轨道约束项目。两者都明确建立独立格式化上下文。

| 比较项 | 普通流 / 独立普通流 | Flex | Grid |
| --- | --- | --- | --- |
| 直接子盒的角色 | 按各自块级、行内级类型参与 | Flex 项目 | Grid 项目 |
| 主要空间约束 | 块排列、行排版、浮动关系 | 主轴弹性分配，每行独立 | 共享行列轨道 |
| 相邻流内项目 margin | 普通块满足条件时折叠 | 不折叠 | 不折叠 |
| float 对直接项目的排列 | 按浮动规则处理 | 不按浮动排列 | 不按浮动排列 |
| 孙元素 | 依其父盒内部类型处理 | 不自动成为外层 Flex 项目 | 不自动成为外层 Grid 项目 |

子元素原本声明 inline，成为 Flex/Grid 项目后也不能继续按普通文字 inline 推断宽高。改变的是它在父布局中的项目角色，不是递归把所有后代都变成相同项目。算法分别见 [Flex](../flex/model.md) 与 [Grid](../grid/model.md)。

`inline-block`、inline-flex、inline-grid 都能作为行内级原子盒，区别在内部算法：独立普通流、Flex、Grid。选择依据是内容如何协作，不只是是否与文字同行。

## list-item：内容盒之外还生成 marker

```html
<ul class="menu">
  <li>Reading</li>
  <li>Practice</li>
</ul>
```

```css
.menu li {
  display: list-item;
  list-style-type: disc;
}
.menu li::marker {
  color: teal;
}
```

List-item 通常生成块级主盒，并额外生成可由 ::marker 设置部分样式的标记。List-style-position 决定标记位于内容排列内部还是外部。

把 li 改成 block 会移除其列表项显示角色；只想去掉圆点，通常用 list-style: none，而不是顺带改变布局类型。给普通 div 设置 list-item 可以生成标记，但不会自动赋予 HTML 列表语义。取值规则见 [CSS Display 3 列表项](https://www.w3.org/TR/css-display-3/#list-items)。

## table 与内部角色：不是给每个单元格设置 block

```html
<div class="table">
  <div class="row">
    <div class="cell">Name</div>
    <div class="cell">Ada</div>
  </div>
  <div class="row">
    <div class="cell">Occupation</div>
    <div class="cell">Engineer</div>
  </div>
</div>
```

```css
.table {
  display: table;
}
.row {
  display: table-row;
}
.cell {
  display: table-cell;
  padding: 4px 8px;
}
```

Table 建立表格布局，table-row 与 table-cell 指定内部行、单元格角色，两行共享列约束。`inline-table` 只是让外部作为行内级盒，内部仍是表格。

相关角色还包括 table-row-group、table-header-group、table-footer-group、table-column-group、table-column、table-caption。不同角色的宽高、margin 和对齐适用规则不同，不能套用前面的普通块表格。结构缺少必要盒时，浏览器还可能生成匿名表格盒。

CSS 表格适合解释历史布局，但展示有表头、行列关联的数据时，优先使用真实 table/th/td 语义。Ruby 及 ruby-base、ruby-text 等则服务于注音布局，不是普通块或 Flex 的另一种写法。内部角色定义见 [CSS Display 3](https://www.w3.org/TR/css-display-3/#layout-specific-display)。

## none 与 contents：控制盒生成，不改 DOM 结构

| 值                 | 自身主盒 | 后代盒 | DOM 元素 |
| ------------------ | :------: | :----: | :------: |
| none               |    ❌    |   ❌   |    ✅    |
| contents，普通容器 |    ❌    |   ✅   |    ✅    |

None 使整棵子树不生成布局盒，后代写 display: block 也不能越过祖先的 none 恢复显示。Contents 则移除普通容器自身主盒，它的 padding、border、背景没有自身主盒可绘制，子盒按外层布局处理；选择器关系和继承仍按元素树判断。

Contents 不代表所有元素都能透明展开：替换元素等有特殊规则，辅助技术实现也可能影响语义暴露。不能只凭画面正确就将它用于关键交互结构。

### 与 visibility、opacity 比较

以下针对原本可交互、未禁用且无其他干预的目标自身：

| 方式               | 占位 | 自身可见 | 指针命中 | 键盘焦点 |
| ------------------ | :--: | :------: | :------: | :------: |
| display: none      |  ❌  |    ❌    |    ❌    |    ❌    |
| visibility: hidden |  ✅  |    ❌    |    ❌    |    ❌    |
| opacity: 0         |  ✅  |    ❌    |    ✅    |    ✅    |

Hidden 后代可显式设为 visible，none 后代不能仅靠自身 display 恢复。Opacity: 0 也保留可访问语义，不能等同禁用。None/hidden 通常从可访问树排除隐藏内容，但应结合后代状态判断。

## 声明值与盒的最终参与方式可能不同

`display` 初始值为 inline，且不继承；div 默认为 block 来自浏览器样式，所以 display: initial 不等于恢复标签默认外观。

此外，浮动、absolute/fixed，以及作为 Flex/Grid 项目等条件可能导致外部显示类型块化。例如 span 声明 inline，成为 Flex 项目后就不能继续按普通文字 inline 的宽高规则解释。完整变化规则见 [CSS Display 3 自动转换](https://www.w3.org/TR/css-display-3/#transformations)。
