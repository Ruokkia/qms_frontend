import { describe, expect, it } from 'vitest'
import {
  canOpenSampleEntry,
  buildSubgroupSourceOptions,
  getSampleEntryAction,
  getSpcEntryFieldMode,
  filterSubgroupSourceRecords,
  isSelectedSourcePair,
  selectSpcSourceRecord,
} from './spc-entry-dialog'

describe('SPC 样本录入弹窗入口', () => {
  it('只有已选择参数时才能打开录入弹窗', () => {
    expect(canOpenSampleEntry(null)).toBe(false)
    expect(canOpenSampleEntry(undefined)).toBe(false)
    expect(canOpenSampleEntry(0)).toBe(false)
    expect(canOpenSampleEntry(128)).toBe(true)
  })
})

describe('SPC 子组子查询', () => {
  const records = [
    { itemCode: 'MAT-01', batchNo: 'B-100', barcode: 'BC-001' },
    { itemCode: 'MAT-01', batchNo: 'B-200', barcode: 'BC-002' },
    { itemCode: 'MAT-02', batchNo: 'B-100', barcode: 'BC-003' },
  ]

  it('仅在顶层代码范围内按批次号和条码模糊筛选子组', () => {
    expect(filterSubgroupSourceRecords(records, 'MAT-01', '100', '')).toEqual([records[0]])
    expect(filterSubgroupSourceRecords(records, 'MAT-01', '', '002')).toEqual([records[1]])
    expect(filterSubgroupSourceRecords(records, 'MAT-01', '', '')).toEqual([records[0], records[1]])
  })

  it('子组暂未录入样本条码时，批次号仍保留为可选候选', () => {
    expect(buildSubgroupSourceOptions([
      { itemCode: 'MAT-01', batchNo: 'B-100', samples: [] },
      { materialCode: 'MAT-01', batchNo: 'B-200', samples: [{ barcode: 'BC-002' }] },
    ])).toEqual([
      { itemCode: 'MAT-01', batchNo: 'B-100', barcode: '' },
      { itemCode: 'MAT-01', batchNo: 'B-200', barcode: 'BC-002' },
    ])
  })
})

describe('SPC 来源批次与条码联动', () => {
  const source = { batchNo: 'B-20260811', barcode: 'BC-0001' }

  it('选中任一来源记录时回填批次号和唯一条码', () => {
    expect(selectSpcSourceRecord(source)).toEqual(source)
  })

  it('只有与已选来源记录完全匹配的批次号和条码才能提交', () => {
    expect(isSelectedSourcePair(source, 'B-20260811', 'BC-0001')).toBe(true)
    expect(isSelectedSourcePair(source, 'B-20260811', 'BC-9999')).toBe(false)
    expect(isSelectedSourcePair(null, 'B-20260811', 'BC-0001')).toBe(false)
  })
})

describe('SPC 弹窗字段权限', () => {
  it('只允许编辑批次号和条码，代码、工序和参数保持只读', () => {
    expect(getSpcEntryFieldMode('batchNo')).toBe('editable')
    expect(getSpcEntryFieldMode('barcode')).toBe('editable')
    expect(getSpcEntryFieldMode('itemCode')).toBe('readonly')
    expect(getSpcEntryFieldMode('process')).toBe('readonly')
    expect(getSpcEntryFieldMode('parameter')).toBe('readonly')
  })
})

describe('SPC 样本输入焦点行为', () => {
  it('只在按 Enter 时移动焦点，最后一项 Enter 时提交', () => {
    expect(getSampleEntryAction('input', 1, 5)).toBe('none')
    expect(getSampleEntryAction('enter', 1, 5)).toBe('next')
    expect(getSampleEntryAction('enter', 5, 5)).toBe('submit')
  })
})
