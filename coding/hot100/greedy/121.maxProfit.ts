function maxProfit(prices: number[]): number {
  let leftMin = Infinity,
    max = 0

  for (let i = 0; i < prices.length; i++) {
    if (prices[i] < leftMin) {
      leftMin = prices[i]
    } else {
      max = Math.max(max, prices[i] - leftMin)
    }
  }

  return max
}
