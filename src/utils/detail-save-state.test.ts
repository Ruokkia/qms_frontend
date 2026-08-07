import { describe, expect, it } from 'vitest'
import { runWithSavingState } from './detail-save-state'

describe('detail save state', () => {
  it('clears the saving state after a successful asynchronous save', async () => {
    let saving = false

    await runWithSavingState((value) => { saving = value }, async () => undefined)

    expect(saving).toBe(false)
  })

  it('clears the saving state when the save request fails', async () => {
    let saving = false

    await expect(runWithSavingState((value) => { saving = value }, async () => {
      throw new Error('request failed')
    })).rejects.toThrow('request failed')

    expect(saving).toBe(false)
  })
})
