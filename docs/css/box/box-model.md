# 盒模型：width 约束哪个区域

`width` 约束内容盒还是边框盒，由 box-sizing 决定。加 padding 后变宽还是压缩内容，需要先明确这个边界。

## 四个区域各自承担什么

从内到外，一个普通矩形盒包含 content、padding、border、margin。

| 区域    | 作用                     | 是否属于边框盒 |
| ------- | ------------------------ | -------------- |
| content | 容纳文字、子盒或替换内容 | 是             |
| padding | 内容与边框之间的内边距   | 是             |
| border  | 包围内容和内边距的边框   | 是             |
| margin  | 边框外的外边距           | 否             |

背景默认绘制到边框区域，margin 不绘制背景。Padding 不可为负；margin 可为负，影响布局而非背景盒尺寸。

以下固定为普通横排块，无 Flex/Grid 或额外尺寸约束：

```html
<div class="box">A content box.</div>
```

```css
.box {
  box-sizing: content-box;
  width: 200px;
  padding: 20px;
  border: 4px solid teal;
  margin: 10px;
}
```

把上述 box-sizing 分别设为 content-box 与 border-box：

| box-sizing  | width 约束区域 | 内容宽               | 边框盒宽             |
| ----------- | -------------- | -------------------- | -------------------- |
| content-box | 内容盒         | 200px                | 200 + 40 + 8 = 248px |
| border-box  | 边框盒         | 200 - 40 - 8 = 152px | 200px                |

`margin` 都位于边框外，左右声明值另合计 20px；实际占用还受普通块宽度约束影响，不能只看 width。`height` 和适用的 min/max 尺寸也按 box-sizing 解释。垂直 margin 可能折叠，见[外边距折叠](../flow/margin-collapse.md)。

## Border-box 也有内容不能为负的下限

若 width 改为 30px，padding 与 border 合计仍为 48px，内容宽只能降为 0，边框盒至少 48px。Border-box 约束边框盒，但不允许负内容尺寸，见 [CSS Sizing 3](https://www.w3.org/TR/css-sizing-3/#box-sizing)。

`border-style` 默认为 none，仅设置 border-width 不产生相应边框。`outline`、box-shadow 不像 border 那样增加布局尺寸；焦点外观宜避免改变边框宽度造成跳动。规则见 [CSS Backgrounds 3](https://www.w3.org/TR/css-backgrounds-3/#the-border-width)。

## 为什么 width: 100% 加 padding 容易溢出

```html
<div class="container">
  <div class="panel">Full width with padding.</div>
</div>
```

```css
.container {
  width: 300px;
}
.panel {
  box-sizing: content-box;
  width: 100%;
  padding: 20px;
}
```

内容宽 300px，加左右 padding 后边框盒为 340px；改为 border-box 后，这 300px 才包含内边距。

也可移除显式 width：普通块的 auto 宽度会扣除内边距，本例内容宽 260px、边框盒宽 300px，见[自动尺寸](./sizing.md)。

## 设置盒模型时，也考虑生成内容

```css
*,
*::before,
*::after {
  box-sizing: border-box;
}
```

`box-sizing` 默认不继承，单独设置 body 不会改变所有后代；伪元素也需匹配或显式继承。统一 border-box 不能消除内容最小尺寸和溢出约束。

## 测量前先确定要观察哪个盒

| API | 常见测量范围 | 主要边界 |
| --- | --- | --- |
| clientWidth | 内容与 padding，不含 border 和适用的竖向滚动条占位 | 整数值 |
| offsetWidth | border box，包含内部适用的滚动条占位 | 整数值，不反映 transform 缩放 |
| getBoundingClientRect().width | 变换后的边框视觉边界矩形宽 | 可为小数，旋转后不等于原盒宽 |

这些是常规有布局盒元素的比较；根元素、无盒等情况另有规则。DOM API 不测 margin，接口细节见 [DOM 测量](../../browser/dom/geometry.md)。
