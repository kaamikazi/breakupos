import { z } from 'zod'

export const deleteAllSchema = z.object({
  confirmation: z.literal('DELETE MY BREAKUPOS DATA'),
})

export const DELETE_ACCOUNT_CONFIRMATION = 'DELETE'

export const deleteAccountSchema = z.object({
  confirmation: z.literal(DELETE_ACCOUNT_CONFIRMATION),
})

export function hasValidDeleteAccountConfirmation(value: string) {
  return value === DELETE_ACCOUNT_CONFIRMATION
}

export function collectStoragePaths<T extends { storage_path?: string | null }>(rows: T[] | null | undefined) {
  return (rows ?? [])
    .map(row => row.storage_path)
    .filter((path): path is string => Boolean(path))
}

export function getDeleteAccountCoverageSummary() {
  return [
    'profiles',
    'dating profiles and profile photos',
    'matches and dating messages',
    'message requests',
    'social posts and reactions',
    'situations, interactions, AI advice, reports, weekly summaries',
    'blocks, reports, notifications, credits, and AI usage events',
    'profile photo and social post storage objects',
    'Supabase Auth user',
  ]
}
