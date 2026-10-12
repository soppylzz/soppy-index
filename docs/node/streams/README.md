# 流、背压与销毁

[Node 导航](../README.md) · [验证记录](../validation.md)

从“消费者比生产者慢”理解 `write(false)`，再看结束、错误和取消如何传播。

- [Stream 与 pipeline](./stream.md)：水位、`drain`、`finish` 与销毁。

[实验走查](./index.md) · [完整入口](./index.ts)

在仓库根目录使用 Node >= 22.18 运行：

```bash
node docs/node/streams/index.ts
```

终端显示实际事件；脚本完成后自然退出，也可用 `Ctrl+C` 停止。按走查中的问题先预测再核对，具体耗时和跨来源顺序以当次输出为准。
