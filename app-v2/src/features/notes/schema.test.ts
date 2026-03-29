import { describe, expect, it } from 'vitest'
import { treatmentNoteCreateSchema, treatmentNoteUpdateSchema } from './schema'

describe('treatmentNoteCreateSchema', () => {
  it('requires non-empty note', () => {
    expect(() =>
      treatmentNoteCreateSchema.parse({ date: '2026-03-10', note: '   ' })
    ).toThrow()
  })

  it('accepts valid note', () => {
    const r = treatmentNoteCreateSchema.parse({
      date: '2026-03-10',
      note: 'Adjustment',
    })
    expect(r.note).toBe('Adjustment')
  })
})

describe('treatmentNoteUpdateSchema', () => {
  it('requires uuid id', () => {
    const r = treatmentNoteUpdateSchema.parse({
      id: '123e4567-e89b-12d3-a456-426614174000',
      date: '2026-03-10',
      note: 'Updated',
    })
    expect(r.id).toContain('123e4567')
  })
})
