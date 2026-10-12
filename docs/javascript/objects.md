# 对象、原型链与 Proxy

## 1. 属性读取是沿原型链搜索

对象有自有属性和 `[[Prototype]]`。读取 `obj.key` 时先查自有属性，再沿原型链查；写入通常在接收者上创建/更新属性，若遇到 setter 或不可写描述符则有细节差异。`Object.hasOwn(obj, key)` 检查自有属性；`in` 包含继承属性。`Object.create(proto)` 可显式指定原型。

`class` 是基于原型机制的语法，实例方法放在原型上；类字段是每个实例自己的字段。`extends` 连接构造器与实例原型链。原型链影响查找，不等于“复制父类全部属性”。

## 2. 描述符与枚举

属性可有数据描述符（value、writable）或访问器描述符（get、set），还受 enumerable、configurable 控制。`Object.keys` 只列可枚举的自有字符串键，`Reflect.ownKeys` 包含自有字符串和 Symbol 键，包括不可枚举键。对象展开与 `Object.assign` 是浅复制，访问 getter 时还可能触发执行。

```js
const source = { nested: { value: 1 } }
const copy = { ...source }
copy.nested.value = 2
console.log(source.nested.value) // 2
```

## 3. Proxy 与 Reflect

Proxy 可拦截 `get`、`set`、`has` 等内部操作；`Reflect` 提供对应的默认行为，便于保留接收者语义。代理必须遵守不变量，比如不能把不可配置、不可写属性的值伪装成另一个值。代理不是安全沙箱：持有原始对象的代码仍可直接操作它，且恶意对象可能通过 getter 执行代码。

```js
const target = { value: 1 }
const proxy = new Proxy(target, {
  get(object, key, receiver) {
    return Reflect.get(object, key, receiver)
  },
})
```

原型污染与不可信对象合并见 [Security](../security/engineering.md)。

资料：[ECMAScript 对象内部方法](https://tc39.es/ecma262/#sec-object-internal-methods-and-internal-slots)、[Proxy Objects](https://tc39.es/ecma262/#sec-proxy-objects)。
