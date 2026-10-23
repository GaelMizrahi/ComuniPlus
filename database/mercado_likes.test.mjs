import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
const { PGlite } = await import(process.env.PGLITE_MODULE || '@electric-sql/pglite');

test('likes and optional publication windows on isolated PostgreSQL', async (t) => {
  const db=new PGlite(); t.after(()=>db.close());
  const file=(name)=>readFile(new URL(name,import.meta.url),'utf8');
  await db.exec(await file('./test-fixtures/mercado_base.sql'));
  await db.exec(await file('./mercado_migration.sql'));
  const query=async(sql,params=[]) => (await db.query(sql,params)).rows;
  const rpc=async(name,params)=>(await query(`SELECT public."${name}"(${params.map((_,i)=>'$'+(i+1)).join(',')}) AS result`,params))[0].result;
  const save=(changes={},id=null,actor=10)=>rpc('guardarProductoMercado',[id,actor,{
    titulo:'Mesa',descripcion:'Prueba',precio:10.5,categoria:'Hogar',estado:2,tipo:'producto',fotoPath:`1/${actor}/image.png`,...changes
  }]);
  const like=(id,actor=20,liked=true)=>rpc('marcarLikeProductoMercado',[id,actor,liked]);
  const legacy=await save();
  await rpc('reservarProductoMercado',[legacy.id,20]);
  const preflight=await file('./mercado_likes_preflight.sql');
  assert.ok(Object.values((await db.query(preflight)).rows[0]).every((value)=>value===false));
  const migration=await file('./mercado_likes_visibilidad.sql');
  await db.exec(migration); await db.exec(migration);
  assert.ok(Object.values((await db.query(preflight)).rows[0]).every((value)=>value===true));
  const matches=(code)=>(error)=>error.code===code;

  await t.test('incremental migration preserves existing posts and sales, default visibility is enabled',async()=>{
    const [row]=await query('SELECT visible,"publicarDesde","publicarHasta",disponibilidad FROM public."Producto" WHERE id=$1',[legacy.id]);
    assert.equal(row.visible,true); assert.equal(row.publicarDesde,null); assert.equal(row.publicarHasta,null); assert.equal(row.disponibilidad,2);
    assert.equal((await query('SELECT count(*) AS n FROM public."Venta" WHERE "idProducto"=$1',[legacy.id]))[0].n,1);
  });
  await t.test('like/unlike are idempotent, one row per member and no Venta or availability mutation',async()=>{
    const {id}=await save();
    assert.deepEqual(await like(id),{liked:true}); assert.deepEqual(await like(id),{liked:true});
    assert.equal((await query('SELECT count(*) AS n FROM public."ProductoLike" WHERE "idProducto"=$1',[id]))[0].n,1);
    await like(id,30);
    assert.equal((await query('SELECT count(*) AS n FROM public."ProductoLike" WHERE "idProducto"=$1',[id]))[0].n,2);
    assert.equal((await query('SELECT disponibilidad FROM public."Producto" WHERE id=$1',[id]))[0].disponibilidad,1);
    assert.equal((await query('SELECT count(*) AS n FROM public."Venta" WHERE "idProducto"=$1',[id]))[0].n,0);
    await like(id,20,false); await like(id,20,false);
    assert.equal((await query('SELECT count(*) AS n FROM public."ProductoLike" WHERE "idProducto"=$1',[id]))[0].n,1);
    await like(id,10); // own publication likes are also allowed
  });
  await t.test('foreign community, revoked buyer and revoked seller cannot add likes',async()=>{
    const {id}=await save();
    await assert.rejects(like(id,40),matches('P0002')); await assert.rejects(like(id,50),matches('42501'));
    await db.exec('UPDATE public."ComunidadUsuario" SET aceptado=false WHERE id=10');
    await assert.rejects(like(id),matches('P0002'));
    await db.exec('UPDATE public."ComunidadUsuario" SET aceptado=true WHERE id=10');
    assert.deepEqual(await like(id,40,false),{liked:false});
  });
  await t.test('both optional bounds, either bound and hidden override are enforced under lock',async()=>{
    const dates=(await query("SELECT clock_timestamp()-interval '1 day' AS past,clock_timestamp()+interval '1 day' AS future"))[0];
    const cases=[
      [{},true], [{publicarDesde:dates.past},true], [{publicarDesde:dates.future},false],
      [{publicarHasta:dates.future},true], [{publicarHasta:dates.past},false],
      [{publicarDesde:dates.past,publicarHasta:dates.future},true],
      [{visible:false,publicarDesde:dates.past,publicarHasta:dates.future},false], [{visible:false},false]
    ];
    for(const [changes,allowed] of cases){
      const {id}=await save(changes);
      if(allowed) assert.equal((await like(id)).liked,true);
      else await assert.rejects(like(id),matches('P0002'));
    }
  });
  await t.test('private drafts remain editable by owner; omitted dates preserved and explicit null clears',async()=>{
    const {id}=await save({visible:false,publicarDesde:'2030-01-01T00:00:00Z',publicarHasta:'2031-01-01T00:00:00Z'});
    await save({titulo:'Nueva descripción'},id);
    let [row]=await query('SELECT visible,"publicarDesde","publicarHasta" FROM public."Producto" WHERE id=$1',[id]);
    assert.equal(row.visible,false); assert.ok(row.publicarDesde); assert.ok(row.publicarHasta);
    await save({visible:true,publicarDesde:null,publicarHasta:null},id);
    [row]=await query('SELECT visible,"publicarDesde","publicarHasta" FROM public."Producto" WHERE id=$1',[id]);
    assert.equal(row.visible,true); assert.equal(row.publicarDesde,null); assert.equal(row.publicarHasta,null);
    await assert.rejects(save({},id,20),matches('42501'));
  });
  await t.test('invalid/equal date intervals and invalid visibility roll back without changing publication',async()=>{
    for(const values of [{publicarDesde:'2031-01-01T00:00:00Z',publicarHasta:'2030-01-01T00:00:00Z'},
      {publicarDesde:'2030-01-01T00:00:00Z',publicarHasta:'2030-01-01T00:00:00Z'}, {publicarHasta:'infinity'}]) await assert.rejects(save(values),matches('23514'));
    for(const visible of ['false',null,1]) await assert.rejects(save({visible}),matches('22023'));
  });
  await t.test('hiding/deleting/selling blocks new likes; removing an existing like still works',async()=>{
    for(const action of ['hidden','vendido','eliminar']){
      const {id}=await save(); await like(id);
      if(action==='hidden') await save({visible:false},id);
      else await rpc('gestionarProductoMercado',[id,10,action]);
      await assert.rejects(like(id,30),matches('P0002'));
      await like(id,20,false);
      assert.equal((await query('SELECT count(*) AS n FROM public."ProductoLike" WHERE "idProducto"=$1',[id]))[0].n,0);
    }
  });
  await t.test('clients cannot access like table/RPC; service_role can like but can no longer reserve',async()=>{
    const {id}=await save();
    for(const role of ['anon','authenticated']){
      await db.exec(`SET ROLE ${role}`);
      await assert.rejects(query('SELECT * FROM public."ProductoLike"'),matches('42501'));
      await assert.rejects(like(id),matches('42501'));
      await db.exec('RESET ROLE');
    }
    await db.exec('SET ROLE service_role');
    await like(id); await like(id,20,false);
    await assert.rejects(rpc('reservarProductoMercado',[id,20]),matches('42501'));
    await db.exec('RESET ROLE');
  });
});
