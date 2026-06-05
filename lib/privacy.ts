import { z } from 'zod'

export const deleteAllSchema = z.object({
  confirmation: z.literal('DELETE MY BREAKUPOS DATA'),
})
