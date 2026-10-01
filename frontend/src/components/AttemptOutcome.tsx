import type { AttemptStatus, ExamResult } from '../types/quiz'
import Button from './Button'
import ButtonLink from './ButtonLink'
import Card from './Card'

const SCORE_FORMAT = new Intl.NumberFormat('vi-VN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

interface RestartProps {
  subjectSlug: string
  onRestart: () => void
  restarting: boolean
}

interface ExamOutcomeProps extends RestartProps {
  result: ExamResult
  status: AttemptStatus
}

/** Kết quả thi thử sau khi nộp / hết giờ (D-037: thang 10). Xem lại từng câu để Phase 6. */
export function ExamOutcome({ result, status, subjectSlug, onRestart, restarting }: ExamOutcomeProps) {
  return (
    <Card title="Kết quả">
      <p className="text-3xl font-bold text-primary sm:text-4xl">
        {SCORE_FORMAT.format(result.score)}
        <span className="text-lg font-semibold text-muted"> / 10 điểm</span>
      </p>
      <p className="mt-2">
        Đúng {result.correctCount}/{result.totalQuestions} câu.
      </p>
      {status === 'EXPIRED' && (
        <p className="mt-2 text-sm text-warning">Đã hết giờ: bài được chấm với các câu đã lưu trước khi hết giờ.</p>
      )}
      <RestartActions
        restartLabel="Làm lại"
        backLabel="Về trang môn"
        subjectSlug={subjectSlug}
        onRestart={onRestart}
        restarting={restarting}
      />
    </Card>
  )
}

interface PracticeOutcomeProps extends RestartProps {
  questionCount: number
}

/** Luyện tập làm hết câu của lượt: không chấm điểm (D-037), chỉ gợi ý luyện tiếp. */
export function PracticeOutcome({ questionCount, subjectSlug, onRestart, restarting }: PracticeOutcomeProps) {
  return (
    <Card title="Đã làm hết lượt này">
      <p>Bạn đã trả lời cả {questionCount} câu. Luyện tiếp để làm một lượt câu hỏi mới của bài này.</p>
      <RestartActions
        restartLabel="Luyện tiếp"
        backLabel="Chọn bài khác"
        subjectSlug={subjectSlug}
        onRestart={onRestart}
        restarting={restarting}
      />
    </Card>
  )
}

interface RestartActionsProps extends RestartProps {
  restartLabel: string
  backLabel: string
}

function RestartActions({ restartLabel, backLabel, subjectSlug, onRestart, restarting }: RestartActionsProps) {
  return (
    <div className="mt-4 flex flex-wrap gap-3">
      <Button onClick={onRestart} disabled={restarting}>
        {restarting ? 'Đang tạo lượt mới…' : restartLabel}
      </Button>
      <ButtonLink to={`/subjects/${subjectSlug}`} variant="secondary">
        {backLabel}
      </ButtonLink>
    </div>
  )
}
