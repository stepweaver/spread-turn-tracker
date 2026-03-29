import { z } from 'zod'
import { MAX_TREATMENT_NOTE_LENGTH } from '../../lib/constants'

const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Expected YYYY-MM-DD')

export const treatmentNoteCreateSchema = z.object({
  date: dateSchema,
  note: z
    .string()
    .trim()
    .min(1, 'Note is required')
    .max(MAX_TREATMENT_NOTE_LENGTH),
})

export const treatmentNoteUpdateSchema = treatmentNoteCreateSchema.extend({
  id: z.string().uuid(),
})

export type TreatmentNoteCreateInput = z.infer<typeof treatmentNoteCreateSchema>
export type TreatmentNoteUpdateInput = z.infer<typeof treatmentNoteUpdateSchema>
