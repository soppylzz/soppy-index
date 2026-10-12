# 认证、授权与会话

## 1. 三个问题

认证回答“请求方是谁”；授权回答“它能做什么”；会话把多次请求关联到已认证主体。登录时服务端验证凭据（密码、通行密钥、外部身份等），建立会话；后续每次请求用会话标识查状态，再按资源和动作授权。前端隐藏按钮只是体验，服务端仍要检查权限和对象所有权。

```text
POST /login（验证凭据）→ 生成随机 session ID → Set-Cookie
GET /account（Cookie）→ 查会话 → 查用户与权限 → 返回数据
POST /logout → 服务端撤销会话 → 清 Cookie
```

会话 ID 应是不可预测的不透明随机值，而不是用户 ID。登录后轮换既有会话可防会话固定；退出和过期要在服务端生效，单纯删浏览器 Cookie 不会撤销被复制的凭据。分布式部署可用共享会话存储；演示里的内存 Map 只适合单进程学习。

## 2. 密码与浏览器凭据

密码必须用适合密码的慢哈希算法和每用户随机 salt 存储；SHA-256 单次哈希不够。现实项目还需要限速、异常登录监测、重置流程、MFA/通行密钥等。Cookie 加 `HttpOnly`、`Secure`、`SameSite`，并根据部署选择 `__Host-` 前缀；HTTPS 是前提。`HttpOnly` 防直接读取 Cookie，不防 XSS 使用当前会话操作接口。

## 3. Session 与 token

Session 常是浏览器持有不透明 ID，服务端查状态；access token 是资源服务器接受的授权凭据，可能是 JWT 或不透明字符串。二者都是 bearer 凭据，谁拿到谁可能使用；令牌格式不自动决定安全性。session 便于即时撤销，签名 JWT 便于离线验证，但撤销、密钥轮换、权限变化仍需设计。refresh token 用于换取新的 access token，通常比短期 access token 更需严格保护。

资料：[OWASP Authentication](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html)、[OWASP Session Management](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html)、[OWASP Password Storage](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html)。
