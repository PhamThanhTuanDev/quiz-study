import { useState } from 'react'
import { Link } from 'react-router'
import AsyncContent from '../components/AsyncContent'
import EmptyState from '../components/EmptyState'
import RecentAttemptList from '../components/RecentAttemptList'
import { useAsync } from '../hooks/useAsync'
import { clearRecentAttempts, getRecentAttempts } from '../services/recentAttempts'
import { getSubjects } from '../services/subjectService'
import type { SubjectSummary } from '../types/subject'

export default function HomePage() {
  const { state, reload } = useAsync(getSubjects)
  const [recentAttempts, setRecentAttempts] = useState(getRecentAttempts)

  const clearRecent = () => {
    clearRecentAttempts()
    setRecentAttempts([])
  }

  return (
    <div className="space-y-6">
      <title>Quiz Study</title>
      <div>
        <h1 className="text-2xl font-bold sm:text-3xl">Môn học</h1>
        <p className="mt-2 text-muted">Chọn một môn để xem các bài.</p>
      </div>

      <AsyncContent
        state={state}
        onRetry={reload}
        loadingMessage="Đang tải danh sách môn…"
        errorTitle="Không tải được danh sách môn"
      >
        {(subjects) =>
          subjects.length === 0 ? (
            <EmptyState title="Chưa có môn học nào" description="Môn học sẽ xuất hiện ở đây khi được thêm." />
          ) : (
            <ul className="grid gap-3 sm:grid-cols-2">
              {subjects.map((subject) => (
                <li key={subject.slug}>
                  <SubjectCard subject={subject} />
                </li>
              ))}
            </ul>
          )
        }
      </AsyncContent>

      {recentAttempts.length > 0 && <RecentAttemptList attempts={recentAttempts} onClear={clearRecent} />}
    </div>
  )
}

function SubjectCard({ subject }: { subject: SubjectSummary }) {
  return (
    <Link
      to={`/subjects/${encodeURIComponent(subject.slug)}`}
      className="block h-full rounded-xl border border-line bg-surface p-4 shadow-sm transition-colors hover:border-primary sm:p-5"
    >
      <h2 className="font-semibold sm:text-lg">{subject.name}</h2>
      {subject.code && <p className="text-sm text-muted">{subject.code}</p>}
      <p className="mt-3 text-sm text-muted">
        {subject.chapterCount} bài · {subject.questionCount} câu hỏi
      </p>
    </Link>
  )
}
