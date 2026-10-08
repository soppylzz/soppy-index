# 跨上下文通信

[仓库首页](../../../README.md) · [浏览器核心](../core/README.md) · [Web Storage](../storage/webStorage/README.md) · [页面生命周期](../core/lifeCycle/README.md) · [公共样式与工具](../../demo/README.md)

本模块讨论标签页、iframe 和 worker 之间如何找到接收方、传递数据，以及判断消息是否被处理。

- [通信机制笔记](./crossContextCommunication.md)：范围、分区、克隆、端口、安全校验与可靠性边界。
- [实验走查](./index.md)：操作、预期、实际验证与未验证项。
- [实验服务](./index.ts)：双源本地 HTTP 服务。
- [浏览器脚本](./assets/main.js)、[接收 iframe](./assets/frame.js)、[SharedWorker](./assets/worker.js)：原生 API，无构建步骤。

## 运行

需要 Node >= 22.18 和现代浏览器；SharedWorker 不可用或存储被禁止时，页面会记录失败。在仓库根目录执行：

```bash
node docs/browser/communication/index.ts
```

等待终端输出启动指引，打开 <http://127.0.0.1:5008/>，用页面按钮打开第二标签页。跨源 iframe 位于 <http://127.0.0.1:5009/frame>。两个服务都只监听 `127.0.0.1`；按 `Ctrl+C` 同时停止。

```bash
PORT=5010 PEER_PORT=5011 node docs/browser/communication/index.ts
```

端口须为 1～65535 内的不同整数；任一占用则启动失败，关闭已启动的另一服务。页面和 CLI 从同一配置生成地址。不要混用 `localhost`、`127.0.0.1` 或 `file://`，它们不能视为同一个 origin。

## 实验入口

| 机制               | 操作                                          | 观察位置                                            |
| ------------------ | --------------------------------------------- | --------------------------------------------------- |
| BroadcastChannel   | 两页连接后广播；勾选本页第二频道              | 接收页 request、发送页 ack；第二对象可收到本页发送  |
| storage event      | 写入请求、重复值、删除 key                    | 其他窗口的真实 storage 事件；写入页不收自己的变化   |
| SharedWorker       | 两页依次计数                                  | 相同 instance、递增 count；连接状态里的 worker 结果 |
| window.postMessage | 合法及四种错误对照                            | iframe 接收日志、主页拒绝日志、发送端超时           |
| MessageChannel     | 建立端口、转移 buffer、失败、静默、关闭及重建 | 两端端口日志、发送端 detached buffer、业务 ack      |

消息与结构校验详见笔记。日志使用 `textContent` 按发生顺序追加，最多 120 条，包含 UTC 时间戳和文档执行身份；刷新会产生新身份。HTTP 响应使用 `no-store`，终端只记录请求与响应，不能证明浏览器执行或业务处理。

实验仅写 `communication-lab-v1` 这个 localStorage key，不清空其他存储；可用「删除实验 key」清理。频道、worker 名称也固定为 `communication-lab-v1`，同一浏览器配置中的其他实验页可能参与，测试前关闭多余页面。
