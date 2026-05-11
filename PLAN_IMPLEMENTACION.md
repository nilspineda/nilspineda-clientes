# Sistema de Gestión de Clientes - Nilspineda

## Prompt Completo para Implementación

---

## ROLES Y AUTENTICACIÓN

- El admin crea clientes desde el panel de administración
- Al crear un cliente, se genera automáticamente usuario (email) y contraseña temporal
- El admin puede enviar por WhatsApp los datos de acceso al cliente
- Los clientes acceden con sus credenciales a un dashboard personal
- Cliente deshabilitado (status=suspended) ve pantalla de bloqueo con mensaje "Sus servicios están deshabilitados" + botón WhatsApp al admin

---

## DASHBOARD ADMIN (`/`)

### Estructura Visual

```
┌─────────────────────────────────────────────────────┐
│ Dashboard Admin                              [+ Nuevo Cliente] │
├─────────────────────────────────────────────────────┤
│ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ │
│ │ Clientes │ │Servicios │ │ Activos  │ │ Ingresos │ │
│ │    15    │ │    8     │ │   23     │ │ $450.000 │ │
│ └──────────┘ └──────────┘ └──────────┘ └──────────┘ │
├─────────────────────────────────────────────────────┤
│ ┌─ POR VENCER (20 días) ──────────────────────────┐ │
│ │ 🔴 Cliente  │ Hosting        │ 5 días   │ Ver   │ │
│ │ 🟠 Cliente  │ Dominio .com   │ 12 días  │ Ver   │ │
│ └─────────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────────┤
│ ┌─ TODOS LOS SERVICIOS ───────────────────────────┐ │
│ │ [Búsqueda] [Estado ▼] [Tipo ▼]                  │ │
│ ├─────────────────────────────────────────────────┤ │
│ │ Cliente │ Servicio │ Tipo   │ Vence  │ Días │ $ │ │
│ │─────────│──────────│────────│────────│──────│───│ │
│ └─────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────┘
```

### Componentes

| Componente | Descripción |
|------------|-------------|
| **Stats cards** | Clientes, Servicios base, Servicios activos, Ingresos totales |
| **Card "Por Vencer"** | Servicios en próximos 20 días, clickeable por cliente |
| **Tabla completa** | Todos los servicios con filtros (estado, tipo, búsqueda) |
| **Click en cliente** | Abre modal con detalles del cliente |
| **Quick actions** | Nuevo Cliente, Nuevo Servicio, Registrar Pago, Nueva Asignación |

---

## ADMIN: GESTIÓN DE CLIENTES (`/admin/users`)

### Listado de Clientes

- Cards o tabla con:
  - Nombre cliente
  - Botón WhatsApp directo (abre wa.me con número del cliente)
  - Toggle activar/desactivar
  - Botón editar → modal: nombre, WhatsApp, email

### Modal de Cliente (expandido)

Al hacer click en un cliente → Modal con tabs:
- **Tab "Servicios"**: Lista de servicios del cliente con editor lexical por cada uno (privado admin)
- **Tab "Pagos"**: Historial de pagos de este cliente con filtros
- **Botón "Añadir Servicio"**: Dropdown con servicios base + campos independientes (precio, fecha renovación, notes)

### Cada Servicio en Lista

- Nombre, precio, fecha renovación
- Badge estado (active/pending/suspended)
- Botón editar (inline)
- Editor lexical para guardar accesos (urls, credenciales, notas técnicas)

---

## ADMIN: GESTIÓN DE SERVICIOS (`/admin/services`)

### CRUD Completo

- Crear tipos de servicio base
- Campos: nombre, precio referencia, tipo (dominio/hosting/correo/membresía/personalizado), owner (0=admin paga, 1=cliente paga)
- Lista con botón editar y eliminar

### Tipos de Servicio

- Dominio
- Hosting
- Correo
- Membresía
- Personalizado

---

## ADMIN: GESTIÓN DE PAGOS (`/admin/payments`)

### Lista de Pagos

- Cliente, servicio pagado, monto, fecha, método, estado (badge)
- Filtros: por estado (pagado/pendiente), por rango de fechas

### CRUD Pagos

- Crear pago: seleccionar cliente, servicio, monto, fecha, método
- Editar pago existente
- Eliminar pago

---

## DASHBOARD CLIENTE (`/dashboard`)

### Vista Principal

- Header: nombre, estado cuenta (activos/pendientes/suspendidos)
- Servicios contratados en cards:
  - Nombre, tipo, precio, fecha renovación, días restantes, badge estado
- Panel soporte: link WhatsApp admin, email admin

### Perfil del Cliente

- Botón editar perfil: cambiar WhatsApp, email

### Historial de Pagos

- Visible para el cliente (solo lectura)

### Servicios Deshabilitados

- Si status=suspended → todos los servicios disabled
- Mensaje "Sus servicios están deshabilitados"
- Botón WhatsApp para contactar admin

---

## SCHEMA DE BASE DE DATOS

### Tabla `profiles`

| Columna | Tipo | Descripción |
|---------|------|-------------|
| id | uuid | PK, referencia auth.users |
| name | text | Nombre del cliente |
| whatsapp | text | Número de WhatsApp |
| email | text | Email del cliente |
| status | text | 'active' o 'suspended' |
| created_at | timestamp | |

### Tabla `services`

