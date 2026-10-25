import { useId, useState, type Ref } from 'react'
import { useFocusOnChange } from '../hooks/useFocusOnChange'
import { useHotkey } from '../hooks/useHotkey'
import type { AnswerOption, AttemptQuestion, AnswerFeedback, QuizMode } from '../types/quiz'
import AnswerContent from './AnswerContent'
import AuthoredBadge from './AuthoredBadge'
import Button from './Button'
import CodeBlock from './CodeBlock'
import ImageZoom from './ImageZoom'
import ShortcutHint from './ShortcutHint'

interface QuestionViewProps {
  question: AttemptQuestion
  total: number
  mode: QuizMode
  /** Lượt làm đã kết thúc (thi thử đã nộp / hết giờ): chỉ xem, không chọn được. */
  locked: boolean
  /** Luyện tập: đang chờ server kiểm tra câu này. */
  checking: boolean
  onChoose: (answerId: number) => void
  /** Để trang chuyển focus tới tiêu đề câu khi người dùng chuyển câu. */
  headingRef?: Ref<HTMLHeadingElement>
}

/**
 * Một câu hỏi và các phương án. Thi thử: chọn là lưu ngay, đổi được; nộp xong thì xem lại đúng/sai từng câu.
 * Luyện tập: chọn rồi bấm "Kiểm tra" (để lỡ tay, hoặc dùng phím mũi tên đi qua các phương án, không bị khoá
 * đáp án); sau đó hiện đúng/sai.
 */
export default function QuestionView({ question, total, mode, locked, checking, onChoose, headingRef }: QuestionViewProps) {
  const [picked, setPicked] = useState<number | null>(question.selectedAnswerId)
  const feedback = question.feedback
  const isPractice = mode === 'PRACTICE'
  // Có feedback nghĩa là server cho xem đáp án: câu luyện tập đã kiểm tra, hoặc bài thi đã kết thúc.
  const revealed = feedback !== null
  const practiceChecked = isPractice && revealed
  const disabled = locked || revealed || checking
  const checkedId = isPractice && !revealed ? picked : question.selectedAnswerId
  // Nút "Kiểm tra" biến mất khi có kết quả: đưa focus tới kết quả để người dùng bàn phím / trình đọc màn hình
  // nghe được ngay đúng hay sai (không áp dụng khi mở lại câu đã kiểm tra từ trước). Thi thử vừa nộp thì trang
  // đưa focus tới thẻ kết quả, không phải tới từng câu.
  const feedbackRef = useFocusOnChange<HTMLDivElement>(practiceChecked)
  const canCheck = isPractice && !revealed && !locked
  const check = () => {
    if (picked !== null) onChoose(picked)
  }
  // Enter = bấm "Kiểm tra" (song song với bấm chuột).
  useHotkey('Enter', check, canCheck && !checking)

  const select = (answerId: number) => {
    if (isPractice) {
      setPicked(answerId)
    } else {
      onChoose(answerId)
    }
  }

  return (
    <article className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <h2 ref={headingRef} tabIndex={-1} className="text-sm font-semibold text-primary focus:outline-none">
          Câu {question.order}/{total}
        </h2>
        {question.authored && <AuthoredBadge />}
        {question.sectionTitle && (
          <span className="rounded-full border border-line bg-canvas px-2.5 py-0.5 text-xs text-muted">
            {question.sectionTitle}
          </span>
        )}
      </div>
      <p className="text-base whitespace-pre-line sm:text-lg">{question.content}</p>
      {question.codeSnippet && <CodeBlock code={question.codeSnippet} />}

      <fieldset>
        <legend className="sr-only">Chọn một đáp án</legend>
        {/* Phương án là hình: điện thoại một cột cho đủ to để đọc trục, màn hình rộng hơn xếp 2 cột để so nhanh. */}
        <div className={hasImageAnswers(question.answers) ? 'grid gap-2 sm:grid-cols-2' : 'space-y-2'}>
          {question.answers.map((answer, index) => (
            <AnswerChoice
              key={answer.id}
              name={`question-${question.questionId}`}
              answer={answer}
              letter={letterOf(index)}
              checked={checkedId === answer.id}
              disabled={disabled}
              feedback={feedback}
              selectedAnswerId={question.selectedAnswerId}
              onSelect={select}
            />
          ))}
        </div>
      </fieldset>

      {canCheck && (
        <ShortcutHint keys="Enter">
          <Button onClick={check} disabled={picked === null || checking} aria-keyshortcuts="Enter">
            {checking ? 'Đang kiểm tra…' : 'Kiểm tra'}
          </Button>
        </ShortcutHint>
      )}
      {revealed && (
        <FeedbackMessage
          feedback={feedback}
          answers={question.answers}
          skipped={question.selectedAnswerId === null}
          containerRef={feedbackRef}
        />
      )}
    </article>
  )
}

