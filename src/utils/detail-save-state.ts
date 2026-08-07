/** Keeps UI saving state aligned with the complete lifetime of an async request. */
export async function runWithSavingState<T>(
  setSaving: (saving: boolean) => void,
  operation: () => Promise<T>,
): Promise<T> {
  setSaving(true)
  try {
    return await operation()
  } finally {
    setSaving(false)
  }
}
