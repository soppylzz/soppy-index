# 进程：从启动配置到自然退出

程序已经打印结果，为什么还没退出？进程是否结束，取决于仍需维持的事件循环工作；打印一条完成日志、设置退出码和结束进程是三件事。

## 先把启动输入转成明确配置

`process.env` 的值是字符串或缺失，`Boolean("false")` 仍为 true。启动时校验整数范围、布尔枚举与必需项，再把配置对象传给业务；不要在每条请求中重复解析，也不记录密钥原值。`process.argv` 前两项通常是 Node 与脚本路径，`process.cwd()` 是启动工作目录，不是模块所在目录。

## 退出码不等于立即退出

下面是 [index.ts](index.ts) 在独立子进程中观察的最小流程：

```js
process.on("beforeExit", () => console.log("beforeExit"))
process.on("exit", () => console.log("exit"))
process.exitCode = 0
console.log("body")
```

没有其他工作时，输出为 `body → beforeExit → exit`。`exitCode` 指定自然退出时的状态；`process.exit()` 则直接要求结束，可能截断尚在写出的异步输出。stdout/stderr 的同步或异步行为受平台及 TTY、管道、文件等目标影响。

`beforeExit` 表示循环将空，监听器仍可安排异步工作，因此可能再次触发。`exit` 只允许同步收尾。显式 exit、未捕获异常和信号结束并不保证走相同的 beforeExit 路径。实验另起子进程设置 `exitCode = 7`，由父进程检查失败码，而不是让整个实验直接退出。

## 服务退出还要关闭资源

SIGINT 常来自终端中断，SIGTERM 常来自进程管理器。注册监听器后，应用需要自己完成退出流程：停止接收新工作、等待在途任务、关闭依赖和日志，并设置总期限；重复信号应进入同一个幂等流程。SIGKILL 无法拦截，Windows 支持也有差异。

当前实验只验证自然退出与非零退出码，没有实现生产服务摘流。[HTTP 实验](../http/server.md)由 Next CLI 管理监听，数据库等业务资源仍需自己的关闭协议。CLI 应以退出码表示结果，不能只打印 error 却返回 0。

依据：[Node 22.18 process](https://nodejs.org/download/release/v22.18.0/docs/api/process.html)。
