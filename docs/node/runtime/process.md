# Process：配置与生命周期

[本组导航](./README.md) · [实验走查](./index.md)

process.env 是字符串或缺失，Boolean("false") 仍为true。启动时显式校验整数范围、布尔枚举和必需项，再传配置对象；不要反复在业务路径解析，也不记录密钥原值。argv 包含 Node与脚本路径，cwd 是进程工作目录，不是模块目录。

beforeExit 在循环将空时触发，可再次安排异步工作并多次触发；exit 只能同步收尾。显式 process.exit、致命错误和信号不应假定均会经过相同 beforeExit 路径。exitCode 设置自然退出状态，避免直接 exit 截断仍在排出的异步输出。

SIGINT通常来自终端中断，SIGTERM常来自管理器。注册信号监听后需要自己完成退出；同一个退出流程应幂等：摘除流量、停止接收、等待在途、关闭依赖和日志，设总期限后强制结束。SIGKILL无法拦截，Windows信号支持也有差异。

stdout/stderr可能连TTY、管道或文件，其写入行为随平台/目标变化。CLI用退出码表达成功失败，别只打印error却返回0。服务的关闭管理沿用 [公共服务实现](../../demo/server.ts)，本例只单独观察自然退出与返回码。

## 先区分“结束意图”和“已结束”

`process.exitCode = 7` 只设置自然结束时的状态，仍给已安排的工作和输出留机会；`process.exit(7)` 直接请求结束，可能截断输出。`beforeExit` 表示循环将空，还能继续安排工作；`exit` 到来时只适合同步收尾。服务停止还需先处理连接和依赖，不能把打印 `exit` 当作优雅关闭完成。

## 对应源码与实验

以下片段来自 [index.ts](./index.ts) 或同目录辅助文件；完整断言和清理路径见源码。

```ts
process.on("beforeExit", () => console.log("beforeExit"))
process.on("exit", () => console.log("exit"))
process.exitCode = 0
console.log("body")
```

实际在子进程观察三个输出，再用另一个子进程的 exitCode=7 检查父端错误码。父进程不调用 exit(7)，因此能继续完成后续验证。

## 依据与版本

以 [Node 22.18 官方 process 文档](https://nodejs.org/download/release/v22.18.0/docs/api/process.html) 核对 API 合约；实验版本与结果见[验证记录](../validation.md)。
