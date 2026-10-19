# 关键帧动画：时间、方向与填充分别控制什么

`transition` 响应状态变化，animation 可以独立描述一个时间序列。关键帧定义值，时间参数决定何时读取这些值。

## 用进度条区分动画参数

```html
<div class="track"><div class="progress"></div></div>
```

```css
.progress {
  height: 4px;
  background: teal;
  transform-origin: left center;
  animation: fill 2s linear 500ms 1 normal both;
}
@keyframes fill {
  from {
    transform: scaleX(0);
  }
  to {
    transform: scaleX(1);
  }
}
```

等待 500ms 后执行一次 2s 动画。Both 让等待期间应用起始关键帧，结束后保留末端效果；它不会把最终 transform 写回基础样式。移除 animation 后，仍回到其他规则决定的值。

## 参数分工与常见误读

| 参数                                 | 控制什么                                  |
| ------------------------------------ | ----------------------------------------- |
| animation-duration / animation-delay | 每轮时长 / 起始延迟；负延迟可直接进入中途 |
| animation-timing-function            | 每段关键帧之间如何推进                    |
| animation-iteration-count            | 重复次数，可以是小数或 infinite           |
| animation-direction                  | normal、reverse、alternate 等每轮方向     |
| animation-fill-mode                  | 活动区间之前和之后是否应用相关关键帧      |
| animation-play-state                 | 运行或暂停，暂停通常保留当前进度          |

`forwards` 保留的是最后相关关键帧，不一定是 100%：reverse、alternate 与轮数共同决定结束位置。关键帧缺少起点或终点时，会结合底层值求解；不是缺少一端就必然无效。

## 多个动画与层叠

多个 animation 用逗号定义，各项参数按列表对应。默认替换合成时，多个动画写同一属性会竞争，不会自动把平移和旋转相加；可拆到嵌套元素，或在明确支持的条件下使用合成机制。

动画值参与层叠：普通声明可能被动画覆盖，important 声明又有更高位置，运行中的 transition 另有优先级。见[声明优先级](../properties/cascade.md)。Keyframes 内的 important 声明不用于提升动画权重。

## 暂停、取消和结束

`animationend` 不等于一定执行：移除动画或元素会导致取消。无限循环没有正常的最终结束；animationiteration 表示迭代边界。要区分业务状态、动画运行状态与事件通知。

CSS 适合声明表现；需要精确暂停、反向、同步或观察 finished 时，可考虑 Web Animations API，但不应让核心内容依赖动画结束才可访问。

非必要位移、缩放应尊重 prefers-reduced-motion，并提供静态状态。时间模型见 [CSS Animations 1](https://www.w3.org/TR/css-animations-1/)，脚本控制见 [Web Animations](https://www.w3.org/TR/web-animations-1/)。
