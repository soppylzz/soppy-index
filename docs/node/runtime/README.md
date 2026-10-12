# 运行时、事件循环与进程

[Node 导航](../README.md) · [验证记录](../validation.md)

先分清 JS 执行、系统 I/O 和进程生命周期，再讨论异步顺序。

- [运行时职责](./runtime.md)：V8、libuv、系统调用与线程池。
- [事件循环与队列](./eventLoop.md)：阶段、微任务和注册位置。
- [进程配置与退出](./process.md)：环境变量、信号与收尾。

[实验走查](./index.md) · [完整入口](./index.ts)

在仓库根目录使用 Node >= 22.18 运行：

```bash
node docs/node/runtime/index.ts
```

终端显示实际事件；脚本完成后自然退出，也可用 `Ctrl+C` 停止。按走查中的问题先预测再核对，具体耗时和跨来源顺序以当次输出为准。
