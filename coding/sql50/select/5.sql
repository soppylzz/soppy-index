-- https://leetcode.cn/problems/invalid-tweets
SELECT
  tweet_id
FROM
  Tweets
WHERE
  -- use LENGTH(*) to get VARCHAR length
  LENGTH(content) > 15
