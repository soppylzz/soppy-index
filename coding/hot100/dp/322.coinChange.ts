// classic unbounded knapsack problem
function coinChange(coins: number[], amount: number): number {
  // dp[i] = min(dp[i-coins[k]] + 1); use Infinity to mark amounts that cannot be changed

  const dp = Array(amount + 1).fill(Infinity)

  for (let i = 0; i < coins.length; i++) if (coins[i] <= amount) dp[coins[i]] = 1

  if (amount === 0) return 0
  if (dp[amount] !== Infinity) return dp[amount]

  for (let i = 1; i <= amount; i++) {
    if (dp[i] !== Infinity) continue

    let currentCap = Infinity
    for (const coin of coins) {
      if (coin < i) {
        currentCap = Math.min(currentCap, dp[i - coin] + 1)
      }
    }

    dp[i] = currentCap
  }

  return dp[amount] !== Infinity ? dp[amount] : -1
}
