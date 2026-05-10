'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { adminApi, type AdminUser } from './api'

export function useAdminGuard() {
  const router = useRouter()
  const [admin, setAdmin] = useState<AdminUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let isMounted = true

    async function loadAdmin() {
      try {
        setLoading(true)
        setError('')

        const result = await adminApi.me()

        if (!isMounted) return

        setAdmin(result.admin)
      } catch (err) {
        if (!isMounted) return

        setAdmin(null)
        setError(err instanceof Error ? err.message : 'Sessão inválida')
        router.replace('/login/')
      } finally {
        if (isMounted) {
          setLoading(false)
        }
      }
    }

    loadAdmin()

    return () => {
      isMounted = false
    }
  }, [router])

  return {
    admin,
    loading,
    error,
  }
}
