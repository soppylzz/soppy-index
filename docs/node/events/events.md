# EventEmitter：同步分发与错误通道

[本组导航](../async/README.md) · [实验走查](../async/index.md)

EventEmitter是进程内事件机制，不是DOM冒泡模型或跨线程通信。emit按注册顺序同步调用监听器，返回是否存在相应监听器；它不等待async listener返回的Promise，也不以监听器返回值表达业务成功。

on持续订阅，once一次后移除，off需要同一个函数引用。所有权明确的局部emitter可集中dispose；对共享emitter不要随意removeAllListeners删除别人的订阅。默认监听数警告是泄漏线索，不是硬容量上限，也可能是合法扇出，先查生命周期再调阈值。

error事件无监听通常会抛出。captureRejections可把async listener拒绝导向错误处理，但不是自动吞错；error监听器本身不应再返回未处理拒绝。events.once的Promise应在可能同步emit之前建立，否则事件可能已错过。

源码 [v22.18 lib/events.js](https://github.com/nodejs/node/blob/v22.18.0/lib/events.js) 中emit同步调用handler，并在启用捕获时处理返回的thenable；不要用“基于事件驱动”推断emit自动异步。Promise适合一次结果，Stream适合有背压的数据序列。

## 把 `emit` 看成一次同步调用

执行 `emit("task")` 时，监听器按注册顺序在当前调用栈运行；若监听器是 `async` 函数，它很快返回一个 Promise，`emit` 不会等待这个 Promise 完成。该 Promise 后续拒绝时，需要独立错误路径。本例启用 `captureRejections` 并先订阅 `error`，因此拒绝能被明确接住。

## 对应源码与实验

以下片段来自 [index.ts](../async/index.ts) 或同目录辅助文件；完整断言和清理路径见源码。

```ts
const emitter = new EventEmitter({ captureRejections: true })
const failure = once(emitter, "error")
emitter.on("task", async () => {
  throw new Error("Expected task rejection")
})
emitter.emit("task")
const [error] = await failure
```

先注册error等待再emit，实际观察拒绝而不制造全局未处理异常。前一个message实验用数组精确检查同步分发，不用定时器伪造事件。

## 依据与版本

以 [Node 22.18 官方 events 文档](https://nodejs.org/download/release/v22.18.0/docs/api/events.html) 核对 API 合约；实际输出与运行环境需在执行时核对。
