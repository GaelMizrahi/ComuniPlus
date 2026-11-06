import { writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { hashPassword } from '../backend/src/utils/passwords.js';

export const demoPassword = 'ComuniDemo2026!';
export const logoFiles = { ferro: 'ferro.jpg', macabi: 'macabi.jpg' };
export const clubs = [
  ['ferro', 'Ferro Carril Oeste', ['Ferro', 'Club Ferro Carril Oeste']],
  ['cissab', 'CISSAB', []],
  ['boca-juniors', 'Boca Juniors', ['Club Atlético Boca Juniors', 'Club Atletico Boca Juniors']],
  ['hebraica', 'Sociedad Hebraica Argentina', ['Hebraica', 'SHA']],
  ['river-plate', 'River Plate', ['Club Atlético River Plate', 'Club Atletico River Plate']],
  ['macabi', 'Macabi', ['Club Macabi', 'Macabi Buenos Aires']],
  ['hacoaj', 'Club Náutico Hacoaj', ['Club Nautico Hacoaj', 'Hacoaj']]
];
const names = ['Ana', 'Bruno', 'Carla', 'Diego', 'Elena', 'Federico', 'Gabriela', 'Hugo', 'Inés', 'Julián'];
const quote = (value) => `'${String(value).replaceAll("'", "''")}'`;

export async function generateSeed(hash = hashPassword) {
  const clubRows = clubs.map(([slug, name, aliases]) => `(${quote(slug)}, ${quote(name)}, ${quote(`/club-logos/${logoFiles[slug] ?? `${slug}.png`}`)}, ARRAY[${[name, ...aliases].map((a) => quote(a.toLowerCase().trim())).join(', ')}]::text[])`);
  const users = [];
  // Sequential derivation limits memory. Each account gets a separate random salt.
  for (const [index, [slug]] of clubs.entries()) for (let n = 1; n <= 10; n++) {
    users.push(`(${quote(slug)}, ${quote(names[n - 1])}, ${quote(`${slug}.socio${String(n).padStart(2, '0')}@demo.example.com`)}, ${12025550100 + index * 10 + n - 1}, ${900000 + index * 100 + n}, ${quote(await hash(demoPassword))})`);
  }
  return `-- SOLO DEMO. 7 clubes y 10 usuarios ficticios por club.
-- Primero aplicar registro_migration.sql y clubes_logos_migration.sql.
-- Los archivos PNG/JPG suministrados están en frontend/public/club-logos.
-- Emails: ferro.socio01@demo.example.com ... hacoaj.socio10@demo.example.com
-- Clave compartida de DEMO: ${demoPassword}
-- Repetible: no resetea contraseñas, no modifica aprobaciones ni asigna administradores.
BEGIN;
LOCK TABLE public."Comunidad", public."Usuario", public."ComunidadUsuario" IN SHARE ROW EXCLUSIVE MODE;
CREATE TEMP TABLE demo_clubes (slug text PRIMARY KEY,nombre text,logo text,aliases text[]) ON COMMIT DROP;
INSERT INTO demo_clubes VALUES
${clubRows.join(',\n')};
CREATE TEMP TABLE demo_socios (slug text,nombre text,mail text,telefono bigint,socio bigint,hash text) ON COMMIT DROP;
INSERT INTO demo_socios VALUES
${users.join(',\n')};
DO $$
DECLARE c record; u record; club_id bigint; usuario_id bigint; coincidencias integer;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='Comunidad' AND column_name='logoUrl')
    OR NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='Usuario' AND column_name='mailNormalizado') THEN
    RAISE EXCEPTION 'Primero ejecutar registro_migration.sql y clubes_logos_migration.sql';
  END IF;
  FOR c IN SELECT * FROM demo_clubes ORDER BY slug LOOP
    SELECT count(*),min(id) INTO coincidencias,club_id FROM public."Comunidad" WHERE lower(btrim(nombre))=ANY(c.aliases);
    IF coincidencias>1 THEN RAISE EXCEPTION 'Hay varias comunidades que coinciden con %. Revisar antes de cargar la demo.',c.nombre; END IF;
    IF club_id IS NULL THEN
      INSERT INTO public."Comunidad" (nombre,tipo,"logoUrl") VALUES(c.nombre,'otro',c.logo) RETURNING id INTO club_id;
    ELSE
      UPDATE public."Comunidad" SET "logoUrl"=c.logo WHERE id=club_id AND ("logoUrl" IS NULL OR btrim("logoUrl")='');
    END IF;
    FOR u IN SELECT * FROM demo_socios WHERE slug=c.slug ORDER BY socio LOOP
      SELECT id INTO usuario_id FROM public."Usuario" WHERE "mailNormalizado"=u.mail;
      IF usuario_id IS NULL THEN
        INSERT INTO public."Usuario" (nombre,apellido,mail,"contraseña",telefono)
          VALUES(u.nombre,'Demo',u.mail,u.hash,u.telefono) RETURNING id INTO usuario_id;
      ELSIF NOT EXISTS (SELECT 1 FROM public."Usuario" WHERE id=usuario_id AND nombre=u.nombre AND apellido='Demo' AND telefono=u.telefono) THEN
        RAISE EXCEPTION 'Un email reservado para la demo ya pertenece a otra cuenta. No se modificó esa cuenta.';
      END IF;
      IF EXISTS (SELECT 1 FROM public."ComunidadUsuario" WHERE "idUsuario"=usuario_id AND "idComunidad"<>club_id) THEN
        RAISE EXCEPTION 'Una cuenta de demo ya está vinculada a otra comunidad. No se trasladó.';
      END IF;
      IF NOT EXISTS (SELECT 1 FROM public."ComunidadUsuario" WHERE "idUsuario"=usuario_id AND "idComunidad"=club_id) THEN
        INSERT INTO public."ComunidadUsuario" ("idComunidad","idUsuario",aceptado,rechazado,"nroSocio")
          VALUES(club_id,usuario_id,true,false,u.socio);
      END IF;
    END LOOP;
  END LOOP;
END $$;
SELECT c.nombre AS club,c."logoUrl",count(m.id) AS usuarios_demo
FROM public."Comunidad" c
JOIN public."ComunidadUsuario" m ON m."idComunidad"=c.id
JOIN public."Usuario" u ON u.id=m."idUsuario"
JOIN demo_socios d ON d.mail=u."mailNormalizado"
GROUP BY c.id,c.nombre,c."logoUrl" ORDER BY c.nombre;
COMMIT;
`;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await writeFile(new URL('./clubes_demo_seed.sql', import.meta.url), await generateSeed());
  console.log('Generado database/clubes_demo_seed.sql: 7 clubes, 70 usuarios, hashes scrypt con sales distintas.');
}
