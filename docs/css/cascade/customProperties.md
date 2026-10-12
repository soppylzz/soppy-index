# 自定义属性：替换 token 与属性值验证

[模块导航](./README.md) · [层叠](./cascade.md)

普通 `--name` 自定义属性在浏览器运行时参与层叠和继承，值主要保存为 token。`var()` 在使用位置替换，再按目标属性的语法处理；不是在构建时替换字符串的 Sass/Less 变量。[CSS Variables 规范](https://www.w3.org/TR/css-variables-1/)规定变量替换、循环和计算时失效的处理。

## 1. 回退处理的是变量状态

```css
color: var(--tone, green);
```

当 --tone 缺失或为 guaranteed-invalid value 时，这里可以使用 green。若 --tone 的值是 `12px`，它作为未注册自定义属性可以存在，却不是有效 color；替换后的声明在 computed-value time 失效，var 的 green 不会替已经存在的 12px 自动纠错。

一个重要后果是：此时不会重新启动层叠、找回之前被覆盖的 color。属性按无效计算值的规则默认化；对 color 这类继承属性，通常继承父元素的计算值。

## 2. 缺失变量与无效类型

假定 `#missing` 和 `#invalid` 都是 `#variable-parent` 的后代；以下规则让它们分别遇到缺失变量和无效颜色：

```css
#variable-parent {
  color: rebeccapurple;
  --lab-tone: 12px;
}
#missing {
  color: var(--lab-missing, green);
}
#invalid {
  color: blue;
  color: var(--lab-tone, green);
}
```

逐个看变量是否“存在”，再看替换后是否“适合目标属性”：

1. `#missing` 找不到 `--lab-missing`，所以 `var()` 使用 `green`。
2. `#invalid` 找得到 `--lab-tone: 12px`，所以不会使用 `green`。替换后 `12px` 不能作为颜色，整个胜出的 `color` 声明在计算时失效；它继承父色，也不会重新找回前一条 `blue`。

若父色改变，只有第二种情况随之变化。

这些规则假定处于同一来源、同一层；实际页面还要先确认层叠范围，不能只截取 `var()` 一行推断最终颜色。

## 3. 继承、循环与命名

普通自定义属性默认继承，名称区分大小写。变量循环会让相关值无效；嵌套回退如 `var(--theme, var(--fallback, green))` 可以定义缺失时的链条，但不修复错误类型。

自定义属性值会在声明元素上计算并随后继承；不能假设祖先声明的 `--alias: var(--base)` 会在每个后代重新按该后代的 --base 求值。主题通常使用语义 token，在明确的作用域覆盖；高层 token 变化仍可能让较大后代范围重新计算样式。

## 4. 注册后的类型与继承

注册示例：

```css
@property --lab-count {
  syntax: "<number>";
  inherits: false;
  initial-value: 2;
}
```

若父元素设置 `--lab-count: 7`，支持并接受注册时，未声明该值的子元素使用 2，不继承 7；不支持注册的环境可能仍按普通变量继承。[Properties and Values API](https://www.w3.org/TR/css-properties-values-api-1/)定义类型检查、默认值与继承，并让适合的已注册值按类型插值。

注册的继承控制不等于任意变量都可动画；动画、容器查询和主题工程分别见相应模块。
