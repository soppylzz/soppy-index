# 文件生命周期、路径与 URL

fs同步接口阻塞调用线程，适合启动和小CLI；服务请求优先Promise/callback或Stream。readFile整体分配适合受限小文件，大上传下载应流式。文件handle所有成功/失败路径都要close，临时目录在finally移除。

join拼接规范化，resolve按片段生成绝对路径，不能承担授权检查。cwd由启动位置与chdir决定；模块资源用new URL("./asset",import.meta.url)。pathToFileURL/fileURLToPath处理编码、平台根与特殊字符，不手动剥file://或用decodeURIComponent替代。

对外路径先URL解析/解码再按明确根处理；词法relative边界检查可拒绝../逃逸，但symlink、硬链接与检查后使用的TOCTOU另需协议。真实静态服务优先白名单路由，见 [HTTP 实验路由](../http/demo/lib/handler.ts)。

并发写同一路径可能覆盖或交错；写临时文件再rename有助于发布完整版本，但跨文件系统、权限、flush和断电持久性另有条件，rename不等于事务或强制落盘。watch事件会合并/遗漏、平台不同，开发工具需去抖与重扫。

## 从模块旁的文件开始

要读取模块旁的资源，先用 `new URL("./asset", import.meta.url)` 定位；要处理普通路径与 file URL 的互转，用 `pathToFileURL` 和 `fileURLToPath`。这样即使文件名含空格、`#` 或 `%`，也不会把路径字符误当成 URL 结构。`cwd` 则属于进程启动环境，换一个目录启动就可能变。

## 对应源码与实验

以下片段来自 [index.ts](./index.ts) 或同目录辅助文件；完整断言和清理路径见源码。

```ts
const file = join(directory, "space # percent %.txt")
const url = pathToFileURL(file)
await writeFile(url, "lesson-data", { flag: "wx" })
const handle = await open(url, "r")
try {
  const data = await handle.readFile("utf8")
} finally {
  await handle.close()
}
```

wx拒绝已存在文件；临时目录限制本例影响范围。代码并未为不可信用户实现通用文件沙箱，词法检查只演示一个必要边界。

## 依据与版本

以 [Node 22.18 官方 fs 文档](https://nodejs.org/download/release/v22.18.0/docs/api/fs.html) 核对 API 合约；实际输出与运行环境需在执行时核对。
