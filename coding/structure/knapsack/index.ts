// 0-1 knapsack: each item once, capacity in reverse
function knapsack01(weights: number[], values: number[], capacity: number): number {
  const dp: number[] = new Array(capacity + 1).fill(0)
  for (let i = 0; i < weights.length; i++) {
    for (let c = capacity; c >= weights[i]; c--) {
      dp[c] = Math.max(dp[c], dp[c - weights[i]] + values[i])
    }
  }
  return dp[capacity]
}

// unbounded knapsack: items reusable, capacity forward
function knapsackComplete(weights: number[], values: number[], capacity: number): number {
  const dp: number[] = new Array(capacity + 1).fill(0)
  for (let i = 0; i < weights.length; i++) {
    for (let c = weights[i]; c <= capacity; c++) {
      dp[c] = Math.max(dp[c], dp[c - weights[i]] + values[i])
    }
  }
  return dp[capacity]
}

/**
 * count combinations: coins outer, capacity inner
 * https://leetcode.cn/problems/coin-change-ii/
 */
function change(amount: number, coins: number[]): number {
  const dp: number[] = new Array(amount + 1).fill(0)
  dp[0] = 1
  for (const coin of coins) {
    for (let c = coin; c <= amount; c++) dp[c] += dp[c - coin]
  }
  return dp[amount]
}

/* ==================== demo ==================== */
console.log(knapsack01([1, 3, 4], [15, 20, 30], 4))
console.log(knapsackComplete([1, 3, 4], [15, 20, 30], 4))
console.log(change(5, [1, 2, 5]))

export {}
