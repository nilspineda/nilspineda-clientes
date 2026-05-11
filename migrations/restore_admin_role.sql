-- Restaurar rol de admin para nilspineda@gmail.com
UPDATE profiles 
SET role = 'admin' 
WHERE email = 'nilspineda@gmail.com';

-- Verificar
SELECT id, name, email, role FROM profiles WHERE email = 'nilspineda@gmail.com';