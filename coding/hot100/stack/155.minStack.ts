class MinStack {
  stack: number[] = []
  // tip: maintain two stacks (normal + monotonic)
  mono: number[] = []

  constructor() {}

  push(value: number): void {
    this.stack.push(value)
    if (this.mono.length === 0 || this.mono[this.mono.length - 1] >= value) {
      this.mono.push(value)
    }
  }

  pop(): void {
    const out = this.stack.pop()
    if (out === this.mono[this.mono.length - 1]) {
      this.mono.pop()
    }
  }

  top(): number {
    return this.stack[this.stack.length - 1]
  }

  // core method
  getMin(): number {
    return this.mono[this.mono.length - 1]
  }
}

/**
 * Your MinStack object will be instantiated and called as such:
 * var obj = new MinStack()
 * obj.push(value)
 * obj.pop()
 * var param_3 = obj.top()
 * var param_4 = obj.getMin()
 */
