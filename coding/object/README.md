# 对象手写：原型关系与对象图

new 和 instanceof 关注对象与构造器之间的关系，深拷贝关注多个对象之间的引用关系。把它们都理解成“复制属性”，就会遗漏原型、构造器返回值以及共享引用。

| 实现 | 主要问题 | 对应测试 |
| --- | --- | --- |
| [new.ts](./new.ts) | 普通函数构造器如何得到实例 | [new.test.ts](./__test__/new.test.ts) |
| [instanceof.ts](./instanceof.ts) | 原型链上是否存在目标对象 | [instanceof.test.ts](./__test__/instanceof.test.ts) |
| [deep-clone.ts](./deep-clone.ts) | 如何复制对象图并保留内部关系 | [deep-clone.test.ts](./__test__/deep-clone.test.ts) |

## newObject：对象创建后，还要处理返回值

教学模型先创建一个以 constructor.prototype 为原型的对象，再把它作为 this 调用普通函数构造器。如果构造器显式返回非 null 对象或函数，采用返回值；如果返回原始值或没有返回值，采用先创建的对象。

因此仅仅执行构造器不足以模拟 new，也不能不加判断地返回构造器的结果。constructor.prototype 不是对象时，本实现使用 Object.prototype 作为新对象的原型。

代码用 Reflect.apply 调用普通函数，不能直接执行 class 构造器，也没有真正建立构造调用中的 new.target。绑定函数没有自身 prototype，也被入口拒绝。这里限定普通函数构造器，不实现判断任意函数是否可构造的完整内部操作。需要真实构造语义时应使用 Reflect.construct；它与 apply 分别对应构造和调用。[Reflect.construct 规范](https://tc39.es/ecma262/multipage/reflection.html#sec-reflect.construct)

## instanceOf：检查链上的对象身份

普通模型取出右侧构造器的 prototype，再从左侧对象的直接原型开始向上查找。比较的是链中对象和 prototype 是否为同一个对象，不是比较名字或属性形状。左侧对象自身也不是第一个比较对象。

数组既能在链上找到 Array.prototype，也能继续找到 Object.prototype。原始数字不是 Number 的实例，而 Number 包装对象才有相应原型链。若来自另一个 realm，构造器的 prototype 身份可能不同，因此 instanceof 不适合作为所有场景下的数组识别方法。

当前版本只检查可调用右值与普通原型链，不实现 Symbol.hasInstance 或原生绑定函数的特殊行为。原生 instanceof 会先考虑右侧的自定义实例判定钩子，再进入相应过程。[instanceof 规范](https://tc39.es/ecma262/multipage/ecmascript-language-expressions.html#sec-instanceofoperator)

## 深拷贝复制的是图，不只是嵌套树

如果 source.first 和 source.second 指向同一个对象，克隆结果的两个字段也应指向同一个克隆对象。分别递归复制每个字段会把这层关系拆散。自引用对象则会让没有记录的递归永远重复下去。

WeakMap 记录“原对象到克隆对象”的映射。创建目标后立即登记，再递归处理成员；下次遇到原对象时直接返回已有目标。这个顺序同时处理循环引用和共享引用。

在普通对象图的遍历模型下，设 V 为对象数，E 为需要访问的属性或容器条目数，时间为 O(V+E)，映射空间为 O(V)，另外还需要与递归深度相关的调用栈。深度过大仍可能栈溢出；WeakMap 并不会消除递归栈。

## 先建立内部状态，再复制自己的属性

| 类型                    | 当前策略                                         |
| ----------------------- | ------------------------------------------------ |
| 普通对象、null 原型对象 | 创建相应原型的空对象                             |
| 数组                    | 创建相同长度的数组，保留空槽                     |
| Date                    | 复制时间值                                       |
| RegExp                  | 复制模式和 flags，再通过属性描述符恢复 lastIndex |
| Map                     | 克隆键和值，共用同一个映射表                     |
| Set                     | 克隆每个成员，共用同一个映射表                   |
| 函数                    | 保留引用，不复制闭包                             |

Map 的键也会克隆。因此原始对象键不能再直接查询克隆 Map，应使用图中对应的克隆键；克隆后的引用别名保持一致。

Reflect.ownKeys 会取到字符串键、Symbol 键和不可枚举属性。随后按属性描述符复制，而不是直接读取所有属性值；访问器保留原 getter/setter 函数，不会为了复制属性而执行它们。数据属性的值才继续递归。克隆后读取访问器时，它仍会正常运行。[属性描述符规范](https://tc39.es/ecma262/multipage/fundamental-objects.html#sec-object.getownpropertydescriptor)

## 支持范围不能由一个泛型签名保证

实现明确拒绝不支持的对象，例如 WeakMap、WeakSet、Promise、二进制数据、DOM 节点和自定义类实例。简单地保留这些对象的原型，不能制造出它们所需的内部槽或私有字段。

当前实现面向同一 realm 中的这些内置类型；不保证代理对象、跨 realm 对象、内置类型子类的完整行为。属性描述符会保留，但不可扩展、seal、freeze 等对象级状态不会一起恢复。返回类型 T 表示接口上的对应关系，不代表任意 T 都能正确克隆。

## 验证入口

在 coding/object 中运行 `pnpm test`。深拷贝用例同时检查结构、引用身份、循环、描述符和不支持类型；只比较 JSON 字符串无法证明这些行为。类型检查统一在根目录运行 `pnpm typecheck`。
