-- https://leetcode.cn/problems/rising-temperature
SELECT
  today.id
FROM
  Weather AS today
  -- only considering day has yesterday
  INNER JOIN Weather AS yesterday ON today.recordDate - yesterday.recordDate = 1
WHERE
  today.temperature > yesterday.temperature
