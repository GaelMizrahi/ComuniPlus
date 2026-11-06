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
 db.Administrador=[{id:1,idComunidadUsuario:101,idComunidad:1},{id:2,idComunidadUsuario:201,idComunidad:2}];
 db.Noticia=[{id:901,idComunidad:1,titulo:'Noticia A',texto:'Contenido del club A para sus socios',imagenUrl:'/club-logos/ferro.jpg',imagenPath:null,eliminadoEn:null,esDemo:true},
 {id:902,idComunidad:2,titulo:'Noticia B',texto:'Contenido del club B para sus socios',imagenUrl:'/club-logos/river-plate.png',imagenPath:null,eliminadoEn:null,esDemo:true}];
 db.ConsultaConversacion=[{id:2001,idComunidad:1,idComunidadUsuario:102},{id:2002,idComunidad:2,idComunidadUsuario:202},{id:2003,idComunidad:2,idComunidadUsuario:201}];
 db.ConsultaMensaje=[{id:3001,idConversacion:2001,idRemitente:102,texto:'Privado A',esAdmin:false},{id:3002,idConversacion:2002,idRemitente:202,texto:'Privado B',esAdmin:false}];
 db.ConsultaDifusion=[];
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
  if(value.startsWith('lt.'))return Number(target)<Number(value.slice(3));
  if(value==='is.null')return target==null;
  return true;
 });
 const stub=createServer(async(req,res)=>{
  const url=new URL(req.url,'http://stub'),table=url.pathname.split('/').at(-1);
  const chunks=[];for await(const chunk of req)chunks.push(chunk);
  const body=chunks.length&&req.headers['content-type']?.includes('application/json')?JSON.parse(Buffer.concat(chunks)):null;
  records.push({table,method:req.method,query:url.searchParams,body});
  if(url.pathname.startsWith('/storage/v1/')){
   const value=url.pathname.includes('/sign/')?{signedURL:'/object/sign/noticias/image.png?token=temporary'}:{Key:'noticias/uploaded'};
   res.writeHead(200,{'Content-Type':'application/json'});res.end(JSON.stringify(value));return;
  }
  if(url.pathname.includes('/rpc/')){
   const actor=db.ComunidadUsuario.find((m)=>m.id===(body.p_id_actor??body.p_actor)&&m.aceptado);
   const admin=actor&&db.Administrador.some((a)=>a.idComunidadUsuario===actor.id&&a.idComunidad===actor.idComunidad);
   let value,status=200;
   if(['abrirConsultaClub','enviarConsultaClub','difundirConsultaClub'].includes(table)){
    const open=(member)=>{
     let row=db.ConsultaConversacion.find((c)=>c.idComunidadUsuario===member.id);
     if(!row){row={id:2000+db.ConsultaConversacion.length+1,idComunidad:member.idComunidad,idComunidadUsuario:member.id};db.ConsultaConversacion.push(row);}return row;
    };
    const message=(conv,extra={})=>{
     const row={id:3000+db.ConsultaMensaje.length+1,idConversacion:conv.id,idRemitente:actor.id,texto:body.p_texto,esAdmin:admin,creadoEn:new Date().toISOString(),...extra};db.ConsultaMensaje.push(row);return row;
    };
    if(!actor){status=403;value={code:'42501',message:'No autorizado'};}
    else if(table==='abrirConsultaClub')value={id:open(actor).id};
    else if(table==='enviarConsultaClub'){
     const conv=db.ConsultaConversacion.find((c)=>c.id===body.p_conversacion&&c.idComunidad===actor.idComunidad&&(c.idComunidadUsuario===actor.id||admin));
     if(!conv){status=404;value={code:'P0002',message:'Conversación no encontrada'};}
     else value=message(conv,{idCliente:body.p_id_cliente,idDifusion:null});
    }else if(!admin){status=403;value={code:'42501',message:'No autorizado'};}
    else{
     const receivers=db.ComunidadUsuario.filter((m)=>m.idComunidad===actor.idComunidad&&m.aceptado&&m.idUsuario!==actor.idUsuario);
     const diffusion={id:db.ConsultaDifusion.length+1,texto:body.p_texto,idComunidad:actor.idComunidad};db.ConsultaDifusion.push(diffusion);
     for(const member of receivers)message(open(member),{idDifusion:diffusion.id,idCliente:null});value={id:diffusion.id,recipientCount:receivers.length};
    }
   }else if(!admin){status=403;value={code:'42501',message:'No autorizado'};}
   else if(table==='publicarNoticiaClub'){
    const row={id:2000+db.Noticia.length,idComunidad:actor.idComunidad,idAutor:actor.id,titulo:body.p_titulo,texto:body.p_texto,imagenPath:body.p_imagen_path,imagenUrl:null,eliminadoEn:null};db.Noticia.push(row);value={id:row.id};
   }else{
    const row=db.Noticia.find((n)=>n.id===body.p_id_noticia&&n.idComunidad===actor.idComunidad&&!n.eliminadoEn);
    if(!row){status=404;value={code:'P0002',message:'Noticia no encontrada'};}
    else{row.eliminadoEn=new Date().toISOString();value={imagenPath:row.imagenPath};}
   }
   res.writeHead(status,{'Content-Type':'application/json'});res.end(JSON.stringify(value));return;
  }
  let rows=db[table]??[];
  const court=(id)=>db.Cancha.find((row)=>row.id===id);
  const reserve=(id)=>{const row=db.Reserva.find((r)=>r.id===id);return row&&{...row,Cancha:court(row.idCancha)};};
  if(table==='Reserva')rows=rows.map((row)=>({...row,Cancha:court(row.idCancha)}));
  if(table==='ComunidadUsuarioReserva')rows=rows.map((row)=>({...row,Reserva:reserve(row.idReserva)}));
  if(table==='ConsultaConversacion')rows=rows.map((row)=>{
   const member=db.ComunidadUsuario.find((m)=>m.id===row.idComunidadUsuario),user=db.Usuario.find((u)=>u.id===member?.idUsuario);
   return{...row,socio:{nroSocio:123,aceptado:member?.aceptado,usuario:user}};
  });
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
  res.writeHead(200,{'Content-Type':'application/json','Content-Range':`*/${selected.length}`});res.end(req.method==='HEAD'?'':JSON.stringify(data));
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
 await t.test('news lists and private images are scoped; only the current club administrator can publish/delete',async()=>{
  const photo={mimeType:'image/png',data:Buffer.from([137,80,78,71,13,10,26,10,1]).toString('base64')};
  const body={title:'Nueva cancha del club B',text:'Se publica una novedad para los socios de nuestro club.',photo,idComunidad:1,idAutor:101,isAdmin:true};
  const member={idUsuario:3,idComunidad:2,idComunidadUsuario:202};
  assert.deepEqual((await json('/noticias')).items.map((n)=>n.id),[902]);
  assert.equal((await request('/noticias/901')).status,404);
  assert.equal((await request('/noticias',{actor:member,method:'POST',body})).status,403);
  assert.equal((await request('/noticias/902',{actor:member,method:'DELETE'})).status,403);
  const created=await request('/noticias',{method:'POST',body});assert.equal(created.status,201,await created.clone().text());const {id}=await created.json();
  const row=db.Noticia.find((n)=>n.id===id);assert.equal(row.idComunidad,2);assert.equal(row.idAutor,201);assert.match(row.imagenPath,/^2\/201\//);
  const detail=await json(`/noticias/${id}`);assert.match(detail.item.image,/\/storage\/v1\/object\/sign\/noticias\//);assert.ok(!detail.item.imagenPath);
  assert.equal((await request(`/noticias/${id}`,{club:1,method:'DELETE'})).status,404);
  assert.equal((await request(`/noticias/${id}`,{method:'DELETE'})).status,200);assert.equal((await request(`/noticias/${id}`)).status,404);
  assert.equal((await request('/noticias',{method:'POST',body:{...body,photo:null}})).status,400);
 });
 await t.test('consultations are private between the member and club admins; broadcasts stay in the sender club',async()=>{
  const user={idUsuario:3,idComunidad:2,idComunidadUsuario:202},other={idUsuario:2,idComunidad:1,idComunidadUsuario:102};
  const context=await json('/consultas/contexto');assert.equal(context.isAdmin,true);assert.equal(context.recipientCount,1);assert.equal(context.adminAvailable,true);
  assert.equal((await json('/consultas/contexto',{actor:user})).recipientCount,0);
  const own=await request('/consultas/propia',{actor:user,method:'POST',body:{idComunidadUsuario:102}});assert.equal(own.status,200);assert.equal((await own.json()).id,2002);
  assert.equal((await request('/consultas/conversaciones',{actor:user})).status,403);
  assert.equal((await request('/consultas/conversaciones/2003/mensajes',{actor:user})).status,404);
  assert.equal((await request('/consultas/conversaciones/2002/mensajes',{actor:other})).status,404);
  assert.equal((await request('/consultas/conversaciones/2001/mensajes')).status,404);
  const history=await json('/consultas/conversaciones/2002/mensajes',{actor:user});assert.deepEqual(history.items.map((m)=>m.text),['Privado B']);
  assert.equal(history.items[0].idRemitente,undefined);
  const body={text:'Pregunta privada del usuario B',requestId:randomBytes(16).toString('hex').replace(/(.{8})(.{4})(.{4})(.{4})(.{12})/,'$1-$2-$3-$4-$5'),idRemitente:101,idComunidad:1};
  assert.equal((await request('/consultas/conversaciones/2002/mensajes',{actor:user,method:'POST',body})).status,201);assert.equal(db.ConsultaMensaje.at(-1).idRemitente,202);
  assert.equal((await request('/consultas/difusiones',{actor:user,method:'POST',body})).status,403);
  const inbox=await json('/consultas/conversaciones');assert.deepEqual(inbox.items.map((c)=>c.id),[2002,2003]);
  const general=await request('/consultas/difusiones',{method:'POST',body:{...body,text:'Comunicado para el club B'}});assert.equal(general.status,201);assert.equal((await general.json()).recipientCount,1);
  assert.equal(db.ConsultaMensaje.at(-1).idConversacion,2002);assert.equal(db.ConsultaMensaje.at(-1).idRemitente,201);
  assert.equal(db.ConsultaMensaje.filter((m)=>m.idConversacion===2001).length,1);
 });
 await t.test('forged/revoked selected memberships fail across all modules before any resource access',async()=>{
  for(const actor of [{...claims(2),idComunidad:1},claims(2)]){
   if(actor.idComunidad===2)db.ComunidadUsuario.find((r)=>r.id===201).aceptado=false;
   const before=records.length;
   for(const path of ['/deportes','/reservas/mias','/partidos','/falta-jugador/partidos','/rides','/reservations','/noticias','/consultas/contexto'])assert.equal((await request(path,{actor})).status,403,path);
   assert.ok(records.slice(before).every((r)=>r.table==='ComunidadUsuario'));
  }
 });
});
