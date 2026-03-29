import { describe, expect, it } from 'vitest'
import { treatmentPlanFormSchema } from './schema'

describe('treatmentPlanFormSchema', () => {
  it('accepts valid payload', () => {
    const r = treatmentPlanFormSchema.parse({
      topTotal: 27,
      bottomTotal: 23,
      intervalDays: 2,
      scheduleType: 'every_n_days',
      installDate: '2026-01-15',
      patientName: 'Alex',
    })
    expect(r.patientName).toBe('Alex')
    expect(r.installDate).toBe('2026-01-15')
  })

  it('normalizes empty install to null', () => {
    const r = treatmentPlanFormSchema.parse({
      topTotal: 10,
      bottomTotal: 10,
      intervalDays: 1,
      scheduleType: 'twice_per_week',
      installDate: null,
      patientName: 'Child',
    })
    expect(r.installDate).toBeNull()
  })

  it('rejects out-of-range totals', () => {
    expect(() =>
      treatmentPlanFormSchema.parse({
        topTotal: 0,
        bottomTotal: 10,
        intervalDays: 2,
        scheduleType: 'every_n_days',
        installDate: null,
        patientName: 'X',
      })
    ).toThrow()
  })
})
