import { Link } from 'react-router'
import type { RecentAttempt } from '../services/recentAttempts'
import Button from './Button'
import Card from './Card'

const DATE_FORMAT = new Intl.DateTimeFormat('vi-VN', { dateStyle: 'short', timeStyle: 'short' })
const SCORE_FORMAT = new Intl.NumberFormat('vi-VN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

interface RecentAttemptListProps {
  attempts: RecentAttempt[]
  onClear: () => void
}

/** "Lượt làm gần đây" trên trình duyệt này: bấm để làm tiếp hoặc xem lại (D-038). */
export default function RecentAttemptList({ attempts, onClear }: RecentAttemptListProps) {
  return (
    <Card title="Lượt làm gần đây">
      <p className="text-sm text-muted">Chỉ lưu trên trình duyệt này.</p>
      <ul className="mt-3 divide-y divide-line">
        {attempts.map((attempt) => (
          <li key={attempt.id}>
            <Link
              to={`/attempts/${encodeURIComponent(attempt.id)}`}
              className="flex min-h-11 flex-wrap items-center justify-between gap-x-4 gap-y-1 py-3 hover:text-primary"
            >
              <span className="min-w-0">
                <span className="block font-medium">{attempt.quizTitle}</span>
                <span className="block text-sm text-muted">
                  {attempt.subjectName} · {DATE_FORMAT.format(new Date(attempt.startedAt))}
                </span>
              </span>
              <span className="shrink-0 text-sm font-semibold">{statusText(attempt)}</span>
            </Link>
          </li>
        ))}
      </ul>
      <Button variant="ghost" className="mt-2" onClick={onClear}>
        Xoá danh sách
      </Button>
    </Card>
  )
}

function statusText(attempt: RecentAttempt): string {
  if (attempt.status === 'IN_PROGRESS') {
    return attempt.mode === 'EXAM' ? 'Đang làm' : 'Luyện tập'
  }
  const score = attempt.score === null ? '' : `${SCORE_FORMAT.format(attempt.score)} điểm`
  return attempt.status === 'EXPIRED' ? `Hết giờ · ${score}` : score
}
