# Next.js SSR 登录与会话实验

此实验使用 Next.js App Router 的 Server Component 和 Route Handler，展示本地账号登录后如何建立不透明会话。它不是 OAuth/OIDC 身份提供方实验；跨系统授权流程见 [OAuth/OIDC](../oauth-oidc.md)。演示账号只供本机学习，服务端会话保存在进程内存中，重启即失效。

## 启动

需要 Node >= 22.18。第一次运行：

```bash
cd docs/auth/demo
pnpm install --frozen-lockfile
pnpm dev
```

访问 <http://127.0.0.1:3000/>。按 `Ctrl+C` 停止。若 3000 端口被占用，停止占用进程后再启动。生产构建可运行 `pnpm build`，但本实验的内存会话、固定演示账号、缺少持久化和限速机制只适合本地单进程学习。

## 观察步骤

| 操作 | 预测 | 原因 |
| --- | --- | --- |
| 未登录打开 `/account` 与 `/api/me` | 页面跳到 `/login`，API 返回 401 | 服务端逐入口查询会话 |
| 用页面给出的演示凭据登录 | POST 返回 303，响应设置 Cookie，随后能访问账户页 | Route Handler 验证凭据后生成随机会话 ID |
| 在 DevTools 查看 Cookie | `HttpOnly`、`SameSite=Lax`，开发环境 HTTP 下无 `Secure` | 让浏览器自动带会话，但不让页面 JS 直接读取 |
| 在账户页退出 | POST 返回 303 并清 Cookie；旧 Cookie 再访问 API 也返回 401 | 服务端先撤销会话，再清浏览器副本 |
| 篡改退出表单的隐藏 `csrf` 值 | 403，会话仍有效 | 服务端把随机 token 与当前会话绑定校验 |
| 从其他源提交登录/退出 POST | 403 | POST Route Handler 校验 Origin |

用 DevTools Network 查看请求、重定向和 Set-Cookie；Application/Storage 面板看 Cookie 属性。`HttpOnly` Cookie 仍会随合适请求发送，只是 `document.cookie` 看不到。状态码和头是预测，只有实际运行后才能当作观察结果。

## 代码读法

[登录 Route Handler](app/api/login/route.ts) 在验证后创建会话：

```ts
revokeSession(request.cookies.get(sessionCookieName)?.value)
const { token } = createSession()
response.cookies.set(sessionCookieName, token, { httpOnly: true, sameSite: "lax", path: "/" })
```

片段省略了 Origin、密码与环境相关 `Secure` 检查，完整代码以源文件为准。撤销旧会话避免登录前已有会话继续有效；实际项目还应有持久化会话存储和异常登录限制。

[受保护页面](app/account/page.tsx) 在服务端读取 Cookie 并决定是否渲染；[受保护 API](app/api/me/route.ts) 独立再校验一次。页面重定向不能替代 API 授权。退出时 [Route Handler](app/api/logout/route.ts) 同时检查 Origin、会话和表单 CSRF token，然后撤销服务端记录。会话 token 只存哈希索引；Cookie 中的原始 token 不进入页面 HTML。

## 范围与限制

这是一组同源、单实例、固定账号的受控实验，重点是 SSR、Cookie、会话和 CSRF 边界。生产登录还需数据库、每用户密码哈希与 salt、速率限制、审计、密码重置、MFA、HTTPS、共享会话存储及失效策略。若要展示 OAuth，应另接可信身份提供方并完成授权码 + PKCE、state、OIDC nonce/ID token 验证，不能把此实验的本地账号流程称为 OAuth。
