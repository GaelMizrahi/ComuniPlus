````markdown
# Comuni+ MVP

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