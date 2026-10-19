# EventEmitter：同步通知与异步错误分开处理

`emit()` 调用了一个 async 监听器，是否意味着它会等待任务完成？不会。EventEmitter 是进程内的同步通知机制，监听器返回 Promise 并不会把 emit 变成异步确认协议。

## 从一次分发追踪两个错误通道

下面的独立示例保留了 [index.ts](index.ts) 的关键顺序：先建立监听和错误等待，再发出事件。

```js
import { EventEmitter, once } from "node:events"

const emitter = new EventEmitter({ captureRejections: true })
const failure = once(emitter, "error")
const onTask = async () => {
  console.log("listener")
  throw new Error("Expected task rejection")
}

emitter.on("task", onTask)
console.log("before-emit")
emitter.emit("task")
console.log("after-emit")

const [error] = await failure
console.log(error.message)
emitter.off("task", onTask)
```

`listener` 出现在 before/after 之间，因为 emit 在当前调用栈内按注册顺序调用监听器。async 函数随后产生的拒绝则进入另一个时间点：这里启用 `captureRejections`，并通过 error 监听接住。emit 的 boolean 返回值只表示是否有对应监听器，监听器返回值不代表业务成功。

没有 error 监听器时发出 error 通常会抛错。`captureRejections` 负责转送拒绝，不负责吞错；error 监听器自身也不应再产生无人处理的拒绝。`events.once()` 应在可能同步 emit 之前建立，否则会错过事件。

## 订阅必须有明确所有者

`on` 持续订阅，`once` 在一次调用后移除，`off` 需要原函数引用。示例的 emitter 只归本实验所有，源码可以在结束时 `removeAllListeners()`；共享 emitter 应只解除自己建立的订阅。

监听数警告提示可能泄漏，不是硬容量上限。先检查重复订阅与生命周期，再考虑合法扇出是否需要调整阈值。它没有 DOM 冒泡或跨线程消息语义；一次结果可用 Promise，有背压的数据序列应使用 Stream。

依据：[Node 22.18 events](https://nodejs.org/download/release/v22.18.0/docs/api/events.html)。
