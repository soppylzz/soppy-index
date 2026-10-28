# 表与查询：SELECT、FROM、AS

SQL 用于读取和管理关系型数据库中的数据。先学习最常见的任务：从表中选出需要的列。

## 表、行、列

一张表保存一类记录，一行是一条记录，一列是一种属性。列有数据类型，例如整数、字符串。主键用于唯一标识一行，不能重复，也不能为 `NULL`。主键可以是一列，也可以是多列的组合；后者称为复合主键。没有声明主键或唯一约束的表，仍可能存入完全重复的记录，不能假定每张表都有一个隐含的唯一编号。

前九篇共用下面两张表，结果均根据这些数据推导，无需本地建库。

`Employees`：每行一名员工，`employee_id` 是主键；工资按月记录。

| employee_id | employee_name | department_id | salary | manager_id |
| ----------- | ------------- | ------------- | ------ | ---------- |
| 1           | Ada           | 10            | 8000   | NULL       |
| 2           | Ben           | 10            | 6000   | 1          |
| 3           | Cora          | 20            | NULL   | 1          |
| 4           | Dan           | NULL          | 4000   | NULL       |
| 5           | Eva           | 20            | 6000   | 3          |

`Departments`：每行一个部门，`department_id` 是主键。

| department_id | department_name |
| ------------- | --------------- |
| 10            | Engineering     |
| 20            | Design          |
| 30            | Sales           |

员工通过 `department_id` 关联部门，`manager_id` 指向经理的员工编号。`NULL` 表示缺少值：Dan 没有部门，Cora 的工资未知。Sales 没有员工，但仍是部门表中的一行。

## SELECT 选择列，FROM 指定表

```sql
SELECT
  employee_name,
  salary
FROM
  Employees;
```

| employee_name | salary |
| ------------- | ------ |
| Ada           | 8000   |
| Ben           | 6000   |
| Cora          | NULL   |
| Dan           | 4000   |
| Eva           | 6000   |

逗号分隔输出项，最后一项后不加逗号。查询只生成结果，不改变原表。`SELECT *` 可以选择全部列，正式练习通常只列出题目要求的列。

SQL 结果不保证自然顺序。本文按员工编号展示是为了方便阅读，保证排序需要显式写 `ORDER BY`。

## 表达式与别名

输出项也可以是计算结果，例如把月薪乘以 12：

```sql
SELECT
  employee_name AS name,
  salary * 12 AS annual_salary
FROM
  Employees;
```

`AS` 为结果列起别名，不会修改原列名。Ada 的 `annual_salary` 为 96000；Cora 的工资未知，计算结果仍为 `NULL`。

区分列名与常量：`salary` 引用工资列，`'salary'` 是字符串，`12` 是数字。字符串用单引号包围。字符串内部的单引号写成两个，例如 `'O''Neil'` 表示 O'Neil。表达式也可以不依赖表，例如 `SELECT 2 * 3 AS result;` 返回一行值 6。

SQL 语句以分号结束，关键字通常大写，换行与缩进用于阅读。`--` 后到行末是注释：

```sql
-- Read employee names.
SELECT
  employee_name
FROM
  Employees;
```
