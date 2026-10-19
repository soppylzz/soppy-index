# 声明优先级：先确定竞争范围，再比较权重

同一元素的同一属性有多个候选声明时，先比较来源、重要性和层等条件，再比较 specificity。[CSS Cascade 5 的排序规则](https://www.w3.org/TR/css-cascade-5/#cascade-sort)定义这些优先关系。

## 先过滤候选，再进行层叠排序

普通文档树中，按以下顺序判断：

1. 规则是否命中元素，`@media` / `@supports` 条件是否成立？不成立的声明不参与比较。
2. 声明属于哪个来源，是否带 `!important`？动画和正在运行的过渡也有自己的优先位置。
3. 在相同来源和重要性内，比较层；只有进入同一层后，才比较 specificity，再比较作用域邻近性（适用 `@scope` 时），最后才看出现顺序。作用域规则见 [CSS Cascade 6](https://www.w3.org/TR/css-cascade-6/#cascade-sort)。

以下示例不涉及 Shadow DOM 或 @scope。

来源与重要性由低到高如下。外部样式表、style 元素和内联样式都属于作者来源。

| 优先级（低 → 高） | 声明或效果            |
| ----------------- | --------------------- |
| 1                 | 浏览器普通声明        |
| 2                 | 用户普通声明          |
| 3                 | 作者普通声明          |
| 4                 | 关键帧动画效果        |
| 5                 | 作者 important 声明   |
| 6                 | 用户 important 声明   |
| 7                 | 浏览器 important 声明 |
| 8                 | 正在运行的过渡效果    |

内联普通样式优先于作者样式表中的普通声明，但仍可能被 important 或运行中的过渡等覆盖。

## @layer 在 specificity 之前决定层顺序

同一来源和上下文内，普通声明后层优先，未分层优先于已分层；important 层顺序反转，已分层优先于未分层。层顺序由首次建立时确定。

两个选择器均匹配此段落：

```html
<p id="layer-target" class="specimen">Layer order comes first.</p>
```

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

普通声明下为蓝色：theme 层先胜出，无须比较 ID 与 class。两条都加 `!important` 后，层顺序反转，结果为红色。

## specificity 比较的是选择器权重

同一竞争范围内，按 `(ID, class/属性/伪类, 类型/伪元素)` 三列从左到右比较，不作十进制进位。组合符和通配符不计权重。

以下两条规则均匹配 h2：

```html
<section id="panel" class="panel">
  <h2 class="title">Specificity within one layer.</h2>
</section>
```

```css
#panel .title {
  color: red;
}
.panel h2.title {
  color: blue;
}
```

同一普通作者层中，`(1,1,0)` 胜过 `(0,2,1)`，结果为红色。前面的排序条件都相同后，才比较出现顺序。

函数伪类的权重及列表规则见[选择器的 specificity](../selector/matching.md#specificity匹配之后怎样比较权重)。`!important`、@layer 和内联样式不属于这三列的加分项。

## 为什么父元素的 ID 不能压过子元素的 class

```html
<div id="page">
  <p class="label">An explicitly styled child.</p>
  <p>An inheriting child.</p>
</div>
```

```css
#page {
  color: red;
}
.label {
  color: blue;
}
```

第一个段落为蓝色，第二个继承红色。#page 匹配 div，没有直接匹配 p；父元素的权重不随继承传给子元素。子元素自己的声明与继承不是同一轮权重竞争。

使用 inherit、initial 等关键字的声明也需先胜出；关键字不提高优先级，具体行为见[默认值与回退](./defaulting.md)。
