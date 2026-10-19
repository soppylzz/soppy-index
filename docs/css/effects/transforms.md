# 变换：改变坐标，不重新分配原占位

元素 scale 放大后盖住邻居，邻居为什么没被挤开？布局先确定盒的尺寸与位置，transform 再改变其坐标映射。

## 布局尺寸与视觉矩形分开

```html
<div class="row">
  <div class="tile">A</div>
  <div class="tile">B</div>
</div>
```

```css
.row {
  display: flex;
  gap: 20px;
}
.tile {
  flex: 0 0 100px;
  height: 60px;
}
.tile:first-child {
  transform: scale(1.5);
}
```

无其他约束时，Flex 仍按 100px 分配第一项宽度，第二项不会为视觉放大而让位。变换会影响视觉边界、命中和可滚动溢出；“不影响普通流占位”不等于对其他行为毫无影响。

`offsetWidth` 等布局尺寸与 getBoundingClientRect() 的视觉矩形也可能不同，后者包含变换后的轴对齐包围范围。

## 变换函数顺序不能交换

```css
.first {
  transform-origin: 0 0;
  transform: translateX(80px) rotate(90deg);
}
.second {
  transform-origin: 0 0;
  transform: rotate(90deg) translateX(80px);
}
```

矩阵组合不同：以局部点理解时，列表右侧函数先作用，first 的原点最终向右 80px，second 的原点最终向下 80px。也可从左到右理解局部坐标系变化，但不要混用两种解释。

`translate` 改位置，scale 改尺度，rotate 改方向，skew 改倾斜；transform-origin 通过改变枢轴影响旋转与缩放结果。

## 百分比看自身参照盒

`translate` 的百分比沿对应轴使用 transform-box 决定的参照盒，普通 CSS 盒常按边框盒理解。`translate(-50%, -50%)` 不能与 left:50% 相互抵消：后者先按包含块求解，因此组合可用于未知尺寸居中。

普通非替换 inline 盒不直接适用 transform，可按需求改为 inline-block；并非所有 display 生成的盒都可变换。

## 变换还建立新的关系

非 none 的 transform 会创建层叠上下文，并可成为 absolute/fixed 后代的包含块；translate(0) 也不同于 none。详见 [CSS Transforms 1](https://www.w3.org/TR/css-transforms-1/#transform-rendering)。

独立 translate、rotate、scale 属性与 transform 可以共同生效，组合有规定顺序，不是互相覆盖的缩写。3D 还需理解 perspective、transform-style:preserve-3d 与 backface-visibility；创建 3D 场景不保证独立 GPU 图层。相关扩展见 [CSS Transforms 2](https://www.w3.org/TR/css-transforms-2/)。
