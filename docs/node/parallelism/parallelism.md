# Worker Threads、子进程与共享状态

| 方案          | 隔离与共享                         | 适用方向           |
| ------------- | ---------------------------------- | ------------------ |
| Worker        | 独立V8 isolate，同进程，可共享内存 | CPU密集JS任务      |
| child_process | 独立进程和内存，通过IPC/管道       | 外部命令、强隔离   |
| cluster       | 多Node进程分担服务连接             | 特定单机多进程部署 |

Worker不是让当前对象自动多线程。普通消息走structured clone，函数不可直接克隆；ArrayBuffer transfer转移所有权，发送端detach；SharedArrayBuffer共享字节需Atomics等同步。Buffer可能来自池，直接转其底层可能复制或影响更大内存，本例使用独立ArrayBuffer避开池边界。

postMessage不抛错只说明排队/克隆成功，不说明任务完成。请求id、结构校验、ack/error、超时、退出检测和清理共同构成任务协议；超时不自动终止CPU任务，应明确terminate或协作取消。terminate可能中断任务，不能把未提交事务留给被强制终止的线程收尾。

spawn流式stdout适合大输出；exec通过shell并缓存结果，涉及注入与maxBuffer；execFile直接可执行文件+参数数组；fork启动Node并建IPC。避免拼接不可信shell文本，本仓库runNode用execFile、5秒超时、64KiB输出上限。

Worker启动有成本，小任务应用复用池并限并发。多进程副本可由容器平台管理，cluster不是水平扩展必经步骤。每个worker/isolate的AsyncLocalStorage与模块状态独立，需显式传关联ID。

## 对应源码与实验

以下片段来自 [index.ts](./index.ts) 或同目录辅助文件；完整断言和清理路径见源码。

```ts
const buffer = new ArrayBuffer(4)
new Uint8Array(buffer)[0] = 42
const transfer = request("transfer", { buffer }, [buffer])
assert.equal(buffer.byteLength, 0)
const transferResult = await transfer
```

request内部先注册监听和超时，再postMessage，避免同步/快速回应竞态；成功或失败都解绑本次listener。buffer脱离是发送端可观测结果，worker ack才是接收和处理证据。silent分支故意不回应，超时只清除本次等待；随后finally显式terminate，并不声称超时自动取消了工作线程。

## 依据与版本

以 [Node 22.18 官方 worker_threads 文档](https://nodejs.org/download/release/v22.18.0/docs/api/worker_threads.html) 核对 API 合约；实际输出与运行环境需在执行时核对。
