import { AuthEntryPage } from '@/components/Auth/AuthEntryPage'

interface LoginPageProps {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}

export default function LoginPage(props: LoginPageProps) {
  return <AuthEntryPage {...props} />
}
