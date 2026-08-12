// Crea las colecciones de Gastos en PocketBase (expenses_categories, expenses, expense_budgets).
// Uso:
//   node scripts/setup-expenses-collections.mjs --url https://pocketbase.nilspineda.com --email tu@admin.com --pass 'tu-password'
// O bien con variables de entorno PB_URL, PB_ADMIN_EMAIL, PB_ADMIN_PASSWORD.
import PocketBase from 'pocketbase'

const args = process.argv.slice(2)
function argValue(name) {
  const i = args.indexOf(name)
  return i !== -1 ? args[i + 1] : undefined
}

const url = argValue('--url') || process.env.PB_URL
const email = argValue('--email') || process.env.PB_ADMIN_EMAIL
const password = argValue('--pass') || process.env.PB_ADMIN_PASSWORD

if (!url || !email || !password) {
  console.error('Faltan argumentos. Uso: node scripts/setup-expenses-collections.mjs --url URL --email EMAIL --pass PASSWORD')
  process.exit(1)
}

const pb = new PocketBase(url)

try {
  await pb.admins.authWithPassword(email, password)
  console.log('Admin autenticado OK')
} catch (e) {
  console.error('Error de autenticación de admin:', e.message)
  process.exit(1)
}

const adminRules = {
  listRule: '@request.auth.role = "admin"',
  viewRule: '@request.auth.role = "admin"',
  createRule: '@request.auth.role = "admin"',
  updateRule: '@request.auth.role = "admin"',
  deleteRule: '@request.auth.role = "admin"',
}

const relationField = (id, name, collectionId, maxSelect = 1) => ({
  id, name, type: 'relation', collectionId,
  maxSelect, minSelect: 0, cascadeDelete: false,
  required: false, system: false, hidden: false, presentable: false,
})

const textField = (id, name, max = 255) => ({ id, name, type: 'text', max })

async function collectionExists(name) {
  try {
    await pb.collections.getOne(name)
    return true
  } catch {
    return false
  }
}

async function createCollection(body) {
  try {
    const col = await pb.collections.create(body)
    console.log('  Creada:', col.name, `(${col.id})`)
    return col
  } catch (e) {
    console.error('  Error creando', body.name, ':', e.message)
    return null
  }
}

console.log('Configurando colecciones de gastos...')

let categoriesCol = null
if (!(await collectionExists('expenses_categories'))) {
  console.log('Creando expenses_categories...')
  categoriesCol = await createCollection({
    name: 'expenses_categories',
    type: 'base',
    ...adminRules,
    fields: [
      relationField('ec_user', 'user_id', '_pb_users_auth_'),
      textField('ec_name', 'name', 255),
      textField('ec_color', 'color', 20),
      textField('ec_icon', 'icon', 50),
    ],
  })
} else {
  categoriesCol = await pb.collections.getOne('expenses_categories')
  console.log('expenses_categories ya existe')
}

if (!categoriesCol) {
  console.error('No se pudo obtener/crear expenses_categories. Aborta.')
  process.exit(1)
}

if (!(await collectionExists('expenses'))) {
  console.log('Creando expenses...')
  await createCollection({
    name: 'expenses',
    type: 'base',
    ...adminRules,
    fields: [
      relationField('ex_user', 'user_id', '_pb_users_auth_'),
      relationField('ex_cat', 'category', categoriesCol.id),
      { id: 'ex_amt', name: 'amount', type: 'number', min: 0 },
      { id: 'ex_date', name: 'expense_date', type: 'date' },
      textField('ex_time', 'expense_time', 5),
      textField('ex_desc', 'description', 500),
    ],
  })
} else {
  console.log('expenses ya existe')
}

if (!(await collectionExists('expense_budgets'))) {
  console.log('Creando expense_budgets...')
  await createCollection({
    name: 'expense_budgets',
    type: 'base',
    ...adminRules,
    fields: [
      relationField('eb_user', 'user_id', '_pb_users_auth_'),
      textField('eb_month', 'month', 7),
      { id: 'eb_bud', name: 'budget', type: 'number', min: 0 },
    ],
  })
} else {
  console.log('expense_budgets ya existe')
}

console.log('Listo.')