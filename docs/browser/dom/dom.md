# DOM：从文档树到页面状态

为什么查询到的列表有时会随页面变化，有时不会？为什么 input 的 attribute 已经更新，输入框仍显示旧值？DOM 不只是一份 HTML 字符串：它是可修改的节点树，节点对象还维护着当前状态。

## 节点树与元素树

Document、Element、Text 和 Comment 都是 Node。Element 是其中一种，childNodes 包括文本与注释，children 只包括元素；HTML 中的空白也可能成为文本节点，所以 firstChild 不一定是首个元素。attribute 是元素上的命名属性，不是普通子节点。[DOM 节点模型](https://dom.spec.whatwg.org/#nodes)

```js
const container = document.createElement("div")
container.append("Hello ", document.createElement("strong"))
console.log(container.childNodes.length) // 2
console.log(container.children.length) // 1
console.log(container.firstChild.nodeType === Node.TEXT_NODE) // true
```

修改树并不等于立刻在屏幕上完成绘制；没有插入文档的节点也可以被查询和修改。布局与绘制的后续工作见[渲染流程](../rendering/rendering.md)。

## 查询得到的是节点，还是会更新的集合

| API | 返回结果 | 使用边界 |
| --- | --- | --- |
| getElementById | 元素或 null | 按 ID 字符串匹配 |
| querySelector | 首个匹配元素或 null | 无效 CSS 选择器会抛 SyntaxError |
| querySelectorAll | 静态 NodeList | 成员来自查询时刻，节点本身仍可变化 |
| getElementsByClassName / getElementsByTagName | 动态 HTMLCollection | 成员随树变化更新 |
| childNodes / children | 动态节点 / 元素集合 | 两者包含的节点类型不同 |

```js
const list = document.createElement("ul")
list.innerHTML = '<li class="item">First</li>'
const fixed = list.querySelectorAll(".item")
const live = list.getElementsByClassName("item")

const item = document.createElement("li")
item.className = "item"
list.append(item)
console.log(fixed.length, live.length) // 1, 2
fixed[0].textContent = "Updated"
console.log(live[0].textContent) // Updated
```

静态集合只是不重新计算成员，不会冻结节点。NodeList 也不天然是静态集合，childNodes 就是反例。遍历动态集合时删除节点可能导致索引移动、漏掉成员；需要稳定成员列表时，先 Array.from，再逐个 remove。[DOM 集合](https://dom.spec.whatwg.org/#old-style-collections)

## 插入、移动与复制

append 插入已有节点时会移动节点，而不是复制。cloneNode(true) 复制节点及其后代结构，但不会复制通过 addEventListener 注册的监听器；复制 id 还可能导致文档中出现重复标识。

DocumentFragment 用于临时组织节点；插入时移动其子节点，不会额外增加包装元素。template.content 提供模板内容，可克隆后填充字段：

```js
const template = document.createElement("template")
template.innerHTML = '<li><span class="name"></span></li>'
const list = document.createElement("ul")
const fragment = template.content.cloneNode(true)
fragment.querySelector(".name").textContent = "Ada"
list.append(fragment)
console.log(fragment.childNodes.length, list.children.length) // 0, 1
```

这里 innerHTML 只处理固定可信模板，动态文本通过 textContent 写入。fragment 的价值是组织节点，不能据此保证所有场景都更快。节点变化通知见 [MutationObserver](../observer/observer.md)，组件模板与 slot 见 [Web Components](../web-components/web-components.md)。

## attribute 与 property：默认值不等于当前值

attribute 属于标记和序列化层，property 是 JavaScript 对象接口上的值。是否互相反射取决于具体属性；例如 disabled 是布尔 attribute，只要存在就表示启用禁用状态，`disabled="false"` 仍然是禁用。

对于普通文本输入框，value attribute 表示默认值，defaultValue 反射该默认值，value property 表示当前内容。用户输入或为 value 赋值后，当前值进入 dirty 状态，再修改默认值不会自动覆盖当前值：

```js
const form = document.createElement("form")
const input = document.createElement("input")
form.append(input)
input.defaultValue = "Initial"
input.value = "Edited"
input.setAttribute("value", "New default")
console.log(input.defaultValue, input.value) // New default, Edited
form.reset()
console.log(input.value) // New default
```

reset 恢复默认状态。checked / defaultChecked 也区分当前与默认值，但不能把所有 property 都归纳成相同规则。[HTML input 状态与重置](https://html.spec.whatwg.org/multipage/input.html#the-input-element)

## 文本与 HTML：选择决定解析方式

| API         | 含义                         | 重要边界                                     |
| ----------- | ---------------------------- | -------------------------------------------- |
| textContent | 读取节点文本；赋值替换子内容 | 不把输入字符串解析成 HTML                    |
| innerHTML   | 解析或序列化 HTML            | 不可信内容必须经过适当清洗与安全策略         |
| innerText   | 读取与呈现有关的文本         | 受样式、换行和渲染状态影响，可能需要更新布局 |

展示用户输入时优先使用 textContent：输入中的 `<b>` 会成为文本，不会创建 b 元素。确实需要接收富文本时，不能仅靠替换几个字符就宣称安全。

innerText 也不是统一的“去掉隐藏节点的 textContent”；未渲染元素有特定读取规则。[HTML innerText](https://html.spec.whatwg.org/multipage/dom.html#the-innertext-idl-attribute)

节点存在、样式声明和实际几何是三个层次。下一步可阅读[样式与几何读取](./geometry.md)，理解为什么尺寸不能仅从 DOM 属性推断。

事件传播见 [DOM 事件](./dom-events.md)，尺寸与坐标见[样式与几何读取](./geometry.md)。框架如何复用原生监听可继续读 [Vue invoker](./supplement/vue-event-invoker.md)。
