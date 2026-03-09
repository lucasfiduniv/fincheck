import { MutationCache, QueryCache, QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Router } from './Router'
import { Toaster, toast } from 'react-hot-toast'
import { AuthProvider } from './app/contexts/AuthContext'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { normalizeApiError, shouldRetryRequest } from './app/services/apiError'

const queryClient = new QueryClient({
  queryCache: new QueryCache({
    onError: (error, query) => {
      if (query.meta?.skipGlobalErrorToast) {
        return
      }

      const normalized = normalizeApiError(error)
      toast.error(normalized.message)
    },
  }),
  mutationCache: new MutationCache({
    onError: (error, _variables, _context, mutation) => {
      if (mutation.meta?.skipGlobalErrorToast) {
        return
      }

      const normalized = normalizeApiError(error)
      toast.error(normalized.message)
    },
  }),
  defaultOptions: {
    queries: {
      retry: (failureCount, error) => shouldRetryRequest(failureCount, error),
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 3000),
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
    },
    mutations: {
      retry: false,
    },
  },
})

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Router />
        <Toaster />
      </AuthProvider>
      <ReactQueryDevtools />
    </QueryClientProvider>
  )
}
