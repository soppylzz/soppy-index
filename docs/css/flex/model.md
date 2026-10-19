# Flex 布局模型：容器、项目与两条轴

父盒设置 display: flex 后，流内直接子盒改按弹性规则排列。先认清容器、项目和轴，再讨论尺寸与对齐。

## 容器决定直接子盒怎样参与布局

```html
<div class="toolbar">
  <div class="brand">Notes</div>
  <div class="links">
    <a href="#reading">Reading</a>
    <a href="#practice">Practice</a>
  </div>
  <button type="button">Search</button>
</div>
```

```css
.toolbar {
  display: flex;
  gap: 12px;
}
```

Toolbar 的流内直接子盒 brand、links、button 成为项目；links 内的 a 不属于外层项目，内部布局由 links 自己决定。

直接文本也可能被包进匿名 Flex 项目，纯空白文本不形成可见项目。绝对定位子元素不作为普通 Flex 项目参加空间分配。项目规则见 [Flexbox 1](https://www.w3.org/TR/css-flexbox-1/#flex-items)。

Flex 与 inline-flex 仅在容器自身的外部参与方式上不同，内部都是弹性布局。

初始状态是 row、nowrap，项目为 `flex: 0 1 auto`。因此项目默认不增长、允许收缩；“写了 Flex 就平均分宽”不成立。`flex-flow` 是 direction 与 wrap 的简写。

## 主轴不是固定水平方向

| flex-direction | 主轴             | 默认横排 ltr 下的起点 |
| -------------- | ---------------- | --------------------- |
| row            | 行内轴           | 左侧                  |
| row-reverse    | 行内轴，方向反转 | 右侧                  |
| column         | 块轴             | 顶部                  |
| column-reverse | 块轴，方向反转   | 底部                  |

交叉轴与主轴垂直。Direction、writing-mode 会改变方向，不能把 row 永远记成向右。

| 容器或项目属性                     | 控制什么                                       |
| ---------------------------------- | ---------------------------------------------- |
| flex-direction、flex-wrap          | 主轴方向与是否分行                             |
| flex-grow、flex-shrink、flex-basis | 项目在主轴上的弹性尺寸                         |
| justify-content                    | 弹性分配及自动外边距处理后，剩余主轴空间的对齐 |
| align-items、align-self            | 项目在所在行交叉轴上的对齐                     |
| align-content                      | 多行布局中各行在交叉轴的分布                   |

例如 column 中 justify-content 仍控制主轴，只是默认横排下主轴变为纵向；不能记成“justify 永远水平居中”。

## 从普通流切换后，哪些旧规则不再适用

项目 margin 不折叠；普通块的 30px、20px 折叠间距，改成列向 Flex 项目后可相加为 50px。Float、clear、vertical-align 不按普通流方式控制项目排列。

容器内部是独立的弹性格式化上下文，不是普通 BFC；项目仍受盒模型、内容和 min/max 约束。

## 换行仍然是一维分配

```css
.cards {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}
.card {
  flex: 1 1 140px;
}
```

每行独立分配主轴空间，最后一行项目少时也可能长大。算法先按项目外部假设主尺寸等条件分行，再在各行内分配；不是先无限收缩再判断换行。

需要跨行共享列边界时，应考虑 Grid。Flex 的一维是指空间分配的约束方式，不是“只能显示一行”。换行规则见 [Flexbox 1](https://www.w3.org/TR/css-flexbox-1/#flex-lines)。

## 视觉排序不重写 DOM 顺序

`order` 默认 0，先按值排序，同值按文档顺序；reverse 改变轴向。二者不重写 DOM，也不保证键盘与读屏顺序随视觉变化。

先让 HTML 保持合理阅读与操作顺序。项目尺寸继续见[弹性分配](./sizing.md)。
