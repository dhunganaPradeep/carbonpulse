import { ReactNode, useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import { capabilitiesForUser } from '../lib/permissions'
import RoleBadge from './RoleBadge'
import { tokenStore } from '../api/client'
import { useDashboardStore } from '../store/dashboardStore'
import { useSettingsStore, Currency } from '../store/settingsStore'

const NAV = [
  { to: '/', label: 'Dashboard' },
  { to: '/emissions', label: 'Emissions' },
  { to: '/forecast', label: 'Forecast' },
  { to: '/simulator', label: 'Simulator' },
  { to: '/tasks', label: 'Tasks' },
  { to: '/regulatory', label: 'Regulatory' },
]

export default function Layout({ children }: { children: ReactNode }) {
  const location = useLocation()
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const logout = useAuthStore((s) => s.logout)
  const caps = capabilitiesForUser(user)
  const loadForecast = useDashboardStore((s) => s.loadForecast)
  const { currency, setCurrency } = useSettingsStore()
  const [theme, setTheme] = useState<'light' | 'dark' | 'loading'>('loading')

  useEffect(() => {
    if (!user) return
    const token = tokenStore.access
    if (!token) return

    const baseURL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000/api/v1'
    const wsURL = baseURL.replace(/^https?/, window.location.protocol === 'https:' ? 'wss' : 'ws') + `/ws?token=${token}`

    const ws = new WebSocket(wsURL)
    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        if (data.type === 'FORECAST_COMPLETE') {
          void loadForecast()
        }
      } catch {
        // ignore
      }
    }
    return () => ws.close()
  }, [user, loadForecast])

  // Initialize theme from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('theme')
    const initialTheme = (saved === 'light' || saved === 'dark') ? saved : 'dark'
    setTheme(initialTheme as 'light' | 'dark')
    // Apply immediately
    if (initialTheme === 'dark') {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }, [])

  // Sync DOM class whenever theme changes
  useEffect(() => {
    if (theme === 'loading') return
    if (theme === 'dark') {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }, [theme])

  const toggleTheme = () => {
    setTheme((prev) => {
      if (prev === 'loading') return prev
      const next = prev === 'dark' ? 'light' : 'dark'
      localStorage.setItem('theme', next)
      if (next === 'dark') {
        document.documentElement.classList.add('dark')
      } else {
        document.documentElement.classList.remove('dark')
      }
      return next
    })
  }

  const onLogout = async () => {
    await logout()
    navigate('/login')
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 dark:bg-slate-900 dark:text-slate-50 font-['Outfit'] transition-colors duration-300">
      <header className="sticky top-0 z-50 bg-white/80 dark:bg-slate-900/60 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 shadow-sm transition-colors duration-300">
        <div className="w-full max-w-[1600px] mx-auto px-6 xl:px-12 flex items-center justify-between h-16">
          <div className="flex items-center gap-8">
            <Link to="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
              <span className="font-bold text-xl tracking-tight text-slate-900 dark:text-white">CarbonPulse</span>
            </Link>
            <nav className="hidden md:flex gap-1">
              {NAV.map((item) => (
                <Link
                  key={item.to}
                  to={item.to}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-300 ${location.pathname === item.to
                    ? 'bg-slate-100 text-emerald-600 dark:bg-slate-800 dark:text-emerald-400 shadow-inner'
                    : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-slate-800/50'
                    }`}
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>
          <div className="flex items-center gap-2 sm:gap-4 text-sm">
            <div className="relative group cursor-pointer hidden sm:flex items-center py-2">
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-medium hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors">
                <span>{currency}</span>
                <svg className="w-4 h-4 opacity-70" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
              </div>
              <div className="absolute right-0 top-full mt-1 w-24 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-lg rounded-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 overflow-hidden flex flex-col">
                {(['USD', 'EUR', 'GBP', 'NPR'] as Currency[]).map((c) => (
                  <button key={c} onClick={() => setCurrency(c)} className={`px-4 py-2.5 text-left text-sm font-medium transition-colors ${currency === c ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/50'}`}>
                    {c}
                  </button>
                ))}
              </div>
            </div>
            <button
              type="button"
              onClick={toggleTheme}
              className="p-2 rounded-full text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800 transition-colors"
              title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
              aria-label="Toggle theme"
            >
              {theme === 'dark' || theme === 'loading' ? (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" /></svg>
              )}
            </button>
            <div className="relative group cursor-pointer flex items-center gap-2 py-2">
              <div className="hidden sm:block pointer-events-none">
                <RoleBadge role={user?.role} />
              </div>
              <div className="p-1.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
              </div>
              
              <div className="absolute right-0 top-full mt-1 w-48 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-lg rounded-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 overflow-hidden flex flex-col">
                {caps.isAdmin && (
                  <Link to="/settings" className="px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-700/50 text-sm font-medium border-b border-slate-100 dark:border-slate-700/50 text-slate-700 dark:text-slate-200">
                    Organisation Settings
                  </Link>
                )}
                <button onClick={onLogout} className="px-4 py-3 text-left text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 text-sm font-medium w-full transition-colors">
                  Logout
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>
      <main className="flex-1 w-full max-w-[1600px] mx-auto px-6 xl:px-12 py-8 animate-fade-in">{children}</main>

      <footer className="border-t border-slate-200 dark:border-slate-800 text-center text-xs text-slate-400 px-4 py-3 bg-white dark:bg-slate-900 transition-colors duration-300 mt-auto">
        Developed with ❤️ by{" "}
        <a
          href="https://dhunganapradip.com.np"
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-500 hover:underline"
        >
          Pradip Dhungana
        </a>
      </footer>


    </div>
  )
}
