# 内置测试与资源隔离：实验走查

怎样证明边界处理正确，且测试结束后没有遗留资源？

有了文件和 HTTP 基础，再看真实 Test Runner 如何验证输入、失败与收尾。每个测试持有自己的临时目录或动态端口，避免共享状态造成偶发失败。

- [Node Test Runner](./testing.md)：断言、隔离与资源关闭。

## 运行

在仓库根目录使用 Node >= 22.18：

```bash
node docs/node/testing/index.ts
```

成功以 `lab-complete` 和退出码 0 结束；完整实现见 [index.ts](./index.ts)。

## 观察重点

读完笔记后，先预测再运行入口。日志中的关键事件是 `real-node-test-runner`。

三个真实测试分别验证配置边界、文件清理与 HTTP 状态、响应和关闭。

测试实现放在 `__test__/`；TAP 通过只表示这些用例覆盖的行为通过。
