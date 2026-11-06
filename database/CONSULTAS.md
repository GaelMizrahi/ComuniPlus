# Consultas privadas y mensajes generales

Consultas se habilita en Inicio. Un socio abre su conversación privada con la
administración de su comunidad. Los administradores autorizados de ese mismo club
comparten la bandeja de conversaciones, pueden responder a cada socio y enviar
un comunicado general. Ningún socio puede listar o abrir chats de otro socio,
incluidos los del mismo club, ni de otras comunidades.

## Aplicar

1. Fusionar los cambios en UXUAI.V2 y actualizar backend/frontend.
2. Ejecutar **consultas_migration.sql** en Supabase SQL Editor como propietario.
   Se basa en el esquema actual con la FK compuesta de ComunidadUsuario del Mercado.
   Agrega ConsultaConversacion, ConsultaMensaje y ConsultaDifusion, índices y tres
   RPC. Activa RLS y bloquea el acceso directo de anon/authenticated. Solo Express,
   mediante service_role y la cookie de sesión propia, puede leer los datos.
3. Ejecutar **consultas_preflight.sql**: todos los indicadores deben ser true.
4. Reiniciar los servicios (o desplegar los cambios en Render), entrar como socio y
   abrir Consultas. Entrar como administrador del mismo club para ver y responder.

La migración es repetible y conserva mensajes anteriores. No crea administradores
ni mensajes de demo. No hace falta repetir cargas de clubes, socios, noticias o logos.
Las cuentas de demo continúan con sus roles existentes. Si un club todavía no tiene
administrador vinculado a una membresía aceptada, el socio puede dejar su consulta y
verá un aviso; cuando haya un administrador autorizado, la verá en su bandeja.
Para vincular correctamente al administrador existente, seguir REGISTRO.md.
No compartir valores de claves, cookies ni mensajes privados en capturas públicas.

## Funcionamiento

Se guarda una conversación por membresía del club. El socio solo abre la propia;
el administrador solo accede a las de su comunidad. La autorización usa la membresía
exacta de la sesión y no la primera comunidad del usuario. Los cambios de rol o de
aceptación se comprueban de nuevo en cada petición, y otra vez en las RPC de escritura.
Los IDs de remitente, comunidad, destinatarios y rol enviados por el navegador se
ignoran. No se guarda ni devuelve el JWT en JavaScript.

Los mensajes son texto plano de 1 a 3000 caracteres, con fecha, autor y marca de
administración guardados al enviarlos. La vista conserva el historial y permite
cargar páginas anteriores de 50 mensajes. Mientras la pestaña está visible, actualiza
el chat cada 5 segundos y la bandeja de administración cada 10 segundos; al volver a
la pestaña, consulta de inmediato. No requiere Realtime, WebSocket, correo ni SMS.

“Mensaje a todos” pide confirmación e informa la cantidad de destinatarios. El servidor
calcula la audiencia en el momento del envío: todas las membresías aceptadas del mismo
club, excepto las de la propia cuenta administradora. Incluye a otros administradores
aceptados, excluye solicitudes pendientes y otros clubes, y no entrega retroactivamente
comunicados antiguos a quienes se incorporen después. Cada destinatario recibe una
copia en su chat, incluso si nunca lo abrió. Sus respuestas permanecen en esa conversación;
no es un grupo de socios. Si hay varias membresías de otra persona en el mismo club,
la entrega se hace a cada membresía, respetando el modelo existente.

Las difusiones se escriben en una transacción: se entregan todas las copias o ninguna.
Cada solicitud lleva un UUID para que reintentar el mismo envío no lo duplique.
El mismo UUID no puede reutilizarse con otro texto. El formulario conserva ese UUID
ante un error de red mientras el mismo borrador siga abierto; una recarga descarta
el borrador. Estas garantías no equivalen a deduplicar mensajes idénticos enviados
intencionalmente como solicitudes nuevas.

Los administradores pueden consultar el historial de un socio inactivo, pero no
enviarle mensajes nuevos. Un socio revocado no puede acceder a su chat. No se borran
mensajes al quitar un rol. Los errores del servidor no registran el contenido privado.

## Verificar

Con un socio A y otro socio B del mismo club y un administrador autorizado:

- A envía una consulta; solo A y los administradores de su club pueden abrirla.
- El administrador responde; A ve la respuesta sin recargar la página.
- B no puede abrir la conversación de A por URL ni por API.
- El administrador envía un comunicado; A y B lo reciben por separado.
- La respuesta de A al comunicado no aparece en el chat de B.
- Un usuario o administrador de otro club no ve esos chats ni recibe ese comunicado.

Pruebas automatizadas con los runtimes externos documentados en DEMO.md:

```bash
node --test backend/test/consultas.test.mjs
PGLITE_MODULE=/workspace/clubes-test-tools/node_modules/@electric-sql/pglite/dist/index.js node --test database/consultas.test.mjs
BACKEND_RUNTIME=/workspace/comuniplus-runtime/backend node --test backend/test/community.http.test.mjs
# Con Vite en 127.0.0.1:5173:
PLAYWRIGHT_MODULE=/workspace/clubes-test-tools/node_modules/playwright/index.mjs node frontend/test/consultas.browser.mjs
```

PostgreSQL/PGlite comprueba aislamiento de escritura, revocación, idempotencia,
difusión sin entregas parciales y privilegios. Usa una conexión aislada; no reemplaza
una prueba de concurrencia con conexiones independientes en Supabase. HTTP comprueba
cookies, controles de lectura, cursores y autor derivado de la sesión contra stub local.
Chromium comprueba conversación, respuesta automática, privacidad, difusión y móvil.
No se ejecutó SQL ni se enviaron mensajes en el Supabase remoto desde este entorno.
