-- ============================================================================
-- FIX: Restaurar acceso admin para nilspineda@gmail.com
-- ============================================================================

-- 1. Forzar rol admin para nilspineda@gmail.com
UPDATE profiles 
SET role = 'admin' 
WHERE email = 'nilspineda@gmail.com' OR email = 'admin@nilspineda.com' OR email LIKE '%nilspineda%';

-- 2. Verificar todos los admins
SELECT id, email, name, role, active FROM profiles WHERE role = 'admin';

-- 3. Verificar si existe tu perfil
SELECT id, email, name, role FROM profiles WHERE email = 'nilspineda@gmail.com';

-- 4. Ver todos los perfiles
SELECT id, email, name, role FROM profiles LIMIT 10;