# 逻辑属性、Direction 与 Writing-mode

[本组导航](./README.md)

inline axis 沿行内文字方向，block axis 沿新行排列方向。horizontal-tb + ltr 时分别向右/向下；vertical-rl 中 inline 常竖直、block 向左。direction 与 Unicode 双向算法还影响混合数字、代码和标点，不能用一个 RTL 开关保证所有内容镜像正确。

inline-size/block-size、margin-inline、padding-block、inset-inline 等让组件随书写模式映射。Flex row 沿 inline，column 沿 block；Grid 的 justify/align 也基于逻辑轴。物理属性仍适合固定屏幕边缘、光源阴影或画布坐标等具有真实物理语义的场景。

RTL 验证应看按钮顺序、绝对定位、图标、滚动和焦点；不要仅测试段落文字靠右。

## 样式示例与推导

```css
#logical {
  inline-size: 160px;
  block-size: 80px;
  border-inline-start: 6px solid teal;
}
```

`horizontal-tb` 下，`inline-size: 160px` 对应物理宽；`vertical-rl` 下，它对应物理高。`border-inline-start` 会随书写方向映射到不同物理边，不能把 inline-start 固定理解为 left。

依据 [CSS Logical Properties 1](https://www.w3.org/TR/css-logical-1/) 与 [Writing Modes 3](https://www.w3.org/TR/css-writing-modes-3/)。
