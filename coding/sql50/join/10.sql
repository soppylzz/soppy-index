-- https://leetcode.cn/problems/average-time-of-process-per-machine
SELECT
  startTable.machine_id,
  ROUND(
    AVG(endTable.timestamp - startTable.timestamp)::NUMERIC,
    3
  ) AS processing_time
FROM
  (
    SELECT
      machine_id,
      process_id,
      timestamp
    FROM
      Activity
    WHERE
      -- must use single quote
      activity_type = 'end'
  ) AS endTable
  -- start, end is reserved words
  JOIN (
    SELECT
      machine_id,
      process_id,
      timestamp
    FROM
      Activity
    WHERE
      activity_type = 'start'
  ) AS startTable ON startTable.process_id = endTable.process_id
  AND startTable.machine_id = endTable.machine_id
GROUP BY
  startTable.machine_id;

-- or more simplified solution
SELECT
  s.machine_id,
  round(avg(e.timestamp - s.timestamp)::NUMERIC, 3) AS processing_time
FROM
  Activity AS s
  JOIN Activity AS e ON s.machine_id = e.machine_id
  AND s.process_id = e.process_id
WHERE
  s.activity_type = 'start'
  AND e.activity_type = 'end'
GROUP BY
  s.machine_id;
