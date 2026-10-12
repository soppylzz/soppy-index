# 选择器：匹配关系与 specificity 分开判断

[模块导航](./README.md) · [层叠](./cascade.md)

选择器先决定规则是否适用，specificity 再参与同一竞争范围内的胜负判断。一个 specificity 很高但不匹配的规则，不会影响目标。[Selectors Level 4](https://www.w3.org/TR/selectors-4/)同时定义匹配与权重计算。

## 1. 关系与结构计数

空格匹配后代，`>` 匹配直接子元素，`+` 匹配紧邻的后续兄弟，`~` 匹配任一符合条件的后续兄弟。它们描述元素关系，不因为格式化代码里有空白文本节点就把元素计数打乱。

`p:nth-child(2)` 先要求这个 p 是父元素的第二个 element child；`p:nth-of-type(2)` 要求它是同类型兄弟中的第二个 p。`:first-child` 不是“第一个该类型元素”，相应需求用 `:first-of-type`。`nth-child(An+B of selector)` 可以先筛选计数集合，但需确认目标浏览器支持。

下面的树包含一个 h3 和两个 p：

```html
<div id="items">
  <h3>标题</h3>
  <p id="item-a">第一个 p</p>
  <p id="item-b">第二个 p</p>
</div>
```

因此 item-a 匹配 `p:nth-child(2)`，item-b 匹配 `p:nth-of-type(2)`；item-b 是第三个元素子节点，也是第二个 p。

## 2. 权重按列比较

用 ID、class/attribute/pseudo-class、type/pseudo-element 三列比较，按左侧到右侧决定大小；不是把这些列当普通十进制数相加。组合符与通配符不增加权重，普通 class 再多也不能“进位”为一个 ID。

`:where()` 整体权重为零；`:is()`、`:not()`、`:has()` 的函数自身不单独加一列，取参数列表最高 specificity。列表里未实际匹配的高权重参数也可能抬高整个函数的权重，不能把参数权重简单求和。

以下三个规则都匹配 id 为 weight、位于 fixture 内的元素：

```css
#fixture :where(#weight) {
  color: red;
}
#fixture [id="weight"] {
  color: green;
}
#fixture :is(#weight, .unused) {
  color: blue;
}
```

三者分别为 `(1,0,0)`、`(1,1,0)`、`(2,0,0)`，处于同一个未分层普通作者样式范围，因此最后一条胜出。这里固定了同一层叠范围；跨层比较要先看[层叠顺序](./cascade.md)。

## 3. 关系状态与伪元素

`:has(input:checked)` 匹配包含已勾选后代控件的元素；样式是否出现还取决于对应规则与层叠结果。`:focus-within` 包含自身或后代焦点；`:focus-visible` 由浏览器依据输入方式等判断，不是简单等于键盘操作。不要仅为去掉默认样式而取消可见焦点。

`::before` / `::after` 可在格式化结构中生成内容与盒，却不会在 DOM childNodes 里插入元素。`getComputedStyle(node, "::before").content` 读取生成内容的计算样式，`childNodes` 只返回 DOM 节点；二者观察的是不同结构。核心业务文字仍使用 HTML；图片等替换元素不能被假定普遍支持同样的 before/after 生成盒行为。

复杂选择器的实现常从候选元素验证关系，但规范定义的是匹配结果，不强制所有浏览器永远用某种从右向左算法。性能判断应基于真实页面测量，不用“选择器越短越快”代替定位大量样式失效的原因。shadow root 的边界与 `::part` 见 [Web Components](../../browser/api/webComponents.md)。
