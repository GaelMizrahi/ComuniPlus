-- Incremental migration: apply AFTER mercado_migration.sql on the same project.
-- Preserves publications, photos and all historical Venta records.
BEGIN;
ALTER TABLE public."Producto"
  ADD COLUMN IF NOT EXISTS visible boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS "publicarDesde" timestamptz,
  ADD COLUMN IF NOT EXISTS "publicarHasta" timestamptz;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='public."Producto"'::regclass AND conname='Mercado_periodo_publicacion_check') THEN
    ALTER TABLE public."Producto" ADD CONSTRAINT "Mercado_periodo_publicacion_check" CHECK (
      ("publicarDesde" IS NULL OR isfinite("publicarDesde")) AND
      ("publicarHasta" IS NULL OR isfinite("publicarHasta")) AND
      ("publicarDesde" IS NULL OR "publicarHasta" IS NULL OR "publicarHasta" > "publicarDesde"));
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public."ProductoLike" (
  "idProducto" bigint NOT NULL REFERENCES public."Producto"(id),
  "idComunidadUsuario" bigint NOT NULL REFERENCES public."ComunidadUsuario"(id),
  "fechaDeAlta" timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY ("idProducto", "idComunidadUsuario")
);
CREATE INDEX IF NOT EXISTS "ProductoLike_membresia_idx" ON public."ProductoLike" ("idComunidadUsuario");
ALTER TABLE public."ProductoLike" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public."ProductoLike" FROM PUBLIC, anon, authenticated;
GRANT ALL ON public."ProductoLike" TO service_role;

