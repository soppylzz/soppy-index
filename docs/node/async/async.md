# 异步组合、容量与真正取消

[本组导航](./README.md) · [实验走查](./index.md)

callback常用error-first(err,value)，Promise用状态表达一次完成，async/await只改书写方式。promisify适合标准error-first签名和一个主要成功值，多成功参数、this依赖或自定义协议需专门适配。

| 组合       | 何时settle                       | 是否自动取消其他操作 |
| ---------- | -------------------------------- | -------------------- |
| all        | 全成功或首个拒绝                 | 否                   |
| allSettled | 全部settle                       | 否                   |
| race       | 首个settle                       | 否                   |
| any        | 首个成功，或全失败AggregateError | 否                   |

race一个超时Promise只让调用者停止等待，底层fetch/流/查询仍可能运行。把AbortSignal传到底层并处理拒绝，最后清timer；不支持signal的依赖需自己的取消协议。取消后也不能保证远端写入一定没发生，非幂等重试要有幂等键和状态查询。

有界并发要限制“开始执行”的数量，不是把已经启动的一万个Promise分组await。队列/信号量保护连接、内存和下游配额；CPU重任务即使用async函数仍阻塞当前线程。

同步throw、Promise拒绝、callback err与EventEmitter error是不同错误通道。边界失守的unhandledRejection/uncaughtException应记录并进入受控退出，不能默认全局catch后状态仍安全。

## 从六个任务理解“有界”

若先调用六次异步函数，再把六个 Promise 分两组 `await`，六个任务已经开始。真正的上限要放在启动之前：两个消费者各取一个任务，某个任务结束后才取下一个，因此同一时刻最多运行两个。`Promise.all` 负责等待组合结果，本身不负责限制启动数量。

取消也要分两步：先让等待者不再等待，再通知底层操作停止。`race([operation, timeout])` 通常只做到第一步；给支持取消的 API 传 `AbortSignal` 才能要求它中止。中止是本地控制信号，不能据此推断远端已回滚。

## 对应源码与实验

以下片段来自 [index.ts](./index.ts) 或同目录辅助文件；完整断言和清理路径见源码。

```ts
const operation = delay(1000, "late", { signal: controller.signal }).finally(() => {
  cleaned = true
})
const deadline = setTimeout(() => controller.abort(), 10)
try {
  await assert.rejects(operation, { name: "AbortError" })
} finally {
  clearTimeout(deadline)
}
```

这里使用真实node:timers/promises取消，并用断言确认finally执行。10ms是控制期限，不承诺精确在第10ms回调；并发实验完成顺序只是当前观测。

## 依据与版本

以 [Node 22.18 官方 timers 文档](https://nodejs.org/download/release/v22.18.0/docs/api/timers.html) 核对 API 合约；实际输出与运行环境需在执行时核对。
