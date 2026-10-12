# 层叠与继承：先确定竞争范围，再比较权重

[模块导航](./README.md)

多个规则命中同一元素时，浏览器需要为每个属性选择声明，再完成默认化、继承和计算。specificity 只负责其中一步；“ID 一定胜过 class”遗漏了来源、important 和层的比较。[CSS Cascade 5 的排序规则](https://www.w3.org/TR/css-cascade-5/#cascade-sort)定义这些优先关系。

## 1. 怎样判断谁获胜

面对两条都写了 `color` 的规则，按下面顺序缩小问题：

1. 规则是否命中元素，`@media` / `@supports` 条件是否成立？不成立的声明不参与比较。
2. 声明属于哪个来源，是否带 `!important`？动画和正在运行的过渡也有自己的优先位置。
3. 在相同来源和重要性内，比较层；只有进入同一层后，才比较 specificity，随后才看出现顺序。使用 `@scope` 时还要考虑 [scoping proximity](https://www.w3.org/TR/css-cascade-6/#cascade-sort)。

这样先确定竞争范围，再谈“ID 比 class 强”。

按优先级从低到高，可概括为 UA normal、user normal、author normal、animation、author important、user important、UA important、正在运行的 transition。内联普通样式在作者普通声明中有特殊优先位置；不是靠添加任意多 class 就能超过。运行中的过渡值又不能简单用这个内联规则解释。

在相同来源、重要性和上下文内，普通声明的后层胜过前层，未分层的普通声明又胜过已分层声明；important 的层顺序反转，已分层 important 胜过未分层 important。层顺序由首次建立时确定，不是后续重新出现就移动层的位置。

## 2. 层与 specificity 的比较示例

同一元素同时拥有 `id="layer-target"` 和 `class="specimen"`，两条规则分别位于不同层：

```css
@layer lab-base, lab-theme;
@layer lab-base {
  #layer-target {
    color: red;
  }
}
@layer lab-theme {
  .specimen {
    color: blue;
  }
}
```

普通情况下后层的 class 声明获胜；先比较层，根本还没轮到 ID 和 class 比较。若两层声明都改为 `!important`，前层红色声明转为优先。同一来源的未分层普通声明可覆盖这两条分层普通声明；未分层 important 则处于已分层 important 之后。

判断结果时先确认选择器命中、来源和层，再看权重。示例中的颜色只用于说明声明优先级。

## 3. 继承与重置不是同一个操作

| 值           | 作用                                                |
| ------------ | --------------------------------------------------- |
| inherit      | 使用父元素的计算值，无论属性默认是否继承            |
| initial      | 使用属性定义的初始值，不是 UA stylesheet 的默认外观 |
| unset        | 默认继承的属性走 inherit，否则走 initial            |
| revert       | 回退当前来源的效果，重新考虑更低来源的结果          |
| revert-layer | 回退当前层的声明效果，重新考虑较低优先层            |

color 通常继承，width 通常不继承；某个属性有显式胜出声明时，不能仅因父元素设置了它就期待继承覆盖。自定义属性默认继承，但注册后可改变，见[变量笔记](./customProperties.md)。重置关键字、用户样式、动画与过渡需按各自所处的层叠阶段判断。

## 4. 从声明到实际像素

候选声明经过层叠得到 cascaded value，默认化得到 specified value；随后计算相对值等得到 computed value，布局产生 used value，最终设备约束下得到 actual value。[值处理阶段](https://www.w3.org/TR/css-cascade-5/#value-stages)避免把每个阶段都叫“最终样式”。

`getComputedStyle()` 返回的是 resolved values，有些属性会暴露布局后的值；它不是“能恢复所有原始 CSS 声明”的 API。查看规则来源用 DevTools Styles，查看解析后的结果用 computed style；读取布局和视觉矩形的 API 边界见 [DOM 尺寸](../../browser/dom/dom.md)。
