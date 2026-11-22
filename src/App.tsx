import { RouterProvider } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { router } from '@/router'
import { ToastProvider } from '@/components/ui/Toast'
import { useEffect, useState } from 'react'
import { HRMS_ACCESS_DENIED_EVENT } from '@/lib/api'
import { NoHrmsAccess } from '@/components/AccessDenied/NoHrmsAccess'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000, // Keep unused data in cache for 10 minutes
      retry: 1,
      refetchOnWindowFocus: false, // Don't refetch every time user tabs back
    },
  },
})

export default function App() {
  const [noHrmsAccess, setNoHrmsAccess] = useState(false)
  useEffect(() => {
    const onDenied = () => setNoHrmsAccess(true)
    window.addEventListener(HRMS_ACCESS_DENIED_EVENT, onDenied)
    return () => window.removeEventListener(HRMS_ACCESS_DENIED_EVENT, onDenied)
  }, [])

  if (noHrmsAccess) return <NoHrmsAccess />

  return (
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <RouterProvider router={router} />
      </ToastProvider>
    </QueryClientProvider>
  )
}
