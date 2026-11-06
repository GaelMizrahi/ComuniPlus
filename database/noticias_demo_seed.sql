-- Tres ejemplos por cada uno de los siete clubes de la demo. Repetible.
-- Primero aplicar noticias_migration.sql. No concede permisos de administrador.
BEGIN;
DO $$
DECLARE club record; comunidad_id bigint; coincidencias integer; n integer; titulo_demo text; texto_demo text;
BEGIN
  FOR club IN SELECT * FROM (VALUES
    ('Ferro Carril Oeste',ARRAY['ferro carril oeste','ferro','club ferro carril oeste']),
    ('CISSAB',ARRAY['cissab']),
    ('Boca Juniors',ARRAY['boca juniors','club atlético boca juniors','club atletico boca juniors']),
    ('Sociedad Hebraica Argentina',ARRAY['sociedad hebraica argentina','hebraica','sha']),
    ('River Plate',ARRAY['river plate','club atlético river plate','club atletico river plate']),
    ('Macabi',ARRAY['macabi','club macabi','macabi buenos aires']),
    ('Club Náutico Hacoaj',ARRAY['club náutico hacoaj','club nautico hacoaj','hacoaj'])
  ) AS c(nombre,aliases) LOOP
    SELECT count(*),min(id) INTO coincidencias,comunidad_id FROM public."Comunidad" WHERE lower(btrim(nombre))=ANY(club.aliases);
    IF coincidencias<>1 THEN RAISE EXCEPTION 'Falta el club % o hay varias coincidencias. Revisar la carga de clubes antes de las noticias.',club.nombre; END IF;
    IF NOT EXISTS (SELECT 1 FROM public."Comunidad" WHERE id=comunidad_id AND "logoUrl" IS NOT NULL) THEN RAISE EXCEPTION 'Falta el logo de %',club.nombre; END IF;
    FOR n IN 1..3 LOOP
      titulo_demo := CASE n WHEN 1 THEN 'Una nueva cancha para disfrutar' WHEN 2 THEN 'Jornada deportiva para socios' ELSE 'Actividades para toda la familia' END;
      texto_demo := 'Noticia de demostración de '||club.nombre||'. '||CASE n
        WHEN 1 THEN 'Este ejemplo muestra cómo comunicar la inauguración de una cancha, sus horarios y la modalidad de reserva.'
        WHEN 2 THEN 'Este ejemplo muestra cómo anunciar encuentros deportivos, inscripciones y actividades para los socios del club.'
        ELSE 'Este ejemplo muestra cómo compartir propuestas recreativas, talleres y encuentros para las familias de la comunidad.' END
        ||E'\n\nContenido ficticio para probar Comuni+. No anuncia un evento real del club. La imagen utilizada es su escudo.';
      INSERT INTO public."Noticia" ("idComunidad",titulo,texto,"imagenUrl","esDemo","demoClave")
        SELECT id,titulo_demo,texto_demo,"logoUrl",true,'demo-noticia-'||n FROM public."Comunidad" WHERE id=comunidad_id
        ON CONFLICT ("idComunidad","demoClave") DO NOTHING;
    END LOOP;
  END LOOP;
END $$;
SELECT c.nombre AS club,count(*) AS noticias_demo FROM public."Noticia" n JOIN public."Comunidad" c ON c.id=n."idComunidad"
WHERE n."demoClave" IN ('demo-noticia-1','demo-noticia-2','demo-noticia-3') GROUP BY c.id,c.nombre ORDER BY c.nombre;
COMMIT;
