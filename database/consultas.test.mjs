import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
const {PGlite}=await import(process.env.PGLITE_MODULE||'@electric-sql/pglite');
test('private consultations and atomic club broadcasts on PostgreSQL',async(t)=>{
 const db=new PGlite();t.after(()=>db.close());
 const read=(name)=>readFile(new URL(name,import.meta.url),'utf8');
 await db.exec(await read('./test-fixtures/registro_base.sql'));
 await db.exec(`INSERT INTO public."Usuario" (nombre,apellido,mail,"contraseña",telefono) VALUES
 ('Otro','A','otro@example.com','demo',12025550100),('Pendiente','A','pending@example.com','demo',12025550101),('Admin2','A','admin2@example.com','demo',12025550102);
 INSERT INTO public."ComunidadUsuario" (id,"idComunidad","idUsuario",aceptado,"nroSocio") OVERRIDING SYSTEM VALUE VALUES(40,1,4,true,104),(50,1,5,false,105),(60,1,6,true,106),(101,2,1,true,201);
 INSERT INTO public."Administrador" ("idComunidad","idComunidadUsuario") VALUES(1,60);`);
 const migration=await read('./consultas_migration.sql');await db.exec(migration);await db.exec(migration);
 const query=async(sql,args=[])=>(await db.query(sql,args)).rows;
 const rpc=async(name,args)=>(await query(`SELECT public."${name}"(${args.map((_,i)=>'$'+(i+1)).join(',')}) AS result`,args))[0].result;
 const open=(actor)=>rpc('abrirConsultaClub',[actor]);
 const send=(actor,id,text='Consulta privada sobre una reserva',key=randomUUID())=>rpc('enviarConsultaClub',[actor,id,text,key]);
 const broadcast=(actor,text='Mensaje general para los socios de este club',key=randomUUID())=>rpc('difundirConsultaClub',[actor,text,key]);
 let own,other;
 await t.test('one private thread per membership; another user in the same club and another club cannot send there',async()=>{
  own=(await open(3)).id;other=(await open(40)).id;assert.equal((await open(3)).id,own);
  await assert.rejects(send(40,own),e=>e.code==='P0002');await assert.rejects(send(2,own),e=>e.code==='P0002');
  await assert.rejects(open(50),e=>e.code==='42501');
  const row=await send(3,own);assert.equal(row.esAdmin,false);assert.equal(row.idRemitente,3);assert.equal(row.idDifusion,null);
  const answer=await send(1,own,'Respuesta privada de la administración');assert.equal(answer.esAdmin,true);
  assert.equal((await query('SELECT count(*) AS n FROM public."ConsultaMensaje" WHERE "idConversacion"=$1',[other]))[0].n,0);
 });
 await t.test('retries are idempotent and cannot change an existing message',async()=>{
  const key=randomUUID(),first=await send(3,own,'¿Cómo reservo una cancha?',key),again=await send(3,own,'¿Cómo reservo una cancha?',key);
  assert.equal(first.id,again.id);await assert.rejects(send(3,own,'Texto diferente',key),e=>e.code==='22023');
  await assert.rejects(send(3,own,' '.repeat(5)),e=>e.code==='22023');
 });
 await t.test('only admins broadcast; copies reach every other accepted membership, excluding pending, self and other clubs',async()=>{
  await assert.rejects(broadcast(3),e=>e.code==='42501');
  const key=randomUUID(),sent=await broadcast(1,'Comunicado del club A',key);assert.equal(sent.recipientCount,3);
  const copies=await query('SELECT c."idComunidadUsuario",m.texto,m."esAdmin" FROM public."ConsultaMensaje" m JOIN public."ConsultaConversacion" c ON c.id=m."idConversacion" WHERE m."idDifusion"=$1 ORDER BY c."idComunidadUsuario"',[sent.id]);
  assert.deepEqual(copies.map(r=>r.idComunidadUsuario),[3,40,60]);assert.ok(copies.every(r=>r.esAdmin&&r.texto==='Comunicado del club A'));
  const retry=await broadcast(1,'Comunicado del club A',key);assert.equal(retry.id,sent.id);assert.equal(retry.recipientCount,3);
  assert.equal((await query('SELECT count(*) AS n FROM public."ConsultaMensaje" WHERE "idDifusion"=$1',[sent.id]))[0].n,3);
  await assert.rejects(broadcast(1,'Otro texto',key),e=>e.code==='22023');
  await send(3,own,'Mi respuesta privada al comunicado');
  assert.equal((await query('SELECT count(*) AS n FROM public."ConsultaMensaje" WHERE "idConversacion"=$1 AND "idDifusion" IS NULL',[other]))[0].n,0);
 });
 await t.test('selected membership governs multiclub users and foreign admin roles never carry over',async()=>{
  const thread=(await open(101)).id;assert.equal((await send(101,thread)).esAdmin,false);
  await assert.rejects(broadcast(101),e=>e.code==='42501');await assert.rejects(send(1,thread),e=>e.code==='P0002');
  assert.equal((await send(2,thread)).esAdmin,true);
 });
 await t.test('revoked admins or recipients cannot continue sending',async()=>{
  await db.exec('UPDATE public."ComunidadUsuario" SET aceptado=false WHERE id=40');
  await assert.rejects(send(1,other),e=>e.code==='P0001');await assert.rejects(send(40,other),e=>e.code==='42501');
  await db.exec('UPDATE public."ComunidadUsuario" SET aceptado=true WHERE id=40');
  await db.exec('DELETE FROM public."Administrador" WHERE "idComunidadUsuario"=60');
  await assert.rejects(send(60,own),e=>e.code==='P0002');await assert.rejects(broadcast(60),e=>e.code==='42501');
 });
 await t.test('anonymous/authenticated cannot read private tables or call any chat RPC; service role can',async()=>{
  for(const role of ['anon','authenticated']){
   await db.exec(`SET ROLE ${role}`);
   for(const table of ['ConsultaConversacion','ConsultaMensaje','ConsultaDifusion'])await assert.rejects(query(`SELECT * FROM public."${table}"`),e=>e.code==='42501');
   await assert.rejects(open(3),e=>e.code==='42501');await assert.rejects(send(3,own),e=>e.code==='42501');await assert.rejects(broadcast(1),e=>e.code==='42501');await db.exec('RESET ROLE');
  }
  await db.exec('SET ROLE service_role');assert.equal((await open(3)).id,own);await db.exec('RESET ROLE');
  const checks=await db.exec(await read('./consultas_preflight.sql'));
  assert.equal(checks[0].rows.length,3);assert.ok(checks[0].rows.every((row)=>row.existe&&row.rls_activo&&row.lectura_directa_bloqueada&&row.backend_con_acceso));
  assert.ok(checks[1].rows.every((row)=>row.permisos_correctos));
 });
 await t.test('a failed broadcast transaction leaves no partial delivery',async()=>{
  await db.exec(`CREATE FUNCTION fail_chat_test() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.texto='Forzar rollback' AND NEW."idConversacion"=${other} THEN RAISE EXCEPTION 'test failure'; END IF; RETURN NEW; END $$;
  CREATE TRIGGER fail_chat_test BEFORE INSERT ON public."ConsultaMensaje" FOR EACH ROW EXECUTE FUNCTION fail_chat_test();`);
  const before=(await query('SELECT count(*) AS n FROM public."ConsultaMensaje"'))[0].n;
  await assert.rejects(broadcast(1,'Forzar rollback'),e=>e.code==='P0001');
  assert.equal((await query('SELECT count(*) AS n FROM public."ConsultaMensaje"'))[0].n,before);
  assert.equal((await query('SELECT count(*) AS n FROM public."ConsultaDifusion" WHERE texto=$1',['Forzar rollback']))[0].n,0);
 });
});
