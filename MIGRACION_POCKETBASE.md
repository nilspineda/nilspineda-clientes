# Plan de Migración: Supabase → PocketBase

## 1. ¿Migrar o crear desde cero?

**Migrar es significativamente más rápido.** La UI, el routing, los estilos Tailwind, los componentes y toda la lógica de negocio del frontend ya están construidos y funcionando. Solo hay que reemplazar las llamadas a Supabase por PocketBase, que es un cambio mecánico y predecible.

Crear desde cero implicaría volver a escribir ~12 pantallas con sus formularios, modales, tablas, estados de carga, validaciones, etc.

---

## 2. Estructura de Colecciones en PocketBase

### `users` (colección nativa, extender con campos)

| Campo | Tipo | Descripción |
|---|---|---|
| `email` | Email (nativo) | Correo del usuario |
| `password` | Password (nativo) | Contraseña |
| `name` | Texto | Nombre completo |
| `whatsapp` | Texto | Número de WhatsApp |
| `role` | Texto | `"admin"` o `"user"` |
| `status` | Texto | `"active"` o `"suspended"` |
| `accesos` | Texto (rich) | Credenciales del usuario |

### `services` (colección custom)

| Campo | Tipo | Descripción |
|---|---|---|
| `name` | Texto | Nombre del servicio |
| `type` | Texto | `dominio`, `hosting`, `correo`, `membresia`, `personalizado` |
| `price` | Número | Precio de referencia |
| `description` | Texto | Descripción |

### `user_services` (colección custom)

| Campo | Tipo | Descripción |
|---|---|---|
| `user_id` | Relación → `users` | Usuario asignado |
| `service_id` | Relación → `services` | Servicio base |
| `price` | Número | Precio personalizado |
| `owner` | Número | `0` = admin paga, `1` = cliente paga |
| `expires_at` | Fecha | Fecha de vencimiento |
| `next_billing_date` | Fecha | Próximo cobro al cliente |
| `url_dominio` | URL | Dominio asociado |
| `accesos` | Texto (rich) | Credenciales del servicio |
| `notes` | Texto | Notas internas |
| `billing_type` | Texto | `monthly` o `annual` |
| `no_expiry` | Bool | Sin fecha de vencimiento |
| `status` | Texto | `active`, `pending`, `expired` |

### `payments` (colección custom)

| Campo | Tipo | Descripción |
|---|---|---|
| `user_id` | Relación → `users` | Usuario que paga |
| `user_service_id` | Relación → `user_services` | Servicio asignado |
| `amount` | Número | Monto |
| `payment_date` | Fecha | Fecha de pago |
| `payment_method` | Texto | `transferencia`, `efectivo`, `nequi`, etc. |
| `status` | Texto | `paid`, `pending`, `failed` |
| `invoice` | Archivo | PDF de factura |

### `settings` (colección custom)

| Campo | Tipo | Descripción |
|---|---|---|
| `key` | Texto (único) | Clave de configuración |
| `value` | Texto | Valor |

---

## 3. Reglas de Acceso (API Rules)

En PocketBase, las reglas de acceso se configuran por colección en el Admin UI.

### `users`
- **List**: `@request.auth.role = "admin"` (solo admin ve la lista)
- **View**: `@request.auth.id = id || @request.auth.role = "admin"` (cada quien ve su perfil o admin ve todos)
- **Create**: `@request.auth.role = "admin"` (solo admin crea usuarios)
- **Update**: `@request.auth.id = id || @request.auth.role = "admin"` (usuario edita su propio perfil, admin edita cualquiera)
- **Delete**: `@request.auth.role = "admin"`

### `services`
- **List**: `@request.auth.id != ""` (cualquier usuario autenticado)
- **View**: `@request.auth.id != ""`
- **Create**: `@request.auth.role = "admin"`
- **Update**: `@request.auth.role = "admin"`
- **Delete**: `@request.auth.role = "admin"`

