# 作用域、闭包与 this

## 1. 词法作用域先于调用

函数定义时所处的词法环境决定它能访问哪些外层绑定，调用位置不改变这条作用域链。`let`/`const` 是块级绑定，从作用域开始到初始化前处于暂时性死区；`var` 是函数作用域，在声明处理阶段初始化为 `undefined`。所谓“提升”是描述声明在执行前被处理，不能理解为源码行真的移动。

```js
function makeCounter() {
  let count = 0
  return () => ++count
}
const next = makeCounter()
console.log(next()) // 1
console.log(next()) // 2
```

闭包保留对词法绑定的访问能力，不是每次调用都复制一份旧值。若闭包长期被事件监听器、计时器或缓存持有，相关环境可能继续可达；清理监听器/计时器可减少不必要的保留。

## 2. `this` 看调用方式

普通函数的 `this` 由调用形式决定：`obj.fn()` 的接收者是 `obj`；`fn.call(value)` 显式指定；`new Fn()` 创建新实例并绑定它。严格模式下普通独立调用的 `this` 是 `undefined`，非严格模式可能替换为全局对象。箭头函数没有自己的 `this`，从外围词法环境捕获；`bind` 也不能改箭头函数的词法 `this`。

```js
const user = {
  name: "Ada",
  getName() {
    return this.name
  },
}
const getName = user.getName
console.log(user.getName()) // Ada
console.log(getName.call({ name: "Lin" })) // Lin
```

“方法赋给变量后丢 this”是因为调用形式变了，不是函数对象发生变化。类方法默认也不会自动绑定实例；传给回调时用 `bind`、包装箭头函数或其他明确绑定方式。

## 3. 执行上下文与闭包题

循环里用 `var` 声明的是同一个函数作用域绑定；异步回调执行时看到循环结束后的值。`let` 的 `for` 循环迭代绑定按规范为每轮创建对应环境。解释时区分“闭包读哪个绑定”和“回调何时执行”，不要说成“异步导致 var 失效”。

资料：[ECMAScript 执行上下文](https://tc39.es/ecma262/#sec-execution-contexts)、[函数定义](https://tc39.es/ecma262/#sec-function-definitions)。
