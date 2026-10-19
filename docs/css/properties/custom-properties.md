# 自定义属性：从保存值到 @property 注册

`--tone: teal` 给元素赋值；`@property --tone` 注册值类型、继承行为和初始值。两者分别是声明与属性定义。

## 声明保存值，var() 在使用位置引用它

```html
<section class="theme">
  <p class="label">A shared theme color.</p>
</section>
```

```css
.theme {
  --tone: teal;
}
.label {
  color: var(--tone);
  border: 1px solid var(--tone);
}
```

普通自定义属性以 -- 开头，区分大小写，默认继承，无须注册。Label 继承 --tone，文字与边框通过 var() 引用它。

未注册属性保存 token 序列，--tone 也能存放 12px；替换到 color 等属性后才检查目标语法。它在运行时参与层叠与继承，不同于 Sass/Less 的构建时变量。定义见 [CSS Variables 1](https://www.w3.org/TR/css-variables-1/)。

## 回退针对变量状态，不负责修复目标类型

```css
.label {
  color: var(--tone, green);
}
```

未注册的 --tone 没有声明或继承值时为 guaranteed-invalid，var() 选择 green。若值为 12px，则直接替换，随后 color 类型检查失败，green 不会纠正它。

可用 `var(--tone, var(--fallback, green))` 嵌套回退。第一个逗号后都是回退内容。循环引用会使相关未注册变量无效。

变量缺失、目标类型错误与注册类型错误的阶段对照见[值处理阶段](./processing.md#计算时失效为什么没有重新采用前一条-color)。

## 继承的是计算结果，别名不会自动重新绑定

```html
<div class="theme">
  <p class="label">An inherited alias.</p>
</div>
```

```css
.theme {
  --base: green;
  --alias: var(--base);
}
.theme .label {
  --base: blue;
  color: var(--alias);
}
```

文字仍为绿色：--alias 在 theme 上已计算为 green，子元素继承的是结果。若想跟随子元素的 --base，应直接引用它，或在子元素上重新声明别名。

## @property 把类型、继承和初始值纳入属性定义

```css
@property --progress {
  syntax: "<number>";
  inherits: false;
  initial-value: 0;
}

.meter {
  --progress: 0.8;
  opacity: var(--progress);
}
```

注册生效时，meter 取得 0.8；未声明此属性的后代因禁止继承而使用初始值 0。注册不负责选中元素。

| 描述符        | 定义什么     | 注意事项                                             |
| ------------- | ------------ | ---------------------------------------------------- |
| syntax        | 值语法       | 必填字符串，类型与组合见属性类型                     |
| inherits      | 默认是否继承 | 必须显式提供 true 或 false                           |
| initial-value | 属性初始值   | 除通用语法外必须提供，且满足注册语法与计算独立性要求 |

初始值须计算独立，例如 length 类型可用 10px，不能用依赖字号的 2em。约束见 [Properties and Values API 1 的 @property 规则](https://www.w3.org/TR/css-properties-values-api-1/#at-property-rule)。

@property 不能重定义内置属性或提高声明优先级。计算时的类型检查及 initial-value 与 fallback 的区别见[注册初始值与回退](./processing.md#注册初始值与-var-回退分别在哪个阶段生效)。

## 类型注册为什么影响动画

沿用上面的注册：

```css
.meter {
  --progress: 0;
  opacity: var(--progress);
  transition: --progress 200ms linear;
}
.meter.active {
  --progress: 1;
}
```

注册后 --progress 按数值在 0 与 1 之间插值，opacity 随之变化；未注册属性按离散方式变化。

若改用 `transition: opacity 200ms linear`，过渡的是 opacity，不能据此证明变量本身可连续插值。规则见 [注册属性的动画行为](https://www.w3.org/TR/css-properties-values-api-1/#animation-behavior)。