### `user_services`
- **List**: `@request.auth.id = user_id.id || @request.auth.role = "admin"`
- **View**: `@request.auth.id = user_id.id || @request.auth.role = "admin"`
- **Create**: `@request.auth.role = "admin"`
- **Update**: `@request.auth.role = "admin"`
- **Delete**: `@request.auth.role = "admin"`

### `payments`
- **List/View**: `@request.auth.id = user_id.id || @request.auth.role = "admin"`
- **Create/Update/Delete**: `@request.auth.role = "admin"`

### `settings`
- **List/View**: `@request.auth.id != ""`
- **Create/Update/Delete**: `@request.auth.role = "admin"`

---

## 4. Migración del Código Frontend

### 4.1 Instalar dependencia

```bash
npm uninstall @supabase/supabase-js
npm install pocketbase
```

### 4.2 Variables de entorno

**.env** (reemplazar):
```
VITE_POCKETBASE_URL=https://tu-vps.com:8090
```

### 4.3 Cliente PocketBase

Crear `src/lib/pocketbaseClient.js`:
```js
import PocketBase from 'pocketbase'
const pb = new PocketBase(import.meta.env.VITE_POCKETBASE_URL || 'http://localhost:8090')
export default pb
```

### 4.4 Mapa de equivalencias Supabase → PocketBase

| Supabase | PocketBase |
|---|---|
| `supabase.from('table').select('*')` | `pb.collection('table').getFullList()` |
| `.eq('field', 'value')` | `{ filter: 'field = "value"' }` |
| `.single()` | `getOne(id)` o `getFirstListItem(filter)` |
| `.order('f', { ascending: false })` | `{ sort: '-f' }` |
| `.gte('f', v)` | `filter: 'f >= "v"'` |
| `.lte('f', v)` | `filter: 'f <= "v"'` |
| `.insert({...})` | `.create({...})` |
| `.update({...}).eq('id', x)` | `.update(x, {...})` |
| `.delete().eq('id', x)` | `.delete(x)` |
| `.select('*, relation(*)')` | `{ expand: 'relation_id' }` y acceder vía `item.expand.relation_id.campo` |
| `supabase.auth.signInWithPassword()` | `pb.collection('users').authWithPassword()` |
| `supabase.auth.signOut()` | `pb.authStore.clear()` |
| `supabase.auth.onAuthStateChange()` | `pb.authStore.onChange()` |
| `supabase.auth.getSession()` | `pb.authStore.isValid` + `pb.authStore.model` |
| `supabase.auth.admin.createUser()` | `pb.collection('users').create()` (como admin) |
| `supabase.storage.from('b').upload()` | `pb.collection('records').update(id, formData)` con campo file |
| `supabase.rpc('func', {...})` | Implementar en JS frontend o PocketBase hook |

### 4.5 Archivos a modificar

| Archivo | Cambio |
|---|---|
| `src/lib/supabaseClient.js` | → Eliminar, reemplazar por `pocketbaseClient.js` |
| `src/hooks/useAuth.jsx` | Reescribir completamente con PocketBase auth |
| `src/App.jsx` | Eliminar telemetría, actualizar imports |
| `src/pages/Dashboard.jsx` | Reemplazar todas las queries |
| `src/pages/Payments.jsx` | Reemplazar todas las queries |
| `src/pages/ServiceCredentials.jsx` | Reemplazar queries, eliminar `getSupabaseAdmin()` |
| `src/pages/Login.jsx` | Sin cambios (usa `useAuth().signIn`) |
| `src/pages/admin/AdminIndex.jsx` | Reemplazar todas las queries + `signUp()` |
| `src/pages/admin/AdminUsers.jsx` | Reemplazar queries + `admin.createUser()` |
| `src/pages/admin/AdminServices.jsx` | Reemplazar queries |
| `src/pages/admin/AdminPayments.jsx` | Reemplazar queries |
| `src/pages/admin/AdminAssignments.jsx` | Reemplazar queries |
| `src/utils/paymentUtils.js` | Reemplazar RPCs por lógica JS directa |
| `src/utils/pdfGenerator.js` | Reemplazar storage por descarga local o FormData |
| `src/utils/telemetry.js` | Eliminar o dejar stub vacío |
| `package.json` | Reemplazar dependencia `@supabase/supabase-js` → `pocketbase` |

