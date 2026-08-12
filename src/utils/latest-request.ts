/** Prevent an older asynchronous response from replacing a newer request's result. */
export function createLatestRequestGate() {
  let current = 0

  return {
    begin(): number {
      current += 1
      return current
    },
    isCurrent(requestId: number): boolean {
      return requestId === current
    },
  }
}
