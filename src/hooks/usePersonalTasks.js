import { useState, useEffect, useCallback } from 'react'
import { toast } from 'sonner'
import pb from '@/lib/pocketbaseClient'
import { fetchTasks, updateTask, toLocalDate } from '@/utils/personalTasks'

const STORAGE_KEY = 'task_notified_date'

function getToday() {
  return new Date().toDateString()
}

export function usePersonalTasks() {
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(true)

  const loadTasks = useCallback(async () => {
    try {
      const data = await fetchTasks()
      setTasks(data)
    } catch (e) {
      console.error('Error loading tasks:', e)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadTasks()
  }, [loadTasks])

  const checkTodayTasks = useCallback(async () => {
    const todayKey = getToday()
    const lastNotified = localStorage.getItem(STORAGE_KEY)

    if (lastNotified === todayKey) return

    const today = new Date()
    const todaysTasks = tasks.filter((t) => {
      if (!t.due_date || t.completed) return false
      const d = toLocalDate(t.due_date)
      return d.getFullYear() === today.getFullYear() &&
        d.getMonth() === today.getMonth() &&
        d.getDate() === today.getDate()
    })

    if (todaysTasks.length === 0) return

    const titles = todaysTasks.map((t) => t.title).join(', ')
    const count = todaysTasks.length

    toast.info(`Tienes ${count} tarea${count > 1 ? 's' : ''} para hoy`, {
      description: titles,
      duration: 8000,
    })

    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('Tareas del día', {
        body: `${count} tarea${count > 1 ? 's' : ''}: ${titles}`,
        icon: '/icon-192.png',
      })
    }

    localStorage.setItem(STORAGE_KEY, todayKey)
  }, [tasks])

  useEffect(() => {
    if (!loading && tasks.length > 0) {
      const timer = setTimeout(() => checkTodayTasks(), 3000)
      return () => clearTimeout(timer)
    }
  }, [loading, tasks, checkTodayTasks])

  const refresh = useCallback(() => {
    setLoading(true)
    loadTasks()
  }, [loadTasks])

  return { tasks, loading, refresh }
}
