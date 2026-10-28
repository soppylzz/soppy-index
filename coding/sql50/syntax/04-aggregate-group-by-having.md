# 聚合与分组：COUNT、SUM、AVG、MIN、MAX、GROUP BY、HAVING

沿用[样例表](01-select-from-as.md)。聚合把多行汇总成一个值；分组后，每组分别汇总。

## 聚合函数

统计员工总数与已知工资的平均值：

```sql
SELECT
  COUNT(*) AS employee_count,
  COUNT(salary) AS known_salary_count,
  AVG(salary) AS average_salary
FROM
  Employees;
```

结果只有一行：员工数 5、已知工资人数 4、平均工资 6000。

| 函数            | 含义               | 本例结果 |
| --------------- | ------------------ | -------- |
| `COUNT(*)`      | 统计行数           | 5        |
| `COUNT(salary)` | 统计工资非空的行数 | 4        |
| `SUM(salary)`   | 工资总和           | 24000    |
| `AVG(salary)`   | 工资平均值         | 6000     |
| `MIN(salary)`   | 最低工资           | 4000     |
| `MAX(salary)`   | 最高工资           | 8000     |

除 `COUNT(*)` 数全部行外，上表中针对工资列的聚合忽略 `NULL`。平均值是 24000 除以 4，不是除以 5；把未知工资替换成 0，会改变统计含义。

## GROUP BY：每个部门一行

```sql
SELECT
  department_id,
  COUNT(*) AS employee_count,
  AVG(salary) AS average_salary
FROM
  Employees
GROUP BY
  department_id;
```

| department_id | employee_count | average_salary |
| ------------- | -------------- | -------------- |
| 10            | 2              | 7000           |
| 20            | 2              | 6000           |
| NULL          | 1              | 4000           |

`GROUP BY department_id` 把相同部门编号的行归为一组，包括部门为空的那一组。部门 20 有两人，但平均工资只使用 Eva 的 6000。

分组后，输出列应是分组键或聚合结果。不能直接添加 `employee_name`：部门 10 有 Ada 和 Ben，没有规则能决定该输出哪个姓名。

## WHERE 筛行，HAVING 筛组

统计工资至少 6000 的员工，并只留下符合条件人数至少 2 的部门：

```sql
SELECT
  department_id,
  COUNT(*) AS employee_count
FROM
  Employees
WHERE
  salary >= 6000
GROUP BY
  department_id
HAVING
  COUNT(*) >= 2;
```

`WHERE` 后剩下 Ada、Ben、Eva；分组后部门 10 有 2 人，部门 20 有 1 人；`HAVING` 因而只保留部门 10。

不能在 `WHERE` 中写 `COUNT(*) >= 2`，因为此时尚未形成分组。理解这些子句时，按 `FROM → WHERE → GROUP BY → HAVING → SELECT → ORDER BY` 推导即可；这不是数据库实际执行计划。

## 没有输入行时

不带 `GROUP BY` 的整体聚合仍返回一行：`COUNT` 为 0，`SUM`、`AVG`、`MIN`、`MAX` 为 `NULL`。带 `GROUP BY` 且输入为空时，没有分组，返回零行。
