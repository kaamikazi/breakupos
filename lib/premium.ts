import { createServiceClient } from '@/lib/supabase-server'

export async function isProUser(userId: string) {
  const supabase = createServiceClient()
  const { data } = await supabase
    .from('profiles')
    .select('plan')
    .eq('id', userId)
    .single()

  return data?.plan === 'pro'
}
