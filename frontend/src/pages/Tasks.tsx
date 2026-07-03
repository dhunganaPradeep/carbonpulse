import { useEffect, useState } from 'react'
import { tasksApi } from '../api/services'
import { useAuthStore } from '../store/authStore'
import { capabilitiesForUser } from '../lib/permissions'
import type { Task, TaskStatus } from '../types'

const COLUMNS: { id: TaskStatus; label: string; color: string }[] = [
  { id: 'todo', label: 'To Do', color: 'bg-slate-100 dark:bg-slate-800' },
  { id: 'in_progress', label: 'In Progress', color: 'bg-amber-50 dark:bg-amber-500/10' },
  { id: 'done', label: 'Done', color: 'bg-emerald-50 dark:bg-emerald-500/10' },
]

export default function Tasks() {
  const user = useAuthStore((s) => s.user)
  const caps = capabilitiesForUser(user)
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [newTaskTitle, setNewTaskTitle] = useState('')
  const [addingTo, setAddingTo] = useState<TaskStatus | null>(null)

  const load = async () => {
    try {
      setTasks(await tasksApi.list())
    } catch {
      setError('Failed to load tasks.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [])

  const handleCreate = async (status: TaskStatus) => {
    if (!newTaskTitle.trim()) {
      setAddingTo(null)
      return
    }
    try {
      const created = await tasksApi.create({ title: newTaskTitle, status })
      setTasks((prev) => [created, ...prev])
      setNewTaskTitle('')
      setAddingTo(null)
    } catch {
      setError('Failed to create task.')
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this task?')) return
    try {
      await tasksApi.remove(id)
      setTasks((prev) => prev.filter((t) => t.id !== id))
    } catch {
      setError('Failed to delete task.')
    }
  }

  const handleDrop = async (e: React.DragEvent, targetStatus: TaskStatus) => {
    const taskId = e.dataTransfer.getData('taskId')
    if (!taskId) return
    const task = tasks.find((t) => t.id === taskId)
    if (!task || task.status === targetStatus) return

    // Optimistic update
    setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, status: targetStatus } : t)))

    try {
      await tasksApi.update(taskId, { status: targetStatus })
    } catch {
      // Revert on error
      await load()
      setError('Failed to update task status.')
    }
  }

  return (
    <div className="space-y-8 animate-fade-in">
      <div>
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-3">
          Decarbonisation Tasks
        </h2>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400 max-w-2xl">
          Track and manage your strategic initiatives and decarbonisation levers.
        </p>
      </div>

      {error && (
        <div className="bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 rounded-xl p-4 flex items-center gap-3">
          <p className="text-sm text-rose-600 dark:text-rose-400 font-medium">{error}</p>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center p-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {COLUMNS.map((col) => (
            <div
              key={col.id}
              className={`rounded-2xl border border-slate-200 dark:border-slate-700/50 p-4 ${col.color} flex flex-col`}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => void handleDrop(e, col.id)}
            >
              <div className="flex items-center justify-between mb-4 px-1">
                <h3 className="font-semibold text-slate-900 dark:text-white">{col.label}</h3>
                <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-white dark:bg-slate-900/50 text-slate-500 dark:text-slate-400">
                  {tasks.filter((t) => t.status === col.id).length}
                </span>
              </div>

              <div className="flex-1 space-y-3">
                {tasks
                  .filter((t) => t.status === col.id)
                  .map((task) => (
                    <div
                      key={task.id}
                      draggable={caps.isAdmin || caps.isAnalyst}
                      onDragStart={(e) => e.dataTransfer.setData('taskId', task.id)}
                      className={`bg-white dark:bg-slate-900/80 p-4 rounded-xl border border-slate-200 dark:border-slate-700/50 shadow-sm ${
                        (caps.isAdmin || caps.isAnalyst) ? 'cursor-grab active:cursor-grabbing hover:border-emerald-500/50 dark:hover:border-emerald-400/50 transition-colors' : ''
                      }`}
                    >
                      <div className="flex justify-between items-start gap-2">
                        <p className="text-sm font-medium text-slate-800 dark:text-slate-200 break-words">
                          {task.title}
                        </p>
                        {(caps.isAdmin || caps.isAnalyst) && (
                          <button
                            onClick={() => void handleDelete(task.id)}
                            className="text-slate-400 hover:text-rose-500 dark:hover:text-rose-400 transition-colors"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                          </button>
                        )}
                      </div>
                      {task.description && (
                        <p className="mt-2 text-xs text-slate-500 dark:text-slate-400 line-clamp-3">
                          {task.description}
                        </p>
                      )}
                    </div>
                  ))}

                {(caps.isAdmin || caps.isAnalyst) && addingTo === col.id ? (
                  <div className="bg-white dark:bg-slate-900/80 p-3 rounded-xl border border-emerald-500/50 shadow-sm">
                    <input
                      autoFocus
                      type="text"
                      placeholder="Task title..."
                      value={newTaskTitle}
                      onChange={(e) => setNewTaskTitle(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') void handleCreate(col.id)
                        if (e.key === 'Escape') {
                          setAddingTo(null)
                          setNewTaskTitle('')
                        }
                      }}
                      className="w-full text-sm bg-transparent border-none focus:outline-none focus:ring-0 text-slate-900 dark:text-white placeholder-slate-400"
                    />
                    <div className="flex items-center gap-2 mt-3">
                      <button
                        onClick={() => void handleCreate(col.id)}
                        className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-lg transition-colors font-medium"
                      >
                        Add
                      </button>
                      <button
                        onClick={() => {
                          setAddingTo(null)
                          setNewTaskTitle('')
                        }}
                        className="text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 font-medium px-2"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  (caps.isAdmin || caps.isAnalyst) && (
                    <button
                      onClick={() => setAddingTo(col.id)}
                      className="w-full py-2.5 flex items-center justify-center gap-2 text-sm font-medium text-slate-500 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-slate-200/50 dark:hover:bg-slate-800/50 rounded-xl transition-all border border-dashed border-slate-300 dark:border-slate-700/50 hover:border-emerald-500/50"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                      Add Task
                    </button>
                  )
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
