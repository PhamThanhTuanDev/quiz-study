import { useEffect, useState } from 'react'
import { getHealth } from '../services/healthService'
import type { HealthResponse } from '../types/health'

export type HealthState =
  | { kind: 'loading' }
  | { kind: 'success'; data: HealthResponse }
  | { kind: 'error'; message: string }

/** Gọi health check của backend một lần khi component được mount. */
export function useHealth(): HealthState {
  const [state, setState] = useState<HealthState>({ kind: 'loading' })

  useEffect(() => {
    const controller = new AbortController()
    getHealth(controller.signal)
      .then((data) => setState({ kind: 'success', data }))
      .catch((error: unknown) => {
        if (controller.signal.aborted) return
        const message = error instanceof Error ? error.message : 'Lỗi không xác định'
        setState({ kind: 'error', message })
      })
    return () => controller.abort()
  }, [])

  return state
}
