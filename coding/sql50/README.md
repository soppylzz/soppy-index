# SQL 50：本地写查询，在力扣验证

本目录用于练习[力扣 SQL 50](https://leetcode.cn/studyplan/sql-free-50/)。在 VS Code 中编写和格式化 `.sql` 文件，再将查询提交到力扣运行；题目提供的表结构、数据与判题环境由力扣管理。本地无需安装 MySQL、Docker 或数据库驱动，也没有执行查询的脚本。

## 从零理解 SQL

`syntax/` 按板块介绍通用 SQL 语法。前九篇共用员工与部门样例，第十篇独立介绍建表和数据修改。示例结果由样例数据推导，无需本地运行。

| 顺序 | 板块 | 关键字 |
| --- | --- | --- |
| 1 | [表与查询](syntax/01-select-from-as.md) | `SELECT`、`FROM`、`AS` |
| 2 | [条件筛选](syntax/02-where-null-like.md) | `WHERE`、`AND`、`OR`、`NOT`、`IN`、`BETWEEN`、`LIKE`、`IS NULL` |
| 3 | [去重与排序](syntax/03-distinct-order-by-fetch.md) | `DISTINCT`、`ORDER BY`、`ASC`、`DESC`、`FETCH FIRST` |
| 4 | [聚合与分组](syntax/04-aggregate-group-by-having.md) | `COUNT`、`SUM`、`AVG`、`MIN`、`MAX`、`GROUP BY`、`HAVING` |
| 5 | [多表连接](syntax/05-join.md) | `INNER JOIN`、`LEFT JOIN`、`RIGHT JOIN`、`FULL OUTER JOIN`、`CROSS JOIN` |
| 6 | [子查询与 CTE](syntax/06-subquery-in-exists-with.md) | `IN`、`EXISTS`、`NOT EXISTS`、`WITH` |
| 7 | [表达式与条件计算](syntax/07-case-cast-coalesce-nullif.md) | `CASE`、`CAST`、`COALESCE`、`NULLIF` |
| 8 | [集合运算](syntax/08-union-intersect-except.md) | `UNION ALL`、`UNION`、`INTERSECT`、`EXCEPT` |
| 9 | [窗口函数](syntax/09-window-over-partition-by.md) | `OVER`、`PARTITION BY`、`ROWS`、`ROW_NUMBER`、`RANK`、`DENSE_RANK`、`LAG`、`LEAD` |
| 10 | [建表与数据修改](syntax/10-create-insert-update-delete.md) | `CREATE TABLE`、`INSERT`、`UPDATE`、`DELETE`、`DROP TABLE`、`COMMIT`、`ROLLBACK` |

初学时先读第 1—3 篇，再学习分组、连接与子查询；集合运算和窗口函数放在基础查询之后。第 10 篇可以在掌握 SELECT 后单独阅读。

文中的结果表按便于阅读的顺序展示；查询只有显式写了 `ORDER BY` 才保证排序。教程不包含练习题答案。

## 开始练习

用 VS Code 打开仓库根目录，运行 `pnpm install`，并安装 [Prettier](https://marketplace.visualstudio.com/items?itemName=esbenp.prettier-vscode) 扩展。仓库通过根目录的 `prettier-plugin-sql` 依赖接入 `sql-formatter`。在编辑器中将 Prettier 选为 SQL 默认格式化器；需要保存时自动格式化，可在个人设置中启用，无需单独安装 SQL 格式化扩展。

在力扣编辑器中选择实际练习使用的 SQL 语言；格式化方言由根 `.prettierrc` 中 SQL override 的 `language` 控制，两者应保持一致。`syntax/` 的讲解关注通用概念，不展开方言对比；格式化器能解析文件，不代表查询能在对应数据库中正确执行。

练习按 `select/`、`join/`、`aggregate/` 等板块保存，每题一份 SQL 文件，文件名使用练习顺序编号，例如 `select/1.sql`；题目链接记录在文件开头的英文 `--` 注释中。新题由自己创建并编写，已有答案保留在原文件；基础语法讲解集中在 `syntax/`。

本目录复用仓库根目录的格式化工具，不单独维护 `package.json`、TypeScript 配置或 Vitest，也没有本地数据库启动命令。

## 格式化约定

使用 2 个空格缩进，SQL 关键字大写，表名、列名和别名保持原样；复杂条件将 `AND`、`OR` 放在新行开头，便于逐项检查。字符串使用单引号，每条完整语句建议以分号结束。当前配置自动处理缩进、关键字大小写及条件换行；引号选择与分号仍由自己检查。

配置明确保留标识符大小写，避免格式化时改写题目给出的名称。不要用关键字大小写推断语义是否正确，也不要为了让行更短而改变条件括号。格式化后的查询仍需在力扣验证列名、重复行、`NULL`、分组粒度和排序要求。

可以保存 SQL、运行 VS Code 的“格式化文档”，也可以在仓库根目录执行：

```sh
pnpm format "coding/sql50/**/*.sql"
pnpm format:check "coding/sql50/**/*.sql"
```

暂存的 `.sql` 文件也会由现有 lint-staged 流程调用 Prettier 格式化。格式化选项统一维护在根 `.prettierrc`，无需另外创建 `.sql-formatter.json`。插件使用 `sql-formatter` 引擎；它包装该引擎的输出，因此 SQL 换行不一定严格遵循 Prettier 的 `printWidth`，详见 [prettier-plugin-sql 说明](https://github.com/un-ts/prettier/tree/master/packages/sql)。如果编辑器提示没有格式化器，先确认已安装仓库依赖和 Prettier 扩展，且右下角语言模式为 SQL。

## 什么时候需要其他插件

| 插件 | 用途与安装时机 |
| --- | --- |
| [Prettier](https://marketplace.visualstudio.com/items?itemName=esbenp.prettier-vscode) | 当前推荐，加载仓库的 SQL 插件，无需数据库连接。 |
| [SQLTools](https://marketplace.visualstudio.com/items?itemName=mtxr.sqltools) | 将来需要数据库连接、查看表和查询结果时再安装。当前流程无需使用。 |
| [SQLTools MySQL/MariaDB/TiDB Driver](https://marketplace.visualstudio.com/items?itemName=mtxr.sqltools-driver-mysql) | 使用 SQLTools 连接 MySQL 时配套安装的驱动，安装它不会提供 MySQL 服务。 |

即使以后安装 SQLTools，也继续使用 Prettier 作为 SQL 默认格式化器，使保存时的风格保持一致。此阶段不需要为连接能力引入本地数据库，也不需要同时启用多个 SQL 格式化器。
