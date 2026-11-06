import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
const { PGlite } = await import(process.env.PGLITE_MODULE || '@electric-sql/pglite');
const read = (name) => readFile(new URL(name, import.meta.url), 'utf8');

test('club isolation permissions and legacy participant FK on PostgreSQL', async (t) => {
 const db = new PGlite(); t.after(() => db.close());
 await db.exec(await read('./test-fixtures/registro_base.sql'));
 await db.exec(`
 CREATE TABLE public."Cancha" (id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,"idComunidad" bigint REFERENCES public."Comunidad");
 CREATE TABLE public."Reserva" (id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,"idCancha" bigint REFERENCES public."Cancha");
 CREATE TABLE public."ComunidadUsuarioReserva" (id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,"idComunidadUsuario" bigint REFERENCES public."ComunidadUsuario","idReserva" bigint REFERENCES public."Reserva");
 CREATE TABLE public."solicitudViaje" (id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,"idComunidad" bigint,"idSolicitante" bigint);
 CREATE TABLE public."Viaje" (id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,"idComunidad" bigint,"idConductor" bigint,"idSolicitudViaje" bigint);
 CREATE TABLE public."Partido" (id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,"idComunidadUsuario" bigint);
 CREATE TABLE public."PartidoJugador" (id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,"idPartido" bigint,"idComunidadUsuario" bigint);
 CREATE TABLE public."FaltaJugadorPartido" (id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,"idComunidad" bigint);
 CREATE TABLE public."FaltaJugadorParticipante" (id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,"idPartido" bigint REFERENCES public."FaltaJugadorPartido","idComunidadUsuario" bigint REFERENCES public."Usuario");
 INSERT INTO public."Cancha" ("idComunidad") VALUES(1);
 INSERT INTO public."Reserva" ("idCancha") VALUES(1);
 INSERT INTO public."ComunidadUsuarioReserva" ("idComunidadUsuario","idReserva") VALUES(1,1);
 INSERT INTO public."solicitudViaje" ("idComunidad","idSolicitante") VALUES(1,1);
 INSERT INTO public."Viaje" ("idComunidad","idConductor","idSolicitudViaje") VALUES(1,1,1);
 INSERT INTO public."Partido" ("idComunidadUsuario") VALUES(1);
 INSERT INTO public."FaltaJugadorPartido" ("idComunidad") VALUES(1);
 INSERT INTO public."FaltaJugadorParticipante" ("idPartido","idComunidadUsuario") VALUES(1,1);
 INSERT INTO public."ComunidadUsuario" (id,"idComunidad","idUsuario",aceptado,"nroSocio") OVERRIDING SYSTEM VALUE VALUES(101,1,1,true,501);
 GRANT ALL ON ALL TABLES IN SCHEMA public TO PUBLIC,anon,authenticated;
 `);
 const sql = await read('./aislamiento_clubes.sql');
 await db.exec(sql); await db.exec(sql);
 await t.test('migration repeats without deleting or reassigning existing rows', async () => {
  assert.deepEqual((await db.query('SELECT "idComunidad","idSolicitante" FROM public."solicitudViaje"')).rows,[{idComunidad:1,idSolicitante:1}]);
  assert.equal((await db.query('SELECT count(*) AS n FROM public."FaltaJugadorParticipante"')).rows[0].n,1);
 });
 await t.test('direct client roles cannot read/write resource tables while backend retains access', async () => {
  const tables=['Cancha','Reserva','ComunidadUsuarioReserva','solicitudViaje','Viaje','Partido','PartidoJugador','FaltaJugadorPartido','FaltaJugadorParticipante'];
  for(const role of ['anon','authenticated']){
   await db.exec(`SET ROLE ${role}`);
   for(const table of tables)await assert.rejects(db.query(`SELECT * FROM public."${table}"`),(e)=>e.code==='42501');
   await assert.rejects(db.query('DELETE FROM public."Cancha"'),(e)=>e.code==='42501');
   await db.exec('RESET ROLE');
  }
  await db.exec('SET ROLE service_role');
  for(const table of tables)await db.query(`SELECT * FROM public."${table}"`);
  await db.query('INSERT INTO public."Cancha" ("idComunidad") VALUES(1)');
  await db.exec('RESET ROLE');
 });
 await t.test('participant FK accepts membership IDs that differ from Usuario IDs', async () => {
  await db.exec('SET ROLE service_role');
  await db.query('INSERT INTO public."FaltaJugadorParticipante" ("idPartido","idComunidadUsuario") VALUES(1,101)');
  await assert.rejects(db.query('INSERT INTO public."FaltaJugadorParticipante" ("idPartido","idComunidadUsuario") VALUES(1,999)'),(e)=>e.code==='23503');
  await db.exec('RESET ROLE');
 });
 await t.test('read-only diagnostic reports resource permissions and no crossed fixture data', async () => {
  const [integrity,permissions]=await db.exec(await read('./aislamiento_clubes_preflight.sql'));
  assert.ok(integrity.rows.every((row)=>row.inconsistencias===0));
  assert.equal(permissions.rows.length,9);
  assert.ok(permissions.rows.every((row)=>row.lectura_directa_bloqueada&&row.backend_con_acceso));
 });
});
