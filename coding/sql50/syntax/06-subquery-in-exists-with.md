# 子查询与 CTE：IN、EXISTS、NOT EXISTS、WITH

查询结果可以继续作为另一条查询的输入。沿用[样例表](01-select-from-as.md)，下面分别介绍把结果当作一个值、一列候选值和一张中间表的写法。

## 标量子查询：返回一个值

查询工资高于整体平均值的员工：

```sql
SELECT
  employee_name,
  salary
FROM
  Employees
WHERE
  salary > (
    SELECT
      AVG(salary)
    FROM
      Employees
  );
```

内层平均值为 6000，外层因此只保留 Ada。括号里的查询作为单个值使用，必须返回一列、至多一行；零行时为 `NULL`，多于一行则报错。

## 关联子查询：使用当前行的值

与固定的整体平均工资不同，下面让每名员工与自己部门的平均工资比较：

```sql
SELECT
  e.employee_name,
  e.salary
FROM
  Employees AS e
WHERE
  e.salary > (
    SELECT
      AVG(peer.salary)
    FROM
      Employees AS peer
    WHERE
      peer.department_id = e.department_id
  );
```

外层的 `e.department_id` 决定内层统计哪个部门，本例仍只得到 Ada。Dan 的部门为空，等值条件无法匹配，内层平均值为 `NULL`，因此也不会被保留。

这是结果的逻辑关系，不代表数据库必然逐行完整执行一次内层查询。

## IN：判断是否属于查询结果

```sql
SELECT
  employee_name
FROM
  Employees
WHERE
  department_id IN (
    SELECT
      department_id
    FROM
      Departments
    WHERE
      department_name = 'Engineering'
  );
```

内层返回部门编号 10，外层得到 Ada、Ben。`IN` 的子查询可以返回多行，但这里每行只能有一列；候选值重复不会使外层员工重复。

## EXISTS：判断是否有匹配行

查询有员工的部门：

```sql
SELECT
  d.department_name
FROM
  Departments AS d
WHERE
  EXISTS (
    SELECT
      1
    FROM
      Employees AS e
    WHERE
      e.department_id = d.department_id
  );
```

结果是 Engineering、Design。内层引用了外层的 `d.department_id`，这称为关联子查询。

`EXISTS` 只判断有无行，不读取 `SELECT 1` 的数值。将它改为 `NOT EXISTS`，就得到没有员工的 Sales；这也避免了 `NOT IN` 候选值包含 `NULL` 时的判断问题。

不要把内层改成 `SELECT COUNT(*)` 来判断存在性：不带分组的聚合即使数到 0，仍会返回一行，`EXISTS` 就会为真。[子查询与 EXISTS 的语义](https://www.postgresql.org/docs/current/functions-subquery.html#FUNCTIONS-SUBQUERY-EXISTS)

## FROM 子查询：得到中间表

先[按部门统计人数](04-aggregate-group-by-having.md)，再筛选人数至少 2 的部门：

```sql
SELECT
  summary.department_id,
  summary.employee_count
FROM
  (
    SELECT
      department_id,
      COUNT(*) AS employee_count
    FROM
      Employees
    GROUP BY
      department_id
  ) AS summary
WHERE
  summary.employee_count >= 2;
```

内层结果有部门编号与人数两列，`summary` 是它的表别名。外层把 `employee_count` 当作普通输入列筛选，得到 `(10, 2)`、`(20, 2)`。

这个例子也可以直接用 `HAVING`，这里分层是为了展示中间表的用法。

## WITH：给中间查询命名

同一查询可以改写为公共表表达式（CTE）：

```sql
WITH
  department_counts AS (
    SELECT
      department_id,
      COUNT(*) AS employee_count
    FROM
      Employees
    GROUP BY
      department_id
  )
SELECT
  department_id,
  employee_count
FROM
  department_counts
WHERE
  employee_count >= 2;
```

`department_counts` 只在当前语句内有效，不会创建永久表。多个 CTE 用逗号分隔，后面的 CTE 可以引用前面定义的结果；它用于组织查询，不保证缓存或加速。
