import { useQuery } from '@tanstack/react-query'
import type { UseQueryOptions } from '@tanstack/react-query'

interface ResourceOptions<T> {
  queryKey: readonly unknown[]
  fetcher: () => Promise<T>
  fallback: T
  enabled?: boolean
  staleTime?: number
  refetchInterval?: number | false
}

/**
 * Thin wrapper around useQuery that guarantees renderable data by falling back
 * to curated demo data when the API is unreachable or returns an empty payload.
 * Real API data always takes precedence.
 */
export function useApiResource<T>({
  queryKey,
  fetcher,
  fallback,
  enabled = true,
  staleTime = 60_000,
  refetchInterval = false,
}: ResourceOptions<T>) {
  const query = useQuery<T, Error>({
    queryKey,
    queryFn: fetcher,
    enabled,
    retry: 0,
    staleTime,
    refetchInterval,
  } as UseQueryOptions<T, Error>)

  return {
    data: query.data ?? fallback,
    liveData: query.data,
    isLoading: query.isLoading,
    isError: query.isError,
    isFetching: query.isFetching,
    isFallback: query.data === undefined,
    refetch: query.refetch,
    error: query.error,
  }
}
