import { act, renderHook, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '../services/apiClient'
import { UNKNOWN_ERROR_MESSAGE, useAsync } from './useAsync'

afterEach(() => {
  vi.restoreAllMocks()
})

describe('useAsync', () => {
  it('starts in loading, then returns the data', async () => {
    const load = vi.fn(async () => 42)

    const { result } = renderHook(() => useAsync(load))

    expect(result.current.state).toEqual({ kind: 'loading' })
    await waitFor(() => expect(result.current.state).toEqual({ kind: 'success', data: 42 }))
  })

  it('shows the message of an ApiError, which is written for users', async () => {
    const load = vi.fn(async (): Promise<number> => {
      throw new ApiError(502, 'Máy chủ đang gặp sự cố.')
    })

    const { result } = renderHook(() => useAsync(load))

    await waitFor(() => expect(result.current.state).toEqual({ kind: 'error', message: 'Máy chủ đang gặp sự cố.' }))
  })

  it('hides technical messages of other errors and logs them for developers', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
    const bug = new TypeError("Cannot read properties of undefined (reading 'name')")
    const load = vi.fn(async (): Promise<number> => {
      throw bug
    })

    const { result } = renderHook(() => useAsync(load))

    await waitFor(() => expect(result.current.state).toEqual({ kind: 'error', message: UNKNOWN_ERROR_MESSAGE }))
    expect(consoleError).toHaveBeenCalledWith(bug)
  })

  it('shows loading again and calls the loader again when reload is called', async () => {
    const load = vi.fn<() => Promise<number>>().mockResolvedValueOnce(1).mockResolvedValueOnce(2)
    const { result } = renderHook(() => useAsync(load))
    await waitFor(() => expect(result.current.state).toEqual({ kind: 'success', data: 1 }))

    act(() => result.current.reload())

    expect(result.current.state).toEqual({ kind: 'loading' })
    await waitFor(() => expect(result.current.state).toEqual({ kind: 'success', data: 2 }))
    expect(load).toHaveBeenCalledTimes(2)
  })

  it('ignores an older request that finishes after a newer one', async () => {
    const resolvers: Array<(value: string) => void> = []
    const load = vi.fn(() => new Promise<string>((resolve) => resolvers.push(resolve)))
    const { result } = renderHook(() => useAsync(load))
    act(() => result.current.reload())
    expect(load).toHaveBeenCalledTimes(2)

    await act(async () => resolvers[1]('dữ liệu mới'))
    await act(async () => resolvers[0]('dữ liệu cũ'))

    expect(result.current.state).toEqual({ kind: 'success', data: 'dữ liệu mới' })
  })

  it('does not show old data after the loader changes', async () => {
    const first = vi.fn(async () => 'môn cũ')
    const second = vi.fn(() => new Promise<string>(() => {}))
    const { result, rerender } = renderHook(({ load }) => useAsync(load), { initialProps: { load: first } })
    await waitFor(() => expect(result.current.state).toEqual({ kind: 'success', data: 'môn cũ' }))

    rerender({ load: second })

    expect(result.current.state).toEqual({ kind: 'loading' })
  })

  it('aborts the request when the component goes away', () => {
    let receivedSignal: AbortSignal | undefined
    const load = vi.fn((signal: AbortSignal) => {
      receivedSignal = signal
      return new Promise<never>(() => {})
    })
    const { unmount } = renderHook(() => useAsync(load))

    unmount()

    expect(receivedSignal?.aborted).toBe(true)
  })
})
