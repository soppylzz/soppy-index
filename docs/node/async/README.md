# 异步任务与请求上下文

[Node 实验总入口](../run.ts)

怎样限制并发、真正取消等待，并为交错的请求保留 ID？

事件循环解释何时执行，这一组解释怎样组织工作。先看有限消费者如何控制任务启动，再看 AbortSignal 与 finally，最后用独立 store 关联请求。

- [异步组合](./async.md)：并发上限、错误和取消。
- [异步上下文](./async-context.md)：AsyncLocalStorage 与传播边界。

## 动手验证

[实验走查](./index.md) · [完整入口](./index.ts)

在仓库根目录使用 Node >= 22.18：

```bash
node docs/node/async/index.ts
```

先预测结果，再核对日志与断言；成功以 `lab-complete` 和退出码 0 结束。时间与跨来源顺序以当次观察为准。