### 4.6 Archivos a eliminar

- `src/lib/supabaseClient.js`
- `supabase/` (directorio completo con edge functions)
- `supabase_setup.sql`
- `migrations/` (directorio completo)
- `README_DEPLOY.md` (contiene instrucciones de Supabase)

---

## 5. Implementación de RPCs (Stored Procedures) en PocketBase

Los 3 RPCs de Supabase se implementan como funciones JS en el frontend:

### `createRecurringPayments(userServiceId, months)`
```js
export async function createRecurringPayments(userServiceId, months = 12) {
  const us = await pb.collection('user_services').getOne(userServiceId)
  const payments = []
  for (let i = 0; i < months; i++) {
    const paymentDate = new Date()
    paymentDate.setMonth(paymentDate.getMonth() + i)
    payments.push({
      user_service_id: userServiceId,
      user_id: us.user_id,
      amount: us.price || 0,
      payment_date: paymentDate.toISOString(),
      payment_method: 'transferencia',
      status: 'pending',
    })
  }
  const created = []
  for (const p of payments) {
    const record = await pb.collection('payments').create(p)
    created.push(record)
  }
  return { success: true, data: created }
}
```

### `updatePendingPaymentsAmount(userServiceId)`
```js
export async function updatePendingPaymentsAmount(userServiceId) {
  const us = await pb.collection('user_services').getOne(userServiceId)
  const payments = await pb.collection('payments').getFullList({
    filter: `user_service_id = "${userServiceId}" && status = "pending"`,
  })
  for (const p of payments) {
    await pb.collection('payments').update(p.id, { amount: us.price || 0 })
  }
  return { success: true }
}
```

### `getPaymentStats(userServiceId)`
```js
export async function getPaymentStats(userServiceId) {
  const payments = await pb.collection('payments').getFullList({
    filter: `user_service_id = "${userServiceId}"`,
  })
  const paid = payments.filter(p => p.status === 'paid')
  const pending = payments.filter(p => p.status === 'pending')
  const totalPaid = paid.reduce((s, p) => s + (parseFloat(p.amount) || 0), 0)
  return {
    success: true,
    data: {
      total_paid: paid.length,
      total_amount: totalPaid,
      pending_count: pending.length,
    },
  }
}
```

---

## 6. PocketBase Hook (para pagos recurrentes automáticos)

Crear `pb_hooks/create_recurring_payments.pb.js` en la raíz del servidor PocketBase:

```js
// Este hook se ejecuta cuando se crea un user_service con owner=1 (recurrente)
onRecordAfterCreate((e) => {
  const record = e.record
  if (record.get('owner') === 1 && record.get('price')) {
    const months = 12
    const price = record.get('price')
    const userId = record.get('user_id')
    const usId = record.getId()
    
    for (let i = 0; i < months; i++) {
      const paymentDate = new Date()
      paymentDate.setMonth(paymentDate.getMonth() + i)
      
      const collection = $app.dao().findCollectionByNameOrId('payments')
      const payment = new Record(collection, {
        user_service_id: usId,
        user_id: userId,
        amount: price,
        payment_date: paymentDate.toISOString(),
        payment_method: 'transferencia',
        status: 'pending',
      })
      $app.dao().saveRecord(payment)
    }
  }
}, 'user_services')
```

---

## 7. Script de migración de datos (Node.js)

Ejecutar este script localmente para migrar datos de Supabase a PocketBase:

