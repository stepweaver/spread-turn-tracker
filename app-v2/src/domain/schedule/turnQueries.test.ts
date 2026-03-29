import { describe, expect, it } from 'vitest'
import { INSTALL_TURN_COUNT } from '../../lib/constants'
import { toISODateLocal } from '../../lib/dates'
import { buildDashboardViewModel } from '../dashboard/buildDashboardViewModel'
import {
  canLogTurn,
  getNextDueDate,
  getTurnsThisWeek,
  lastLoggedDisplayDate,
} from './turnQueries'
import { wouldDuplicateTurn } from './canLogTurnForDate'
import type { TreatmentPlanInput, TurnLogInput } from '../types'

const planEvery2: TreatmentPlanInput = {
  topTotal: 5,
  bottomTotal: 5,
  installDate: '2026-01-01',
  scheduleType: 'every_n_days',
  intervalDays: 2,
}

describe('canLogTurn every_n_days', () => {
  it('allows first log when no prior turn for arch', () => {
    const today = '2026-03-10'
    expect(canLogTurn(planEvery2, [], 'top', today).canLog).toBe(true)
  })

  it('waits until interval passed since last turn', () => {
    const turns: TurnLogInput[] = [{ date: '2026-03-10', arch: 'top' }]
    expect(canLogTurn(planEvery2, turns, 'top', '2026-03-11').canLog).toBe(false)
    expect(canLogTurn(planEvery2, turns, 'top', '2026-03-11').daysRemaining).toBe(1)
    expect(canLogTurn(planEvery2, turns, 'top', '2026-03-12').canLog).toBe(true)
  })

  it('blocks when done + install reaches total', () => {
    const turns: TurnLogInput[] = [
      { date: '2026-03-01', arch: 'top' },
      { date: '2026-03-03', arch: 'top' },
      { date: '2026-03-05', arch: 'top' },
      { date: '2026-03-07', arch: 'top' },
    ]
    // logged 4 + install 1 = 5 >= topTotal 5
    expect(canLogTurn(planEvery2, turns, 'top', '2026-03-20').canLog).toBe(false)
    expect(canLogTurn(planEvery2, turns, 'top', '2026-03-20').reason).toBe('complete')
  })
})

describe('canLogTurn twice_per_week', () => {
  const planTwice: TreatmentPlanInput = {
    topTotal: 10,
    bottomTotal: 10,
    installDate: null,
    scheduleType: 'twice_per_week',
    intervalDays: 2,
  }

  it('allows up to 2 turns per Monday-based week per arch', () => {
    // Monday 2026-03-09
    const mon = new Date(2026, 2, 9)
    const turns: TurnLogInput[] = [
      { date: '2026-03-09', arch: 'top' },
      { date: '2026-03-10', arch: 'top' },
    ]
    expect(getTurnsThisWeek(turns, 'top', mon)).toBe(2)
    expect(canLogTurn(planTwice, turns, 'top', mon).canLog).toBe(false)
    expect(canLogTurn(planTwice, turns, 'top', mon).message).toContain('2 turns')
  })

  it('Sunday belongs to week that started prior Monday', () => {
    // Sunday 2026-03-08 -> week starting 2026-03-02 (Monday)
    const sun = new Date(2026, 2, 8)
    const turns: TurnLogInput[] = [{ date: '2026-03-03', arch: 'bottom' }]
    expect(getTurnsThisWeek(turns, 'bottom', sun)).toBe(1)
  })
})

describe('getNextDueDate', () => {
  it('uses installDate + interval when no logs for arch', () => {
    const next = getNextDueDate(planEvery2, [], 'top', '2026-03-01')
    expect(next).not.toBeNull()
    expect(toISODateLocal(next!)).toBe('2026-01-03')
  })

  it('returns null when arch complete', () => {
    const turns: TurnLogInput[] = [
      { date: '2026-03-01', arch: 'top' },
      { date: '2026-03-03', arch: 'top' },
      { date: '2026-03-05', arch: 'top' },
      { date: '2026-03-07', arch: 'top' },
    ]
    expect(getNextDueDate(planEvery2, turns, 'top', '2026-03-20')).toBeNull()
  })
})

describe('buildDashboardViewModel', () => {
  it('clamps display next due to today when computed due is in the past', () => {
    const vm = buildDashboardViewModel(
      planEvery2,
      [{ date: '2026-03-01', arch: 'top' }],
      '2026-03-20'
    )
    const today = new Date(2026, 2, 20)
    today.setHours(0, 0, 0, 0)
    expect(vm.displayNextDue?.getTime()).toBe(today.getTime())
  })

  it('matches schedule hint for every N days', () => {
    const vm = buildDashboardViewModel(planEvery2, [], '2026-03-01')
    expect(vm.scheduleHint).toBe('every 2 days')
  })
})

describe('wouldDuplicateTurn', () => {
  it('detects same patient date arch', () => {
    const turns: TurnLogInput[] = [{ date: '2026-03-10', arch: 'top' }]
    expect(wouldDuplicateTurn(turns, '2026-03-10', 'top')).toBe(true)
    expect(wouldDuplicateTurn(turns, '2026-03-10', 'bottom')).toBe(false)
  })
})

describe('lastLoggedDisplayDate', () => {
  it('picks later of top vs bottom last dates', () => {
    const turns: TurnLogInput[] = [
      { date: '2026-03-01', arch: 'top' },
      { date: '2026-03-05', arch: 'bottom' },
    ]
    expect(lastLoggedDisplayDate(turns)).toBe('2026-03-05')
  })
})

describe('INSTALL_TURN_COUNT', () => {
  it('remains 1 for parity with v1', () => {
    expect(INSTALL_TURN_COUNT).toBe(1)
  })
})
