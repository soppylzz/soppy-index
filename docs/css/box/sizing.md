# 自动尺寸与约束：auto、内容和 min/max 怎样共同求解

auto 的尺寸由布局算法求解，可能填充空间，也可能收缩适配；最终还受内容与 min/max 约束。

## 普通块的 auto 宽度不是 100%

```html
<div class="container">
  <div class="panel">A block with automatic width.</div>
</div>
```

```css
.container {
  width: 300px;
}
.panel {
  box-sizing: content-box;
  width: auto;
  padding: 20px;
  border: 2px solid teal;
  margin: 0;
}
```

普通横排块、无其他约束时，内容宽为 `300 - 40 - 4 = 256px`，边框盒宽为 300px。

改为 width: 100% 后，内容宽 300px，边框盒达 344px。Auto 求解可用空间，不等于 100%，见 [CSS 2.2](https://www.w3.org/TR/CSS22/visudet.html#blockwidth)。

普通块 auto 高度通常按流内内容求解，不自动填满父高。Float、absolute 的计入规则取决于格式化上下文。

## 普通块怎样用 auto margin 居中

沿用上面的 container，将 panel 的内容宽改为 160px，左右 margin 改为 auto。边框盒宽为 `160 + 40 + 4 = 204px`，剩余 `300 - 204 = 96px` 由两个 auto margin 平分，各为 48px。

```css
.panel {
  width: 160px;
  margin-inline: auto;
}
```

这要求普通块存在可分配的横向空间。Width: auto 已填满可用宽度时，两侧 auto margin 通常为 0；普通块的上下 auto margin 也不会按同样方式实现垂直居中。Text-align: center 则对齐内部行内内容，不是移动这个块盒。

## 同一句文本怎样形成 min-content 与 max-content

```html
<div class="samples">
  <p class="minimum">alpha beta gamma</p>
  <p class="maximum">alpha beta gamma</p>
  <p class="fitted">alpha beta gamma</p>
</div>
```

```css
.samples {
  width: 10ch;
  font-family: monospace;
}
.samples p {
  margin: 0;
  padding: 0;
  border: 0;
  white-space: normal;
}
.minimum {
  width: min-content;
}
.maximum {
  width: max-content;
}
.fitted {
  width: fit-content;
}
```

三段只改变 width，文本、字体和换行策略相同：

| 值          | 先怎样考虑内容                   | 本例预期排版                           |
| ----------- | -------------------------------- | -------------------------------------- |
| min-content | 尽量利用允许的软换行机会         | 在单词间换行，宽度由最宽单词决定       |
| max-content | 不使用软换行机会                 | 整句一行，盒宽可超过父盒               |
| fit-content | 结合可用空间，受两种内容尺寸约束 | 空间不足一行时换行，又不必扩到整句宽度 |

语言、white-space 与 overflow-wrap 会改变换行机会，min-content 不总是最长单词。Fit-content 在本例中把可用宽度限制于两种内容尺寸之间；父盒窄于不可断内容时仍可溢出。

`inline-block` 的 auto 宽度常采用类似的收缩适配思路，普通块 auto 则通常填可用空间。不要把 auto 与 fit-content 当作跨布局通用的同义词。内容尺寸还会进入 Flex 自动最小尺寸和 Grid 轨道求解，定义见 [CSS Sizing 3](https://www.w3.org/TR/css-sizing-3/#intrinsic-sizes)。

## Min/max 约束在布局中结合，不互相竞争权重

在 400px 的普通块包含块内，固定 content-box、无 padding/border：

```css
.item {
  width: 50%;
  min-width: 120px;
  max-width: 180px;
}
```

包含块宽 400px 时，候选宽 200px，受上限限制取 180px；包含块宽 200px 时，候选宽 100px，受下限限制取 120px。阶段对照见[值处理](../properties/processing.md#width-与-max-width约束在-used-value-求解时结合)。

在此普通块条件下，min-width: 220px 与 max-width: 180px 冲突时取 220px；最大宽度不能无条件防止溢出。

`min-width` / `min-height` 的初始值是 auto，max-width/max-height 为 none。auto 最小尺寸的含义由布局决定：普通块场景通常相当于零下限，Flex/Grid 项目则可能保留内容下限。因此“盒缩不下去”不能只查 width，相关例子见 [Flex 自动最小尺寸](../flex/sizing.md)。

## 固有尺寸与 aspect-ratio 提供另一种输入

```html
<img class="photo" src="photo.jpg" width="800" height="400" alt="A mountain lake" />
```

```css
.photo {
  max-width: 100%;
  height: auto;
}
```

资源固有尺寸为 800 × 400px、无边距边框、包含块宽 300px 时，图片缩为 300 × 150px。HTML width/height 可在加载前提供比例信息以预留空间。

普通非替换盒也能声明首选比例：

```css
.preview {
  width: 240px;
  height: auto;
  aspect-ratio: 2 / 1;
}
```

无内容或其他约束时高度为 120px。明确指定双轴尺寸时，比例不强制改写它们；min/max 和内容需求也可改变结果。Aspect-ratio 定义首选比例，见 [CSS Sizing 4](https://www.w3.org/TR/css-sizing-4/#aspect-ratio)。

## 图片盒与图片内容：object-fit 不求解外盒尺寸

外盒尺寸确定后，object-fit 才决定资源如何适配内容盒。Cover 可以裁剪资源，却不会把周围布局改成裁剪后的资源尺寸；object-position 调整的是盒内资源的位置。

同一个 120 × 120px 外盒的 contain、cover、fill 数值对照，以及固有比例与替换元素的边界，见[替换元素与媒体适配](../text/replaced-elements.md)。
