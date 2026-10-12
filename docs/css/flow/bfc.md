# 块级格式化上下文

[本组导航](./README.md)

BFC 是处理块和浮动布局的一种格式化上下文。它不是 DOM 边界、独立样式作用域或合成图层。继承、百分比与父子尺寸约束仍存在。

常见建立方式包括 flow-root、float、absolute、inline-block，以及在适用块容器上使用非 visible/clip 的 overflow。Flex/Grid 建立自己的格式化上下文，不要把它们的内部排列说成普通 BFC 块排列。

新 BFC 的关键效果是自动高度包含所属内部浮动、盒子避开同一外部 BFC 的 float，以及阻止跨边界 margin 折叠。单纯包含浮动优先 flow-root；overflow:hidden 同时裁剪并创建滚动容器，会有额外副作用。

## 样式示例与推导

```css
#floated {
  float: left;
  height: 80px;
}
#parent.changed {
  display: flow-root;
}
```

假定父盒只含 80px 高的浮动子盒，没有边框、内边距和其他流内内容。普通块计算自动高度时，浮动不按普通流子盒撑高父盒，父盒高度可为 0。给父盒加 `display: flow-root` 后，它建立新的 BFC，自动高度需要包含内部浮动，于是包含这 80px。浮动本身没有被取消。

依据 [CSS 2.2 视觉格式化模型](https://www.w3.org/TR/CSS22/visuren.html)；现代 display 与 overflow 细节还应结合对应模块规范。
