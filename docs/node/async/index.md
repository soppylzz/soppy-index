# 异步任务与请求上下文：实验走查

怎样限制并发、真正取消等待，并为交错的请求保留 ID？

事件循环解释何时执行，这一组解释怎样组织工作。先看有限消费者如何控制任务启动，再看 AbortSignal 与 finally，最后用独立 store 关联请求。

- [异步组合](./async.md)：并发上限、错误和取消。
- [异步上下文](./async-context.md)：AsyncLocalStorage 与传播边界。

## 运行

在仓库根目录使用 Node >= 22.18：

```bash
node docs/node/async/index.ts
```

成功以 `lab-complete` 和退出码 0 结束；完整实现见 [index.ts](./index.ts)。

## 观察重点

读完笔记后，先预测再运行入口。日志中的关键事件是 `bounded-concurrency、deadline-cancels-operation、isolated-async-contexts`。

六个任务最多同时运行两个；可取消 timer 拒绝为 AbortError；交错请求各自读到自己的 ID。

取消本地等待不证明远端业务回滚；上下文不自动跨 Worker 或远程服务传播。
