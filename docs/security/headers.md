# 安全响应头：每个头负责哪条边界

| 头或机制                                                      | 主要作用                                                  | 常见误用                                                       |
| ------------------------------------------------------------- | --------------------------------------------------------- | -------------------------------------------------------------- |
| `Content-Security-Policy`                                     | 限制页面可执行/加载的资源；`frame-ancestors` 限制谁可嵌入 | 以为白名单能修复所有 XSS；无测试直接上严格策略导致业务脚本失效 |
| `Strict-Transport-Security`                                   | 浏览器记住该站应走 HTTPS                                  | 在未确认所有子域 HTTPS 就加 `includeSubDomains`/预加载         |
| `X-Content-Type-Options: nosniff`                             | 限制某些资源 MIME 嗅探                                    | 当作内容校验或下载安全策略                                     |
| `Referrer-Policy`                                             | 控制导航/请求暴露的 Referer 信息                          | 以为它能隐藏 URL 中的全部敏感信息                              |
| `Permissions-Policy`                                          | 限制页面或 iframe 可用的浏览器能力                        | 误以为替代用户授权或服务端授权                                 |
| `Cross-Origin-Opener-Policy` / `Cross-Origin-Embedder-Policy` | 控制跨源窗口隔离、资源嵌入策略                            | 未评估第三方资源就启用，造成集成失败                           |

## 1. CSP 从可部署策略开始

一个简化的策略示意：

```http
Content-Security-Policy: default-src 'self'; script-src 'self' 'nonce-<per-response-random>'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'
```

nonce 必须每个响应不可预测地生成并匹配受信任的脚本标签；不要把固定 nonce 写进构建产物。实际项目还需明确 `connect-src`、`img-src`、`style-src` 等业务依赖，先用 `Content-Security-Policy-Report-Only` 观察违规，再逐步强制。`frame-ancestors` 限制别人嵌入本页；`frame-src` 管本页嵌入谁，不能互换。旧的 `X-Frame-Options` 可作为兼容性补充。

## 2. HTTPS 相关头

HSTS 只在可信 HTTPS 响应中生效，首次访问仍需通过 HTTPS 重定向或预加载降低风险。`Secure` Cookie 约束 Cookie 发送，HSTS 约束浏览器访问站点时使用 HTTPS，两者互补。跨源隔离头适合需要 SharedArrayBuffer 等能力的页面，但启用会影响第三方脚本、iframe 与弹窗关系，要先盘点资源。

资料：[MDN CSP](https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/CSP)、[RFC 6797（HSTS）](https://www.rfc-editor.org/rfc/rfc6797)、[OWASP HTTP Headers Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/HTTP_Headers_Cheat_Sheet.html)。
