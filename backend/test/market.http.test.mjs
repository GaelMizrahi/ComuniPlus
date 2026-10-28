// Starts the real Express server against an in-process Supabase HTTP stub.
// The stub key and randomly generated JWT secret are confined to this test.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { randomBytes } from 'node:crypto';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { existsSync } from 'node:fs';

test('Express Mercado routes with actual JWT middleware and Supabase client against local stub', async (t) => {
  const runtime = process.env.BACKEND_RUNTIME ? resolve(process.env.BACKEND_RUNTIME) : fileURLToPath(new URL('../', import.meta.url));
  if (existsSync(`${runtime}/.env`)) throw new Error('Usar un runtime separado sin .env para evitar credenciales reales');
  const require = createRequire(`${runtime}/package.json`);
  const jwt = require('jsonwebtoken');
  const key = randomBytes(32).toString('hex');
  const records = [];
  const likes = new Map();
  let productMode = 'normal';
  let storageMode = 'normal';
  let rpcMode = 'normal';
  const members = [{ id:10,idUsuario:1,idComunidad:100,aceptado:true }, { id:11,idUsuario:1,idComunidad:200,aceptado:true }];
  const stub = createServer(async (req, res) => {
    const url = new URL(req.url,'http://stub');
    const chunks = []; for await (const chunk of req) chunks.push(chunk);
    const bytes = Buffer.concat(chunks);
    records.push({ path:url.pathname, query:url.searchParams, body:bytes, type:req.headers['content-type'] });
    let data = [], status = 200;
    if (url.pathname.endsWith('/ComunidadUsuario')) {
      data = members.filter((m) => Object.entries(m).every(([k,v]) => url.searchParams.get(k) === `eq.${v}`));
    } else if (url.pathname.endsWith('/Comunidad')) data = { id:100,tipo:'otro' };
    else if (url.pathname.endsWith('/Producto')) {
      const community = Number(url.searchParams.get('vendedor.idComunidad')?.replace('eq.',''));
      const id = community === 100 ? 50 : 60;
      const requested = url.searchParams.get('id');
      data = requested && requested !== `eq.${id}` ? [] : [{ id, titulo:`Publicación ${community}`, descripcion:'Prueba', precio:0, categoria:'Otros', estado:2, tipo:'producto', disponibilidad:1,idVendedor:20,
        vendedor:{ usuario:{ nombre:'Vendedor',apellido:'Prueba',telefono:'5491100000000' } } }];
      if (['hidden','future','expired'].includes(productMode)) for(const row of data) {
        if(productMode==='hidden') row.visible=false;
        if(productMode==='future') row.publicarDesde='2999-01-01T00:00:00Z';
        if(productMode==='expired') row.publicarHasta='2000-01-01T00:00:00Z';
      }
      if (productMode === 'empty') data = [];
      if (productMode === 'missing-column') { status=400; data={ code:'42703',message:'column Producto.eliminadoEn does not exist' }; }
    } else if(url.pathname.endsWith('/ProductoLike')) {
      const actor=Number(url.searchParams.get('idComunidadUsuario')?.replace('eq.',''));
      data=[...(likes.get(actor)??[])].map((idProducto)=>({idProducto}));
    } else if(url.pathname.endsWith('/rpc/marcarLikeProductoMercado')) {
      const args=JSON.parse(bytes); const own=likes.get(args.p_id_actor)??new Set();
      if(args.p_like) own.add(args.p_id_producto); else own.delete(args.p_id_producto);
      likes.set(args.p_id_actor,own); data={liked:args.p_like};
    } else if (url.pathname.includes('/storage/v1/object/')) {
      data = { Key:'mercado/test.png' };
      if (storageMode === 'missing-bucket') { status=404; data={ statusCode:'404',error:'Bucket not found',message:'Bucket not found' }; }
    } else if (url.pathname.endsWith('/rpc/guardarProductoMercado')) {
      data = { id:102,previousPhoto:null };
      if (rpcMode === 'missing-function') { status=404; data={ code:'PGRST202',message:'Could not find the function public.guardarProductoMercado in the schema cache' }; }
    }
    res.writeHead(status, { 'Content-Type':'application/json' }); res.end(JSON.stringify(data));
  });
  await new Promise((resolve) => stub.listen(0,'127.0.0.1',resolve));
  t.after(() => new Promise((resolve) => stub.close(resolve)));
  const reservation = createServer();
  await new Promise((resolve) => reservation.listen(0,'127.0.0.1',resolve));
  const port = reservation.address().port;
  await new Promise((resolve) => reservation.close(resolve));
  let output = '';
  const child = spawn(process.execPath,['src/server.js'], { cwd:runtime,env:{ ...process.env, NODE_ENV:'development', APP_ORIGIN:'http://127.0.0.1:5173', PORT:String(port), SUPABASE_URL:`http://127.0.0.1:${stub.address().port}`, SUPABASE_SERVICE_ROLE_KEY:'local-stub-only', JWT_SECRET:key, NODE_TLS_REJECT_UNAUTHORIZED:'1' },stdio:['ignore','pipe','pipe'] });
  t.after(() => { child.kill(); });
  await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Express no inició')),10000);
    child.once('exit',() => { clearTimeout(timer); reject(new Error('Express terminó antes de iniciar')); });
    child.stderr.on('data',(chunk) => { output += chunk; });
    child.stdout.on('data',(chunk) => { output += chunk; if (output.includes('Backend running')) { clearTimeout(timer); resolve(); } });
  });
  const request = async (path, claims, method='GET', body) => {
    const headers = claims ? { Cookie:`comuni_session=${jwt.sign(claims,key,{ expiresIn:'5m' })}`, Origin:'http://127.0.0.1:5173' } : { Origin:'http://127.0.0.1:5173' };
    if (body) headers['Content-Type']='application/json';
    return fetch(`http://127.0.0.1:${port}${path}`,{ method,headers,...(body ? { body:JSON.stringify(body) } : {}) });
  };
  const claims = { idUsuario:1,idComunidad:100,idComunidadUsuario:10 };

  await t.test('server starts, health works, and absent/invalid JWT cannot reach Supabase', async () => {
    assert.equal((await (await request('/health')).json()).ok,true);
    const before = records.length;
    for (const path of ['/config','/productos','/productos/50','/mis-publicaciones','/mis-likes']) assert.equal((await request(`/api/mercado${path}`)).status,401);
    const forged = await fetch(`http://127.0.0.1:${port}/api/mercado/productos`,{ headers:{ Authorization:'Bearer invalid' } });
    assert.equal(forged.status,401); assert.equal(records.length,before);
    assert.equal((await request('/api/api/mercado/productos')).status,404);
    assert.ok(!output.includes(key)); assert.ok(!output.includes('local-stub-only'));
  });
  await t.test('membership mismatch or revocation rejects a correctly signed token', async () => {
    for (const c of [{ ...claims,idUsuario:2 },{ ...claims,idComunidad:200 },{ ...claims,idComunidadUsuario:99 }]) {
      assert.equal((await request('/api/mercado/productos',c)).status,403);
    }
  });
  await t.test('selected-community reads use the exact session; another product ID is hidden', async () => {
    assert.equal((await (await request('/api/mercado/productos',claims)).json())[0].title,'Publicación 100');
    const other = { ...claims,idComunidad:200,idComunidadUsuario:11 };
    assert.equal((await (await request('/api/mercado/productos',other)).json())[0].title,'Publicación 200');
    assert.equal((await request('/api/mercado/productos/60',claims)).status,404);
    assert.equal((await request('/api/mercado/productos/50',other)).status,404);
  });
  await t.test('creation uploads one image and RPC receives session actor, excluding body ownership', async () => {
    const response = await request('/api/mercado/productos',claims,'POST',{
      title:'Publicación de prueba',description:'Prueba',price:0,category:'Otros',condition:2,type:'producto',idVendedor:999,idComunidad:999,
      visible:false,publishFrom:'2026-10-23T12:00:00-03:00',publishUntil:null,
      photo:{ mimeType:'image/png',data:'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jB1kAAAAASUVORK5CYII=' }
    });
    assert.equal(response.status,200); assert.equal((await response.json()).id,102);
    const rpc = JSON.parse(records.find((r) => r.path.endsWith('/rpc/guardarProductoMercado')).body);
    assert.equal(rpc.p_id_actor,10); assert.equal(rpc.p_id_producto,null);
    assert.equal(rpc.p_datos.idComunidad,undefined); assert.equal(rpc.p_datos.idVendedor,undefined);
    assert.match(rpc.p_datos.fotoPath,/^100\/10\//);
    assert.equal(rpc.p_datos.visible,false); assert.equal(rpc.p_datos.publicarDesde,'2026-10-23T15:00:00.000Z'); assert.equal(rpc.p_datos.publicarHasta,null);
  });
  await t.test('like/unlike and Mis likes use session actor and never create a reservation',async()=>{
    for(let i=0;i<2;i++) {
      const response=await request('/api/mercado/productos/50/like',claims,'PUT',{liked:true,idComunidadUsuario:999});
      assert.equal(response.status,200); assert.deepEqual(await response.json(),{liked:true});
    }
    assert.equal(likes.get(10).size,1);
    const mine=await request('/api/mercado/mis-likes',claims);
    assert.equal(mine.headers.get('cache-control'),'no-store');
    assert.equal((await mine.json())[0].liked,true);
    const other=await request('/api/mercado/mis-likes',{...claims,idComunidad:200,idComunidadUsuario:11});
    assert.deepEqual(await other.json(),[]);
    assert.equal((await request('/api/mercado/productos/50/like',claims,'PUT',{liked:'false'})).status,400);
    assert.equal((await request('/api/mercado/productos/50/like',claims,'PUT',{liked:false})).status,200);
    assert.deepEqual(await(await request('/api/mercado/mis-likes',claims)).json(),[]);
    assert.equal((await request('/api/mercado/productos/50/reservar',claims,'POST')).status,404);
    assert.equal((await request('/api/mercado/mis-reservas',claims)).status,404);
    assert.ok(!records.some((r)=>r.path.endsWith('/rpc/reservarProductoMercado')));
  });
  await t.test('private publication windows cannot be bypassed through detail or like URLs',async()=>{
    for(const mode of ['hidden','future','expired']) {
      productMode=mode;
      try {
        assert.deepEqual(await(await request('/api/mercado/productos',claims)).json(),[]);
        assert.equal((await request('/api/mercado/productos/50',claims)).status,404);
        assert.equal((await request('/api/mercado/productos/50/like',claims,'PUT',{liked:true})).status,404);
      } finally { productMode='normal'; }
    }
  });
  await t.test('empty Mercado is a successful empty list, not an internal server error', async () => {
    productMode='empty';
    try {
      const response=await request('/api/mercado/productos',claims);
      assert.equal(response.status,200); assert.deepEqual(await response.json(),[]);
    } finally { productMode='normal'; }
  });
  await t.test('missing migration gives an actionable response when loading the market', async () => {
    productMode='missing-column';
    try {
      const response=await request('/api/mercado/productos',claims);
      assert.equal(response.status,503);
      const data=await response.json();
      assert.equal(data.code,'MARKET_SCHEMA_NOT_READY'); assert.match(data.message,/mercado_migration\.sql/);
    } finally { productMode='normal'; }
  });
  await t.test('photo bucket and creation RPC failures identify the missing setup', async () => {
    const body={ title:'Prueba',description:'Prueba',price:0,category:'Otros',condition:2,type:'producto',photo:{ mimeType:'image/png',data:'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jB1kAAAAASUVORK5CYII=' } };
    storageMode='missing-bucket';
    try {
      const response=await request('/api/mercado/productos',claims,'POST',body);
      assert.equal(response.status,503); assert.equal((await response.json()).code,'MARKET_STORAGE_NOT_READY');
    } finally { storageMode='normal'; }
    rpcMode='missing-function';
    try {
      const response=await request('/api/mercado/productos',claims,'POST',body);
      assert.equal(response.status,503); assert.equal((await response.json()).code,'MARKET_SCHEMA_NOT_READY');
      assert.ok(records.some((r) => r.path.endsWith('/storage/v1/object/mercado') && r.type?.includes('application/json')));
    } finally { rpcMode='normal'; }
  });
});
