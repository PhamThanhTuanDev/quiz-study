import { useCallback, useId } from 'react'
import { Link, useParams } from 'react-router'
import AsyncContent from '../components/AsyncContent'
import EmptyState from '../components/EmptyState'
import { useAsync } from '../hooks/useAsync'
import { getSubject } from '../services/subjectService'
import type { SubjectDetail } from '../types/subject'
import NotFoundPage from './NotFoundPage'

export default function SubjectPage() {
  const { slug = '' } = useParams()
  // useCallback giữ hàm ổn định giữa các lần render; chỉ đổi khi sang môn khác (yêu cầu của useAsync).
  const load = useCallback((signal: AbortSignal) => getSubject(slug, signal), [slug])
  const { state, reload } = useAsync(load)

  // Môn không tồn tại: thử lại cũng vô ích, nên hiện trang "không tìm thấy" thay vì nút "Thử lại".
  if (state.kind === 'error' && state.status === 404) {
    return <NotFoundPage title="Không tìm thấy môn học" message={state.message} />
  }

  return (
    <AsyncContent state={state} onRetry={reload} loadingMessage="Đang tải môn học…" errorTitle="Không tải được môn học">
      {(subject) => <SubjectDetails subject={subject} />}
    </AsyncContent>
  )
}

function SubjectDetails({ subject }: { subject: SubjectDetail }) {
  const chaptersHeadingId = useId()

  return (
    <div className="space-y-6">
      <title>{`${subject.name} · Quiz Study`}</title>
      <Link to="/" className="inline-flex min-h-11 items-center text-sm font-medium text-primary hover:underline">
        ← Tất cả môn học
      </Link>

      <div>
        <h1 className="text-2xl font-bold sm:text-3xl">{subject.name}</h1>
        <p className="mt-2 text-muted">
          {subject.chapters.length} bài · {subject.questionCount} câu hỏi
        </p>
        {subject.description && <p className="mt-3">{subject.description}</p>}
      </div>

      <section aria-labelledby={chaptersHeadingId}>
        <h2 id={chaptersHeadingId} className="text-lg font-semibold">
          Các bài
        </h2>
        {subject.chapters.length === 0 ? (
          <div className="mt-3">
            <EmptyState title="Môn này chưa có bài nào" />
          </div>
        ) : (
          <ol className="mt-3 divide-y divide-line overflow-hidden rounded-xl border border-line bg-surface">
            {subject.chapters.map((chapter) => (
              <li key={chapter.id} className="flex items-start justify-between gap-4 p-4">
                <div>
                  {chapter.code && <p className="text-sm font-semibold text-primary">{chapter.code}</p>}
                  <p>{chapter.title}</p>
                </div>
                <p className="shrink-0 text-sm text-muted">{chapter.questionCount} câu</p>
              </li>
            ))}
          </ol>
        )}
      </section>
    </div>
  )
}
