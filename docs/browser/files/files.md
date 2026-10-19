# Blob、File 与 Object URL：字节读取与引用生命周期

选择了一个文件之后，页面为什么能读取它，却不能任意打开另一个磁盘路径？文件选择授予的是所选文件的访问入口。File、Blob 和 Object URL 分别表示文件信息、字节内容以及浏览器维护的访问引用，需要按不同职责理解。

## Blob 保存字节，File 增加文件信息

Blob 是不可变的字节数据；File 在其上增加 name、lastModified 等信息。文件名不是可任意访问的本地路径，声明 MIME 类型也不等于浏览器已经校验了文件内容。

Blob 的 `text()`、`arrayBuffer()`、`stream()` 分别提供文本、完整二进制和流式读取方式。FileReader 提供事件式读取，需要处理 load、error 和 abort。对象与读取规则见 [File API](https://w3c.github.io/FileAPI/)。

```js
const blob = new Blob(["Local browser content"], {
  type: "text/plain;charset=utf-8",
})
const text = await blob.text()
console.log(blob.size, blob.type, text)
```

这一步只在浏览器本地生成并读取字节，没有网络上传。对于大文件，应考虑分片、流、编码和内存开销；读取完整文本后再截断日志，并不能减少前面的完整读取成本。

## Object URL 是引用，不是又一份文件

```js
const objectUrl = URL.createObjectURL(blob)
try {
  const response = await fetch(objectUrl)
  const text = await response.text()
  console.log(text)
} finally {
  URL.revokeObjectURL(objectUrl)
}
```

浏览器为 Blob 建立一个 `blob:` URL，使需要 URL 的消费者可以访问它。这不是将文件上传到服务器，也不是可长期保存、分享给其他设备的持久地址。

上述片段只有一次读取，完成后可以释放。如果 URL 还供图片或下载链接使用，应按这些消费者的生命周期决定何时 revoke，不能直接照搬“发起操作后立即释放”。创建与撤销规则见 [File API：Blob URL](https://w3c.github.io/FileAPI/#creating-revoking)。

## 释放访问入口，不会清除已获得的数据

revoke 使后续不能再通过该 URL 取得资源，但不使已经获得的 Blob 字节失效。应用还需要移除或更新失效的 href / src，避免界面继续提供已释放入口。

一个可维护的流程是：创建新 URL 前先处理旧引用；消费者不再需要时释放；页面或组件清理时释放仍持有的 URL。若异步读取可能交错，还应确认返回的结果仍属于当前选择，避免旧文件覆盖新界面。

## 实验把选择、读取和释放分开

`/files` 提供 Blob.text、FileReader 和 Object URL 三条真实路径。文件选择只读取不超过 64 KiB 的文件，日志最多显示前 120 个字符，不上传用户文件；下载是否最终保存仍由用户与浏览器决定。

实际页面应保留下载 URL，直到显式释放、替换或断开；释放时也移除下载 href。快速切换选择时，还应校验当前操作身份，避免旧异步结果覆盖新状态。
