// with division
function productExceptSelfViaDivide(nums: number[]): number[] {
  const zeroIndexs = []
  let productExceptZero = 1

  for (let i = 0; i < nums.length; i++) {
    if (nums[i] !== 0) productExceptZero *= nums[i]
    else zeroIndexs.push(i)
  }

  if (zeroIndexs.length > 1) return Array(nums.length).fill(0)
  if (zeroIndexs.length === 1) {
    const special = Array(nums.length).fill(0)
    special[zeroIndexs[0]] = productExceptZero
    return special
  }

  const result: number[] = []
  for (let i = 0; i < nums.length; i++) {
    result[i] = productExceptZero / nums[i]
  }
  return result
}

// without division
function productExceptSelf(nums: number[]): number[] {
  const preProd = [1]
  const sufProd = [1]

  for (let i = 1; i < nums.length; i++) {
    preProd[i] = preProd[i - 1] * nums[i - 1]
    sufProd[i] = sufProd[i - 1] * nums[nums.length - i]
  }

  const result = []
  for (let i = 0; i < nums.length; i++) result[i] = preProd[i] * sufProd[nums.length - i - 1]
  return result
}
