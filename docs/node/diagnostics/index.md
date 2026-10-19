# 内存与性能诊断：实验走查

看到 RSS 升高或请求变慢，下一步应该查什么？

先确定指标测量什么，再选择证据。用有界缓存理解引用保留，用短忙循环观察事件循环延迟与利用率；不要从一次数字直接推断泄漏或性能收益。

- [内存与引用](./memory.md)：堆、Buffer、RSS 与保留链。
- [运行时观测](./observability.md)：日志、延迟与利用率。

## 运行

在仓库根目录使用 Node >= 22.18：

```bash
node docs/node/diagnostics/index.ts
```

成功以 `lab-complete` 和退出码 0 结束；完整实现见 [index.ts](./index.ts)。

## 观察重点

先读相应笔记并预测，再运行完整入口。下表的“应看到”是这个实验控制条件下的检查点，具体结果以当前运行输出为准。

| 问题 | 看哪里 | 应看到与原因 |
| --- | --- | --- |
| 清引用会立即降 RSS 吗？ | 采样两项 Buffer 缓存，随后 `clear` | 逻辑上最多保留 4 MiB；GC 与操作系统归还内存没有即时保证。 |
| 事件循环被阻塞如何表现？ | 开启 delay histogram 后执行有界忙循环 | 读取实际 delay 与 ELU；不同运行的数值不固定。 |
| 测量器也要清理吗？ | 看 `finally` | 停用 histogram 并清理 performance marks，避免诊断器妨碍退出。 |

没有抓 heap snapshot、CPU profile 或诊断报告，也没有证明真实应用存在内存泄漏。
