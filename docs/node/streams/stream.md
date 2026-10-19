# Stream：消费者来不及处理时，生产者怎样停

把文件分块读取，只解决了“不一次读进全部内容”。若生产者不断写、消费者处理很慢，内存仍会增长。背压让消费者通过接口反馈容量，生产者必须配合暂停。

## 先分清两侧和水位

Readable 提供数据，Writable 消费数据，Duplex 有独立的读写两侧，Transform 将输入变成输出。字节模式的 `highWaterMark` 按字节计，objectMode 按对象数计；一个对象可以很大，水位也不是内存硬上限。

`write(chunk)` 返回 false 时，这个 chunk 已被接受，只是缓冲达到暂停阈值。重试同一块会重复写入；继续无限写则失去背压作用。Readable 可用 data、readable/read 或异步迭代消费，不要让多种方式竞争同一份数据。

## 用三块数据走通写入过程

下面是 [index.ts](index.ts) 中慢消费者实验的独立版本。每次写 4 字节，异步消费者的水位也是 4 字节：

```js
import assert from "node:assert/strict"
import { once } from "node:events"
import { Writable } from "node:stream"

let consumed = 0
const sink = new Writable({
  highWaterMark: 4,
  write(chunk, _encoding, callback) {
    setTimeout(() => {
      consumed += chunk.length
      callback()
    }, 2)
  },
})
const completed = once(sink, "finish")
for (let index = 0; index < 3; index++) {
  if (!sink.write(Buffer.alloc(4, index))) await once(sink, "drain")
}
sink.end()
await completed
assert.equal(consumed, 12)
```

这里的消费者受控且不会报错。通用生产代码还要处理 error、提前 close 与取消，不能只等一个可能永不到来的 drain；end 后也不应继续盲等 drain 再写数据。连接多段流优先使用 `node:stream/promises` 的 `pipeline`，由它协调背压与失败传播，避免逐段手工监听漏掉错误。

## 完成信号各自说明什么

| 信号               | 含义                                  |
| ------------------ | ------------------------------------- |
| Readable 的 end    | 可读数据已消费完                      |
| Writable 的 finish | 调用 end 后，写入已由 Writable 处理完 |
| close              | 底层资源已关闭，可能正常也可能异常    |
| destroy(error)     | 主动终止并进入错误、清理路径          |

finish 或 pipeline 的 Promise 完成，不证明磁盘断电持久性或远端业务已提交。Node/Web Stream 桥接还需检查对象模式、编码和取消规则；只转换类型不足以建立同一合约。

完整实验另设失败 Transform 与 AbortController 取消，检查 pipeline 拒绝及各段 destroyed 状态，没有测生产吞吐。依据：[Node 22.18 stream](https://nodejs.org/download/release/v22.18.0/docs/api/stream.html)。
