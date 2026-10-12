# HTTP 传输细节：长度、编码、范围与条件

## 1. 先定消息边界，再解内容

HTTP/1.1 要知道响应体在哪里结束：`Content-Length` 给出字节数，`Transfer-Encoding: chunked` 用块边界编码，某些旧式响应以连接关闭结束。消息边界处理不一致可能形成请求走私风险，因此代理和源站必须遵循规范并拒绝歧义组合。HTTP/2/3 用帧表示消息边界，不沿用 H1 的 chunked；但经过 H2/H1 网关时仍需正确转换。

`Content-Encoding: gzip` 表示表示数据经过压缩；`Content-Type: application/json` 表示解压后如何解释；`Transfer-Encoding` 只关乎 HTTP/1.1 消息在该跳的传输编码。浏览器通常自动解压，DevTools 中的传输大小和资源大小可能不同。压缩有 CPU 代价，对已经压缩的图片/视频收益小；敏感数据与攻击者可控文本混在同一压缩上下文还可能产生侧信道风险。

## 2. 范围请求和断点续传

```http
GET /movie.mp4 HTTP/1.1
Range: bytes=1000-1999
```

若服务器支持并满足范围，返回 `206 Partial Content`，带 `Content-Range: bytes 1000-1999/总长度`；不支持时可返回完整 `200`，请求范围无效时可能返回 `416`。客户端续传应验证资源未变化，可用 `If-Range` 搭配强 ETag 或日期；否则把不同版本的片段拼接会损坏文件。多范围响应使用 multipart 格式，别把一个 Range 头等同于只有一段。

## 3. 内容协商和条件请求

`Accept`、`Accept-Language`、`Accept-Encoding` 表达客户端可接受的表示；服务器可选其中一种并用 `Vary` 告知缓存哪些请求字段影响选择。`ETag` 是表示版本标识，强/弱验证器语义不同；`If-None-Match` 常用于 GET 缓存验证，`If-Match` 可做乐观并发控制：只有资源仍是指定版本才更新，否则返回 `412 Precondition Failed`。`304` 是“缓存的表示还可用”，不等于“没有网络请求”。

```http
PUT /document/7 HTTP/1.1
If-Match: "rev-12"
Content-Type: application/json

{"title":"新标题"}
```

若两个编辑者都从 `rev-12` 开始，先提交者更新版本，后提交者的条件不再成立。这能避免无意覆盖，但服务端必须原子地比较并更新。`If-Match` 是应用协作控制，不替代用户权限验证。

资料：[RFC 9110（条件请求与范围）](https://www.rfc-editor.org/rfc/rfc9110)、[RFC 9112（H1 消息）](https://www.rfc-editor.org/rfc/rfc9112)、[RFC 9111（缓存）](https://www.rfc-editor.org/rfc/rfc9111)。
