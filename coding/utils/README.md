# 工具函数：把调用变成可控的行为

同样是“减少函数执行”，搜索框通常希望等输入停止后再请求，滚动处理则希望连续操作期间仍能定期更新。先确定可观察行为，才能选择防抖或节流。

| 实现 | 解决的问题 | 对应测试 |
| --- | --- | --- |
| [debounce.ts](./debounce.ts) | 等到调用停止一段时间再执行 | [debounce.test.ts](./__test__/debounce.test.ts) |
| [throttle.ts](./throttle.ts) | 连续调用期间限制执行频率 | [throttle.test.ts](./__test__/throttle.test.ts) |
| [memoize.ts](./memoize.ts) | 相同输入复用计算结果 | [memoize.test.ts](./__test__/memoize.test.ts) |
| [once.ts](./once.ts) | 首次正常返回后固定结果 | [once.test.ts](./__test__/once.test.ts) |
| [parse-query.ts](./parse-query.ts) | 将查询字符串转换为键值记录 | [parse-query.test.ts](./__test__/parse-query.test.ts) |
| [template.ts](./template.ts) | 用数据替换模板中的属性路径 | [template.test.ts](./__test__/template.test.ts) |

## 防抖重置等待，节流保留窗口

防抖每次收到调用，都覆盖待执行的参数和接收者，并重新设置计时器。因此连续调用本身会推迟执行。节流在窗口已经存在时只更新待执行信息，不重新计时，窗口到期就有机会执行最新一次调用。

下面是等待时间为 100 ms 的逻辑时间示例，假设没有其他调度延迟，不是实测耗时。A、B、C 分别在 0、40、80 ms 到达：

| 策略     | 0 ms   | 40 ms      | 80 ms      | 100 ms | 180 ms             |
| -------- | ------ | ---------- | ---------- | ------ | ------------------ |
| 默认防抖 | 等待 A | 改为等待 B | 改为等待 C | 不执行 | 执行 C             |
| 默认节流 | 执行 A | 保存 B     | 改存 C     | 执行 C | 没有新调用，不执行 |

本实现防抖默认 leading=false、trailing=true；节流默认两者均为 true。一次首调用执行后会清空 pending，因此没有后续调用时，不会再补一个重复尾调用。节流的尾调用会开启下一段冷却窗口，让连续输入继续受限。

pending 同时保存参数与 this，不能只记住参数。真正执行前先取走并清空 pending，可以避免本次调用结束时误删函数内部新产生的待执行请求。

cancel 清除计时器及待执行信息，不会中止已经开始的函数。防抖的 flush 提前结束等待：允许尾调用且有 pending 时立即执行，否则只清理。包装函数返回最近一次实际执行的返回值，尚未执行时返回 undefined；它不为每次被合并的调用创建独立 Promise。

真实计时器只保证到期后有机会被调度，不保证恰好在指定毫秒执行。防抖和节流也不限制异步操作的在途数量；限制请求并发需要控制任务的启动时机。

## 记忆化的关键是缓存键

memoize 默认用一棵 Map 路径树依次记录 this 和全部参数。对象按身份比较，因此两个内容相同但引用不同的对象不会命中同一个默认键。把 this 纳入路径，是为了避免同一函数在不同接收者上错误共享结果。

不能仅用缓存值是否为 undefined 判断是否命中，因为 undefined 也可能是合法结果。节点单独保存 hasValue。普通值参数遵循 Map 的键相等规则，例如 NaN 能匹配 NaN，正负零被视为同一键。[Map 键比较规则](https://tc39.es/ecma262/multipage/keyed-collections.html#sec-map-objects)

传入 resolver 后，缓存只依赖它返回的键，是否包含 this、对象版本或其他状态由调用者负责。以 JSON 字符串作为万能键会遇到循环引用、类型丢失和键表示冲突，应先说明输入范围。

同步计算抛错不会写入缓存。返回 Promise 时缓存的是该 Promise，后续拒绝不会自动删除记录。当前实现没有容量和过期策略，clear 会替换整棵缓存树；参数变化很多时，缓存本身也会占用越来越多内存。

once 使用的是另一种契约：不再区分输入，第一次正常返回后总是复用该结果。同步抛错不消耗机会，下一次仍会尝试；返回 Promise 已算正常返回，不能把异步拒绝误认为“尚未执行”。本版本不防止目标函数在首次返回之前递归调用包装器。

## 查询解析与模板替换都要先限定输入

parseQuery 接收查询字符串，可带开头的问号，不接收完整 URL。先移除片段，再按 & 分段，每段只在第一个等号处分割。这样 token=a=b 的值仍是 a=b。键和值都将加号视为空格并执行百分号解码，重复键按出现顺序累积为数组，无等号的参数得到空字符串。

结果采用 null 原型对象，`__proto__` 等键只作为数据保存。非法百分号编码会抛出 URIError；本工具没有实现 URLSearchParams 对所有非法输入的处理规则。[查询参数的标准 API](https://developer.mozilla.org/en-US/docs/Web/API/URLSearchParams)

template 只识别双花括号包围的点分属性路径，逐段读取自身属性，避免把继承的 toString 等内容当成模板数据。缺失值、null 和 undefined 使用 fallback，0 与 false 会转成字符串保留。它不执行表达式，不支持下标语法，也不自动转义 HTML。自身访问器仍可能被读取，不能把它当作处理不可信对象的沙箱。

## 验证入口

在 coding/utils 子包内运行 `pnpm test`；定位防抖用例可执行 `pnpm test __test__/debounce.test.ts`。计时器测试使用 Vitest 假计时器检查相对顺序，不代表真实浏览器的时间精度。类型检查统一在仓库根目录运行 `pnpm typecheck`。
