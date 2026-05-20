Instrucciones de despliegue y verificación

1) Objetivo
- Evitar que los usuarios queden con la app en "cargando infinito" por servir un `index.html` obsoleto desde cache/CDN.

2) Qué cambié en el repo
- `public/_headers`: reglas para que `index.html` no se cachee y los assets estáticos se cacheen largo tiempo.
- `src/utils/telemetry.js`: util ligero para enviar eventos a un endpoint (si usas `VITE_TELEMETRY_ENDPOINT`).
- `src/hooks/useAuth.jsx`: envío de eventos de error de auth/profile.
- `src/App.jsx`: en el arranque intenta recuperar `/index.html` y reporta `Cache-Control`/`ETag` si `VITE_TELEMETRY_ENDPOINT` está configurado.

3) Pasos para desplegar (Netlify / hosting estático)
- Asegúrate de que el build incluya `public/_headers` y `public/_redirects`.
- Si usas Netlify, estos archivos configuran las cabeceras automáticamente.
- En tu panel de Netlify (o en la configuración del proveedor), despliega la rama `main` (o la rama que uses).

4) Variables de entorno opcionales
- `VITE_TELEMETRY_ENDPOINT`: URL de recepción de eventos (procesará JSON con `event`, `payload`, `ts`, `href`).
  - Si la configuras, la app enviará eventos cuando falle la obtención de sesión/perfil y cuando recupere las cabeceras de `index.html`.

5) Cómo verificar después del despliegue
- Ejecuta desde tu terminal:

```bash
curl -I https://clientes.nilspineda.com/
curl -I https://clientes.nilspineda.com/index.html
```

- `index.html` debe responder con `Cache-Control: public, max-age=0, must-revalidate` (o equivalente `no-cache`).
- Los assets (`*.js`, `*.css`, `/assets/*`) deben tener `Cache-Control` con `max-age=31536000, immutable`.
- Abre DevTools → Network en un navegador y recarga la página sin limpiar cache: revisa `index.html` y que su `Status` sea `200` y no provenga de cache obsoleto.

6) Si el problema persiste
- Deshabilita temporalmente cualquier CDN o proxy y prueba directo al hosting.
- Forzar `index.html` sin cache (Netlify: purge cache / activar `Clear cache and deploy`).
- Habilitar `VITE_TELEMETRY_ENDPOINT` y compartir los eventos que recoja (o revisa el endpoint) para identificar qué `Cache-Control`/`ETag` están llegando a los clientes que experimentan el bug.

7) Commits / PR
- Yo puedo preparar un branch y un PR con estos cambios si quieres. Dime si quieres que cree el PR desde aquí (te daré pasos para crear la rama y push localmente si no tengo acceso a tu remoto).

