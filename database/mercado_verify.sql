-- Read-only diagnostics; run after migration on the existing Supabase project.
SELECT table_name, column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema='public' AND table_name IN ('Producto','Venta','Administrador','Comunidad')
ORDER BY table_name, ordinal_position;

SELECT conrelid::regclass AS tabla, conname, pg_get_constraintdef(oid) AS definicion
FROM pg_constraint
WHERE conrelid IN ('public."Administrador"'::regclass,'public."Producto"'::regclass,'public."Venta"'::regclass,'public."ComunidadUsuario"'::regclass)
ORDER BY conrelid, conname;

SELECT indexname, indexdef FROM pg_indexes WHERE schemaname='public' AND tablename='Venta';

SELECT p.oid::regprocedure AS funcion,
  has_function_privilege('anon',p.oid,'EXECUTE') AS anon_puede_ejecutar,
  has_function_privilege('authenticated',p.oid,'EXECUTE') AS authenticated_puede_ejecutar,
  has_function_privilege('service_role',p.oid,'EXECUTE') AS service_role_puede_ejecutar
FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
WHERE n.nspname='public' AND p.proname IN ('reservarProductoMercado','guardarProductoMercado','gestionarProductoMercado');

SELECT id, public, file_size_limit, allowed_mime_types FROM storage.buckets WHERE id='mercado';
-- These rows require a real administrator assignment; never infer the person.
SELECT id, "idComunidad" FROM public."Administrador" WHERE "idComunidadUsuario" IS NULL;
SELECT id, tipo FROM public."Comunidad";
-- Any nonzero value needs reconciliation before treating old rows as Mercado data.
SELECT count(*) AS ventas_con_relaciones_inconsistentes
FROM public."Venta" v
JOIN public."Producto" p ON p.id=v."idProducto"
JOIN public."ComunidadUsuario" s ON s.id=p."idVendedor"
JOIN public."ComunidadUsuario" b ON b.id=v."idComprador"
WHERE v."idVendedor"<>p."idVendedor" OR v."idComunidad"<>s."idComunidad"
  OR b."idComunidad"<>s."idComunidad" OR b."idUsuario"=s."idUsuario";
