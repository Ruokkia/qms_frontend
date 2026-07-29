export function isDialogCancellation(action: unknown): boolean {
  return action === 'cancel' || action === 'close'
}
