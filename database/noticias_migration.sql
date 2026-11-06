-- Supabase SQL Editor, propietario. No asigna roles de administrador.
BEGIN;
CREATE TABLE IF NOT EXISTS public."Noticia" (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  "idComunidad" bigint NOT NULL REFERENCES public."Comunidad"(id),
  "idAutor" bigint REFERENCES public."ComunidadUsuario"(id),
  titulo text NOT NULL CHECK (length(btrim(titulo)) BETWEEN 5 AND 140),
  texto text NOT NULL CHECK (length(btrim(texto)) BETWEEN 20 AND 8000),
  "imagenPath" text,
  "imagenUrl" text,
  "fechaPublicacion" timestamptz NOT NULL DEFAULT now(),
  "eliminadoEn" timestamptz,
  "esDemo" boolean NOT NULL DEFAULT false,
  "demoClave" text,
  CONSTRAINT "Noticia_imagen_check" CHECK (
    ("imagenPath" IS NOT NULL AND "imagenUrl" IS NULL AND length("imagenPath")>0) OR
    ("imagenPath" IS NULL AND "imagenUrl" IS NOT NULL AND
      ("imagenUrl" ~ '^/club-logos/[a-z0-9-]+[.](png|jpg|jpeg|webp|svg)$' OR "imagenUrl" ~ '^https://[^[:space:]]+$'))),
  CONSTRAINT "Noticia_autor_check" CHECK ("esDemo" OR "idAutor" IS NOT NULL),
  CONSTRAINT "Noticia_demo_unica" UNIQUE ("idComunidad","demoClave")
);
CREATE INDEX IF NOT EXISTS "Noticia_club_fecha_idx" ON public."Noticia" ("idComunidad",id DESC) WHERE "eliminadoEn" IS NULL;
ALTER TABLE public."Noticia" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public."Noticia" FROM PUBLIC,anon,authenticated;
GRANT SELECT,INSERT,UPDATE,DELETE ON public."Noticia" TO service_role;
GRANT USAGE,SELECT ON SEQUENCE public."Noticia_id_seq" TO service_role;

CREATE OR REPLACE FUNCTION public."publicarNoticiaClub"(p_id_actor bigint,p_titulo text,p_texto text,p_imagen_path text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE actor public."ComunidadUsuario"%ROWTYPE; admin_id bigint; noticia_id bigint;
BEGIN
  SELECT * INTO actor FROM public."ComunidadUsuario" WHERE id=p_id_actor AND aceptado FOR SHARE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Membresía no activa' USING ERRCODE='42501'; END IF;
  SELECT id INTO admin_id FROM public."Administrador" WHERE "idComunidadUsuario"=actor.id AND "idComunidad"=actor."idComunidad" LIMIT 1 FOR SHARE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Solo un administrador de este club puede publicar noticias' USING ERRCODE='42501'; END IF;
  IF p_titulo IS NULL OR length(btrim(p_titulo)) NOT BETWEEN 5 AND 140 OR p_texto IS NULL OR length(btrim(p_texto)) NOT BETWEEN 20 AND 8000
    OR p_imagen_path IS NULL OR p_imagen_path !~ ('^'||actor."idComunidad"||'/'||actor.id||'/[0-9a-f-]{36}[.](png|jpg|webp)$') THEN
    RAISE EXCEPTION 'Completá título, texto e imagen de la noticia' USING ERRCODE='22023';
  END IF;
  INSERT INTO public."Noticia" ("idComunidad","idAutor",titulo,texto,"imagenPath")
    VALUES(actor."idComunidad",actor.id,btrim(p_titulo),btrim(p_texto),p_imagen_path) RETURNING id INTO noticia_id;
  RETURN jsonb_build_object('id',noticia_id);
END $$;

CREATE OR REPLACE FUNCTION public."eliminarNoticiaClub"(p_id_actor bigint,p_id_noticia bigint)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE actor public."ComunidadUsuario"%ROWTYPE; admin_id bigint; noticia public."Noticia"%ROWTYPE;
BEGIN
  SELECT * INTO actor FROM public."ComunidadUsuario" WHERE id=p_id_actor AND aceptado FOR SHARE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Membresía no activa' USING ERRCODE='42501'; END IF;
  SELECT id INTO admin_id FROM public."Administrador" WHERE "idComunidadUsuario"=actor.id AND "idComunidad"=actor."idComunidad" LIMIT 1 FOR SHARE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Solo un administrador de este club puede eliminar noticias' USING ERRCODE='42501'; END IF;
  SELECT * INTO noticia FROM public."Noticia" WHERE id=p_id_noticia AND "idComunidad"=actor."idComunidad" AND "eliminadoEn" IS NULL FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Noticia no encontrada' USING ERRCODE='P0002'; END IF;
  UPDATE public."Noticia" SET "eliminadoEn"=now() WHERE id=noticia.id;
  RETURN jsonb_build_object('imagenPath',noticia."imagenPath");
END $$;
REVOKE ALL ON FUNCTION public."publicarNoticiaClub"(bigint,text,text,text),public."eliminarNoticiaClub"(bigint,bigint) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public."publicarNoticiaClub"(bigint,text,text,text),public."eliminarNoticiaClub"(bigint,bigint) TO service_role;

INSERT INTO storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
VALUES ('noticias','noticias',false,5242880,ARRAY['image/jpeg','image/png','image/webp'])
ON CONFLICT (id) DO UPDATE SET public=false,file_size_limit=EXCLUDED.file_size_limit,allowed_mime_types=EXCLUDED.allowed_mime_types;
-- Denegar acceso directo aunque existan políticas permisivas de otros módulos.
DROP POLICY IF EXISTS noticias_no_client_access ON storage.objects;
CREATE POLICY noticias_no_client_access ON storage.objects AS RESTRICTIVE FOR ALL TO anon,authenticated
  USING (bucket_id <> 'noticias') WITH CHECK (bucket_id <> 'noticias');
NOTIFY pgrst,'reload schema';
COMMIT;
