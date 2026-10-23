-- Solo lectura. Ejecutar antes y después de registro_migration.sql.
-- Debe dar 0: los duplicados requieren revisión manual antes de la migración.
SELECT count(*) AS grupos_de_email_duplicados
FROM (SELECT lower(btrim(mail)) FROM public."Usuario"
      GROUP BY lower(btrim(mail)) HAVING count(*) > 1) duplicados;

-- Debe dar 0 para que todos los administradores existentes puedan aprobar.
-- Revisar la vinculación de cada fila; nunca asignar membresías automáticamente.
SELECT a.id AS administrador, a."idComunidad", a."idComunidadUsuario"
FROM public."Administrador" a
LEFT JOIN public."ComunidadUsuario" m
  ON m.id=a."idComunidadUsuario" AND m."idComunidad"=a."idComunidad"
WHERE m.id IS NULL OR NOT m.aceptado;

-- Después de migrar, todas las filas deben dar listo=true.
WITH requeridas(tabla,columna) AS (VALUES
 ('Usuario','mailNormalizado'),('ComunidadUsuario','rechazado'),('ComunidadUsuario','fechaSolicitud'))
SELECT tabla,columna,EXISTS (SELECT 1 FROM information_schema.columns c
 WHERE c.table_schema='public' AND c.table_name=tabla AND c.column_name=columna
 AND (columna<>'mailNormalizado' OR c.is_generated='ALWAYS')) AS listo FROM requeridas;

WITH requeridas(firma) AS (VALUES
 ('public."registrarUsuarioComuni"(text,text,text,text,text,bigint,bigint)'),
 ('public."actualizarClaveLegacyComuni"(bigint,text,text)'),
 ('public."resolverSolicitudComuni"(bigint,bigint,boolean)'))
SELECT firma, CASE WHEN to_regprocedure(firma) IS NULL THEN false ELSE
 has_function_privilege('service_role',to_regprocedure(firma),'EXECUTE') AND
 NOT has_function_privilege('anon',to_regprocedure(firma),'EXECUTE') AND
 NOT has_function_privilege('authenticated',to_regprocedure(firma),'EXECUTE') END AS listo
FROM requeridas;

SELECT EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname='public'
 AND indexname='Usuario_mail_normalizado_unique') AS email_unico,
 NOT has_table_privilege('anon','public."Usuario"','SELECT') AND
 NOT has_table_privilege('authenticated','public."Usuario"','SELECT') AS credenciales_privadas;
