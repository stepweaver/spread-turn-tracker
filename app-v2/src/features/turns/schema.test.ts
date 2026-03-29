import { describe, expect, it } from 'vitest'
import { logTurnsBodySchema } from './schema'

describe('logTurnsBodySchema', () => {
  it('parses tandem payload', () => {
    const r = logTurnsBodySchema.parse({
      turns: [
        { date: '2026-03-10', arch: 'top', note: null },
        { date: '2026-03-10', arch: 'bottom', note: 'x' },
      ],
    })
    expect(r.turns).toHaveLength(2)
  })

  it('rejects bad date', () => {
    expect(() =>
      logTurnsBodySchema.parse({
        turns: [{ date: '03/10/2026', arch: 'top' }],
      })
    ).toThrow()
  })
})
