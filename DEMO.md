# Demo con cookies HttpOnly y Render

## Sesión

El backend entrega el JWT en una cookie HttpOnly y nunca en el JSON del login. React
no lee ni guarda el JWT: mantiene el perfil en memoria y lo recupera de `/api/session`
al recargar. Esa ruta comprueba la membresía aceptada y devuelve un perfil sin claves.
Al entrar se eliminan los datos de autenticación que guardaban versiones anteriores
en localStorage. Quienes ya estaban conectados deben iniciar sesión otra vez.

La cookie dura una hora, usa SameSite=Lax y Path=/, y no declara Domain. En producción
se llama `__Host-comuni_session` y además usa Secure, por lo que requiere HTTPS.
En desarrollo HTTP se llama `comuni_session`. Cerrar sesión envía POST `/api/logout`
y borra la cookie desde el servidor; si la red falla, la pantalla informa el fallo y
permite reintentar. La firma JWT protege la integridad; no cifra el contenido.

Todas las llamadas de la app usan `credentials: include`. La API ya no admite Bearer:
scripts y pruebas deben usar la cookie y un Origin autorizado en operaciones de escritura.
El servidor comprueba el Origin en POST/PUT/PATCH/DELETE, incluidos login y logout;
rechaza orígenes ausentes, `null`, externos y solicitudes browser cross-site. CORS
permite credenciales únicamente para los orígenes configurados; nunca usa `*`.
Esto previene CSRF para los endpoints actuales y debe mantenerse al agregar rutas.
Las rutas GET no deben modificar datos.

HttpOnly evita leer el JWT con JavaScript, pero un XSS aún podría operar con la sesión
abierta. Se sirven cabeceras CSP, anti-framing y nosniff en producción. La duración es
fija y el logout borra la cookie del navegador: no hay una lista central de revocación.
Una copia robada de una cookie seguiría siendo válida hasta vencer. Para invalidar
todas las sesiones, cambiar JWT_SECRET y reiniciar. Revocar una membresía impide
restaurar esa sesión; se mantienen los controles de autorización de cada módulo.

No hace falta otra migración para las cookies. Deben estar aplicadas las migraciones
de Mercado y registro documentadas en `database/README.md` y `database/REGISTRO.md`.
Las claves de Supabase y JWT solo se configuran en el backend; nunca en variables
`VITE_*`. Reemplazar y revocar cualquier clave que se haya compartido previamente.

## Desarrollo local

Arrancar el backend en 4000 y Vite en 5173. Usar el mismo hostname para ambos
(`localhost` o `127.0.0.1`); el cliente utiliza automáticamente ese hostname y puerto
4000. APP_ORIGIN puede configurarse para otro origen exacto. Evitar barra final.
Si se usa VITE_API_URL, debe apuntar al backend con el mismo sitio.

En Windows con certificados de antivirus/proxy instalados en el almacén de confianza:

```bat
cd backend
node --use-system-ca src/server.js
```

Con Node 24, también puede habilitarse solo en esa terminal CMD:

```bat
set NODE_OPTIONS=--use-system-ca
npm run dev
```

Esto mantiene la validación TLS; no usar NODE_TLS_REJECT_UNAUTHORIZED=0. En Render no
se necesita la configuración de certificados de la PC.

## Publicar la demo

El archivo `render.yaml` prepara un único Web Service gratuito con Node 24: Express
sirve `frontend/dist` y `/api` bajo el mismo origen HTTPS. Supabase conserva la base y
las fotos. No configurar un Static Site separado ni VITE_API_URL para esta demo.

1. Fusionar la PR de cookies en **UXUAI.V2** antes del despliegue.
2. Entrar a Render con tu cuenta y conectar el repositorio GaelMizrahi/ComuniPlus.
3. Elegir **New → Blueprint**, seleccionar el repositorio y la rama **UXUAI.V2**.
   Confirmar el servicio y plan definidos en `render.yaml`.
4. Ingresar SUPABASE_URL (URL base, sin `/rest/v1`) y la clave privada vigente
   SUPABASE_SERVICE_ROLE_KEY en Render. JWT_SECRET se genera automáticamente.
   No pegarlos en el chat, en Git ni en el formulario de registro de la app.
5. Crear el Blueprint y esperar a que termine el build. Render proporciona una URL
   pública HTTPS y RENDER_EXTERNAL_URL, que la aplicación acepta como origen.
6. Abrir esa URL, iniciar sesión, recargar y comprobar que se conserva el ingreso.
   Probar Mercado, deportes, viajes y cerrar sesión. Abrir `/home` después de salir:
   debe volver al login.
7. Para comprobar la protección en DevTools: Application → Cookies debe mostrar
   `__Host-comuni_session` con HttpOnly, Secure y SameSite=Lax. No debe haber tokens
   en Local Storage ni en la respuesta JSON de `/api/login`. No compartir su valor.

Para un dominio propio, configurar APP_ORIGIN con su origen HTTPS exacto y entrar
siempre por ese dominio. El dominio predeterminado de Render dejará de ser un origen
autorizado para operaciones. No cambiar SameSite a None ni habilitar CORS con `*`.

El plan gratuito puede suspender el servicio por inactividad, por lo que la primera
carga puede tardar. Abrir la demo antes de presentarla. `autoDeploy` está desactivado:
publicar actualizaciones mediante **Manual Deploy → Deploy latest commit**. Si Render
no ofrece el plan gratuito para la cuenta, revisar el costo antes de crear el servicio.
Este archivo prepara el despliegue; la publicación y las credenciales se completan
desde tu cuenta de Render. No se creó un servicio externo desde este entorno.

## Verificación automatizada

Usar los runtimes externos descritos en `database/README.md` para evitar los módulos
de Windows versionados en el checkout. Copiar los fuentes actuales al runtime,
compilar frontend y levantar Vite en 127.0.0.1:5173 antes de las pruebas de navegador.

```bash
# En el directorio frontend del runtime:
npm run build
# Desde la raíz del repositorio:
BACKEND_RUNTIME=/workspace/comuniplus-runtime/backend PLAYWRIGHT_MODULE=/workspace/mercado-test-tools/node_modules/playwright/index.mjs node --test backend/test/registration.http.test.mjs
BACKEND_RUNTIME=/workspace/comuniplus-runtime/backend node --test backend/test/market.http.test.mjs
PLAYWRIGHT_MODULE=/workspace/mercado-test-tools/node_modules/playwright/index.mjs node frontend/test/registration.browser.mjs
PLAYWRIGHT_MODULE=/workspace/mercado-test-tools/node_modules/playwright/index.mjs node frontend/test/market.browser.mjs
```

La integración HTTP prueba cookies, CORS, CSRF, sesión vencida, membresía revocada y
servidor en modo producción sirviendo la SPA; Chromium comprueba login real contra
Express y Supabase simulado, recarga, ausencia del JWT en JavaScript y logout.
Las pruebas interceptadas de UI comprueban registro/aprobación y Mercado completos.
No usan credenciales reales ni sustituyen el ensayo final en la URL HTTPS de Render.
