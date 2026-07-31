import { useState, useEffect, useCallback } from 'react'
import { ChevronLeft, ChevronRight, Plus, Trash2, CheckCircle2, Circle, Calendar, Clock, ListTodo } from 'lucide-react'
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameMonth, isSameDay, isToday, addMonths, subMonths } from 'date-fns'
import { es } from 'date-fns/locale'
import { fetchTasks, createTask, deleteTask, completeTask, rescheduleTask, toLocalDate } from '@/utils/personalTasks'
import { usePersonalTasks } from '@/hooks/usePersonalTasks'

export default function Tasks() {
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(true)
  const [newTitle, setNewTitle] = useState('')
  const [adding, setAdding] = useState(false)
  const [rescheduleTaskId, setRescheduleTaskId] = useState(null)
  const [rescheduleDate, setRescheduleDate] = useState('')

  const loadTasks = useCallback(async () => {
    try {
      const data = await fetchTasks()
      setTasks(data)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadTasks()
  }, [loadTasks])

  usePersonalTasks()

  const monthDays = eachDayOfInterval({
    start: startOfWeek(startOfMonth(currentMonth), { weekStartsOn: 0 }),
    end: endOfWeek(endOfMonth(currentMonth), { weekStartsOn: 0 }),
  })

  const dayTasks = tasks.filter((t) => {
    const d = toLocalDate(t.due_date)
    if (!d) return false
    return isSameDay(d, selectedDate)
  })

  const hasTasksOn = (day) => {
    if (day.getMonth() !== currentMonth.getMonth()) return false
    return tasks.some((t) => {
      const d = toLocalDate(t.due_date)
      if (!d) return false
      return isSameDay(d, day) && !t.completed
    })
  }

  const hasCompletedOn = (day) => {
    return tasks.some((t) => {
      const d = toLocalDate(t.due_date)
      if (!d) return false
      return isSameDay(d, day) && t.completed
    })
  }

  const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1))
  const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1))

  const handleAddTask = async () => {
    const title = newTitle.trim()
    if (!title) return
    try {
      const task = await createTask({
        title,
        due_date: format(selectedDate, 'yyyy-MM-dd'),
      })
      setTasks((prev) => [...prev, task])
      setNewTitle('')
      setAdding(false)
    } catch (e) {
      console.error(e)
    }
  }

  const handleToggleComplete = async (id, completed) => {
    try {
      await completeTask(id, !completed)
      setTasks((prev) =>
        prev.map((t) => (t.id === id ? { ...t, completed: !completed } : t))
      )
    } catch (e) {
      console.error(e)
    }
  }

  const handleDelete = async (id) => {
    try {
      await deleteTask(id)
      setTasks((prev) => prev.filter((t) => t.id !== id))
    } catch (e) {
      console.error(e)
    }
  }

  const handleReschedule = async () => {
    if (!rescheduleTaskId || !rescheduleDate) return
    try {
      await rescheduleTask(rescheduleTaskId, rescheduleDate)
      setTasks((prev) =>
        prev.map((t) =>
          t.id === rescheduleTaskId
            ? { ...t, due_date: rescheduleDate, completed: false, reminded_today: false }
            : t
        )
      )
      setRescheduleTaskId(null)
      setRescheduleDate('')
    } catch (e) {
      console.error(e)
    }
  }

  const getTaskCount = (day) => {
    return tasks.filter((t) => {
      const d = toLocalDate(t.due_date)
      if (!d) return false
      return isSameDay(d, day)
    }).length
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="flex flex-col lg:flex-row gap-4 h-[calc(100vh-8rem)]">
      <div className="w-full lg:w-[400px] shrink-0">
        <div className="border border-border/50 rounded-xl bg-card overflow-hidden">
          <div className="flex items-center justify-between p-3 border-b border-border/50">
            <button onClick={() => setCurrentMonth(subMonths(currentMonth, 1))} className="p-1.5 rounded-lg hover:bg-accent transition-colors">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <h2 className="text-sm font-semibold capitalize">
              {format(currentMonth, 'MMMM yyyy', { locale: es })}
            </h2>
            <button onClick={() => setCurrentMonth(addMonths(currentMonth, 1))} className="p-1.5 rounded-lg hover:bg-accent transition-colors">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-7 text-center text-[11px] font-medium text-muted-foreground py-2 border-b border-border/30">
            {['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'].map((d) => (
              <div key={d}>{d}</div>
            ))}
          </div>

          <div className="grid grid-cols-7">
            {monthDays.map((day, idx) => {
              const inMonth = isSameMonth(day, currentMonth)
              const today = isToday(day)
              const selected = isSameDay(day, selectedDate)
              const hasTasks = hasTasksOn(day)
              const hasDone = hasCompletedOn(day) && !hasTasks
              const count = getTaskCount(day)

              return (
                <div
                  key={idx}
                  className={`relative p-1.5 text-sm transition-colors group ${
                    !inMonth
                      ? 'text-muted-foreground/30 hover:bg-accent/30'
                      : 'hover:bg-accent/50'
                  } ${
                    selected
                      ? 'bg-primary/10 ring-1 ring-primary/30'
                      : ''
                  }`}
                >
                  <button
                    className="absolute inset-0 cursor-pointer"
                    onClick={() => {
                      setSelectedDate(day)
                      if (!isSameMonth(day, currentMonth)) setCurrentMonth(day)
                    }}
                    aria-label={`Ver tareas del ${format(day, 'd')}`}
                  />
                  <button
                    className={`absolute top-1 right-1 z-10 w-4 h-4 flex items-center justify-center rounded-full text-primary hover:bg-primary hover:text-primary-foreground transition-opacity ${
                      selected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                    }`}
                    onClick={() => {
                      setSelectedDate(day)
                      if (!isSameMonth(day, currentMonth)) setCurrentMonth(day)
                      setNewTitle('')
                      setAdding(true)
                    }}
                    aria-label={`Crear tarea el ${format(day, 'd')}`}
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                  <span
                    className={`flex items-center justify-center w-8 h-8 mx-auto rounded-full text-xs pointer-events-none ${
                      today ? 'bg-primary text-primary-foreground font-bold' : ''
                    } ${
                      selected && !today ? 'border border-primary/50' : ''
                    }`}
                  >
                    {format(day, 'd')}
                  </span>
                  {inMonth && (
                    <div className="flex items-center justify-center gap-0.5 mt-0.5 pointer-events-none">
                      {hasTasks && (
                        <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                      )}
                      {hasDone && !hasTasks && (
                        <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/30" />
                      )}
                    </div>
                  )}
                  {count > 0 && inMonth && (
                    <span className="absolute top-0.5 left-1.5 text-[9px] text-muted-foreground/60 font-mono pointer-events-none">
                      {count}
                    </span>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        <div className="mt-2 text-center">
          <span className="text-[10px] text-muted-foreground/40">
            {format(selectedDate, "EEEE d 'de' MMMM yyyy", { locale: es })}
          </span>
        </div>
      </div>

      <div className="flex-1 flex flex-col">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <ListTodo className="w-4 h-4 text-primary" />
            Tareas del día
          </h3>
          <button
            onClick={() => setAdding(true)}
            className="flex items-center gap-1 px-3 py-1.5 bg-primary text-primary-foreground rounded-lg text-xs font-medium hover:bg-primary/90 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            Agregar
          </button>
        </div>

        {adding && (
          <div className="flex items-center gap-2 mb-3 p-3 bg-muted/30 border border-border/50 rounded-xl">
            <input
              type="text"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleAddTask() }}
              placeholder={`Nueva tarea para ${format(selectedDate, "d 'de' MMM", { locale: es })}...`}
              className="flex-1 px-3 py-2 text-sm bg-background border border-border/50 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary placeholder:text-muted-foreground/40"
              autoFocus
            />
            <button
              onClick={handleAddTask}
              className="px-3 py-2 bg-primary text-primary-foreground rounded-lg text-xs font-medium hover:bg-primary/90 transition-colors"
            >
              Añadir
            </button>
            <button
              onClick={() => { setAdding(false); setNewTitle('') }}
              className="px-3 py-2 border border-border/50 rounded-lg text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              Cancelar
            </button>
          </div>
        )}

        <div className="flex-1 overflow-y-auto space-y-1.5">
          {dayTasks.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <Calendar className="w-10 h-10 mb-2 opacity-20" />
              <p className="text-sm">No hay tareas para este día</p>
              <p className="text-xs opacity-60 mt-1">Agrega una tarea nueva</p>
            </div>
          ) : (
            dayTasks.map((task) => {
              const dd = toLocalDate(task.due_date)
              const overdue = dd && !task.completed && dd < new Date() && !isSameDay(dd, new Date())

              return (
                <div
                  key={task.id}
                  className={`flex items-start gap-3 p-3 rounded-xl border transition-colors ${
                    task.completed
                      ? 'bg-muted/20 border-border/30 opacity-60'
                      : overdue
                      ? 'bg-red-500/5 border-red-500/20'
                      : 'bg-card border-border/50 hover:border-border'
                  }`}
                >
                  <button
                    onClick={() => handleToggleComplete(task.id, task.completed)}
                    className="mt-0.5 shrink-0 transition-colors"
                  >
                    {task.completed ? (
                      <CheckCircle2 className="w-5 h-5 text-primary" />
                    ) : (
                      <Circle className="w-5 h-5 text-muted-foreground/40 hover:text-primary/60 transition-colors" />
                    )}
                  </button>

                  <div className="flex-1 min-w-0">
                    <p className={`text-sm ${task.completed ? 'line-through text-muted-foreground/60' : ''}`}>
                      {task.title}
                    </p>
                    {task.description && (
                      <p className="text-xs text-muted-foreground/60 mt-0.5 line-clamp-1">
                        {task.description}
                      </p>
                    )}
                    {overdue && (
                      <p className="text-[10px] text-red-400/70 mt-1 font-medium">
                        Vencida · {format(toLocalDate(task.due_date), "d 'de' MMM", { locale: es })}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => {
                        const d = task.due_date ? format(toLocalDate(task.due_date), 'yyyy-MM-dd') : ''
                        setRescheduleTaskId(task.id)
                        setRescheduleDate(d)
                      }}
                      className="p-1.5 rounded-lg hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
                      title="Reprogramar"
                    >
                      <Calendar className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDelete(task.id)}
                      className="p-1.5 rounded-lg hover:bg-red-500/10 text-muted-foreground hover:text-red-400 transition-colors"
                      title="Eliminar"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>

      {rescheduleTaskId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={() => setRescheduleTaskId(null)}>
          <div className="bg-card border border-border/50 rounded-xl p-6 w-full max-w-sm mx-4 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-sm font-semibold mb-4">Reprogramar tarea</h3>

            <label className="block text-xs text-muted-foreground mb-1.5">Nueva fecha</label>
            <input
              type="date"
              value={rescheduleDate}
              onChange={(e) => setRescheduleDate(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-background border border-border/50 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary mb-4"
            />

            <div className="flex gap-2">
              <button
                onClick={handleReschedule}
                disabled={!rescheduleDate}
                className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                Guardar
              </button>
              <button
                onClick={() => setRescheduleTaskId(null)}
                className="flex-1 px-4 py-2 border border-border/50 rounded-lg text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
