-- https://leetcode.cn/problems/confirmation-rate
SELECT
  sign.user_id,
  round(coalesce(cnt.count::Numeric / ttl.count, 0), 2) AS confirmation_rate
FROM
  Signups AS sign
  LEFT JOIN (
    SELECT
      user_id,
      count(1)
    FROM
      Confirmations
    WHERE
      action = 'confirmed'
    GROUP BY
      user_id
  ) AS cnt ON sign.user_id = cnt.user_id
  LEFT JOIN (
    SELECT
      user_id,
      count(1)
    FROM
      Confirmations
    GROUP BY
      user_id
  ) AS ttl ON sign.user_id = ttl.user_id
