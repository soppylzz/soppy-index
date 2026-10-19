# Vue 手写实现：响应式核心与生命周期

这里分为两个层次：[reactivity](reactivity/index.ts) 不依赖 Vue，手写响应式机制；[composables](composables/) 使用官方 Vue 3.5，练习把状态、异步任务和资源清理组合起来。两层通过演示页并排观察，避免把教学模型当作框架源码的完整复刻。

## 运行与阅读

在仓库根目录执行：

```sh
pnpm install
pnpm --filter @soppy-index/vue dev
```

打开 <http://127.0.0.1:5174/>。端口被占用时启动会失败。构建使用 `pnpm --filter @soppy-index/vue build`，类型检查使用 `pnpm --filter @soppy-index/vue typecheck`，测试使用 `pnpm --filter @soppy-index/vue test`。

[main.ts](main.ts) 使用 render function 组合页面，无需 SFC 编译插件。基础请求演示使用固定主题数组和本地 timeout；扩展的 useFetch 演示通过真实 HTTP 读取同源静态 JSON。前者只能观察异步竞态，不能作为网络行为证据。建议按 effect → reactive → ref → computed → watch → composables 的顺序阅读。

## 对象怎么知道该更新谁

| 实现 | 数据结构与机制 | 面试时应能解释 |
| --- | --- | --- |
| [effect](reactivity/effect.ts) | 依赖集合、Effect 栈、反向依赖清理、scheduler、stop | 条件分支切换后为什么必须取消旧订阅？嵌套 Effect 怎么恢复父级？ |
| [reactive](reactivity/reactive.ts) | Proxy、WeakMap 缓存、按 target/key 建立依赖 | 为什么相同原对象应返回相同 Proxy？新增和删除怎样通知枚举依赖？ |
| [ref / toRef / toRefs](reactivity/ref.ts) | `.value` 存取器、深层转换、属性转发 | 解构 primitive 后为何失去关联？toRef 为什么不能只复制一次值？ |
| [computed](reactivity/computed.ts) | 懒执行、dirty 标记、缓存和自己的订阅集合 | computed 为什么既是依赖的消费者，又是外层 Effect 的数据源？ |
| [watch / watchEffect](reactivity/watch.ts) | getter 求值、旧值、遍历、cleanup、可停止任务 | 依赖收集的时机在哪里？异步任务失效后如何取消？ |
| [queueJob / nextTick](reactivity/scheduler.ts) | `Set` 去重和 Promise 微任务 | 同步修改两次为什么只执行一次异步 watch 回调？ |

执行 Effect 时，将当前 Effect 压栈。Proxy 的读取操作找到栈顶，建立 `target → key → Set<Effect>` 的关系；Effect 同时记录自己被哪些集合引用，便于再次执行前移除旧关系。退出时在 `finally` 中出栈，嵌套读取和抛错都不会污染后续的依赖收集。

假设表达式是 `useLeft ? left : right`。第一次执行只订阅 `useLeft` 和 `left`；切换到右侧后先清理旧关系，再订阅 `useLeft` 和 `right`。页面点击 Switch branch 后，再点击未选中的 Change left/right，当前展示不会因那个分支而变化。

Proxy 不只处理 `get/set`。`in` 需要 `has`，`Object.keys` 需要 `ownKeys`，删除需要 `deleteProperty`。数组追加索引还可能改变 length，缩短 length 则必须使被截掉的索引读取失效；删除一个索引并不会改变数组 length。

这个教学模型支持可扩展、可变的普通对象和数组的常规读取、赋值、删除及枚举；不实现 Map/Set、readonly、属性描述符修改、原型链更新、数组方法的收集暂停或官方调试 API。嵌套的 Date 等特殊对象保持原样。`toRefs` 只转换普通对象当前已有的可枚举字符串属性；新增属性需要另行 `toRef`，不会自动补齐。

## computed 为什么不能每次读取都计算

Computed 内部持有一个延迟执行的 Effect。首次读 `.value` 才求值；依赖变化只把 dirty 标记置为 true，并通知读过它的消费者。下次读取时重新计算，连续多次读取复用缓存。

外层 Effect 可能同时读取 `state.count` 和 `doubled.value`。如果先执行外层，再使 computed 缓存失效，就可能读到“新 count + 旧 doubled”。这里使用待执行集合，优先执行 computed 的失效调度，再运行普通消费者；同一轮传播中用 `Set` 避免重复通知。它是教学调度策略，不代表 Vue 3.5 内部使用了同一算法。

