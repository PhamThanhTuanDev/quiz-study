import { vi } from 'vitest'

/** Trả về dữ liệu (thành JSON 200) hoặc một Response tự dựng; nhận body JSON của request (nếu có). */
type Handler = (body: unknown) => Response | object

/**
 * Giả lập backend cho test: mỗi khoá dạng "METHOD /api/v1/đường-dẫn" trả về dữ liệu JSON (200),
 * một Response, hoặc một hàm. Gọi tới đường dẫn chưa khai báo thì trả lỗi 501 kèm tên đường dẫn,
 * để test thất bại với thông điệp dễ hiểu.
 */
export function mockApi(routes: Record<string, object | Handler>) {
  const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const key = `${init?.method ?? 'GET'} ${String(input)}`
    const route = routes[key]
    if (route === undefined) {
      return Response.json({ status: 501, detail: `Chưa giả lập API: ${key}` }, { status: 501 })
    }
    const reply = typeof route === 'function' ? route(parseBody(init)) : route
    // Response chỉ đọc được body một lần: trả bản sao để gọi nhiều lần vẫn được.
    return reply instanceof Response ? reply.clone() : Response.json(reply)
  })
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

function parseBody(init?: RequestInit): unknown {
  return typeof init?.body === 'string' ? JSON.parse(init.body) : undefined
}

/** Response lỗi theo chuẩn Problem Details, như backend trả. */
export function problem(status: number, detail: string): Response {
  return Response.json({ status, detail }, { status, headers: { 'Content-Type': 'application/problem+json' } })
}
