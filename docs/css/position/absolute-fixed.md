# Absolute 与 Fixed：先找参照，再求尺寸与位置

绝对定位不是“相对父元素设置坐标”。先找包含块，再结合 inset、尺寸、margin 与内容求解；直接父元素可能不参与这个过程。

## 找到正确的包含块

`absolute` 从祖先中寻找最近的包含块建立者，例如非 static 定位祖先、适用的 transform 或 containment。普通块祖先通常提供 padding box；完整查找规则与百分比示例见[包含块](../box/containing-block.md)。

`fixed` 通常使用视口。仅给祖先加 relative 不改变这个参照，而非 none 的 transform 可以改变；`transform: translate(0)` 即使没有可见位移，也不是 none。

```html
<div class="card">
  <button class="badge">Help</button>
</div>
```

```css
.card {
  position: relative;
  width: 300px;
  height: 160px;
}
.badge {
  position: absolute;
  top: 12px;
  right: 12px;
}
```

角标跟随 card 的定位参照。改成 fixed 后，只有 relative 的 card 不再提供参照，按钮通常贴近视口右上角；再给 card 加 transform，fixed 的参照可能回到 card，并随它在页面中移动。

## 两侧固定、尺寸 auto：用剩余空间拉伸

```css
.panel {
  position: absolute;
  left: 20px;
  right: 30px;
  width: auto;
  margin: 0;
  padding: 0;
  border: 0;
}
```

假定非替换元素、包含块宽 300px、无 min/max 等额外约束，panel 内容宽为 `300 - 20 - 30 = 250px`。普通块的 auto 与此处的 auto 不能脱离布局规则互相套用。

若只指定 left、right 为 auto，auto 宽度通常按可用空间与内容收缩适配，不再无条件填满。没有指定 inset 也不等于坐标为 0：静态位置会参与 auto 偏移的求解。

## 固定尺寸时，auto margin 可以吸收剩余空间

```css
.dialog {
  position: absolute;
  inset: 0;
  width: 120px;
  height: 60px;
  margin: auto;
}
```

包含块为 300 × 200px、无 padding/border 与额外约束时，两侧 auto margin 分别得到 90px、70px，实现居中。宽高 auto 时则可能拉伸，不能只记住 inset:0 加 margin:auto 的口诀。

未知尺寸还可用 `left:50%; top:50%; transform:translate(-50%, -50%)`：前两个百分比取自包含块，后两个取自自身变换参照盒。一般内容排版也可直接用 Flex/Grid 对齐，避免为了居中而脱流。

## 约束过多与空间不足

宽度、两侧 inset、margin 都确定时可能过约束；传统横排 ltr 模型通常放弃 right 的指定约束，rtl 则相反。内容过宽、min-width、替换元素比例又会改变结果，因此数字推导必须说明前提。

`fixed` 元素不为正文预留空间：底部操作栏可能遮住最后一段。需要由页面布局留出实际空间，并考虑安全区域和缩放，而不是仅提高 z-index。

尺寸模型见 [CSS Position 3](https://www.w3.org/TR/css-position-3/#abspos-layout)，变换对 fixed 参照的影响见 [CSS Transforms 1](https://www.w3.org/TR/css-transforms-1/#transform-rendering)。
