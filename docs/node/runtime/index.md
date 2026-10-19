# 运行时与进程：实验走查

JavaScript 在 Node 中如何执行，进程又如何结束？

先有 JavaScript 调用栈，再有宿主提供的 I/O 与进程资源。先分清 V8、libuv 和操作系统的职责，避免把“异步”理解成所有代码都在线程池里执行。

- [运行时职责](./runtime.md)：V8、系统 I/O 与线程池。
- [进程配置与退出](./process.md)：环境变量、工作目录与收尾。

## 运行

在仓库根目录使用 Node >= 22.18：

```bash
node docs/node/runtime/index.ts
```

成功以 `lab-complete` 和退出码 0 结束；完整实现见 [index.ts](./index.ts)。

## 观察重点

读完笔记后，先预测再运行入口。日志中的关键事件是 `components、natural-exit、nonzero-exit`。

组件版本来自实际进程；自然退出按 body、beforeExit、exit 发生，非零退出由父进程识别。

不覆盖信号摘流与生产进程管理。
