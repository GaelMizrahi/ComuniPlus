// Isolated PostgreSQL-engine integration checks. Never points at production.
// See database/README.md for the pinned, external PGlite installation command.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
const { PGlite } = await import(process.env.PGLITE_MODULE || '@electric-sql/pglite');

test('Mercado migration and transactional authorization on an isolated PostgreSQL engine', async (t) => {
  const db = new PGlite();
  t.after(() => db.close());
  await db.exec(await readFile(new URL('./test-fixtures/mercado_base.sql', import.meta.url), 'utf8'));
  const migration = await readFile(new URL('./mercado_migration.sql', import.meta.url), 'utf8');
  const preflight = await readFile(new URL('./mercado_preflight.sql', import.meta.url), 'utf8');
  const before = (await db.query(preflight)).rows[0];
  assert.ok(Object.values(before).every((value) => value === false));
  await db.exec(migration);
  await db.exec(migration); // same migration can safely be reapplied
  await t.test('read-only preflight detects missing setup and confirms all prerequisites after migration', async () => {
    const after = (await db.query(preflight)).rows[0];
    assert.ok(Object.values(after).every((value) => value === true));
  });
  const call = async (name, params) => (await db.query(`SELECT public."${name}"(${params.map((_, i) => '$' + (i + 1)).join(',')}) AS result`, params)).rows[0].result;
  const save = (actor = 10, changes = {}, id = null) => call('guardarProductoMercado', [id, actor, {
    titulo: 'Mesa', descripcion: 'Madera', precio: 10.50, categoria: 'Hogar', estado: 2, tipo: 'producto', fotoPath: `1/${actor}/image.png`, ...changes
  }]);
  const reserve = (id, buyer) => call('reservarProductoMercado', [id, buyer]);
  const manage = (id, actor, action) => call('gestionarProductoMercado', [id, actor, action]);
  const query = async (sql, params = []) => (await db.query(sql, params)).rows;
  const rejectCode = (code) => (error) => error.code === code;

  await t.test('reapplication preserves rows, numeric price accepts cents, buyer differs from seller', async () => {
    assert.equal((await query('SELECT count(*) AS n FROM public."ComunidadUsuario"'))[0].n, 7);
    const { id } = await save();
    assert.equal(Number((await query('SELECT precio FROM public."Producto" WHERE id=$1', [id]))[0].precio), 10.5);
    await assert.rejects(reserve(id, 10), /propia/);
    await assert.rejects(reserve(id, 70), /propia/); // same user, duplicate membership
    await assert.rejects(reserve(id, 40), rejectCode('P0002'));
    await assert.rejects(reserve(id, 50), rejectCode('42501'));
  });
  await t.test('concurrent queued callers yield one reservation, no duplicate active sale', async () => {
    // PGlite serializes its single connection. Real multi-connection lock testing
    // against hosted Supabase is a separate deployment check, not claimed here.
    const { id } = await save();
    const results = await Promise.allSettled([reserve(id,20), reserve(id,30)]);
    assert.equal(results.filter((r) => r.status === 'fulfilled').length, 1);
    assert.equal(results.filter((r) => r.status === 'rejected').length, 1);
    assert.equal((await query('SELECT disponibilidad FROM public."Producto" WHERE id=$1',[id]))[0].disponibilidad, 2);
    assert.equal((await query('SELECT count(*) AS n FROM public."Venta" WHERE "idProducto"=$1 AND estado=1',[id]))[0].n, 1);
    await assert.rejects(db.query('INSERT INTO public."Venta" ("idProducto","idComprador","idVendedor","idComunidad",estado) VALUES ($1,30,10,1,1)',[id]), rejectCode('23505'));
  });
  await t.test('only seller edits/sells; seller completes reservation atomically and sale cannot be reserved', async () => {
    const { id } = await save(); await reserve(id,20);
    await assert.rejects(save(20, {}, id), rejectCode('42501'));
    await assert.rejects(manage(id,20,'vendido'), rejectCode('42501'));
    await manage(id,10,'vendido');
    assert.equal((await query('SELECT disponibilidad FROM public."Producto" WHERE id=$1',[id]))[0].disponibilidad, 3);
    assert.equal((await query('SELECT estado FROM public."Venta" WHERE "idProducto"=$1',[id]))[0].estado, 2);
    await assert.rejects(reserve(id,30), /no está disponible/);
    await assert.rejects(save(10, {}, id), /vendida/);
  });
  await t.test('delete restricted to owner or administrator of that same community; history retained', async () => {
    const { id } = await save(); await reserve(id,20);
    await db.exec('INSERT INTO public."Administrador" (id,"idComunidad","idComunidadUsuario") VALUES (1,1,30),(2,2,40)');
    await assert.rejects(manage(id,20,'eliminar'), rejectCode('42501'));
    await assert.rejects(manage(id,40,'eliminar'), rejectCode('P0002'));
    await assert.rejects(manage(id,30,'vendido'), rejectCode('42501'));
    await manage(id,30,'eliminar');
    assert.ok((await query('SELECT "eliminadoEn" FROM public."Producto" WHERE id=$1',[id]))[0].eliminadoEn);
    assert.equal((await query('SELECT estado FROM public."Venta" WHERE "idProducto"=$1',[id]))[0].estado, 3);
    await assert.rejects(reserve(id,20), rejectCode('P0002'));
    const own = await save(); await manage(own.id,10,'eliminar');
  });
  await t.test('composite administrator FK prevents cross-community membership assignment', async () => {
    await assert.rejects(db.exec('INSERT INTO public."Administrador" (id,"idComunidad","idComunidadUsuario") VALUES (3,1,40)'), rejectCode('23503'));
  });
  await t.test('revoked memberships cannot mutate; database validation cannot be bypassed', async () => {
    const { id } = await save();
    await assert.rejects(save(50), rejectCode('42501'));
    await db.exec('UPDATE public."ComunidadUsuario" SET aceptado=false WHERE id=10');
    await assert.rejects(save(10, {}, id), rejectCode('42501'));
    await assert.rejects(manage(id,10,'vendido'), rejectCode('42501'));
    await assert.rejects(reserve(id,20), rejectCode('P0002'));
    await db.exec('UPDATE public."ComunidadUsuario" SET aceptado=true WHERE id=10');
    await assert.rejects(save(10,{precio:-1}), rejectCode('23514'));
    await assert.rejects(save(10,{titulo:''}), rejectCode('23514'));
    await assert.rejects(save(10,{estado:3}), rejectCode('23514'));
    await assert.rejects(save(10,{fotoPath:'2/40/not-mine.png'}), rejectCode('22023'));
  });
  await t.test('anonymous/authenticated cannot access tables or execute RPC; service_role can', async () => {
    for (const role of ['anon','authenticated']) {
      await db.exec(`SET ROLE ${role}`);
      await assert.rejects(db.exec('SELECT * FROM public."Producto"'), rejectCode('42501'));
      await assert.rejects(db.exec('SELECT * FROM public."Venta"'), rejectCode('42501'));
      await assert.rejects(reserve(1,20), rejectCode('42501'));
      await assert.rejects(save(), rejectCode('42501'));
      await assert.rejects(manage(1,10,'eliminar'), rejectCode('42501'));
      await assert.rejects(db.exec('UPDATE public."ComunidadUsuario" SET aceptado=true WHERE id=50'), rejectCode('42501'));
      await assert.rejects(db.exec('INSERT INTO public."Administrador" (id,"idComunidad","idComunidadUsuario") VALUES (99,1,20)'), rejectCode('42501'));
      await assert.rejects(db.exec("INSERT INTO storage.objects (bucket_id,name) VALUES ('mercado','blocked.png')"), rejectCode('42501'));
      await db.exec("INSERT INTO storage.objects (bucket_id,name) VALUES ('another-bucket','allowed.png')");
      await db.exec('RESET ROLE');
    }
    await db.exec('SET ROLE service_role');
    const { id } = await save(); await reserve(id,20); await manage(id,10,'vendido');
    await db.exec('RESET ROLE');
  });
  await t.test('public image bucket has required limits and MIME types', async () => {
    const [bucket] = await query("SELECT * FROM storage.buckets WHERE id='mercado'");
    assert.equal(bucket.public,true); assert.equal(bucket.file_size_limit,5242880);
    assert.deepEqual(bucket.allowed_mime_types,['image/jpeg','image/png','image/webp']);
  });
});
