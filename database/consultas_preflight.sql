-- Solo lectura. Los indicadores deben ser true después de la migración.
WITH tablas(nombre) AS (VALUES ('ConsultaConversacion'),('ConsultaMensaje'),('ConsultaDifusion'))
SELECT nombre,to_regclass(format('public.%I',nombre)) IS NOT NULL AS existe,
 EXISTS(SELECT 1 FROM pg_class WHERE oid=to_regclass(format('public.%I',nombre)) AND relrowsecurity) AS rls_activo,
 CASE WHEN to_regclass(format('public.%I',nombre)) IS NULL THEN false ELSE
 NOT has_table_privilege('anon',to_regclass(format('public.%I',nombre)),'SELECT') AND
 NOT has_table_privilege('authenticated',to_regclass(format('public.%I',nombre)),'SELECT') END AS lectura_directa_bloqueada,
 CASE WHEN to_regclass(format('public.%I',nombre)) IS NULL THEN false ELSE has_table_privilege('service_role',to_regclass(format('public.%I',nombre)),'SELECT') END AS backend_con_acceso
FROM tablas;
WITH funciones(firma) AS (VALUES ('public."abrirConsultaClub"(bigint)'),('public."enviarConsultaClub"(bigint,bigint,text,uuid)'),('public."difundirConsultaClub"(bigint,text,uuid)'))
SELECT firma,CASE WHEN to_regprocedure(firma) IS NULL THEN false ELSE
 has_function_privilege('service_role',to_regprocedure(firma),'EXECUTE') AND
 NOT has_function_privilege('anon',to_regprocedure(firma),'EXECUTE') AND
 NOT has_function_privilege('authenticated',to_regprocedure(firma),'EXECUTE') END AS permisos_correctos FROM funciones;
