# Cookie 实验走查

[主题目录](./README.md) · [知识笔记](./cookie.md) · [实现](./index.ts)

[同目录的 `index.ts`](index.ts) 用零依赖的 `node:http` 起了两个"站点"：受害方 bank 运行在 `http://localhost:3000`，攻击方 evil 运行在 `http://127.0.0.1:3001`（两者 host 不同，构成真实跨站）。bank 提供两种登录变体：

| 登录变体   | Set-Cookie                                      |
| ---------- | ----------------------------------------------- |
| `legacy`   | `sid=…; Path=/; SameSite=None; Secure`          |
| `hardened` | `sid=…; Path=/; Secure; HttpOnly; SameSite=Lax` |

在仓库根目录使用 Node >= 22.18 运行，按 `Ctrl+C` 停止服务：

```bash
node docs/browser/storage/cookie/index.ts
```

CLI 仅在两个服务都监听成功后输出地址、操作步骤和观察方式；终端记录状态码、Cookie 携带与 Origin，浏览器 Network 用于查看 Cookie/Set-Cookie。两个服务都只监听本机，页面和重定向响应使用 `no-store`。

默认端口被占用时可在仓库根目录切换，按 `Ctrl+C` 同时停止两个服务：

```bash
BANK_PORT=3002 EVIL_PORT=3003 node docs/browser/storage/cookie/index.ts
```

保持 bank 使用 localhost、evil 使用 127.0.0.1；端口改变不会改变这组跨站关系。浏览器策略也可能额外限制 Cookie，需结合实际请求判断。

下面对照表列出实验预期，需在实际浏览器中核对；本次没有新增实测记录。

在 Chrome/Firefox 中打开 bank 首页登录一个变体，再到 evil 控制台依次执行四个攻击，然后换一个变体重复，对比结果：

| evil 攻击页        | 请求形态                      | `legacy`              | `hardened`              | 结论                              |
| ------------------ | ----------------------------- | --------------------- | ----------------------- | --------------------------------- |
| 攻击 1 `/csrf`     | 跨站顶级 POST 表单            | Cookie 附带，转账执行 | Cookie 不附带，转账被拒 | `SameSite=Lax` 拦截               |
| 攻击 2 `/img-get`  | 跨站 GET 子资源（img）        | Cookie 附带，赠送执行 | Cookie 不附带，赠送被拒 | `SameSite=Lax` 拦截               |
| 攻击 3 `/link-get` | 跨站顶级 GET 导航             | Cookie 附带，赠送执行 | Cookie 仍附带，赠送执行 | Lax 放行顶级 GET，只能靠 GET 只读 |
| 攻击 4 `/comment`  | bank 页面内反射 XSS 读 Cookie | `sid` 被回传窃取      | 读到空值                | `HttpOnly` 拦截                   |

终端会打印每个请求是否携带 Cookie（`cookie=sid…` / `cookie=absent`）以及 Origin 头，可对照观察。

> 必须用 `127.0.0.1` 打开 evil 页面：端口不参与 site 计算，若 evil 也用 `localhost:3001` 打开，它与 bank 同站，SameSite 不会拦截，演示会失真。`Secure` 的"拒绝在非安全通道发送"无法在 localhost 上演示（localhost 被视为安全上下文），需要真实 HTTP 站点才能观察到差异。

## 验证边界

本页保留已有实验的操作与预期，不将其自动视为本次浏览器实测。本次调整文档结构和代码摘录，没有重新执行这些存储实验；浏览器策略与实际结果仍需按步骤观察。
