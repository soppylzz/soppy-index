# 测试与计算扩展边界

[Node 导航](../README.md) · [验证记录](../validation.md)

用独立断言验证结果和清理，再按能力、兼容与运行成本选择扩展方式。

- [Node Test Runner](./testing.md)：资源隔离与失败路径。
- [Node-API 与 WASM](./native.md)：二进制兼容、隔离和性能边界。

[实验走查](./index.md) · [完整入口](./index.ts)

在仓库根目录使用 Node >= 22.18 运行：

```bash
node docs/node/tooling/index.ts
```

终端显示实际事件；脚本完成后自然退出，也可用 `Ctrl+C` 停止。按走查中的问题先预测再核对，具体耗时和跨来源顺序以当次输出为准。
