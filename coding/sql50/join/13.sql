-- https://leetcode.cn/problems/managers-with-at-least-5-direct-reports
SELECT
  ee.name
FROM
  Employee AS ee
  LEFT JOIN (
    SELECT
      managerId,
      count(1) AS count
    FROM
      Employee
    GROUP BY
      managerId
  ) AS ac ON ee.id = ac.managerId
WHERE
  ac.count >= 5
