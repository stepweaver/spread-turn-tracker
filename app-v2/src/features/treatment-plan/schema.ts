import { z } from 'zod'
import { MAX_PATIENT_NAME_LENGTH } from '../../lib/constants'

export const scheduleTypeSchema = z.enum(['every_n_days', 'twice_per_week'])

export const treatmentPlanFormSchema = z.object({
  topTotal: z.coerce.number().int().min(1).max(999),
  bottomTotal: z.coerce.number().int().min(1).max(999),
  intervalDays: z.coerce.number().int().min(1).max(365),
  scheduleType: scheduleTypeSchema,
  installDate: z.preprocess(
    (v) => (v === '' || v === undefined ? null : v),
    z.union([z.string().regex(/^\d{4}-\d{2}-\d{2}$/), z.null()])
  ),
  patientName: z
    .string()
    .trim()
    .min(1)
    .max(MAX_PATIENT_NAME_LENGTH),
})

export type TreatmentPlanFormValues = z.infer<typeof treatmentPlanFormSchema>
