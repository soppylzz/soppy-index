# 单位与计算：每个相对值究竟参照谁

`2em` 不总是相对父字号，50% 也不总是父宽度。值的类型决定能写什么，单位和属性共同决定怎样换算。

## CSS 像素不等于设备像素

px 是 CSS 的参考像素单位，不是显示面板上的固定一个物理像素。DPR、页面缩放和设备共同影响映射；0.5px 是否显示为预期细线还取决于栅格化。in/cm/pt 等绝对单位在屏幕上也不能无条件作为物理尺子使用。

| 单位     | 主要参照                              | 易错点                             |
| -------- | ------------------------------------- | ---------------------------------- |
| em       | 当前字号；用于 font-size 时参照父字号 | 嵌套字号可以逐级相乘               |
| rem      | 根元素字号                            | 不意味着永远为 16px                |
| ch       | 当前字体中字符 0 的推进宽度           | 不是任意字符的平均宽度             |
| lh / rlh | 当前 / 根元素行高                     | 是行高单位，不保证实际行盒就这么高 |
| %        | 由属性定义                            | 先查属性，不能只查父盒             |

根元素自身字号中的根字体相对单位有初始值参照等特殊规则，不能写成自引用循环。单位定义见 [CSS Values 4](https://www.w3.org/TR/css-values-4/#font-relative-lengths)。

## 同一元素的 em 也有两个计算参照

```html
<div class="parent"><div class="child">Example</div></div>
```

```css
.parent {
  font-size: 20px;
  width: 300px;
}
.child {
  font-size: 2em;
  padding: 1em;
  width: 50%;
}
```

`.child` 字号为 40px，padding 按自身字号为 40px，内容宽在默认 content-box 下为 150px。父字号变成 30px 后，前两者变成 60px，width 仍为 150px。

`width` 的百分比与 translate 的百分比不是同一参照；具体例子见[包含块](../box/containing-block.md)。百分比在哪个阶段能解析，取决于其参照何时确定。

## 视口单位：可见区域会变化

vw/vh 分别取视口宽高的百分之一，vi/vb 使用逻辑轴，vmin/vmax 取较小/较大尺寸。小、大、动态视口对应 sv*、lv*、dv*：移动浏览器工具栏收起前后，100svh 更保守，100lvh 可能被工具栏遮住，100dvh 会随动态视口变化。

传统 vh 按大视口定义。动态单位不保证替你解决所有软键盘遮挡；还需考虑浏览器的视口调整策略。100vw 与普通 width:100% 也不能等同：滚动条和包含块参照不同，可能出现横向溢出。

容器单位 cqi/cqb 等见[容器查询](../responsive/container-queries.md)，不要当成父元素百分比。

## calc、min、max、clamp 是带类型的计算

```css
.panel {
  width: min(100% - 2rem, 60rem);
  padding: clamp(1rem, 3vw, 2rem);
}
```

`width` 从“容器参照减留白”和 60rem 中取小值；padding 以 3vw 为期望值，再限制在 1rem～2rem。函数内可以进行计算，`calc(100% - 2rem)` 是显式写法。

加减要求兼容类型，运算符两侧保留必要空格。`calc()` 不会让 width 接受颜色，也不保证百分比立刻变成 px。`clamp(min, preferred, max)` 可理解为 `max(min, min(preferred, max))`，上下限冲突时最小值优先。函数结果还受属性允许范围、min/max 尺寸和布局约束影响。

数学函数规则见 [CSS Values 4](https://www.w3.org/TR/css-values-4/#calc-notation)。
