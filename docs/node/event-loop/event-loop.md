# Node 事件循环与微任务上下文

[本组导航](../runtime/README.md) · [实验走查](../runtime/index.md)

libuv 可概括为 timers、pending callbacks、poll、check、close callbacks 等阶段；check 执行 setImmediate。Node20起随 libuv 调整 timer 运行时机，解释顺序时必须注明版本和注册位置。

nextTick 队列不是 libuv 阶段。普通 native 回调返回到 Node 边界后，通常先处理 nextTick，再处理 V8 Promise/queueMicrotask；递归填队列会饿死I/O。但 ESM 顶层执行本身已处于模块异步求值/微任务上下文，不能套“所有场景 nextTick 总在 Promise 前”。

本例在 CJS 顶层得到 sync、nextTick、promise、microtask；ESM 顶层得到 sync、promise、microtask、nextTick。微任务内继续注册 nextTick 也不能打断正在清空的微任务队列。Promise和queueMicrotask之间按加入同一队列的先后，而不是两个固定优先级。

顶层 setTimeout(0) 与 immediate 不固定排序；在本例真实 readFile 回调里创建两者，immediate 先到 check，再到下一 timer 机会。delay是阈值，不是准时承诺。不同 readFile、顶层 timer 与其他I/O彼此不构成固定全序。

源码可沿 [v22.18 task_queues.js](https://github.com/nodejs/node/blob/v22.18.0/lib/internal/process/task_queues.js) 的 processTicksAndRejections / runMicrotasks 看队列排空边界；这解释普通回调路径，不应忽略模块加载器的外层执行上下文。浏览器的渲染机会另见 [浏览器事件循环](../../browser/event-loop/event-loop.md)。

## 从注册位置推导顺序

先固定“谁注册了回调”。同步代码先执行，`nextTick` 与 Promise 回调要等当前执行上下文让出；之后才轮到相应的事件循环机会。在普通 CJS 顶层示例中，`nextTick` 先于 Promise 微任务；ESM 顶层已经处于模块求值的微任务上下文，示例顺序会不同。结论必须连同执行入口一起说。

再固定“在哪里注册 timer”。顶层 `setTimeout(0)` 和 `setImmediate` 会受进入循环时机影响；在本例的 I/O 回调里，check 阶段的 Immediate 先于下一次 timer 机会。这里的“先”是这个受控场景的预测，不是给所有异步回调排一个全局队列。

## 对应源码与实验

以下片段来自 [index.ts](../runtime/index.ts) 或同目录辅助文件；完整断言和清理路径见源码。

```ts
process.nextTick(() => record("top", "nextTick"))
Promise.resolve().then(() => record("top", "promise"))
queueMicrotask(() => record("top", "microtask"))
setTimeout(() => record("top", "timer"), 0)
setImmediate(() => record("top", "immediate"))
```

关键控制是将相同注册逻辑放入 queue.cjs 与 queue.mjs 并独立启动；在一个已 await 的模块里动态 require 一段代码，不能替代原生 CJS 顶层对照。完整脚本还执行真实文件I/O。

## 依据与版本

以 [Node 22.18 官方 process 文档](https://nodejs.org/download/release/v22.18.0/docs/api/process.html) 核对 API 合约；实际输出与运行环境需在执行时核对。
