import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import LoginForm from './login-form'

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (user) {
    redirect('/')
  }

  const { error } = await searchParams

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-full max-w-sm">
        <div className="bg-white rounded-xl shadow-sm border p-8">
          <div className="text-center mb-8">
            <div className="mx-auto w-12 h-12 bg-primary rounded-xl flex items-center justify-center mb-4">
              <span className="text-white font-bold text-xl">5M</span>
            </div>
            <h1 className="text-xl font-semibold text-gray-900">5mevsim</h1>
            <p className="text-sm text-gray-500 mt-1">Yönetim Paneli</p>
          </div>

          {error === 'no_access' && (
            <div className="mb-4 rounded-md bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
              Bu panel yalnızca okul yöneticileri içindir.
            </div>
          )}

          <LoginForm />
        </div>
      </div>
    </div>
  )
}
