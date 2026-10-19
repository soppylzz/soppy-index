# DOM 事件：传播路径与默认行为

点击列表中按钮内部的图标，为什么列表监听器也会执行，event.target 却不是按钮？浏览器先确定事件路径，再按阶段调用监听器；监听发生的位置与事件目标是两件事。

## 一次事件怎样经过节点树

事件分发包含捕获、目标和冒泡阶段。祖先捕获监听先运行；到达目标后运行目标上的捕获与非捕获监听；若 bubbles 为 true，再调用祖先冒泡监听。路径也可能经过 Document、Window 和 ShadowRoot，不只是普通元素链。

下面创建父子节点，用脚本事件演示传播顺序：

```js
const outer = document.createElement("div")
const button = document.createElement("button")
outer.append(button)
const order = []
outer.addEventListener("click", () => order.push("outer capture"), true)
button.addEventListener("click", () => order.push("target capture"), true)
button.addEventListener("click", () => order.push("target bubble"))
outer.addEventListener("click", () => order.push("outer bubble"))
button.dispatchEvent(new MouseEvent("click", { bubbles: true }))
console.log(order)
```

预期依次为 outer capture、target capture、target bubble、outer bubble。在目标节点上，两类监听的 eventPhase 都是 AT_TARGET；“目标冒泡监听”并不表示此时已进入祖先冒泡阶段。非冒泡事件也可以被祖先捕获监听观察。[DOM 事件分发](https://dom.spec.whatwg.org/#concept-event-dispatch)

| 字段           | 含义                         | 注意                                       |
| -------------- | ---------------------------- | ------------------------------------------ |
| target         | 当前监听上下文看到的事件目标 | Shadow DOM 可能重定向目标                  |
| currentTarget  | 正在执行监听器的对象         | 回调结束后会重置，异步使用前应保存所需引用 |
| eventPhase     | 当前所处阶段                 | 目标捕获监听也属于 AT_TARGET               |
| composedPath() | 当前可见的事件路径           | closed shadow root 会隐藏部分内部路径      |

## 停止传播与取消默认行为

| 方法 | 改变什么 | 不会自动做什么 |
| --- | --- | --- |
| stopPropagation() | 阻止继续传播到其他节点 | 不停止当前监听调用中的后续监听器，不取消默认行为 |
| stopImmediatePropagation() | 同时阻止后续监听器 | 不取消默认行为，不中断当前函数剩余语句 |
| preventDefault() | 在事件可取消、监听非 passive 时取消默认行为 | 不停止传播 |

例如在目标的非捕获监听 A 中调用 stopPropagation，同节点非捕获监听 B 仍可执行，祖先冒泡监听不再运行。换成 stopImmediatePropagation，B 也不执行；若在祖先捕获阶段就停止，目标可能根本收不到事件，不能套用前一个顺序。

下面通过链接说明默认行为与传播的区别。将 link 插入页面后点击，会执行监听但不跳转：

```js
const link = document.createElement("a")
link.href = "https://example.com/"
link.textContent = "Open example"
link.addEventListener("click", (event) => {
  event.preventDefault()
  console.log(event.defaultPrevented) // true
})
document.body.append(link)
```

取消默认行为不表示业务已经成功。不可取消事件上 preventDefault 无效，passive 监听中也无法取消默认行为。[DOM 取消规则](https://dom.spec.whatwg.org/#dom-event-preventdefault)

## 动态列表为什么适合事件委托

委托把监听放在稳定祖先上，通过冒泡找到命中项。target 可能是按钮内部的 span，因此先 closest，再检查容器范围：

```js
const list = document.createElement("div")
list.innerHTML = '<button data-id="42"><span>Choose</span></button>'
list.addEventListener("click", (event) => {
  if (!(event.target instanceof Element)) return
  const button = event.target.closest("button[data-id]")
  if (!button || !list.contains(button)) return
  console.log("Selected", button.dataset.id)
})
document.body.append(list)
```

之后新增的按钮无需逐个注册监听。嵌套列表仍需限制所属边界；子节点停止传播、事件不冒泡、Shadow DOM 重定向都可能影响简单委托。

focus / blur 不冒泡，可以用祖先捕获监听观察焦点，也可以按需求监听可冒泡的 focusin / focusout。mouseenter / mouseleave 与 mouseover / mouseout 的传播语义也不同，不能仅因事件名相似就替换。[UI Events 事件类型](https://www.w3.org/TR/uievents/#events-focusevent)

## 监听选项决定阶段与生命周期

capture 选择阶段，once 使监听最多调用一次，passive 声明不取消默认行为，signal 支持集中清理。部分滚动事件在特定目标上可能默认 passive，需要取消时应明确选项，并考虑滚动性能。

同一 target、type、callback 对象与 capture 不会重复注册；每次创建匿名函数则是不同 callback。再次注册相同监听但改变 passive，不会更新原监听配置，应先移除再注册。removeEventListener 要匹配 callback 和 capture，不要求传入同一个 options 对象。[DOM 监听器规则](https://dom.spec.whatwg.org/#dom-eventtarget-addeventlistener)

```js
const button = document.createElement("button")
const controller = new AbortController()
function handleClick() {
  console.log("Clicked")
}
button.addEventListener("click", handleClick, { signal: controller.signal })

function dispose() {
  controller.abort()
}
```

组件卸载或一组交互结束时调用 dispose，避免重复连接叠加监听。使用 once 也不等于可以忽略其他长期监听或关联定时器的清理。

## dispatchEvent 是同步调用，可信标记不是授权

```js
const target = new EventTarget()
target.addEventListener("save", (event) => {
  console.log("Listener")
  event.preventDefault()
})
console.log("Before dispatch")
const accepted = target.dispatchEvent(new Event("save", { cancelable: true }))
console.log("After dispatch", accepted) // false
```

监听器在 dispatchEvent 返回前同步执行；false 表示可取消事件已被取消，不是业务返回值。new Event / MouseEvent 默认不会自动启用 bubbles、cancelable 等标记，应按需求明确设置。

脚本创建的事件 isTrusted=false；浏览器派发的事件可为 true，但不能据此认定来自物理鼠标，更不能把它当作业务授权。脚本派发不能通用地获得用户激活或绕过受限 API。[DOM dispatchEvent 与 isTrusted](https://dom.spec.whatwg.org/#dom-eventtarget-dispatchevent)

Shadow DOM 的 composed 与 retargeting 见 [Web Components](../web-components/web-components.md)，iframe 有独立的文档事件路径，见 [iframe](../iframe/iframe.md)。框架还可能在一个原生监听内部调用多个函数；固定版本分析见 [Vue invoker 补充](./supplement/vue-event-invoker.md)，不要把它混入原生传播规则。
