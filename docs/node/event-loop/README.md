# 事件循环与任务调度

[Node 实验总入口](../run.ts)

同一段 nextTick 和 Promise 为什么在不同入口顺序不同？

已了解运行时和模块后，再推导回调何时执行。先固定 CJS 或 ESM 入口，再固定注册位置；不能把所有异步 API 排成一个固定优先级表。

- [事件循环与微任务](./event-loop.md)：阶段、上下文和 I/O 回调。

## 动手验证

[实验走查](./index.md) · [完整入口](./index.ts)

在仓库根目录使用 Node >= 22.18：

```bash
node docs/node/event-loop/index.ts
```

先预测结果，再核对日志与断言；成功以 `lab-complete` 和退出码 0 结束。时间与跨来源顺序以当次观察为准。
