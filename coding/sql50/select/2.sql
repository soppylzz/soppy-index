-- https://leetcode.cn/problems/find-customer-referee
SELECT
  name
FROM
  Customer
WHERE
  referee_id != 2
  -- NULL cannot be compared using = or != because such comparisons
  -- evaluate to UNKNOWN rather than TRUE or FALSE.
  -- Use IS NULL or IS NOT NULL to check for NULL values.
  OR referee_id IS NULL
