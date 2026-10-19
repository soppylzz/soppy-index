# FormData：字段、文件与 multipart 边界

把文件和标题一起发给服务端，为什么不应手写 `Content-Type: multipart/form-data`？因为 multipart 不只是一个类型名称，请求体还需要与标头一致的分隔符 boundary。使用 FormData 作为 fetch 的 body 时，应让浏览器生成这一对相互匹配的信息。

## 一个字段名可以对应多个条目

FormData 表示字段与文件条目的序列。`append()` 增加条目，可保留同名多值；`set()` 则替换该字段已有的值。接收端是否把它解释成数组或单值，由接口约定和解析方式决定。

```js
const data = new FormData()
data.append("title", "Browser form")
data.append("tag", "browser")
data.append("tag", "network")
data.append("file", new Blob(["demo"], { type: "text/plain" }), "demo.txt")

const response = await fetch("/api/inspect", {
  method: "POST",
  body: data,
})
```

Blob 提供字节，最后的文件名提供该条目的文件名信息；它不会让浏览器去读取同名磁盘文件。用户选取的 File 也可作为条目值，File 与 Blob 的关系见[文件与 Object URL](../files/files.md)。

## 请求体格式与标头必须一起决定

上例没有手写 Content-Type。浏览器将 FormData 编码为 multipart 请求体，并在标头中带上对应 boundary；只写类型名而缺少正确 boundary，服务端就可能无法划分字段。编码规则见 [Fetch Standard：BodyInit 提取](https://fetch.spec.whatwg.org/#concept-bodyinit-extract)。

若接口要求 JSON，应按该协议序列化并设置 JSON 类型；不要因为内容都来自表单，就假设每个接口都接受 multipart。字段顺序、重复值和文件如何处理也应在接口层明确。

## 收到字节，不等于字段已通过校验

实验 `/api/inspect` 最多接收 65536 字节，只回显 contentType 和 bytes。它能用于观察浏览器是否生成 boundary、服务是否收到 body，却没有解析 multipart、校验字段、保存文件或提交业务。

因此，看到 bytes 大于 0，只能确认这条接收路径取得了字节。请求状态与响应体读取仍按 [fetch 的分层模型](./fetch.md)判断。以上是请求与接收流程的示意，需要真实服务端配合才能验证字节到达。
