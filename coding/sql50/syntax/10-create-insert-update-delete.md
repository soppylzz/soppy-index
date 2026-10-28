# 建表与数据修改：CREATE TABLE、PRIMARY KEY、FOREIGN KEY、UNIQUE、ALTER TABLE、INSERT、UPDATE、DELETE、DROP TABLE、COMMIT、ROLLBACK

`SELECT` 读取数据；`CREATE TABLE` 定义表结构；`INSERT`、`UPDATE`、`DELETE` 修改数据。下面使用独立的图书样例。

## CREATE TABLE：列、类型与约束

```sql
CREATE TABLE ReadingLists (
  list_id INTEGER PRIMARY KEY,
  list_name VARCHAR(100) NOT NULL UNIQUE
);

CREATE TABLE Books (
  book_id INTEGER PRIMARY KEY,
  title VARCHAR(200) NOT NULL,
  price DECIMAL(10, 2) CHECK (price >= 0),
  reading_state VARCHAR(20) DEFAULT 'unread',
  list_id INTEGER,
  FOREIGN KEY (list_id) REFERENCES ReadingLists (list_id)
);
```

`INTEGER` 表示整数，`VARCHAR(200)` 表示有长度上限的字符串，`DECIMAL(10, 2)` 最多保存 10 位十进制数字，其中 2 位为小数。`DATE` 保存日期，`TIMESTAMP` 还保存时间。

| 约束或默认值  | 作用                                          |
| ------------- | --------------------------------------------- |
| `PRIMARY KEY` | 唯一标识记录，主键的全部列都不能空            |
| `NOT NULL`    | 不允许空值                                    |
| `UNIQUE`      | 约束一列或一组列的唯一性；必填仍需 `NOT NULL` |
| `CHECK`       | 检查行中的值是否满足条件                      |
| `FOREIGN KEY` | 限制引用关系，非空引用必须存在于目标键中      |
| `DEFAULT`     | 未提供值时使用默认值                          |

`CHECK (price >= 0)` 阻止负数，但不排除 `NULL`，因为空值比较结果是未知而不是假。价格必填还需要 `NOT NULL`。显式插入 `NULL` 不会因为有 `DEFAULT` 就自动替换成默认值。

写在列定义后的是列级约束，例如 `book_id INTEGER PRIMARY KEY`；单独写在表内、可以引用多列的是表级约束，例如下面的复合主键。

## 复合主键：多列共同标识一行

同一本书可以有多份实体副本，用图书编号与副本序号共同标识：

```sql
CREATE TABLE BookCopies (
  book_id INTEGER,
  copy_no INTEGER,
  CONSTRAINT pk_book_copies PRIMARY KEY (book_id, copy_no),
  FOREIGN KEY (book_id) REFERENCES Books (book_id)
);
```

`PRIMARY KEY (book_id, copy_no)` 要求这两个值的组合唯一，并使两列都非空。它不要求每列分别唯一：同一本书可以有 1、2 号副本，不同图书也可以都有 1 号副本。

| 键组合             | 主键规则是否允许             |
| ------------------ | ---------------------------- |
| `(1, 1)`、`(1, 2)` | 允许，book_id 相同但组合不同 |
| `(1, 1)`、`(2, 1)` | 允许，copy_no 相同但组合不同 |
| 两行 `(1, 1)`      | 不允许，完整组合重复         |
| `(1, NULL)`        | 不允许，主键中不能有空值     |

不要给两列各写一次 `PRIMARY KEY`：一张表至多有一个主键，这个主键可以由多列组成。`CONSTRAINT pk_book_copies` 为约束命名，便于定位错误；不写名称也能定义相同规则。

`UNIQUE (book_id, copy_no)` 也约束组合唯一，但不会自动使各列非空。一张表可以有多个唯一约束，只有一组被指定为主键。[主键与唯一约束](https://www.postgresql.org/docs/current/ddl-constraints.html#DDL-CONSTRAINTS-PRIMARY-KEYS)

## 复合外键：引用完整的键组合

借阅记录必须指向一份确实存在的副本：

```sql
CREATE TABLE BookLoans (
  loan_id INTEGER PRIMARY KEY,
  book_id INTEGER NOT NULL,
  copy_no INTEGER NOT NULL,
  FOREIGN KEY (book_id, copy_no) REFERENCES BookCopies (book_id, copy_no)
);
```

外键列与目标列按位置一一对应，数量和类型应匹配。它检查的是整个 `(book_id, copy_no)` 是否存在，不是两列分别能否在别处找到。这里声明两列非空，表示每条借阅记录都必须指向副本。

外键不会自动连接查询，也不保证“一个副本只能有一条借阅记录”；后者需要额外的唯一规则。删除或修改被引用的父记录时，也必须满足引用约束，不能默认子记录会自动删除。显式使用 `ON DELETE CASCADE` 才表达随父记录删除关联子记录的规则。

## INSERT：VALUES 与查询结果

列名与值按位置对应；多行值之间用逗号分隔：

```sql
INSERT INTO
  ReadingLists (list_id, list_name)
VALUES
  (10, 'Basics');

INSERT INTO
  Books (book_id, title, price, list_id)
VALUES
  (1, 'Database Notes', 39.50, 10),
  (2, 'SQL Practice', 29.00, 10);
```

先插入清单，再插入引用它的图书，满足外键要求。未提供的 `reading_state` 使用默认值 `'unread'`；未提供又没有默认值的必填列会导致插入失败。

也可以直接插入查询结果，为现有每本书建立 1 号副本：

```sql
INSERT INTO
  BookCopies (book_id, copy_no)
SELECT
  book_id,
  1
FROM
  Books;
```

查询返回几行，就尝试插入几行；列数和类型必须与目标列相容，主键、外键等约束仍然生效。

## UPDATE：修改记录

```sql
UPDATE Books
SET
  price = price + 5,
  reading_state = 'reading'
WHERE
  book_id = 1;
```

多个赋值用逗号分隔，表达式可以使用原列值。`SET` 中的 `=` 是赋值，`WHERE` 中的 `=` 是比较；省略 `WHERE` 会修改全部记录。

## ALTER TABLE：调整已有结构

```sql
ALTER TABLE Books
ADD COLUMN published_on DATE;

ALTER TABLE Books
DROP COLUMN published_on;
```

前者为已有表添加一列，后者删除该列及其数据。修改已有表时，新约束也必须与已有数据相容；例如已有空值的列不能直接变成必填列。

## 事务：提交与回滚

用一个事务包住需要共同提交的修改：

```sql
START TRANSACTION;

UPDATE Books
SET
  price = price + 1
WHERE
  book_id = 1;

ROLLBACK;
```

这个例子回滚价格修改。换成 `COMMIT` 则提交；提交后不能再靠一次 `ROLLBACK` 撤销历史更改。事务是否已经提交不能只看某条 UPDATE 是否执行成功。

## DELETE 与 DROP TABLE

删除图书时，如果有副本和借阅记录引用它，先处理子记录，再删除父记录：

```sql
DELETE FROM BookLoans
WHERE
  book_id = 1;

DELETE FROM BookCopies
WHERE
  book_id = 1;

DELETE FROM Books
WHERE
  book_id = 1;
```

`DELETE` 删除符合条件的行，省略 `WHERE` 会删除全部行，但表结构仍在。

```sql
DROP TABLE BookLoans;

DROP TABLE BookCopies;

DROP TABLE Books;
```

`DROP TABLE` 删除整张表，包括结构与数据。这里也先删除引用方，再删除被引用方，避免外键依赖阻止操作。
