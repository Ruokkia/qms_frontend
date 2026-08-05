import { describe, expect, it } from 'vitest'
import { buildTraceAuthorizationHeaders } from './trace-authorization'

describe('trace authorization headers', () => {
  it('adds the bearer token required by trace endpoints', () => {
    expect(buildTraceAuthorizationHeaders('token-123')).toEqual({
      Authorization: 'Bearer token-123',
    })
  })

  it('includes the current plant so a switched company queries its own trace data', () => {
    expect(buildTraceAuthorizationHeaders('token-123', 'MZ')).toEqual({
      Authorization: 'Bearer token-123',
      'X-Plant-Code': 'MZ',
    })
  })
})
