import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { verifyPassword, hashPassword } from '../backend/src/utils/passwords.js';
import { demoPassword } from './generar_clubes_demo.mjs';
const { PGlite } = await import(process.env.PGLITE_MODULE || '@electric-sql/pglite');
const read = (name) => readFile(new URL(name, import.meta.url), 'utf8');

test('club logos and demo seed on isolated PostgreSQL', async (t) => {
  const db = new PGlite(); t.after(() => db.close());
  await db.exec(await read('./test-fixtures/registro_base.sql'));
  await db.exec('INSERT INTO public."Comunidad" (nombre) VALUES (\'Ferro\')');
  await db.exec(await read('./registro_migration.sql'));
  const migration = await read('./clubes_logos_migration.sql');
  await db.exec(migration); await db.exec(migration);
  const seed = await read('./clubes_demo_seed.sql');
  const query = async (sql, args = []) => (await db.query(sql, args)).rows;

  await t.test('existing communities survive; new or updated rows require a valid logo reference', async () => {
    assert.equal((await query('SELECT count(*) AS n FROM public."Comunidad" WHERE "logoUrl" IS NULL'))[0].n, 3);
    for (const logo of [null, '', 'javascript:alert(1)', '/wrong/path.png', 'http://example.com/logo.png']) {
      await assert.rejects(query('INSERT INTO public."Comunidad" (nombre,"logoUrl") VALUES (\'Invalid\',$1)', [logo]), (e) => e.code === '23514');
    }
  });
  await t.test('seed creates 70 accepted fictional members with independently salted login-compatible hashes', async () => {
    await db.exec(seed);
    const users = await query('SELECT * FROM public."Usuario" WHERE mail LIKE \'%@demo.example.com\'');
    assert.equal(users.length, 70); assert.equal(new Set(users.map((u) => u.contraseña)).size, 70);
    assert.ok(users.every((u) => u.contraseña.startsWith('scrypt$32768$8$1$')));
    assert.equal(await verifyPassword(demoPassword, users[0].contraseña), true);
    assert.equal(await verifyPassword('incorrecta', users[0].contraseña), false);
    const groups = await query('SELECT m."idComunidad",count(*) AS n FROM public."ComunidadUsuario" m JOIN public."Usuario" u ON u.id=m."idUsuario" WHERE u.mail LIKE \'%@demo.example.com\' AND m.aceptado AND NOT m.rechazado GROUP BY m."idComunidad"');
    assert.equal(groups.length, 7); assert.ok(groups.every((row) => row.n === 10));
    assert.equal((await query('SELECT count(*) AS n FROM public."Administrador"'))[0].n, 3);
    assert.equal((await query('SELECT id,"logoUrl" FROM public."Comunidad" WHERE nombre=\'Ferro\''))[0].id, 3);
  });
  await t.test('repeat keeps accounts, changed passwords, decisions and existing logos', async () => {
    const newHash = await hashPassword('Nueva clave demo!');
    await query('UPDATE public."Usuario" SET "contraseña"=$1 WHERE mail=\'ferro.socio01@demo.example.com\'', [newHash]);
    await db.exec('UPDATE public."ComunidadUsuario" SET aceptado=false,rechazado=true WHERE "idUsuario"=(SELECT id FROM public."Usuario" WHERE mail=\'ferro.socio02@demo.example.com\')');
    await db.exec('UPDATE public."Comunidad" SET "logoUrl"=\'https://example.com/official.png\' WHERE id=3');
    await db.exec(seed);
    assert.equal((await query('SELECT count(*) AS n FROM public."Usuario"'))[0].n, 73);
    assert.equal((await query('SELECT "contraseña" FROM public."Usuario" WHERE mail=\'ferro.socio01@demo.example.com\''))[0].contraseña, newHash);
    assert.equal((await query('SELECT count(*) AS n FROM public."ComunidadUsuario" WHERE rechazado'))[0].n, 1);
    assert.equal((await query('SELECT "logoUrl" FROM public."Comunidad" WHERE id=3'))[0].logoUrl, 'https://example.com/official.png');
  });
  await t.test('an occupied demo email aborts instead of modifying an unrelated account', async () => {
    await db.exec('UPDATE public."Usuario" SET apellido=\'Cuenta existente\' WHERE mail=\'boca-juniors.socio01@demo.example.com\'');
    await assert.rejects(db.exec(seed), /email reservado/); await db.exec('ROLLBACK');
    assert.equal((await query('SELECT apellido FROM public."Usuario" WHERE mail=\'boca-juniors.socio01@demo.example.com\''))[0].apellido, 'Cuenta existente');
    await db.exec('UPDATE public."Usuario" SET apellido=\'Demo\' WHERE mail=\'boca-juniors.socio01@demo.example.com\'');
  });
  await t.test('ambiguous existing communities abort without guessing or merging', async () => {
    await db.exec('INSERT INTO public."Comunidad" (nombre,"logoUrl") VALUES (\'Ferro Carril Oeste\',\'/club-logos/ferro.png\')');
    await assert.rejects(db.exec(seed), /varias comunidades/); await db.exec('ROLLBACK');
    assert.equal((await query('SELECT count(*) AS n FROM public."Usuario"'))[0].n, 73);
  });
});