| Columna | Tipo | Descripción |
|---------|------|-------------|
| id | uuid | PK |
| name | text | Nombre del servicio base |
| price | numeric | Precio de referencia |
| type | text | dominio, hosting, correo, membresia, personalizado |
| owner | integer | 0 = admin paga, 1 = cliente paga |
| created_at | timestamp | |

### Tabla `user_services`

| Columna | Tipo | Descripción |
|---------|------|-------------|
| id | uuid | PK |
| user_id | uuid | FK profiles |
| service_id | uuid | FK services |
| name | text | Nombre personalizado |
| price | numeric | Precio cobrado al cliente |
| owner | integer | 0 = admin paga, 1 = cliente paga |
| expires_at | timestamp | Fecha de renovación |
| next_billing_date | timestamp | Próximo cobro al cliente |
| url_dominio | text | URL del dominio |
| notes | text | Observaciones |
| status | text | 'active', 'pending', 'suspended' |
| created_at | timestamp | |

### Tabla `payments`

| Columna | Tipo | Descripción |
|---------|------|-------------|
| id | uuid | PK |
| user_id | uuid | FK profiles |
| service_id | uuid | FK user_services |
| amount | numeric | Monto del pago |
| payment_date | timestamp | Fecha del pago |
| payment_method | text | Método de pago |
| status | text | 'paid', 'pending' |
| created_at | timestamp | |

### Tabla `user_services_accesos`

| Columna | Tipo | Descripción |
|---------|------|-------------|
| id | uuid | PK |
| user_service_id | uuid | FK user_services |
| content | text | Contenido del editor lexical |
| updated_at | timestamp | |

---

## SQL DE MIGRACIÓN

```sql
-- 1. Agregar columnas faltantes a profiles
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS whatsapp text,
ADD COLUMN IF NOT EXISTS email text,
ADD COLUMN IF NOT EXISTS status text DEFAULT 'active';

-- 2. Agregar columnas a services
ALTER TABLE services 
ADD COLUMN IF NOT EXISTS type text DEFAULT 'servicio',
ADD COLUMN IF NOT EXISTS owner integer DEFAULT 0;

-- 3. Agregar columnas a user_services
ALTER TABLE user_services 
ADD COLUMN IF NOT EXISTS name text,
ADD COLUMN IF NOT EXISTS owner integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS next_billing_date timestamp,
ADD COLUMN IF NOT EXISTS notes text,
ADD COLUMN IF NOT EXISTS url_dominio text,
ADD COLUMN IF NOT EXISTS status text DEFAULT 'active';

-- 4. Crear tabla payments si no existe
CREATE TABLE IF NOT EXISTS payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  service_id uuid REFERENCES user_services(id) ON DELETE SET NULL,
  amount numeric,
  payment_date timestamp DEFAULT now(),
  payment_method text,
  status text DEFAULT 'paid',
  created_at timestamp DEFAULT now()
);

-- 5. Crear tabla para accesses del editor lexical
CREATE TABLE IF NOT EXISTS user_services_accesos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_service_id uuid REFERENCES user_services(id) ON DELETE CASCADE,
  content text,
  updated_at timestamp DEFAULT now()
);

-- 6. Índices para rendimiento
CREATE INDEX IF NOT EXISTS idx_profiles_status ON profiles(status);
CREATE INDEX IF NOT EXISTS idx_services_type ON services(type);
CREATE INDEX IF NOT EXISTS idx_user_services_user_id ON user_services(user_id);
CREATE INDEX IF NOT EXISTS idx_user_services_expires_at ON user_services(expires_at);
CREATE INDEX IF NOT EXISTS idx_user_services_status ON user_services(status);
CREATE INDEX IF NOT EXISTS idx_payments_user_id ON payments(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_service_id ON payments(service_id);
CREATE INDEX IF NOT EXISTS idx_payments_payment_date ON payments(payment_date);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
```

---

## RUTAS DEL SISTEMA

| Ruta | Componente | Descripción |
|------|------------|-------------|
| `/` | Home | Landing page |
| `/login` | Login | Página de login |
| `/dashboard` | Dashboard | Dashboard del cliente |
| `/admin` | AdminIndex | Dashboard del admin |
| `/admin/users` | AdminUsers | Gestión de clientes |
| `/admin/services` | AdminServices | Gestión de servicios base |
| `/admin/payments` | AdminPayments | Gestión de pagos |
| `/admin/assignments` | AdminAssignments | Gestión de asignaciones |

---

## ESTADO DE IMPLEMENTACIÓN

| Componente | Estado | Prioridad |
|------------|--------|-----------|
| Login | ✅ Implementado | - |
| Admin Dashboard | 🔄 En desarrollo | Alta |
| Admin Users | ❌ Por hacer | Alta |
| Admin Services | ❌ Por hacer | Alta |
| Admin Payments | ❌ Por hacer | Alta |
| Admin Assignments | ❌ Por hacer | Media |
| Client Dashboard | ❌ Por hacer | Alta |
| Schema DB | ✅ SQL listo | - |

---

## NOTAS

1. El admin ejecuta el SQL manualmente en Supabase Dashboard → SQL Editor
2. Los cambios en frontend se implementan según el plan
3. Se mantiene el diseño actual de las cards
4. Filtros: estado (active/pending/suspended) y tipo (dominio/hosting/correo/membresía)
5. Click en cliente abre modal con detalles
6. Editor lexical es privado solo para admin