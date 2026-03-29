import { z } from 'zod'
import { MAX_TURN_NOTE_LENGTH } from '../../lib/constants'

const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Expected YYYY-MM-DD')

export const turnLogPayloadSchema = z.object({
  date: dateSchema,
  arch: z.enum(['top', 'bottom']),
  note: z
    .string()
    .max(MAX_TURN_NOTE_LENGTH)
    .optional()
    .nullable()
    .transform((n) => {
      if (n == null || n === '') return null
      return n.trim().slice(0, MAX_TURN_NOTE_LENGTH) || null
    }),
})

export const logTurnsBodySchema = z.object({
  turns: z.array(turnLogPayloadSchema).min(1),
})

export type TurnLogPayload = z.infer<typeof turnLogPayloadSchema>
