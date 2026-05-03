import { useState } from 'react'
import {
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  Stethoscope,
  Users,
} from 'lucide-react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { CLINIC_NAME, CLINIC_SUBTITLE } from '../lib/config'

const navigationItems = [
  { label: 'Patients', path: '/patients', icon: Users },
  { label: 'Doctors', path: '/doctors', icon: Stethoscope },
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
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)
  const location = useLocation()
  const pageTitle =
    routeTitles.find((route) => route.matcher.test(location.pathname))?.title ||
    CLINIC_NAME

  const closeMobileSidebar = () => setMobileSidebarOpen(false)

  return (
    <div className="min-h-screen bg-slate-50 text-slate-950">
      <aside
        className={`fixed inset-y-0 left-0 z-40 hidden flex-col bg-slate-950 text-white transition-all duration-300 ease-in-out md:flex ${
          sidebarOpen ? 'w-60' : 'w-16'
        }`}
      >
        <SidebarContent
          expanded={sidebarOpen}
          onNavigate={closeMobileSidebar}
          onToggle={() => setSidebarOpen((current) => !current)}
        />
      </aside>

      <div
        className={`fixed inset-0 z-50 md:hidden ${
          mobileSidebarOpen ? 'pointer-events-auto' : 'pointer-events-none'
        }`}
        aria-hidden={!mobileSidebarOpen}
      >
        <button
          type="button"
          className={`absolute inset-0 bg-slate-950/60 transition-opacity duration-200 ${
            mobileSidebarOpen ? 'opacity-100' : 'opacity-0'
          }`}
          onClick={closeMobileSidebar}
          aria-label="Close sidebar backdrop"
        />
        <aside
          className={`absolute inset-y-0 left-0 flex w-60 flex-col bg-slate-950 text-white shadow-2xl transition-transform duration-200 ease-out ${
            mobileSidebarOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
            <Logo expanded />
            <button
              type="button"
              onClick={closeMobileSidebar}
              className="rounded-md p-2 text-slate-300 transition hover:bg-white/10 hover:text-white focus:outline-none focus:ring-2 focus:ring-teal-400"
              aria-label="Close sidebar"
            >
              <PanelLeftClose className="h-5 w-5" />
            </button>
          </div>
          <SidebarNav onNavigate={closeMobileSidebar} expanded />
        </aside>
      </div>

      <div
        className={`transition-all duration-300 ease-in-out ${
          sidebarOpen ? 'md:pl-60' : 'md:pl-16'
        }`}
      >
        <header
          className={`fixed left-0 right-0 top-0 z-30 grid h-16 grid-cols-[2.5rem_1fr_2.5rem] items-center border-b border-slate-200 bg-white px-4 shadow-sm transition-all duration-300 ease-in-out md:flex md:justify-between md:px-6 ${
            sidebarOpen ? 'md:left-60' : 'md:left-16'
          }`}
        >
          <div className="flex items-center gap-3 md:w-full">
            <button
              type="button"
              onClick={() => setMobileSidebarOpen(true)}
              className="rounded-md p-2 text-slate-600 transition hover:bg-slate-100 hover:text-slate-950 focus:outline-none focus:ring-2 focus:ring-teal-500 md:hidden"
              aria-label="Open sidebar"
            >
              <Menu className="h-5 w-5" />
            </button>
            <h1 className="absolute left-1/2 -translate-x-1/2 text-base font-semibold tracking-normal text-slate-950 md:static md:translate-x-0 md:text-lg">
              {pageTitle}
            </h1>
          </div>
          <div className="hidden md:block" />
        </header>

        <main className="h-screen overflow-y-auto pt-16">
          <div className="p-4 sm:p-6">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}

function SidebarContent({ expanded, onNavigate, onToggle }) {
  const ToggleIcon = expanded ? PanelLeftClose : PanelLeftOpen

  return (
    <>
      <div
        className={`flex border-b border-white/10 px-3 ${
          expanded
            ? 'h-16 items-center justify-between'
            : 'h-20 flex-col items-center justify-center gap-2'
        }`}
      >
        <Logo expanded={expanded} />
        <button
          type="button"
          onClick={onToggle}
          className="rounded-md p-2 text-slate-300 transition hover:bg-white/10 hover:text-white focus:outline-none focus:ring-2 focus:ring-teal-400"
          aria-label={expanded ? 'Collapse sidebar' : 'Expand sidebar'}
        >
          <ToggleIcon className="h-5 w-5" />
        </button>
      </div>
      <SidebarNav onNavigate={onNavigate} expanded={expanded} />
    </>
  )
}

function Logo({ expanded = false }) {
  if (expanded) {
    return (
      <div className="min-w-0">
        <div className="text-lg font-bold tracking-normal">🦷 {CLINIC_NAME}</div>
        <div className="mt-0.5 text-xs font-medium text-slate-400">
          {CLINIC_SUBTITLE}
        </div>
      </div>
    )
  }

  return (
    <div className="text-lg font-bold tracking-normal" aria-label={CLINIC_NAME}>
      <span>
        🦷
      </span>
    </div>
  )
}

function SidebarNav({ onNavigate, expanded = false }) {
  return (
    <nav className="flex-1 space-y-1 px-2 py-4">
      {navigationItems.map((item) => {
        const Icon = item.icon

        return (
          <NavLink
            key={item.path}
            to={item.path}
            onClick={onNavigate}
            aria-label={item.label}
            className={({ isActive }) =>
              `group relative flex items-center rounded-md px-3 py-2.5 text-sm font-medium transition ${
                expanded ? 'justify-start gap-3' : 'justify-center'
              } ${
                isActive
                  ? 'bg-teal-600 text-white shadow-sm'
                  : 'text-slate-300 hover:bg-white/10 hover:text-white'
              }`
            }
          >
            <Icon className="h-5 w-5 shrink-0" />
            <span className={expanded ? 'inline' : 'hidden'}>{item.label}</span>
            {!expanded && (
              <span className="pointer-events-none absolute left-full top-1/2 z-50 ml-3 hidden -translate-y-1/2 whitespace-nowrap rounded-md bg-slate-900 px-2.5 py-1.5 text-xs font-medium text-white opacity-0 shadow-lg transition group-hover:opacity-100 md:block">
                {item.label}
              </span>
            )}
          </NavLink>
        )
      })}
    </nav>
  )
}

export default AppLayout
