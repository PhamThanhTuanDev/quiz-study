import type { AttemptQuestion } from '../types/quiz'

/**
 * Câu cần cho lưới số: trang làm bài truyền cả lựa chọn và kết quả để tô màu trạng thái;
 * trang Học (D-051) chỉ có số câu nên mọi ô hiện như "chưa trả lời".
 */
export type NavigatorQuestion = Pick<AttemptQuestion, 'questionId' | 'order'> &
  Partial<Pick<AttemptQuestion, 'selectedAnswerId' | 'feedback'>>

interface QuestionNavigatorProps {
  questions: NavigatorQuestion[]
  currentIndex: number
  onSelect: (index: number) => void
  /** false: chỉ đọc số câu cho trình đọc màn hình, không kèm "chưa trả lời" (trang Học không có trả lời). */
  showState?: boolean
}

type QuestionState = 'unanswered' | 'answered' | 'correct' | 'wrong' | 'skipped'

const STATE_LABEL: Record<QuestionState, string> = {
  unanswered: 'chưa trả lời',
  answered: 'đã trả lời',
  correct: 'đúng',
  wrong: 'sai',
  skipped: 'bỏ trống',
}

// Không chỉ dựa vào màu: câu đúng/sai/bỏ trống có thêm ký hiệu ✓ / ✗ / –, và tên đầy đủ cho trình đọc màn hình.
const STATE_STYLE: Record<QuestionState, string> = {
  unanswered: 'border-line-strong bg-surface text-ink',
  answered: 'border-primary bg-primary-soft text-primary',
  correct: 'border-success bg-success-soft text-success',
  wrong: 'border-danger bg-danger-soft text-danger',
  skipped: 'border-warning bg-warning-soft text-warning',
}

const STATE_MARK: Record<QuestionState, string> = { unanswered: '', answered: '', correct: '✓', wrong: '✗', skipped: '–' }

/** Lưới số câu: bấm để chuyển câu, thấy ngay câu nào đã làm (luyện tập, thi thử đã nộp: đúng / sai / bỏ trống). */
export default function QuestionNavigator({ questions, currentIndex, onSelect, showState = true }: QuestionNavigatorProps) {
  return (
    <nav aria-label="Danh sách câu hỏi">
      <ol className="grid grid-cols-[repeat(auto-fill,minmax(2.75rem,1fr))] gap-2">
        {questions.map((question, index) => {
          const state = stateOf(question)
          const current = index === currentIndex
          return (
            <li key={question.questionId}>
              <button
                type="button"
                onClick={() => onSelect(index)}
                aria-current={current ? 'step' : undefined}
                aria-label={showState ? `Câu ${question.order}, ${STATE_LABEL[state]}` : `Câu ${question.order}`}
                className={`flex size-11 items-center justify-center rounded-lg border text-sm font-semibold ${
                  STATE_STYLE[state]
                } ${current ? 'ring-2 ring-primary ring-offset-2' : ''}`}
              >
                {question.order}
                {STATE_MARK[state] && <span aria-hidden="true">{STATE_MARK[state]}</span>}
              </button>
            </li>
          )
        })}
      </ol>
    </nav>
  )
}

function stateOf(question: NavigatorQuestion): QuestionState {
  const answered = question.selectedAnswerId != null
  if (question.feedback) {
    if (question.feedback.correct) return 'correct'
    return answered ? 'wrong' : 'skipped'
  }
  return answered ? 'answered' : 'unanswered'
}
