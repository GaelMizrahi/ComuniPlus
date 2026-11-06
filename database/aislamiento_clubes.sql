-- Supabase SQL Editor, propietario. Aplicación con JWT propio y acceso vía Express.
-- No copia, elimina ni reasigna registros entre clubes.
BEGIN;
DO $$
DECLARE nombre text; tabla regclass; secuencia text; restriccion record; columna smallint;
BEGIN
  FOREACH nombre IN ARRAY ARRAY['Cancha','Reserva','ComunidadUsuarioReserva','solicitudViaje','Viaje','Partido','PartidoJugador','FaltaJugadorPartido','FaltaJugadorParticipante'] LOOP
    tabla := to_regclass(format('public.%I',nombre));
    IF tabla IS NOT NULL THEN
      EXECUTE format('REVOKE ALL ON TABLE %s FROM PUBLIC,anon,authenticated',tabla);
      EXECUTE format('GRANT SELECT,INSERT,UPDATE,DELETE ON TABLE %s TO service_role',tabla);
      secuencia := pg_get_serial_sequence(format('public.%I',nombre),'id');
      IF secuencia IS NOT NULL THEN EXECUTE format('GRANT USAGE,SELECT ON SEQUENCE %s TO service_role',secuencia); END IF;
    END IF;
  END LOOP;

  -- Algunos esquemas antiguos apuntaban este campo a Usuario en lugar de a la
  -- membresía. Corregir el destino, sin reinterpretar IDs de filas históricas.
  tabla := to_regclass('public."FaltaJugadorParticipante"');
  IF tabla IS NOT NULL THEN
    SELECT attnum INTO columna FROM pg_attribute WHERE attrelid=tabla AND attname='idComunidadUsuario' AND NOT attisdropped;
    FOR restriccion IN SELECT conname FROM pg_constraint
      WHERE conrelid=tabla AND contype='f' AND conkey=ARRAY[columna] AND confrelid='public."Usuario"'::regclass
    LOOP EXECUTE format('ALTER TABLE %s DROP CONSTRAINT %I',tabla,restriccion.conname); END LOOP;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid=tabla AND contype='f' AND conkey=ARRAY[columna] AND confrelid='public."ComunidadUsuario"'::regclass) THEN
      ALTER TABLE public."FaltaJugadorParticipante" ADD CONSTRAINT "FaltaJugadorParticipante_membresia_fkey"
        FOREIGN KEY ("idComunidadUsuario") REFERENCES public."ComunidadUsuario"(id) NOT VALID;
    END IF;
  END IF;
END $$;
NOTIFY pgrst,'reload schema';
COMMIT;
