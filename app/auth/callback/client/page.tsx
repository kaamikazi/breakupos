import { Suspense } from 'react'
import { AuthCallbackClient } from './AuthCallbackClient'

export default function ClientAuthCallbackPage() {
  return (
    <Suspense fallback={null}>
      <AuthCallbackClient />
    </Suspense>
  )
}