Computed 只支持只读 getter，getter 应当纯粹。这里没有提供 computed 的独立销毁 API，也没有实现完整 effectScope 所有权系统，不应把这个最小核心当作生产运行时。

## watch 在什么时候收集依赖

Watch 的 source 是 getter；在内部 Effect 中执行 getter 才能收集依赖。回调里的读取不会被当作 source。`deep: true` 会递归读取可枚举属性，用 `Set` 避免循环对象导致无限递归；它没有复制对象，所以深层修改时新旧值可能是同一个 Proxy。需要历史快照时必须由调用方复制。

默认 watch 使用微任务，连续两次自增会从旧值直接通知到最终值；`flush: "sync"` 则同步执行。手写版本中的 `flush: "post"` 仅表示微任务调度，它没有组件渲染队列，因此不承诺“DOM 更新后”。同理，这里的 `nextTick` 只等待自己的任务队列。官方 Vue 的语义应以 [watch API](https://vuejs.org/api/reactivity-core#watch) 为准。

Cleanup 在下次有效回调之前，以及 stop 时执行；已经排队但被 stop 的任务不会再次运行。Cleanup 必须在同步回调阶段注册。`watchEffect` 立即执行并自动收集同步读取的依赖；`await` 后的读取不属于这次收集。这里不处理多 source、数值 deep、once、pause/resume 或生产级循环更新诊断；回调不应无限修改自己的 source。官方使用方式可对照 [Watchers](https://vuejs.org/guide/essentials/watchers)。

## composables 怎样与组件生命周期协作

| 实现 | 使用的 Vue API | 清理与边界 |
| --- | --- | --- |
| [useDebouncedRef](composables/useDebouncedRef.ts) | `customRef`、`onScopeDispose` | setter 重置 timeout；到期才更新值并 trigger；scope 销毁时取消 pending 写入 |
| [useInterval](composables/useInterval.ts) | `ref`、`watch` | 重复 resume 不创建多个 interval；pause 和 scope 销毁都会清理 |
| [useEventListener](composables/useEventListener.ts) | 元素 Ref、watch 的 `onCleanup` | 元素引用变化时先解绑旧节点；初始 null 可等待挂载后绑定 |
| [useLocalStorage](composables/useLocalStorage.ts) | 深 watch、同步标记、scope 清理 | 支持本标签页实例和其他标签页同步；回填时抑制重复写入 |
| [useRequest](composables/useRequest.ts) | `shallowRef`、参数 watch、`AbortController` | 参数更换、reload、scope 销毁都会使旧任务失效 |

这些函数需要在组件 setup 或有效的 `effectScope.run` 中同步调用。页面的 Unmount composables 按钮会销毁整块演示：定时器停止、事件监听器解绑、请求信号取消；再次挂载后得到新的局部状态，localStorage 数据继续保留。

请求 composable 监听参数 Ref 的替换，不深度监听对象内部修改。用新对象替换参数，或主动 reload。写入结果前会检查 signal，因此忽略取消的旧任务也无法覆盖新结果。演示输入 `error` 可以进入 error 状态；这里没有缓存、重试或分页协议。

存储数据限制为 JSON 可序列化值，不做运行时 schema 校验；无效 JSON 回退到默认值，写入错误暴露在 `error` Ref 中，初次读取因浏览器权限失败时仍会抛错。原生 `storage` 事件处理其他标签页，本页由 composable 的自定义事件处理，外部直接写存储需要自行通知。它没有跨标签页事务保证。

## 高频 composables 补充索引

| 实现 | 机制与边界 |
| --- | --- |
| [useToggle](composables/useToggle.ts) | 切换布尔值或显式赋值，不能把 false 当作没有传参 |
| [useDebounce](composables/useDebounce.ts) | 尾沿调用函数，保存最后参数，支持 cancel/flush，与 useDebouncedRef 延迟值更新区分 |
| [useThrottle](composables/useThrottle.ts) | 首次立即执行，窗口内更新尾沿参数；scope 销毁时清理 pending timeout |
| [useStorage](composables/useStorage.ts) | 注入 Storage，local/session 共用序列化与订阅规则；同页事件按 Storage 和 key 区分 |
| [useWindowSize](composables/useWindowSize.ts) | shallowRef 保存宽高快照，resize 时替换，scope 销毁解绑 |
| [useIntersectionObserver](composables/useIntersectionObserver.ts) | 目标 Ref 变化时重建 observer，主动 stop 或 scope 销毁时 disconnect |
| [useAsyncState](composables/useAsyncState.ts) | 手动 execute、取消、互斥状态、旧任务失效保护与错误边界 |
| [useFetch](composables/useFetch.ts) | 响应式 URL、AbortController、HTTP 状态校验、unknown 解码 |

Vue 的 setup 通常每个实例执行一次，回调可以直接读取 Ref 的最新 `.value`，不需要照搬 React 每次 render 都产生新闭包的处理方式。防抖和节流这里接收固定回调与固定 delay，假定 delay 是有限非负数；想切换行为时，让回调读取响应式参数即可。

Throttle 使用首沿加尾沿：第一次立即调用，窗口内的多次调用只保留最后参数；到尾沿执行后，新的窗口以该次执行为起点。单次调用不重复执行尾沿。Cancel 同时取消等待并重置窗口。示例使用浏览器计时器，不保证准时执行。

Observer composable 的 options 在建立时固定，target 则可以从 null 变成元素或替换元素。清理时不仅 disconnect，还使回调闭包失效，避免已经排队的旧通知覆盖新目标状态。没有 IntersectionObserver 时返回 `supported: false`，由使用者决定降级策略；不把“不支持”当作“已经相交”。机制可参考 [MDN](https://developer.mozilla.org/en-US/docs/Web/API/Intersection_Observer_API)。

手动异步任务与自动 useRequest 的差别是启动时机。`useAsyncState` 初始为 idle，execute 才开始；取消回到 idle，异常进入 error 并返回 undefined，调用方不需要再捕获同一个错误。即使旧任务忽略取消，它也无法再写内部状态；返回的旧 Promise 仍可能完成，调用方不能把这个限制误解成任务执行本身被终止。

Fetch 演示读取 `public/topics.json`。它使用真实 fetch，但只依赖本工作区的静态资源；非 2xx 状态先报错，再由 decode 负责业务数据形状。泛型不会校验 JSON，所以 decode 的输入是 unknown。

## 自定义指令：把 DOM 操作绑定到生命周期

[directives/lazy.ts](directives/lazy.ts) 实现 `v-lazy`。绑定值既可以是图片 URL，也可以是包含 src、placeholder、error 的对象。Mounted 时先设置占位内容，接近视口后才把真实 URL 写到 img.src；rootMargin 为 100px，因此图片可以在真正进入可见区域前预加载。开始加载即 disconnect，load/error 之后移除对应监听，失败时最多切换一次备用图，避免错误回退循环。

Updated 对比保存的上次源配置。只比较 `binding.oldValue` 无法区分同一对象被原地修改的情况，所以指令对对象值启用深度跟踪，并保存配置快照；地址变化时先取消旧观察和监听，再建立新一轮。Unmounted 会清理 WeakMap、observer 和事件回调。不支持 IntersectionObserver 时直接赋 src。指令状态可通过 img 的 data-state 观察，分别是 waiting、loading、loaded、error。它是懒赋值模型，没有图片解码队列、请求优先级策略或网络进度统计。

[directives/clickOutside.ts](directives/clickOutside.ts) 实现 `v-click-outside`：Mounted 在 ownerDocument 捕获 pointerdown，使用 composedPath 判断是否经过当前元素；Updated 更新处理函数；Unmounted 用同一个函数与 capture 参数解绑。它按元素的 DOM 路径判断，不自动把 Teleport 到其他位置的弹层算作内部。

指令适合需要直接操作 DOM 的行为，组合式函数适合复用有状态逻辑；不要用指令隐式修改组件业务状态。生命周期及用法可参照 Vue 的 [Custom Directives](https://vuejs.org/guide/reusability/custom-directives.html)。[ExtendedDemos](demos/ExtendedDemos.ts) 使用 withDirectives 展示注册以外的直接调用方式，与原有 ComposableDemo 一起受卸载按钮控制。

## 验证范围

[响应式核心测试](__test__/reactivity.test.ts) 覆盖分支清理、嵌套收集、停止、代理缓存、数组 length、属性枚举、computed 缓存与通知顺序、深监听和任务去重。[Composables 测试](__test__/composables.test.ts) 使用官方 `effectScope` 验证定时器、事件解绑、存储同步、请求竞态和重载。

[扩展测试](__test__/extended-composables.test.ts) 另外覆盖回调防抖/节流、存储写入失败、窗口解绑、observer 替换与迟到回调、静态 JSON 状态校验，以及真实 Vue 挂载下的指令地址更新和卸载。

这些测试运行于 Vitest + jsdom，可以验证状态和清理逻辑，不能证明真实浏览器布局、跨窗口交付时序或网络行为。
