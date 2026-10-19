# 存储管理：隔离、配额、持久化与 OPFS

浏览器存储没有一个可安全硬编码的"固定容量"。可用空间取决于浏览器、设备、剩余磁盘、使用模式和隐私策略；数据默认还可能在存储压力下被回收。应用需要查询近似用量、处理写入失败，并为数据设计重建或同步路径。

## 1. 配额与隔离边界

从应用视角看，IndexedDB、Cache Storage、OPFS 等数据通常计入 origin 的存储配额。浏览器可能进一步按顶层站点分区第三方存储，以减少跨站跟踪。

Cookie 与 Web Storage 也受站点数据清理和隐私策略影响，但它们各自有独立的协议规则或限制，不应把 `StorageManager.estimate()` 当作所有浏览器状态的精确总账。

隔离边界解决"谁默认能访问"，不解决"数据是否可信"：同一 origin 下运行的第三方脚本仍可能访问该 origin 暴露给 JavaScript 的存储。

## 2. 查询用量与配额

`navigator.storage.estimate()` 返回近似的 `usage` 和 `quota`：

```js
async function getStorageSummary() {
  if (!navigator.storage?.estimate) {
    return null
  }

  const { usage = 0, quota = 0 } = await navigator.storage.estimate()

  return {
    usage,
    quota,
    ratio: quota === 0 ? 0 : usage / quota,
  }
}
```

结果是估算值，浏览器可能为隐私目的调整或填充数值。它适合展示大致使用情况和提前清理，不适合在写入前判断"还剩多少字节，所以这次一定成功"。最终仍要捕获写入错误。

## 3. Best-effort 与 persistent

站点数据默认通常属于 best-effort，在存储压力等浏览器清理策略下可能被回收。navigator.storage.persist() 请求将当前默认存储 bucket 标记为 persistent；是否授予可由浏览器策略或用户权限交互决定，不能承诺一定静默批准或一定显示提示。

```js
async function requestPersistentStorage() {
  if (!navigator.storage?.persist) {
    return false
  }

  const alreadyPersistent = await navigator.storage.persisted()
  return alreadyPersistent || navigator.storage.persist()
}
```

返回 `false` 不是异常，也不意味着存储立即不可用。应用应继续工作，只是要把数据视为可回收。适合申请 persistent storage 的通常是用户难以重建的重要本地数据，而不是随时能重新下载的静态资源。

按 [Storage Standard 的持久化权限](https://storage.spec.whatwg.org/#persistence)，persistent 存储受到浏览器自动清理策略的保护，不只是把自动回收概率调低；用户或应用仍可主动删除。它不是数据备份、无限配额或写入成功承诺，应用仍需处理权限变化、写入错误及数据重建。

## 4. OPFS

Origin Private File System（OPFS）是 File System API 提供的 origin 私有文件系统。它不向用户暴露普通磁盘路径，文件名也只在该 origin 的 OPFS 内有意义。其数据计入站点配额，并会随站点数据清理。

```js
async function writeDraftFile(draft) {
  const root = await navigator.storage.getDirectory()
  const fileHandle = await root.getFileHandle("draft.json", {
    create: true,
  })
  const writable = await fileHandle.createWritable()

  await writable.write(JSON.stringify(draft))
  await writable.close()
}
```

读取文件：

```js
async function readDraftFile() {
  const root = await navigator.storage.getDirectory()
  const fileHandle = await root.getFileHandle("draft.json")
  const file = await fileHandle.getFile()
  return JSON.parse(await file.text())
}
```

主线程使用异步 API。OPFS 还支持仅在 dedicated worker 中使用的同步访问句柄，适合 SQLite、编辑器和需要大量原地文件操作的 Wasm 应用；普通结构化业务记录仍通常优先选择 IndexedDB。

OPFS 与用户通过文件选择器授权的本地文件不同：OPFS 不需要用户逐个选择文件，也不能用来偷偷访问用户文件系统。

## 5. 写入失败与主动清理

配额不足时，存储 API 可能抛出 `QuotaExceededError`。应用应按数据价值制定清理顺序：

```js
async function saveWithQuotaRecovery(save, removeOldEntries) {
  try {
    await save()
  } catch (error) {
    if (error?.name !== "QuotaExceededError") {
      throw error
    }

    await removeOldEntries()
    await save()
  }
}
```

常见优先级是：先删除可重新获取的 response 和过期派生数据，再删除旧草稿；用户原创且未同步的数据最后处理，并在可能丢失前明确告知用户。

清理逻辑要限制命名空间：库不应调用 `localStorage.clear()` 或删除 origin 下不属于自己的全部 Cache Storage / IndexedDB 数据。

## 6. 数据生命周期设计

每类本地数据至少回答以下问题：

1. 谁创建它，权威来源在哪里？
2. 可以丢失并重新生成吗？
3. 什么时候过期，如何识别 schema 版本？
4. 登出、换账号时是否必须删除？
5. 配额不足时，哪类数据先淘汰？
6. 多标签页和应用升级时如何协调？

例如离线文档可以存入 IndexedDB，写入同步状态与服务端版本；可重新下载的图片放 Cache Storage；大型二进制工程文件放 OPFS。登出时删除用户隔离的数据，但保留与账号无关且可共享的静态资源缓存。

## 7. 兼容性与降级

StorageManager 的 `estimate()`、`persist()` 与 `persisted()` 在现代浏览器中可用，但授予策略不同。OPFS 要求安全上下文，也应通过 `navigator.storage?.getDirectory` 检测；不支持时可根据数据类型回退到 IndexedDB 或仅在线工作。

```js
const supportsOPFS = typeof navigator.storage?.getDirectory === "function"
```

兼容性见 [MDN：StorageManager](https://developer.mozilla.org/en-US/docs/Web/API/StorageManager#browser_compatibility)、[MDN：StorageManager.persist()](https://developer.mozilla.org/en-US/docs/Web/API/StorageManager/persist#browser_compatibility) 和 [MDN：OPFS](https://developer.mozilla.org/en-US/docs/Web/API/File_System_API/Origin_private_file_system#browser_compatibility)。

## 8. 从一份离线草稿推导保留策略

一份尚未同步的草稿，和一张随时能重新下载的图片，虽然都占用配额，丢失代价却不同。应用应先区分可重建与不可重建数据，再决定清理顺序、同步策略，以及是否请求 persistent storage。即使获得自动清理保护，用户仍可主动删除站点数据，所以本地持久化不能代替备份。

[存储实验](./index.md)可以观察 estimate、persist 与 OPFS 写入。压力测试遇错或达到上限后会尝试清理本次文件；达到 200MB 上限，只能说明这段有限写入没有在此前失败，不能据此声称测出了完整配额。

## 9. 参考资料

- [MDN：存储配额与回收条件](https://developer.mozilla.org/en-US/docs/Web/API/Storage_API/Storage_quotas_and_eviction_criteria)
- [Storage Standard](https://storage.spec.whatwg.org/)
- [文件系统标准：源私有文件系统](https://fs.spec.whatwg.org/#origin-private-file-system)
