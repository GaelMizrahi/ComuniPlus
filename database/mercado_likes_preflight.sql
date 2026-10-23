-- Read-only verification after mercado_likes_visibilidad.sql.
SELECT
  EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='Producto' AND column_name='visible') AS columna_visible,
  (SELECT count(*)=2 FROM information_schema.columns WHERE table_schema='public' AND table_name='Producto' AND column_name IN ('publicarDesde','publicarHasta')) AS fechas_publicacion,
  to_regclass('public."ProductoLike"') IS NOT NULL AS tabla_likes,
  COALESCE(has_function_privilege('service_role',to_regprocedure('public."marcarLikeProductoMercado"(bigint,bigint,boolean)'),'EXECUTE'),false) AS funcion_like_disponible,
  COALESCE(NOT has_function_privilege('service_role',to_regprocedure('public."reservarProductoMercado"(bigint,bigint)'),'EXECUTE'),false) AS reservas_nuevas_deshabilitadas;
