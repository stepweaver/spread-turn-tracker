import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { useAuth } from '../features/auth/useAuth'
import { useTrackerScope } from '../features/tracker/hooks'
import {
  deleteTreatmentNote,
  fetchTreatmentNotes,
  insertTreatmentNote,
  updateTreatmentNote,
} from '../features/notes/api'
import {
  treatmentNoteCreateSchema,
  treatmentNoteUpdateSchema,
} from '../features/notes/schema'
import { Button } from '../components/shared/Button'
import { Card } from '../components/shared/Card'
import { EmptyState } from '../components/shared/EmptyState'
import { Modal } from '../components/shared/Modal'
import { Spinner } from '../components/shared/Spinner'
import { formatDateDisplay } from '../lib/dates'

export function NotesPage() {
  const { session } = useAuth()
  const queryClient = useQueryClient()
  const scope = useTrackerScope()
  const patientId = scope.data?.patient.id
  const householdId = scope.data?.householdId

  const notesQuery = useQuery({
    queryKey: ['notes', patientId],
    queryFn: () => fetchTreatmentNotes(patientId!),
    enabled: !!patientId,
  })

  const [createOpen, setCreateOpen] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [date, setDate] = useState('')
  const [body, setBody] = useState('')

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ['notes', patientId] })
  }

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!patientId || !householdId || !session?.user.id) throw new Error('Missing scope')
      const parsed = treatmentNoteCreateSchema.parse({ date, note: body })
      return insertTreatmentNote(
        householdId,
        patientId,
        session.user.id,
        parsed.date,
        parsed.note
      )
    },
    onSuccess: () => {
      setCreateOpen(false)
      setDate('')
      setBody('')
      invalidate()
    },
  })

  const updateMutation = useMutation({
    mutationFn: async () => {
      if (!editId) throw new Error('No id')
      const parsed = treatmentNoteUpdateSchema.parse({ id: editId, date, note: body })
      return updateTreatmentNote(parsed.id, parsed.date, parsed.note)
    },
    onSuccess: () => {
      setEditId(null)
      setDate('')
      setBody('')
      invalidate()
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteTreatmentNote(id),
    onSuccess: invalidate,
  })

  if (scope.isLoading) {
    return (
      <div className="flex justify-center py-16">
        <Spinner />
      </div>
    )
  }

  if (scope.isError || !patientId) {
    return <Card title="Error">Could not load patient.</Card>
  }

  const notes = notesQuery.data ?? []

  function openCreate() {
    const d = new Date()
    const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    setDate(iso)
    setBody('')
    setCreateOpen(true)
  }

  function openEdit(n: { id: string; date: string; note: string }) {
    setEditId(n.id)
    setDate(n.date)
    setBody(n.note)
  }

  return (
    <div className="flex flex-col gap-4" data-testid="notes-page">
      <div className="flex justify-between gap-2">
        <h1 className="text-xl font-bold text-zinc-900">Treatment notes</h1>
        <Button onClick={openCreate} data-testid="note-create-open">
          New note
        </Button>
      </div>

      <Card>
        {notesQuery.isLoading ? (
          <Spinner />
        ) : notes.length === 0 ? (
          <EmptyState message="No treatment notes yet." />
        ) : (
          <ul className="flex flex-col gap-3">
            {notes.map((n) => (
              <li
                key={n.id}
                className="flex flex-col gap-2 rounded-lg border border-zinc-100 bg-white px-3 py-2 sm:flex-row sm:items-start sm:justify-between"
                data-testid={`note-row-${n.id}`}
              >
                <div>
                  <div className="font-medium text-zinc-800">{formatDateDisplay(n.date)}</div>
                  <div className="text-sm text-zinc-700 whitespace-pre-wrap">{n.note}</div>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="secondary"
                    className="!px-2 !py-1 text-xs"
                    onClick={() => openEdit(n)}
                    data-testid={`note-edit-${n.id}`}
                  >
                    Edit
                  </Button>
                  <Button
                    variant="danger"
                    className="!px-2 !py-1 text-xs"
                    onClick={() => {
                      if (confirm('Delete this note?')) {
                        void deleteMutation.mutateAsync(n.id)
                      }
                    }}
                    data-testid={`note-delete-${n.id}`}
                  >
                    Delete
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Modal
        open={createOpen}
        title="New note"
        onClose={() => setCreateOpen(false)}
        footer={
          <>
            <Button variant="secondary" onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => void createMutation.mutateAsync()}
              disabled={createMutation.isPending}
              data-testid="note-create-submit"
            >
              Save
            </Button>
          </>
        }
      >
        <label className="flex flex-col gap-1 text-sm">
          Date
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="rounded-md border border-zinc-300 px-2 py-1"
            data-testid="note-date-input"
          />
        </label>
        <label className="mt-2 flex flex-col gap-1 text-sm">
          Note
          <textarea
            className="rounded-md border border-zinc-300 p-2"
            rows={4}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            data-testid="note-body-input"
          />
        </label>
        {createMutation.isError ? (
          <p className="mt-2 text-sm text-red-600">{(createMutation.error as Error).message}</p>
        ) : null}
      </Modal>

      <Modal
        open={editId != null}
        title="Edit note"
        onClose={() => setEditId(null)}
        footer={
          <>
            <Button variant="secondary" onClick={() => setEditId(null)}>
              Cancel
            </Button>
            <Button
              onClick={() => void updateMutation.mutateAsync()}
              disabled={updateMutation.isPending}
              data-testid="note-edit-submit"
            >
              Save
            </Button>
          </>
        }
      >
        <label className="flex flex-col gap-1 text-sm">
          Date
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="rounded-md border border-zinc-300 px-2 py-1"
          />
        </label>
        <label className="mt-2 flex flex-col gap-1 text-sm">
          Note
          <textarea
            className="rounded-md border border-zinc-300 p-2"
            rows={4}
            value={body}
            onChange={(e) => setBody(e.target.value)}
          />
        </label>
        {updateMutation.isError ? (
          <p className="mt-2 text-sm text-red-600">{(updateMutation.error as Error).message}</p>
        ) : null}
      </Modal>
    </div>
  )
}
