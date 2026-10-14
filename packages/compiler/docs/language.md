# 语言子集与诊断协议

[返回 README](../README.md)

## 词法范围

| 分类 | 精确支持范围 |
| --- | --- |
| 标识符 | ASCII `[A-Za-z_$][A-Za-z0-9_$]*`，关键字和保留字不可作名称；`console` 保留给内置成员 |
| 数值 | 非负有限十进制整数或 `digits.digits`，整数部分不允许多位前导零；不支持符号、指数、进制前缀、分隔符或 BigInt |
| 字符串 | 单/双引号；仅 `\n`、`\r`、`\t`、`\\`、`\"`、`\'` 六种转义；原始 UTF-16 内容允许；不支持 Unicode/十六进制转义、模板、跨行、续行 |
| 空白 | 空格、tab、LF、CR、CRLF；不支持完整 ECMAScript Unicode 空白集合 |
| 注释 | `//` 到行尾、非嵌套 `/* ... */`；未闭合明确诊断 |
| 位置 | offset/line/column 全部从 0 起，UTF-16 code unit 计数；`[start,end)`；CRLF 算一个换行，tab 算一个 code unit |

面向人的错误文本把行、列显示为从 1 起；JSON 诊断保留从 0 起。Source Map 编码内部从 0 起，查询库的 `line` 从 1 起、`column` 从 0 起，测试会显式转换。

## 语法与语义

声明和表达式语句必须有分号；不实施 ASI。仅支持单个 `const name[: primitive] = expression;`，初始化必需。TS 模式参数必须显式标注 `string/number/boolean`；变量和箭头返回值可有限推断。JS 模式拒绝类型标注，允许无标注参数，仍做名称绑定和降级前提检查，检查已知类型与参数数量，但不从调用点推断参数类型；unknown 传播时不作完整类型证明。JS 模式还拒绝函数值作为实参与调用 unknown 值，排除未经证明的回调/隐式函数字符串化观察路径。这使相同的现代 JS 示例可以观察语法降级，不能声称完成 JS 静态类型证明。

```text
program    := (import | declaration | expression ';')*
declaration:= ['export'] 'const' identifier [':' primitive] '=' expression ';'
expression := arrow | postfix ('+' postfix)*
postfix    := primary ('.' 'log' | '(' [expression (',' expression)*] ')')*
primary    := identifier | literal | '(' expression ')'
arrow      := '(' [parameter (',' parameter)*] ')' [':' primitive] '=>' expression
```

上面是阅读用简化文法，成员规则额外要求对象正好是 `console`。`console` 只能用作 `console.log`，没有一般对象成员、可选链或索引访问。箭头优先级最低，通过参数圆括号的 lookahead 与分组表达式区分；`+` 左结合，调用/成员优先于 `+`。`=>` 前不允许换行。仅表达式函数体；无尾逗号、rest、默认参数或单参数省略括号。

TS 中 `+` 只允许 `number+number`、`string+string`，不模拟 JS 自动转换。基本类型按类型而非字面量比较；函数签名按参数列表与返回值精确比较，未实现函数类型标注、上下文类型、协变/逆变或结构化对象类型。`console.log` 明确建模为接受零个或多个原始值、返回 `void` 的内置签名，不加载 `lib.d.ts`。

Binder 先登记模块声明，再按源码顺序激活。引用当前尚未激活的符号报告 `B003`，包括 TDZ、递归，以及函数体中未来才初始化的外部名称。最后一种在真实 JS 中可能安全，这里也拒绝，以使降级前提可直接验证。参数建立子作用域，可遮蔽外部变量；同作用域重复声明和未声明名称分别报告 `B001/B002`。

没有赋值、块作用域、循环、异常控制流、类、对象、数组、泛型、联合类型、解构、async、JSX 或 `new`。`this/arguments/super/new.target` 与相关保留字会明确报错。函数构造、原型、名称反射无法在子集内观察，因此普通函数替换箭头的额外可构造性不改变这里可表达的程序。

## 模块扩展

只新增前置静态具名导入 `import { name } from "./file";`、副作用导入 `import "./effect";`、`export const`。导入必须排在执行语句之前。不支持 alias、默认导出、re-export、动态 import/require 或 npm 包解析。路径与跨模块边界见[模块说明](modules.md)。单文件 `compile/check` 不解析具名导入，请用 `modules` 建图；Vite 教学插件仅接受自包含的 `.mini.ts` 模块。

CJS 输出还保留 `require/module/exports/Object`，避免生成的运行时代码与用户变量碰撞。ESM 模式不增加这些保留名称。

## 诊断与限制

所有编译诊断有 `code/phase/message/file/start/end`。词法、语法采用首错停止；名称和类型错误可在一次分析中收集多个，存在任何诊断时不进入转换。I/O、CLI 参数错误由入口报告英文消息和非零退出码，不伪造源码范围。

| 阶段 | 主要 code | 意义 |
| --- | --- | --- |
| lexer / parser | L001 / P001 | 非法字符、词法范围或不支持语法，含准确位置 |
| binder | B001–B004 | 重复、未声明、前向引用、导入未解析 |
| checker | T001–T006 | 初始化、参数数量、实参、返回值、加法、不可调用 |
| modules | M001–M009 | 路径边界、找不到文件、环、缺导出、解析、单文件导入、产物重名、CJS 名称碰撞、输出目录与源码目录重合 |
| declaration | D001–D002 | 类型不可打印、函数导出不是直接箭头 |

类型检查发生在擦除前。每次编译重新建立符号与类型；没有语言服务、错误恢复、增量缓存、控制流收窄或完整 TS 兼容性。
