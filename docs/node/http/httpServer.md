# Node HTTP：请求流、确认与取消

[本组导航](./README.md) · [实验走查](./index.md)

IncomingMessage是Readable，ServerResponse是Writable。路由、body parser和框架middleware最终建立在这些真实流和socket生命周期之上。HTTP仅传字节和状态，业务是否接受需要应用协议，不靠“服务端打印了请求”推断。

本实验POST /echo校验Content-Type、累计字节512上限、JSON和{id,text}结构，再产生相同id的ack。缺Content-Type为415、错误JSON400、非法结构422、超限413；200还需客户端核对id与accepted。只限制字符串length不能限制UTF-8 body字节数。

header在writeHead/首次write/flushHeaders时发送，之后不能再改。HEAD返回对应资源的头部但不发body。本例未知路由404、已知路由方法不允许405并提供Allow。严肃服务还应检查header/body时限、速率、身份、CSRF和代理信任边界；本地教学服务不等于生产模板。

流式响应write(false)暂停生产直到drain；TCP/Fetch可合并或拆分write，客户端read块不保证与服务器write一一对应。Writable finish表示交给底层发送系统的完成阶段，不证明浏览器已读完、更不证明处理成功。

客户端AbortSignal取消等待，服务端通过响应close且未writableFinished取消下游timer。若业务已提交，取消不能回滚，需幂等键/查询。req close可能是请求读取正常完成，不应无条件当客户端丢弃响应；监听哪一侧要按要取消的生命周期选择。

优雅退出停止接新请求、等待在途并设总期限。本服务复用公共startServer，带兜底关闭连接；数据库和任务队列仍需业务自己纳入退出协议。HTTP缓存与Cookie细节分别关联 [缓存](../../browser/cache/README.md) 和 [Cookie](../../browser/storage/cookie/README.md)。

## 一次 `/echo` 请求经过什么

客户端先发送字节；服务端按累计字节检查大小，再解析 JSON，最后验证 `id` 和 `text` 的结构。只有这些都通过，服务端才返回带相同 `id` 的确认。于是“请求到了服务器”“HTTP 返回 200”“这次业务被接受”是逐层更强的结论，客户端还要核对确认内容。

若客户端在慢响应前取消，它停止等待，服务端观察响应关闭后可停止尚未完成的本地工作；已经提交的业务不会因为连接断开自动撤销。流式响应还要遵守背压，但客户端读到的块边界不必等于服务端 `write()` 的边界。

## 对应源码与实验

以下片段来自 [index.ts](./index.ts) 或同目录辅助文件；完整断言和清理路径见源码。

```ts
req.on("data", (chunk: Buffer) => {
  total += chunk.length
  if (rejected) return
  if (total > 512) {
    rejected = true
    chunks.length = 0
    res.setHeader("Connection", "close")
    send(413, { error: "Body exceeds 512 bytes" })
    return
  }
  chunks.push(chunk)
})
```

完整服务在拒绝后不再保存chunk，并为请求错误/结束设路径；客户端根据真实响应再解析业务ack。/slow的timer只模拟可取消下游等待，不伪造浏览器收包日志。

## 依据与版本

以 [Node 22.18 官方 http 文档](https://nodejs.org/download/release/v22.18.0/docs/api/http.html) 核对 API 合约；实验版本与结果见[验证记录](../validation.md)。
