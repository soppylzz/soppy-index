# 默认值与回退：inherit、initial、unset、revert 与 revert-layer

“恢复默认”可能指继承父值、取属性初始值，或撤回某个来源或层的声明；这些操作对应不同关键字。

## 先明确：没有声明时，值从哪里来

没有层叠值时，默认继承的属性取父元素计算值，否则取初始值；根元素无法继承时取初始值。Color 默认继承，margin-left 不继承。

没有作者声明不等于没有声明：浏览器样式表可能已设置标题字号、段落间距等，它们不等于属性定义的初始值。

## 先区分取值与回退范围

| 关键字       | 想表达的操作                     | 不应误解为               |
| ------------ | -------------------------------- | ------------------------ |
| inherit      | 取得父元素的计算值               | 继承父选择器的权重       |
| initial      | 取属性定义的初始值               | 恢复标签的浏览器默认外观 |
| unset        | 默认继承则 inherit，否则 initial | 找回前一条声明           |
| revert       | 按来源回退                       | 只删除当前规则           |
| revert-layer | 按层回退                         | 在当前层寻找上一条声明   |

这些全局关键字仍需通过层叠胜出，定义见 [CSS Cascade 5](https://www.w3.org/TR/css-cascade-5/#defaulting-keywords)。

## inherit：明确取得父元素的计算值

前三个关键字使用同一 HTML，各节 CSS 独立应用，无其他覆盖：

```html
<div class="parent">
  <p class="child">Follow the parent or use the initial value.</p>
</div>
```

```css
.parent {
  color: rebeccapurple;
  margin-left: 20px;
}
.child {
  color: inherit;
  margin-left: inherit;
}
```

Child 为紫色、左外边距为 20px。显式 inherit 可以要求默认不继承的属性继承。

继承传递计算值：父字号的 2em 若已算成 32px，子元素得到 32px，不会再乘一次。父选择器的权重不随继承传递。

## initial：取属性定义的初始值

```css
.parent {
  color: rebeccapurple;
}
.child {
  color: initial;
  margin-left: initial;
}
```

Child 的 margin-left 为 0，color 为系统颜色 CanvasText，不能固定解释为黑色。

初始值与标签无关：display 的初始值是 inline，因此 div 的 `display: initial` 也为 inline，不是浏览器通常提供的 block。

## unset：按属性默认是否继承来选择

`unset` 对默认继承的属性等同 inherit，对默认不继承的属性等同 initial。

本例 `color: unset` 继承紫色，`margin-left: unset` 为 0。即使先写 color: blue，后写 unset，也会继承父色，不恢复 blue。

## revert：撤回当前来源对该属性的影响

作者样式中的 revert 撤回该元素该属性的作者来源效果，重新考虑用户、浏览器来源，再按需要默认化。它不限于当前规则或文件。

```html
<div class="layout restore">Restore the browser display.</div>
```

```css
.layout {
  display: flex;
}
.layout.restore {
  display: revert;
}
```

若无用户样式干扰，且浏览器把 div 设为 block，结果为 block，不恢复作者的 flex，也不取 initial 的 inline。

`revert` 仍允许默认继承：回退后没有自身 color 声明时，元素可能继承父元素由作者设置的颜色。

## revert-layer：撤回当前层对该属性的影响

同一作者来源的普通声明中，theme 层优先于 base：

```html
<button class="button restore">Restore the base layer.</button>
```

```css
@layer base, theme;

@layer base {
  .button {
    color: green;
  }
}
@layer theme {
  .button {
    color: blue;
  }
  .button.restore {
    color: revert-layer;
  }
}
```

结果为 green：revert-layer 撤回 theme 层的效果，不恢复该层的 blue。若改成 revert，base 的作者声明也被撤回。

前者回退层，后者回退来源；important 会反转层顺序，不能把回退理解为寻找源码中的上一层。

## all 可以批量使用，但不是组件隔离

```css
.widget {
  all: unset;
  display: block;
}
```

All 不包含 direction、unicode-bidi 和自定义属性。这里的 unset 仍允许默认继承，也不清除 --theme 等变量，不能提供完整样式隔离。用于控件时，还需补齐被重置的焦点提示等交互外观。
