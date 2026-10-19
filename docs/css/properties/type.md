# 属性与取值：怎样读懂一条 CSS 声明

读懂声明，需要区分属性名、合法取值，以及简写展开后的分量。

## 属性、值与声明分别是什么

```css
.card {
  width: 240px;
  color: royalblue;
}
```

`width` 是属性名，`240px` 是值，`width: 240px` 是声明；`.card` 是选择器。

合法取值与适用对象要分开判断：`width: royalblue` 语法无效；给普通非替换行内元素设置 `width: 240px` 则语法合法，但不按普通块的方式控制宽度。

## 先分清属性的几种分类维度

| 分类维度 | 区别 | 例子 |
| --- | --- | --- |
| 内置与自定义 | 内置属性由规范定义行为；自定义属性由作者命名，用于保存可供其他声明使用的值 | color 与 --theme-color |
| 长写与简写 | 长写设置一个分量；简写同时设置一组相关长写属性 | margin-left 与 margin |
| 默认继承与不继承 | 子元素没有相关声明时，属性是否默认取得父元素的计算值 | color 默认继承，margin-left 默认不继承 |

这些维度可交叉：margin 是内置简写，其长写默认不继承。“长度类型”则描述值语法，width 还允许百分比和 auto。

## 值类型描述语法，不是 JavaScript 的运行时类型

规范用 `<length>`、`<number>`、`<percentage>` 表示类型；代码中写具体值，如 `12px`、`1.5`、`50%`。

| 值的类别 | 示例 | 容易混淆的边界 |
| --- | --- | --- |
| 数值与整数 | opacity: 0.5、z-index: 2 | 整数与一般数值不是同一个语法范围 |
| 长度 | width: 20px、font-size: 1.2rem | 非零长度通常不能省略单位，line-height: 1.5 则是数值形式 |
| 百分比 | width: 50% | 参照由属性规定，不是固定等于父宽 |
| 颜色 | color: red、color: rgb(20 80 140) | 颜色函数的结果是颜色，不是任意字符串 |
| 角度与时间 | rotate: 30deg、transition-duration: 200ms | 单位表达不同维度，不能任意替换 |
| 属性关键字 | width: auto、display: grid | auto 没有跨所有属性统一的尺寸算法 |
| 结构化或函数值 | transform: translateX(10px) | 函数是值语法的一部分，其参数仍要满足类型约束 |

`calc()` 也受类型约束：width 可使用 `calc(100% - 20px)`，不能使用 `calc(100% - 1s)`。语法见 [CSS Values and Units 4](https://www.w3.org/TR/css-values-4/#value-defs)。

## 简写属性会同时声明多个长写属性

简写展开为长写后，各分量分别参与层叠；省略分量通常回到初始值。

```css
.card {
  margin-left: 24px;
  margin: 8px;
}
```

左外边距为 8px；交换两条声明后，左边为 24px，其他边仍为 8px。

同样，后写 `background: url("paper.png")` 会把先前的 background-color 重置为 transparent。简写没有额外“权重”，关键在于它声明了哪些长写分量。

## @property 的 syntax：为自定义属性声明类型

内置属性的取值由规范规定；自定义属性可通过 syntax 注册取值语法。它是字符串，类型名放在尖括号内：

```css
@property --offset {
  syntax: "<length-percentage>";
  inherits: false;
  initial-value: 0px;
}

.card {
  --offset: calc(10% + 8px);
  margin-left: var(--offset);
}
```

### 支持的类型与对应值

| syntax 类型 | 值示例 | 区别 |
| --- | --- | --- |
| `<number>`、`<integer>` | 0.5、2 | 整数是更窄的数值范围 |
| `<length>` | 12px、2em | 不接受非零百分比 |
| `<percentage>` | 50% | 百分比不直接变为长度 |
| `<length-percentage>` | 12px、50%、calc(50% - 8px) | 允许长度、百分比及其混合运算 |
| `<color>` | teal、rgb(20 80 140) | 颜色值 |
| `<angle>`、`<time>`、`<resolution>` | 30deg、200ms、2dppx | 角度、时间、分辨率 |
| `<image>`、`<url>` | linear-gradient(red, blue)、url("paper.png") | 渐变是图像，不是 URL |
| `<transform-function>` | translateX(10px) | 单个变换函数 |
| `<transform-list>` | translateX(10px) rotate(30deg) | 空格分隔的变换函数列表 |
| `<custom-ident>` | compact | 自定义标识符，不是引号字符串；有保留字限制 |

这些是注册语法支持的类型，不能把规范中的任意类型名直接写入 syntax。例如 `<string>`、`<boolean>`、`<length [0,∞]>` 不属于这里支持的类型名称。

### 组合、列表与关键字

| syntax 字符串                | 接受什么                   | 值示例                             |
| ---------------------------- | -------------------------- | ---------------------------------- |
| `"<length> \| <percentage>"` | 长度或百分比               | 12px 或 50%，不接受两者的混合 calc |
| `"<length>+"`                | 一个或多个空格分隔的长度   | 8px 16px                           |
| `"<color>#"`                 | 一个或多个逗号分隔的颜色   | red, blue                          |
| `"compact \| comfortable"`   | 指定关键字之一             | compact                            |
| `"*"`                        | 通用语法，不限制为某个类型 | token 序列                         |

`<length-percentage>` 不等于 `<length> | <percentage>`：前者支持两种维度的混合 calc，后者只允许值符合某一个分支。

`syntax` 不是完整的 CSS 值定义语法，不接受 `&&`、`||`、`?`、`{m,n}`；星号必须单独使用，transform-list 不能再加列表乘数。固定关键字区分大小写，全局关键字由默认化规则处理。

类型检查发生在计算值阶段；目标属性仍有自己的语法。例如注册属性允许百分比，不代表引用它的所有属性都允许百分比。完整语法见 [Properties and Values API 1](https://www.w3.org/TR/css-properties-values-api-1/#syntax-strings)，初始值与继承设置见[自定义属性](./custom-properties.md)。

## 查阅属性定义时，按问题找信息

以 width 为例：

| 定义字段       | 用它排查什么                                                               |
| -------------- | -------------------------------------------------------------------------- |
| Value          | 写下的值是否在允许语法内？例如 width 不能接受颜色                          |
| Applies to     | 目标是否属于属性适用对象？例如普通非替换 inline 不按普通块的规则使用 width |
| Percentages    | 百分比相对谁？width 通常相对包含块宽度                                     |
| Initial        | 初始值是什么？width 的初始值是 auto                                        |
| Inherited      | 是否默认继承？width 默认不继承                                             |
| Computed value | 哪些信息在计算阶段解析，哪些还会保留？width 的百分比可保留至布局求解       |

覆盖规则见[声明优先级](./cascade.md)，继承与重置见[默认值与回退](./defaulting.md)，计算与布局见[值处理阶段](./processing.md)。
