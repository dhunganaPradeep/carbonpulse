import { FormEvent, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'

export default function Login() {
  const navigate = useNavigate()
  const login = useAuthStore((s) => s.login)
  const loading = useAuthStore((s) => s.loading)
  const [email, setEmail] = useState('admin@carbonpulse.dev')
  const [password, setPassword] = useState('admin123')
  const [error, setError] = useState<string | null>(null)

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    try {
      await login(email, password)
      navigate('/')
    } catch {
      setError('Invalid email or password')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900 font-['Outfit'] relative overflow-hidden transition-colors duration-300">
      {/* Decorative background elements */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl" />
      
      <form
        onSubmit={onSubmit}
        className="relative z-10 bg-white/80 dark:bg-slate-800/50 backdrop-blur-xl border border-slate-200 dark:border-slate-700/50 p-8 sm:p-10 rounded-3xl shadow-xl dark:shadow-2xl w-full max-w-md space-y-6 animate-fade-in transition-colors duration-300"
      >
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">CarbonPulse</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-2 text-sm">Enterprise Climate Intelligence</p>
        </div>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Email</label>
            <input
              className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition-all"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Password</label>
            <input
              className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition-all"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
          </div>
        </div>

        {error && (
          <div className="bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 rounded-lg p-3 text-center">
            <p className="text-sm text-rose-600 dark:text-rose-400 font-medium">{error}</p>
          </div>
        )}
        
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-500 dark:hover:bg-emerald-400 text-white dark:text-slate-900 font-semibold rounded-xl py-3 mt-4 shadow-lg shadow-emerald-500/20 transition-all disabled:opacity-50"
        >
          {loading ? 'Authenticating...' : 'Sign in'}
        </button>
      </form>
    </div>
  )
}
