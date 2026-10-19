# 运行时与进程：实验走查

[知识导航与运行命令](./README.md) · [完整实现](./index.ts)

JavaScript 在 Node 中如何执行，进程又如何结束？

读完笔记后，先预测再运行入口。日志中的关键事件是 `components、natural-exit、nonzero-exit`。

组件版本来自实际进程；自然退出按 body、beforeExit、exit 发生，非零退出由父进程识别。

不覆盖信号摘流与生产进程管理。

按本组入口复核当前行为；预期与示例输出不代替实际运行记录。
