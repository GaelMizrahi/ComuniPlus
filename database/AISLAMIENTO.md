# Datos separados por club

Todos los clubes utilizan los módulos de la app con sus propios datos. La comunidad
sale de la cookie firmada y se vuelve a comprobar en ComunidadUsuario por ID de
membresía, usuario, comunidad y aceptado=true. No se toma del formulario ni se busca
la primera comunidad del usuario. Mercado conserva su comprobación equivalente.

- Canchas: listado, consulta de horarios y creación de reservas requieren una cancha
  del club activo. Mis reservas comprueba la membresía y la comunidad de la cancha,
  incluso ante enlaces históricos inconsistentes. Cancelar requiere la reserva propia.
- Partidos: el club se determina mediante la membresía del creador. Unirse y eliminar
  verifican ese club; solo el creador elimina el partido. También se protegen los
  endpoints históricos de FaltaJugadorPartido.
- Transporte: solicitudes, viajes y reservas se filtran por idComunidad en todas las
  consultas y borrados. Solo el solicitante cancela su solicitud, y solo solicitante
  o conductor gestionan su reserva. Se guardan IDs de ComunidadUsuario en las FK
  idSolicitante/idConductor, y se convierten a Usuario al mostrar nombres/contactos.
- IDs de otro club devuelven 404; una membresía revocada o una sesión con comunidad
  inconsistente devuelve 403. Los campos de comunidad/propietario del body se ignoran.

El arreglo no distribuye las canchas de Hacoaj entre los clubes nuevos, ni duplica
publicaciones o viajes. Un club sin datos muestra listas vacías. Para la demo, cargar
sus canchas en Cancha.idComunidad y crear publicaciones/viajes desde una cuenta de
ese club. No volver a ejecutar el seed de usuarios para solucionar este problema.

## Aplicar

1. Actualizar backend y reiniciarlo. Los filtros usan las columnas existentes;
   no hace falta agregar idComunidad a Producto, Reserva o Partido.
2. Ejecutar `aislamiento_clubes.sql` como propietario en Supabase SQL Editor. Revoca
   acceso directo de anon/authenticated a las tablas de estos módulos; la app usa
   JWT propio y service_role únicamente desde Express. No cambia las políticas RLS
   existentes ni toca las filas.
3. Ejecutar `aislamiento_clubes_preflight.sql`: todas las tablas deben mostrar
   lectura_directa_bloqueada=true y backend_con_acceso=true. Las inconsistencias
   deberían dar cero. Si hay datos históricos mezclados, revisar sus dueños reales;
   no remapear IDs de Usuario a membresías ni mover filas automáticamente.

En el esquema compartido, la FK de FaltaJugadorParticipante.idComunidadUsuario
apuntaba a Usuario. El SQL corrige solo ese destino a ComunidadUsuario, si hace falta.
Usa NOT VALID para conservar filas antiguas sin adivinar identidades; las nuevas
escrituras sí deben referenciar una membresía existente. Revisar registros históricos
antes de validar esa FK. No se necesita recrear tablas ni volver a cargar los logos.

La tabla ComunidadViaje no forma parte del esquema actual compartido. Se usa
Viaje.idComunidad como asociación; se eliminaron los intentos de escribir o borrar
en aquella tabla inexistente. Las solicitudes no tienen la columna requisitos en
ese esquema; el formulario actual de transporte no la envía.

El control no implementa transacciones nuevas de cupos ni resuelve concurrencia de
reservas/partidos/viajes: conserva el flujo existente y corrige su autorización.
No es una auditoría completa del resto de la aplicación.

## Validación

```bash
BACKEND_RUNTIME=/workspace/comuniplus-runtime/backend node --test backend/test/community.http.test.mjs
PGLITE_MODULE=/workspace/clubes-test-tools/node_modules/@electric-sql/pglite/dist/index.js node --test database/aislamiento.test.mjs
```

HTTP: Express real, cookie JWT y cliente Supabase contra stub local, con usuarios
multiclub e IDs de usuario distintos de los de membresía. Se prueban lecturas,
escrituras con IDs ajenos, campos falsificados y revocación. PostgreSQL: migración
repetida, permisos y FK corregida. No se ejecutaron cambios en el Supabase remoto.

Comprobación real: entrar como ferro.socio01@demo.example.com, publicar un producto,
crear un partido y una solicitud de viaje. Entrar como river-plate.socio01 y verificar
que no aparezcan. Hacer lo mismo con una cancha asignada al ID real de Ferro; River
no debe verla ni poder reservarla por ID. Ferro.socio02 sí debe ver los datos de su club.
