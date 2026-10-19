# 从信号到原因：日志、指标与 Trace

metrics看趋势/阈值，logs记录离散事件，traces描述请求的跨阶段因果链。结构化字段time/service/requestId/traceId应稳定，密钥、Cookie和个人数据在进入日志前脱敏。不要为调试直接输出整个process.env或report。

event loop delay是采样回调被推迟的程度，ELU是事件循环活跃/空闲占比，不是系统CPU利用率。delay高可来自主线程阻塞、GC或调度；线程池饱和与网络等待可能表现不同。CPU profile找热点，heap profile找保留/分配，不能只靠单个指标判根因。

配置在启动时解析验证，使用明确覆盖优先级。请求入口建立AsyncLocalStorage关联，跨服务传trace字段；事件时间戳用于关联，分布式时钟有偏差，全局顺序仍需协议。

本例monitorEventLoopDelay单位为纳秒，展示时除1e6换毫秒；先等待采样建立，再有界忙循环。performance mark/measure记录JS区间，不是完整系统调度trace。生产监测要控制采样与日志成本，验证告警能关联release、实例与请求。

## 对应源码与实验

以下片段来自 [index.ts](./index.ts) 或同目录辅助文件；完整断言和清理路径见源码。

```ts
const histogram = monitorEventLoopDelay({ resolution: 10 })
histogram.enable()
const initial = performance.eventLoopUtilization()
const utilization = performance.eventLoopUtilization(initial)
log("actual-loop-metrics", {
  delayMaxMs: histogram.max / 1e6,
  utilization: utilization.utilization,
})
```

完整源码在两次采样间执行有界工作并留出采样时间；摘录仅展示接口。实际数值每次不同，不为精确毫秒或固定ELU写断言。finally停监测，避免诊断器自己让实验不退出。

## 依据与版本

以 [Node 22.18 官方 perf_hooks 文档](https://nodejs.org/download/release/v22.18.0/docs/api/perf_hooks.html) 核对 API 合约；实际输出与运行环境需在执行时核对。
