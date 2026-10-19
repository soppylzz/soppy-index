# 过渡：从旧样式值插值到新样式值

`transition` 不定义最终业务状态，只描述一次样式变化怎样经过中间值。先有前后可比较的状态，才有过渡。

## 把过渡放在稳定的基础规则中

```html
<button class="button">Save</button>
```

```css
.button {
  background: #2455a4;
  transform: translateY(0);
  transition:
    transform 160ms ease,
    background-color 160ms linear;
}
.button:hover,
.button:focus-visible {
  background: #17366b;
  transform: translateY(-2px);
}
```

基础规则保留 transition，进入和离开状态都能读取它。只在 hover 内设置过渡，离开后参数消失，可能得到不同的返回行为。

`transition-duration` 决定变化时长，`transition-delay` 决定等待；负 delay 表示从已经经过一段时间的位置开始。`transition-timing-function` 映射进度，ease 不等于恒速，steps 则产生阶梯变化。

## 属性类型决定中间值如何生成

长度、颜色、变换等按各自规则插值，不是所有值都能平滑变化。`width: auto` 与固定长度的过渡不能直接套用“两边都是数字”的理解，内在尺寸插值属于需单独验证的增强能力。

避免 transition:all 让无意变化的尺寸、颜色都参与过渡，难以解释也容易增加工作。明确列出真正需要变化的属性。

`display` 等离散属性不会平滑生成“半个盒”。较新的 `transition-behavior: allow-discrete` 与 `@starting-style` 可支持进入/退出模式，但要分别检测能力，不能只给 display 加时长就期待淡入淡出。见 [CSS Transitions 2](https://www.w3.org/TR/css-transitions-2/)。

## 为什么没有触发，或突然中断

首次创建元素时可能没有独立的旧样式状态；同一次样式更新里的多次赋值也可能被合并。需要显式的进入机制或明确分离状态，不要把“写了两条赋值”当作浏览器必然绘制了两帧。

元素被移除、display:none、属性再次变化或过渡被取消，都会影响过程。反向切换还可能采用过渡缩短规则，不保证每次从头运行完整时长。

## 结束事件不是可靠的业务开关

`transitionend` 按实际属性产生，可冒泡；多个属性会有多个事件。无实际变化、被取消等情况不保证收到预期的结束事件，取消应考虑 transitioncancel。

“已关闭”“数据已保存”等业务状态应独立成立，结束事件用于阶段清理，并过滤 target 和 propertyName。用户选择减少动态效果时，也不能因为没有动画而失去功能。

基础过渡模型见 [CSS Transitions 1](https://www.w3.org/TR/css-transitions-1/)。
