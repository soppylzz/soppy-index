# 事件通知与监听生命周期

[Node 实验总入口](../run.ts)

EventEmitter 的监听器是异步执行的吗？

Promise 表达一次结果，EventEmitter 表达可重复通知。先用 emit 前后的同步顺序理解分发，再观察异步监听器拒绝如何进入 error 路径，最后核对监听清理。

- [EventEmitter](./events.md)：同步分发、错误事件与退订。

## 动手验证

[实验走查](./index.md) · [完整入口](./index.ts)

在仓库根目录使用 Node >= 22.18：

```bash
node docs/node/events/index.ts
```

先预测结果，再核对日志与断言；成功以 `lab-complete` 和退出码 0 结束。时间与跨来源顺序以当次观察为准。
