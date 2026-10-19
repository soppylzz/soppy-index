# TLS 1.2 与 1.3：怎样确认身份并得到共享密钥

TCP 建连只说明两端建立了传输通道，不能证明对方就是你想访问的网站。TLS 在不安全的网络上协商密钥、验证身份，并保护后续数据的机密性和完整性。HTTPS 将 HTTP 放在这种安全通道中；HTTP/3 则由 QUIC 承载 TLS 1.3 握手。

## 证书、密钥交换、加密分别做什么

证书把域名等身份信息与公钥关联，通过 CA 签名和信任链帮助客户端验证。客户端还要检查域名、有效期、算法和本地信任策略。收到证书不等于认证完成，对端还需按协议证明拥有相应私钥。

密钥交换使双方得到共享秘密，再派生方向和用途不同的流量密钥。对大量应用数据的保护通常使用高效的对称认证加密。不要把 HTTPS 概括成“用证书公钥加密所有 HTTP 数据”。

临时 Diffie–Hellman 类密钥交换提供前向保密：仅在事后泄露证书长期私钥，不应恢复已经完成并销毁临时秘密的历史会话。TLS 1.2 可以使用 ECDHE 实现这个性质，并不是只有 1.3 才有。

## TLS 1.2：以 ECDHE 完整握手为例

下面省略客户端证书认证、部分扩展和会话恢复。箭头表示消息方向，不保证每行对应一个网络包。

```text
Client                                      Server
ClientHello                         →
                                    ← ServerHello
                                      Certificate
                                      ServerKeyExchange
                                      ServerHelloDone
ClientKeyExchange
ChangeCipherSpec
Finished                            →
                                    ← ChangeCipherSpec
                                      Finished
Application Data                    ↔ Application Data
```

服务端通过 ServerKeyExchange 提供临时 ECDHE 参数并签名；客户端发送自己的密钥交换参数，双方派生密钥。Finished 验证握手过程，ChangeCipherSpec 切换到协商的保护状态。常规完整握手在 TCP 之外通常需要约 2 RTT，具体消息调度会影响观察。

TLS 1.2 也曾支持静态 RSA 密钥交换：客户端用证书公钥加密预主秘密。这不是上面 ECDHE 的流程，也不具有同样的前向保密性质。证书采用 RSA 签名，不等于一定采用 RSA 密钥交换；例如 ECDHE_RSA 用 ECDHE 交换秘密，以 RSA 做认证签名。

## TLS 1.3：把密钥份额提前发送

```text
Client                                      Server
ClientHello + key_share              →
                                    ← ServerHello + key_share
                                      {EncryptedExtensions}
                                      {Certificate}
                                      {CertificateVerify}
                                      {Finished}
{Finished}                           →
[Application Data]                   ↔ [Application Data]
```

客户端在首次 Hello 中就带临时密钥份额，服务端可以直接协商秘密。ServerHello 后的大部分握手内容已经加密，CertificateVerify 对握手上下文签名，Finished 用派生密钥验证完整性。没有 HelloRetryRequest 的常规完整握手通常约 1 RTT；不能省略这些条件就说“1.3 永远只要一次往返”。

TLS 1.3 删除静态 RSA 密钥交换及旧式 CBC 等选择，仅保留 AEAD 类记录保护。密码套件主要指定 AEAD 与哈希，密钥交换组、签名算法通过其他参数协商，不能直接沿用 1.2 套件名称的拆法。兼容用 ChangeCipherSpec 可能出现在抓包中，但不承担 1.2 的密钥切换职责。

| 比较点            | TLS 1.2         | TLS 1.3            |
| ----------------- | --------------- | ------------------ |
| 常规完整握手      | 通常 2 RTT      | 通常 1 RTT         |
| 静态 RSA 密钥交换 | 历史上支持      | 删除               |
| 记录保护          | 多种历史选择    | AEAD               |
| 证书消息          | 常规握手中明文  | ServerHello 后加密 |
| 恢复时的早期数据  | 无 1.3 式 0-RTT | 可选 0-RTT         |

表中的时延不含 TCP 建连和 DNS。正确配置的 TLS 1.2 ECDHE + AEAD 不应被简单描述成“没有安全性”，1.3 的意义还包括减少历史选项与改进握手设计。

## 会话恢复和 0-RTT 不要混为一谈

TLS 1.2 的恢复握手可以缩短到约 1 RTT。TLS 1.3 可通过先前获得的票据和 PSK 恢复，并可结合新的 (EC)DHE；也存在不结合新 DH 的 PSK 模式，前向保密性质需据此区分。

TLS 1.3 的 0-RTT 是可选早期数据能力，不是所有新连接都能使用。客户端依赖之前的状态提前发数据，服务端可能拒绝，数据也有重放风险，且早期数据不具有新一轮临时 DH 带来的前向保密。扣款、创建订单等不能仅因使用 HTTPS 就允许无条件早发。即使 GET 在规范中是安全方法，也必须确认实际业务没有副作用并满足重放策略。

## SNI、ALPN 与证书分别回答什么

SNI 帮服务器选择虚拟站点和证书；ALPN 协商 `h2`、`http/1.1` 等应用协议；客户端再验证证书是否匹配目标身份。DNS 解析到某个 IP 不会代替这些步骤。

TLS 1.3 不会自动隐藏全部元数据：IP 仍可见，普通 ClientHello 中的 SNI 也可能可见。ECH 用于保护 ClientHello 敏感部分，是否生效取决于实际支持和配置。HTTPS 也不防止应用自己的 XSS、越权或虚假内容；CDN 终止 TLS 时，它是客户端这一段的解密端。

## 用 CLI 看版本与验证结果

```bash
openssl s_client -connect example.com:443 -servername example.com -tls1_2 -verify_hostname example.com -verify_return_error
openssl s_client -connect example.com:443 -servername example.com -tls1_3 -verify_hostname example.com -verify_return_error
```

这要求本机 OpenSSL 支持对应选项，系统内置实现可能不同。比较协议版本、套件、证书链和验证结果；只看到握手输出不等于所有身份检查都通过。失败也可能是服务端不支持该版本。日常 HTTP 排障优先使用会验证证书的 `curl -v`，不要把 `-k` 跳过验证当成修复。

资料：[RFC 5246（TLS 1.2）](https://www.rfc-editor.org/rfc/rfc5246)、[RFC 8446（TLS 1.3，握手与差异说明）](https://www.rfc-editor.org/rfc/rfc8446)、[RFC 9325（TLS 使用建议）](https://www.rfc-editor.org/rfc/rfc9325)、[RFC 7301（ALPN）](https://www.rfc-editor.org/rfc/rfc7301)。