```js
// migrate_data.js
// npm install @supabase/supabase-js pocketbase dotenv
import { createClient } from '@supabase/supabase-js'
import PocketBase from 'pocketbase'
import 'dotenv/config'

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)
const pb = new PocketBase(process.env.VITE_POCKETBASE_URL)

// Autenticarse como admin de PocketBase
await pb.admins.authWithPassword('admin@email.com', 'admin-password')

// 1. Migrar servicios
const { data: services } = await supabase.from('services').select('*')
for (const s of services) {
  await pb.collection('services').create({
    name: s.name,
    type: s.type || 'personalizado',
    price: s.price || 0,
    description: s.description || '',
  })
}
console.log(`Migrados ${services.length} servicios`)

// 2. Migrar usuarios (profiles + auth)
const { data: profiles } = await supabase.from('profiles').select('*')
for (const p of profiles) {
  // Primero crear el usuario auth
  const { data: authUser, error } = await supabase.auth.admin.getUserById(p.id)
  if (authUser?.user) {
    await pb.collection('users').create({
      id: p.id,
      email: authUser.user.email,
      password: 'temporal123', // Cambiar después
      passwordConfirm: 'temporal123',
      name: p.name,
      whatsapp: p.whatsapp || '',
      role: p.role || 'user',
      status: p.status || 'active',
      accesos: p.accesos || '',
    })
  }
}
console.log(`Migrados ${profiles.length} usuarios`)

// 3. Migrar user_services, payments, settings...
// (misma lógica, iterar y crear en PocketBase)

console.log('Migración completada')
```

---

## 8. Pasos para la migración

1. **Preparar PocketBase en el VPS**
   - Descargar el binario: https://pocketbase.io/docs/
   - Ejecutar: `./pocketbase serve --http=0.0.0.0:8090`
   - Crear el admin: `http://tu-vps:8090/_/`
   - Crear las colecciones con los campos indicados
   - Configurar las reglas de acceso (API Rules)

2. **Migrar datos** (opcional, si quieres mantener datos existentes)
   - Ejecutar el script `migrate_data.js`

3. **Actualizar el frontend**
   - Reemplazar variables de entorno
   - Actualizar dependencias
   - Modificar archivos según el mapa de equivalencias

4. **Probar**
   - Iniciar sesión, crear usuarios, asignar servicios, registrar pagos
   - Verificar que los PDFs se generan correctamente
   - Verificar que los filtros y búsquedas funcionan

5. **Hacer build y deploy**
   ```bash
   npm run build
   ```
   Subir la carpeta `dist/` a Netlify o al VPS

---

## 9. Tiempo estimado

| Actividad | Tiempo |
|---|---|
| Configurar PocketBase en VPS | 30 min |
| Crear colecciones y reglas | 20 min |
| Migrar código frontend | 2-3 horas |
| Migrar datos (si aplica) | 30 min |
| Pruebas y ajustes | 1-2 horas |
| **Total** | **4-6 horas** |


# Pasos para completar la migración a PocketBase

## 1. Crear colecciones en PocketBase

### Opción A: Importar JSON (recomendada)
1. Ve a **Collections > Import collections** en el Admin UI
2. Pega solo el JSON de las 4 colecciones nuevas (sin incluir `users` ni las internas):

