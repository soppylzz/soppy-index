# 装饰器、namespace 与旧代码互操作

这些特性在框架或旧项目中会遇到，但不应抢在类型基础之前学。先辨认项目采用的语法版本和编译配置，再看运行时产物。

## 1. 新旧装饰器是两套模型

TypeScript 5.0 起支持与现代 JavaScript 装饰器提案相符的实现；启用 `experimentalDecorators` 则使用旧式实验实现。两者的函数签名、调用时机和输出语义不完全相同。旧式 `emitDecoratorMetadata` 与新装饰器不兼容，新装饰器也不支持参数装饰器。使用依赖注入框架时，先查该框架要求的模式，不能只看代码中都有 `@` 就混用。

```ts
function logged<This, Args extends unknown[], Result>(
  original: (this: This, ...args: Args) => Result,
  context: ClassMethodDecoratorContext<This, (this: This, ...args: Args) => Result>
) {
  return function (this: This, ...args: Args): Result {
    console.log(String(context.name))
    return original.apply(this, args)
  }
}

class Counter {
  @logged
  add(a: number, b: number) {
    return a + b
  }
}
```

装饰器在类定义/初始化阶段参与替换或初始化成员，不是在每次读取 `@logged` 文本时执行。例子里的日志发生于被替换的方法调用；实际装饰器可能在定义时也做工作。装饰器不是类型级宏，不能凭它自动获得运行时参数校验。

## 2. namespace 与 ESM

`namespace` 可把声明组织到一个命名空间，历史上常用于未使用模块系统的代码及 `.d.ts` 扩展。现代应用优先用 ESM 文件边界与显式 import/export。`namespace` 的名称合并、全局声明与模块扩展依赖声明位置；在 `.d.ts` 里补第三方模块类型时，要区分 `declare global` 与 `declare module "包名"`，避免意外污染全局类型。

## 3. 发布包的互操作检查

一个库同时向 ESM/CJS 消费者发布时，`exports`、实际 JS 入口、`.d.ts` 路径与 `moduleResolution` 必须一致。`tsc` 通过只能证明当前配置下类型能解析，不能证明 Node 实际运行能加载。可在最小消费者项目中分别执行 ESM 导入和 CJS require，并检查类型定义是否描述真实导出。

资料：[TypeScript 5.0：Decorators](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-5-0.html#decorators)、[Namespaces and Modules](https://www.typescriptlang.org/docs/handbook/namespaces-and-modules.html)、[Modules Reference](https://www.typescriptlang.org/docs/handbook/modules/reference.html)。
