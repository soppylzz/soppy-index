# 滚动行为：滚动范围、滚动链与目标留白

内层列表滚到底后页面也开始滚动，是滚动链；锚点跳转后标题被吸顶栏遮住，是目标可视区域问题。它们不是 overflow 的同一个开关。

## 先让真正的滚动盒获得约束

```html
<div class="panel"><div class="items">Long content</div></div>
```

```css
.panel {
  max-height: 20rem;
  overflow: auto;
  overscroll-behavior-y: contain;
}
.items {
  min-height: 40rem;
}
```

`.panel` 受限后产生内部滚动范围；contain 控制它在纵向边界处是否向祖先继续传递滚动，不会直接锁住整个页面。Flex/Grid 中还需确认项目的自动最小尺寸没有阻止滚动盒收缩。

## Overscroll 控制边界行为

| 值      | 滚动到边界后的行为                                           |
| ------- | ------------------------------------------------------------ |
| auto    | 浏览器默认边界效果与滚动链                                   |
| contain | 阻止该方向的非局部边界行为，如向祖先串滚；可保留本地边界效果 |
| none    | 进一步抑制相应本地边界效果                                   |

这些属性作用于滚动容器，不能给任意普通盒设置后就期待它捕获所有手势。规则见 [CSS Overscroll Behavior 1](https://www.w3.org/TR/css-overscroll-1/)。

`touch-action` 另管浏览器可处理的触摸平移、缩放等默认手势，不是滚动链的替代品。不要为了处理一个组件而无差别禁止页面缩放或全部触摸默认行为。

## 锚点被吸顶栏挡住时，调整滚动目标空间

```css
html {
  scroll-padding-top: 64px;
  scroll-behavior: smooth;
}
section[id] {
  scroll-margin-top: 8px;
}
```

`scroll-padding` 描述滚动容器的优选可视区域，scroll-margin 扩展目标的滚动对齐区域。它们不增加普通布局 padding/margin，却可影响滚入视图和吸附时的目标位置。

根元素 上的 scroll-behavior 用于视口滚动；body 的同名声明不保证按同样方式传播。Smooth 主要控制导航和相关滚动 API 触发的滚动，不改写所有用户手动滚动；浏览器也可按策略忽略平滑行为。

## 平滑不保证精确时长，锚定也不是定位

CSS 不提供 scroll-behavior 的统一持续时间。应尊重减少动态效果偏好，不把动画完成时刻当作精确业务时钟。

滚动锚定可在上方内容变化时调整滚动位置以保持阅读目标稳定；overflow-anchor 能在适用场景排除某些内容，但不能消除所有布局位移。图片预留比例、字体策略仍需单独处理。

目标空间见 [CSS Scroll Snap 1](https://www.w3.org/TR/css-scroll-snap-1/#scroll-padding)，滚动锚定见 [CSS Scroll Anchoring 1](https://www.w3.org/TR/css-scroll-anchoring-1/)。
