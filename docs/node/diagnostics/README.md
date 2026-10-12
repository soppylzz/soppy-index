# 内存与运行时观测

[Node 导航](../README.md) · [验证记录](../validation.md)

先确定指标测量的对象，再沿引用链、CPU 热点或事件循环延迟定位。

- [内存](./memory.md)：V8 堆、Buffer 与保留链。
- [可观测性](./observability.md)：日志、指标与 trace。

[实验走查](./index.md) · [完整入口](./index.ts)

在仓库根目录使用 Node >= 22.18 运行：

```bash
node docs/node/diagnostics/index.ts
```

终端显示实际事件；脚本完成后自然退出，也可用 `Ctrl+C` 停止。按走查中的问题先预测再核对，具体耗时和跨来源顺序以当次输出为准。
