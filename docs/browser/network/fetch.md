# fetch 与取消：从响应头到当前请求的结果

请求返回了 Response，为什么页面仍可能显示失败？因为获取响应头、读取响应体、判断 HTTP 状态和确认业务结果是不同环节。先分清这些环节，才能解释错误发生在哪里，以及取消还来不来得及。

## Promise 兑现不等于 HTTP 成功

```js
async function loadProfile(signal) {
  const response = await fetch("/api/profile", { signal })
  if (!response.ok) throw new Error(`HTTP ${response.status}`)
  return response.json()
}
```

fetch 在获得 Response 后可以兑现；404、500 通常仍走这一分支，需要应用按 status / ok 判断。网络失败或取消可以使请求拒绝，而 `response.json()` 还可能因内容格式、流状态或取消而失败。具体响应处理规则见 [Fetch Standard](https://fetch.spec.whatwg.org/#fetch-method)。

即使 HTTP 成功且 JSON 可解析，也只能说明这些协议和读取步骤成功。响应是否代表业务已提交，还要看接口约定及数据内容；不能用 `response.ok` 替代业务确认。

## 取消信号需要交给真正执行工作的 API

```js
const controller = new AbortController()
const timer = setTimeout(() => controller.abort(), 2500)

try {
  const data = await loadProfile(controller.signal)
  console.log("Response body read", data)
} catch (error) {
  console.log("Request ended", error.name)
} finally {
  clearTimeout(timer)
}
```

controller 发出信号，fetch 等支持 signal 的 API 才负责响应取消。一个已取消的信号不会复位；重试应创建新的 controller。取消也不能强制中断任意不检查信号的计算。

2500ms 是这段代码的应用策略，计时器实际执行仍受主线程调度影响。finally 清除计时器，避免请求已结束后再保留一次无用的超时操作。信号与取消约定见 [DOM Standard：Aborting ongoing activities](https://dom.spec.whatwg.org/#aborting-ongoing-activities)。

## 取消旧请求与拒绝旧结果各有职责

用户先搜索 A，再搜索 B，即使尝试取消 A，也不应依赖“调用 abort 后，旧异步代码绝不再产生结果”。发布结果前还需要确认它是否仍属于当前操作。

可以用 controller 或递增请求序号作为身份，分别在取得 Response 和完成 body 读取后检查身份。前者覆盖等待响应头的阶段，后者覆盖继续读取响应体的阶段。取消减少不再需要的工作，身份检查避免旧结果覆盖新状态，两者不能互相替代。

请求 ID 关联一次操作，AbortController 负责取消等待，finally 负责清理计时器；三者分别处理身份、生命周期和资源。

## 客户端停止等待，不代表服务端回滚

请求可能已经到达服务端，甚至已产生副作用，而客户端此时才取消。浏览器的取消结果不能证明服务端未执行；写操作需要按业务设计请求身份、重复提交处理和结果查询。

本地 `/api/delay` 会在连接关闭时清除延迟响应定时器，只演示本服务的资源清理。它不构成所有服务端事务都会随 fetch 取消而撤销的证据。

## 对照延迟、取消与 404

可在 [HTTP 实验](../../node/http/index.md)发送慢响应、取消与错误请求，关联 request ID 判断观察属于哪次操作。该实验不覆盖此处所有 API 组合；旧请求取消也不代表新请求失败。

发送字段或文件时，下一步是选择请求体格式，见 [FormData](./form-data.md)。
