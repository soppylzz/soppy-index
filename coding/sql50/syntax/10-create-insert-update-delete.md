# 建表与数据修改：CREATE TABLE、INSERT、UPDATE、DELETE、DROP TABLE、COMMIT、ROLLBACK

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

`INTEGER` 表示整数，`VARCHAR(200)` 表示有长度上限的字符串，`DECIMAL(10, 2)` 最多保存 10 位十进制数字，其中 2 位为小数。

| 约束或默认值  | 作用                         |
| ------------- | ---------------------------- |
| `PRIMARY KEY` | 唯一标识记录，不能重复或为空 |
| `NOT NULL`    | 不允许空值                   |
| `UNIQUE`      | 不允许重复值                 |
| `CHECK`       | 检查值是否满足条件           |
| `FOREIGN KEY` | 要求非空引用指向已存在的记录 |
| `DEFAULT`     | 未提供值时使用默认值         |

`CHECK (price >= 0)` 阻止负数，但不排除 `NULL`，因为空值比较结果是未知而不是假。价格必填还需要 `NOT NULL`。显式插入 `NULL` 也不会因为有 `DEFAULT` 就自动替换成默认值。

## INSERT：插入记录

```sql
INSERT INTO
  ReadingLists (list_id, list_name)
VALUES
  (10, 'Basics');

INSERT INTO
  Books (book_id, title, price, list_id)
VALUES
  (1, 'Database Notes', 39.50, 10);
```

列名与值按位置对应。先插入清单，再插入引用它的图书，满足外键要求。图书的 `reading_state` 未提供，使用默认值 `'unread'`。

## UPDATE：修改记录

```sql
UPDATE Books
SET
  price = 42.00
WHERE
  book_id = 1;
```

`SET` 指定修改内容，`WHERE` 限定目标行。省略 `WHERE` 会修改全部记录。这里的 `=` 是赋值；`WHERE` 中的 `=` 是比较。

## DELETE 与 DROP TABLE

```sql
DELETE FROM Books
WHERE
  book_id = 1;
```

`DELETE` 删除符合条件的行，省略 `WHERE` 会删除全部行，但表结构仍在。

```sql
DROP TABLE Books;
```

`DROP TABLE` 删除整张表，包括结构与数据，不能代替按条件删除记录。

## 事务：提交与回滚

多步修改需要一起生效时，可以放在一个事务中，例如转账的扣款与入账。`COMMIT` 提交事务，`ROLLBACK` 撤销尚未提交的修改；提交后不能再靠一次回滚撤销历史更改。

事务的隔离与并发控制属于后续主题。入门先区分一次查询、一条修改语句与一组需要共同提交的修改。
