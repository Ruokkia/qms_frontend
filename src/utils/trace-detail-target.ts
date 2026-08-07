export type TraceDetailTarget =
  | { kind: 'finished'; id: number }
  | { kind: 'incoming'; id: number }

/** Maps a trace node's composite ID to the data-management detail it represents. */
export function resolveTraceDetailTarget(
  nodeId: string | number,
  nodeType: string,
): TraceDetailTarget | null {
  const matched = /^(fg|mi)_(\d+)$/.exec(String(nodeId))
  if (!matched) return null

  const [, prefix, rawId] = matched
  const id = Number(rawId)
  if (!Number.isSafeInteger(id) || id <= 0) return null

  if (prefix === 'fg' && ['FINISHED_GOOD', 'SEMI_FINISHED'].includes(nodeType)) {
    return { kind: 'finished', id }
  }
  if (prefix === 'mi' && nodeType === 'MATERIAL') {
    return { kind: 'incoming', id }
  }
  return null
}
