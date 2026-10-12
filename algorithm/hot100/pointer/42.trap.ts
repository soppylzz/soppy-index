// solutions: 1) mono-stack 2) two pointers 3) dp
function trapViaMonoStack(height: number[]): number {
  // mono stack (decreasing)
  const stack: number[] = [],
    n = height.length

  let left,
    bottom: number,
    trapped = 0

  for (let i = 0; i < n; i++) {
    // if statement is not required
    // if (stack.length > 0 && height[i] >= height[stack[stack.length - 1]]) {
    //   // when entering this branch, stack.length >= 1
    // }

    while (stack.length > 0 && height[i] >= height[stack[stack.length - 1]]) {
      bottom = stack.pop()!

      if (stack.length > 0) {
        left = stack[stack.length - 1]
        trapped += (i - left - 1) * (Math.min(height[i], height[left]) - height[bottom])
      }
    }

    // tip: store indices so we can compute distances quickly
    stack.push(i)
  }

  return trapped
}

function trapViaPointer(height: number[]): number {
  let trapped = 0,
    left,
    right,
    currentTrapped

  const n = height.length

  /**
   * assume the current bound is the lowest bound; only when meeting
   * a real bound do we push currentTrapped into trapped;
   * slow/fast pointers iterate in both directions
   */

  /* =============== trap left =============== */
  left = 0
  right = left + 1
  currentTrapped = 0

  while (right < n) {
    if (height[left] <= height[right]) {
      left = right
      trapped += currentTrapped
      currentTrapped = 0
    } else {
      currentTrapped += height[left] - height[right]
    }
    right++
  }

  /* =============== trap right =============== */
  const mid = left
  right = n - 1
  left = right - 1
  currentTrapped = 0

  while (left >= mid) {
    if (height[left] >= height[right]) {
      right = left
      trapped += currentTrapped
      currentTrapped = 0
    } else {
      currentTrapped += height[right] - height[left]
    }
    left--
  }

  return trapped
}

function trapViaDp(height: number[]): number {
  const leftMax = [],
    rightMax = [],
    n = height.length

  let trapped = 0,
    maxHeight,
    bound

  maxHeight = 0
  for (let i = 0; i < n; i++) {
    maxHeight = Math.max(maxHeight, height[i])
    leftMax.push(maxHeight)
  }

  maxHeight = 0
  for (let i = 0; i < n; i++) {
    maxHeight = Math.max(maxHeight, height[n - i - 1])
    rightMax.push(maxHeight)
  }

  for (let i = 0; i < n; i++) {
    bound = Math.min(rightMax[n - i - 1], leftMax[i])
    if (bound > height[i]) {
      trapped += bound - height[i]
    }
  }

  return trapped
}
