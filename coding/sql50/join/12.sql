-- https://leetcode.cn/problems/students-and-examinations
SELECT
  ss.student_id,
  ss.student_name,
  ss.subject_name,
  -- use coalesce(*) handle NULL value
  COALESCE(e.attended_exams, 0) AS attended_exams
FROM
  (
    SELECT
      *
    FROM
      Students
      -- cross join usage
      CROSS JOIN Subjects
  ) AS ss
  LEFT JOIN (
    SELECT
      *,
      COUNT(*) AS attended_exams
    FROM
      Examinations
    GROUP BY
      student_id,
      subject_name
  ) AS e ON ss.student_id = e.student_id
  AND ss.subject_name = e.subject_name
ORDER BY
  ss.student_id,
  ss.subject_name
