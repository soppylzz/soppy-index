// solution: 1) stack 2) dp
function longestValidParentheses(s: string): number {
  /**
   * special cases:
   * 1. ()(()
   * 2. ()(())
   */
  let maxLength = 0

  const dp = Array(s.length + 1)
  dp[0] = 0

  for (let i = 1; i <= s.length; i++) {
    const c = s[i - 1]

    if (c === "(") {
      dp[i] = 0
    } else {
      if (i - 2 >= 0 && s[i - 2] === "(") {
        // handle: ...( <-)
        dp[i] = dp[i - 2] + 2
      } else {
        if (dp[i - 1] > 0 && s[i - 2 - dp[i - 1]] === "(") {
          // handle: ...(() <-)
          dp[i] = dp[i - 1] + dp[i - 2 - dp[i - 1]] + 2
        } else {
          dp[i] = 0
        }
      }
      maxLength = Math.max(maxLength, dp[i])
    }
  }
  return maxLength
}

function longestValidParenthesesViaStupidStack(s: string): number {
  const stack = []
  const lengths = Array(s.length + 1).fill(0)

  let maxLength = 0

  for (let i = 0; i < s.length; i++) {
    const c = s[i]

    if (c === "(") {
      stack.push(i)
    } else {
      if (stack.length > 0) {
        const topIdx = stack.pop()!
        const currentLength = i - topIdx + 1
        lengths[i + 1] = currentLength + lengths[topIdx]
        maxLength = Math.max(maxLength, lengths[i + 1])
      }
    }
  }

  return maxLength
}

function longestValidParenthesesViaStack(s: string): number {
  let stack = [-1],
    maxLength = 0

  for (let i = 0; i < s.length; i++) {
    if (s[i] === "(") stack.push(i)
    else {
      if (stack.length > 1) {
        stack.pop()
        maxLength = Math.max(maxLength, i - stack[stack.length - 1])
      } else {
        stack = [i]
      }
    }
  }

  return maxLength
}
