# 异步任务与请求上下文：实验走查

[知识导航与运行命令](./README.md) · [完整实现](./index.ts)

怎样限制并发、真正取消等待，并为交错的请求保留 ID？

读完笔记后，先预测再运行入口。日志中的关键事件是 `bounded-concurrency、deadline-cancels-operation、isolated-async-contexts`。

六个任务最多同时运行两个；可取消 timer 拒绝为 AbortError；交错请求各自读到自己的 ID。

取消本地等待不证明远端业务回滚；上下文不自动跨 Worker 或远程服务传播。

按本组入口复核当前行为；预期与示例输出不代替实际运行记录。
