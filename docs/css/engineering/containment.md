# 隔离与内容可见性：限制依赖，再决定跳过什么

长列表离屏后能否暂时不处理？浏览器需要知道哪些依赖可被限制，以及跳过内容后应留下多大空间。`contain` 与 content-visibility 分别提供约束和跳过机会。

## Contain 约束哪些影响

| 值          | 主要约束                       | 容易忽略的代价               |
| ----------- | ------------------------------ | ---------------------------- |
| size        | 元素尺寸求解不依赖后代内容贡献 | 自动尺寸可能塌陷             |
| inline-size | 仅在行内轴施加相应尺寸隔离     | 不再依赖内容撑开该轴         |
| layout      | 建立独立布局相关边界           | 可能改变定位包含块与层叠关系 |
| paint       | 限制后代绘制溢出               | 弹层、阴影可能被裁掉         |
| style       | 限制计数器等特定效果的外溢     | 不隔离一般选择器和属性继承   |

`contain: content` 组合 layout、paint、style；strict 还包含 size。它们都不等于 Shadow DOM，也不能用 style 名称推断成样式完全隔离。定义见 [CSS Containment 2](https://www.w3.org/TR/css-contain-2/)。

## 自动尺寸塌陷是约束的直接结果

```css
.card {
  contain: size;
}
.card > .body {
  height: 300px;
}
```

若 card 为普通块、height:auto 且没有其他尺寸来源，它不能再依靠这个子盒的 300px 内容撑高，内容仍可能溢出。这是隔离承诺，不是浏览器算错；应明确外部尺寸或替代尺寸，而非一律添加 strict。

## Content-visibility 管理子树处理

`visible` 正常处理；hidden 跳过内容并按相应规则使其不可用；auto 允许浏览器跳过暂不相关的内容，但保留离屏内容的查找、可访问等语义能力。

```css
.feed > article {
  content-visibility: auto;
  contain-intrinsic-size: auto 320px;
}
```

浏览器可跳过暂不相关的 article 子树，替代尺寸为未处理内容提供占位；auto 允许在已有尺寸记录时复用它，尚无记录时使用 320px 估计值。

它没有删除 DOM，也不等于虚拟列表。虚拟列表减少实际节点数量，这里保留节点并给浏览器跳过渲染的机会。

## 占位估计与强制测量

估计高度与真实高度不同时，恢复处理可能改变布局和滚动位置。把占位设得很大不保证更稳定，应结合内容分布和实际行为调整。

频繁读取被跳过子树的几何尺寸，可能要求浏览器恢复处理，抵消收益。聚焦、查找和可访问场景也需要真实验证。不要把“暂时不画”理解成“所有 DOM 操作和内存都没有成本”。

尺寸占位见 [CSS Sizing 4](https://www.w3.org/TR/css-sizing-4/#intrinsic-size-override)。
