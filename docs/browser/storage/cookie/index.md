# Cookie 实验走查

[主题目录](./README.md) · [知识笔记](./cookie.md) · [实现](./index.ts)

公共模块迁移后的知识 / demo 对应复核与实际运行记录见[集中验证](../../../demo/validation.md)；下方早期记录保留各自的环境与覆盖边界。

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

下面对照表列出实验预期，前提是 bank 的 sid 已成功设置、当前未过期，并且浏览器允许对应上下文使用该 Cookie。第三方 Cookie 拦截可能让 legacy 子资源请求也不携带 sid，不能据此推断 SameSite=None 与 Lax 等效。本次没有新增实测记录。

在 Chrome/Firefox 中打开 bank 首页登录一个变体，再到 evil 控制台依次执行四个攻击，然后换一个变体重复，对比结果：

| evil 攻击页        | 请求形态                      | `legacy`              | `hardened`                | 结论                                               |
| ------------------ | ----------------------------- | --------------------- | ------------------------- | -------------------------------------------------- |
| 攻击 1 `/csrf`     | 跨站顶级 POST 表单            | Cookie 附带，转账执行 | Cookie 不附带，转账被拒   | `SameSite=Lax` 拦截                                |
| 攻击 2 `/img-get`  | 跨站 GET 子资源（img）        | Cookie 附带，赠送执行 | Cookie 不附带，赠送被拒   | `SameSite=Lax` 拦截                                |
| 攻击 3 `/link-get` | 跨站顶级 GET 导航             | Cookie 附带，赠送执行 | Cookie 仍附带，赠送执行   | Lax 放行顶级 GET，只能靠 GET 只读                  |
| 攻击 4 `/comment`  | bank 页面内反射 XSS 读 Cookie | 可读取并尝试回传 sid  | 可读结果不含 HttpOnly sid | HttpOnly 隐藏该 Cookie，其他可见 Cookie 不一定为空 |

终端会打印每个请求是否携带 Cookie（`cookie=sid…` / `cookie=absent`）以及 Origin 头，可对照观察。

建议按“登录响应 Set-Cookie → 浏览器保存及阻止原因 → 请求 Cookie → 服务端处理分支”逐层检查。Origin 出现在日志中不代表服务端已经校验它；本实验故意没有实现 CSRF 校验。表中的“转账 / 赠送执行”指进入教学成功分支，源码没有真实账本；XSS 回传则需查看 evil 的 collect 请求，不能只凭页面生成了脚本就认定已到达。

> 必须用 127.0.0.1 打开 evil 页面：端口不参与 site 计算，若 evil 也用 localhost:3001 打开，它与 bank 同站，不能继续作为跨站对照。本实验两种 Cookie 都带 Secure，且依赖浏览器的 localhost 例外，不提供 Secure 的独立传输对照；若 Cookie 未被接受，先解决该前提，不将后续 cookie=absent 全部归因于 SameSite。

## 验证边界

本页保留已有实验的操作与预期，不将其自动视为本次浏览器实测。本次调整文档结构和代码摘录，没有重新执行这些存储实验；浏览器策略与实际结果仍需按步骤观察。
