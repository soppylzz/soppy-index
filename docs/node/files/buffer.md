# Buffer：文本长度为什么不是传输字节数

“中😀”有两个 Unicode code point、3 个 UTF-16 code unit，编码成 UTF-8 则占 7 字节。字符串 `.length`、可见字素数和协议正文长度不是同一个量；文件偏移与 HTTP 限额应按字节判断。

## Buffer 持有字节，视图不一定复制

Buffer 是 Uint8Array 的子类。`Buffer.alloc()` 清零；`allocUnsafe()` 可能使用未清零内存，必须完整覆盖后才能读取或发送。`Buffer.from(string/array/Buffer)` 创建并填充新字节；`Buffer.from(arrayBuffer, offset, length)` 则可共享底层内存。

`subarray()` 和 Buffer 历史上的 `slice()` 都返回共享视图，不能套用普通 TypedArray.slice 的复制语义。改写视图会影响原 Buffer；需要独立副本时使用 `Buffer.from(view)`。一个很小的视图也可能让很大的底层缓冲继续存活。

小 Buffer 可能来自池，`.buffer.byteLength` 不一定等于当前视图的 `.byteLength`。暴露或转移底层 ArrayBuffer 前，还要考虑 byteOffset、长度和其他池数据，不能把整个底层都当作当前切片。

## 网络块可以从字符中间断开

下面是 [index.ts](index.ts) 中编码实验的独立版本，使用 Unicode 转义保证终端示例输出为英文或数字：

```js
import assert from "node:assert/strict"
import { StringDecoder } from "node:string_decoder"

const text = "\u4e2d\ud83d\ude00"
const bytes = Buffer.from(text, "utf8")
const chunks = [bytes.subarray(0, 2), bytes.subarray(2)]
const naive = chunks.map((chunk) => chunk.toString("utf8")).join("")
const decoder = new StringDecoder("utf8")
const decoded = chunks.map((chunk) => decoder.write(chunk)).join("") + decoder.end()

assert.equal(text.length, 3)
assert.equal(bytes.length, 7)
assert.notEqual(naive, text)
assert.equal(decoded, text)
console.log("Incremental decoding preserved the text")
```

逐块 toString 会把尚未完整的序列当成损坏输入；StringDecoder 保留尾部字节，等下一块补齐。`end()` 处理最后状态，但最终仍不完整的字节只能按编码规则替换，不能恢复任意损坏数据。流上的 `setEncoding()` 也可进行增量解码。

hex/base64 是字节的文本表示，不是原文本的字符编码。处理二进制文件时，不要先盲目 toString 再写回。

依据：[Node 22.18 Buffer](https://nodejs.org/download/release/v22.18.0/docs/api/buffer.html)、[StringDecoder](https://nodejs.org/download/release/v22.18.0/docs/api/string_decoder.html)。
