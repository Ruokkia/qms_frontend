/**
 * SPC 控制图判异规则（Western Electric / 休哈特）前端可视化判定。
 *
 * 注意：本文件仅做「图表呈现」层面的异常点高亮与说明，
 * 所有控制限（UCL/CL/LCL）数值均来自后端 SpcChartData，
 * 前端不做任何能力指数 / 控制限计算（遵循前端铁律）。
 *
 * 实现规则（取自常规 SPC 判异准则）：
 *  - 规则 1：1 点超出控制限（UCL/LCL）
 *  - 规则 7：连续 7 点及以上位于中心线（CL）同一侧（七点链）
 *  - 规则 2/9：连续 9 点及以上位于中心线同一侧
 *  - 规则 6：连续 6 点及以上单调上升或下降（趋势）
 */

export interface SpcAnomaly {
  index: number
  subgroupNo: string
  rules: string[]
}

export interface SpcRuleResult {
  /** 每个点位命中的规则标签（key 为点位下标） */
  tags: Map<number, string[]>
  /** 异常点汇总（按点位顺序） */
  anomalies: SpcAnomaly[]
}

export function detectControlRules(
  values: (number | null)[],
  cl: number | null,
  ucl: number | null,
  lcl: number | null,
  subgroupNos: string[],
): SpcRuleResult {
  const tags = new Map<number, string[]>()
  const add = (i: number, r: string) => {
    if (!tags.has(i)) tags.set(i, [])
    if (!tags.get(i)!.includes(r)) tags.get(i)!.push(r)
  }

  const n = values.length
  for (let i = 0; i < n; i++) {
    const v = values[i]
    if (v == null || cl == null) continue

    // 规则 1：超出控制限
    if ((ucl != null && v > ucl) || (lcl != null && v < lcl)) {
      add(i, '超出控制限')
    }

    // 中心线同侧链
    const side = v > cl ? 1 : v < cl ? -1 : 0
    if (side !== 0) {
      let run = 1
      for (let j = i - 1; j >= 0 && values[j] != null; j--) {
        const sv = values[j]! > cl! ? 1 : values[j]! < cl! ? -1 : 0
        if (sv === side) run++
        else break
      }
      if (run >= 9) add(i, '连续9点同侧')
      else if (run >= 7) add(i, '连续7点链同侧')
    }

    // 规则 6：连续 6 点单调趋势
    if (i >= 5) {
      let inc = true
      let dec = true
      for (let j = i - 5; j < i; j++) {
        if (values[j] == null || values[j + 1] == null) {
          inc = false
          dec = false
          break
        }
        if (!(values[j + 1]! > values[j]!)) inc = false
        if (!(values[j + 1]! < values[j]!)) dec = false
      }
      if (inc || dec) add(i, '连续6点趋势')
    }
  }

  const anomalies: SpcAnomaly[] = []
  tags.forEach((ruleList, i) => {
    anomalies.push({ index: i, subgroupNo: subgroupNos[i] ?? String(i + 1), rules: ruleList })
  })

  return { tags, anomalies }
}
