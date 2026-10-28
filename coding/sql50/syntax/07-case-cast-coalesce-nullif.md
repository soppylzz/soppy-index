# 表达式与条件计算：CASE、CAST、COALESCE、NULLIF

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

常用文本函数有 `UPPER`（转大写）、`LOWER`（转小写）、`TRIM`（去掉两端空格）。例如 `UPPER(employee_name)` 将 Ada 转为 ADA，不改变结果行数。

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
