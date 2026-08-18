export interface LatestRequestGate {
  begin(): number
  isCurrent(id: number): boolean
}

export function createLatestRequestGate(): LatestRequestGate {
  let current = 0
  return {
    begin() {
      current += 1
      return current
    },
    isCurrent(id: number) {
      return id === current
    },
  }
}
