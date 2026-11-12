import { useEffect, useState } from 'react'

/**
 * Delay propagating a rapidly changing value (such as a search field) so that
 * backend queries are only issued once the user pauses typing.
 */
export function useDebouncedValue<T>(value: T, delay = 300): T {
  const [debounced, setDebounced] = useState(value)

  useEffect(() => {
    const timeout = window.setTimeout(() => setDebounced(value), delay)
    return () => window.clearTimeout(timeout)
  }, [value, delay])

  return debounced
}
