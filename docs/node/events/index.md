# 事件通知与监听生命周期：实验走查

[知识导航与运行命令](./README.md) · [完整实现](./index.ts)

EventEmitter 的监听器是异步执行的吗？

读完笔记后，先预测再运行入口。日志中的关键事件是 `synchronous-emitter、emitter-rejection-and-cleanup`。

before-emit、两个监听器、after-emit 依次出现；受控异步拒绝被接住，最终监听数为零。

captureRejections 不等于 emit 会等待监听器的 Promise 完成。

按本组入口复核当前行为；预期与示例输出不代替实际运行记录。
