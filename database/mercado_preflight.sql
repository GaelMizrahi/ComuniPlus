-- Read-only. Run in Supabase SQL Editor; no keys or personal data are returned.
SELECT
  EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='Producto' AND column_name='eliminadoEn') AS columna_eliminado_en,
  to_regprocedure('public."guardarProductoMercado"(bigint,bigint,jsonb)') IS NOT NULL AS funcion_publicar,
  to_regprocedure('public."reservarProductoMercado"(bigint,bigint)') IS NOT NULL AS funcion_reservar,
  to_regprocedure('public."gestionarProductoMercado"(bigint,bigint,text)') IS NOT NULL AS funcion_editar_estado,
  EXISTS (SELECT 1 FROM storage.buckets WHERE id='mercado') AS bucket_fotos;
