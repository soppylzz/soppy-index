# 响应式：空间和用户能力

[本组导航](./README.md)

响应式按内容的失效点调整，不是枚举手机品牌。viewport meta 使用 device-width、initial-scale=1，不禁用用户缩放。媒体查询关注 viewport/设备/偏好，容器查询关注组件实际祖先空间，见[容器查询](./containerQueries.md)。

移动优先从单列可用布局增强；断点方向保持一致，减少互相覆盖。min/max/clamp/calc 给流式尺寸施加上下限；不应把每个像素变化都写成断点。Grid auto-fit + minmax 可按可用空间分列，内部 min(100%,目标宽) 防止超窄容器溢出。

除宽高外还应检查 hover/pointer、reduced-motion、color-scheme 与 forced-colors。鼠标 hover 不是触屏的必需入口。长文本、大字号、200%缩放、RTL、横屏需单独验收，不只看默认截图。

## 样式示例与推导

```css
#cards {
  display: grid;
  gap: 12px;
  grid-template-columns: 1fr;
}
@media (width >= 700px) {
  #cards {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}
```

在 CSS 视口宽度低于 700px 时，卡片是一列；达到 700px 且媒体查询成立后，变为三列。断点基于 CSS 视口条件，不能把设备物理像素直接代入。

依据 [Media Queries 4](https://www.w3.org/TR/mediaqueries-4/)；用户偏好扩展见 [Media Queries 5（草案）](https://www.w3.org/TR/mediaqueries-5/)。
