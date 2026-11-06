import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
const { PGlite } = await import(process.env.PGLITE_MODULE || '@electric-sql/pglite');
const read = (name) => readFile(new URL(name, import.meta.url), 'utf8');
test('news migration, administrator authorization, private images and demo seed', async (t) => {
 const db=new PGlite();t.after(()=>db.close());
 await db.exec(await read('./test-fixtures/registro_base.sql'));
 await db.exec(`CREATE SCHEMA storage;
 CREATE TABLE storage.buckets (id text PRIMARY KEY,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
 CREATE TABLE storage.objects (id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,bucket_id text,name text);
 ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
 GRANT USAGE ON SCHEMA storage TO anon,authenticated,service_role;
 GRANT ALL ON storage.objects TO anon,authenticated,service_role;
 GRANT USAGE ON SEQUENCE storage.objects_id_seq TO anon,authenticated,service_role;
 CREATE POLICY old_broad_policy ON storage.objects FOR ALL TO anon,authenticated USING(true) WITH CHECK(true);`);
 const migration=await read('./noticias_migration.sql');await db.exec(migration);await db.exec(migration);
 const query=async(sql,args=[])=>(await db.query(sql,args)).rows;
 const image='1/1/11111111-1111-4111-8111-111111111111.png';
 const publish=(actor=1,path=image)=>query('SELECT public."publicarNoticiaClub"($1,$2,$3,$4) AS result',[actor,'Noticia de prueba','Contenido suficientemente largo para la noticia del club.',path]);
 const remove=(actor,id)=>query('SELECT public."eliminarNoticiaClub"($1,$2)',[actor,id]);
 let id;
 await t.test('only a currently accepted same-community administrator publishes and the community is server-derived',async()=>{
  await assert.rejects(publish(3),e=>e.code==='42501');
  await assert.rejects(publish(1,'2/1/11111111-1111-4111-8111-111111111111.png'),e=>e.code==='22023');
  await assert.rejects(publish(1,'1/1/../../secret.png'),e=>e.code==='22023');
  const result=await publish();id=result[0].result.id;
  const [row]=await query('SELECT * FROM public."Noticia" WHERE id=$1',[id]);
  assert.equal(row.idComunidad,1);assert.equal(row.idAutor,1);assert.equal(row.esDemo,false);assert.equal(row.imagenPath,image);
  await db.exec('UPDATE public."ComunidadUsuario" SET aceptado=false WHERE id=1');
  await assert.rejects(publish(),e=>e.code==='42501');await db.exec('UPDATE public."ComunidadUsuario" SET aceptado=true WHERE id=1');
 });
 await t.test('only club administrators delete, foreign IDs are hidden, and deletion preserves history',async()=>{
  await assert.rejects(remove(2,id),e=>e.code==='P0002');await assert.rejects(remove(3,id),e=>e.code==='42501');
  await remove(1,id);assert.ok((await query('SELECT "eliminadoEn" FROM public."Noticia" WHERE id=$1',[id]))[0].eliminadoEn);
  await assert.rejects(remove(1,id),e=>e.code==='P0002');
 });
 await t.test('image/title/text requirements are enforced by PostgreSQL',async()=>{
  await assert.rejects(query('INSERT INTO public."Noticia" ("idComunidad","idAutor",titulo,texto) VALUES(1,1,$1,$2)',['Título válido','Un texto con suficiente longitud']),e=>e.code==='23514');
  await assert.rejects(query('SELECT public."publicarNoticiaClub"(1,$1,$2,$3)',['','Corto',image]),e=>e.code==='22023');
  const [bucket]=await query("SELECT * FROM storage.buckets WHERE id='noticias'");assert.equal(bucket.public,false);assert.equal(bucket.file_size_limit,5242880);
  const checks=await db.exec(await read('./noticias_preflight.sql'));
  assert.ok(Object.values(checks[0].rows[0]).every(Boolean));assert.ok(checks[1].rows.every((row)=>row.permisos_correctos));assert.ok(Object.values(checks[2].rows[0]).every(Boolean));
 });
 await t.test('client roles cannot read/write news, invoke RPCs or access private images despite permissive policies',async()=>{
  await db.exec("INSERT INTO storage.objects (bucket_id,name) VALUES('noticias','private.png'),('another','allowed.png')");
  for(const role of ['anon','authenticated']){
   await db.exec(`SET ROLE ${role}`);
   await assert.rejects(query('SELECT * FROM public."Noticia"'),e=>e.code==='42501');await assert.rejects(publish(),e=>e.code==='42501');await assert.rejects(remove(1,id),e=>e.code==='42501');
   assert.deepEqual((await query('SELECT bucket_id FROM storage.objects')).map(r=>r.bucket_id),['another']);
   await assert.rejects(query("INSERT INTO storage.objects (bucket_id,name) VALUES('noticias','forged.png')"),e=>e.code==='42501');
   await db.exec('RESET ROLE');
  }
  await db.exec('SET ROLE service_role');assert.equal((await query("SELECT * FROM storage.objects WHERE bucket_id='noticias'")).length,1);await db.exec('RESET ROLE');
 });
 await t.test('seven clubs receive exactly three marked examples; repeats do not duplicate, restore or overwrite them',async()=>{
  await db.exec(await read('./registro_migration.sql'));await db.exec(await read('./clubes_logos_migration.sql'));await db.exec(await read('./clubes_demo_seed.sql'));
  const seed=await read('./noticias_demo_seed.sql');await db.exec(seed);await db.exec(seed);
  const groups=await query('SELECT "idComunidad",count(*) AS n FROM public."Noticia" WHERE "esDemo" GROUP BY "idComunidad"');assert.equal(groups.length,7);assert.ok(groups.every(r=>r.n===3));
  const [row]=await query('SELECT * FROM public."Noticia" WHERE "esDemo" LIMIT 1');assert.ok(row.imagenUrl.startsWith('/club-logos/'));assert.equal(row.idAutor,null);
  await query('UPDATE public."Noticia" SET "eliminadoEn"=now(),titulo=$1 WHERE id=$2',['Ejemplo revisado',row.id]);await db.exec(seed);
  const [preserved]=await query('SELECT * FROM public."Noticia" WHERE id=$1',[row.id]);assert.equal(preserved.titulo,'Ejemplo revisado');assert.ok(preserved.eliminadoEn);
  assert.equal((await query('SELECT count(*) AS n FROM public."Administrador"'))[0].n,3);
 });
});
