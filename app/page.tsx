'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { adminApi } from '@/lib/api'

export default function HomePage() {
  const router = useRouter()

  useEffect(() => {
    let isMounted = true

    async function redirect() {
      try {
        await adminApi.me()

        if (!isMounted) return

        router.replace('/dashboard/')
      } catch {
        if (!isMounted) return

        router.replace('/login/')
      }
    }

    redirect()

    return () => {
      isMounted = false
    }
  }, [router])

  return (
    <main className="page-center">
      <div className="loading-card">
        <div className="brand-mark">O</div>
        <p>Verificando acesso administrativo...</p>
      </div>
    </main>
  )
}
