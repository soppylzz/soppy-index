# React 手写实现 / React interview implementations

A client-only React 19 + Vite workspace with fixed local data. Each implementation exposes an interview mechanism; no Next.js, backend, remote API, or component library is required.

这里的重点是把状态归属、更新过程和资源清理讲清楚。演示页使用 React 19.2、Vite 和固定数据，组件与 Hooks 都可以单独阅读。页面和代码使用英文，以下说明使用中文。

## 运行与阅读

在仓库根目录安装依赖后启动：

```sh
pnpm install
pnpm --filter @soppy-index/react dev
```

打开 <http://127.0.0.1:5173/>。端口被占用时启动会失败，不会自动换端口。构建使用 `pnpm --filter @soppy-index/react build`，类型检查使用 `pnpm --filter @soppy-index/react typecheck`，测试使用 `pnpm --filter @soppy-index/react test`。

建议先看受控组件，再看副作用清理，最后看外部状态和虚拟列表。[main.tsx](main.tsx) 只负责组合演示；[data.ts](data.ts) 提供 2,000 条固定记录和带延迟的本地异步函数。延迟用于制造任务完成先后，不能用来证明 HTTP、缓存或网络行为。

## 状态由谁拥有

| 实现 | 核心机制 | 可以继续追问什么 |
| --- | --- | --- |
| [Pagination](components/Pagination.tsx) | 父组件持有页码，组件只计算窗口并发出 `onChange` | 总数减少后如何校正父组件页码？为什么只渲染五个页码按钮？ |
| [Tabs](components/Tabs.tsx) | 受控选中值、稳定 ID、方向键切换和 roving tabindex | 隐藏面板是否仍然保留子组件状态？ |
| [TodoList](components/TodoList.tsx) | 受控输入、提交校验、纯 reducer、不可变更新 | 为什么不原地修改数组？为什么不能用数组下标表示任务身份？ |
| [Tree](components/Tree.tsx) | 递归渲染、稳定节点 ID、`Set` 保存展开状态 | 为什么更新展开集合时先复制？递归数据中的 ID 是否需要全局唯一？ |
| [Modal](components/Modal.tsx) | Portal 改变 DOM 挂载位置，Effect 对接原生 dialog | Portal 内事件如何沿 React 树传播？关闭时如何归还焦点？ |
| [VirtualList](components/VirtualList.tsx) | 总高度占位，只挂载可见区及缓冲行 | 为什么不支持不定高行？滚动到末尾后数据缩短会怎样？ |

分页点击“Next”时，组件不会偷偷改变自己的页码。只有父组件收到新值并重新传入 `page`，页面才发生切换。组件会把越界页码限制在有效范围用于显示，但不会在 render 中调用父组件更新函数；业务方应在总数改变时维护自己的页码。

Tabs 的所有面板都会挂载，非活动面板用 `hidden` 隐藏，因此其内部状态会保留。Tree 使用普通列表和展开按钮，实现的是递归 disclosure；没有冒充需要完整方向键导航的 ARIA tree 控件。节点 ID 在整棵树中必须唯一。

TodoList 把“新增、切换、删除”变为 action。Reducer 只根据旧状态和 action 返回新状态；任务 ID 在事件处理中生成，避免在 reducer 中使用时间或随机数破坏纯函数性质。表单的空白校验发生在提交边界。

## 副作用为什么需要清理

| 实现 | 关键步骤 | 边界 |
| --- | --- | --- |
| [useDebouncedValue](hooks/useDebouncedValue.ts) | 值或延迟变化时取消旧 timeout，只提交最后一次输入 | 首次渲染立即返回初始值；它延迟值更新，不是通用函数防抖 |
| [useInterval](hooks/useInterval.ts) | 用 ref 保存最近提交的回调，只有 delay 改变才重新订阅 | `null` 暂停；不能在 render 中启动定时器 |
| [usePrevious](hooks/usePrevious.ts) | render 读取 ref，Effect 在提交后保存本次值 | 返回上一次提交所保存的值，首次为 `undefined`；ref 更新不会引发 render |
| [useRequest](hooks/useRequest.ts) | 请求函数变化或 reload 时执行任务，清理时 abort，写入前再检查 signal | 请求函数必须用 `useCallback` 或模块级函数保持身份稳定 |

