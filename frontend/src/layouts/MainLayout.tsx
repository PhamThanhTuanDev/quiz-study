import { Link, NavLink, Outlet } from 'react-router'
import LetterBadge from '../components/LetterBadge'
import { NAV_ITEMS } from './navigation'

const MAIN_CONTENT_ID = 'main-content'

export default function MainLayout() {
  return (
    <div className="flex min-h-dvh flex-col">
      {/* Ẩn cho tới khi được focus bằng phím Tab: giúp người dùng bàn phím nhảy thẳng vào nội dung. */}
      <a
        href={`#${MAIN_CONTENT_ID}`}
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:rounded-lg focus:bg-surface focus:px-4 focus:py-3 focus:shadow-md"
      >
        Bỏ qua điều hướng
      </a>

      <header className="border-b border-line bg-surface">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 sm:px-6">
          <Link to="/" className="flex min-h-14 items-center gap-2 text-lg font-bold">
            <LetterBadge letter="Q" />
            Quiz Study
          </Link>

          <nav aria-label="Điều hướng chính">
            <ul className="flex gap-1">
              {NAV_ITEMS.map((item) => (
                <li key={item.to}>
                  <NavLink
                    to={item.to}
                    end={item.end}
                    className={({ isActive }) =>
                      'inline-flex min-h-11 items-center rounded-lg px-3 text-sm font-medium ' +
                      (isActive ? 'bg-primary-soft text-primary' : 'text-muted hover:text-ink')
                    }
                  >
                    {item.label}
                  </NavLink>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      </header>

      {/* tabIndex={-1}: cho phép link "Bỏ qua điều hướng" chuyển focus vào đây. */}
      <main
        id={MAIN_CONTENT_ID}
        tabIndex={-1}
        className="mx-auto w-full max-w-5xl flex-1 px-4 py-6 focus:outline-none sm:px-6 sm:py-10"
      >
        <Outlet />
      </main>

      <footer className="border-t border-line">
        <p className="mx-auto max-w-5xl px-4 py-4 text-xs text-muted sm:px-6">Quiz Study</p>
      </footer>
    </div>
  )
}
