# 伪类：按结构、状态和关系匹配元素

伪类按结构、状态或关系筛选元素，不创建 DOM 节点。

## 结构计数：先确定计数集合，再判断位置

```html
<div class="content">
  <h2>Heading</h2>
  <p id="first" class="note">First paragraph</p>
  <p id="second">Second paragraph</p>
  <p id="third" class="note">Third paragraph</p>
</div>
```

| 选择器                 | 怎样计数                               | 匹配结果 |
| ---------------------- | -------------------------------------- | -------- |
| p:first-child          | 在全部元素子节点中排第一，且为 p       | 无       |
| p:first-of-type        | 在同类型兄弟中是第一个 p               | first    |
| p:nth-child(2)         | 在全部元素子节点中排第二，且为 p       | first    |
| p:nth-of-type(2)       | 在 p 类型兄弟中排第二                  | second   |
| .note:nth-child(2)     | 排全部元素子节点的第二位，且有 note 类 | first    |
| :nth-child(2 of .note) | 先筛选 note，再取第二个                | third    |

Of-type 按标签类型计数，不按类名；`.note:nth-of-type(2)` 本例无匹配项，第二个 note 应写 `:nth-child(2 of .note)`。

计数从 1 开始，换行和注释不占元素序号。`:nth-child(An+B)` 用非负整数 n 生成位置，例如 2n 对应 2、4、6，2n+1 对应 1、3、5，-n+3 对应前三个位置。`:nth-last-child()` 从后面计数；`:only-child` 要求没有其他元素兄弟，`:only-of-type` 则允许存在其他类型兄弟。

`p:nth-child(-n+3)` 本例只匹配 first、second；前三个 p 则用 `p:nth-of-type(-n+3)`。定义见 [Selectors 3](https://www.w3.org/TR/selectors-3/#structural-pseudos)，of 筛选形式见 [Selectors 4](https://www.w3.org/TR/selectors-4/#the-nth-child-pseudo)。

## 交互状态：伪类与 HTML 属性不是同一层信息

```html
<label class="field">
  <span>Email</span>
  <input type="email" required />
</label>
<label>
  <input class="agreement" type="checkbox" checked />
  <span>I agree</span>
</label>
```

| 伪类           | 匹配条件                                         |
| -------------- | ------------------------------------------------ |
| :hover         | 指针等输入方式使元素处于悬停状态                 |
| :active        | 元素正在被激活，不是持续的选中状态               |
| :focus         | 元素具有输入焦点                                 |
| :focus-visible | 元素有焦点，且浏览器判断需要显示焦点提示         |
| :focus-within  | 自身或后代具有焦点，相关规则包含 Shadow DOM 后代 |
| :checked       | 适用控件的当前勾选或选中状态                     |
| :disabled      | 适用控件处于禁用状态                             |
| :invalid       | 适用元素不满足约束验证规则                       |

取消勾选后，`:checked` 不匹配；若 checked 属性仍保留，`[checked]` 仍匹配。前者看当前状态，后者看内容属性，见 [HTML checked 属性](https://html.spec.whatwg.org/multipage/input.html#attr-input-checked)。

同样，disabled fieldset 内未写 disabled 的控件也可能匹配 `:disabled`。必填 email 为空就可能匹配 `:invalid`，不代表用户已尝试提交。

`:focus-visible` 由浏览器判断，不严格等同键盘操作；文本输入控件被点击后也可能匹配。

```css
.field:focus-within {
  border-color: teal;
}
.field input:focus-visible {
  outline: 2px solid teal;
  outline-offset: 2px;
}
```

第一条强调焦点所在的 field，第二条保留输入框的可见焦点。规则见 [Selectors 4 的焦点提示条件](https://www.w3.org/TR/selectors-4/#the-focus-visible-pseudo)。

## 逻辑伪类：合并条件、排除条件与关系判断

| 伪类     | 匹配含义                                       | 例子                        |
| -------- | ---------------------------------------------- | --------------------------- |
| :is()    | 满足参数中的任意一个选择器                     | .card :is(h2, h3)           |
| :where() | 匹配含义与 is 相同，但函数整体权重为零         | :where(.card, .panel)       |
| :not()   | 不满足参数列表中的任何一个选择器               | button:not(:disabled)       |
| :has()   | 以当前元素为关系锚点，存在匹配相对选择器的目标 | .field:has(> input:invalid) |

```html
<section class="card">
  <h2>With a direct title</h2>
</section>
<section class="card">
  <div><h2>With a nested title</h2></div>
</section>
```

`.card:has(> h2)` 匹配第一张，`.card:has(h2)` 匹配两张；目标均为 card。

`:has()` 不限父子关系：`h2:has(+ p)` 匹配 h2，`h2 + p` 匹配 p。它不能嵌套 :has()，一般也不接受伪元素，见 [Selectors 4 的关系伪类](https://www.w3.org/TR/selectors-4/#relational)。

`.card:not(:has(img))` 表示没有 img 后代；`.card:has(:not(img))` 表示有非 img 后代。含 h2 和 img 的卡片只满足后者。

函数伪类的权重规则见[specificity](./matching.md#specificity匹配之后怎样比较权重)。
