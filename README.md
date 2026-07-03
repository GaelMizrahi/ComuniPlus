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
