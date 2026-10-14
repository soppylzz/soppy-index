function minDistance(word1: string, word2: string): number {
  /**
   * core: dp[i][j] = min changes to turn word1[0..i-1] into word2[0..j-1]
   *
   * 1. word1[i-1] === word2[j-1] => dp[i][j] = dp[i-1][j-1]
   * 2. word1[i-1] !== word2[j-1] => dp[i][j] = 1 + min(dp[i-1][j-1], dp[i-1][j], dp[i][j-1])
   *
   * tip: use the empty string ("") as the base case
   */

  const m = word1.length
  const n = word2.length

  const dp = Array(m + 1)
  for (let i = 0; i <= m; i++) dp[i] = Array(n + 1)
  for (let i = 0; i <= m; i++) dp[i][0] = i
  for (let i = 0; i <= n; i++) dp[0][i] = i

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (word1[i - 1] === word2[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1]
      } else {
        dp[i][j] = Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]) + 1
      }
    }
  }

  return dp[m][n]
}
