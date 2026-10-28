# 条件筛选：WHERE、AND、OR、NOT、IN、BETWEEN、LIKE、IS NULL

沿用[样例表](01-select-from-as.md)。`SELECT` 决定输出哪些列，`WHERE` 决定保留哪些行。

## 比较条件

找出工资至少 6000 的员工：

```sql
SELECT
  employee_name,
  salary
FROM
  Employees
WHERE
  salary >= 6000;
```

结果为 Ada、Ben、Eva。`WHERE` 只保留条件为真的行，筛选列不必出现在输出中。

| 运算符            | 含义                   |
| ----------------- | ---------------------- |
| `=`、`<>`         | 等于、不等于           |
| `>`、`>=`         | 大于、大于等于         |
| `<`、`<=`         | 小于、小于等于         |
| `BETWEEN a AND b` | 在范围内，包含两个端点 |
| `IN (a, b)`       | 等于列表中的某个值     |

例如 `salary BETWEEN 4000 AND 6000` 选出 Ben、Dan、Eva；`department_id IN (10, 20)` 选出除 Dan 外的四名员工。

## AND、OR、NOT

`AND` 要求两个条件同时成立，`OR` 要求至少一个成立，`NOT` 对条件取反。

```sql
SELECT
  employee_name
FROM
  Employees
WHERE
  department_id = 10
  AND (
    salary >= 7000
    OR manager_id IS NULL
  );
```

结果只有 Ada。`AND` 比 `OR` 优先；涉及“同时满足”和“满足其中之一”的组合时，用括号明确分组。

## LIKE 匹配文本

| 条件                       | 模式含义                               |
| -------------------------- | -------------------------------------- |
| `employee_name LIKE 'A%'`  | 以 A 开头，`%` 匹配零个或多个字符      |
| `employee_name LIKE '_a_'` | 共三个字符，中间是 a，`_` 匹配一个字符 |

`LIKE` 使用通配符，不是正则表达式。

## NULL 要用 IS NULL 判断

`NULL` 不是 0，也不是空字符串。与未知工资比较大小或相等，结果都是未知，而 `WHERE` 不保留未知结果。

| 条件                 | 对 Cora 的判断 | 是否保留 |
| -------------------- | -------------- | -------- |
| `salary = 6000`      | 未知           | 否       |
| `salary <> 6000`     | 未知           | 否       |
| `salary IS NULL`     | 真             | 是       |
| `salary IS NOT NULL` | 假             | 否       |

```sql
SELECT
  employee_name
FROM
  Employees
WHERE
  salary IS NULL;
```

不要写 `salary = NULL`。要找“不属于部门 10，或者还没有部门”的员工，应写 `department_id <> 10 OR department_id IS NULL`，否则 Dan 会被漏掉。

`NOT` 也不会把未知变成真。尤其注意 `NOT IN (10, NULL)`：部门 20 不等于 10，却无法确定是否等于列表中的缺失值，最终判断为未知。使用 `NOT IN` 前应确认候选列表不会包含 `NULL`。
