import { describe, expect, it } from 'vitest'
import type { TraceNode, TraceTreeResult } from '@/types/trace'
import { buildFullTraceRoot, flattenTraceBranch } from './trace-full-view'

const node = (id: string, children: TraceNode[] = []): TraceNode => ({
  id,
  nodeType: 'SEMI_FINISHED',
  nodeCode: id,
  children,
})

const result: TraceTreeResult = {
  rootNode: node('WBB0125020041-60'),
  upward: [node('PARENT', [node('ANCESTOR')])],
  children: [node('MATERIAL')],
  stats: { totalNodes: 4, maxDepth: 3, levelCap: 8, batchCount: 0, supplierCount: 0 },
}

describe('全链路追溯视图结构', () => {
  it('保留向上追溯的嵌套层级，并将下游节点并入查询根节点', () => {
    const root = buildFullTraceRoot(result)

    expect(root.children?.map((item) => item.nodeCode)).toEqual(['PARENT', 'MATERIAL'])
    expect(root.children?.[0].children?.map((item) => item.nodeCode)).toEqual(['ANCESTOR'])
  })

  it('列表视图按真实嵌套层级展开向上分支', () => {
    expect(flattenTraceBranch(result.upward!, 'up')).toEqual([
      { node: result.upward![0], direction: 'up', depth: 1 },
      { node: result.upward![0].children![0], direction: 'up', depth: 2 },
    ])
  })
})