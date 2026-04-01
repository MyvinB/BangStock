'use client'

import { useEffect, useState, useCallback } from 'react'
import { fetchProducts as apiFetchProducts, fetchExpenses as apiFetchExpenses, fetchCustomers as apiFetchCustomers } from '@/lib/api'
import type { Product, Expense, Customer } from '@/types'

type AsyncState<T> = {
  data: T
  loading: boolean
  error: string | null
  refresh: () => void
}

function useAsync<T>(fetcher: () => Promise<T>, initial: T): AsyncState<T> {
  const [data, setData] = useState<T>(initial)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(() => {
    setLoading(true)
    setError(null)
    fetcher()
      .then(setData)
      .catch((e) => setError(e.message ?? 'Something went wrong'))
      .finally(() => setLoading(false))
  }, [fetcher])

  useEffect(() => { refresh() }, [refresh])

  return { data, loading, error, refresh }
}

export function useProducts(filters?: { isActive?: boolean; stockType?: string }) {
  const fetcher = useCallback(() => apiFetchProducts(filters), [filters?.isActive, filters?.stockType])
  return useAsync<Product[]>(fetcher, [])
}

export function useExpenses() {
  return useAsync<Expense[]>(apiFetchExpenses, [])
}

export function useCustomers() {
  return useAsync<Customer[]>(apiFetchCustomers, [])
}
