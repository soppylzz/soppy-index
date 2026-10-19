# 运行时与进程

[Node 实验总入口](../run.ts)

JavaScript 在 Node 中如何执行，进程又如何结束？

先有 JavaScript 调用栈，再有宿主提供的 I/O 与进程资源。先分清 V8、libuv 和操作系统的职责，避免把“异步”理解成所有代码都在线程池里执行。

- [运行时职责](./runtime.md)：V8、系统 I/O 与线程池。
- [进程配置与退出](./process.md)：环境变量、工作目录与收尾。

## 动手验证

[实验走查](./index.md) · [完整入口](./index.ts)

在仓库根目录使用 Node >= 22.18：

```bash
node docs/node/runtime/index.ts
```

先预测结果，再核对日志与断言；成功以 `lab-complete` 和退出码 0 结束。时间与跨来源顺序以当次观察为准。
