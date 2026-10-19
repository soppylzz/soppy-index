# HTTP 实验：传输、业务确认和取消

[完整服务](demo/lib/handler.ts) · [浏览器实现](demo/public/assets/lab.js)

先按“发送字节 → 服务端验证 → 客户端核对确认”的顺序读[HTTP 机制](./server.md)，再操作页面。每次点击只说明本次请求的观察，取消后的远端状态仍需另行确认。

## 运行

在仓库根目录使用 Node >= 22.18：

```bash
pnpm install
pnpm --filter node-http-next-lab dev
```

打开 <http://127.0.0.1:5030/>，按 `Ctrl+C` 停止。构建后运行使用同一 filter 的 `build`、`start`。端口由 Next CLI 管理；需要覆盖时执行 `pnpm --filter node-http-next-lab exec next dev -H 127.0.0.1 -p 5031`。

[完整 Route Handler](./demo/lib/handler.ts)使用 Web Request/Response 与 ReadableStream；它运行在 Node runtime，监听与 socket 生命周期交给 Next.js。页面资源与 HTTP 工具位于本实验内部。

## 操作顺序

| 按钮 | 实际请求 | 预期与证据 |
| --- | --- | --- |
| 合法 JSON | POST /echo，id+中文text | 200；浏览器解析并核对id、accepted后才显示业务确认 |
| 非法结构 | text为数字 | 422，无业务ack |
| 超过512字节 | 600字符字符串加JSON | 413，不累积无限body |
| 取消慢响应 | GET /slow，50ms后abort | AbortError；服务端 request.signal 取消300ms下游等待 |
| 读取真实响应流 | GET /stream | 三次 enqueue，浏览器记录实际读到的块与总字节，块边界不保证一一对应 |
| 取消在途操作 | abort所有当前controller | 状态回到无在途，不声称远端已经回滚 |

打开Console和服务终端对照。页面identity区分文档，业务id关联一次发送和ack，服务requestId关联服务处理。断开/离开页面清理在途请求和计时器；页面按钮可继续发起新请求，没有自动重发或非幂等重试。并发点击各自持有controller，不能让后一次请求覆盖前一次的取消句柄。

## 手动协议验证

```bash
curl -i http://127.0.0.1:5030/health
curl -i -H 'Content-Type: application/json' -d '{"id":"manual-1","text":"hello"}' http://127.0.0.1:5030/echo
curl -i -H 'Content-Type: application/json' -d '{"id":"manual-2","text":42}' http://127.0.0.1:5030/echo
curl -i -X POST http://127.0.0.1:5030/health
```

第二次得到匹配ack，第三次422，第四次405。curl只验证HTTP协议，不能替代页面脚本执行/日志证据。

## 实测与限制

见 [本实验测试](./demo/__test__/routes.test.ts)。未覆盖TLS、HTTP/2、反向代理、真实数据库取消、长时间慢速攻击和生产认证。本地有界流只说明背压接口使用，不能当网络吞吐性能结论。
