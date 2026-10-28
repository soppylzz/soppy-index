# 表达式与条件计算：CASE、CAST、COALESCE、NULLIF、ROUND、CHAR_LENGTH、SUBSTRING、EXTRACT

表达式根据输入值计算新值，例如 `salary * 12`。本篇沿用[样例表](01-select-from-as.md)，介绍类型转换、条件表达式和空值处理。

## 算术与类型转换

`(salary + 500) * 12` 表示先增加月薪，再计算年薪。整数除法不能想当然地保留小数；需要小数计算时，可以先用 `CAST` 转换类型：

```sql
SELECT
  employee_name,
  CAST(salary AS DECIMAL(12, 2)) / 1000 AS salary_in_thousands
FROM
  Employees;
```

`CAST(value AS type)` 只转换计算中的值。`DECIMAL(12, 2)` 最多保存 12 位十进制数字，其中 2 位是小数。

`ROUND(value, 2)` 将数值四舍五入到两位小数。比例计算应在除法前转换为小数类型，最后再舍入；先舍入或截断中间值，可能改变最终结果。

## 字符串：长度、截取与拼接

| 表达式                          | 含义与结果                          |
| ------------------------------- | ----------------------------------- |
| `UPPER('Ada')`、`LOWER('Ada')`  | 转换大小写，得到 ADA、ada           |
| `TRIM(' Ada ')`                 | 去掉两端空格，得到 Ada              |
| `CHAR_LENGTH('Ada')`            | 字符数，为 3；不应当作字节数        |
| `SUBSTRING('Ada' FROM 1 FOR 2)` | 从第 1 个字符起取 2 个字符，得到 Ad |
| `POSITION('d' IN 'Ada')`        | 首次出现的位置，为 2；未找到返回 0  |
| `'Ada' \|\| ' Lee'`             | 拼接文本，得到 Ada Lee              |

字符串位置从 1 开始。大小写转换不会修改原列，只会生成计算结果。[字符串函数语法](https://www.postgresql.org/docs/current/functions-string.html)

## 日期与时间：使用明确的类型

`DATE` 表示日期，`TIMESTAMP` 还包括时间。不要把日期计算当成普通字符串比较：

```sql
SELECT
  DATE '2026-10-28' AS sample_date,
  EXTRACT(
    YEAR
    FROM
      DATE '2026-10-28'
  ) AS sample_year,
  DATE '2026-10-28' + INTERVAL '1' DAY AS following_day;
```

`EXTRACT` 提取年、月等部分，`INTERVAL` 表示时间间隔；上例分别得到该日期、年份 2026，以及次日零点的时间戳。

筛选一个月内的时间戳，通常用左闭右开范围，例如 `created_at >= TIMESTAMP '2026-10-01 00:00:00' AND created_at < TIMESTAMP '2026-11-01 00:00:00'`。它能覆盖月底当天的所有时间，不会把 10 月 31 日午夜误当成当天的结束。[日期与时间表达式](https://www.postgresql.org/docs/current/functions-datetime.html)

## CASE：按条件返回值

```sql
SELECT
  employee_name,
  CASE
    WHEN salary IS NULL THEN 'unknown'
    WHEN salary >= 7000 THEN 'high'
    WHEN salary >= 5000 THEN 'middle'
    ELSE 'low'
  END AS salary_level
FROM
  Employees;
```

结果为 Ada：high，Ben、Eva：middle，Cora：unknown，Dan：low。

`CASE` 选取第一个条件为真的分支，因此条件顺序很重要。未命中任何分支时使用 `ELSE`；省略 `ELSE` 则返回 `NULL`。各分支返回值应有相容的类型。

按一个值逐项比较时，也可以写 `CASE department_id WHEN 10 THEN 'engineering' ELSE 'other' END`。

## CASE 也能作为排序键

将工资未知的员工排到最后：

```sql
SELECT
  employee_name,
  salary
FROM
  Employees
ORDER BY
  CASE
    WHEN salary IS NULL THEN 1
    ELSE 0
  END,
  salary DESC,
  employee_id;
```

有工资的行先按排序键 0 排在前面，Cora 的排序键为 1。最终顺序为 Ada、Ben、Eva、Dan、Cora，输出工资仍保留原值。

## COALESCE 与 NULLIF

| 表达式                | 含义                          | 示例                     |
| --------------------- | ----------------------------- | ------------------------ |
| `COALESCE(a, b, ...)` | 返回第一个非空值              | `COALESCE(NULL, 0)` 为 0 |
| `NULLIF(a, b)`        | 相等则返回 `NULL`，否则返回 a | `NULLIF(0, 0)` 为 `NULL` |

`COALESCE(salary, 0)` 可以把缺失工资显示成 0，但不代表实际工资为 0。尤其在计算平均值时，替换空值会改变统计含义。

`NULLIF(denominator, 0)` 常用于把零分母转为空值，让结果表达“无法计算”。

## 条件聚合：统计满足条件的行

统计工资至少 7000 的人数，以及已知工资人数：

```sql
SELECT
  SUM(
    CASE
      WHEN salary >= 7000 THEN 1
      ELSE 0
    END
  ) AS high_salary_count,
  COUNT(salary) AS known_salary_count
FROM
  Employees;
```

`CASE` 为高薪员工返回 1，其余返回 0；`SUM` 相加得到 1。`COUNT(salary)` 得到 4，因此高薪占比为 1/4。

如果先在 `WHERE` 中筛掉非高薪员工，分母也会减少，就不能得到这个比例。将统计保存在 [CTE](06-subquery-in-exists-with.md) 中后，可继续计算：

```sql
WITH
  salary_counts AS (
    SELECT
      SUM(
        CASE
          WHEN salary >= 7000 THEN 1
          ELSE 0
        END
      ) AS high_salary_count,
      COUNT(salary) AS known_salary_count
    FROM
      Employees
  )
SELECT
  CAST(high_salary_count AS DECIMAL(12, 2)) / NULLIF(known_salary_count, 0) AS high_salary_ratio
FROM
  salary_counts;
```

本例结果为 0.25。没有已知工资时，分母转为 `NULL`，比例也为 `NULL`，而不是 0%。
