import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { buildDashboardViewModel } from '../domain/dashboard/buildDashboardViewModel'
import { groupTurnHistory, mostRecentTurnId } from '../domain/history/groupTurnHistory'
import { planRowToInput, turnRowsToInputs } from '../lib/mappers'
import { formatDateDisplay, todayISODateLocal } from '../lib/dates'
import { useAuth } from '../features/auth/useAuth'
import { useTrackerScope } from '../features/tracker/hooks'
import {
  deleteAllTurnLogsForPatient,
  deleteTurnLog,
  fetchTurnLogs,
  insertTurnLogs,
} from '../features/turns/api'
import { logTurnsBodySchema } from '../features/turns/schema'
import { Button } from '../components/shared/Button'
import { Card } from '../components/shared/Card'
import { EmptyState } from '../components/shared/EmptyState'
import { Modal } from '../components/shared/Modal'
import { Spinner } from '../components/shared/Spinner'

export function DashboardPage() {
  const navigate = useNavigate()
  const { session } = useAuth()
  const queryClient = useQueryClient()
  const scope = useTrackerScope()
  const patientId = scope.data?.patient.id
  const householdId = scope.data?.householdId
  const planRow = scope.data?.plan
  const patient = scope.data?.patient

  const turnsQuery = useQuery({
    queryKey: ['turns', patientId],
    queryFn: () => fetchTurnLogs(patientId!),
    enabled: !!patientId,
  })

  const [noteModal, setNoteModal] = useState<'top' | 'bottom' | 'both' | null>(null)
  const [noteDraft, setNoteDraft] = useState('')
  const [resetOpen, setResetOpen] = useState(false)

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ['turns', patientId] })
    void queryClient.invalidateQueries({ queryKey: ['tracker-scope'] })
  }

  const logMutation = useMutation({
    mutationFn: async (payload: { arch: 'top' | 'bottom' | 'both'; note: string | null }) => {
      if (!patientId || !householdId || !session?.user.id || !planRow) throw new Error('Missing scope')
      const today = todayISODateLocal()
      const turns =
        payload.arch === 'both'
          ? [
              { date: today, arch: 'top' as const, note: payload.note },
              { date: today, arch: 'bottom' as const, note: payload.note },
            ]
          : payload.arch === 'top'
            ? [{ date: today, arch: 'top' as const, note: payload.note }]
            : [{ date: today, arch: 'bottom' as const, note: payload.note }]

      const parsed = logTurnsBodySchema.parse({ turns })
      return insertTurnLogs(householdId, patientId, session.user.id, parsed.turns)
    },
    onSuccess: invalidate,
  })

  const undoMutation = useMutation({
    mutationFn: (id: string) => deleteTurnLog(id),
    onSuccess: invalidate,
  })

  const resetMutation = useMutation({
    mutationFn: () => {
      if (!patientId) throw new Error('No patient')
      return deleteAllTurnLogsForPatient(patientId)
    },
    onSuccess: () => {
      setResetOpen(false)
      invalidate()
    },
  })

  if (scope.isLoading || !planRow || !patient) {
    return (
      <div className="flex justify-center py-16" data-testid="dashboard-loading">
        <Spinner />
      </div>
    )
  }

  if (scope.isError) {
    return (
      <Card title="Error">
        <p className="text-sm text-red-600">{(scope.error as Error).message}</p>
        <Button className="mt-2" onClick={() => navigate(0)}>
          Retry
        </Button>
      </Card>
    )
  }

  const turns = turnsQuery.data ?? []
  const planInput = planRowToInput(planRow)
  const turnInputs = turnRowsToInputs(turns)
  const vm = buildDashboardViewModel(planInput, turnInputs, new Date())
  const history = groupTurnHistory(turns, 20)
  const latestId = mostRecentTurnId(turns)

  function openNote(arch: 'top' | 'bottom' | 'both') {
    setNoteDraft('')
    setNoteModal(arch)
  }

  async function confirmNote() {
    if (!noteModal) return
    try {
      await logMutation.mutateAsync({ arch: noteModal, note: noteDraft.trim() || null })
      setNoteModal(null)
    } catch (e: unknown) {
      const code =
        e && typeof e === 'object' && 'code' in e ? String((e as { code: string }).code) : ''
      const msg =
        code === '23505'
          ? 'A turn for today already exists for that arch.'
          : e instanceof Error
            ? e.message
            : 'Failed to log turn'
      alert(msg)
    }
  }

  return (
    <div className="flex flex-col gap-4" data-testid="dashboard">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-zinc-900" data-testid="patient-name">
          {patient.name}
        </h1>
      </div>

      <Card title="Status">
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span
            className={`rounded-full px-3 py-1 text-xs font-semibold uppercase ${
              vm.overallStatus === 'complete'
                ? 'bg-emerald-100 text-emerald-800'
                : vm.overallStatus === 'ready'
                  ? 'bg-amber-100 text-amber-900'
                  : 'bg-zinc-200 text-zinc-700'
            }`}
            data-testid="status-badge"
          >
            {vm.overallStatus}
          </span>
          <span className="text-zinc-600">
            Last logged:{' '}
            <span data-testid="last-logged">{formatDateDisplay(vm.lastLoggedDate)}</span>
          </span>
        </div>
        <p className="mt-2 text-sm text-zinc-600">
          Next due:{' '}
          <strong data-testid="next-due">
            {vm.displayNextDue ? formatDateDisplay(todayISODateLocal(vm.displayNextDue)) : '—'}
          </strong>
          <span className="text-zinc-400"> ({vm.scheduleHint})</span>
        </p>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2">
        <ProgressBlock
          label="Top"
          progress={vm.topProgress}
          status={vm.topStatus}
          testId="top"
        />
        <ProgressBlock
          label="Bottom"
          progress={vm.bottomProgress}
          status={vm.bottomStatus}
          testId="bottom"
        />
      </div>

      <Card title="Log turn">
        {turnsQuery.isLoading ? (
          <Spinner />
        ) : vm.topComplete && vm.bottomComplete ? (
          <Button disabled className="w-full">
            All complete!
          </Button>
        ) : (
          <div className="flex flex-col gap-2" data-testid="log-buttons">
            {vm.bothCanLog ? (
              <Button
                className="w-full"
                onClick={() => openNote('both')}
                data-testid="log-both"
              >
                Log today&apos;s turn (both)
              </Button>
            ) : null}
            {!vm.topComplete ? (
              vm.topCanLog.canLog ? (
                <Button
                  variant={vm.bothCanLog ? 'secondary' : 'primary'}
                  className="w-full"
                  onClick={() => openNote('top')}
                  data-testid="log-top"
                >
                  Log top only
                </Button>
              ) : (
                <Button variant="secondary" className="w-full" disabled>
                  {vm.topCanLog.reason === 'wait' && vm.topCanLog.daysRemaining != null
                    ? `Top: wait ${vm.topCanLog.daysRemaining} day(s)`
                    : vm.topCanLog.message ?? 'Top: not due yet'}
                </Button>
              )
            ) : null}
            {!vm.bottomComplete ? (
              vm.bottomCanLog.canLog ? (
                <Button
                  variant={vm.bothCanLog ? 'secondary' : 'primary'}
                  className="w-full"
                  onClick={() => openNote('bottom')}
                  data-testid="log-bottom"
                >
                  Log bottom only
                </Button>
              ) : (
                <Button variant="secondary" className="w-full" disabled>
                  {vm.bottomCanLog.reason === 'wait' && vm.bottomCanLog.daysRemaining != null
                    ? `Bottom: wait ${vm.bottomCanLog.daysRemaining} day(s)`
                    : vm.bottomCanLog.message ?? 'Bottom: not due yet'}
                </Button>
              )
            ) : null}
          </div>
        )}
        <div className="mt-3 flex flex-wrap gap-2">
          <Button
            variant="secondary"
            disabled={turns.length === 0 || undoMutation.isPending}
            onClick={() => {
              if (!latestId) return
              if (confirm('Undo the most recent turn?')) {
                void undoMutation.mutateAsync(latestId)
              }
            }}
            data-testid="undo-latest"
          >
            Undo latest
          </Button>
          <Button variant="danger" onClick={() => setResetOpen(true)} data-testid="reset-opens">
            Reset all turns
          </Button>
        </div>
      </Card>

      <Card title="Recent history">
        {turns.length === 0 ? (
          <EmptyState message="No turns logged yet." />
        ) : (
          <ul className="flex flex-col gap-3">
            {history.map((day) => (
              <li
                key={day.date}
                className="rounded-lg border border-zinc-100 bg-zinc-50/80 px-3 py-2 text-sm"
              >
                <div className="font-medium text-zinc-800">{formatDateDisplay(day.date)}</div>
                {day.note ? (
                  <div className="text-zinc-600 italic">&ldquo;{day.note}&rdquo;</div>
                ) : null}
                <div className="mt-1 flex flex-wrap gap-2">
                  {day.top ? (
                    <span className="inline-flex items-center gap-1">
                      Top
                      <button
                        type="button"
                        className="text-sky-700 underline"
                        title="Undo top turn"
                        onClick={() => {
                          if (confirm('Undo this turn?')) {
                            void undoMutation.mutateAsync(day.top!.id)
                          }
                        }}
                        data-testid={`undo-turn-${day.top.id}`}
                      >
                        Undo
                      </button>
                    </span>
                  ) : null}
                  {day.bottom ? (
                    <span className="inline-flex items-center gap-1">
                      Bottom
                      <button
                        type="button"
                        className="text-sky-700 underline"
                        title="Undo bottom turn"
                        onClick={() => {
                          if (confirm('Undo this turn?')) {
                            void undoMutation.mutateAsync(day.bottom!.id)
                          }
                        }}
                        data-testid={`undo-turn-${day.bottom.id}`}
                      >
                        Undo
                      </button>
                    </span>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Modal
        open={noteModal != null}
        title="Add note (optional)"
        onClose={() => setNoteModal(null)}
        footer={
          <>
            <Button variant="secondary" onClick={() => setNoteModal(null)}>
              Cancel
            </Button>
            <Button onClick={() => void confirmNote()} disabled={logMutation.isPending}>
              Log turn
            </Button>
          </>
        }
      >
        <textarea
          className="mt-2 w-full rounded-md border border-zinc-300 p-2 text-sm"
          rows={3}
          value={noteDraft}
          onChange={(e) => setNoteDraft(e.target.value)}
          placeholder="Optional note"
          data-testid="turn-note-input"
        />
      </Modal>

      <Modal
        open={resetOpen}
        title="Reset all turns?"
        onClose={() => setResetOpen(false)}
        footer={
          <>
            <Button variant="secondary" onClick={() => setResetOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              disabled={resetMutation.isPending}
              onClick={() => void resetMutation.mutateAsync()}
              data-testid="reset-confirm"
            >
              Delete all
            </Button>
          </>
        }
      >
        <p className="text-sm text-zinc-700">
          This removes every logged turn for this patient. Your treatment plan settings are kept.
        </p>
      </Modal>
    </div>
  )
}

function ProgressBlock({
  label,
  progress,
  status,
  testId,
}: {
  label: string
  progress: { doneDisplay: number; total: number; remaining: number; percentage: number }
  status: string
  testId: string
}) {
  return (
    <Card title={label}>
      <div className="text-sm text-zinc-600">
        <span data-testid={`${testId}-done`}>{progress.doneDisplay}</span>
        {' / '}
        <span data-testid={`${testId}-total`}>{progress.total}</span>
        <span className="text-zinc-400">
          {' '}
          ({progress.percentage}%) · {progress.remaining} left · {status}
        </span>
      </div>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-zinc-200">
        <div
          className="h-full bg-sky-600 transition-[width]"
          style={{ width: `${progress.percentage}%` }}
          data-testid={`${testId}-progress-bar`}
        />
      </div>
    </Card>
  )
}
