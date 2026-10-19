# URL：从返回地址到服务端出站请求

字符串可以被解析为站内路径，也可以指向另一个主机。导航和服务器抓取虽然都接收 URL，却跨越了不同边界。

## 返回地址从字符串变成导航目标

开放重定向常见于 `?next=`：登录后直接跳向攻击者地址，会帮助钓鱼或泄漏授权结果。只接受站内相对路径，或把绝对地址与精确允许列表比较；解析前后都要考虑编码、斜杠、用户名段和规范化。服务端代用户抓取 URL 则进一步产生 SSRF 风险，需限制目标、解析后地址、重定向链及私网/元数据端点；仅用字符串前缀检查不可靠。SSRF 发生在服务端发起连接这一侧，浏览器 CORS 不会替服务器限制目标。

```js
function safeReturnPath(value) {
  if (!value?.startsWith("/") || value.startsWith("//")) return "/"
  const url = new URL(value, "https://app.example")
  return url.origin === "https://app.example" ? `${url.pathname}${url.search}` : "/"
}
```

示例只演示把返回地址约束到当前站点；真实应用还要按产品规则限制允许路径，阻止反斜杠或多重编码造成的解析差异，避免把授权码、token 等放进可跳转 URL。

## 为什么允许列表需要跟随实际连接

服务端抓取远程头像时，不只要检查输入域名，还要处理 DNS 解析结果、重定向后的地址和实际出站路径。DNS rebinding、IPv6 与代理配置可能使一次字符串检查失效；网络层出站限制可与应用层策略配合。示例的站内返回路径校验不是 SSRF 防护实现。

参考：[OWASP SSRF Prevention](https://cheatsheetseries.owasp.org/cheatsheets/Server_Side_Request_Forgery_Prevention_Cheat_Sheet.html)、[Unvalidated Redirects](https://cheatsheetseries.owasp.org/cheatsheets/Unvalidated_Redirects_and_Forwards_Cheat_Sheet.html)。
