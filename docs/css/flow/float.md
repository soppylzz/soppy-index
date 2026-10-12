# 浮动、环绕与清除

[本组导航](./README.md)

float 最适合文章图片的文字环绕。浮动不按普通流块盒给后续兄弟占位，却会缩短同一格式化上下文里的后续行盒；不能笼统称为“完全不影响文档流”。物理 left/right 与逻辑 inline-start/end 要按支持情况选择。

clear 约束声明元素相对相关先前浮动的放置，通过 clearance 把它移到浮动下方；它不是给父元素执行清除命令。clearfix 生成普通流伪元素再 clear，利用它的位置撑开父元素。现代单纯包含浮动可用 flow-root。

主页面布局通常用 Flex/Grid 更清楚；新 BFC 避开外部浮动的传统两栏方案仍有分析价值。

## 样式示例与推导

```css
#floated {
  float: left;
  width: 90px;
  height: 80px;
}
#cleared.changed {
  clear: both;
}
```

浮动缩短旁边可用的行盒空间，文本因此环绕；加上 `clear: both` 的后续块要避开先前浮动。要让父盒包含内部浮动，可在父盒使用 `display: flow-root`，这与 `clear` 的作用对象不同。

依据 [CSS 2.2 视觉格式化模型](https://www.w3.org/TR/CSS22/visuren.html)；现代 display 与 overflow 细节还应结合对应模块规范。
