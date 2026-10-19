# 事件循环与任务调度：实验走查

[知识导航与运行命令](./README.md) · [完整实现](./index.ts)

同一段 nextTick 和 Promise 为什么在不同入口顺序不同？

读完笔记后，先预测再运行入口。日志中的关键事件是 `real-queue-trace`。

分别启动原生 CJS/ESM；比较 top 与 io 两种上下文，I/O 回调中的 Immediate 先于 timer。

顶层 timer 与 Immediate 不断言固定顺序；没有做线程池饱和实验。

按本组入口复核当前行为；预期与示例输出不代替实际运行记录。
