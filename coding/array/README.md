# 数组手写：遍历的不是一份固定值列表

数组有长度，也可能有不存在的索引。遍历过程中，回调还可能添加、删除或替换元素。要说明 map、filter、reduce，必须先明确“何时决定范围”和“何时读取元素”。

| 实现 | 输出规则 | 对应测试 |
| --- | --- | --- |
| [map.ts](./map.ts) | 对存在的索引转换，结果保留空槽 | [map.test.ts](./__test__/map.test.ts) |
| [filter.ts](./filter.ts) | 收集判断为真的原元素，结果稠密 | [filter.test.ts](./__test__/filter.test.ts) |
| [reduce.ts](./reduce.ts) | 用累加器连续合并 | [reduce.test.ts](./__test__/reduce.test.ts) |
| [flatten.ts](./flatten.ts) | 按深度展开嵌套数组 | [flatten.test.ts](./__test__/flatten.test.ts) |
| [unique.ts](./unique.ts) | 保留第一次出现的值 | [unique.test.ts](./__test__/unique.test.ts) |

## 空槽和 undefined 不是同一件事

一个长度为 2、但只设置了索引 1 的数组，在索引 0 处没有元素。显式放入 undefined 则是“索引存在，值为 undefined”。仅用读取结果判断，两者看起来相同；使用索引是否存在的判断才能区分。

map、filter、reduce 通过 index in array 判断是否访问该位置。这个判断也能命中原型链上继承的数字属性，不能简单等同于检查自身属性。map 预先创建原长度的结果数组，跳过的位置继续为空槽；filter 使用 push，因此不会保留空槽。

unique 用 for...of 获取数组迭代值，空槽会以 undefined 参与去重。这和 map 等方法跳过空槽的行为不同。flatten 则在每一层实际遍历的数组上跳过空槽。

## 长度先固定，元素随后再读取

这三个回调方法在开始时保存 length，因此回调追加到原长度以外的元素不会被访问。每次到达一个索引时再判断它是否存在、再读取值，所以删除未访问位置会使它被跳过，修改未访问位置会改变后续回调收到的值。[数组迭代方法规范](https://tc39.es/ecma262/multipage/indexed-collections.html#sec-array.prototype.map)

filter 在执行判断回调之前保存当前 value。即使回调把当前位置改成另一个值，条件成立时加入结果的仍是本次保存的原值。map 加入的是回调返回值，不能把二者的收集逻辑混淆。

## reduce 的初始值要看是否传入

未传初始值时，先寻找第一个存在的元素，把它作为累加器，后续存在元素才触发回调。空数组和全部为空槽的数组都找不到这个元素，因此需要抛错。

显式传入 undefined 也属于传了初始值：空输入应返回 undefined，而不是进入“寻找首元素”的分支。实现用剩余参数元组的长度区分这两种调用，而不使用值相等判断。回调的当前索引仍是原数组索引，不会因为跳过空槽而重新编号。[reduce 规范](https://tc39.es/ecma262/multipage/indexed-collections.html#sec-array.prototype.reduce)

## 扁平化与去重各自保留什么

flatten 默认只展开一层，深度为 0 时不展开嵌套数组；结果仍是新的外层数组。深度会向下取整，负数和 NaN 按 0 处理，Infinity 表示持续展开。没有展开的子数组保持原引用。

递归依赖“剩余深度”，只有子值为数组且剩余深度大于 0 才继续深入。当前实现假定嵌套数组无环，不提供极深嵌套的栈保护。

unique 使用 Set 记录是否见过，再把首次出现的原值放入结果。对象按身份比较，内容相同的两个对象不自动合并；NaN 可以和 NaN 判重，正负零也视为相同。本实现保留首次遇到的值，因此首次为负零时结果中仍可保留负零，不是直接把 Set 转成数组。[Set 相等规则](https://tc39.es/ecma262/multipage/keyed-collections.html#sec-set-objects)

## 实现范围与复杂度

这些接口面向真实数组，没有实现原生 API 的完整类数组借用、species 和类型转换规则。假设单次回调成本为 O(1)，map、filter、reduce 各进行 O(n) 次索引检查；flatten 与访问到的元素和索引数量相关。unique 在常见哈希集合成本模型下期望为 O(n)，不将这个成本模型当成 ECMAScript 对每次 Set 操作的固定时间保证。

在 coding/array 中运行 `pnpm test`，或用 `pnpm test __test__/map.test.ts` 检查长度快照和空槽。根目录 `pnpm typecheck` 统一检查类型；空槽测试中的特殊数组字面量是有意构造的行为输入。
