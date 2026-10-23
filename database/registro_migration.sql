-- Run once in the existing project's Supabase SQL Editor, as database owner.
-- No user is deleted, automatically approved or assigned administrator rights.
BEGIN;
ALTER TABLE public."Usuario" ADD COLUMN IF NOT EXISTS "mailNormalizado" text
  GENERATED ALWAYS AS (lower(btrim(mail))) STORED;
-- Existing case-insensitive duplicates abort the transaction for manual review.
CREATE UNIQUE INDEX IF NOT EXISTS "Usuario_mail_normalizado_unique" ON public."Usuario" ("mailNormalizado");
ALTER TABLE public."ComunidadUsuario"
  ADD COLUMN IF NOT EXISTS rechazado boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "fechaSolicitud" timestamptz NOT NULL DEFAULT now();
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='public."ComunidadUsuario"'::regclass AND conname='Registro_estado_membresia_check') THEN
    ALTER TABLE public."ComunidadUsuario" ADD CONSTRAINT "Registro_estado_membresia_check" CHECK (NOT (aceptado AND rechazado));
  END IF;
END $$;
CREATE INDEX IF NOT EXISTS "Registro_pendientes_comunidad_idx" ON public."ComunidadUsuario" ("idComunidad","fechaSolicitud",id)
  WHERE NOT aceptado AND NOT rechazado;

-- Own JWT authentication: all account access goes through the backend.
REVOKE ALL ON public."Usuario" FROM PUBLIC, anon, authenticated;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON public."ComunidadUsuario",public."Administrador" FROM PUBLIC, anon, authenticated;
GRANT ALL ON public."Usuario",public."ComunidadUsuario" TO service_role;
GRANT SELECT ON public."Comunidad",public."Administrador" TO service_role;
GRANT USAGE,SELECT ON SEQUENCE public."Usuario_id_seq",public."ComunidadUsuario_id_seq" TO service_role;

CREATE OR REPLACE FUNCTION public."registrarUsuarioComuni"(
  p_nombre text,p_apellido text,p_mail text,p_telefono text,p_hash text,p_id_comunidad bigint,p_nro_socio bigint
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE user_id bigint; membership_id bigint;
BEGIN
  IF p_nombre IS NULL OR length(btrim(p_nombre)) NOT BETWEEN 1 AND 80 OR p_apellido IS NULL OR length(btrim(p_apellido)) NOT BETWEEN 1 AND 80
    OR p_mail IS NULL OR length(p_mail)>254 OR p_mail !~ '^[^[:space:]@]+@[^[:space:]@]+[.][^[:space:]@]+$'
    OR p_telefono IS NULL OR p_telefono !~ '^[1-9][0-9]{6,14}$' OR p_nro_socio IS NULL OR p_nro_socio<0 OR p_nro_socio>999999999999999
    OR p_hash IS NULL OR p_hash !~ '^scrypt[$]32768[$]8[$]1[$][0-9a-f]{32}[$][0-9a-f]{128}$' THEN
    RAISE EXCEPTION 'Datos de registro inválidos' USING ERRCODE='22023';
  END IF;
  PERFORM id FROM public."Comunidad" WHERE id=p_id_comunidad FOR KEY SHARE;
  IF NOT FOUND THEN RAISE EXCEPTION 'La comunidad elegida no existe' USING ERRCODE='22023'; END IF;
  INSERT INTO public."Usuario" (nombre,apellido,mail,telefono,"contraseña")
    VALUES (btrim(p_nombre),btrim(p_apellido),lower(btrim(p_mail)),p_telefono::bigint,p_hash) RETURNING id INTO user_id;
  INSERT INTO public."ComunidadUsuario" ("idUsuario","idComunidad",aceptado,rechazado,"nroSocio")
    VALUES (user_id,p_id_comunidad,false,false,p_nro_socio) RETURNING id INTO membership_id;
  RETURN jsonb_build_object('id',membership_id);
END $$;

CREATE OR REPLACE FUNCTION public."actualizarClaveLegacyComuni"(p_id_usuario bigint,p_anterior text,p_hash text)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
BEGIN
  IF p_hash IS NULL OR p_hash !~ '^scrypt[$]32768[$]8[$]1[$][0-9a-f]{32}[$][0-9a-f]{128}$' THEN
    RAISE EXCEPTION 'Hash inválido' USING ERRCODE='22023';
  END IF;
  UPDATE public."Usuario" SET "contraseña"=p_hash
    WHERE id=p_id_usuario AND "contraseña"=p_anterior AND "contraseña" NOT LIKE 'scrypt$%';
  RETURN FOUND;
END $$;

CREATE OR REPLACE FUNCTION public."resolverSolicitudComuni"(p_id_actor bigint,p_id_solicitud bigint,p_aprobar boolean)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE actor public."ComunidadUsuario"%ROWTYPE; target public."ComunidadUsuario"%ROWTYPE; admin_id bigint;
BEGIN
  IF p_aprobar IS NULL THEN RAISE EXCEPTION 'Decisión inválida' USING ERRCODE='22023'; END IF;
  SELECT * INTO actor FROM public."ComunidadUsuario" WHERE id=p_id_actor AND aceptado AND NOT rechazado FOR SHARE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Membresía no activa' USING ERRCODE='42501'; END IF;
  SELECT id INTO admin_id FROM public."Administrador"
    WHERE "idComunidadUsuario"=actor.id AND "idComunidad"=actor."idComunidad" LIMIT 1 FOR SHARE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Solo un administrador de esta comunidad puede decidir' USING ERRCODE='42501'; END IF;
  SELECT * INTO target FROM public."ComunidadUsuario" WHERE id=p_id_solicitud AND "idComunidad"=actor."idComunidad" FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Solicitud no encontrada' USING ERRCODE='P0002'; END IF;
  IF target.aceptado OR target.rechazado THEN RAISE EXCEPTION 'La solicitud ya fue resuelta'; END IF;
  UPDATE public."ComunidadUsuario" SET aceptado=p_aprobar,rechazado=NOT p_aprobar WHERE id=target.id;
  RETURN jsonb_build_object('ok',true);
END $$;
REVOKE ALL ON FUNCTION public."registrarUsuarioComuni"(text,text,text,text,text,bigint,bigint),
  public."actualizarClaveLegacyComuni"(bigint,text,text), public."resolverSolicitudComuni"(bigint,bigint,boolean) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public."registrarUsuarioComuni"(text,text,text,text,text,bigint,bigint),
  public."actualizarClaveLegacyComuni"(bigint,text,text), public."resolverSolicitudComuni"(bigint,bigint,boolean) TO service_role;
NOTIFY pgrst,'reload schema';
COMMIT;
