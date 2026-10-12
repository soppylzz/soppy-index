# Containing Block：尺寸与坐标的参照

[本组导航](./README.md)

包含块是尺寸和定位的参照矩形，不等于直接 DOM parent。普通流块常依赖祖先 content box；absolute 通常依赖最近能建立 absolute containing block 的祖先 padding box，没有则回到初始包含块。

position:relative 可建立 absolute 参照但本身仍占位。fixed 默认参照 viewport；非 none transform 等属性能改变 fixed 的参照，并可能让它随祖先滚动。filter、contain、will-change 等另有适用条件，应按具体规范和实现检查，不应只搜索 position。

百分比要按属性区分：普通横排 width 常参照包含块宽，height 常需要 definite height；传统物理 margin/padding 百分比按包含块 inline size。translate 百分比则按元素自身 transform reference box。不同轴、写入模式和布局算法中不要套一个“百分比都看父宽”的口诀。

## 样式示例与推导

```css
#layout {
  position: relative;
  height: 140px;
  border: 4px solid teal;
}
#layout.changed {
  transform: translateX(20px);
}
#fixed {
  position: fixed;
  right: 10px;
  top: 10px;
}
```

先分别找两种定位的参照。`#layout` 只有 `position: relative` 时，它已能为内部 absolute 盒建立包含块，内部 fixed 盒仍通常相对视口。再给 `#layout` 加上非 none 的 transform，它也成为内部 fixed 盒的包含块。坐标变化来自参照改变，不只是元素被整体平移 20px。

依据 [Transforms 1](https://www.w3.org/TR/css-transforms-1/#transform-rendering) 和 [Position 3](https://www.w3.org/TR/css-position-3/)。
