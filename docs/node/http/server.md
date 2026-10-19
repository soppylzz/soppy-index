# HTTP：请求流、确认与取消

HTTP 传递字节和状态，业务是否接受需要应用协议，不能只靠“服务端打印了请求”推断。当前实验使用 Next.js Route Handler，运行在 Node runtime，但应用入口采用 Web Request/Response。

## 从请求字节到业务确认

POST /echo 先检查 Content-Type，再累计字节并限制为 512 bytes，解析 JSON 后验证 `{ id, text }`。缺少正确 Content-Type 返回 415，非法 JSON 返回 400，结构错误返回 422，超限返回 413；只有全部通过才返回相同 ID 的 ack。

[请求体读取](./demo/lib/http.ts)通过 request.body 的 reader 累计 Uint8Array.byteLength，超限取消读取。字符串 length 不能代表 UTF-8 字节数。只读 request.json() 而没有大小控制，也不能证明满足字节限制。

客户端收到 200 后仍需核对 id 与 accepted，区分传输完成和业务确认。未知路由返回 404，已知路由的不支持方法返回 405 并提供 Allow；HEAD 返回对应头部而没有 body。

## 流、背压与取消

[当前实现](./demo/lib/handler.ts)用 ReadableStream 的 pull 按需求生产 chunk。客户端 Fetch reader 看到的块可能被网络合并或拆分，不保证与服务端 enqueue 一一对应。

原生 node:http 的 IncomingMessage 是 Readable，ServerResponse 是 Writable，其 write(false)/drain 表达背压；Route Handler 使用 Web Streams，不能把两套 API 的回调名称混用。Next.js 接管 socket 与服务监听，这份实验不直接配置 headersTimeout、requestTimeout 或 keepAliveTimeout。

客户端 AbortSignal 取消等待后，Route Handler 通过 request.signal 终止尚未完成的延迟工作，响应流也清理取消状态。已经提交的业务不会因断线回滚，写操作仍需幂等键与结果查询。服务端创建 Response 或打印业务日志，都不证明客户端已经读完。

Next CLI 管理服务生命周期；数据库、队列与其他业务资源仍需按部署方式设计退出协议。本地实验不作为生产服务模板。HTTP 缓存与 Cookie 见缓存和 [Cookie](../../browser/storage/cookie/index.md)。

## 依据与边界

[Next.js Route Handlers](https://nextjs.org/docs/app/api-reference/file-conventions/route)说明 Web API 接口；底层 Node HTTP 机制见 [Node HTTP 文档](https://nodejs.org/docs/latest-v22.x/api/http.html)。协议边界见[本实验测试](./demo/__test__/routes.test.ts)，旧 node:http 观察不能直接当作当前 Next.js 运行结果。
