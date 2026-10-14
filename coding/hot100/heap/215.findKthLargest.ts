function findKthLargest(nums: number[], k: number): number {
  const heap: number[] = []
  heap[0] = nums[0]

  // build a max heap
  for (let i = 1; i < nums.length; i++) {
    const num = nums[i]

    heap.push(num)
    let cur = heap.length - 1

    while (cur > 0 && heap[cur] > heap[(cur - 1) >> 1]) {
      // note: parent-child index relationship
      const parent = (cur - 1) >> 1
      ;[heap[cur], heap[parent]] = [heap[parent], heap[cur]]
      cur = parent
    }
  }

  // heap sort
  let heapLength = heap.length

  while (heapLength > nums.length - k) {
    ;[heap[0], heap[heapLength - 1]] = [heap[heapLength - 1], heap[0]]
    heapLength--

    let cur = 0

    while (true) {
      const left = 2 * cur + 1
      const right = 2 * cur + 2
      let largest = cur

      if (left < heapLength && heap[left] > heap[largest]) {
        largest = left
      }
      if (right < heapLength && heap[right] > heap[largest]) {
        largest = right
      }

      if (largest === cur) break

      ;[heap[cur], heap[largest]] = [heap[largest], heap[cur]]
      cur = largest
    }
  }

  return heap[nums.length - k]
}
