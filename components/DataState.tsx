'use client'

type Props = {
  loading: boolean
  error: string | null
  onRetry?: () => void
  children: React.ReactNode
}

export default function DataState({ loading, error, onRetry, children }: Props) {
  if (loading) return <div className="flex items-center justify-center py-12 text-gray-500">Loading...</div>
  if (error) return (
    <div className="p-6 text-center">
      <p className="text-red-600 font-medium">Failed to load data</p>
      <p className="text-sm text-gray-500 mt-1">{error}</p>
      {onRetry && <button onClick={onRetry} className="mt-3 text-indigo-600 text-sm underline">Retry</button>}
    </div>
  )
  return <>{children}</>
}
