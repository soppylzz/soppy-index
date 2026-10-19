# 内置测试与资源隔离

[Node 实验总入口](../run.ts)

怎样证明边界处理正确，且测试结束后没有遗留资源？

有了文件和 HTTP 基础，再看真实 Test Runner 如何验证输入、失败与收尾。每个测试持有自己的临时目录或动态端口，避免共享状态造成偶发失败。

- [Node Test Runner](./testing.md)：断言、隔离与资源关闭。

## 动手验证

[实验走查](./index.md) · [完整入口](./index.ts)

在仓库根目录使用 Node >= 22.18：

```bash
node docs/node/testing/index.ts
```

先预测结果，再核对日志与断言；成功以 `lab-complete` 和退出码 0 结束。时间与跨来源顺序以当次观察为准。
