# Node 内置测试与资源隔离

[本组导航](./README.md) · [实验走查](./index.md)

单元测试针对纯转换，集成测试穿过真实文件/HTTP边界，端到端从外部操作完整系统。测试应断言结果、失败模式与清理，不用照抄实现生成没有独立信息的快照。

Node Test Runner的test、生命周期、mock、并发和coverage能力随版本变化。本例用22.18已有接口，不把最新mock timer能力当全部LTS保证。节点内的异步工作要await，未处理拒绝/遗留资源能造成假通过或挂起。

文件用每例独立mkdtemp并finally清理，HTTP监听0读取真实端口，子进程设总超时和输出上限；并发测试不要共享cwd、env、固定端口或全局时钟。真实时间只适合必要的边界等待，时序逻辑优先可控依赖，不能用任意sleep掩盖竞态。

覆盖率表明哪些代码执行过，不保证断言正确。Flaky常来自未等待close、漏timer/socket、共享环境和不确定调度，应复现并修根因，而不是简单加重试。

## 一个测试为什么需要清理

文件用例创建临时目录后，断言文件内容只是前半段；`finally` 删除目录，再确认结果，才能避免下一次测试读到旧状态。HTTP 用例也要真正等待服务器关闭。测试通过表示这组输入与断言通过，不表示所有路径被验证；覆盖率只说明代码被执行过。

## 对应源码与实验

以下片段来自 [index.ts](./index.ts) 或同目录辅助文件；完整断言和清理路径见源码。

```ts
test("file operation cleans its temporary directory", async () => {
  const directory = await mkdtemp(join(tmpdir(), "node-test-lab-"))
  try {
    const path = join(directory, "result.txt")
    await writeFile(path, "observed")
    assert.equal(await readFile(path, "utf8"), "observed")
  } finally {
    await rm(directory, { recursive: true, force: true })
  }
})
```

完整用例在删除后还断言ENOENT；HTTP用例检查201、JSON语义并等待server.close。TAP报告只作为实际runner结果保存，父进程同时检查退出状态。

## 依据与版本

以 [Node 22.18 官方 test 文档](https://nodejs.org/download/release/v22.18.0/docs/api/test.html) 核对 API 合约；实际输出与运行环境需在执行时核对。