CREATE OR REPLACE FUNCTION public."guardarProductoMercado"(p_id_producto bigint, p_id_actor bigint, p_datos jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public, pg_temp AS $$
DECLARE
  actor public."ComunidadUsuario"%ROWTYPE;
  item public."Producto"%ROWTYPE;
  item_id bigint;
  previous_photo text;
  photo text;
  show_item boolean;
  publish_from timestamptz;
  publish_until timestamptz;
BEGIN
  IF p_id_producto IS NOT NULL THEN
    SELECT * INTO item FROM public."Producto" WHERE id=p_id_producto AND "eliminadoEn" IS NULL FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Publicación no encontrada' USING ERRCODE='P0002'; END IF;
  END IF;
  SELECT * INTO actor FROM public."ComunidadUsuario" WHERE id=p_id_actor AND aceptado FOR SHARE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Membresía no activa' USING ERRCODE='42501'; END IF;
  IF p_id_producto IS NOT NULL AND item."idVendedor" <> actor.id THEN RAISE EXCEPTION 'Solo el vendedor puede editar' USING ERRCODE='42501'; END IF;
  IF p_id_producto IS NOT NULL AND item.disponibilidad=3 THEN RAISE EXCEPTION 'Una publicación vendida no se puede editar'; END IF;
  IF p_datos->>'titulo' IS NULL OR p_datos->>'descripcion' IS NULL OR p_datos->>'categoria' IS NULL
    OR p_datos->>'precio' IS NULL OR p_datos->>'estado' IS NULL OR p_datos->>'tipo' IS NULL THEN
    RAISE EXCEPTION 'Faltan campos obligatorios' USING ERRCODE='22023';
  END IF;
  photo := COALESCE(p_datos->>'fotoPath',item."fotoPath");
  IF photo IS NULL OR (p_datos ? 'fotoPath' AND photo NOT LIKE actor."idComunidad"::text || '/' || actor.id::text || '/%') THEN
    RAISE EXCEPTION 'Foto inválida' USING ERRCODE='22023';
  END IF;
  IF p_datos ? 'visible' AND jsonb_typeof(p_datos->'visible') IS DISTINCT FROM 'boolean' THEN
    RAISE EXCEPTION 'Visibilidad inválida' USING ERRCODE='22023';
  END IF;
  show_item := COALESCE((p_datos->>'visible')::boolean,item.visible,true);
  publish_from := CASE WHEN p_datos ? 'publicarDesde' THEN (p_datos->>'publicarDesde')::timestamptz ELSE item."publicarDesde" END;
  publish_until := CASE WHEN p_datos ? 'publicarHasta' THEN (p_datos->>'publicarHasta')::timestamptz ELSE item."publicarHasta" END;
  IF p_id_producto IS NULL THEN
    INSERT INTO public."Producto" (titulo, descripcion, precio, categoria, estado, tipo, "fotoPath", "idVendedor", visible, "publicarDesde", "publicarHasta")
      VALUES (btrim(p_datos->>'titulo'), btrim(p_datos->>'descripcion'), (p_datos->>'precio')::numeric,
        btrim(p_datos->>'categoria'), (p_datos->>'estado')::bigint, p_datos->>'tipo', photo, actor.id, show_item, publish_from, publish_until)
      RETURNING id INTO item_id;
  ELSE
    previous_photo := item."fotoPath";
    UPDATE public."Producto" SET titulo=btrim(p_datos->>'titulo'), descripcion=btrim(p_datos->>'descripcion'),
      precio=(p_datos->>'precio')::numeric, categoria=btrim(p_datos->>'categoria'), estado=(p_datos->>'estado')::bigint,
      tipo=p_datos->>'tipo', "fotoPath"=photo, visible=show_item, "publicarDesde"=publish_from, "publicarHasta"=publish_until
      WHERE id=item.id RETURNING id INTO item_id;
  END IF;
  RETURN jsonb_build_object('id',item_id,'previousPhoto',previous_photo);
END $$;

CREATE OR REPLACE FUNCTION public."marcarLikeProductoMercado"(p_id_producto bigint, p_id_actor bigint, p_like boolean)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public, pg_temp AS $$
DECLARE
  actor public."ComunidadUsuario"%ROWTYPE;
  seller public."ComunidadUsuario"%ROWTYPE;
  item public."Producto"%ROWTYPE;
  checked_at timestamptz;
BEGIN
  IF p_like IS NULL OR p_id_producto IS NULL THEN RAISE EXCEPTION 'Like inválido' USING ERRCODE='22023'; END IF;
  IF NOT p_like THEN
    SELECT * INTO actor FROM public."ComunidadUsuario" WHERE id=p_id_actor AND aceptado FOR SHARE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Membresía no activa' USING ERRCODE='42501'; END IF;
    -- Removing one's own like never reveals whether a private/foreign ID exists.
    DELETE FROM public."ProductoLike" WHERE "idProducto"=p_id_producto AND "idComunidadUsuario"=actor.id;
    RETURN jsonb_build_object('liked',false);
  END IF;
  SELECT * INTO item FROM public."Producto" WHERE id=p_id_producto AND "eliminadoEn" IS NULL FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Publicación no encontrada' USING ERRCODE='P0002'; END IF;
  SELECT * INTO actor FROM public."ComunidadUsuario" WHERE id=p_id_actor AND aceptado FOR SHARE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Membresía no activa' USING ERRCODE='42501'; END IF;
  SELECT * INTO seller FROM public."ComunidadUsuario" WHERE id=item."idVendedor" AND aceptado FOR SHARE;
  checked_at := clock_timestamp();
  IF NOT FOUND OR actor."idComunidad" <> seller."idComunidad" OR NOT item.visible OR item.disponibilidad=3
    OR (item."publicarDesde" IS NOT NULL AND item."publicarDesde" > checked_at)
    OR (item."publicarHasta" IS NOT NULL AND item."publicarHasta" <= checked_at) THEN
    RAISE EXCEPTION 'Publicación no encontrada' USING ERRCODE='P0002';
  END IF;
  INSERT INTO public."ProductoLike" ("idProducto","idComunidadUsuario") VALUES (item.id,actor.id) ON CONFLICT DO NOTHING;
  RETURN jsonb_build_object('liked',true);
END $$;
REVOKE ALL ON FUNCTION public."guardarProductoMercado"(bigint,bigint,jsonb), public."marcarLikeProductoMercado"(bigint,bigint,boolean) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public."guardarProductoMercado"(bigint,bigint,jsonb), public."marcarLikeProductoMercado"(bigint,bigint,boolean) TO service_role;
-- Old Venta records and RPC are retained for history, but new reservations are
-- disabled in both the HTTP API and database permissions.
REVOKE ALL ON FUNCTION public."reservarProductoMercado"(bigint,bigint) FROM service_role;
NOTIFY pgrst, 'reload schema';
COMMIT;
