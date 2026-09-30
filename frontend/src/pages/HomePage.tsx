import AsyncContent from '../components/AsyncContent'
import Card from '../components/Card'
import { useAsync } from '../hooks/useAsync'
import { getHealth } from '../services/healthService'
import type { HealthStatus } from '../types/health'

export default function HomePage() {
  const { state, reload } = useAsync(getHealth)

  return (
    <div className="space-y-6">
      <title>Quiz Study</title>
      <div>
        <h1 className="text-2xl font-bold sm:text-3xl">Quiz Study</h1>
        <p className="mt-2 text-muted">Học tập và luyện thi trắc nghiệm nhiều môn.</p>
      </div>

      <Card title="Trạng thái hệ thống">
        <AsyncContent
          state={state}
          onRetry={reload}
          loadingMessage="Đang kiểm tra kết nối backend…"
          errorTitle="Không kiểm tra được trạng thái hệ thống"
        >
          {(health) => (
            <ul className="space-y-2">
              <StatusRow label="Backend" status={health.status} />
              <StatusRow label="Database" status={health.database} />
            </ul>
          )}
        </AsyncContent>
      </Card>
    </div>
  )
}

function StatusRow({ label, status }: { label: string; status: HealthStatus }) {
  const isUp = status === 'UP'
  return (
    <li className="flex items-center gap-2">
      <span aria-hidden="true" className={`size-2.5 rounded-full ${isUp ? 'bg-success' : 'bg-danger'}`} />
      {label}: {isUp ? 'hoạt động' : 'không hoạt động'}
    </li>
  )
}
