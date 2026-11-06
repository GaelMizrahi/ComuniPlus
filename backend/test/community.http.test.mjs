import test from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {spawn} from 'node:child_process';
import {createRequire} from 'node:module';
import {randomBytes} from 'node:crypto';
import {resolve} from 'node:path';
import {existsSync} from 'node:fs';

test('all club modules isolate the selected membership, including forged IDs and writes',async(t)=>{
 const runtime=resolve(process.env.BACKEND_RUNTIME||'backend');
 assert.equal(existsSync(`${runtime}/.env`),false,'Use an isolated runtime');
 const jwt=createRequire(`${runtime}/package.json`)('jsonwebtoken'),secret=randomBytes(32).toString('hex');
 const db={
  ComunidadUsuario:[{id:101,idUsuario:1,idComunidad:1,aceptado:true},{id:102,idUsuario:2,idComunidad:1,aceptado:true},{id:201,idUsuario:1,idComunidad:2,aceptado:true},{id:202,idUsuario:3,idComunidad:2,aceptado:true}],
  Usuario:[{id:1,nombre:'Multiclub',apellido:'Prueba',telefono:'12025550100'},{id:2,nombre:'Persona A',telefono:'12025550101'},{id:3,nombre:'Persona B',telefono:'12025550102'}],
  Cancha:[{id:301,idComunidad:1,numero:1,lugar:'Club A',cantidadMax:4,deporte:'Tenis'},{id:302,idComunidad:2,numero:2,lugar:'Club B',cantidadMax:4,deporte:'Tenis'}],
  solicitudViaje:[{id:410,idComunidad:1,idSolicitante:102},{id:411,idComunidad:1,idSolicitante:102},{id:412,idComunidad:1,idSolicitante:101},{id:420,idComunidad:2,idSolicitante:202},{id:421,idComunidad:2,idSolicitante:202},{id:422,idComunidad:2,idSolicitante:201}],
  Viaje:[{id:510,idComunidad:1,idConductor:101,idSolicitudViaje:410},{id:520,idComunidad:2,idConductor:201,idSolicitudViaje:420}],
  Reserva:[{id:610,idCancha:301,dia:'2099-01-01',horario:'10:00',estado:1,deporte:'Tenis'},{id:620,idCancha:302,dia:'2099-01-01',horario:'11:00',estado:1,deporte:'Tenis'}],
  ComunidadUsuarioReserva:[{id:710,idComunidadUsuario:101,idReserva:610},{id:720,idComunidadUsuario:201,idReserva:620},{id:721,idComunidadUsuario:201,idReserva:610}],
  Partido:[{id:810,idComunidadUsuario:102,titulo:'Partido A',estado:1,jugadoresNecesarios:4},{id:820,idComunidadUsuario:202,titulo:'Partido B',estado:1,jugadoresNecesarios:4},{id:821,idComunidadUsuario:201,titulo:'Propio B',estado:1,jugadoresNecesarios:4}],PartidoJugador:[],
  FaltaJugadorPartido:[{id:920,idComunidad:1,idCreador:2,estado:'abierto',jugadoresFaltantes:3},{id:930,idComunidad:2,idCreador:3,estado:'abierto',jugadoresFaltantes:3}],FaltaJugadorParticipante:[]
 };
 for(const row of db.solicitudViaje)Object.assign(row,{espaciosSolicitados:2,horarioDeSalida:'12:00',diaSalida:'2099-01-01',lugarDeSalida:`Club ${row.idComunidad}`,lugarDeLlegada:'Centro'});
 const records=[];
 const get=(row,key)=>key.split('.').reduce((value,part)=>value?.[part],row);
 const match=(row,url)=>[...url.searchParams].every(([key,value])=>{
  if(['select','order','limit','offset'].includes(key))return true;
  const target=get(row,key);
  if(value.startsWith('eq.'))return String(target)===value.slice(3);
  if(value.startsWith('neq.'))return String(target)!==value.slice(4);
  if(value.startsWith('in.('))return value.slice(4,-1).split(',').includes(String(target));
  if(value.startsWith('gt.'))return Number(target)>Number(value.slice(3));
  return true;
 });
 const stub=createServer(async(req,res)=>{
  const url=new URL(req.url,'http://stub'),table=url.pathname.split('/').at(-1);
  const chunks=[];for await(const chunk of req)chunks.push(chunk);
  const body=chunks.length?JSON.parse(Buffer.concat(chunks)):null;
  records.push({table,method:req.method,query:url.searchParams,body});
  let rows=db[table]??[];
  const court=(id)=>db.Cancha.find((row)=>row.id===id);
  const reserve=(id)=>{const row=db.Reserva.find((r)=>r.id===id);return row&&{...row,Cancha:court(row.idCancha)};};
  if(table==='Reserva')rows=rows.map((row)=>({...row,Cancha:court(row.idCancha)}));
  if(table==='ComunidadUsuarioReserva')rows=rows.map((row)=>({...row,Reserva:reserve(row.idReserva)}));
  const selected=rows.filter((row)=>match(row,url));let data=selected;
  if(req.method==='POST'){
   const row={id:1000+(db[table]?.length??0),...body};(db[table]??=[]).push(row);
   data=table==='Reserva'?reserve(row.id):row;
  }else if(req.method==='PATCH'){
   const ids=selected.map((row)=>row.id);for(const row of db[table]??[])if(ids.includes(row.id))Object.assign(row,body);
   data=selected.map((row)=>({...row,...body}));
  }else if(req.method==='DELETE'){
   const ids=selected.map((row)=>row.id);db[table]=(db[table]??[]).filter((row)=>!ids.includes(row.id));data=null;
  }
  if(req.headers.accept?.includes('vnd.pgrst.object')&&Array.isArray(data))data=data[0]??null;
  res.writeHead(200,{'Content-Type':'application/json'});res.end(JSON.stringify(data));
 });
 await new Promise((r)=>stub.listen(0,'127.0.0.1',r));t.after(()=>new Promise((r)=>stub.close(r)));
 const reservePort=createServer();await new Promise((r)=>reservePort.listen(0,'127.0.0.1',r));const port=reservePort.address().port;await new Promise((r)=>reservePort.close(r));
 const child=spawn(process.execPath,['src/server.js'],{cwd:runtime,env:{...process.env,NODE_ENV:'development',APP_ORIGIN:'http://127.0.0.1:5173',PORT:String(port),SUPABASE_URL:`http://127.0.0.1:${stub.address().port}`,SUPABASE_SERVICE_ROLE_KEY:'local-test-only',JWT_SECRET:secret},stdio:['ignore','pipe','pipe']});
 t.after(()=>child.kill());let output='';
 await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(new Error(output)),10000);child.once('exit',()=>{clearTimeout(timer);reject(new Error('server failed'));});child.stderr.on('data',(c)=>output+=c);child.stdout.on('data',(c)=>{output+=c;if(output.includes('Backend running')){clearTimeout(timer);resolve();}});});
 const claims=(club)=>({idUsuario:1,idComunidad:club,idComunidadUsuario:club===1?101:201});
 const request=(path,{club=2,actor=claims(club),method='GET',body}={})=>fetch(`http://127.0.0.1:${port}/api${path}`,{method,headers:{Cookie:`comuni_session=${jwt.sign(actor,secret)}`,Origin:'http://127.0.0.1:5173',...(body?{'Content-Type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{})});
 const json=async(path,options)=>{const r=await request(path,options);assert.equal(r.status,200,`${path}: ${await r.clone().text()}`);return r.json();};
 await t.test('courts and occupied slots only belong to the selected club; foreign court IDs cannot be reserved',async()=>{
  assert.deepEqual((await json('/deportes')).courts.map((r)=>r.id),[302]);
  assert.deepEqual((await json('/deportes',{club:1})).courts.map((r)=>r.id),[301]);
  assert.equal((await request('/deportes/301/horarios?fecha=2099-01-01')).status,404);
  const before=db.Reserva.length;
  assert.equal((await request('/reservas',{method:'POST',body:{courtId:301,date:'2099-01-01',time:'15:00',idComunidad:1}})).status,404);
  assert.equal(db.Reserva.length,before);
  assert.equal((await request('/deportes/302abc/horarios?fecha=2099-01-01')).status,400);
  const slots=await json('/deportes/302/horarios?fecha=2099-01-01');assert.equal(slots.find((r)=>r.time==='11:00').available,false);
 });
 await t.test('sport reservations exclude corrupt foreign-club links and reject foreign cancellation',async()=>{
  assert.deepEqual((await json('/reservas/mias')).map((r)=>r.id),[620]);
  assert.equal((await request('/reservas/610',{method:'DELETE'})).status,404);assert.equal(db.Reserva.find((r)=>r.id===610).estado,1);
  const response=await request('/reservas',{method:'POST',body:{courtId:302,date:'2099-01-02',time:'15:00',cantidadJugadores:2,idComunidad:1,idComunidadUsuario:101}});
  assert.equal(response.status,201,await response.clone().text());assert.equal(db.ComunidadUsuarioReserva.at(-1).idComunidadUsuario,201);
  assert.equal((await request('/reservas/620',{method:'DELETE'})).status,200);assert.equal(db.Reserva.find((r)=>r.id===620).estado,0);
 });
 await t.test('matches are restricted through their creator membership; only the owner can delete',async()=>{
  assert.deepEqual((await json('/partidos')).map((r)=>r.id),[820,821]);
  const before=db.PartidoJugador.length;
  assert.equal((await request('/partidos/810/unirse',{method:'POST'})).status,404);assert.equal(db.PartidoJugador.length,before);
  assert.equal((await request('/partidos/810',{method:'DELETE'})).status,404);
  assert.equal((await request('/partidos/820',{method:'DELETE'})).status,404);
  assert.equal((await request('/partidos/820/unirse',{method:'POST'})).status,200);assert.equal(db.PartidoJugador.at(-1).idComunidadUsuario,201);
  assert.equal((await request('/partidos/821',{method:'DELETE'})).status,200);assert.equal(db.Partido.find((r)=>r.id===810).estado,1);
  const created=await request('/partidos',{method:'POST',body:{deporte:'Tenis',titulo:'Nuevo B',dia:'2099-01-01',horario:'12:00',lugar:'Club B',jugadoresNecesarios:4,idComunidadUsuario:102,idComunidad:1}});
  assert.equal(created.status,201);assert.equal(db.Partido.at(-1).idComunidadUsuario,201);
 });
 await t.test('legacy missing-player endpoints filter every read and mutation by club',async()=>{
  assert.deepEqual((await json('/falta-jugador/partidos')).map((r)=>r.id),[930]);
  assert.equal((await request('/falta-jugador/partidos/920/unirse',{method:'POST'})).status,404);assert.equal(db.FaltaJugadorParticipante.length,0);
  assert.equal((await request('/falta-jugador/partidos/930/unirse',{method:'POST'})).status,201);assert.equal(db.FaltaJugadorParticipante[0].idComunidadUsuario,201);
 });
 await t.test('transport reads use community and membership IDs, not the user’s first accepted membership',async()=>{
  assert.deepEqual((await json('/rides')).map((r)=>r.id),[421,422]);
  const rides=await json('/rides');assert.equal(rides.find((r)=>r.id===422).requesterId,1);assert.equal(rides.find((r)=>r.id===421).requesterName,'Persona B');
  const reservations=await json('/reservations');assert.deepEqual(reservations.map((r)=>r.tripId),[520]);assert.equal(reservations[0].role,'driver');assert.equal(reservations[0].departureDate,'2099-01-01');
  assert.equal((await request('/rides/411/offer',{method:'POST'})).status,404);
  assert.equal((await request('/rides/412/cancel',{method:'POST'})).status,404);
  assert.equal((await request('/rides/421/cancel',{method:'POST'})).status,404);
  assert.equal((await request('/reservations/trip-510/cancel',{method:'POST'})).status,404);
  assert.equal((await request('/reservations/trip-510/complete',{method:'POST'})).status,404);assert.ok(db.Viaje.some((r)=>r.id===510));
 });
 await t.test('transport creates and accepts only within the session club and preserves other clubs',async()=>{
  const response=await request('/rides/request',{method:'POST',body:{origin:'Salida B',destination:'Llegada B',date:'2099-01-01',departureTime:'12:00',seatsNeeded:2,idComunidad:1,idSolicitante:101}});
  assert.equal(response.status,201,await response.clone().text());assert.equal(db.solicitudViaje.at(-1).idSolicitante,201);assert.equal(db.solicitudViaje.at(-1).idComunidad,2);
  const offer=await request('/rides/421/offer',{method:'POST',body:{idConductor:101,idComunidad:1}});assert.equal(offer.status,201,await offer.clone().text());
  assert.equal(db.Viaje.at(-1).idConductor,201);assert.equal(db.Viaje.at(-1).idComunidad,2);
  const offeredId=db.Viaje.at(-1).id;
  assert.equal((await request(`/reservations/trip-${offeredId}/complete`,{method:'POST'})).status,200);
  assert.ok(!db.solicitudViaje.some((r)=>r.id===421));assert.ok(db.solicitudViaje.some((r)=>r.id===410));
  assert.equal((await request('/reservations/trip-520/cancel',{method:'POST'})).status,200);assert.ok(db.Viaje.some((r)=>r.id===510));
  assert.equal((await request('/rides/422/cancel',{method:'POST'})).status,200);assert.ok(db.solicitudViaje.some((r)=>r.id===412));
 });
 await t.test('forged/revoked selected memberships fail across all modules before any resource access',async()=>{
  for(const actor of [{...claims(2),idComunidad:1},claims(2)]){
   if(actor.idComunidad===2)db.ComunidadUsuario.find((r)=>r.id===201).aceptado=false;
   const before=records.length;
   for(const path of ['/deportes','/reservas/mias','/partidos','/falta-jugador/partidos','/rides','/reservations'])assert.equal((await request(path,{actor})).status,403,path);
   assert.ok(records.slice(before).every((r)=>r.table==='ComunidadUsuario'));
  }
 });
});
