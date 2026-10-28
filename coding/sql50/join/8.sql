-- https://leetcode.cn/problems/customer-who-visited-but-did-not-make-any-transactions/
SELECT
  Visits.customer_id,
  -- count(1) better than count(*)
  count(1) AS count_no_trans
FROM
  Visits
  LEFT JOIN Transactions ON Visits.visit_id = Transactions.visit_id
WHERE
  Transactions.transaction_id IS NULL
GROUP BY
  Visits.customer_id
