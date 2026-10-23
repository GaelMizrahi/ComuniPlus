# Mercado en el Supabase existente

La aplicación usa el JWT propio del backend y nunca consulta Supabase desde React.
La comunidad se toma de la sesión firmada y se comprueba de nuevo en `ComunidadUsuario`
por `id`, `idUsuario`, `idComunidad` y `aceptado` en cada request de Mercado.
No se agrega `Producto.idComunidad`, no se reutiliza `Reserva` y no se recrean tablas.

## Aplicar y comprobar

1. Revisar el esquema actual y hacer el respaldo habitual de la base.
2. Ejecutar `mercado_migration.sql` en el SQL editor del proyecto existente, como
   propietario. La transacción se puede repetir; cualquier dato anterior incompatible
   con los checks o el índice único hace fallar la transacción sin borrar datos.
3. Ejecutar `mercado_verify.sql`: confirmar la FK **compuesta** de Administrador,
   el índice único parcial, las tres RPC y su ejecución exclusiva por `service_role`.
   Resolver cualquier venta antigua inconsistente antes de usarla en Mercado.
4. Asignar explícitamente un `idComunidadUsuario` real a cada administrador pendiente.
   Las filas con NULL no dan permisos; la FK rechaza membresías de otra comunidad.
   Clasificar cada comunidad con `tipo = escuela | country | otro` según corresponda.
5. Configurar `SUPABASE_URL` sin `/rest/v1`, `SUPABASE_SERVICE_ROLE_KEY` y `JWT_SECRET`
   de forma segura en el backend. No guardar sus valores en Git ni en el frontend.

La migración amplía `Producto.precio` de bigint a numeric (admite centavos), agrega
`eliminadoEn` para eliminar sin romper las FK ni perder historial, y configura el bucket
`mercado` para una foto pública JPEG/PNG/WebP de hasta 5 MB. Como se pidió, las imágenes
tienen URL pública: cualquier persona que conozca esa URL puede leer el archivo; los
datos y las operaciones de las publicaciones siguen protegidos por comunidad.
Solo el backend puede escribir en el bucket. Se revocan accesos de clientes directos
a Producto/Venta y escrituras directas a las tablas de membresías y administradores.
Esto corresponde al modelo actual, donde el frontend usa únicamente Express.

Las mutaciones usan RPC con `FOR UPDATE` sobre el producto. Reservar verifica ambas
membresías, comunidad, identidad del usuario y disponibilidad, inserta Venta y cambia
Producto en una transacción. El índice parcial impide otra reserva activa incluso ante
un error de un escritor externo. Editar, vender y eliminar usan el mismo bloqueo:
vender completa la reserva; eliminar la cancela y conserva el historial.
Los archivos se suben antes de guardar y se limpian después de un rechazo definitivo.
Una respuesta de red perdida puede dejar un archivo huérfano: se conserva para evitar
borrar una imagen cuya transacción pudo haber confirmado. Su limpieza requiere revisar
referencias de Producto antes de eliminar archivos de Storage.

## Desarrollo y pruebas

El repositorio versiona node_modules con binarios de Windows. En este entorno Linux
se instalaron los dos lockfiles fuera del checkout, en `/workspace/comuniplus-runtime`.
El `install_script` guardado en el entorno refresca las copias de código e instala con
`npm ci`; después de editar fuentes en el checkout, refrescar la copia y reiniciar los
servicios. Los comandos normales en una instalación limpia son `npm ci` en cada
componente, `npm start` en backend/frontend y `npm run build` en frontend.

Pruebas de servicio, validación, permisos y filtros (sin credenciales):

```bash
node --test backend/test/market.test.mjs
# Servidor Express real + middleware JWT y cliente Supabase contra stub local:
BACKEND_RUNTIME=/workspace/comuniplus-runtime/backend node --test backend/test/market.http.test.mjs
```

Pruebas de migración y RPC con PostgreSQL aislado mediante PGlite, instalado fuera del
checkout para no tocar las dependencias de la aplicación:

```bash
npm install --prefix /tmp/mercado-test-tools --no-audit --no-fund @electric-sql/pglite@0.3.14
PGLITE_MODULE=/tmp/mercado-test-tools/node_modules/@electric-sql/pglite/dist/index.js node --test database/mercado.test.mjs
```

El test aplica dos veces la migración y comprueba estados, FK, permisos, RLS y Storage.
PGlite serializa una sola conexión: sus llamadas simultáneas no sustituyen una prueba
de contención con conexiones independientes en Supabase.

Con credenciales y migración reales, verificar login de dos miembros de una comunidad,
publicar/editar una foto, búsqueda, filtros, WhatsApp, una reserva y venta completada.
Desde otro usuario y otra comunidad, intentar detalle, edición, reserva y eliminación
por ID; deben devolver 404/403. Comprobar también membresía revocada y administrador de
otra comunidad. Enviar dos reservas simultáneas desde **conexiones independientes**:
solo una debe confirmar. No hacer estas pruebas con publicaciones o usuarios reales
sin preparar datos de prueba controlados.

Las pruebas de navegador en `frontend/test/market.browser.mjs` usan Chromium y un API
interceptado con datos ficticios; comprueban UI, no una conexión real a Supabase:

```bash
npm install --prefix /tmp/mercado-test-tools --no-audit --no-fund playwright@1.56.1
# Con Vite ejecutándose en 127.0.0.1:5173:
PLAYWRIGHT_MODULE=/tmp/mercado-test-tools/node_modules/playwright/index.mjs node frontend/test/market.browser.mjs
```
