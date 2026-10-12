# 字体匹配、加载与布局稳定性

[本组导航](./README.md)

`font-family` 给的是候选顺序，不是“整行只用一个字体文件”的保证。浏览器会为具体字形寻找可用字体，同一行也可能逐字回退；粗细和斜体还要匹配相应字形，必要时可能合成。`font-synthesis` 可限制合成。`getComputedStyle()` 返回候选 family 列表，不能据此确定每个字最终用了哪个文件。

Web Font 用 @font-face 描述 family、src、weight/style 与可变轴范围。font-display 管理加载等待和交换策略：swap 倾向尽快用 fallback 再交换；optional 允许浏览器放弃本次交换，不保证所有网络环境行为相同。FOIT/FOUT 描述现象，不是固定毫秒协议。

不同字体的 advance、ascent/descent 会改变换行与布局。可选择接近的 fallback，通过 size-adjust 和度量 override 调整，并只 preload 确定关键且会使用的字体。unicode-range/subset 减少无关字形，不能单凭可变字体文件数量更少就断言传输更小。

`FontFaceSet.ready` 等待当前文档字体加载和布局相关准备，不证明所有未来字体都已加载。分析 `font-display` 的交换行为还需考虑真实字体文件、网络和浏览器策略。

## 样式示例与推导

```css
#sample {
  display: inline-block;
  font: 24px sans-serif;
}
#sample.monospace {
  font-family: monospace;
}
```

改用 monospace 后，字形 advance 和回退字体可能变化，因而换行与盒宽也可能变化；具体数值依赖系统字体、文字和字号。`font-family` 的声明值本身不足以证明每个字实际使用的字体文件。

依据 [CSS Fonts 4（草案）](https://www.w3.org/TR/css-fonts-4/) 和 [CSS Font Loading 3](https://www.w3.org/TR/css-font-loading-3/)。
