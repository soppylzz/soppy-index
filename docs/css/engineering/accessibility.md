# CSS 可访问性与交互一致性

[本组导航](./README.md)

CSS 会影响焦点可见性、阅读与视觉顺序、缩放和内容可见性。focus-visible 根据输入方式等启发式控制焦点提示，应提供明显 outline；forced-colors 下 box-shadow 可能不可靠。不要只去掉 outline。

先让 DOM 顺序表达合理的阅读和操作顺序，再用 CSS 排版。Flex 的 `reverse` / `order` 与 Grid placement 可以改变视觉顺序，通常不会同步改变 Tab 顺序；用户可能看到焦点在屏幕上跳动。错误、成功和选中状态还需要文字或形状，不能只靠颜色；`placeholder` 也不能代替标签。

opacity:0 常仍可交互，display:none/visibility:hidden 通常不可见且从可访问树排除；aria-hidden 不负责阻止焦点。visually-hidden 模式应只用于必要可访问文本，不把可聚焦控件藏成不可见焦点陷阱。

尊重 reduced-motion、缩放、文本放大与窄屏重排。本文不作 WCAG 全面合规声明，真实键盘、屏幕阅读器、颜色对比和200%缩放需要分别验收。

## 样式示例与推导

```css
#controls {
  display: flex;
  gap: 10px;
}
#controls.changed {
  flex-direction: row-reverse;
}
#controls button:focus-visible {
  outline: 3px solid #164eaf;
  outline-offset: 3px;
}
```

`row-reverse` 改变视觉排列，DOM 顺序与通常的 Tab 顺序仍按原结构。焦点提示应保持可见；还需用键盘、读屏、缩放和高对比模式分别检查真实交互。

依据 [WCAG 2.2](https://www.w3.org/TR/WCAG22/) 的焦点、顺序、对比与重排要求。
