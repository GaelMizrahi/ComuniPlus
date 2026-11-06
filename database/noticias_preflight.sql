-- Solo lectura. Después de noticias_migration.sql, todos los indicadores deben ser true.
SELECT to_regclass('public."Noticia"') IS NOT NULL AS tabla_noticias,
 EXISTS (SELECT 1 FROM pg_class WHERE oid=to_regclass('public."Noticia"') AND relrowsecurity) AS rls_activo,
 CASE WHEN to_regclass('public."Noticia"') IS NULL THEN false ELSE
  NOT has_table_privilege('anon','public."Noticia"','SELECT') AND NOT has_table_privilege('authenticated','public."Noticia"','SELECT') END AS lectura_directa_bloqueada;
WITH funciones(firma) AS (VALUES ('public."publicarNoticiaClub"(bigint,text,text,text)'),('public."eliminarNoticiaClub"(bigint,bigint)'))
SELECT firma,CASE WHEN to_regprocedure(firma) IS NULL THEN false ELSE
 has_function_privilege('service_role',to_regprocedure(firma),'EXECUTE') AND
 NOT has_function_privilege('anon',to_regprocedure(firma),'EXECUTE') AND
 NOT has_function_privilege('authenticated',to_regprocedure(firma),'EXECUTE') END AS permisos_correctos FROM funciones;
SELECT EXISTS (SELECT 1 FROM storage.buckets WHERE id='noticias' AND NOT public AND file_size_limit=5242880) AS bucket_privado,
 EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='storage' AND tablename='objects' AND policyname='noticias_no_client_access' AND permissive='RESTRICTIVE') AS clientes_storage_bloqueados;
