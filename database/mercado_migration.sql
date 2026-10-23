-- Run in the existing Supabase SQL editor, as the database owner.
-- No tables are recreated, no community data or administrator assignments are guessed.
BEGIN;

ALTER TABLE public."Comunidad" ADD COLUMN IF NOT EXISTS tipo text NOT NULL DEFAULT 'otro';
ALTER TABLE public."Producto"
  ADD COLUMN IF NOT EXISTS estado bigint NOT NULL DEFAULT 2,
  ADD COLUMN IF NOT EXISTS tipo text NOT NULL DEFAULT 'producto',
  ADD COLUMN IF NOT EXISTS disponibilidad smallint NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS "fotoPath" text,
  ADD COLUMN IF NOT EXISTS "fechaDeAlta" timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS "eliminadoEn" timestamptz;
-- Widen the supplied bigint column without losing existing values; allow cents.
ALTER TABLE public."Producto" ALTER COLUMN precio TYPE numeric USING precio::numeric;
ALTER TABLE public."Administrador" ADD COLUMN IF NOT EXISTS "idComunidadUsuario" bigint;
ALTER TABLE public."Venta" ALTER COLUMN estado SET DEFAULT 1, ALTER COLUMN estado SET NOT NULL,
  ALTER COLUMN fecha SET DEFAULT current_date;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='public."ComunidadUsuario"'::regclass AND conname='ComunidadUsuario_id_comunidad_unique') THEN
    ALTER TABLE public."ComunidadUsuario" ADD CONSTRAINT "ComunidadUsuario_id_comunidad_unique" UNIQUE (id, "idComunidad");
  END IF;
  -- Do not trust the exported pair of same-named FKs. Verify the actual composite.
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint c WHERE c.conrelid='public."Administrador"'::regclass
      AND c.confrelid='public."ComunidadUsuario"'::regclass AND c.contype='f'
      AND c.conkey=ARRAY[
        (SELECT attnum FROM pg_attribute WHERE attrelid=c.conrelid AND attname='idComunidadUsuario'),
        (SELECT attnum FROM pg_attribute WHERE attrelid=c.conrelid AND attname='idComunidad')
      ]::smallint[]
      AND c.confkey=ARRAY[
        (SELECT attnum FROM pg_attribute WHERE attrelid=c.confrelid AND attname='id'),
        (SELECT attnum FROM pg_attribute WHERE attrelid=c.confrelid AND attname='idComunidad')
      ]::smallint[]
  ) THEN
    ALTER TABLE public."Administrador" ADD CONSTRAINT "Mercado_administrador_membresia_comunidad_fk"
      FOREIGN KEY ("idComunidadUsuario", "idComunidad") REFERENCES public."ComunidadUsuario" (id, "idComunidad");
  END IF;
END $$;

