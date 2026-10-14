// classic unbounded knapsack problem
function wordBreak(s: string, wordDict: string[]): boolean {
  /**
   * dp[i]: whether the first i characters of the composite string `cap`
   * can be composed from dictionary words.
   * note: `cap` here is a string (composite word), not a numeric capacity.
   */
  const dp = Array(s.length + 1).fill(false)
  dp[0] = true

  // prepare word dict
  const cache = new Map<number, string[]>()
  for (const word of wordDict) {
    if (cache.has(word.length)) {
      cache.get(word.length)!.push(word)
    } else {
      cache.set(word.length, [word])
    }
  }
  const lengths = [...cache.keys()].sort((a, b) => a - b) // increasing

  // dp
  for (let i = 1; i <= s.length; i++) {
    let match = false
    for (const length of lengths) {
      if (i - length < 0) break
      if (!dp[i - length]) continue

      for (const word of cache.get(length)!) {
        match = true
        for (let j = 0; j < length; j++) {
          if (s[i - length + j] !== word[j]) {
            match = false
            break
          }
        }
        if (match) break
      }
      if (match) break
    }
    dp[i] = match
  }

  console.log(dp)
  return dp[s.length]
}
