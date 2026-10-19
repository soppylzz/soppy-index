# 事件循环与任务调度：实验走查

同一段 nextTick 和 Promise 为什么在不同入口顺序不同？

已了解运行时和模块后，再推导回调何时执行。先固定 CJS 或 ESM 入口，再固定注册位置；不能把所有异步 API 排成一个固定优先级表。

- [事件循环与微任务](./event-loop.md)：阶段、上下文和 I/O 回调。

## 运行

在仓库根目录使用 Node >= 22.18：

```bash
node docs/node/event-loop/index.ts
```

成功以 `lab-complete` 和退出码 0 结束；完整实现见 [index.ts](./index.ts)。

## 观察重点

读完笔记后，先预测再运行入口。日志中的关键事件是 `real-queue-trace`。

分别启动原生 CJS/ESM；比较 top 与 io 两种上下文，I/O 回调中的 Immediate 先于 timer。

顶层 timer 与 Immediate 不断言固定顺序；没有做线程池饱和实验。
