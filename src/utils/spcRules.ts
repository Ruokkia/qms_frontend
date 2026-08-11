/**
 * SPC 控制图八大判异准则（Nelson Rules）。
 *
 * 规则基于控制限 (UCL/CL/LCL) 计算 σ 分区：
 *   Zone C: CL ± 1σ
 *   Zone B: CL ± 1σ~2σ
 *   Zone A: CL ± 2σ~3σ
 *
 * 所有判异仅在控制限完整时生效；空值点自动跳过但不断链。
 */
export interface SpcAnomaly {
  index: number
  subgroupNo: string
  subgroupId?: number
  rules: string[]
}

export interface SpcRuleResult {
  tags: Map<number, string[]>
  anomalies: SpcAnomaly[]
}

export function detectControlRules(
  values: (number | null)[],
  cl: number | null,
  ucl: number | null,
  lcl: number | null,
  subgroupNos: string[],
  subgroupIds?: (number | undefined)[],
): SpcRuleResult {
  const tags = new Map<number, string[]>()
  const add = (i: number, r: string) => {
    if (!tags.has(i)) tags.set(i, [])
    if (!tags.get(i)!.includes(r)) tags.get(i)!.push(r)
  }

  const n = values.length
  if (!cl || ucl == null || lcl == null || n === 0) {
    return { tags: new Map(), anomalies: [] }
  }

  const sigma = (ucl - cl) / 3
  if (sigma <= 0) {
    return { tags: new Map(), anomalies: [] }
  }

  const zoneBUpper = cl + sigma
  const zoneBLower = cl - sigma
  const zoneAUpper = cl + 2 * sigma
  const zoneALower = cl - 2 * sigma

  /**
   * 获取点位所处的区域：
   *  'C' = Zone C（CL±1σ内），'B' = Zone B（1σ~2σ），'A' = Zone A（2σ~3σ），'O' = 超限
   * 带符号表示方向：'+' 上侧，'-' 下侧
   */
  function getZone(v: number): string {
    if (v > ucl!) return '+O'
    if (v < lcl!) return '-O'
    if (v > zoneAUpper) return '+A'
    if (v < zoneALower) return '-A'
    if (v > zoneBUpper) return '+B'
    if (v < zoneBLower) return '-B'
    return v >= cl! ? '+C' : '-C'
  }

  for (let i = 0; i < n; i++) {
    const v = values[i]
    if (v == null) continue

    // ─── 规则 1：1 点超出控制限 ───
    if (v > ucl || v < lcl) {
      add(i, '1.超出控制限')
    }

    // ─── 规则 2：连续 9 点位于 CL 同一侧 ───
    const side = v > cl ? 1 : v < cl ? -1 : 0
    if (side !== 0) {
      let run = 1
      for (let j = i - 1; j >= 0 && values[j] != null; j--) {
        const sv = values[j]! > cl ? 1 : values[j]! < cl ? -1 : 0
        if (sv === side) run++
        else break
      }
      if (run >= 9) add(i, '2.连续9点同侧')
    }

    // ─── 规则 3：连续 6 点单调递增或递减 ───
    if (i >= 5) {
      let inc = true
      let dec = true
      for (let j = i - 5; j < i; j++) {
        if (values[j] == null || values[j + 1] == null) { inc = false; dec = false; break }
        if (!(values[j + 1]! > values[j]!)) inc = false
        if (!(values[j + 1]! < values[j]!)) dec = false
      }
      if (inc || dec) add(i, '3.连续6点趋势')
    }

    // ─── 规则 4：连续 14 点交替升降 ───
    if (i >= 13) {
      let alt = true
      for (let j = i - 13; j < i; j++) {
        if (values[j] == null || values[j + 1] == null) { alt = false; break }
        const d1 = values[j + 1]! - values[j]!
        const d2 = values[j]! - (j > 0 ? values[j - 1]! : values[j]!)
        if (j > i - 13 && d1 * d2 >= 0) { alt = false; break }
      }
      if (alt) add(i, '4.连续14点交替')
    }

    // ─── 规则 5：连续 3 点中 2 点落在同侧 B 区或以外（>1σ） ───
    if (i >= 2) {
      for (const dir of ['+', '-']) {
        let count = 0
        for (let j = i - 2; j <= i; j++) {
          if (values[j] == null) continue
          const z = getZone(values[j]!)
          if (z === `${dir}B` || z === `${dir}A` || z === `${dir}O`) count++
        }
        if (count >= 2) add(i, `5.连续3点中2点${dir === '+' ? '上' : '下'}B区外`)
      }
    }

    // ─── 规则 6：连续 5 点中 4 点落在同侧 B 区或以外（>1σ） ───
    if (i >= 4) {
      for (const dir of ['+', '-']) {
        let count = 0
        for (let j = i - 4; j <= i; j++) {
          if (values[j] == null) continue
          const z = getZone(values[j]!)
          if (z === `${dir}B` || z === `${dir}A` || z === `${dir}O`) count++
        }
        if (count >= 4) add(i, `6.连续5点中4点${dir === '+' ? '上' : '下'}B区外`)
      }
    }

    // ─── 规则 7：连续 15 点落在 Zone C 以内（CL±1σ） ───
    if (i >= 14) {
      let allC = true
      for (let j = i - 14; j <= i; j++) {
        if (values[j] == null) { allC = false; break }
        const z = getZone(values[j]!)
        if (z !== '+C' && z !== '-C') { allC = false; break }
      }
      if (allC) add(i, '7.连续15点C区内')
    }

    // ─── 规则 8：连续 8 点落在 Zone C 以外（>1σ，任一侧） ───
    if (i >= 7) {
      let allOutC = true
      for (let j = i - 7; j <= i; j++) {
        if (values[j] == null) { allOutC = false; break }
        const z = getZone(values[j]!)
        if (z === '+C' || z === '-C') { allOutC = false; break }
      }
      if (allOutC) add(i, '8.连续8点C区外')
    }
  }

  const anomalies: SpcAnomaly[] = []
  tags.forEach((ruleList, i) => {
    anomalies.push({ index: i, subgroupNo: subgroupNos[i] ?? String(i + 1), subgroupId: subgroupIds?.[i], rules: ruleList })
  })

  return { tags, anomalies }
}
