# 异步上下文：AsyncLocalStorage 与边界

AsyncLocalStorage沿异步资源关系传播store，用于requestId、trace等关联信息。run限定调用及其派生异步任务的上下文，不是把一个全局变量反复改成当前请求。并发请求使用不同store对象，避免对象引用被意外共享修改。

getStore在作用域外可为undefined，下游必须能处理缺少关联信息。enterWith会影响当前同步执行后续路径，事件监听场景容易让上下文超出预期；请求入口通常run更清楚。disable使实例退出所有上下文，适合整个工具停用，而不是每个并发请求结束都调用。

async_hooks暴露资源ID及trigger关系，逐资源重型日志会增加开销，还可能递归触发更多资源。普通Promise/timer/核心I/O可传播store；自制thenable、第三方调度器或错误绑定的callback可能丢上下文。先定位边界，再用AsyncResource.runInAsyncScope或适合版本的bind/snapshot。

store不是跨Worker/子进程自动传递的全局状态；需要消息显式传ID。在远程请求里传播trace字段也需独立协议。授权/租户隔离应有显式可信参数，不能仅靠可缺失的日志store决定。

## 用两个交错请求理解 store

请求 A 与 B 各自通过 `run({ requestId }, callback)` 建立上下文。即使 A 的 timer 比 B 晚完成，A 派生的异步任务仍应读到 A 的 ID；这与把一个全局变量反复改成“当前请求”不同。传播依赖异步资源关系，跨 Worker 或远程服务时仍需显式传递 ID。

## 对应源码与实验

以下片段来自 [index.ts](./index.ts) 或同目录辅助文件；完整断言和清理路径见源码。

```ts
const observed = await Promise.all(
  ["request-a", "request-b"].map((requestId, index) =>
    storage.run({ requestId }, async () => {
      await delay(index ? 2 : 8)
      assert.equal(storage.getStore()?.requestId, requestId)
      return storage.getStore()!.requestId
    })
  )
)
```

两个timer故意交错完成；结果仍按Promise.all输入位置返回，不能拿数组顺序声称实际完成顺序相同。最后验证run外store缺失并停用实例。

## 依据与版本

以 [Node 22.18 官方 async_context 文档](https://nodejs.org/download/release/v22.18.0/docs/api/async_context.html) 核对 API 合约；实际输出与运行环境需在执行时核对。
