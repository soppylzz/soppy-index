# 值、相等与强制转换

## 1. 原始值与对象

原始值有 `undefined`、`null`、boolean、number、bigint、string、symbol；对象包含数组、函数、日期等。原始值按值复制；变量持有对象引用，赋值会复制引用，所以两个变量可指向同一个对象。JavaScript 函数参数始终按值传递：传对象时复制的是引用值，函数可改对象内容，但重设参数不会让调用方变量改指向。

`typeof null === "object"` 是历史遗留；`typeof function(){} === "function"` 是可调用对象的特殊结果。判断数组用 `Array.isArray`，不要用 `typeof`。`Object.freeze` 只浅冻结；`structuredClone` 能复制支持的结构及循环引用，但不能复制函数，也不是所有宿主对象都支持，且原型/描述符语义不等于手工深拷贝。

## 2. 三种常见相等

```js
console.log(NaN === NaN) // false
console.log(Object.is(NaN, NaN)) // true
console.log(Object.is(0, -0)) // false
console.log([NaN].includes(NaN)) // true
```

`===` 不做类型转换；`Object.is` 采用 SameValue；`includes` 使用 SameValueZero，因此把 `NaN` 看作相等且不区分正负零。`Map`/`Set` 的键也使用 SameValueZero 语义。`==` 有一套复杂转换规则，面试可以说明 `null == undefined` 为 true、对象比较先转原始值等重点，业务代码通常优先 `===`。

## 3. 转换不要靠直觉

`+` 可能做字符串拼接；其他算术运算通常转换成数字。对象会经 `Symbol.toPrimitive`、`valueOf`、`toString` 等路径转原始值；`[] == 0` 之类题目应按算法逐步推，而非记答案。`||` 按假值回退，会覆盖合法的 `0`、`""`；`??` 只在 `null`/`undefined` 时回退。

```js
const pageSize = 0
console.log(pageSize || 20) // 20
console.log(pageSize ?? 20) // 0
```

`Number` 使用 IEEE 754 双精度浮点，大整数超出安全整数范围会失精度；`BigInt` 可表示任意精度整数，但不能直接与 `number` 混做算术。金额可用最小货币单位整数或十进制库，注意舍入规则。日期涉及时区与解析格式，接口最好传明确时区/偏移或标准时间戳。

资料：[ECMAScript 语言类型](https://tc39.es/ecma262/#sec-ecmascript-language-types)、[相等比较](https://tc39.es/ecma262/#sec-abstract-equality-comparison)。
