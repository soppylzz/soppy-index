# Stream：背压、结束与失败传播

[本组导航](./README.md) · [实验走查](./index.md)

Readable提供数据，Writable消费，Duplex两侧独立，Transform连接输入与变换输出。字节模式水位按字节计，objectMode按对象数计；对象本身可很大，所以水位不是内存硬上限。

write返回false表示本次chunk已被接受进入缓冲，但达到背压阈值，应等drain再继续；不是“写入失败，重试同一块”。如果end之后不会再写，就不应盲等drain。真实生产者还需处理error/close，不能只等永不发生的drain。

Readable可通过data flowing、readable/read或async iterator消费；不要混用多套读取方式竞争数据。pipeline连接多段、传播错误并销毁，Promise完成表示该流水线的完成合约，不证明远端业务处理或磁盘断电持久性。

| 事件/动作              | 意义                               |
| ---------------------- | ---------------------------------- |
| end（Readable事件）    | 可读数据已消费完                   |
| finish（Writable事件） | end后所有写已由Writable处理        |
| close                  | 底层资源已关闭，可能正常也可能异常 |
| destroy(error)         | 终止并走错误/清理路径              |

Node/Web Stream桥接要检查对象模式、取消与编码，而不是只转换类型。源码 [v22.18 writable.js](https://github.com/nodejs/node/blob/v22.18.0/lib/internal/streams/writable.js) 中水位/needDrain与写回调推进状态，说明false和真正错误是两条路径。

## 按三块数据推导背压

设 Writable 水位为 4 字节，每块也为 4 字节。第一次 `write()` 返回 `false`，意思是这一块已进入处理路径，但缓冲已达到需要暂停的条件；若把它重试，会重复写入。生产者应等 `drain` 后再送下一块。最后一块后调用 `end()`，等待 `finish` 确认 Writable 处理完输入；如果中途报错，改走 `pipeline` 的拒绝与销毁路径。

## 对应源码与实验

以下片段来自 [index.ts](./index.ts) 或同目录辅助文件；完整断言和清理路径见源码。

```ts
const accepted = sink.write(Buffer.alloc(4, index))
if (!accepted) await once(sink, "drain")
sink.end()
await completed
await assert.rejects(pipeline(source, broken, destination), /Expected transform failure/)
```

本例固定3块且消费端不会意外报错，简化drain等待是受控实验条件；真实通用循环还要把结束/错误/取消纳入等待。pipeline另设失败与取消对照，日志来自实际destroyed状态。

## 依据与版本

以 [Node 22.18 官方 stream 文档](https://nodejs.org/download/release/v22.18.0/docs/api/stream.html) 核对 API 合约；实验版本与结果见[验证记录](../validation.md)。
