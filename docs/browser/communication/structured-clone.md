# 结构化克隆与转移：复制数据，还是交出资源

把一个包含 Date、Map 和循环引用的对象交给另一段逻辑，能否用 JSON 往返代替复制？不能直接替换：序列化支持哪些类型、能保留哪些关系，以及是否转移底层资源，决定了接收方得到什么。

## 复制的是受支持的数据图

```js
const original = {
  createdAt: new Date("2026-01-01"),
  values: new Map([["count", 1]]),
}
original.self = original

const copy = structuredClone(original)
console.log(copy !== original, copy.self === copy)
console.log(copy.createdAt instanceof Date, copy.values.get("count"))
```

副本与原对象不是同一对象，但副本中的 self 指向副本自身；受支持的 Date、Map 也按相应类型复制。因此它解决的是数据图的序列化与重建，而不只是递归枚举普通对象的字段。

克隆也有明确边界：函数、DOM 节点等不能这样复制，自定义对象的原型、属性描述符等不能假定原样保留。需要类行为时，应传递明确的数据字段，再由接收方校验和重建。支持范围与算法见 [HTML Standard：结构化数据](https://html.spec.whatwg.org/multipage/structured-data.html)。

## 转移会改变发送方还能做什么

```js
const buffer = new ArrayBuffer(8)
new Uint8Array(buffer)[0] = 42

const result = structuredClone({ buffer }, { transfer: [buffer] })
console.log(buffer.byteLength, result.buffer.byteLength)
console.log(new Uint8Array(result.buffer)[0])
```

这里交出的是可转移资源：原 ArrayBuffer 被分离，原对象不再代表那份可用字节；目标仍可读取 8 字节，首字节为 42。它与“复制后两边各自持有数据”有不同的所有权语义。

不能把任意对象放进 transfer list，也不能把一个 API 支持 transfer 的用法直接套到另一个 API。例如 IndexedDB 的 add / put 不接受用于交付 buffer 所有权的 transfer list。

## 克隆成功与消息送达是两件事

`structuredClone()` 的本地调用成功，只说明这次复制或转移完成。通过 postMessage 交付数据，还要满足消息接口的参数、目标上下文和接收条件；发送方若需要确认业务完成，必须等待接收方处理后返回的 ack，而非只看 postMessage 是否抛错。

IndexedDB 还要等待写入事务完成：request 成功不等于事务已提交。本地克隆、消息处理和数据提交分别有自己的完成条件。

## 无法克隆时会怎样

```js
try {
  structuredClone({ run: () => 42 })
} catch (error) {
  console.log(error.name) // DataCloneError
}
```

函数不能按结构化克隆传递；需要远端执行操作时，应传操作名称和参数，由接收方校验后调用本地实现，而不是发送函数。这个本地调用只说明序列化失败，不涉及跨窗口是否可达。
