# Transform、Transition 与 Animation

[本组导航](./README.md)

Transform 改坐标空间，通常不重新安排普通流兄弟，却会改变视觉边界、命中与包含块/堆叠关系。多个函数的组合不交换：先旋转与先平移会得到不同结果，transform-origin 和 reference box 也参与计算。

Transition 在样式值变化时对可动画属性插值；Animation 由关键帧和时间参数独立驱动。duration、delay、easing、iteration、direction、fill 和 play-state 定义不同阶段。transitionend 不保证每次操作都会收到：取消、零时长、无实际值变化等都需处理。

CSS transition 响应样式值变化，`@keyframes` 定义独立时间序列；Web Animations API 则可在脚本中创建动画并观察 `finished`、执行 `cancel()`。

transform/opacity 常有机会由 compositor 更新，不保证每次都零 paint 或独立图层。少量短期 will-change 是提示，长期给所有元素添加只会增加资源成本。reduced-motion 应减少非必要运动，同时保留文字和状态反馈。

## 样式示例与推导

```css
#moving {
  transition: transform 160ms ease;
}
#moving.changed {
  transform: translateX(80px);
}
@media (prefers-reduced-motion: reduce) {
  #moving {
    transition: none;
  }
}
```

添加 `.changed` 后，布局先保留 `#moving` 原来的占位；transform 再让它在画面上向右移动 80px，因此兄弟不会为这次位移重新排版。`transition` 让变换值在 160ms 内插值，中途读取不一定得到起点或终点。用户偏好减少动态效果时，示例去掉这段非必要过渡。

依据 [Transforms 1](https://www.w3.org/TR/css-transforms-1/)、[Transitions 1](https://www.w3.org/TR/css-transitions-1/) 和 [Web Animations](https://www.w3.org/TR/web-animations-1/)。
