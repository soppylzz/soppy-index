# 集合运算：UNION ALL、UNION、INTERSECT、EXCEPT

JOIN 匹配两侧的行，集合运算则纵向组合两份查询结果。两边必须有相同列数，对应位置的类型兼容；列按位置对齐，不按名称自动匹配。

## UNION ALL 与 UNION

沿用[样例表](01-select-from-as.md)，合并“部门 10 的员工”与“工资至少 6000 的员工”两份名单：

```sql
SELECT
  employee_id
FROM
  Employees
WHERE
  department_id = 10
UNION ALL
SELECT
  employee_id
FROM
  Employees
WHERE
  salary >= 6000;
```

第一份名单为 1、2，第二份为 1、2、5。`UNION ALL` 保留重复，所以结果有 5 行，1 和 2 各出现两次。

改成 `UNION` 则对完整输出行去重，得到 1、2、5，共 3 行。是否去重取决于重复记录是否有意义，不能把两种写法当成同义词。

## INTERSECT 与 EXCEPT

查询“既属于部门 10，工资又至少 7000”的员工编号：

```sql
SELECT
  employee_id
FROM
  Employees
WHERE
  department_id = 10
INTERSECT
SELECT
  employee_id
FROM
  Employees
WHERE
  salary >= 7000;
```

左边为 1、2，右边为 1。`INTERSECT` 取交集，结果为 1；把运算符改成 `EXCEPT`，取左边有而右边没有的行，结果为 2。

差集有方向。交换左右后，`EXCEPT` 变成从高薪名单中排除部门 10 的人，本例得到零行。

| 运算符      | 重复行处理 | 保留范围             |
| ----------- | ---------- | -------------------- |
| `UNION ALL` | 保留       | 两边全部行           |
| `UNION`     | 去重       | 至少在一边出现       |
| `INTERSECT` | 去重       | 两边都出现           |
| `EXCEPT`    | 去重       | 左边出现、右边不出现 |

这里的相同指整行相同，去重时空值也可被归为同一种结果，不按普通 `NULL = NULL` 的条件比较处理。

对应列按位置对齐，即使两侧列名不同也不会自动调整；结果列名通常由左侧查询决定。需要排序时，将 `ORDER BY` 放在整段集合查询末尾，例如 `ORDER BY employee_id`，不能用两条独立查询的排序顺序推断合并结果。

混用多个集合运算时，用括号或 CTE 明确组合范围。`INTERSECT` 优先于 `UNION`、`EXCEPT`，因此 `A UNION B INTERSECT C` 不能直接理解为先合并 A、B 再求交集。
