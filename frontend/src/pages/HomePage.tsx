import { useHealth, type HealthState } from '../hooks/useHealth'
import type { HealthStatus } from '../types/health'

export default function HomePage() {
  const health = useHealth()

  return (
    <section className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold sm:text-3xl">Quiz Study</h1>
        <p className="mt-2 text-slate-600">Nền tảng học tập và luyện thi trắc nghiệm nhiều môn.</p>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
        <h2 className="font-semibold">Trạng thái hệ thống</h2>
        <div role="status" className="mt-3 text-sm sm:text-base">
          <HealthDetails health={health} />
        </div>
      </div>
    </section>
  )
}

function HealthDetails({ health }: { health: HealthState }) {
  switch (health.kind) {
    case 'loading':
      return <p className="text-slate-500">Đang kiểm tra kết nối backend…</p>
    case 'error':
      return <p className="text-red-700">Không kết nối được backend: {health.message}</p>
    case 'success':
      return (
        <ul className="space-y-1">
          <li>Backend: {describe(health.data.status)}</li>
          <li>Database: {describe(health.data.database)}</li>
        </ul>
      )
  }
}

function describe(status: HealthStatus): string {
  return status === 'UP' ? 'hoạt động' : 'không hoạt động'
}
