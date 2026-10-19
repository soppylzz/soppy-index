# 包含块与百分比：尺寸相对谁计算

百分比需要参照。包含块提供尺寸与定位的参照矩形，但不一定是直接父元素，各属性也不共用同一个百分比基准。

## 普通流：先找内容盒参照

普通横排流中的块通常以最近块容器祖先的内容盒为包含块，普通 inline 祖先不一定提供参照。

```html
<div class="container">
  <div class="item">Half the available width.</div>
</div>
```

```css
.container {
  width: 400px;
  padding: 20px;
  border: 4px solid teal;
}
.item {
  width: 50%;
  margin: 0;
  padding: 0;
  border: 0;
}
```

假定 content-box、无其他约束，item 宽为 `400 * 50% = 200px`，不计父盒的 padding 和 border，见[盒模型](./box-model.md)。

## 百分比参照由属性定义

| 属性或值                          | 本篇条件下的参照                     |
| --------------------------------- | ------------------------------------ |
| width: 50%                        | 包含块宽度                           |
| height: 50%                       | 包含块高度，并受高度确定性等规则限制 |
| margin-top: 10%、padding-top: 10% | 默认横排中按包含块宽度，而不是高度   |
| font-size: 150%                   | 父元素字号                           |
| transform: translateX(50%)        | 元素自身的变换参照盒宽度             |

在默认横排、包含块宽 400px 时，padding-top: 10% 为 40px，与父高度无关。其他布局和书写方向应查对应定义。

## 百分比高度：参照尺寸必须能确定

```css
.container {
  width: 400px;
  height: auto;
}
.item {
  width: 50%;
  height: 50%;
}
```

普通块的 auto 高度常依赖后代内容，子高度再依赖父高度就可能循环；不能根据父盒最终测量高度倒推百分比已成功解析。

本例父高不确定，子百分比高度按相应 auto 规则处理；父改为 height: 200px，子高才为 100px。Definite size 也可通过确定参照推导，不限固定 px，Flex/Grid 另有规则。

例如只将父盒改为 min-height: 200px、height 仍为 auto，普通流子盒的 50% 不会因此自动得到 100px。父盒最终测量高度与可用来解析百分比的确定高度不是一回事。规则见 [CSS Sizing 3](https://www.w3.org/TR/css-sizing-3/#percentage-sizing)。

## Absolute：查找规则改变，改用定位参照

Absolute 脱离普通流，但仍用包含块求解宽高与偏移，不只依赖它设置 top/left。

### 从直接父元素向外，寻找最近的建立者

从父盒向外找最近的绝对定位包含块建立者。非 static 的 position、非 none 的 transform、适用的 containment 等均可能建立参照，不能只查定位祖先。

找不到建立者时使用初始包含块，其尺寸在连续媒体中通常取自视口；它不是 body，也不让 absolute 固定在屏幕上。

```html
<div class="outer">
  <div class="inner">
    <div class="badge">Badge</div>
  </div>
</div>
```

```css
.outer {
  position: relative;
  box-sizing: content-box;
  width: 300px;
  height: 200px;
  padding: 20px;
  border: 4px solid teal;
}
.inner {
  width: 100px;
  height: 80px;
}
.badge {
  position: absolute;
  top: 10px;
  left: 10%;
  width: 50%;
  height: 50%;
  margin: 0;
  padding: 0;
  border: 0;
}
```

默认横排、无其他约束时，inner 为 static，包含块由 outer 建立。Relative 无须设置 top/left 即可提供参照。

### 普通块祖先通常以 padding box 为参照

上例包含块宽为 `300 + 20 * 2 = 340px`，高为 `200 + 20 * 2 = 240px`，不包含 outer 的边框。

| 声明        | 求解结果            |
| ----------- | ------------------- |
| width: 50%  | 内容宽 170px        |
| height: 50% | 内容高 120px        |
| left: 10%   | 距包含块左边缘 34px |
| top: 10px   | 距包含块上边缘 10px |

Badge 无 margin，偏移直接对应其边框边缘。Top/left 为 0 时对齐 outer 的边框内侧，而非内容区起点。

给 inner 加 position: relative 后，包含块改为 100 × 80px，badge 宽高变为 50 × 40px，left 为 10px；DOM 嵌套不变。

行内祖先、Grid 区域有额外规则，见 [CSS Position 3](https://www.w3.org/TR/css-position-3/#def-cb)。

包含块不是裁剪边界，absolute 可以溢出；它也不按普通流撑高父盒。这里仅解释参照，top/left 的 auto、左右约束拉伸等属于定位尺寸求解，不应从“找到了包含块”直接推断。

## Fixed 的参照需要另行判断

Fixed 通常相对视口；非 none 的 transform 等可改变其包含块，仅有 position: relative 不会。规则见 [CSS Transforms 1](https://www.w3.org/TR/css-transforms-1/#transform-rendering)。
