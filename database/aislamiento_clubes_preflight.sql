-- Solo diagnóstico: no modifica datos ni muestra contraseñas/datos personales.
SELECT 'solicitudes con solicitante de otro club o inexistente' AS comprobacion,count(*) AS inconsistencias
FROM public."solicitudViaje" s LEFT JOIN public."ComunidadUsuario" m ON m.id=s."idSolicitante"
WHERE m.id IS NULL OR m."idComunidad"<>s."idComunidad"
UNION ALL
SELECT 'viajes con conductor/solicitud de otro club',count(*)
FROM public."Viaje" v LEFT JOIN public."ComunidadUsuario" m ON m.id=v."idConductor"
LEFT JOIN public."solicitudViaje" s ON s.id=v."idSolicitudViaje"
WHERE m.id IS NULL OR s.id IS NULL OR m."idComunidad"<>v."idComunidad" OR s."idComunidad"<>v."idComunidad"
UNION ALL
SELECT 'reservas vinculadas a socios de otra comunidad',count(*)
FROM public."ComunidadUsuarioReserva" l JOIN public."Reserva" r ON r.id=l."idReserva"
JOIN public."Cancha" c ON c.id=r."idCancha" JOIN public."ComunidadUsuario" m ON m.id=l."idComunidadUsuario"
WHERE c."idComunidad"<>m."idComunidad"
UNION ALL
SELECT 'partidos con creador inexistente',count(*)
FROM public."Partido" p LEFT JOIN public."ComunidadUsuario" m ON m.id=p."idComunidadUsuario" WHERE m.id IS NULL;

SELECT t.nombre,
 NOT has_table_privilege('anon',to_regclass(format('public.%I',t.nombre)),'SELECT') AND
 NOT has_table_privilege('authenticated',to_regclass(format('public.%I',t.nombre)),'SELECT') AS lectura_directa_bloqueada,
 has_table_privilege('service_role',to_regclass(format('public.%I',t.nombre)),'SELECT') AS backend_con_acceso
FROM unnest(ARRAY['Cancha','Reserva','ComunidadUsuarioReserva','solicitudViaje','Viaje','Partido','PartidoJugador','FaltaJugadorPartido','FaltaJugadorParticipante']) t(nombre)
WHERE to_regclass(format('public.%I',t.nombre)) IS NOT NULL;
