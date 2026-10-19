# V8、Buffer 与进程内存

heapUsed是当前JS堆使用，heapTotal是V8申请的堆范围；external包含与JS对象关联的外部内存，arrayBuffers通常计入external；rss包含驻留代码、堆、栈、映射等，不能把几项简单相加或直接当JS泄漏量。

Buffer主要字节常在堆外，但JS对象引用仍受GC管理。视图保留底层大缓冲、无界Map、未解除listener/timer、闭包和native资源都可长期持有内存。释放引用只是让对象有机会被回收，GC时机、allocator碎片与OS归还策略会影响RSS。

V8分代回收基于许多对象短命的假设，算法有增量/并行/并发阶段，不等于所有GC都一次完整暂停。提升max-old-space-size改变老生代容量与回收节奏，不能修复仍可达的泄漏或external无界增长。

定位应稳定负载、预热、多个时间点比较heap snapshot retained path；高分配率看allocation profile。heap稳定而rss/external增长时查Buffer、native和碎片。Snapshot会暂停且占大量内存，也可能包含敏感数据，应在受控环境采集和保存。

本例缓存容量2，逐出最老引用，但Buffer释放不自动清零以前暴露出去的视图，也不强制GC。

## 对应源码与实验

以下片段来自 [index.ts](./index.ts) 或同目录辅助文件；完整断言和清理路径见源码。

```ts
cache.set(index, Buffer.alloc(2 * 1024 * 1024, index))
while (cache.size > 2) cache.delete(cache.keys().next().value!)
const after = process.memoryUsage()
cache.clear()
```

保留容量可确定为4MiB，进程memoryUsage变化不固定。清引用后 external/RSS 可能不会立即下降；应查看本轮输出，不能据此声称 clear 无效或已证明泄漏。

## 依据与版本

各指标的包含关系见 [Node 22.18 memoryUsage](https://nodejs.org/download/release/v22.18.0/docs/api/process.html#processmemoryusage)。采样值需要保留版本、负载与采样时点，不把单次波动写成固定结果。
