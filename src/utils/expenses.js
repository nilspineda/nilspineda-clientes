import pb from '@/lib/pocketbaseClient'

const CATEGORIES_COLLECTION = 'expenses_categories'
const EXPENSES_COLLECTION = 'expenses'
const BUDGETS_COLLECTION = 'expense_budgets'

function userId() {
  return pb.authStore.model?.id
}

// ---------- Categories ----------
export async function fetchCategories() {
  return pb.collection(CATEGORIES_COLLECTION).getFullList({
    sort: '+name',
    expand: 'user_id',
    requestKey: null,
  })
}

export async function createCategory({ name, color, icon }) {
  return pb.collection(CATEGORIES_COLLECTION).create({
    name,
    color: color || '#10b981',
    icon: icon || '',
    user_id: userId(),
  })
}

export async function updateCategory(id, data) {
  return pb.collection(CATEGORIES_COLLECTION).update(id, data)
}

export async function deleteCategory(id) {
  return pb.collection(CATEGORIES_COLLECTION).delete(id)
}

// ---------- Expenses ----------
export async function fetchExpenses() {
  return pb.collection(EXPENSES_COLLECTION).getFullList({
    sort: '-expense_date',
    expand: 'user_id,category',
    requestKey: null,
  })
}

export async function createExpense({ category, amount, expense_date, expense_time, description }) {
  return pb.collection(EXPENSES_COLLECTION).create({
    category: category || null,
    amount,
    expense_date,
    expense_time: expense_time || null,
    description: description || '',
    user_id: userId(),
  })
}

export async function updateExpense(id, data) {
  return pb.collection(EXPENSES_COLLECTION).update(id, data)
}

export async function deleteExpense(id) {
  return pb.collection(EXPENSES_COLLECTION).delete(id)
}

// ---------- Budgets ----------
export async function fetchBudgets() {
  return pb.collection(BUDGETS_COLLECTION).getFullList({
    sort: '+month',
    expand: 'user_id',
    requestKey: null,
  })
}

export async function setBudget(month, budget) {
  const existing = await pb.collection(BUDGETS_COLLECTION).getFullList({
    filter: `month = "${month}"`,
    requestKey: null,
  })
  if (existing.length) {
    return pb.collection(BUDGETS_COLLECTION).update(existing[0].id, { budget })
  }
  return pb.collection(BUDGETS_COLLECTION).create({
    month,
    budget,
    user_id: userId(),
  })
}

// ---------- Helpers ----------
export function expenseMonthKey(dateStr) {
  if (!dateStr) return null
  const m = dateStr.slice(0, 7)
  return m
}

export function getExpensesForMonth(expenses, monthKey) {
  return expenses.filter((e) => expenseMonthKey(e.expense_date) === monthKey)
}

export function sumExpenses(expenses) {
  return expenses.reduce((s, e) => s + (parseFloat(e.amount) || 0), 0)
}

// Aggregate expenses grouped by category for the current filter.
export function groupByCategory(expenses, categories) {
  const map = new Map()
  const catById = new Map(categories.map((c) => [c.id, c]))
  for (const e of expenses) {
    const cat = e.expand?.category || catById.get(e.category)
    const id = e.category || 'none'
    if (!map.has(id)) {
      map.set(id, {
        id,
        name: cat?.name || 'Sin categoría',
        color: cat?.color || '#64748b',
        icon: cat?.icon || '',
        total: 0,
        count: 0,
      })
    }
    const entry = map.get(id)
    entry.total += parseFloat(e.amount) || 0
    entry.count += 1
  }
  return Array.from(map.values()).sort((a, b) => b.total - a.total)
}

// Build a 12-month series ending at `nowMonth` (YYYY-MM).
export function monthlySeries(expenses, nowMonth) {
  const byMonth = new Map()
  for (const e of expenses) {
    const key = expenseMonthKey(e.expense_date)
    if (!key) continue
    byMonth.set(key, (byMonth.get(key) || 0) + (parseFloat(e.amount) || 0))
  }
  const out = []
  const [cy, cm] = nowMonth.split('-').map(Number)
  for (let i = 11; i >= 0; i--) {
    const d = new Date(cy, cm - 1 - i, 1)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    const label = new Intl.DateTimeFormat('es', { month: 'short' }).format(d)
    out.push({ key, label, total: byMonth.get(key) || 0 })
  }
  return out
}