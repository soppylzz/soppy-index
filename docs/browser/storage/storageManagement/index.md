# 存储管理 实验走查

[实验页面](demo/lib/page.ts) 由 Next.js 提供一个实验页面，逻辑全部在浏览器端执行：

在仓库根目录使用 Node >= 22.18 运行，按 `Ctrl+C` 停止服务：

```bash
pnpm --filter storage-management-next-lab dev
```

在浏览器打开 <http://localhost:5001>。刷新和停止服务不会自动清除已存数据；需要重置时使用页面操作或 DevTools 清理当前 origin。

Next CLI 输出服务地址；操作步骤见本文，结果在页面与浏览器 Console 观察。生产服务不保证逐条打印访问日志。服务只监听本机，HTML 使用 `no-store`。端口被占用时可切换：

```bash
pnpm --filter storage-management-next-lab exec next dev -H 127.0.0.1 -p 5005
```

切换端口会改变 origin，因此浏览器存储也会随之隔离。

下表为实验预期；实际结果需结合浏览器策略观察。

| 实验 | 操作 | 观察 |
| --- | --- | --- |
| `estimate()` | 页面加载与各操作后点击刷新 | usage/quota 是近似值；写入后用量可能变化，但不保证立即、按写入字节数精确增长 |
| `persist()` | 「申请持久化存储」按钮 | 返回布尔值；`false` 不是错误，只意味着数据仍按 best-effort 管理 |
| OPFS | 写入 / 读取 / 列出草稿文件 | origin 私有文件系统：文件可写读回，文件名仅在本 origin 内有意义 |
| QuotaExceededError | 「写入压力测试」按钮 | 逐块写入标称 10MB 文件，遇错或达 200MB 实验上限后，尝试清理本次创建的文件 |

> 压力测试通过独立文件名前缀区分每次运行，并在 finally 中尝试清理本次文件，包含写入失败时创建的文件；清理失败会记录具体错误。测试期间禁止重复启动或清空 OPFS。压力测试设了 200MB 上限：本机配额可能很大（Chrome 常给到磁盘的较大比例），demo 不会真的写满磁盘。

对应源码 quotaStress：names 在创建文件前登记名称，写入或 close 失败时先尝试 abort writable，外层 finally 再逐项 removeEntry。它只清理自己本次尝试的文件，没有实现按业务价值淘汰缓存或草稿的通用策略。日志中的已删除数量与具体清理错误才是判断依据；200MB 是累计文件内容的实验上限，不是磁盘占用的精确测量，也不保证所有环境都能写到该上限。

## 验证边界

本页保留已有实验的操作与预期，不将其自动视为本次浏览器实测。本次调整文档结构和代码摘录，没有重新执行这些存储实验；浏览器策略与实际结果仍需按步骤观察。

## 实现怎样控制实验条件

完整实现见 [实验页面](demo/lib/page.ts)。以下片段按源码流程精简，并将展示文字改为英文，用于解释实验输入和观察边界。

下面对应 [实验页面](demo/lib/page.ts) 的 OPFS 写草稿按钮；省略能力检测与页面刷新：

```js
const root = await navigator.storage.getDirectory()
const name = "draft-" + Date.now() + ".json"
const handle = await root.getFileHandle(name, { create: true })
const writable = await handle.createWritable()
await writable.write(
  JSON.stringify({
    text: "Draft content",
    savedAt: new Date().toISOString(),
  })
)
await writable.close()
log("OPFS written: " + name)
```

`log` 来自页面脚本，按钮外层的 `runExperiment` 捕获异常。配额压力测试沿用 getFileHandle / createWritable，但每次写独立前缀的 10MB 文件、最多 200MB；失败时尝试 abort writable，并在 finally 清理本次文件。它测试实际写入结果，不拿 estimate 的近似 quota 代替成功证据；完整清理分支见源码。
