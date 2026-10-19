# Vue 3：一个原生监听如何执行多个处理函数

以下分析固定到 Vue **3.5.22** 的 [runtime-dom events.ts](https://github.com/vuejs/core/blob/v3.5.22/packages/runtime-dom/src/modules/events.ts)，属于框架实现，不是 DOM 标准要求。本文是原生事件知识的框架延伸，不能反推所有框架采用相同实现。

Vue 并非“每个 DOM 元素只绑定一个事件”。`patchEvent()` 按元素与 rawName 缓存 invoker，例如 onClick 与 onClickCapture 是不同键。`parseName()` 将后缀转换为 capture、once、passive 等原生选项；首次注册时把 invoker 交给 addEventListener，处理函数保存在 invoker.value。相同键的处理函数更新时修改 value，删除时移除对应 invoker。

invoker.value 可以是函数数组，例如渲染函数中的 `h("button", { onClick: [first, second] })`。浏览器只调用这一项原生监听，数组内各函数由 Vue 调用。可以用下面的普通数组调用理解问题；这是反例示意，省略 button 的创建、日志实现与监听清理：

```js
const first = (event) => event.stopImmediatePropagation()
const second = () => console.log("Second handler")
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

Vue 的 [patchEvents 测试](https://github.com/vuejs/core/blob/v3.5.22/packages/runtime-dom/__tests__/patchEvents.spec.ts)覆盖了函数更新、数组处理函数及 immediate 停止后续函数。表格是根据固定版本实现推导的行为，不是新执行的框架测试。

模板 `.stop` 走的是 [vOn.ts 的 withModifiers](https://github.com/vuejs/core/blob/v3.5.22/packages/runtime-dom/src/directives/vOn.ts)，其 stop guard 调用 stopPropagation；它不会自动获得 immediate 的数组停止效果。需要后者时在处理函数中显式调用 event.stopImmediatePropagation。这里讲的是原生元素的事件，组件 emit 的分发契约要另行分析。
