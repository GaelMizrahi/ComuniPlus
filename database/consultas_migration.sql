-- Chat privado por socio y club. Aplicar como propietario en Supabase SQL Editor.
BEGIN;
CREATE TABLE IF NOT EXISTS public."ConsultaConversacion" (
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 "idComunidad" bigint NOT NULL REFERENCES public."Comunidad"(id),
 "idComunidadUsuario" bigint NOT NULL UNIQUE,
 "creadaEn" timestamptz NOT NULL DEFAULT now(),
 "actualizadaEn" timestamptz NOT NULL DEFAULT now(),
 "ultimoMensaje" text NOT NULL DEFAULT '',
 CONSTRAINT "ConsultaConversacion_socio_club_fkey" FOREIGN KEY ("idComunidadUsuario","idComunidad") REFERENCES public."ComunidadUsuario"(id,"idComunidad")
);
CREATE TABLE IF NOT EXISTS public."ConsultaDifusion" (
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 "idComunidad" bigint NOT NULL REFERENCES public."Comunidad"(id),
 "idRemitente" bigint NOT NULL,
 "idCliente" uuid NOT NULL,
 texto text NOT NULL CHECK(length(btrim(texto)) BETWEEN 1 AND 3000),
 "creadoEn" timestamptz NOT NULL DEFAULT now(),
 "cantidadDestinatarios" integer NOT NULL DEFAULT 0,
 UNIQUE("idRemitente","idCliente"),
 FOREIGN KEY ("idRemitente","idComunidad") REFERENCES public."ComunidadUsuario"(id,"idComunidad")
);
CREATE TABLE IF NOT EXISTS public."ConsultaMensaje" (
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 "idConversacion" bigint NOT NULL REFERENCES public."ConsultaConversacion"(id),
 "idRemitente" bigint NOT NULL REFERENCES public."ComunidadUsuario"(id),
 "idCliente" uuid,
 texto text NOT NULL CHECK(length(btrim(texto)) BETWEEN 1 AND 3000),
 "esAdmin" boolean NOT NULL,
 "idDifusion" bigint REFERENCES public."ConsultaDifusion"(id),
 "creadoEn" timestamptz NOT NULL DEFAULT now(),
 UNIQUE("idConversacion","idRemitente","idCliente"),
 UNIQUE("idConversacion","idDifusion"),
 CHECK (("idCliente" IS NOT NULL AND "idDifusion" IS NULL) OR ("idCliente" IS NULL AND "idDifusion" IS NOT NULL AND "esAdmin"))
);
CREATE INDEX IF NOT EXISTS "ConsultaConversacion_bandeja_idx" ON public."ConsultaConversacion" ("idComunidad","actualizadaEn" DESC,id DESC);
CREATE INDEX IF NOT EXISTS "ConsultaMensaje_historial_idx" ON public."ConsultaMensaje" ("idConversacion",id DESC);
ALTER TABLE public."ConsultaConversacion" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."ConsultaMensaje" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."ConsultaDifusion" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public."ConsultaConversacion",public."ConsultaMensaje",public."ConsultaDifusion" FROM PUBLIC,anon,authenticated;
GRANT SELECT ON public."ConsultaConversacion",public."ConsultaMensaje",public."ConsultaDifusion" TO service_role;

CREATE OR REPLACE FUNCTION public."abrirConsultaClub"(p_actor bigint) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE actor public."ComunidadUsuario"%ROWTYPE; conversacion_id bigint;
BEGIN
 SELECT * INTO actor FROM public."ComunidadUsuario" WHERE id=p_actor AND aceptado FOR SHARE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Membresía no activa' USING ERRCODE='42501'; END IF;
 INSERT INTO public."ConsultaConversacion" ("idComunidad","idComunidadUsuario") VALUES(actor."idComunidad",actor.id)
 ON CONFLICT ("idComunidadUsuario") DO NOTHING RETURNING id INTO conversacion_id;
 IF conversacion_id IS NULL THEN SELECT id INTO conversacion_id FROM public."ConsultaConversacion" WHERE "idComunidadUsuario"=actor.id AND "idComunidad"=actor."idComunidad"; END IF;
 RETURN jsonb_build_object('id',conversacion_id);
END $$;

CREATE OR REPLACE FUNCTION public."enviarConsultaClub"(p_actor bigint,p_conversacion bigint,p_texto text,p_id_cliente uuid) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE actor public."ComunidadUsuario"%ROWTYPE; conversacion public."ConsultaConversacion"%ROWTYPE;
 mensaje public."ConsultaMensaje"%ROWTYPE; admin_id bigint; es_admin boolean; socio_activo boolean;
