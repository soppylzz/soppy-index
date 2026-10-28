# 去重与排序：DISTINCT、ORDER BY、ASC、DESC、OFFSET、FETCH FIRST

沿用[样例表](01-select-from-as.md)。普通 `SELECT` 保留重复行；去重与排序需要分别指定。

## DISTINCT 对整个输出行去重

```sql
SELECT DISTINCT
  department_id
FROM
  Employees;
```

结果包含 10、20、`NULL`，共 3 行，顺序不保证。多个空值在去重时归为一种结果。

去重依据是所有输出列的组合。只选 `salary` 时，Ben 和 Eva 的 6000 会合并；同时选择 `department_id, salary` 时，`(10, 6000)` 与 `(20, 6000)` 不同，不会合并。

## ORDER BY 指定先后

```sql
SELECT
  employee_id,
  employee_name,
  salary
FROM
  Employees
WHERE
  salary IS NOT NULL
ORDER BY
  salary DESC,
  employee_id ASC;
```

`ASC` 为升序，也是默认方向；`DESC` 为降序。多个排序键依次比较：先按工资从高到低，同工资再按编号从小到大。结果依次为 Ada、Ben、Eva、Dan。

只按工资排序，Ben 和 Eva 谁先出现没有保证。需要确定顺序时，应增加能区分它们的列。这里先排除了未知工资；保留空值并指定其位置的写法放在表达式篇介绍。

## 排序可以使用结果列别名

```sql
SELECT
  employee_name,
  salary * 12 AS annual_salary
FROM
  Employees
WHERE
  salary IS NOT NULL
ORDER BY
  annual_salary DESC,
  employee_id;
```

`ORDER BY` 可以使用输出别名。相同查询中的 `WHERE` 则不能依赖刚定义的 `annual_salary`，应写原表达式 `salary * 12`，或用子查询分层。

## 排好序，再限制行数

```sql
SELECT
  employee_name,
  salary
FROM
  Employees
WHERE
  salary IS NOT NULL
ORDER BY
  salary DESC,
  employee_id
FETCH FIRST
  2 ROWS ONLY;
```

`FETCH FIRST 2 ROWS ONLY` 最多取排序后的前两行，得到 Ada、Ben。这与“工资前两名，允许并列”不同：后者还应包含 Eva，需要使用排名函数。

要跳过前两行再取两行，在 `FETCH FIRST` 前添加 `OFFSET 2 ROWS`；本例得到 Eva、Dan。`OFFSET` 按结果行数跳过，不是按员工编号跳过，因此应始终配合确定的排序。
