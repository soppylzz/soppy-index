# Node 事件循环：先固定入口，再推导顺序

相同的 `nextTick` 和 Promise 注册代码，放在 CJS 与 ESM 顶层可能得到不同顺序。原因不在 API 名字，而在这段代码进入了哪个执行上下文。

## 普通回调边界与 ESM 顶层

当前 JavaScript 先执行完。在普通 Node 回调边界，通常先清空 `process.nextTick` 队列，再处理 V8 的 Promise/`queueMicrotask` 队列。`nextTick` 不是 libuv 的一个阶段；Promise 与 `queueMicrotask` 也不是两种固定优先级，它们按微任务入队关系执行。

ESM 顶层的模块求值已处在异步求值上下文中，因此不能机械套用“nextTick 总是先于 Promise”。将下面的独立示例分别保存为 `.cjs` 与 `.mjs`，用 Node 22.18 及以上版本直接运行：

```js
console.log("sync")
process.nextTick(() => console.log("nextTick"))
Promise.resolve().then(() => console.log("promise"))
queueMicrotask(() => console.log("microtask"))
```

本实验检查 CJS 顺序为 `sync → nextTick → promise → microtask`，ESM 为 `sync → promise → microtask → nextTick`。微任务执行期间新增的 nextTick 不会打断正在排空的微任务队列。递归补充任一种队列都可能延迟 I/O，微任务不能代替把计算移到 Worker。

## Timer 与 Immediate：注册位置改变条件

libuv 的循环可用 timers、pending callbacks、poll、check、close callbacks 等阶段理解；`setImmediate` 在 check 阶段运行。Node 20 随 libuv 1.45 调整了 timer 的运行时机，分析旧输出时要保留版本条件。

顶层 `setTimeout(fn, 0)` 与 `setImmediate(fn)` 不保证固定先后。配套的 [queue.cjs](queue.cjs) 和 [queue.mjs](queue.mjs)还在真实 `readFile` 回调内注册两者：这一上下文中，Immediate 先到 check，timer 等后续机会。Timer 的 delay 是运行资格的阈值，不能抢占当前同步代码，也不承诺准时执行。

两个不同 I/O、顶层 timer 与读取完成之间没有因此建立全局顺序。面试时先说入口格式、注册位置与必须成立的局部关系，再给可能的完整输出。

## 实验检查什么

[index.ts](index.ts) 分别启动原生 CJS/ESM 子进程，检查顶层队列顺序和 I/O 内的 Immediate/timer 关系，并打印真实 trace。在已 `await` 的 ESM 中动态执行一段 CJS 文本，不能替代这个独立入口对照。

依据：[Node 22.18：nextTick 与 queueMicrotask](https://nodejs.org/download/release/v22.18.0/docs/api/process.html#when-to-use-queuemicrotask-vs-processnexttick)、[Node 事件循环与 timer](https://nodejs.org/en/learn/asynchronous-work/event-loop-timers-and-nexttick)。浏览器还有渲染机会，见[浏览器事件循环](../../browser/event-loop/event-loop.md)。
