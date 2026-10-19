# Cookie 实验走查

[Route Handler](demo/lib/handler.ts) 通过两个 Next.js 进程提供两个站点：受害方 bank 运行在 `http://localhost:3000`，攻击方 evil 运行在 `http://127.0.0.1:3001`（两者 host 不同，构成真实跨站）。bank 提供两种登录变体：

| 登录变体   | Set-Cookie                                      |
| ---------- | ----------------------------------------------- |
| `legacy`   | `sid=…; Path=/; SameSite=None; Secure`          |
| `hardened` | `sid=…; Path=/; Secure; HttpOnly; SameSite=Lax` |

在仓库根目录使用 Node >= 22.18 运行，按 `Ctrl+C` 停止服务：

```bash
pnpm install --frozen-lockfile
pnpm --filter cookie-next-lab dev
```

银行与攻击者分别使用两个终端；另一终端执行：

```bash
pnpm --filter cookie-next-lab dev:evil
```

每个终端用 `Ctrl+C` 停止自己的服务。换端口时，两个进程的链接配置和各自 Next CLI 监听端口必须一致，例如：

```bash
BANK_PORT=3002 EVIL_PORT=3003 pnpm --filter cookie-next-lab exec next dev -H 127.0.0.1 -p 3002
LAB_ROLE=evil BANK_PORT=3002 EVIL_PORT=3003 pnpm --filter cookie-next-lab exec next dev -H 127.0.0.1 -p 3003
```

这两条命令分别在两个终端运行。终端记录响应创建阶段的状态、Cookie 是否存在及 Origin；浏览器 Network 才能显示实际 Cookie/Set-Cookie。两边页面和重定向使用 no-store。

保持 bank 使用 localhost、evil 使用 127.0.0.1；端口改变不会改变这组跨站关系。浏览器策略也可能额外限制 Cookie，需结合实际请求判断。

下面对照表列出实验预期，前提是 bank 的 sid 已成功设置、当前未过期，并且浏览器允许对应上下文使用该 Cookie。第三方 Cookie 拦截可能让 legacy 子资源请求也不携带 sid，不能据此推断 SameSite=None 与 Lax 等效。本次没有新增实测记录。

在 Chrome/Firefox 中打开 bank 首页登录一个变体，再到 evil 控制台依次执行四个攻击，然后换一个变体重复，对比结果：

| evil 攻击页 | 请求形态 | `legacy` | `hardened` | 结论 |
| --- | --- | --- | --- | --- |
| 攻击 1 `/csrf` | 跨站顶级 POST 表单 | Cookie 附带，转账执行 | Cookie 不附带，转账被拒 | `SameSite=Lax` 拦截 |
| 攻击 2 `/img-get` | 跨站 GET 子资源（img） | Cookie 附带，赠送执行 | Cookie 不附带，赠送被拒 | `SameSite=Lax` 拦截 |
| 攻击 3 `/link-get` | 跨站顶级 GET 导航 | Cookie 附带，赠送执行 | Cookie 仍附带，赠送执行 | Lax 放行顶级 GET，只能靠 GET 只读 |
| 攻击 4 `/comment` | bank 页面内反射 XSS 读 Cookie | 可读取并尝试回传 sid | 可读结果不含 HttpOnly sid | HttpOnly 隐藏该 Cookie，其他可见 Cookie 不一定为空 |

终端会打印每个请求是否携带 Cookie（`cookie=present` / `cookie=absent`）以及 Origin 头，可对照观察。

建议按“登录响应 Set-Cookie → 浏览器保存及阻止原因 → 请求 Cookie → 服务端处理分支”逐层检查。Origin 出现在日志中不代表服务端已经校验它；本实验故意没有实现 CSRF 校验。表中的“转账 / 赠送执行”指进入教学成功分支，源码没有真实账本；XSS 回传则需查看 evil 的 collect 请求，不能只凭页面生成了脚本就认定已到达。

> 必须用 127.0.0.1 打开 evil 页面：端口不参与 site 计算，若 evil 也用 localhost:3001 打开，它与 bank 同站，不能继续作为跨站对照。本实验两种 Cookie 都带 Secure，且依赖浏览器的 localhost 例外，不提供 Secure 的独立传输对照；若 Cookie 未被接受，先解决该前提，不将后续 cookie=absent 全部归因于 SameSite。

## 验证边界

本页保留已有实验的操作与预期，不将其自动视为本次浏览器实测。本次调整文档结构和代码摘录，没有重新执行这些存储实验；浏览器策略与实际结果仍需按步骤观察。

## 实现怎样控制实验条件

完整实现见 [Route Handler](demo/lib/handler.ts)。以下片段按源码流程精简，并将展示文字改为英文，用于解释实验输入和观察边界。

下面节选 [Route Handler](demo/lib/handler.ts) 的登录路由：由服务端选择两个 Cookie 属性组合，浏览器负责决定后续请求是否携带。

```ts
const variant = url.searchParams.get("variant") === "legacy" ? "legacy" : "hardened"
const id = `${variant}-${randomUUID().slice(0, 8)}`
headers.set(
  "Set-Cookie",
  variant === "legacy"
    ? `sid=${id}; Path=/; SameSite=None; Secure`
    : `sid=${id}; Path=/; Secure; HttpOnly; SameSite=Lax`
)
return sendRedirect("/")
```

`url`、`headers` 和 `sendRedirect` 来自 Route Handler；headers 随返回的 Response 一起交给框架。攻击页的关键输入是跨站表单和子资源，下面是服务端生成 HTML 中的核心元素，bank 默认地址为 localhost:3000：

```html
<form method="POST" action="http://localhost:3000/transfer">
  <input type="hidden" name="amount" value="10000" />
  <input type="hidden" name="to" value="attacker" />
  <button>Submit cross-site request</button>
</form>
```

实际模板从 `BANK` 配置生成地址，不能只改 form 而忽略双源配置。HttpOnly 对照则在 bank 页面中运行 `document.cookie` 并回传可读结果；它限制读取，不阻止脚本发起已认证请求。预期与观察位置见走查，不把生成了表单当成转账已执行的证据。

源码的 sessionOf 仅根据请求中的 sid 及其前缀选择实验变体，没有真实会话库；transfer 与 gift 分支展示教学响应或日志，没有真实转账、余额变更或持久账本。因此本 demo 能观察实际 Cookie 收发、脚本读取与服务端分支选择，不用于证明金融业务提交成功，也不是生产认证实现。两个登录变体同时改变 SameSite 与 HttpOnly，分析时按跨站请求和同源脚本读取分别归因；两者都有 Secure，不能用这组对照验证 Secure 的独立效果。

## 构建后运行

```bash
pnpm --filter cookie-next-lab build
pnpm --filter cookie-next-lab start
```

银行与攻击者使用独立构建目录。先构建银行，再执行 `LAB_ROLE=evil pnpm --filter cookie-next-lab build` 构建攻击者；分别在两个终端用 `start` 和 `start:evil` 启动。换端口时继续保持两个进程的 `BANK_PORT/EVIL_PORT` 与 Next CLI 监听端口一致。
