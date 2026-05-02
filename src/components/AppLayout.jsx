import { useState } from 'react'
import { Menu, Search, Stethoscope, Users, X } from 'lucide-react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'

const navigationItems = [
  { label: 'Patients', path: '/patients', icon: Users },
  { label: 'Doctors', path: '/doctors', icon: Stethoscope },
  { label: 'Search', path: '/search', icon: Search },
]

const routeTitles = [
  { matcher: /^\/patients\/[^/]+$/, title: 'Patient Detail' },
  { matcher: /^\/patients$/, title: 'Patients' },
  { matcher: /^\/doctors$/, title: 'Doctors' },
  { matcher: /^\/search$/, title: 'Search' },
  { matcher: /^\/sessions\/new$/, title: 'New Session' },
  { matcher: /^\/sessions\/edit\/[^/]+$/, title: 'Edit Session' },
]

function AppLayout() {
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)
  const location = useLocation()
  const pageTitle =
    routeTitles.find((route) => route.matcher.test(location.pathname))?.title ||
    'DentaRecord'

  const closeMobileSidebar = () => setMobileSidebarOpen(false)

  return (
    <div className="min-h-screen bg-slate-50 text-slate-950">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-60 flex-col bg-slate-950 text-white md:flex">
        <SidebarContent onNavigate={closeMobileSidebar} />
      </aside>

      {mobileSidebarOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-slate-950/60"
            onClick={closeMobileSidebar}
            aria-label="Close sidebar backdrop"
          />
          <aside className="absolute inset-y-0 left-0 flex w-60 flex-col bg-slate-950 text-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
              <Logo />
              <button
                type="button"
                onClick={closeMobileSidebar}
                className="rounded-md p-2 text-slate-300 transition hover:bg-white/10 hover:text-white focus:outline-none focus:ring-2 focus:ring-teal-400"
                aria-label="Close sidebar"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <SidebarNav onNavigate={closeMobileSidebar} />
          </aside>
        </div>
      )}

      <div className="md:pl-60">
        <header className="fixed left-0 right-0 top-0 z-30 flex h-16 items-center justify-between border-b border-slate-200 bg-white px-4 shadow-sm md:left-60 md:px-6">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileSidebarOpen(true)}
              className="rounded-md p-2 text-slate-600 transition hover:bg-slate-100 hover:text-slate-950 focus:outline-none focus:ring-2 focus:ring-teal-500 md:hidden"
              aria-label="Open sidebar"
            >
              <Menu className="h-5 w-5" />
            </button>
            <h1 className="text-lg font-semibold tracking-normal text-slate-950">
              {pageTitle}
            </h1>
          </div>
        </header>

        <main className="h-screen overflow-y-auto pt-16">
          <div className="p-6">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}

function SidebarContent({ onNavigate }) {
  return (
    <>
      <div className="border-b border-white/10 px-5 py-5">
        <Logo />
      </div>
      <SidebarNav onNavigate={onNavigate} />
    </>
  )
}

function Logo() {
  return <div className="text-lg font-bold tracking-normal">🦷 DentaRecord</div>
}

function SidebarNav({ onNavigate }) {
  return (
    <nav className="flex-1 space-y-1 px-3 py-4">
      {navigationItems.map((item) => {
        const Icon = item.icon

        return (
          <NavLink
            key={item.path}
            to={item.path}
            onClick={onNavigate}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition ${
                isActive
                  ? 'bg-teal-600 text-white shadow-sm'
                  : 'text-slate-300 hover:bg-white/10 hover:text-white'
              }`
            }
          >
            <Icon className="h-5 w-5" />
            {item.label}
          </NavLink>
        )
      })}
    </nav>
  )
}

export default AppLayout
