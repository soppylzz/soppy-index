# Worker 与进程隔离

[Node 实验总入口](../run.ts)

CPU 密集工作为什么不能只多写几个 Promise？

先判断瓶颈在计算还是等待。再比较 Worker 的独立执行、消息复制与 transfer、共享内存，以及子进程的故障隔离边界。

- [并行与隔离](./parallelism.md)：消息确认、共享内存与任务结束。

## 动手验证

[实验走查](./index.md) · [完整入口](./index.ts)

在仓库根目录使用 Node >= 22.18：

```bash
node docs/node/parallelism/index.ts
```

先预测结果，再核对日志与断言；成功以 `lab-complete` 和退出码 0 结束。时间与跨来源顺序以当次观察为准。