-- Idempotent named checks. Existing incompatible data makes the transaction fail;
-- it is never silently deleted, reclassified or associated with another person.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='public."Producto"'::regclass AND conname='Mercado_producto_valores_check') THEN
    ALTER TABLE public."Producto" ADD CONSTRAINT "Mercado_producto_valores_check" CHECK (
      estado IN (1,2) AND tipo IN ('producto','propiedad') AND disponibilidad IN (1,2,3)
      AND precio >= 0 AND precio::text NOT IN ('NaN','Infinity','-Infinity')
      AND length(btrim(titulo)) BETWEEN 1 AND 120 AND length(btrim(descripcion)) BETWEEN 1 AND 4000
      AND length(btrim(categoria)) BETWEEN 1 AND 80);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='public."Comunidad"'::regclass AND conname='Mercado_comunidad_tipo_check') THEN
    ALTER TABLE public."Comunidad" ADD CONSTRAINT "Mercado_comunidad_tipo_check" CHECK (tipo IN ('escuela','country','otro'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='public."Venta"'::regclass AND conname='Mercado_venta_valores_check') THEN
    ALTER TABLE public."Venta" ADD CONSTRAINT "Mercado_venta_valores_check" CHECK (estado IN (1,2,3) AND "idComprador" <> "idVendedor");
  END IF;
END $$;
CREATE UNIQUE INDEX IF NOT EXISTS "Venta_una_reserva_activa_por_producto"
  ON public."Venta" ("idProducto") WHERE estado=1;
CREATE INDEX IF NOT EXISTS "Mercado_productos_vendedor_fecha" ON public."Producto" ("idVendedor", "fechaDeAlta" DESC) WHERE "eliminadoEn" IS NULL;
CREATE INDEX IF NOT EXISTS "Mercado_ventas_comprador_comunidad" ON public."Venta" ("idComprador", "idComunidad") WHERE estado=1;

-- The backend uses its own JWT, not Supabase Auth sessions. Block direct clients.
ALTER TABLE public."Producto" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Venta" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public."Producto", public."Venta" FROM PUBLIC, anon, authenticated;
-- These tables define the authorization boundary. A client must not be able
-- to accept its own membership or assign itself a community administrator.
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON
  public."Administrador", public."ComunidadUsuario" FROM PUBLIC, anon, authenticated;
GRANT ALL ON public."Producto", public."Venta" TO service_role;
GRANT USAGE, SELECT ON SEQUENCE public."Producto_id_seq", public."Venta_id_seq" TO service_role;

-- Replace the previously designed RPC in the same transaction, without CASCADE.
DROP FUNCTION IF EXISTS public."reservarProductoMercado"(bigint, bigint);
CREATE FUNCTION public."reservarProductoMercado"(p_id_producto bigint, p_id_comprador bigint)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public, pg_temp AS $$
DECLARE
  item public."Producto"%ROWTYPE;
  seller public."ComunidadUsuario"%ROWTYPE;
  buyer public."ComunidadUsuario"%ROWTYPE;
  sale_id bigint;
BEGIN
  SELECT * INTO item FROM public."Producto" WHERE id=p_id_producto AND "eliminadoEn" IS NULL FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Publicación no encontrada' USING ERRCODE='P0002'; END IF;
  SELECT * INTO buyer FROM public."ComunidadUsuario" WHERE id=p_id_comprador AND aceptado FOR SHARE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Membresía no activa' USING ERRCODE='42501'; END IF;
  SELECT * INTO seller FROM public."ComunidadUsuario" WHERE id=item."idVendedor" AND aceptado FOR SHARE;
  IF NOT FOUND OR buyer."idComunidad" <> seller."idComunidad" THEN
    RAISE EXCEPTION 'Publicación no encontrada' USING ERRCODE='P0002';
  END IF;
  IF buyer."idUsuario"=seller."idUsuario" THEN RAISE EXCEPTION 'No podés reservar tu propia publicación'; END IF;
  IF item.disponibilidad <> 1 THEN RAISE EXCEPTION 'La publicación no está disponible'; END IF;
  INSERT INTO public."Venta" ("idComprador", "idVendedor", "idProducto", "idComunidad", estado)
    VALUES (buyer.id, seller.id, item.id, seller."idComunidad", 1) RETURNING id INTO sale_id;
  UPDATE public."Producto" SET disponibilidad=2 WHERE id=item.id;
  RETURN jsonb_build_object('id',sale_id);
END $$;

CREATE OR REPLACE FUNCTION public."guardarProductoMercado"(p_id_producto bigint, p_id_actor bigint, p_datos jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public, pg_temp AS $$
DECLARE
  actor public."ComunidadUsuario"%ROWTYPE;
  item public."Producto"%ROWTYPE;
  item_id bigint;
  previous_photo text;
  photo text;
BEGIN
  -- Every mutation locks products before memberships, matching reserve/manage.
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
  IF p_id_producto IS NULL THEN
    INSERT INTO public."Producto" (titulo, descripcion, precio, categoria, estado, tipo, "fotoPath", "idVendedor")
      VALUES (btrim(p_datos->>'titulo'), btrim(p_datos->>'descripcion'), (p_datos->>'precio')::numeric,
        btrim(p_datos->>'categoria'), (p_datos->>'estado')::bigint, p_datos->>'tipo', photo, actor.id)
      RETURNING id INTO item_id;
  ELSE
    previous_photo := item."fotoPath";
    UPDATE public."Producto" SET titulo=btrim(p_datos->>'titulo'), descripcion=btrim(p_datos->>'descripcion'),
      precio=(p_datos->>'precio')::numeric, categoria=btrim(p_datos->>'categoria'), estado=(p_datos->>'estado')::bigint,
      tipo=p_datos->>'tipo', "fotoPath"=photo WHERE id=item.id RETURNING id INTO item_id;
  END IF;
  RETURN jsonb_build_object('id',item_id,'previousPhoto',previous_photo);
END $$;

CREATE OR REPLACE FUNCTION public."gestionarProductoMercado"(p_id_producto bigint, p_id_actor bigint, p_accion text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public, pg_temp AS $$
DECLARE
  actor public."ComunidadUsuario"%ROWTYPE;
  seller public."ComunidadUsuario"%ROWTYPE;
  item public."Producto"%ROWTYPE;
BEGIN
  SELECT * INTO item FROM public."Producto" WHERE id=p_id_producto AND "eliminadoEn" IS NULL FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Publicación no encontrada' USING ERRCODE='P0002'; END IF;
  SELECT * INTO actor FROM public."ComunidadUsuario" WHERE id=p_id_actor AND aceptado FOR SHARE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Membresía no activa' USING ERRCODE='42501'; END IF;
  SELECT * INTO seller FROM public."ComunidadUsuario" WHERE id=item."idVendedor" FOR SHARE;
  IF actor."idComunidad" <> seller."idComunidad" THEN RAISE EXCEPTION 'Publicación no encontrada' USING ERRCODE='P0002'; END IF;
  IF actor.id <> seller.id AND (p_accion <> 'eliminar' OR NOT EXISTS (
    SELECT 1 FROM public."Administrador" WHERE "idComunidadUsuario"=actor.id AND "idComunidad"=actor."idComunidad"
  )) THEN RAISE EXCEPTION 'No tenés permiso para esta acción' USING ERRCODE='42501'; END IF;
  IF p_accion='vendido' THEN
    UPDATE public."Producto" SET disponibilidad=3 WHERE id=item.id;
    UPDATE public."Venta" SET estado=2 WHERE "idProducto"=item.id AND estado=1;
  ELSIF p_accion='eliminar' THEN
    -- Preserve sale history and existing FKs; all reads exclude this tombstone.
    UPDATE public."Producto" SET "eliminadoEn"=now() WHERE id=item.id;
    UPDATE public."Venta" SET estado=3 WHERE "idProducto"=item.id AND estado=1;
  ELSE RAISE EXCEPTION 'Acción inválida' USING ERRCODE='22023';
  END IF;
  RETURN jsonb_build_object('id',item.id,'previousPhoto',item."fotoPath");
END $$;

REVOKE ALL ON FUNCTION public."reservarProductoMercado"(bigint,bigint),
  public."guardarProductoMercado"(bigint,bigint,jsonb), public."gestionarProductoMercado"(bigint,bigint,text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public."reservarProductoMercado"(bigint,bigint),
  public."guardarProductoMercado"(bigint,bigint,jsonb), public."gestionarProductoMercado"(bigint,bigint,text) TO service_role;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
  VALUES ('mercado','mercado',true,5242880,ARRAY['image/jpeg','image/png','image/webp'])
  ON CONFLICT (id) DO UPDATE SET public=EXCLUDED.public,
    file_size_limit=EXCLUDED.file_size_limit, allowed_mime_types=EXCLUDED.allowed_mime_types;
-- Restrictive policies prevent broad existing policies from authorizing client writes.
DROP POLICY IF EXISTS mercado_no_client_insert ON storage.objects;
CREATE POLICY mercado_no_client_insert ON storage.objects AS RESTRICTIVE FOR INSERT TO anon, authenticated
  WITH CHECK (bucket_id <> 'mercado');
DROP POLICY IF EXISTS mercado_no_client_update ON storage.objects;
CREATE POLICY mercado_no_client_update ON storage.objects AS RESTRICTIVE FOR UPDATE TO anon, authenticated
  USING (bucket_id <> 'mercado') WITH CHECK (bucket_id <> 'mercado');
DROP POLICY IF EXISTS mercado_no_client_delete ON storage.objects;
CREATE POLICY mercado_no_client_delete ON storage.objects AS RESTRICTIVE FOR DELETE TO anon, authenticated
  USING (bucket_id <> 'mercado');
NOTIFY pgrst, 'reload schema';
COMMIT;
