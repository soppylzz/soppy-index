# 数组与集合：面试中容易混淆的语义

## 1. 数组空槽不是 `undefined`

```js
const sparse = [, 1]
console.log(0 in sparse) // false
console.log(sparse[0]) // undefined
console.log(sparse.map((value) => value * 2).length) // 2
```

读空槽得到 `undefined`，但键并不存在。`map` 等方法会跳过空槽，结果仍保留对应空槽；`for...of` 会读到 `undefined`。`delete array[0]` 产生空槽，不会让数组长度减少；删除列表项通常用 `splice` 或不可变地过滤。业务上应避免稀疏数组，面试时先问“键存在吗”。

## 2. 改原数组还是返回新数组

`sort`、`reverse`、`splice`、`push` 会改原数组；`map`、`filter`、`slice` 通常返回新数组，但其元素若是对象仍共享引用。`toSorted`、`toReversed`、`toSpliced` 提供不改原数组的版本，具体运行环境要确认支持。默认 `sort` 把元素转字符串比较，数字排序要写比较函数；比较函数还应满足一致性，不能随机返回正负值。

```js
const numbers = [2, 10, 1]
console.log(numbers.toSorted((a, b) => a - b)) // [1, 2, 10]
```

## 3. Map、Set 与弱集合

对象键通常是字符串或 Symbol，`Map` 可用任意值作键并保留插入顺序。`Set` 去重使用 SameValueZero：`NaN` 与 `NaN` 被视为同一个值，两个内容相同但引用不同的对象仍是不同值。`WeakMap` 的键不被集合强保留，且不能枚举；适合把元数据关联到对象生命周期，不能用它做需要列举所有在线对象的缓存。`WeakRef` 与 FinalizationRegistry 也不提供确定的回收时机，不应承载业务正确性。

## 4. 复制和遍历的边界

对象/数组展开是浅复制；`structuredClone` 支持许多内建结构和循环引用，但不支持函数，转移 ArrayBuffer 后原缓冲会失效。`JSON.parse(JSON.stringify(value))` 会丢失 `undefined`、函数、Symbol、循环引用，并改变日期等类型，不是通用深拷贝。遍历对象时区分 `Object.keys`、`for...in` 和 `Reflect.ownKeys`：自有/继承、可枚举/不可枚举、字符串/Symbol 的范围不同。

资料：[ECMAScript Array Objects](https://tc39.es/ecma262/#sec-array-objects)、[Keyed Collections](https://tc39.es/ecma262/#sec-keyed-collections)、[HTML Structured Clone](https://html.spec.whatwg.org/multipage/structured-data.html#structured-clone)。
