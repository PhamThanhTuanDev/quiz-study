import type { Attempt, AttemptStatus, QuizMode } from '../types/quiz'

/**
 * Các lượt làm gần đây **trên trình duyệt này** (D-038): giúp khách (chưa đăng nhập) quay lại bài đang làm dở
 * hoặc xem lại bài đã nộp. Chỉ lưu mã lượt làm và vài thông tin để hiển thị, trong localStorage; không gửi đi đâu.
 * Lịch sử theo tài khoản làm sau khi có đăng nhập (Phase 7).
 */
export interface RecentAttempt {
  id: string
  quizTitle: string
  subjectName: string
  mode: QuizMode
  status: AttemptStatus
  startedAt: string
  /** Điểm thi thử (thang 10) khi đã nộp / hết giờ; null nếu chưa có. */
  score: number | null
}

const STORAGE_KEY = 'quiz-study.recent-attempts'
export const MAX_RECENT_ATTEMPTS = 10

/** Mới bắt đầu trước. Trả danh sách rỗng nếu chưa có, dữ liệu hỏng, hoặc trình duyệt chặn lưu trữ. */
export function getRecentAttempts(): RecentAttempt[] {
  const raw = readStorage()
  if (raw === null) return []
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    return [] // dữ liệu hỏng (ví dụ bị sửa tay): coi như chưa có, lần ghi sau sẽ ghi đè
  }
  return Array.isArray(parsed) ? parsed.filter(isRecentAttempt) : []
}

/** Thêm hoặc cập nhật một lượt làm (ví dụ vừa nộp thì có điểm), giữ tối đa {@link MAX_RECENT_ATTEMPTS} lượt. */
export function rememberAttempt(attempt: Attempt): void {
  const entry: RecentAttempt = {
    id: attempt.id,
    quizTitle: attempt.quizTitle,
    subjectName: attempt.subjectName,
    mode: attempt.mode,
    status: attempt.status,
    startedAt: attempt.startedAt,
    score: attempt.result?.score ?? null,
  }
  const others = getRecentAttempts().filter((recent) => recent.id !== attempt.id)
  const list = [entry, ...others]
    .sort((a, b) => b.startedAt.localeCompare(a.startedAt))
    .slice(0, MAX_RECENT_ATTEMPTS)
  writeStorage(JSON.stringify(list))
}

export function clearRecentAttempts(): void {
  try {
    window.localStorage.removeItem(STORAGE_KEY)
  } catch {
    // Trình duyệt chặn lưu trữ: không có gì để xoá.
  }
}

// Truy cập localStorage có thể ném lỗi (chế độ riêng tư, trình duyệt chặn cookie và dữ liệu trang).
// Tính năng này chỉ là tiện ích, nên khi không lưu được thì bỏ qua, không làm hỏng trang.
function readStorage(): string | null {
  try {
    return window.localStorage.getItem(STORAGE_KEY)
  } catch {
    return null
  }
}

function writeStorage(value: string): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, value)
  } catch {
    // Không lưu được (bị chặn hoặc hết dung lượng): bỏ qua, xem giải thích ở trên.
  }
}

const MODES: readonly string[] = ['PRACTICE', 'EXAM'] satisfies QuizMode[]
const STATUSES: readonly string[] = ['IN_PROGRESS', 'SUBMITTED', 'EXPIRED'] satisfies AttemptStatus[]

/** Dữ liệu đọc từ localStorage có thể đã cũ hoặc bị sửa: chỉ giữ mục đúng dạng. */
function isRecentAttempt(value: unknown): value is RecentAttempt {
  if (typeof value !== 'object' || value === null) return false
  const item = value as Record<string, unknown>
  return (
    typeof item.id === 'string' &&
    typeof item.quizTitle === 'string' &&
    typeof item.subjectName === 'string' &&
    typeof item.mode === 'string' &&
    MODES.includes(item.mode) &&
    typeof item.status === 'string' &&
    STATUSES.includes(item.status) &&
    typeof item.startedAt === 'string' &&
    (item.score === null || typeof item.score === 'number')
  )
}
