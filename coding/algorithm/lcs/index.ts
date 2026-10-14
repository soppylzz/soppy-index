/**
 * rolling one-row DP: dp[j] needs only the previous row plus the diagonal, O(mn) time, O(n) space
 * https://leetcode.cn/problems/longest-common-subsequence/
 */
function longestCommonSubsequence(text1: string, text2: string): number {
  const cols = text2.length
  const dp: number[] = new Array(cols + 1).fill(0)
  for (let i = 1; i <= text1.length; i++) {
    let prevDiag = 0
    for (let j = 1; j <= cols; j++) {
      const up = dp[j]
      if (text1[i - 1] === text2[j - 1]) dp[j] = prevDiag + 1
      else dp[j] = Math.max(dp[j], dp[j - 1])
      prevDiag = up
    }
  }
  return dp[cols]
}

// reconstruct one LCS: full table, backtrack from the bottom-right corner
function lcsOf(text1: string, text2: string): string {
  const m = text1.length
  const n = text2.length
  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0))
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (text1[i - 1] === text2[j - 1]) dp[i][j] = dp[i - 1][j - 1] + 1
      else dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1])
    }
  }
  let result = ""
  let i = m
  let j = n
  while (i > 0 && j > 0) {
    if (text1[i - 1] === text2[j - 1]) {
      result = text1[i - 1] + result
      i--
      j--
    } else if (dp[i - 1][j] >= dp[i][j - 1]) {
      i--
    } else {
      j--
    }
  }
  return result
}

/**
 * Myers O(ND): find the shortest edit script length D, LCS = (N + M - D) / 2
 * https://leetcode.cn/problems/longest-common-subsequence/
 */
function lcsLengthMyers(a: string, b: string): number {
  const n = a.length
  const m = b.length
  const offset = n + m
  // v[k + offset] = farthest x reached with d edits on diagonal k = x - y
  const v = new Array(2 * offset + 2).fill(0)
  v[1 + offset] = 0
  for (let d = 0; d <= n + m; d++) {
    for (let k = -d; k <= d; k += 2) {
      let x: number
      if (k === -d || (k !== d && v[k - 1 + offset] < v[k + 1 + offset])) {
        x = v[k + 1 + offset]
      } else {
        x = v[k - 1 + offset] + 1
      }
      let y = x - k
      while (x < n && y < m && a[x] === b[y]) {
        x++
        y++
      }
      v[k + offset] = x
      if (x >= n && y >= m) return (n + m - d) / 2
    }
  }
  return -1
}

/* ==================== demo ==================== */
console.log(longestCommonSubsequence("abcde", "ace"))
console.log(lcsOf("abcde", "ace"))
console.log(lcsOf("bsbininm", "jmjkbkjkv"))
console.log(lcsLengthMyers("abcde", "ace"))
console.log(lcsLengthMyers("bsbininm", "jmjkbkjkv"))
console.log(lcsLengthMyers("", "abc"))

export {}
