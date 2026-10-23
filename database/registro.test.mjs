import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
const {PGlite}=await import(process.env.PGLITE_MODULE||'@electric-sql/pglite');

test('registration and membership decisions on isolated PostgreSQL',async(t)=>{
  const db=new PGlite();t.after(()=>db.close());
  await db.exec(await readFile(new URL('./test-fixtures/registro_base.sql',import.meta.url),'utf8'));
  const migration=await readFile(new URL('./registro_migration.sql',import.meta.url),'utf8');await db.exec(migration);await db.exec(migration);
  const query=async(sql,args=[])=>(await db.query(sql,args)).rows;
  const rpc=async(name,args)=>(await query(`SELECT public."${name}"(${args.map((_,i)=>'$'+(i+1)).join(',')}) AS result`,args))[0].result;
  const hash='scrypt$32768$8$1$'+'a'.repeat(32)+'$'+'b'.repeat(128);
  let next=1;
  const register=(changes={})=>{const d={name:'Persona',surname:'Prueba',email:`nueva${next++}@example.com`,phone:'5491123456789',hash,community:1,number:123,...changes};return rpc('registrarUsuarioComuni',[d.name,d.surname,d.email,d.phone,d.hash,d.community,d.number]);};
  const decide=(actor,id,approve)=>rpc('resolverSolicitudComuni',[actor,id,approve]);
  const code=(c)=>(e)=>e.code===c;
  await t.test('read-only preflight reports migrated columns, functions, permissions and unlinked administrators',async()=>{
    const results=await db.exec(await readFile(new URL('./registro_preflight.sql',import.meta.url),'utf8'));
    assert.equal(results[0].rows[0].grupos_de_email_duplicados,0);
    assert.equal(results[1].rows.length,1);assert.equal(results[1].rows[0].idComunidadUsuario,null);
    assert.equal(results[2].rows.length,3);assert.ok(results[2].rows.every((row)=>row.listo));
    assert.equal(results[3].rows.length,3);assert.ok(results[3].rows.every((row)=>row.listo));
    assert.deepEqual(results[4].rows[0],{email_unico:true,credenciales_privadas:true});
  });
  await t.test('migration keeps existing values and accepted memberships; normalized emails match legacy case and spaces',async()=>{
    const [row]=await query('SELECT mail,"mailNormalizado","contraseña" FROM public."Usuario" WHERE id=1');
    assert.equal(row.mail,' ADMIN@EXAMPLE.COM ');assert.equal(row.mailNormalizado,'admin@example.com');assert.equal(row.contraseña,'anterior');
    assert.equal((await query('SELECT count(*) AS n FROM public."ComunidadUsuario" WHERE aceptado'))[0].n,3);
  });
  await t.test('new account and membership are created together and always pending',async()=>{
    const {id}=await register();const [row]=await query('SELECT * FROM public."ComunidadUsuario" WHERE id=$1',[id]);
    assert.equal(row.aceptado,false);assert.equal(row.rechazado,false);assert.equal(row.idComunidad,1);assert.equal(row.nroSocio,123);
    const [account]=await query('SELECT "contraseña" FROM public."Usuario" WHERE id=$1',[row.idUsuario]);assert.equal(account.contraseña,hash);
    assert.equal((await query('SELECT count(*) AS n FROM public."Administrador"'))[0].n,3);
  });
  await t.test('normalized duplicates and invalid communities fail without orphaned accounts',async()=>{
    const before=(await query('SELECT count(*) AS n FROM public."Usuario"'))[0].n;
    await assert.rejects(register({email:'admin@EXAMPLE.com'}),code('23505'));
    await assert.rejects(register({community:999}),code('22023'));
    assert.equal((await query('SELECT count(*) AS n FROM public."Usuario"'))[0].n,before);
  });
  await t.test('failure inserting the membership rolls back the preceding user insert',async()=>{
    await db.exec(`CREATE FUNCTION fail_test_membership() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW."nroSocio"=999999 THEN RAISE EXCEPTION 'test failure'; END IF; RETURN NEW; END $$;
      CREATE TRIGGER test_membership_failure BEFORE INSERT ON public."ComunidadUsuario" FOR EACH ROW EXECUTE FUNCTION fail_test_membership();`);
    const before=(await query('SELECT count(*) AS n FROM public."Usuario"'))[0].n;
    await assert.rejects(register({number:999999}),code('P0001'));
    assert.equal((await query('SELECT count(*) AS n FROM public."Usuario"'))[0].n,before);
    await db.exec('DROP TRIGGER test_membership_failure ON public."ComunidadUsuario";DROP FUNCTION fail_test_membership();');
  });
  await t.test('only same-community administrators can approve a pending request',async()=>{
    const {id}=await register();
    await assert.rejects(decide(2,id,true),code('P0002'));await assert.rejects(decide(3,id,true),code('42501'));
    await decide(1,id,true);
    const [row]=await query('SELECT aceptado,rechazado FROM public."ComunidadUsuario" WHERE id=$1',[id]);assert.equal(row.aceptado,true);assert.equal(row.rechazado,false);
    await assert.rejects(decide(1,id,false),code('P0001'));
  });
  await t.test('rejection retains account but never authorizes membership; races cannot reverse a decided request',async()=>{
    const {id}=await register();await decide(1,id,false);
    const [row]=await query('SELECT aceptado,rechazado FROM public."ComunidadUsuario" WHERE id=$1',[id]);assert.equal(row.aceptado,false);assert.equal(row.rechazado,true);
    await assert.rejects(decide(1,id,true),code('P0001'));
    await assert.rejects(query('UPDATE public."ComunidadUsuario" SET aceptado=true WHERE id=$1',[id]),code('23514'));
    const other=await register();await db.exec('UPDATE public."ComunidadUsuario" SET aceptado=false WHERE id=1');
    await assert.rejects(decide(1,other.id,true),code('42501'));await db.exec('UPDATE public."ComunidadUsuario" SET aceptado=true WHERE id=1');
  });
  await t.test('legacy upgrade requires the previous value and cannot replace an already hashed password',async()=>{
    assert.equal(await rpc('actualizarClaveLegacyComuni',[1,'wrong',hash]),false);
    assert.equal(await rpc('actualizarClaveLegacyComuni',[1,'anterior',hash]),true);
    assert.equal(await rpc('actualizarClaveLegacyComuni',[1,hash,hash]),false);
    await assert.rejects(rpc('actualizarClaveLegacyComuni',[1,hash,'plaintext']),code('22023'));
  });
  await t.test('anonymous/authenticated cannot read credentials, self-approve, assign admins or call RPCs',async()=>{
    const {id}=await register();
    for(const role of ['anon','authenticated']){
      await db.exec(`SET ROLE ${role}`);
      await assert.rejects(query('SELECT * FROM public."Usuario"'),code('42501'));
      await assert.rejects(query('UPDATE public."ComunidadUsuario" SET aceptado=true WHERE id=$1',[id]),code('42501'));
      await assert.rejects(query('INSERT INTO public."Administrador" ("idComunidad","idComunidadUsuario") VALUES(1,3)'),code('42501'));
      await assert.rejects(register(),code('42501'));await assert.rejects(decide(1,id,true),code('42501'));
      await assert.rejects(rpc('actualizarClaveLegacyComuni',[1,hash,hash]),code('42501'));
      await db.exec('RESET ROLE');
    }
    await db.exec('SET ROLE service_role');const pending=await register();await decide(1,pending.id,true);await db.exec('RESET ROLE');
  });
});
