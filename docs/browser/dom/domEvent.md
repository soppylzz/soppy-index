# DOM 事件：路径、默认行为与监听生命周期

[模块导航](./README.md) · [实验走查](./index.md) · [DOM 与 CSSOM](./dom.md)

## 1. 捕获、目标与冒泡

事件按分发路径经过捕获阶段、目标阶段；若 bubbles 为 true，再沿路径冒泡。路径可能包含 Window、Document、祖先、ShadowRoot 等，不应把所有事件简化成从 document 开始的普通元素链。

在目标上，捕获监听与非捕获监听的 eventPhase 都是 AT_TARGET；同类监听一般按注册顺序调用。祖先捕获可以观察不冒泡事件，不能因 bubbles=false 就断言祖先完全收不到。[addEventListener 官方文档](https://developer.mozilla.org/en-US/docs/Web/API/EventTarget/addEventListener)

| 字段           | 含义                                    | 易混淆点                                          |
| -------------- | --------------------------------------- | ------------------------------------------------- |
| target         | 对当前监听上下文呈现的目标              | Shadow DOM 可重定向，不一定是内部最初节点         |
| currentTarget  | 正在执行监听器的 EventTarget            | 监听结束后通常为 null，异步任务应提前保存需要的值 |
| eventPhase     | NONE / CAPTURING / AT_TARGET / BUBBLING | 目标捕获监听仍是目标阶段                          |
| composedPath() | 当前可见的事件路径                      | 受 closed shadow root 边界影响                    |

`/events` 构造 outer → inner → target 层级，分别添加捕获与冒泡监听。以下是核心注册，省略日志、取消选项和清理，完整实现见 [lab.js](./assets/lab.js)。

```js
outer.addEventListener("click", record, { capture: true })
inner.addEventListener("click", record, { capture: true })
target.addEventListener("click", record, { capture: true })
target.addEventListener("click", record)
inner.addEventListener("click", record)
outer.addEventListener("click", record)
```

实际实验在目标上还有 A、B 两个非捕获监听器，用于下一节对照；不把上面精简片段的监听数量当成完整输出。

## 2. 传播控制与默认行为独立

| 操作                     | 效果                                    | 不代表什么                                 |
| ------------------------ | --------------------------------------- | ------------------------------------------ |
| stopPropagation          | 阻止继续传播到其他节点                  | 不阻止当前节点的其他监听器，不取消默认行为 |
| stopImmediatePropagation | 同时阻止当前节点后续监听器              | 不自动取消默认行为                         |
| preventDefault           | 在可取消且非 passive 条件下取消默认行为 | 不停止事件传播                             |

传播控制效果取决于在哪个节点、哪个阶段调用。实验只在 target 的非捕获监听 A 调用：stop 时 B 仍运行而祖先冒泡停止；immediate 时 B 也停止。不要把这个结果套用到祖先捕获阶段。[stopPropagation 文档](https://developer.mozilla.org/en-US/docs/Web/API/Event/stopPropagation)

```js
target.addEventListener("click", (event) => {
  if (prevent) event.preventDefault()
  if (mode === "stop") event.stopPropagation()
  if (mode === "immediate") event.stopImmediatePropagation()
})
target.addEventListener("click", () => log("同节点第二监听器"))
```

该片段的 prevent / mode 来自实验控件，省略监听选项、身份日志和生命周期。preventDefault 对不可取消事件不起作用；passive 监听中调用也不会取消，浏览器可能给出警告。取消后的 defaultPrevented 不代表任何业务已处理成功。

本页还提供独立的链接锚点默认行为：未阻止则 URL hash 改变，阻止则保持原 URL。这个链接监听明确非 passive，避免把目标按钮的 passive 选项混入另一个事件。

### Vue 3：一个原生监听如何执行多个处理函数

以下分析固定到 Vue **3.5.22** 的 [runtime-dom events.ts](https://github.com/vuejs/core/blob/v3.5.22/packages/runtime-dom/src/modules/events.ts)，属于框架实现，不是 DOM 标准要求。仓库 `/events` 仍是原生监听实验，不加载 Vue。

Vue 并非“每个 DOM 元素只绑定一个事件”。`patchEvent()` 按元素与 rawName 缓存 invoker，例如 onClick 与 onClickCapture 是不同键。`parseName()` 将后缀转换为 capture、once、passive 等原生选项；首次注册时把 invoker 交给 addEventListener，处理函数保存在 invoker.value。相同键的处理函数更新时修改 value，删除时移除对应 invoker。

invoker.value 可以是函数数组，例如渲染函数中的 `h("button", { onClick: [first, second] })`。浏览器只调用这一项原生监听，数组内各函数由 Vue 调用。可以用下面的普通数组调用理解问题；这是反例示意，省略 button 的创建、日志实现与监听清理：

```js
const first = (event) => event.stopImmediatePropagation()
const second = () => log("第二个处理函数")
const handlers = [first, second]
button.addEventListener("click", (event) => {
  handlers.forEach((handler) => handler(event))
})
```

这里原生 stopImmediatePropagation 会阻止浏览器调用后续原生监听，但不会中断正在执行的 forEach，因此 second 仍被调用。stopPropagation 同样不会中断函数数组。

Vue 的 `createInvoker()` 在调用处理函数前经过 `patchStopImmediatePropagation()`。当 value 是数组时，该函数包装事件方法：调用原生方法，并设置内部 `_stopped` 标记；同时把每个处理函数包装成“未停止才调用”。下面重写为便于阅读的 JavaScript 示意，保留这种双重控制；省略 invoker 缓存、事件时间戳检查、参数校验、错误处理与移除监听，不是源码原文或通用事件库：

```js
function createArrayInvoker(handlers) {
  return (event) => {
    const nativeImmediateStop = event.stopImmediatePropagation.bind(event)
    event.stopImmediatePropagation = () => {
      nativeImmediateStop()
      event._stopped = true
    }
    const guarded = handlers.map((handler) => () => {
      if (!event._stopped && handler) handler(event)
    })
    guarded.forEach((invoke) => invoke())
  }
}
```

原生方法负责浏览器事件路径，标记负责 invoker 内后续处理函数。`_stopped` 是该版本 Vue 的内部字段，不是 Web API；它也不会终止当前处理函数剩下的语句。停止操作应在同步事件处理中完成，不能指望 await 后再阻止已经执行的其他监听。

假设 A 同步调用停止方法，B 为第二处理函数，N 为之后注册的同节点原生监听，P 为父级冒泡监听；无其他传播控制时，可据上述实现推导：

| A 的操作                 | 分别注册原生 A、B | 单监听内普通数组 A、B | Vue invoker 的 A、B |
| ------------------------ | ----------------- | --------------------- | ------------------- |
| 无停止                   | A → B → N → P     | A → B → N → P         | A → B → N → P       |
| stopPropagation          | A → B → N         | A → B → N             | A → B → N           |
| stopImmediatePropagation | A                 | A → B                 | A                   |

Vue 的 [patchEvents 测试](https://github.com/vuejs/core/blob/v3.5.22/packages/runtime-dom/__tests__/patchEvents.spec.ts)覆盖了函数更新、数组处理函数及 immediate 停止后续函数。表格说明的是上述前提下的行为，不是本仓库 demo 新增的实测项目。

模板 `.stop` 走的是 [vOn.ts 的 withModifiers](https://github.com/vuejs/core/blob/v3.5.22/packages/runtime-dom/src/directives/vOn.ts)，其 stop guard 调用 stopPropagation；它不会自动获得 immediate 的数组停止效果。需要后者时在处理函数中显式调用 event.stopImmediatePropagation。这里讲的是原生元素的事件，组件 emit 的分发契约要另行分析。

## 3. 事件委托与动态节点

委托在稳定祖先监听，利用冒泡查找命中子项。event.target 不一定是按钮，可能是内部 span；closest 后还需限定本容器范围。

```js
list.addEventListener("click", (event) => {
  if (!(event.target instanceof Element)) return
  const button = event.target.closest("button[data-id]")
  if (!button || !list.contains(button)) return
  log(`选择 ${button.dataset.id}`)
})
```

这是 `/events` 动态委托的核心，list 是委托容器。新增按钮无需逐个重新注册监听；嵌套组件和列表应按业务进一步限制所属边界。不可冒泡事件、阻止传播、Shadow 重定向都可能让简单委托失效。

focus / blur 不冒泡，focusin / focusout 可冒泡，也可在祖先使用捕获观察 focus。本实验记录目标 focus 与父级非捕获 focusin；mouseenter / mouseleave 与 mouseover / mouseout 也有类似边界差异，但不在本页扩展成所有指针事件的实测承诺。

## 4. 注册选项与清理

capture 选择阶段；once 最多执行一次；passive 声明不会取消默认行为；signal abort 后移除监听。部分滚动事件在特定浏览器目标上可能默认 passive，不能一概说未指定就总是 false。

同一 target 的 type、同一 callback 对象和 capture 相同不会重复注册；每次新建匿名函数是不同 callback。removeEventListener 需要保留 callback，并匹配 capture；不要求把 passive / once 复制成相同对象。实验通过每次连接的新 AbortController 集中清理，避免重连叠加监听。

```js
const controller = new AbortController()
list.addEventListener("click", handle, { signal: controller.signal })
controller.abort()
```

完整脚本把所有实验控件和目标监听也绑定到当前 signal；断开后目标点击不再产生实验记录，连接与生命周期入口仍保留用于恢复。切换 passive 选项会重连，因为不能通过给相同 listener 再注册不同 passive 来更新其既有配置。

## 5. 可信输入与同步脚本派发

dispatchEvent 同步执行监听器；返回值表示是否被取消，不是业务返回值。new Event / MouseEvent 默认不会自动启用 bubbles、cancelable 等标记，应明确设置。脚本事件 isTrusted=false；浏览器派发事件可为 true，但 true 不能等同于“真实物理鼠标输入”，例如某些浏览器调用和自动化也可产生可信事件，更不是用户权限或业务授权令牌。

```js
const event = new MouseEvent("click", { bubbles: true, cancelable: true })
log("派发前")
const result = target.dispatchEvent(event)
log(`派发后 result=${result} defaultPrevented=${event.defaultPrevented}`)
```

[dispatchEvent 官方文档](https://developer.mozilla.org/en-US/docs/Web/API/EventTarget/dispatchEvent)、[isTrusted 官方文档](https://developer.mozilla.org/en-US/docs/Web/API/Event/isTrusted)分别说明分发与可信标记。

此处有意演示脚本事件，不用它冒充原生输入。页面“同步 dispatchEvent”按钮与真正点击目标形成对照；被动取消时 result 为 true，而有效 preventDefault 时返回 false。派发事件不能通用地获得用户激活，也不能用来绕过受限 API。

Shadow DOM 的 composed 与 retargeting 见 [Web Components](../api/webComponents.md)，iframe 的独立路径见 [iframe](../api/iframe.md)。Vue invoker 是原生监听外的调用封装，不应与所有框架的 synthetic event 一概而论；分析时分别确认浏览器分发和框架内部调用。原生实验的预期与实际观测见 [走查](./index.md)。