```json
[
  {
    "id": "a1",
    "name": "services",
    "type": "base",
    "schema": [
      { "id": "s1", "name": "name", "type": "text", "required": true },
      { "id": "s2", "name": "type", "type": "text" },
      { "id": "s3", "name": "price", "type": "number" },
      { "id": "s4", "name": "description", "type": "text" }
    ],
    "listRule": "@request.auth.id != \"\"",
    "viewRule": "@request.auth.id != \"\"",
    "createRule": "@request.auth.role = \"admin\"",
    "updateRule": "@request.auth.role = \"admin\"",
    "deleteRule": "@request.auth.role = \"admin\""
  },
  {
    "id": "a2",
    "name": "user_services",
    "type": "base",
    "schema": [
      { "id": "us1", "name": "user_id", "type": "relation", "options": { "collectionId": "_pb_users_auth_", "maxSelect": 1 } },
      { "id": "us2", "name": "service_id", "type": "relation", "options": { "collectionId": "a1", "maxSelect": 1 } },
      { "id": "us3", "name": "price", "type": "number" },
      { "id": "us4", "name": "owner", "type": "number" },
      { "id": "us5", "name": "expires_at", "type": "date" },
      { "id": "us6", "name": "next_billing_date", "type": "date" },
      { "id": "us7", "name": "url_dominio", "type": "url" },
      { "id": "us8", "name": "accesos", "type": "editor" },
      { "id": "us9", "name": "notes", "type": "text" },
      { "id": "us10", "name": "billing_type", "type": "text" },
      { "id": "us11", "name": "no_expiry", "type": "bool" },
      { "id": "us12", "name": "status", "type": "text" }
    ],
    "listRule": "@request.auth.id = user_id.id || @request.auth.role = \"admin\"",
    "viewRule": "@request.auth.id = user_id.id || @request.auth.role = \"admin\"",
    "createRule": "@request.auth.role = \"admin\"",
    "updateRule": "@request.auth.role = \"admin\"",
    "deleteRule": "@request.auth.role = \"admin\""
  },
  {
    "id": "a3",
    "name": "payments",
    "type": "base",
    "schema": [
      { "id": "p1", "name": "user_id", "type": "relation", "options": { "collectionId": "_pb_users_auth_", "maxSelect": 1 } },
      { "id": "p2", "name": "user_service_id", "type": "relation", "options": { "collectionId": "a2", "maxSelect": 1 } },
      { "id": "p3", "name": "amount", "type": "number" },
      { "id": "p4", "name": "payment_date", "type": "date" },
      { "id": "p5", "name": "payment_method", "type": "text" },
      { "id": "p6", "name": "status", "type": "text" }
    ],
    "listRule": "@request.auth.id = user_id.id || @request.auth.role = \"admin\"",
    "viewRule": "@request.auth.id = user_id.id || @request.auth.role = \"admin\"",
    "createRule": "@request.auth.role = \"admin\"",
    "updateRule": "@request.auth.role = \"admin\"",
    "deleteRule": "@request.auth.role = \"admin\""
  },
  {
    "id": "a4",
    "name": "settings",
    "type": "base",
    "schema": [
      { "id": "st1", "name": "key", "type": "text", "required": true, "unique": true },
      { "id": "st2", "name": "value", "type": "text" }
    ],
    "listRule": "@request.auth.id != \"\"",
    "viewRule": "@request.auth.id != \"\"",
    "createRule": "@request.auth.role = \"admin\"",
    "updateRule": "@request.auth.role = \"admin\"",
    "deleteRule": "@request.auth.role = \"admin\""
  }
]
Opción B: Crear manual desde UI
Si el import falla, crea cada colección desde New collection con los campos indicados arriba.
2. Extender colección users
Ve a la colección users (la nativa) y agrega estos campos:
Campo	Tipo
whatsapp	Texto simple
role	Texto simple
status	Texto simple
accesos	Editor (rich)
Luego actualiza las API Rules de users:
Regla
List
View
Create
Update
Delete
3. Actualizar .env del frontend
En tu proyecto local, edita .env:
VITE_POCKETBASE_URL=https://pocketbase.nilspineda.com
4. Build del frontend
npm run build
Esto genera la carpeta dist/.
5. Desplegar
Opción A: Netlify
npx netlify deploy --prod --dir=dist
Opción B: En el VPS
# Subir dist/ al VPS y servir con nginx
6. (Opcional) Migrar datos desde Supabase
Si quieres migrar datos existentes, ejecuta el script de migración. Necesitas:
1. Las credenciales de Supabase (URL + service_role key)
2. Ejecutar: node migrate_data.js
El script está descrito en la sección 7 de MIGRACION_POCKETBASE.md.
7. Verificar
- Iniciar sesión como admin
- Crear un usuario desde el panel admin
- Asignar un servicio
- Registrar un pago
- Generar PDF
- Que los usuarios normales solo vean sus propios datos