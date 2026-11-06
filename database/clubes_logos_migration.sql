-- Supabase SQL Editor, como propietario. No borra ni recrea comunidades.
BEGIN;
ALTER TABLE public."Comunidad" ADD COLUMN IF NOT EXISTS "logoUrl" text;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='public."Comunidad"'::regclass AND conname='Comunidad_logo_obligatorio_check') THEN
    ALTER TABLE public."Comunidad" ADD CONSTRAINT "Comunidad_logo_obligatorio_check"
      CHECK ("logoUrl" IS NOT NULL AND (
        "logoUrl" ~ '^https://[^[:space:]]+$' OR
        "logoUrl" ~ '^/club-logos/[a-z0-9-]+[.](png|jpg|jpeg|webp|svg)$'
      )) NOT VALID;
  END IF;
END $$;
COMMENT ON COLUMN public."Comunidad"."logoUrl" IS
  'Logo obligatorio para altas/cambios: URL HTTPS o archivo de frontend/public/club-logos. Las comunidades antiguas pueden completarlo sin borrar datos.';
NOTIFY pgrst, 'reload schema';
COMMIT;

-- Después de completar el logo de TODAS las comunidades antiguas:
-- ALTER TABLE public."Comunidad" VALIDATE CONSTRAINT "Comunidad_logo_obligatorio_check";
