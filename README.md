# Comuni+ MVP

Base inicial del MVP de Comuni+ con:
- Frontend React + JavaScript
- Backend Node + Express
- Estructura preparada para integrar Supabase (sin Auth para login)

## Alcance MVP (fase actual)
- Login sin Auth (validación manual contra 3 usuarios pre-cargados)
- Landing post-login hardcodeada
- Transporte/Carpooling funcional
- Solicitar viaje funcional
- Reservas de viajes funcional


## Supabase (nuevo)
Backend ahora lee/escribe en Supabase usando estas variables de entorno:
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

Ejemplo:
```bash
cd backend
SUPABASE_URL="https://<project>.supabase.co" \
SUPABASE_SERVICE_ROLE_KEY="<service_role_key>" \
npm run dev
```