BEGIN
 SELECT * INTO actor FROM public."ComunidadUsuario" WHERE id=p_actor AND aceptado FOR SHARE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Membresía no activa' USING ERRCODE='42501'; END IF;
 SELECT id INTO admin_id FROM public."Administrador" WHERE "idComunidadUsuario"=actor.id AND "idComunidad"=actor."idComunidad" LIMIT 1 FOR SHARE;
 es_admin := FOUND;
 SELECT * INTO conversacion FROM public."ConsultaConversacion" WHERE id=p_conversacion AND "idComunidad"=actor."idComunidad" FOR UPDATE;
 IF NOT FOUND OR (conversacion."idComunidadUsuario"<>actor.id AND NOT es_admin) THEN RAISE EXCEPTION 'Conversación no encontrada' USING ERRCODE='P0002'; END IF;
 SELECT aceptado INTO socio_activo FROM public."ComunidadUsuario" WHERE id=conversacion."idComunidadUsuario" AND "idComunidad"=actor."idComunidad" FOR SHARE;
 IF NOT coalesce(socio_activo,false) THEN RAISE EXCEPTION 'La membresía de este socio ya no está activa'; END IF;
 IF p_texto IS NULL OR length(btrim(p_texto)) NOT BETWEEN 1 AND 3000 OR p_id_cliente IS NULL THEN RAISE EXCEPTION 'El mensaje debe tener entre 1 y 3000 caracteres' USING ERRCODE='22023'; END IF;
 SELECT * INTO mensaje FROM public."ConsultaMensaje" WHERE "idConversacion"=conversacion.id AND "idRemitente"=actor.id AND "idCliente"=p_id_cliente;
 IF FOUND THEN
  IF mensaje.texto<>btrim(p_texto) THEN RAISE EXCEPTION 'La solicitud ya fue usada con otro mensaje' USING ERRCODE='22023'; END IF;
  RETURN to_jsonb(mensaje);
 END IF;
 INSERT INTO public."ConsultaMensaje" ("idConversacion","idRemitente","idCliente",texto,"esAdmin")
 VALUES(conversacion.id,actor.id,p_id_cliente,btrim(p_texto),es_admin) RETURNING * INTO mensaje;
 UPDATE public."ConsultaConversacion" SET "actualizadaEn"=mensaje."creadoEn","ultimoMensaje"=left(mensaje.texto,120) WHERE id=conversacion.id;
 RETURN to_jsonb(mensaje);
END $$;

CREATE OR REPLACE FUNCTION public."difundirConsultaClub"(p_actor bigint,p_texto text,p_id_cliente uuid) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE actor public."ComunidadUsuario"%ROWTYPE; destinatario record; admin_id bigint; conversacion_id bigint;
 difusion public."ConsultaDifusion"%ROWTYPE; creado timestamptz; cantidad integer:=0;
BEGIN
 SELECT * INTO actor FROM public."ComunidadUsuario" WHERE id=p_actor AND aceptado FOR SHARE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Membresía no activa' USING ERRCODE='42501'; END IF;
 SELECT id INTO admin_id FROM public."Administrador" WHERE "idComunidadUsuario"=actor.id AND "idComunidad"=actor."idComunidad" LIMIT 1 FOR SHARE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Solo los administradores del club pueden enviar mensajes a todos' USING ERRCODE='42501'; END IF;
 IF p_texto IS NULL OR length(btrim(p_texto)) NOT BETWEEN 1 AND 3000 OR p_id_cliente IS NULL THEN RAISE EXCEPTION 'El mensaje debe tener entre 1 y 3000 caracteres' USING ERRCODE='22023'; END IF;
 INSERT INTO public."ConsultaDifusion" ("idComunidad","idRemitente","idCliente",texto)
 VALUES(actor."idComunidad",actor.id,p_id_cliente,btrim(p_texto)) ON CONFLICT ("idRemitente","idCliente") DO NOTHING RETURNING * INTO difusion;
 IF difusion.id IS NULL THEN
  SELECT * INTO difusion FROM public."ConsultaDifusion" WHERE "idRemitente"=actor.id AND "idCliente"=p_id_cliente;
  IF difusion.texto<>btrim(p_texto) THEN RAISE EXCEPTION 'La solicitud ya fue usada con otro mensaje' USING ERRCODE='22023'; END IF;
  RETURN jsonb_build_object('id',difusion.id,'recipientCount',difusion."cantidadDestinatarios");
 END IF;
 FOR destinatario IN SELECT id FROM public."ComunidadUsuario" WHERE "idComunidad"=actor."idComunidad" AND aceptado AND "idUsuario"<>actor."idUsuario" ORDER BY id FOR SHARE LOOP
  INSERT INTO public."ConsultaConversacion" ("idComunidad","idComunidadUsuario") VALUES(actor."idComunidad",destinatario.id)
   ON CONFLICT ("idComunidadUsuario") DO UPDATE SET "idComunidad"=EXCLUDED."idComunidad" RETURNING id INTO conversacion_id;
  INSERT INTO public."ConsultaMensaje" ("idConversacion","idRemitente",texto,"esAdmin","idDifusion")
   VALUES(conversacion_id,actor.id,difusion.texto,true,difusion.id) RETURNING "creadoEn" INTO creado;
  UPDATE public."ConsultaConversacion" SET "actualizadaEn"=creado,"ultimoMensaje"=left(difusion.texto,120) WHERE id=conversacion_id;
  cantidad:=cantidad+1;
 END LOOP;
 UPDATE public."ConsultaDifusion" SET "cantidadDestinatarios"=cantidad WHERE id=difusion.id;
 RETURN jsonb_build_object('id',difusion.id,'recipientCount',cantidad);
END $$;
REVOKE ALL ON FUNCTION public."abrirConsultaClub"(bigint),public."enviarConsultaClub"(bigint,bigint,text,uuid),public."difundirConsultaClub"(bigint,text,uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public."abrirConsultaClub"(bigint),public."enviarConsultaClub"(bigint,bigint,text,uuid),public."difundirConsultaClub"(bigint,text,uuid) TO service_role;
NOTIFY pgrst,'reload schema';
COMMIT;
