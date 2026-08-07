/**
 * SPC 控制图 / 趋势图「限定线」(markLine) 共享构建工具。
 *
 * 解决两类渲染缺陷：
 * 1. 组内无变异时 UCL/CL/LCL 在数学上塌缩为同一数值，需按相对阈值合并为一条线并组合标注，避免“缺线/糊字”。
 * 2. 规格限(USL/LSL)与控制限(UCL/CL/LCL)标签原本都贴在右侧(end)，接近时相互重叠；
 *    现按类别左右错开：规格限贴左(start)、控制限贴右(end)，根除跨类重叠。
 */

export type LimitKind = 'spec' | 'ctrl'

export interface LimitMarkInput {
  label: string // 'USL' | 'UCL' | 'CL' | 'LCL' | 'LSL'
  value: number | null | undefined
  kind: LimitKind
}

const SPEC_COLOR = '#B84B3E'
const CTRL_COLOR = '#1B6FA8'
export const SPEC_LINE_STYLE = { color: SPEC_COLOR, type: 'dotted' as const, width: 1.4 }
export const CTRL_LINE_STYLE = { color: CTRL_COLOR, type: 'dashed' as const, width: 1.2 }

export interface LimitMarkLine {
  yAxis: number
  name: string
  lineStyle: { color: string; type: 'dotted' | 'dashed'; width: number }
  label: { show: boolean; formatter: string; color: string; fontSize: number; position: 'start' | 'end' }
}

export interface MarkLineResult {
  silent: true
  symbol: 'none'
  lineStyle: { color: string; type: 'dotted' | 'dashed'; width: number }
  label: { show: false }
  data: LimitMarkLine[]
}

/** 合并近重合限定线并生成 ECharts markLine；axisSpan 用于相对合并阈值（默认 1e-3）。 */
export function buildLimitMarks(limits: LimitMarkInput[], axisSpan?: number): MarkLineResult {
  // 相对阈值：至少为 1e-3，最大取坐标轴跨度的 0.5%，使“接近但不等”的线也能合并，避免多条紧邻线标签糊字。
  const eps = Math.max(1e-3, Math.abs(axisSpan ?? 0) * 0.005)
  const valid = limits
    .filter((l) => l.value != null && Number.isFinite(l.value as number))
    .map((l) => ({ label: l.label, value: l.value as number, kind: l.kind }))
    .sort((a, b) => a.value - b.value)

  if (!valid.length) {
    return { silent: true, symbol: 'none', lineStyle: CTRL_LINE_STYLE, label: { show: false }, data: [] }
  }

  const groups: { value: number; labels: string[]; kind: LimitKind | 'mixed' }[] = []
  for (const item of valid) {
    const last = groups.at(-1)
    if (last && Math.abs(item.value - last.value) <= eps) {
      if (!last.labels.includes(item.label)) last.labels.push(item.label)
      if (item.kind === 'spec' && last.kind !== 'spec') last.kind = 'mixed'
    } else {
      groups.push({ value: item.value, labels: [item.label], kind: item.kind })
    }
  }

  const raw: LimitMarkLine[] = groups.map((g) => {
    const isSpec = g.kind === 'spec' || g.kind === 'mixed'
    const color = isSpec ? SPEC_COLOR : CTRL_COLOR
    const lineStyle = isSpec ? SPEC_LINE_STYLE : CTRL_LINE_STYLE
    // 规格限贴左(start)，控制限贴右(end)，横向错开彻底避免两类标签重叠。
    const position: 'start' | 'end' = isSpec ? 'start' : 'end'
    const names = g.labels.join('=')
    return {
      yAxis: g.value,
      name: names,
      lineStyle,
      label: { show: true, formatter: `${names} ${g.value.toFixed(3)}`, color, fontSize: 10, position },
    }
  })

  // 同侧(spec 贴左 / ctrl 贴右)近邻纵向避让：数值差小于轴跨度 2% 的两条同侧线，
  // 后一条标签并入前一条（多行），后一条仅画线不重复出字，根除同侧叠字。
  const data = mergeSameSideLabels(raw, Math.max(1e-3, Math.abs(axisSpan ?? 0) * 0.02))

  return { silent: true, symbol: 'none', lineStyle: CTRL_LINE_STYLE, label: { show: false }, data }
}

/** 同 position 近邻标签纵向避让：重叠则合并文字，被并入者仅保留画线。 */
function mergeSameSideLabels(raw: LimitMarkLine[], nearEps: number): LimitMarkLine[] {
  const out: LimitMarkLine[] = []
  for (const line of raw) {
    const lastSamePos = out.findLast((d) => d.label.position === line.label.position)
    if (lastSamePos && Math.abs(line.yAxis - lastSamePos.yAxis) <= nearEps) {
      lastSamePos.label.formatter = `${lastSamePos.label.formatter}\n${line.label.formatter}`
      out.push({ ...line, label: { ...line.label, show: false } })
    } else {
      out.push(line)
    }
  }
  return out
}

/** 数据跨度：用于相对合并阈值。 */
export function spanOf(
  values: Array<number | null | undefined>,
  limits: Array<number | null | undefined> = [],
): number {
  const nums = [...values, ...limits].filter(
    (v): v is number => v != null && Number.isFinite(v),
  )
  if (nums.length < 2) return 0
  return Math.max(...nums) - Math.min(...nums)
}

/** 计算 y 轴范围（含限定线），保证数值塌缩时仍保留合理跨度与内边距，标签可见清晰。 */
export function axisRange(
  values: Array<number | null | undefined>,
  limits: Array<number | null | undefined>,
): { min: number; max: number } {
  const all = [...values, ...limits].filter(
    (v) => v != null && Number.isFinite(v),
  ) as number[]
  if (!all.length) return { min: 0, max: 1 }
  let mn = Math.min(...all)
  let mx = Math.max(...all)
  if (mx - mn < 1e-9) {
    const pad = Math.abs(mn) * 0.1 || 1
    mn -= pad
    mx += pad
  } else {
    const pad = (mx - mn) * 0.12
    mn -= pad
    mx += pad
  }
  return { min: Number(mn.toFixed(6)), max: Number(mx.toFixed(6)) }
}
