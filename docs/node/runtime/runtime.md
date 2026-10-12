# Node 运行时：V8、libuv 与系统

[本组导航](./README.md) · [实验走查](./index.md)

Node 把 V8 的 JavaScript 执行、libuv 的事件循环与系统 I/O、原生绑定和核心库组合起来。一个 isolate 的 JS 通常串行执行，但进程还有 V8 辅助线程、libuv worker pool 和应用创建的 Worker，因此“Node进程只有一条线程”不成立。

网络连接通常使用操作系统非阻塞通知，不是每个连接分配一个线程池线程。文件系统、dns.lookup、部分crypto/zlib可使用共享池；改变 UV_THREADPOOL_SIZE 不会让主线程 CPU 计算或所有 socket 自动并行，池竞争和机器核数也会限制收益。

| 工作       | 主要约束               | 改进方向                   |
| ---------- | ---------------------- | -------------------------- |
| 等待网络   | 连接数、超时、下游容量 | 并发上限与取消             |
| 主线程计算 | 当前 isolate 执行时间  | 有界拆分或 Worker          |
| 池内任务   | 共享线程池与系统负载   | 先测量再调池容量           |
| 同步 I/O   | 阻塞调用方 JS          | 用于启动/CLI，慎放请求路径 |

I/O并发不是CPU并行；Promise包装一段重计算不会自动把它搬到别的线程。关联 [并行选择](../parallelism/parallelism.md) 与 [延迟观测](../diagnostics/observability.md)。

## 从一次文件读取理解分工

调用 `readFile()` 时，当前 JS 先登记后续处理并继续执行；文件完成后，回调才有机会回到事件循环。等待文件的阶段与执行回调的阶段不是同一件事。若在回调中直接做很长的 CPU 计算，即使读取本身是异步的，当前 isolate 的其他 JS 仍要等它结束。

因此先问瓶颈在哪：等待外部结果可用有界并发，主线程计算考虑 Worker，共享线程池任务则检查池竞争。不能仅凭 API 名称判断它占用哪条线程。

## 对应源码与实验

以下片段来自 [index.ts](./index.ts) 或同目录辅助文件；完整断言和清理路径见源码。

```ts
log("components", {
  v8: process.versions.v8,
  uv: process.versions.uv,
  platform: process.platform,
  arch: process.arch,
  pid: process.pid,
})
```

读数证明当前进程组件版本，不证明某一文件操作实际用了哪个池线程。需要线程池行为时应加入可控负载与 trace，而不是把组件名打印当架构实测。

## 依据与版本

以 [Node 22.18 官方 process 文档](https://nodejs.org/download/release/v22.18.0/docs/api/process.html) 核对 API 合约；实验版本与结果见[验证记录](../validation.md)。
