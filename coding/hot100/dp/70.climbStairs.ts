// classic fibonacci
function climbStairs(n: number): number {
  // dp[i] = dp[i-1] + dp[i-2]

  if (n === 1) return 1
  if (n === 2) return 2

  const fibo = Array(n).fill(0)
  fibo[0] = 1
  fibo[1] = 2

  for (let i = 2; i < n; i++) {
    fibo[i] = fibo[i - 1] + fibo[i - 2]
  }
  return fibo[n - 1]
}
