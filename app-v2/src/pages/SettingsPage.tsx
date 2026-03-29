import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { useTrackerScope } from '../features/tracker/hooks'
import { updatePatientName } from '../features/patient/api'
import { updateTreatmentPlan } from '../features/treatment-plan/api'
import { treatmentPlanFormSchema } from '../features/treatment-plan/schema'
import type { Database } from '../lib/database.types'
import { Button } from '../components/shared/Button'
import { Card } from '../components/shared/Card'
import { Spinner } from '../components/shared/Spinner'

type PatientRow = Database['public']['Tables']['patients']['Row']
type PlanRow = Database['public']['Tables']['treatment_plans']['Row']

export function SettingsPage() {
  const scope = useTrackerScope()
  const patient = scope.data?.patient
  const plan = scope.data?.plan

  if (scope.isLoading || !patient || !plan) {
    return (
      <div className="flex justify-center py-16" data-testid="settings-loading">
        <Spinner />
      </div>
    )
  }

  return <SettingsForm key={patient.id} patient={patient} plan={plan} />
}

function SettingsForm({ patient, plan }: { patient: PatientRow; plan: PlanRow }) {
  const queryClient = useQueryClient()
  const [patientName, setPatientName] = useState(patient.name)
  const [topTotal, setTopTotal] = useState(plan.top_total)
  const [bottomTotal, setBottomTotal] = useState(plan.bottom_total)
  const [intervalDays, setIntervalDays] = useState(plan.interval_days)
  const [scheduleType, setScheduleType] = useState<'every_n_days' | 'twice_per_week'>(
    plan.schedule_type
  )
  const [installDate, setInstallDate] = useState(plan.install_date ?? '')
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const saveMutation = useMutation({
    mutationFn: async () => {
      const parsed = treatmentPlanFormSchema.parse({
        patientName,
        topTotal,
        bottomTotal,
        intervalDays,
        scheduleType,
        installDate: installDate || null,
      })
      await updatePatientName(patient.id, parsed.patientName)
      await updateTreatmentPlan(plan.id, {
        top_total: parsed.topTotal,
        bottom_total: parsed.bottomTotal,
        interval_days: parsed.intervalDays,
        schedule_type: parsed.scheduleType,
        install_date: parsed.installDate,
      })
    },
    onSuccess: () => {
      setMessage('Saved.')
      setError(null)
      void queryClient.invalidateQueries({ queryKey: ['tracker-scope'] })
    },
    onError: (e: Error) => {
      setMessage(null)
      setError(e.message)
    },
  })

  return (
    <div className="flex flex-col gap-4" data-testid="settings-page">
      <h1 className="text-xl font-bold text-zinc-900">Settings</h1>
      <Card title="Patient & plan">
        <form
          className="flex flex-col gap-3 text-sm"
          onSubmit={(e) => {
            e.preventDefault()
            void saveMutation.mutateAsync()
          }}
          data-testid="settings-form"
        >
          <label className="flex flex-col gap-1">
            Child / patient name
            <input
              value={patientName}
              onChange={(e) => setPatientName(e.target.value)}
              className="rounded-md border border-zinc-300 px-2 py-1"
              data-testid="settings-patient-name"
            />
          </label>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="flex flex-col gap-1">
              Top total
              <input
                type="number"
                min={1}
                max={999}
                value={topTotal}
                onChange={(e) => setTopTotal(Number(e.target.value))}
                className="rounded-md border border-zinc-300 px-2 py-1"
                data-testid="settings-top-total"
              />
            </label>
            <label className="flex flex-col gap-1">
              Bottom total
              <input
                type="number"
                min={1}
                max={999}
                value={bottomTotal}
                onChange={(e) => setBottomTotal(Number(e.target.value))}
                className="rounded-md border border-zinc-300 px-2 py-1"
                data-testid="settings-bottom-total"
              />
            </label>
          </div>
          <label className="flex flex-col gap-1">
            Schedule
            <select
              value={scheduleType}
              onChange={(e) =>
                setScheduleType(e.target.value as 'every_n_days' | 'twice_per_week')
              }
              className="rounded-md border border-zinc-300 px-2 py-1"
              data-testid="settings-schedule-type"
            >
              <option value="every_n_days">Every N days</option>
              <option value="twice_per_week">Twice per week</option>
            </select>
          </label>
          <label className="flex flex-col gap-1">
            Interval days (every-N schedule)
            <input
              type="number"
              min={1}
              max={365}
              value={intervalDays}
              onChange={(e) => setIntervalDays(Number(e.target.value))}
              className="rounded-md border border-zinc-300 px-2 py-1"
              data-testid="settings-interval"
            />
          </label>
          <label className="flex flex-col gap-1">
            Install date
            <input
              type="date"
              value={installDate}
              onChange={(e) => setInstallDate(e.target.value)}
              className="rounded-md border border-zinc-300 px-2 py-1"
              data-testid="settings-install-date"
            />
          </label>
          {error ? <p className="text-red-600">{error}</p> : null}
          {message ? <p className="text-emerald-700">{message}</p> : null}
          <Button type="submit" disabled={saveMutation.isPending} data-testid="settings-save">
            Save settings
          </Button>
        </form>
      </Card>
    </div>
  )
}
