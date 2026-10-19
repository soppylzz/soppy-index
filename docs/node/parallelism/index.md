# Worker 与进程隔离：实验走查

CPU 密集工作为什么不能只多写几个 Promise？

先判断瓶颈在计算还是等待。再比较 Worker 的独立执行、消息复制与 transfer、共享内存，以及子进程的故障隔离边界。

- [并行与隔离](./parallelism.md)：消息确认、共享内存与任务结束。

## 运行

在仓库根目录使用 Node >= 22.18：

```bash
node docs/node/parallelism/index.ts
```

成功以 `lab-complete` 和退出码 0 结束；完整实现见 [index.ts](./index.ts)。

## 观察重点

先读相应笔记并预测，再运行完整入口。下表的“应看到”是这个实验控制条件下的检查点，具体结果以当前运行输出为准。

| 问题 | 看哪里 | 应看到与原因 |
| --- | --- | --- |
| 计算在哪里执行？ | 看 Worker 求和与 threadId | Worker 回传 1..50000 的结果与任务 ID；消息确认才表示任务处理完成。 |
| 转移与共享有何区别？ | 依次看 ArrayBuffer 与 SharedArrayBuffer | 转移后主端 buffer 脱离；共享缓冲通过 Atomics 更新仍可在主端读取。 |
| 消息不回应怎么办？ | 看 `silent` 超时 | 本次等待和监听被清理；Worker 不会仅因等待超时自动停止。 |
| 进程与线程怎样区分？ | 看 `execFile` 子进程 | 子进程有独立 PID，结果由父进程检查。 |

实验没有实现通用 Worker 池或 cluster 部署。`terminate()` 是主动停止，可能返回退出码 1；总入口结果仍以断言和完成事件为准。
