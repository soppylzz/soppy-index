# 异步组合、事件与上下文

[Node 导航](../README.md) · [验证记录](../validation.md)

先辨认一次性结果、事件通知和跨异步任务的关联信息，再处理超时与取消。

- [异步组合](./async.md)：Promise、并发上限与真正取消。
- [EventEmitter](./events.md)：同步分发与错误事件。
- [AsyncLocalStorage](./asyncContext.md)：请求上下文与传播边界。

[实验走查](./index.md) · [完整入口](./index.ts)

在仓库根目录使用 Node >= 22.18 运行：

```bash
node docs/node/async/index.ts
```

终端显示实际事件；脚本完成后自然退出，也可用 `Ctrl+C` 停止。按走查中的问题先预测再核对，具体耗时和跨来源顺序以当次输出为准。
