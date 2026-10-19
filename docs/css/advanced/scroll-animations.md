# 滚动驱动动画：用滚动进度替换时间进度

普通动画随时间运行，滚动驱动动画则让进度与滚动位置或元素穿过可视区的过程关联。用户向回滚动时，效果也可随进度回退。

## Scroll timeline 与 view timeline

| 时间线   | 主要参照                       | 适用例子             |
| -------- | ------------------------------ | -------------------- |
| scroll() | 指定滚动容器在某轴上的滚动进度 | 阅读进度条           |
| view()   | 主体元素相对滚动视口的可见过程 | 卡片进入视口时的表现 |

View 时间线的主体与其滚动参照不是同一个盒。没有有效滚动范围时，不能期待按正常时间线自动跑完；也不要把 view() 与 IntersectionObserver 的离散通知当作同一机制。

## 阅读进度条的最小增强

```html
<div class="reading-progress" aria-hidden="true"></div>
<main>Article content</main>
```

```css
.reading-progress {
  display: none;
}
@supports (animation-timeline: scroll()) and (animation-duration: auto) {
  .reading-progress {
    display: block;
    position: fixed;
    inset: 0 0 auto;
    height: 4px;
    background: teal;
    transform-origin: left center;
    animation-name: reading;
    animation-duration: auto;
    animation-timing-function: linear;
    animation-fill-mode: both;
    animation-timeline: scroll(root block);
  }
}
@keyframes reading {
  from {
    transform: scaleX(0);
  }
  to {
    transform: scaleX(1);
  }
}
@media (prefers-reduced-motion: reduce) {
  .reading-progress {
    display: none;
  }
}
```

页面需要有足够长的内容。示例按根滚动容器块轴的可滚动范围映射，而非精确判断用户读过哪些文字；不支持时不显示这项装饰，正文仍正常使用。

## 范围、简写与性能

`animation-range` 可以把活动区间限制到进入、覆盖等特定阶段，不能把所有范围百分比都理解成整个页面百分比。命名时间线还需要处理名称作用范围。

`animation` 简写会重置一些时间线相关属性；使用简写时，应把 animation-timeline、animation-range 等放在适当顺序并检查计算结果，避免后来一次 animation 覆盖掉关联。

使用原生时间线不保证动画内容没有绘制成本，模糊、大面积重绘仍需分析。不要把必要正文基础状态设为透明，再仅依赖增强能力使其出现。

模型见 [Scroll-driven Animations 1 编辑草案](https://drafts.csswg.org/scroll-animations-1/)，具体语法需按目标环境验证。
