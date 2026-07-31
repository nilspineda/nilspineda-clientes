import pb from '@/lib/pocketbaseClient'

const COLLECTION = 'personal_tasks'

export async function fetchTasks() {
  return pb.collection(COLLECTION).getFullList({
    sort: '+due_date,+created',
    expand: 'user_id',
    requestKey: null,
  })
}

export async function createTask({ title, description, due_date }) {
  return pb.collection(COLLECTION).create({
    title,
    description,
    due_date,
    user_id: pb.authStore.model?.id,
    completed: false,
    reminded_today: false,
  })
}

export async function updateTask(id, data) {
  return pb.collection(COLLECTION).update(id, data)
}

export async function deleteTask(id) {
  return pb.collection(COLLECTION).delete(id)
}

export async function completeTask(id, completed = true) {
  return pb.collection(COLLECTION).update(id, { completed })
}

export async function rescheduleTask(id, due_date) {
  return pb.collection(COLLECTION).update(id, { due_date, reminded_today: false, completed: false })
}

export function toLocalDate(dateStr) {
  if (!dateStr) return null
  const [y, m, d] = dateStr.slice(0, 10).split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function getTasksForDate(tasks, date) {
  return tasks.filter((t) => {
    const d = toLocalDate(t.due_date)
    if (!d) return false
    return d.getFullYear() === date.getFullYear() &&
      d.getMonth() === date.getMonth() &&
      d.getDate() === date.getDate()
  })
}

export function getMonthTasks(tasks, year, month) {
  return tasks.filter((t) => {
    const d = toLocalDate(t.due_date)
    if (!d) return false
    return d.getFullYear() === year && d.getMonth() === month
  })
}
