# 事件通知与监听生命周期：实验走查

EventEmitter 的监听器是异步执行的吗？

Promise 表达一次结果，EventEmitter 表达可重复通知。先用 emit 前后的同步顺序理解分发，再观察异步监听器拒绝如何进入 error 路径，最后核对监听清理。

- [EventEmitter](./events.md)：同步分发、错误事件与退订。

## 运行

在仓库根目录使用 Node >= 22.18：

```bash
node docs/node/events/index.ts
```

成功以 `lab-complete` 和退出码 0 结束；完整实现见 [index.ts](./index.ts)。

## 观察重点

读完笔记后，先预测再运行入口。日志中的关键事件是 `synchronous-emitter、emitter-rejection-and-cleanup`。

before-emit、两个监听器、after-emit 依次出现；受控异步拒绝被接住，最终监听数为零。

captureRejections 不等于 emit 会等待监听器的 Promise 完成。
