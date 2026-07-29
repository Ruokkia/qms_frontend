export function isDialogCancellation(action: unknown): boolean {
  return action === 'cancel' || action === 'close'
}

export function hasRequiredReason(reason: unknown): reason is string {
  return typeof reason === 'string' && reason.trim().length > 0
}
