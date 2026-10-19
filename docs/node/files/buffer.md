# Buffer：字节、视图与编码

[本组导航](./README.md) · [实验走查](./index.md)

Buffer是Uint8Array子类，主要表示字节。JS字符串length按UTF-16 code unit计数，Unicode code point、grapheme和UTF-8字节数还不同；协议body长度和文件偏移必须按字节算。

alloc清零；allocUnsafe可能复用未清零内存，必须完整覆盖后再读/发送。from(string/array/Buffer)通常创建并填充新字节，而from(ArrayBuffer,offset,length)可共享底层内存。小Buffer可能来自池，buffer.byteLength不一定等于当前视图byteLength，转移/暴露底层时还需考虑byteOffset与池中其他数据。

subarray和Buffer历史slice都是视图共享；TypedArray.slice的一般复制语义不能直接套给Buffer.slice。小视图还可能保留大底层缓冲的生命周期，需要真正小副本时显式复制。

网络chunk边界任意，多字节字符可被拆开。逐块toString会为不完整序列产生replacement字符；StringDecoder或流setEncoding保留边界状态。hex/base64是字节的文本表示，不是原始文本的字符编码；二进制文件不要盲目toString再写回。

## 同一段文字的三种长度

“中😀”包含两个 Unicode code point，却占 3 个 UTF-16 code unit；编码成 UTF-8 后占 7 字节。JS 字符串的 `.length` 得到的是第二个数，HTTP body 上限需要第三个数。若网络在“😀”的 UTF-8 字节中间切块，逐块解码会损失原字符，增量解码器才会保留尚未完整的字节。

## 对应源码与实验

以下片段来自 [index.ts](./index.ts) 或同目录辅助文件；完整断言和清理路径见源码。

```ts
const shared = bytes.subarray(0, 3)
const copy = Buffer.from(shared)
shared[0] = 65
const decoder = new StringDecoder("utf8")
const decoded = chunks.map((chunk) => decoder.write(chunk)).join("") + decoder.end()
```

显式调用decoder.end排出尾部状态；最终不完整字节仍会按编码规则替换，不是任意损坏数据都能恢复。CLI将非ASCII数据转为JSON转义，使终端标签与输出保持英文/ASCII，值本身没有被更改。

## 依据与版本

以 [Node 22.18 官方 buffer 文档](https://nodejs.org/download/release/v22.18.0/docs/api/buffer.html) 核对 API 合约；实际输出与运行环境需在执行时核对。
