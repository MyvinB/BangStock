'use client'

import { useAuth } from '@/lib/auth'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

export default function AdminOnly({ children }: { children: React.ReactNode }) {
  const { role, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && role !== 'admin') router.push('/admin')
  }, [role, loading, router])

  if (loading || role !== 'admin') return null

  return <>{children}</>
}
