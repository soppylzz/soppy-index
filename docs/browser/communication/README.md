# 跨上下文通信

标签页、iframe 和 worker 之间不能随意共享对象。学习时先区分“通知多个页面”“发给指定窗口”和“共享执行环境”，再理解数据传递、安全校验与业务确认。

- [跨上下文通信](./cross-context-communication.md)：按场景介绍 BroadcastChannel、storage event、window.postMessage、MessageChannel 和 SharedWorker，提供页面与 worker 的使用片段。
- [结构化克隆与转移](./structured-clone.md)：理解数据副本、支持类型、循环引用和 ArrayBuffer 所有权转移。

本模块只保留知识文档与 API 片段，不需要启动本地 demo。片段标明运行位置；SharedWorker 示例仍需要应用提供同源 worker 脚本。

## 面试常考点

| 问题 | 回答时的关键区别 |
| --- | --- |
| 多标签页通信如何选型？ | 广播通知用 BroadcastChannel；已有存储变化可监听 storage；需要共享执行环境时考虑 SharedWorker |
| 同源就一定能通信吗？ | 还取决于存储分区、上下文状态，以及是否持有窗口引用或端口 |
| postMessage 怎样保证安全？ | 发送时指定 targetOrigin；接收时检查 origin、source、数据结构与操作权限 |
| MessageChannel 与 window.postMessage 有什么关系？ | 可以用窗口消息安全交付端口，再通过专用端口通信；持有端口就是获得相应能力 |
| 克隆与转移有什么区别？ | 克隆得到数据副本；转移交出资源，原持有方可能失去使用能力 |
| 发送成功、收到消息、业务成功是否等价？ | 不等价；业务确认需要请求关联，超时也不能证明对方没有执行 |