interface AnswerChoiceProps {
  name: string
  answer: AnswerOption
  letter: string
  checked: boolean
  disabled: boolean
  /** Có khi được xem đáp án (luyện tập đã kiểm tra, thi thử đã nộp): tô đáp án đúng và lựa chọn sai. */
  feedback: AnswerFeedback | null
  selectedAnswerId: number | null
  onSelect: (answerId: number) => void
}

function AnswerChoice({ name, answer, letter, checked, disabled, feedback, selectedAnswerId, onSelect }: AnswerChoiceProps) {
  const isCorrectAnswer = feedback !== null && feedback.correctAnswerId === answer.id
  const isWrongChoice = feedback !== null && !feedback.correct && selectedAnswerId === answer.id

  let tone = 'border-line bg-surface'
  if (isCorrectAnswer) tone = 'border-success bg-success-soft'
  else if (isWrongChoice) tone = 'border-danger bg-danger-soft'
  else if (checked) tone = 'border-primary bg-primary-soft'

  const cursor = disabled ? 'cursor-default' : 'cursor-pointer hover:border-primary'
  // mt-1 chỉ dùng khi đứng cạnh chữ (canh với dòng chữ đầu); cạnh chữ cái của phương án hình thì canh giữa.
  const radio = (alignClass: string) => (
    <input
      type="radio"
      name={name}
      value={answer.id}
      checked={checked}
      disabled={disabled}
      onChange={() => onSelect(answer.id)}
      className={`size-4 shrink-0 accent-primary ${alignClass}`}
    />
  )
  // Trên màn hình chỉ tô màu (xanh: đáp án đúng, đỏ: lựa chọn sai), không thêm chữ theo ý chủ dự án;
  // chữ ẩn giữ lại cho trình đọc màn hình, vì người không nhìn thấy màu cần biết phương án nào đúng / sai.
  const verdict = (
    <>
      {isCorrectAnswer && <span className="sr-only"> (đáp án đúng)</span>}
      {isWrongChoice && <span className="sr-only"> (bạn chọn, sai)</span>}
    </>
  )

  if (answer.imageUrl !== null) {
    // Nút phóng to đặt ngoài <label> (không lồng nút trong label), để bấm phóng to không chọn luôn phương án.
    return (
      <div className="relative">
        <label className={`flex h-full flex-col gap-2 rounded-lg border p-3 ${tone} ${cursor}`}>
          <span className="flex min-h-11 items-center gap-3">
            {radio('')}
            <span className="font-semibold">{letter}.</span>
          </span>
          <img src={answer.imageUrl} alt={answer.content} loading="lazy" className="h-auto w-full rounded-md border border-line" />
          {verdict}
        </label>
        <ImageZoom src={answer.imageUrl} alt={answer.content} label={`phương án ${letter}`} className="absolute top-3 right-3" />
      </div>
    )
  }

  return (
    <label className={`flex min-h-11 items-start gap-3 rounded-lg border px-4 py-3 ${tone} ${cursor}`}>
      {radio('mt-1')}
      <span className="shrink-0 font-semibold">{letter}.</span>
      <AnswerContent content={answer.content} blanks={answer.blanks} />
      {verdict}
    </label>
  )
}

function hasImageAnswers(answers: AnswerOption[]): boolean {
  return answers.some((answer) => answer.imageUrl !== null)
}

interface FeedbackMessageProps {
  feedback: AnswerFeedback
  answers: AnswerOption[]
  /** Thi thử đã nộp mà câu này bỏ trống. */
  skipped: boolean
  containerRef: Ref<HTMLDivElement>
}

const FEEDBACK_TONE = {
  correct: { box: 'border-success bg-success-soft', text: 'text-success', title: '✓ Chính xác!' },
  wrong: { box: 'border-danger bg-danger-soft', text: 'text-danger', title: '✗ Chưa đúng.' },
  skipped: { box: 'border-warning bg-warning-soft', text: 'text-warning', title: '– Bạn bỏ trống câu này.' },
} as const

function FeedbackMessage({ feedback, answers, skipped, containerRef }: FeedbackMessageProps) {
  const headingId = useId()
  const correctIndex = answers.findIndex((answer) => answer.id === feedback.correctAnswerId)
  const tone = FEEDBACK_TONE[feedback.correct ? 'correct' : skipped ? 'skipped' : 'wrong']

  return (
    <div
      ref={containerRef}
      tabIndex={-1}
      role="status"
      aria-labelledby={headingId}
      className={`rounded-lg border p-4 focus:outline-none ${tone.box}`}
    >
      <p id={headingId} className={`font-semibold ${tone.text}`}>
        {tone.title}
        {!feedback.correct && correctIndex !== -1 && ` Đáp án đúng là ${letterOf(correctIndex)}.`}
      </p>
      {feedback.explanation && <p className="mt-2 text-sm whitespace-pre-line">{feedback.explanation}</p>}
    </div>
  )
}

/** Nhãn A, B, C… theo vị trí hiển thị (phương án đã được xáo cho lượt làm này). */
function letterOf(index: number): string {
  return String.fromCharCode(65 + index)
}
