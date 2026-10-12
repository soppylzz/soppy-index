# Display 与盒生成

[本组导航](./README.md)

先问元素有没有生成盒，再问盒如何参与父布局、内部如何排列子项。`display: none` 直接停在第一步；`inline-block` 的外部表现像行内盒、内部建立独立的流；`display: flex` 的外部通常是块盒，内部按 Flex 排列。DOM 节点并不等于一个 CSS 盒。

`display:none` 不生成布局盒；`visibility:hidden` 保留布局但隐藏绘制；`opacity:0` 整体透明却保留布局和通常的命中、焦点行为。hidden 的后代可显式 visible；不可把所有隐藏方式视作完全等价。

`display:contents` 通常移除自身主盒并让子盒参与外层布局，但元素语义、辅助技术实现和部分 replaced 元素有特殊边界，不能无条件用于交互容器；交互容器使用前应检查无障碍表现。

## 样式示例与推导

```css
.target {
  display: inline-block;
  visibility: visible;
  opacity: 1;
}
.none {
  display: none;
}
.hidden {
  visibility: hidden;
}
.transparent {
  opacity: 0;
}
```

同一个元素改成 `display: none` 后不生成布局盒；改成 `visibility: hidden` 时保留占位；改成 `opacity: 0` 时仍占位，通常还可参与命中与焦点。焦点与可访问树的细节需按具体元素检查。

参阅 [CSS Display](https://www.w3.org/TR/css-display-3/) 和 [CSS Color opacity](https://www.w3.org/TR/css-color-4/#transparency)。
