# TypeScript ACM 模式

> ACM 模式（牛客网等 OJ 的判题形式）要求自己完成输入输出：程序从 stdin 读原始数据、向 stdout 打印结果；LeetCode 核心码模式则只填函数体。因此比核心码模式多一层考察——把题目输入解析成合用的数据结构。牛客的 Node 判题环境为 CommonJS，直接用 `require` 读入。

## 读取输入

一次性读完 stdin，按任意空白切成 token 流，再用游标依次取用——适用于绝大多数题目：

```ts
const fs = require("fs")

const tokens = fs.readFileSync(0, "utf8").trim().split(/\s+/)
let idx = 0
const next = () => tokens[idx++]
const nextNum = () => Number(next())
```

- `readFileSync(0, "utf8")` 直接读文件描述符 `0`（stdin），不需要打开文件。
- `trim()` 去掉末尾换行；`split(/\s+/)` 同时兼容空格、`\n`、`\r\n`，行结构因此不重要，只关心 token 顺序。
- 少数「边读边算」或交互题按行读，用 `readline` 的事件回调：

```ts
const readline = require("readline")

const rl = readline.createInterface({ input: process.stdin })
rl.on("line", (line) => {
  // one line per callback, without the trailing newline
})
rl.on("close", () => {
  // input finished, print accumulated results here if needed
})
```

## 常见输入形态

| 输入格式 | 解析写法 |
| --- | --- |
| 第一行 `n`，接下来 `n` 个整数 | `const n = nextNum()`，再 `Array.from({ length: n }, nextNum)` |
| `n` 行 `m` 列矩阵 | 两层循环各调一次 `nextNum()`，无需关心换行位置 |
| 每行长度本身有语义（行内个数不定且未给计数） | 只能按行解析，用上面的 readline 逐行 `split` |
| 多组用例直到 EOF | `while (idx < tokens.length) { solveCase() }` |

## 输出

- 每行一个结果直接 `console.log`；行数很大时先收进数组，最后 `console.log(out.join("\n"))` 一次写出。
- 留意题目要求空格分隔还是别的分隔符，通常是 `nums.join(" ")`。

## 完整示例

第一行输入 `n`，第二行输入 `n` 个整数，升序输出一行空格分隔的结果：

```ts
const fs = require("fs")

const tokens = fs.readFileSync(0, "utf8").trim().split(/\s+/)
let idx = 0
const nextNum = () => Number(tokens[idx++])

const n = nextNum()
const nums = Array.from({ length: n }, nextNum)

nums.sort((a, b) => a - b)
console.log(nums.join(" "))
```

本地验证：本仓库是 ESM，`require` 写法存成 `.cts` 再跑 `printf '5\n3 1 2 5 4\n' | node acm.cts`，预期输出 `1 2 3 4 5`；牛客判题环境为 CommonJS，`.ts` 直接提交即可。
