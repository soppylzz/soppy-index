# 滚动吸附：决定滚动结束时停在哪里

轮播卡片滑动后自动对齐边缘，可以用原生滚动吸附，而不必先拦截所有滚轮和触摸事件。容器定义吸附策略，项目提供吸附位置。

## 最小的横向卡片轨道

```html
<div class="gallery" tabindex="0" role="region" aria-label="Photo gallery">
  <article>One</article>
  <article>Two</article>
  <article>Three</article>
</div>
```

```css
.gallery {
  display: flex;
  gap: 16px;
  overflow-x: auto;
  scroll-snap-type: x proximity;
  scroll-padding-inline: 16px;
}
.gallery > article {
  flex: 0 0 80%;
  scroll-snap-align: start;
}
```

`.gallery` 必须确有横向滚动范围。`proximity` 允许在接近吸附位置时调整，项目 start 表达起始边对齐；只有 container 或只有 item 声明都不足以完整定义这套行为。

`scroll-padding` 改变吸附参照区域，不在边缘真的生成布局留白。需要首尾实际间距时，仍要通过布局提供。

## Proximity 与 mandatory

`mandatory` 要求滚动结束后落在有效吸附位置，约束更强；proximity 由浏览器判断是否接近。若强制吸附妨碍阅读长卡片，用户会觉得“滚不到想看的位置”。

规范针对大于滚动视口的吸附区域有处理规则，不能简单理解成只能看到卡片开头；仍应测试长内容、缩放、键盘和触摸，避免为了整齐破坏访问。

## 对齐、停止与方向不是一个参数

| 属性              | 负责什么                         |
| ----------------- | -------------------------------- |
| scroll-snap-type  | 容器吸附轴和强度                 |
| scroll-snap-align | 目标区域的 start/center/end 对齐 |
| scroll-snap-stop  | 是否允许一次滚动越过该吸附位置   |
| scroll-margin     | 扩展项目的吸附区域               |

`always` 不是“禁用快速滚动”的通用锁，也不提供自动播放、当前页状态或前后按钮。这些轮播行为需独立设计，原生滚动能力应保持可用。

吸附只约束滚动停止位置，不让子项脱流，也不代替 sticky。模型见 [CSS Scroll Snap 1](https://www.w3.org/TR/css-scroll-snap-1/)。
