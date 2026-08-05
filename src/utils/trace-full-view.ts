import type { TraceNode, TraceTreeResult } from '@/types/trace'

export type TraceBranchDirection = 'up' | 'down'

export interface TraceBranchItem {
  node: TraceNode
  direction: TraceBranchDirection
  depth: number
}

/**
 * 全链路以查询节点为根：完整保留向上追溯原有树形，再并列挂接下游树。
 * 这样向上分支与单独“向上追溯”使用完全一致的节点层级。
 */
export function buildFullTraceRoot(result: TraceTreeResult): TraceNode {
  return {
    ...result.rootNode,
    children: [
      ...(result.upward ?? []),
      ...(result.children ?? []),
    ],
  }
}

/** 按节点真实 children 关系展平一条追溯分支，供列表视图展示层级。 */
export function flattenTraceBranch(
  nodes: TraceNode[],
  direction: TraceBranchDirection,
  depth = 1,
): TraceBranchItem[] {
  const result: TraceBranchItem[] = []
  for (const node of nodes) {
    result.push({ node, direction, depth })
    if (node.children?.length) {
      result.push(...flattenTraceBranch(node.children, direction, depth + 1))
    }
  }
  return result
}