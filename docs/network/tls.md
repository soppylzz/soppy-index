# TLS 与 HTTPS：先验证身份，再谈加密

## 1. TLS 提供什么

TLS 为传输中的数据提供机密性与完整性，并通过证书验证服务器身份。它不保证应用内容真实、不消除 XSS，也不隐藏访问目标的全部元数据。HTTPS 是在 HTTP 与传输之间使用 TLS；HTTP/3 中 TLS 1.3 握手由 QUIC 承载。

浏览器验证证书时，至少关心信任链、有效期、域名匹配及算法/策略。证书证明连接到被信任 CA 签发给该域名的密钥持有者，不证明网页上的商品或文章可信。SNI 帮助服务器选择证书；传统 SNI 本身可能暴露域名。ECH 旨在加密客户端 Hello 中的敏感信息，但能否使用依赖双方和网络支持。

## 2. TLS 1.3 握手主线

```text
ClientHello：支持版本、密码套件、key_share、SNI、ALPN
ServerHello：选择参数与 key_share
随后双方基于协商密钥加密握手消息；服务端发送证书与证明
客户端验证证书与握手 transcript，再交换 Finished
之后用应用流量密钥保护 HTTP 数据
```

核心是临时密钥协商和认证：即使有人录下密文，事后取得服务器证书私钥也不应还原使用临时密钥的既往会话，这叫前向保密。TLS 1.3 不再沿用旧版 RSA 密钥交换。ALPN 在 TLS 中协商 `h2`、`http/1.1` 等应用协议；HTTP/3 的协商通常结合 QUIC 与 Alt-Svc/HTTPS 记录。

恢复会话能减少握手成本；0-RTT 可提前发送应用数据，但可能被重放。因此只应让能安全承受重放的操作使用早期数据，服务器也应有相应策略。不能把“HTTPS 使用 0-RTT”当作所有连接的默认事实。

## 3. 一次可解释的实验

```bash
openssl s_client -connect example.com:443 -servername example.com -alpn h2
curl -v --http2 https://example.com/
```

观察证书链、协商版本、ALPN 与证书域名。`-servername` 让 SNI 与目标域名一致；去掉它可能得到不同的证书。检查失败时先分辨时间、信任链、主机名、协议版本，再看代理是否在中间终止 TLS。不要把抓到的 TLS Application Data 当成可直接在 Wireshark 中读到 HTTP 明文；解密需要会话密钥，并须在你有权的环境中进行。

资料：[RFC 8446（TLS 1.3）](https://www.rfc-editor.org/rfc/rfc8446)、[RFC 7301（ALPN）](https://www.rfc-editor.org/rfc/rfc7301)、[RFC 9849（ECH）](https://www.rfc-editor.org/rfc/rfc9849)。
