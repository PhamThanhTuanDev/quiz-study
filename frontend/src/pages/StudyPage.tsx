import { type Ref, useCallback, useId, useRef } from 'react'
import { Link, useParams } from 'react-router'
import AnswerContent from '../components/AnswerContent'
import AsyncContent from '../components/AsyncContent'
import CodeBlock from '../components/CodeBlock'
import EmptyState from '../components/EmptyState'
import QuestionNavigator from '../components/QuestionNavigator'
import { scrollBehavior } from '../components/scrollBehavior'
import { useActiveIndex } from '../hooks/useActiveIndex'
import { useAsync } from '../hooks/useAsync'
import { getStudyChapter } from '../services/studyService'
import type { StudyAnswer, StudyChapter, StudyQuestion } from '../types/study'
import NotFoundPage from './NotFoundPage'

/**
 * Chế độ "Học" (D-044): đọc lần lượt mọi câu của một bài, đáp án đúng tô sẵn màu xanh; không chọn, không chấm.
 * Hiện cả bài trên một trang để cuộn đọc liền mạch (trên điện thoại cũng vậy).
 */
export default function StudyPage() {
  const { slug = '', chapterId = '' } = useParams()
  const load = useCallback((signal: AbortSignal) => getStudyChapter(slug, chapterId, signal), [slug, chapterId])
  const { state, reload } = useAsync(load)

  if (state.kind === 'error' && state.status === 404) {
    return <NotFoundPage title="Không tìm thấy bài học" message={state.message} />
  }

  return (
    <AsyncContent state={state} onRetry={reload} loadingMessage="Đang tải bài học…" errorTitle="Không tải được bài học">
      {(chapter) => <StudyContent chapter={chapter} />}
    </AsyncContent>
  )
}

function StudyContent({ chapter }: { chapter: StudyChapter }) {
  const total = chapter.questions.length
  const cardRefs = useRef<(HTMLElement | null)[]>([])
  const { activeIndex, setActiveIndex } = useActiveIndex(cardRefs, total)

  // Bấm số câu ở lưới (D-051): cuộn tới câu đó và chuyển focus vào câu, để người dùng bàn phím đọc tiếp từ đó.
  const goTo = (index: number) => {
    const card = cardRefs.current[index]
    if (!card) return
    setActiveIndex(index)
    card.scrollIntoView?.({ behavior: scrollBehavior(), block: 'start' })
    card.focus({ preventScroll: true })
  }

  return (
    <div className="space-y-6">
      <title>{`Học: ${chapter.chapterTitle} · Quiz Study`}</title>
      <Link
        to={`/subjects/${chapter.subjectSlug}`}
        className="inline-flex min-h-11 items-center text-sm font-medium text-primary hover:underline"
      >
        ← {chapter.subjectName}
      </Link>

      <header>
        <p className="text-sm font-semibold text-primary">Học{chapter.chapterCode && ` · ${chapter.chapterCode}`}</p>
        <h1 className="text-2xl font-bold sm:text-3xl">{chapter.chapterTitle}</h1>
        <p className="mt-1 text-muted">{total} câu · đáp án đúng được tô xanh</p>
      </header>

      {total === 0 ? (
        <EmptyState title="Bài này chưa có câu hỏi nào" />
      ) : (
        // Điện thoại: lưới số câu nằm trên danh sách. Màn hình lớn: lưới ở cột phải, dính theo khi cuộn.
        <div className="space-y-6 lg:grid lg:grid-cols-[minmax(0,1fr)_15rem] lg:items-start lg:gap-8 lg:space-y-0">
          <aside
            aria-label="Các câu hỏi"
            className="lg:sticky lg:top-6 lg:col-start-2 lg:row-start-1 lg:max-h-[calc(100dvh-3rem)] lg:overflow-y-auto lg:p-1"
          >
            <QuestionNavigator questions={chapter.questions} currentIndex={activeIndex} onSelect={goTo} showState={false} />
          </aside>

          <ol className="space-y-4 lg:col-start-1 lg:row-start-1">
            {chapter.questions.map((question, index) => (
              <li key={question.questionId}>
                <StudyQuestionCard
                  ref={(element) => {
                    cardRefs.current[index] = element
                  }}
                  question={question}
                  total={total}
                />
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  )
}

interface StudyQuestionCardProps {
  question: StudyQuestion
  total: number
  ref: Ref<HTMLElement>
}

function StudyQuestionCard({ question, total, ref }: StudyQuestionCardProps) {
  const headingId = useId()
  return (
    // tabIndex={-1}: nhận focus khi được chọn từ lưới số câu. scroll-mt: chừa khoảng trống phía trên khi cuộn tới.
    <article
      ref={ref}
      aria-labelledby={headingId}
      tabIndex={-1}
      className="scroll-mt-4 space-y-4 rounded-xl border border-line bg-surface p-4 shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-primary sm:p-6"
    >
      <h2 id={headingId} className="text-sm font-semibold text-primary">
        Câu {question.order}/{total}
      </h2>
      <p className="text-base whitespace-pre-line sm:text-lg">{question.content}</p>
      {question.codeSnippet && <CodeBlock code={question.codeSnippet} />}
      <ul className="space-y-2" aria-label="Các phương án">
        {question.answers.map((answer, index) => (
          <StudyAnswerRow key={answer.id} answer={answer} letter={String.fromCharCode(65 + index)} />
        ))}
      </ul>
      {question.explanation && (
        <p className="rounded-lg border border-line bg-canvas p-3 text-sm whitespace-pre-line">{question.explanation}</p>
      )}
    </article>
  )
}

function StudyAnswerRow({ answer, letter }: { answer: StudyAnswer; letter: string }) {
  // Trên màn hình chỉ tô xanh đáp án đúng; chữ ẩn cho trình đọc màn hình (người không nhìn thấy màu).
  const tone = answer.correct ? 'border-success bg-success-soft' : 'border-line bg-surface'
  return (
    <li className={`flex min-h-11 items-start gap-3 rounded-lg border px-4 py-3 ${tone}`}>
      <span className="shrink-0 font-semibold">{letter}.</span>
      <AnswerContent content={answer.content} blanks={answer.blanks} />
      {answer.correct && <span className="sr-only"> (đáp án đúng)</span>}
    </li>
  )
}