防抖中，如果每次输入都创建 timeout，却从不清理，最后会依次提交所有中间值。Interval 中，如果 Effect 永远捕获第一次 render 的回调，定时器会读到旧闭包；如果每次 render 都重建定时器，则无关的更新也会重置计时。这里把“最新回调”和“订阅生命周期”分别保存在 ref 与 Effect 中。

请求示例在 Effect 内创建 `AbortController`。切换请求函数或卸载时先让旧 signal 失效；即使异步函数完全忽略取消信号，旧结果也不能再写入状态。同步抛错和 Promise 拒绝都会进入 error 分支。演示中输入 `error` 可以触发失败，再修改输入或点击 Reload 恢复。它没有实现缓存、重试退避或请求去重。

StrictMode 会在开发环境额外执行 Effect 的建立与清理，用来暴露不对称的副作用。不要为了消除重复观察而移除清理或用全局标记跳过建立过程。可参照 React 官方的 [useEffect 说明](https://react.dev/reference/react/useEffect)。

## 外部状态为什么需要稳定快照

[createStore / useStore](hooks/useStore.ts) 把状态、订阅集合和通知过程直接展开。`getSnapshot` 在状态不变时返回同一个值；`setState` 用 `Object.is` 判断是否需要通知，退订函数移除对应监听器。对象状态必须不可变更新，原地修改后传回同一个对象不会触发通知。这里没有 selector、持久化或中间件。

[useLocalStorage](hooks/useLocalStorage.ts) 订阅浏览器 `storage` 事件处理其他标签页的修改，同一标签页则用自定义事件通知其他 Hook 实例。浏览器原生 `storage` 事件不会通知写入它的窗口。函数式 setter 在写入前重新读取存储，避免使用闭包里的旧值；更换 key 后会重新订阅。

`getSnapshot` 返回原始字符串，再在 render 中解析 JSON。如果在快照函数中反复解析对象，每次读取都产生新引用，React 会认为快照一直变化。稳定快照和退订规则见官方 [useSyncExternalStore](https://react.dev/reference/react/useSyncExternalStore)。

此 Hook 面向纯浏览器环境，初始值在首次挂载时固定。无效 JSON 使用初始值；JSON 数据形状不做运行时 schema 校验。存储权限、容量、循环引用等错误会抛给调用方，不会假装写入成功。同页同步只保证通过此 Hook 写入的情况；外部代码直接调用 `localStorage.setItem` 时也需发出通知。不同标签页的“读后写”不具备事务原子性。

## 虚拟列表如何减少 DOM

固定行高为 `h`，视口高度为 `H`，滚动距离为 `s`。可见区起点来自 `floor(s / h)`，终点来自 `ceil((s + H) / h)`，再向两侧增加 overscan 并限制到数据范围。外层占位高度仍为 `数据条数 × h`，实际挂载的行定位到 `start × h`。

因此，2,000 行数据不会产生 2,000 个行 DOM。默认视口 240px、行高 40px，顶部挂载 8 行，滚动中通常挂载 10 行。这个实现要求每行的实际高度与 `rowHeight` 一致，不处理不定高测量、任意数据缩短后的滚动锚定或完整列表的屏幕阅读器导航。

Modal 使用原生 `dialog.showModal()` 处理顶层显示、焦点约束和背景不可交互，组件手写控制状态、Portal、Escape 取消和遮罩点击。它不是自写 focus trap；焦点返回和浏览器差异仍需在真实浏览器验证。

## 七种内置 Hooks 的简易运行模型

[runtime/hooks.ts](runtime/hooks.ts) 没有导入 React，实现 `useState`、`useEffect`、`useRef`、`useMemo`、`useCallback`、`useReducer` 和 `useContext` 的核心机制。每个 runtime 保存自己的槽位数组；每次 render 把游标归零，相同调用顺序才能取回相同状态。这解释了为什么普通 Hooks 不能随意放进条件或循环。模型对槽位类型或总数变化报错，但无法检测所有逻辑上错误的调用交换。

State setter 将更新加入队列，并在微任务中合并重新渲染。下一次读取状态槽位时，按顺序执行值替换或函数式更新。因此连续两次 `setCount(count + 1)` 都基于同一个 render 快照，而连续两次 `setCount(value => value + 1)` 会累加。每个槽位保存稳定 setter，避免旧事件处理器写错另一个槽位。

Ref 保存稳定对象，改变 `.current` 不触发调度。Memo 逐项用 `Object.is` 比较依赖；Callback 通过 Memo 缓存函数引用。Reducer 用稳定 dispatch 把 action 转成状态更新。Effect 在 `onCommit` 之后建立，依赖变化时先清理旧资源，dispose 时最后清理；省略依赖表示每次提交执行，空数组表示首次建立。

Context 通过 `provide(context, value, render)` 建立同步作用域，`useContext` 读取最近的值并在退出后恢复。它不维护组件树或订阅，Provider 值变化需要显式 render。该模型只有一个同步组件，Effect 也在提交函数内同步运行；没有 Fiber、DOM diff、并发渲染、优先级、Suspense、错误回滚或 React 的完整更新优化。真实 React 的 Effect 调度与缓存语义请对照官方 [Hooks](https://react.dev/reference/react/hooks)、[useEffect](https://react.dev/reference/react/useEffect) 和 [useMemo](https://react.dev/reference/react/useMemo)。

页面的 Mini Hooks runtime 区域把模型输出交给真实 React 展示，Model setState 和 Model dispatch 按钮驱动的是这个独立模型。源码测试位于 [runtime.test.ts](__test__/runtime.test.ts)。

## 高频自定义 Hooks 补充索引

| 实现 | 需要讲清楚的机制 |
| --- | --- |
| [useToggle](hooks/useToggle.ts) | 函数式切换避免连续调用丢更新，显式 `false` 与省略参数不同 |
| [useDebounce](hooks/useDebounce.ts) | 延迟函数调用，保存最后参数，提供 run/cancel/flush；与延迟值的 useDebouncedValue 区分 |
| [useThrottle](hooks/useThrottle.ts) | 首次立即执行，窗口内合并参数，在末尾执行最后一次；cancel 同时重置窗口 |
| [useLatest](hooks/useLatest.ts) | 在 layout Effect 更新 ref，让事件和定时器读取最近提交的回调，不在 render 中发布尚未提交的值 |
| [useStorage](hooks/useStorage.ts)、[useSessionStorage](hooks/useSessionStorage.ts) | local/session 共用 JSON、订阅和 setter 规则；sessionStorage 随标签页会话隔离 |
| [useEventListener](hooks/useEventListener.ts) | target 和配置决定订阅生命周期，回调身份变化不必重新绑定；对称移除 capture 监听 |
| [useClickOutside](hooks/useClickOutside.ts) | 在 ownerDocument 捕获 pointerdown，通过 composedPath 判断事件是否经过目标 |
| [useTimeout](hooks/useTimeout.ts) | 回调保持最新，delay 改变重建 timeout，null 取消，卸载清理 |
| [useWindowSize](hooks/useWindowSize.ts)、[useScroll](hooks/useScroll.ts) | 从浏览器读取初值，订阅事件；滚动目标切换时重置坐标并解绑旧元素 |
| [useIntersectionObserver](hooks/useIntersectionObserver.ts) | 观察目标、替换配置、disconnect，并拒绝清理后到达的旧回调 |
| [usePreviousDistinct](hooks/usePreviousDistinct.ts) | 与上一次提交不同，保存上一个不同值；相同值的无关 render 不覆盖历史 |
| [useAsync](hooks/useAsync.ts) | 手动 run、cancel、idle/loading/success/error 与任务替换时的失效保护 |
| [useFetch](hooks/useFetch.ts) | 在 useRequest 上增加 HTTP 状态校验、JSON 读取和调用方 decode |
| [useLockFn](hooks/useLockFn.ts) | 同一实例在任务完成前共用一个 Promise，成功或拒绝都释放锁 |

Debounce 是尾沿执行；Throttle 是首沿加尾沿，单次调用不会在尾沿额外重复。持续触发时，尾沿使用最近一次参数，并成为下个窗口的起点。它们假定 delay 是有限非负数，依赖变化或卸载会取消旧定时器。浏览器定时器可能延迟执行，示例不承诺精确到毫秒。

`useEventListener`、`useClickOutside`、`useScroll` 和 `useIntersectionObserver` 接收元素本身，页面通过 callback ref + state 把 DOM 节点交给它们；只修改普通 `ref.current` 不会自动触发 render，也就不能自动建立新订阅。它们面向纯浏览器环境，没有 SSR 分支。

Observer 配置中，React 版比较 root、rootMargin 和序列化 threshold，避免内联数组导致无意义重订阅。不支持 IntersectionObserver 时返回 `supported: false`，不会伪造进入视口的结果；图片组件选择立即加载作为降级。IntersectionObserver 的通知是浏览器异步交付的，测试中的 observer double 只能验证分支和清理，不能证明布局是否相交，详见 [MDN](https://developer.mozilla.org/en-US/docs/Web/API/Intersection_Observer_API)。

`useAsync` 的 run 处理错误后返回 `undefined`，通过 state 暴露错误；取消后回到 idle。它只阻止旧任务写入内部状态，忽略 signal 的任务自身仍可能完成并返回数据。`useLockFn` 则把同一 Promise 返回给重复调用者，后续参数不会替换首次参数，拒绝继续向调用方传播；它不是根据参数去重或全局互斥锁。

`useFetch` 的 decode 应使用模块级函数或稳定回调，否则函数身份改变会重启请求。演示请求同源的 `public/topics.json`，走真实 fetch 和 HTTP 状态检查，不依赖任何后端。TypeScript 泛型不能校验网络响应，所以解析函数接收 unknown，再显式检查数据形状。

## 补充组件与 HOC

| 实现 | 核心机制与范围 |
| --- | --- |
| [Accordion](components/Accordion.tsx) | 单个展开项、按钮与面板的 aria 关联；关闭面板保留其子状态 |
| [AutoComplete](components/AutoComplete.tsx) | 受控输入、固定选项过滤、方向键/Enter/Escape、外部点击关闭和 combobox 关联 |
| [DynamicForm](components/DynamicForm.tsx) | 纯校验器、提交后错误展示、稳定 ID 的动态字段、规范化提交数据 |
| [UncontrolledInput](components/UncontrolledInput.tsx) | defaultValue 初始化，DOM 保存编辑内容，提交时通过 ref 读取 |
| [LazyImage](components/LazyImage.tsx) | 接近视口才赋 src、预留尺寸、加载失败提示、加载后解除观察 |
| [withLoading](hoc/withLoading.tsx) | HOC 接收组件返回组件，按 loading 决定是否挂载原组件 |

自动补全的字符串选项必须唯一，过滤后重新选择活动项；它支持键盘与鼠标选择，不包含远程搜索、多选、分组或弹层定位。动态表单按字段 ID 保存身份，删除第一项不会让后一项继承错误的 DOM/输入状态；校验器以 ID 返回字段错误。邮箱规则只是面试示例的基本格式校验，提交仅调用本地回调。

`withLoading` 应在模块级创建，不能在 render 中反复生成新组件类型。它用 componentProps 隔离包装层与原组件参数；切换 loading 会卸载原组件，因此不会保留原组件的局部状态，也不自动转发 ref 或提升静态属性。[ExtendedDemos](demos/ExtendedDemos.tsx) 将这些实现串成固定数据演示。

## 验证范围

[行为测试](__test__/implementations.test.tsx) 使用 Vitest、jsdom 和 React `act`，覆盖防抖清理、闭包更新、请求竞态、存储同步、订阅退订、分页边界、Tabs 键盘切换、树展开、虚拟窗口和 reducer。补充测试位于 [extended-hooks.test.tsx](__test__/extended-hooks.test.tsx) 与 [extended-components.test.tsx](__test__/extended-components.test.tsx)，覆盖节流尾沿、异步锁释放、手动任务竞态、HTTP 失败、动态字段删除和整页模型交互。jsdom 不具备真实布局或原生 dialog 的完整交互能力，测试不能代替真实浏览器对滚动、焦点和遮罩的验证。
