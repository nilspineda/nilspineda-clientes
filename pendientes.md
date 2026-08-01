# Pendientes 
- [x] Revisar version Mobile optimizado, porque todo queda desfasado con scroll horizontal que no me gusta. *(Resuelto: todas las vistas usan bento grid `grid-cols-1 md:grid-cols-3`, sin scroll horizontal)*
- [x] Revisar que el fetch de `whatsapp_support` y `admin_email` desde `settings` funcione correctamente en todos los layouts/login (crear los registros en PocketBase si no existen) *(Implementado en Login, DashboardLayout y AdminLayout con fallback por defecto; falta solo crear/verificar los registros en PocketBase si aún no existen)*
- [x] Dashboard "Renovaciones Próximas": confirmar que la vista en lista vertical (sin grid) se ve bien en móvil *(Grid colapsa a 1 columna en móvil)*
- [x] Verificar comportamiento de tablas responsive en tablets (`md:` breakpoint) *(Se eliminaron las tablas, todo quedó en bento grid con cards; componente ui/table.jsx ya no se usa)*
- [x] Probar login con el nuevo bloque de soporte visible
- [ ] Evaluar si `AdminIndex.jsx` y `AdminAssignments.jsx` son huérfanos y se pueden eliminar *(Confirmado: no se importan ni se enrutan en App.jsx; pendiente decidir si se eliminan)*
