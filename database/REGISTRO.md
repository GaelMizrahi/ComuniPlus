# Registro y aprobación por comunidad

La pantalla **Crear cuenta**, desde Login, pide nombre, apellido, email, teléfono,
comunidad existente, número de socio y contraseña con confirmación. Valida la sintaxis
del email y su unicidad sin distinguir mayúsculas. El teléfono admite formato
internacional con `+` y código de país; se conserva como bigint en el esquema existente.
No se envían correos, SMS ni códigos de verificación. Estas validaciones no acreditan
la titularidad del email ni del teléfono.

## Aplicar en el Supabase existente

1. Ejecutar `registro_preflight.sql` en el SQL Editor. Si hay emails duplicados,
   revisar esas cuentas antes de continuar. El diagnóstico solo devuelve su cantidad.
2. Ejecutar **`registro_migration.sql`** como propietario. Es una transacción repetible:
   agrega campos, índice y funciones sin borrar usuarios ni cambiar sus aprobaciones.
   Los duplicados detienen la transacción; no se fusionan cuentas automáticamente.
3. Repetir `registro_preflight.sql`: deben aparecer las tres columnas esperadas,
   las tres funciones con `listo=true`, `email_unico=true` y `credenciales_privadas=true`.
4. Confirmar que cada administrador tenga `Administrador.idComunidadUsuario` apuntando
   a su membresía aceptada en **la misma comunidad**. El diagnóstico enumera los que
   requieren revisión. Una fila con NULL no concede permisos. Vincular solo a la
   persona autorizada y no modificar `aceptado` de los solicitantes para otorgar roles.
5. Reiniciar el backend y usar el frontend actualizado. Se mantienen las variables
   existentes `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` y `JWT_SECRET` del backend;
   no se requieren claves ni proveedores nuevos. No usar claves públicas de Supabase
   para el backend ni guardar secretos en React.

Ejemplo de vinculación **manual**, reemplazando ambos marcadores después de verificar
la identidad y la comunidad (no ejecutar literalmente):

```sql
-- UPDATE public."Administrador" a
-- SET "idComunidadUsuario"=m.id
-- FROM public."ComunidadUsuario" m
-- WHERE a.id=<ID_ADMIN_EXISTENTE> AND m.id=<ID_MEMBRESIA_AUTORIZADA>
--   AND m."idComunidad"=a."idComunidad" AND m.aceptado;
```

## Comportamiento

Cuenta y solicitud se crean juntas: si falla cualquiera, no queda una cuenta huérfana.
Todas las solicitudes nacen pendientes, sin JWT ni sesión. Un administrador entra en
**Perfil → Solicitudes de acceso** y aprueba o rechaza las de su comunidad. El backend
comprueba nuevamente la membresía y el rol en cada operación. La decisión es atómica;
una solicitud ya resuelta no se vuelve a decidir desde esta pantalla.

El usuario aprobado inicia sesión normalmente; el pendiente o rechazado ve su estado
al intentar entrar. No hay avisos por correo ni SMS. Las solicitudes rechazadas se
conservan; volver a registrarse con el mismo email no crea otra cuenta. El registro
no agrega comunidades a cuentas existentes. Si un usuario ya tiene varias membresías,
el login utiliza la primera aceptada, como en el flujo existente.

Las contraseñas nuevas tienen entre 12 y 128 caracteres y se almacenan con scrypt,
sal aleatoria y comparación segura. Las cuentas antiguas pueden seguir entrando:
su contraseña se convierte a hash después de comprobarla correctamente. Se conserva
la tolerancia histórica a espacios alrededor de claves antiguas; las nuevas se
comparan exactamente. Nunca se devuelve la contraseña en la respuesta.

La migración impide acceso directo de clientes Supabase a Usuario y escrituras a
membresías y administradores: la aplicación utiliza su propio JWT y pasa por Express.
El login limita a 30 intentos y el registro a 10 por IP cada 15 minutos, por proceso.

## Pruebas

Desde la raíz, con las dependencias del backend disponibles:

```bash
node --test backend/test/registration.test.mjs
BACKEND_RUNTIME=/workspace/comuniplus-runtime/backend node --test backend/test/registration.http.test.mjs
PGLITE_MODULE=/workspace/mercado-test-tools/node_modules/@electric-sql/pglite/dist/index.js node --test database/registro.test.mjs
# Con Vite en 127.0.0.1:5173 y Chromium instalado:
PLAYWRIGHT_MODULE=/workspace/mercado-test-tools/node_modules/playwright/index.mjs node frontend/test/registration.browser.mjs
```

Los runtimes externos evitan modificar los node_modules de Windows versionados en el
repositorio. PGlite y Playwright se instalan fuera del checkout; ver `database/README.md`.
Las pruebas de HTTP y navegador usan datos ficticios y la migración usa PostgreSQL
aislado. No sustituyen la comprobación con Supabase: después de migrar, crear una
cuenta de prueba, comprobar el bloqueo pendiente, aprobarla con el administrador y
confirmar el login. Repetir con otra solicitud rechazada y un administrador de otra
comunidad. No se aplicó SQL a tu base remota desde este entorno.
