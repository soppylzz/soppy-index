# 用户能力与偏好：响应式不只查询宽度

大屏可能使用触摸，小屏也可能连接鼠标。用户还可能要求减少动态效果或使用强制颜色；这些条件不能从视口尺寸推断。

## Hover 与 pointer 反映输入能力

| 查询                    | 关注点                           |
| ----------------------- | -------------------------------- |
| hover                   | 主要指针是否能方便地悬停         |
| pointer                 | 主要指针精度：none、coarse、fine |
| any-hover / any-pointer | 所有可用指针中是否存在相应能力   |

存在 fine 指针不表示用户此刻一定用鼠标；设备也可能同时满足多个 any-pointer 能力。核心操作应始终能点击和键盘访问，悬停只做增强。

```css
.action {
  min-height: 44px;
}
@media (hover: hover) and (pointer: fine) {
  .action:hover {
    text-decoration: underline;
  }
}
```

44px 是本例的设计取值，不是所有场景统一的合规结论。不要只在 hover 后才显示唯一操作入口。

## 减少动态效果，保留状态反馈

```css
.notice {
  transition: transform 180ms ease;
}
@media (prefers-reduced-motion: reduce) {
  .notice {
    transition: none;
  }
  html {
    scroll-behavior: auto;
  }
}
```

`reduce` 表达偏好减少运动，不要求机械删除所有动画。优先取消大幅位移、缩放和持续运动，保留静态进度、文字和必要反馈；业务不能依赖动画结束事件才完成。

## 暗色偏好与浏览器原生控件

`prefers-color-scheme` 用于条件选择作者主题，color-scheme 则告诉浏览器元素支持的配色方案，影响适用的原生控件、滚动条等。后者不会自动替作者的所有背景和文字设计暗色方案。

用户主动选择的主题通常应优先于系统默认偏好，避免每次系统变化都覆盖用户决定。语义颜色变量可以让主题集中切换。

## 高对比与强制颜色

`forced-colors` 模式可能重写颜色并移除阴影等效果；只用 box-shadow 表示边框或焦点可能丢失。可在对应查询中使用系统颜色和明确 border/outline，不要无差别关闭 forced-color-adjust。

`prefers-contrast` 和 forced-colors 不是同一个条件。不同查询应分别增强，而不是组成一张“手机/桌面”二分表。定义见 [Media Queries 5](https://www.w3.org/TR/mediaqueries-5/)。
