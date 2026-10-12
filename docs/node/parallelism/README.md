# Worker 与进程隔离

[Node 导航](../README.md) · [验证记录](../validation.md)

先判断任务是在等待 I/O 还是占用 CPU，再选择 Worker、子进程或普通异步。

- [并行与隔离](./parallelism.md)：消息、共享内存与任务确认。

[实验走查](./index.md) · [完整入口](./index.ts)

在仓库根目录使用 Node >= 22.18 运行：

```bash
node docs/node/parallelism/index.ts
```

终端显示实际事件；脚本完成后自然退出，也可用 `Ctrl+C` 停止。按走查中的问题先预测再核对，具体耗时和跨来源顺序以当次输出为准。
