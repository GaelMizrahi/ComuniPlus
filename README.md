````markdown
# Comuni+ MVP

Para la demo con sesión en cookies HttpOnly y frontend/backend juntos en Render,
seguir [DEMO.md](DEMO.md). El token ya no se entrega a React ni se guarda en localStorage.

<!-- Cambio mínimo para actualizar esta rama con los últimos ajustes del MVP. -->

Base inicial del MVP de Comuni+ con:
- Frontend React + JavaScript
- Backend Node + Express
- Backend conectado a Supabase con login manual y JWT propio

## Alcance MVP (fase actual)
- Login contra usuarios existentes en Supabase con JWT para rutas privadas
- Landing post-login
- Transporte/Carpooling funcional
- Solicitar viaje funcional
- Reservas de viajes funcional


## Supabase (nuevo)
Backend ahora lee/escribe en Supabase usando estas variables de entorno en `backend/.env`:
- `SUPABASE_URL` (URL base del proyecto, sin `/rest/v1`)
- `SUPABASE_SERVICE_ROLE_KEY`
- `JWT_SECRET` (secreto privado para firmar tokens JWT)
- `PORT` (opcional, por defecto `4000`)

`backend/.env` queda ignorado por Git porque contiene secretos. Para configurarlo:
```bash
cd backend
cp .env.example .env
# completar SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY y JWT_SECRET en .env
```

Frontend consume el backend desde `VITE_API_URL`; si no está definida usa `http://localhost:4000`.

Ejemplo:
```bash
cd backend
npm run dev

# En otra terminal:
cd frontend
# opcional si tu backend no corre en 4000:
# VITE_API_URL=http://localhost:4000 npm start
npm start
```


## Diagnóstico de conexión Supabase
Con el backend levantado, podés verificar que la conexión y las tablas principales respondan con:
```bash
GET http://localhost:4000/health
GET http://localhost:4000/api/debug/supabase
```

`/api/debug/supabase` no devuelve secretos: solo confirma el proyecto y cuenta filas en `Usuario`, `Comunidad`, `ComunidadUsuario`, `solicitudViaje` y `Viaje`.

## Mercado por comunidad

El registro de cuentas con solicitud de acceso está disponible desde Login. Cada
comunidad aprueba sus miembros desde Perfil → Solicitudes de acceso. Antes de usar
el nuevo login y registro, aplicar [database/registro_migration.sql](database/registro_migration.sql)
y seguir [las instrucciones de registro](database/REGISTRO.md).

Disponible desde Inicio y la navegación inferior, con publicaciones de productos y
propiedades, una foto, filtros, detalle y WhatsApp, Mis publicaciones y Mis likes.
El backend valida la membresía de la comunidad seleccionada en el JWT en cada request.
Los likes se pueden poner y quitar. Las publicaciones pueden guardarse ocultas o
mostrarse con fechas y horas Desde/Hasta, ambas opcionales. El backend aplica la
visibilidad en cada consulta, detalle y like. Los cambios usan RPC con validación de membresía.

Antes de usarlo con datos reales, revisar y aplicar la migración sobre el Supabase
existente y verificar permisos, administradores y Storage. Las instrucciones y pruebas
están en [database/README.md](database/README.md); el esquema de diagnóstico compartido
no se debe ejecutar como migración.
## Implementación de React Context (Trabajo práctico)

Se implementó React Context para gestionar el estado compartido relacionado con los filtros deportivos en la sección de Reservas.

- **Datos compartidos:** `sports` (lista de deportes), `selectedSport` (deporte seleccionado), y sus setters `setSports` y `setSelectedSport`.
- **Ruta y archivo del Context:** `frontend/src/context/DeportesContext.jsx`.
- **Provider (componente contenedor):** `DeportesProvider` — envuelve la aplicación en `frontend/src/main.jsx`.
- **Componentes que consumen el Context (mediante `useContext` / `useDeportes`):**
  - `frontend/src/components/deportes/SportFilter.jsx`
  - `frontend/src/pages/deportes/Reservas.jsx`

**Justificación técnica:**

- Evita el prop-drilling entre componentes que necesitan conocer o modificar el deporte seleccionado (por ejemplo, pasar `selectedSport` desde páginas padre hasta filtros hijos).
- Centraliza el estado del filtro deportivo de modo que múltiples pantallas o componentes puedan leer y actualizar la selección sin acoplamientos innecesarios.
- El Context se integra funcionalmente: `Reservas.jsx` usa `selectedSport` para solicitar canchas (`getDeportes`) y `SportFilter.jsx` actualiza la selección; además `selectedSport` se envía al backend al confirmar una reserva si la cancha no define su deporte.

**Notas de entrega (criterios del TP):**

- El Context no es vacío ni artificial: contiene estado real usado por el flujo de reservas.
- Archivo del Context: [frontend/src/context/DeportesContext.jsx](frontend/src/context/DeportesContext.jsx#L1-L200)
- Provider ubicado en: [frontend/src/main.jsx](frontend/src/main.jsx#L1-L200)
- Componentes consumidores: [frontend/src/components/deportes/SportFilter.jsx](frontend/src/components/deportes/SportFilter.jsx#L1-L200), [frontend/src/pages/deportes/Reservas.jsx](frontend/src/pages/deportes/Reservas.jsx#L1-L220)

Si querés, puedo también migrar otras pantallas que actualmente mantienen su propio `selectedSport` local (por ejemplo `frontend/src/pages/deportes/FaltaJugador.jsx`) para que consuman el mismo Context y así unificar la experiencia global de filtros.

````
