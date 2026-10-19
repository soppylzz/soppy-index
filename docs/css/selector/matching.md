# 选择器：从匹配条件到 specificity 比较

先确定规则匹配谁，再比较声明优先级。本文介绍匹配条件、组合关系与 specificity；完整层叠顺序见[声明优先级](../properties/cascade.md)。

## 单个选择器提供什么匹配条件

```html
<section id="profile" class="card featured" data-state="ready">
  <h2 class="title">Profile</h2>
  <p class="description">A short introduction.</p>
</section>
```

| 选择器               | 条件                  | 在上面的结构中匹配谁       |
| -------------------- | --------------------- | -------------------------- |
| section              | 元素类型为 section    | 外层 section               |
| #profile             | ID 为 profile         | 外层 section               |
| .card                | class 列表中包含 card | 外层 section               |
| [data-state]         | 存在这个属性          | 外层 section               |
| [data-state="ready"] | 属性值符合指定值      | 外层 section               |
| *                    | 任意元素              | 包括 section、h2、p 等元素 |

### 属性值的精确、词项与子串匹配

| 选择器                | 含义                        | 适合表达什么         |
| --------------------- | --------------------------- | -------------------- |
| [data-kind="primary"] | 完整值相等                  | 精确状态             |
| [class~="notice"]     | 空白分隔的词项中包含 notice | 一个独立 class 词项  |
| [lang\|="en"]         | 值为 en，或以 en- 开头      | en、en-US 等语言标记 |
| [href^="https://"]    | 指定前缀                    | URL 文本前缀         |
| [href$=".pdf"]        | 指定后缀                    | 字符串以 .pdf 结尾   |
| [data-name*="card"]   | 包含指定子串                | 任意位置的子串       |

`[href$=".pdf"]` 只检查字符串后缀：report.pdf?download=1 不匹配，匹配也不能证明资源是 PDF。

`[data-state="ready" i]` 显式忽略 ASCII 大小写；未指定时，大小写规则取决于属性和文档语言，见 [Selectors 3](https://www.w3.org/TR/selectors-3/#attribute-selectors)。

## 多个条件怎样组合

### 不加组合符：同一个元素同时满足条件

复合选择器把条件加在同一元素上：`.card.featured` 要求同时具有两个类，`section.card[data-state="ready"]` 要求同时符合类型、类与属性条件。

本例没有元素匹配 `.card.title`：它不是“card 里的 title”。Class 按空白分隔的词项匹配，不按任意子串匹配。

### 使用组合符：目标元素还需满足关系

```html
<article class="card">
  <h2 class="title">Direct title</h2>
  <div class="body">
    <h3 class="title">Nested title</h3>
  </div>
  <p class="summary">Summary</p>
  <p class="note">First note</p>
  <span>Separator</span>
  <p class="note">Second note</p>
</article>
```

| 选择器           | 关系要求                        | 匹配结果    |
| ---------------- | ------------------------------- | ----------- |
| .card .title     | title 元素拥有 card 祖先        | h2 和 h3    |
| .card > .title   | title 的直接父元素为 card       | 只有 h2     |
| .summary + .note | note 的前一个元素兄弟为 summary | 第一个 note |
| .summary ~ .note | note 前面存在 summary 元素兄弟  | 两个 note   |

目标是右侧元素：`.summary + .note` 匹配 note。`+`、`~` 要求相同父元素；空白文本和注释不打断相邻关系，span 会打断。

可从目标向外验证：h3 的直接父元素是 div.body，不是 card，因此不匹配 `.card > .title`。这只是阅读方法，不是浏览器必须采用的执行算法。定义见 [Selectors 3 的组合符](https://www.w3.org/TR/selectors-3/#combinators)。

### 使用逗号：任一分支匹配即可

```css
.card .title,
.subtitle {
  color: teal;
}
```

第二分支匹配所有 subtitle，不共享 card 前缀。若都要求位于 card 内，写 `.card .title, .card .subtitle` 或 `.card :is(.title, .subtitle)`。

普通列表中的无效选择器会使整条规则无效；`:is()`、`:where()` 的参数列表可忽略无效分支，`:not()`、`:has()` 不具备同样的容错规则。匹配含义见[伪类](./pseudo-classes.md)。

## Specificity：匹配之后怎样比较权重

### 先确认进入同一个竞争范围

specificity 在层叠中比较选择器权重，先确定来源、重要性与层等范围。`!important`、@layer 和内联样式的特殊位置不属于三列加分。

### 按三列计数，再从左到右比较

权重写成 `(A, B, C)` 三列，分别计数：

| 列  | 计入的选择器             | 示例                        |
| --- | ------------------------ | --------------------------- |
| A   | ID 选择器                | #profile                    |
| B   | 类、属性选择器与普通伪类 | .card、[data-state]、:hover |
| C   | 类型选择器与伪元素       | section、::before           |

从 A 到 C 比较，第一处不同决定大小，不作十进制进位。通配符与组合符不计权重。

| 选择器                | 权重    | 计数依据                                             |
| --------------------- | ------- | ---------------------------------------------------- |
| *                     | (0,0,0) | 通配符不计数                                         |
| h2                    | (0,0,1) | 一个类型                                             |
| .card > h2.title      | (0,2,1) | 两个 class、一个类型                                 |
| [id="profile"] .title | (0,2,0) | 一个属性选择器、一个 class；属性名是 id 也不会计入 A |
| #profile .title       | (1,1,0) | 一个 ID、一个 class                                  |
| .card:hover::before   | (0,2,1) | 一个 class、一个伪类、一个伪元素                     |

### 用同一个目标元素推导胜负

```html
<section id="profile" class="card">
  <h2 class="title">A shared target.</h2>
</section>
```

```css
#profile .title {
  color: red;
}
.card > h2.title {
  color: blue;
}
```

同一未分层普通作者样式下，h2 为红色：`(1,1,0)` 在第一列胜过 `(0,2,1)`。

权重相同，再看作用域邻近性（适用 @scope 时），最后看声明出现顺序。HTML 的 class 名顺序不影响胜负。

### 函数参数与逗号列表怎样计入权重

| 写法 | 计算规则 | 示例结果 |
| --- | --- | --- |
| :where(...) | 函数及参数整体为零 | :where(#profile, .card) 为 (0,0,0) |
| :is(...)、:not(...)、:has(...) | 函数自身不另加伪类权重，取参数列表最高权重 | :is(.card, #profile) 为 (1,0,0) |
| :nth-child(... of S)、:nth-last-child(... of S) | 伪类自身加 (0,1,0)，再加 S 列表最高权重 | :nth-child(2 of .card) 为 (0,2,0) |

参数取最高值而非求和：`:is(.title, #unused)` 即使通过 .title 匹配，也是 `(1,0,0)`。外部条件仍累加：`.card :where(h2.title)` 为 `(0,1,0)`。定义见 [Selectors 4 的 specificity 计算](https://www.w3.org/TR/selectors-4/#specificity-rules)。

普通逗号列表只在匹配的分支中取最高权重：`.title, #unused` 若仅 .title 匹配，权重为 `(0,1,0)`，不同于 :is()。

## 匹配的边界：继承不等于命中规则

`.card { color: teal; }` 只匹配 card，后代变色可能来自继承。普通后代选择器也不会穿透 Shadow DOM，见 [Web Components](../../browser/web-components/web-components.md)。

选择器性能需根据样式重算证据判断，不能仅凭长度或嵌套层数下结论。
