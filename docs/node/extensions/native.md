# Node-API、WASM 与隔离取舍

[本组导航](../testing/README.md) · [实验走查](../testing/index.md)

Node-API提供相对稳定的C ABI，降低直接绑定V8 ABI的跨Node版本成本，但二进制仍受OS、架构、libc和所需Node-API版本影响。不能把“ABI稳定”理解为一个.node可在所有平台通用。

node-gyp调用本地编译工具链；prebuild按平台发布减少安装时编译，但下载、签名、回退构建和安装脚本都有供应链与环境成本。发布需覆盖x64/arm64、glibc/musl等目标，并给无匹配产物环境明确失败或JS/WASM回退。

Worker继续用JS隔离CPU执行，WASM提供跨平台字节码和受限内存模型，native addon可调用系统库并有更高控制。跨JS/WASM边界的数据复制、调用与内存管理都可能有成本，加法微例不能证明真实业务更快。

Native段错误可能终止进程，无法像JS异常一样可靠catch，高风险调用可放子进程。WASM陷阱能作为异常处理，但导入的宿主函数、资源预算和共享内存仍需控制；WASM不是整个应用自动安全沙箱。

本例仅执行内嵌已知add模块，无外部下载、编译器或原生发布流水线。

## 按需求选择扩展方式

若只是让 CPU 密集 JavaScript 离开主线程，先看 Worker；若有现成的跨平台计算模块，可评估 WASM；必须调用系统库或复用 C/C++ 代码时再考虑 native addon。Node-API 降低的是绑定对 Node/V8 版本的 ABI 变化成本，不能消除不同操作系统和架构的二进制差异。任何性能收益都要用实际负载测量。

## 对应源码与实验

以下片段来自 [index.ts](../testing/index.ts) 或同目录辅助文件；完整断言和清理路径见源码。

```ts
const { instance } = await WebAssembly.instantiate(binary)
const add = instance.exports.add
const result = add(20, 22)
```

这段实际在wasm.mjs中，避开根tsconfig不包含DOM类型时硬加全局WebAssembly声明。二进制通过validate并返回42；nativeAddonBuilt:false明确说明没有把Node-API理论写成编译实测。

## 依据与版本

以 [Node 22.18 官方 n-api 文档](https://nodejs.org/download/release/v22.18.0/docs/api/n-api.html) 核对 API 合约；实际输出与运行环境需在执行时核对。
