# SSE / WebSocket 打字机手写示例

用一个 Next.js 页面练习两种流式接收，再让同一个 React 打字机逐步消费文本。默认使用明确标识的固定模拟回复，不需要 API Key；切换 GLM 后，服务端通过 OpenAI 兼容的 Chat Completions 接口获取真实增量。

## 启动

使用 Node >= 22.18，在仓库根目录安装依赖并运行：

```bash
pnpm install
pnpm --filter @soppy-index/stream dev
```

打开 `http://127.0.0.1:3100`。同一进程启动 Next.js HTTP 服务和 `ws://127.0.0.1:3101/ws`。端口冲突会报错，不会自动切换端口。修改服务端文件后重启命令；React 页面由 Next.js 热更新。

页面选择 SSE 或 WebSocket 后点击 Generate。调节 Typing interval 可观察“已接收但未显示”的缓冲；Stop 会停止显示并取消连接，再点击 Generate 开始独立的新请求。Inspect received text 显示已到达浏览器的原始文本，便于区分网络流式和视觉打字效果。

## 接入 GLM

在当前目录把 `.env.example` 复制为 `.env.local`，填写服务端配置，再重启：

```dotenv
GLM_API_KEY=your-api-key
GLM_BASE_URL=https://open.bigmodel.cn/api/paas/v4
GLM_MODEL=glm-4.7
PORT=3100
WS_PORT=3101
```

`GLM_MODEL` 应替换为账户实际可用模型，示例不是最新模型推荐；`GLM_BASE_URL` 填接口前缀，代码会追加 `/chat/completions`。不同平台或套餐的地址、Key 权限可能不同，以账户文档为准。页面选择 GLM 才会调用接口，缺 Key、配额不足或连接失败会显示错误，不会悄悄改用模拟数据。

Key 不使用 `NEXT_PUBLIC_`，不进入浏览器或 WS 消息。示例只绑定本机，未实现用户登录、配额和生产限流。真实 API 调用会消耗账户配额；不需要 Key 也可以完整练习本地两条传输链路。

## 面试时按什么顺序手写

先写 [SSE 读取器](lib/sse.ts)：`TextDecoder` 以流模式处理跨块 UTF-8，保留未完成行，按空行拼事件。一次 `reader.read()` 可能只有半个汉字，也可能包含多个事件，不能直接 `JSON.parse(value)`。这个读取器只实现本例需要的 event/data 解析，不包含 EventSource 的自动重连、事件 ID 或恢复机制。

再写 [SSE 路由](app/api/sse/route.ts)与 [浏览器传输](lib/transports.ts)。本例使用 POST + fetch，方便携带 prompt；响应仍使用 SSE 格式，但不是原生 EventSource。服务端发 `delta/done/error` 三种应用消息，正常关闭连接与业务完成分开判断。浏览器不接受“未收到 done 却断开”作为成功。

接着写 [WS 服务](lib/ws-server.ts)。浏览器连接后发送一次 `{ prompt, provider }`，服务端逐条推送相同的应用消息；断开连接会中止当前生成。本例每次生成一条 WS 连接，不做自动重连，以免不明确的重发造成重复生成。WS 在独立端口运行，避免把普通 HTTP Route Handler 当成 WebSocket 服务器；它需要支持持久连接的 Node 服务，不能原样当作任意 serverless 部署示例。

然后写 [打字机 Hook](app/use-typewriter.ts)。网络负责追加目标文本，`requestAnimationFrame` 按经过时间逐步显示；按字素簇拆分，避免把 emoji、组合字符当成两个可见字符。文本可能跨 delta 拼成一个字素，因此每次基于累计文本分段。小规模面试示例优先清晰，每帧对累计文本分段；大输出应改为增量分段和队列并控制缓冲上限。

最后补 [React 页面](app/stream-demo.tsx)的状态与清理。网络完成后可能仍有文本待显示，页面会先进入 Typing buffered text，再显示 Done。每次生成拥有独立 AbortController，旧请求的迟到回调不能覆盖新请求；Stop 和卸载也清理网络与动画。错误发生后保留已显示内容，未显示缓冲可通过检查区域查看。

## GLM 两条链路实际上共用什么

```text
SSE: browser POST → Next route → GLM SSE → delta/done/error SSE → browser buffer
WS:  browser WS   → ws server  → GLM SSE → delta/done/error WS  → browser buffer
```

模型上游本身始终是 HTTP SSE，本例把它转换成两种下游协议；不是声称 GLM 提供了这里的 WS API。[provider.ts](lib/provider.ts)提取 `choices[0].delta.content`，忽略 role、usage 和 reasoning 内容，接受 `[DONE]` 或正常 finish_reason，异常截断会报错。普通文本示例不实现工具调用、多模态和多轮历史。

## 验证命令

```bash
pnpm --filter @soppy-index/stream typecheck
pnpm --filter @soppy-index/stream test
pnpm --filter @soppy-index/stream test:http
pnpm --filter @soppy-index/stream build
```

单元测试覆盖跨字节/跨行分块、取消读取、GLM 格式与异常、字素显示。HTTP 测试使用本地模拟流和真实 HTTP/WS，另外启动测试端口，不请求真实 GLM。构建后可用 `pnpm --filter @soppy-index/stream start` 启动同样的两端口服务。

原理复习：[SSE](../../docs/network/realtime-tunnels/sse.md)、[WebSocket](../../docs/network/realtime-tunnels/websocket.md)。接口资料：[智谱文档](https://docs.bigmodel.cn/)、[Next.js custom server](https://nextjs.org/docs/app/guides/custom-server)、[ws](https://github.com/websockets/ws)。
