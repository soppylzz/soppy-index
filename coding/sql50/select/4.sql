-- https://leetcode.cn/problems/article-views-i
SELECT DISTINCT
  viewer_id AS id
FROM
  Views
WHERE
  author_id = viewer_id
ORDER BY
  -- usage of order by
  id ASC
