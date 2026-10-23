// Actual Express/JWT/scrypt/Supabase client with a local REST stub, never production.
import test from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {spawn} from 'node:child_process';
import {createRequire} from 'node:module';
import {randomBytes} from 'node:crypto';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {existsSync} from 'node:fs';
import {verifyPassword} from '../src/utils/passwords.js';

test('registration, approval and login through Express and actual password hashing',async(t)=>{
  const runtime=process.env.BACKEND_RUNTIME?resolve(process.env.BACKEND_RUNTIME):fileURLToPath(new URL('../',import.meta.url));
  if(existsSync(`${runtime}/.env`))throw new Error('Use a separate runtime without .env');
  const jwt=createRequire(`${runtime}/package.json`)('jsonwebtoken');const secret=randomBytes(32).toString('hex');
  const communities=[{id:1,nombre:'Comunidad A',tipo:'otro'},{id:2,nombre:'Comunidad B',tipo:'otro'}];
  const users=[{id:1,nombre:'Admin',apellido:'A',mail:'admin@example.com',contraseña:'anterior',telefono:5491100000001},{id:2,nombre:'Admin',apellido:'B',mail:'otro@example.com',contraseña:'anteriorb',telefono:5491100000002},{id:3,nombre:'Miembro',apellido:'A',mail:'miembro@example.com',contraseña:'anteriorc',telefono:5491100000003}];
  const members=users.map((user)=>({id:user.id,idUsuario:user.id,idComunidad:user.id===2?2:1,aceptado:true,rechazado:false,nroSocio:100+user.id,foto:null}));
  const requests=[];
  const matches=(row,url)=>Object.entries(row).every(([key,value])=>!url.searchParams.has(key)||url.searchParams.get(key)===`eq.${value}`);
  const stub=createServer(async(req,res)=>{
    const url=new URL(req.url,'http://stub');const chunks=[];for await(const c of req)chunks.push(c);
    const body=Buffer.concat(chunks).toString();let status=200,data=[];
    requests.push({path:url.pathname,body});
    const error=(code,message,http=400)=>{status=http;data={code,message};};
    if(url.pathname.endsWith('/Usuario')) data=users.filter((user)=>url.searchParams.get('mailNormalizado')===`eq.${user.mail.trim().toLowerCase()}`);
    else if(url.pathname.endsWith('/Comunidad')) data=communities.filter((c)=>matches(c,url));
    else if(url.pathname.endsWith('/ComunidadUsuario')) {
      data=members.filter((m)=>matches(m,url));
      if(url.searchParams.get('select')?.includes('usuario:'))data=data.map((m)=>{const u=users.find((u)=>u.id===m.idUsuario);return {...m,usuario:{id:u.id,nombre:u.nombre,apellido:u.apellido,mail:u.mail,telefono:u.telefono}};});
    } else if(url.pathname.endsWith('/Administrador')){
      const actor=Number(url.searchParams.get('idComunidadUsuario')?.slice(3)),community=Number(url.searchParams.get('idComunidad')?.slice(3));
      data=[1,2].includes(actor)&&members.find((m)=>m.id===actor)?.idComunidad===community?[{id:actor}]:[];
    } else if(url.pathname.endsWith('/rpc/registrarUsuarioComuni')){
      const a=JSON.parse(body);
      if(users.some((u)=>u.mail.toLowerCase()===a.p_mail))error('23505','duplicate email',409);
      else{
        const id=users.length+1;users.push({id,nombre:a.p_nombre,apellido:a.p_apellido,mail:a.p_mail,telefono:a.p_telefono,contraseña:a.p_hash});
        const member={id:members.length+1,idUsuario:id,idComunidad:a.p_id_comunidad,nroSocio:a.p_nro_socio,aceptado:false,rechazado:false,fechaSolicitud:new Date().toISOString()};members.push(member);data={id:member.id};
      }
    } else if(url.pathname.endsWith('/rpc/actualizarClaveLegacyComuni')){
      const a=JSON.parse(body),user=users.find((u)=>u.id===a.p_id_usuario);data=Boolean(user&&user.contraseña===a.p_anterior&&!user.contraseña.startsWith('scrypt$'));
      if(data)user.contraseña=a.p_hash;
    } else if(url.pathname.endsWith('/rpc/resolverSolicitudComuni')){
      const a=JSON.parse(body),actor=members.find((m)=>m.id===a.p_id_actor),target=members.find((m)=>m.id===a.p_id_solicitud&&m.idComunidad===actor?.idComunidad);
      if(![1,2].includes(actor?.id)||!actor?.aceptado)error('42501','No autorizado',403);
      else if(!target)error('P0002','Solicitud no encontrada',404);
      else if(target.aceptado||target.rechazado)error('P0001','La solicitud ya fue resuelta');
      else{target.aceptado=a.p_aprobar;target.rechazado=!a.p_aprobar;data={ok:true};}
    }
    res.writeHead(status,{'Content-Type':'application/json'});res.end(JSON.stringify(data));
  });
  await new Promise((r)=>stub.listen(0,'127.0.0.1',r));t.after(()=>new Promise((r)=>stub.close(r)));
  const reservation=createServer();await new Promise((r)=>reservation.listen(0,'127.0.0.1',r));const port=reservation.address().port;await new Promise((r)=>reservation.close(r));
  const child=spawn(process.execPath,['src/server.js'],{cwd:runtime,env:{...process.env,PORT:String(port),SUPABASE_URL:`http://127.0.0.1:${stub.address().port}`,SUPABASE_SERVICE_ROLE_KEY:'local-stub-only',JWT_SECRET:secret},stdio:['ignore','pipe','pipe']});
  let output='';t.after(()=>child.kill());
  await new Promise((resolve,reject)=>{
    const timer=setTimeout(()=>reject(new Error('Express no inició')),10000);
    child.once('exit',()=>{clearTimeout(timer);reject(new Error('Express terminó antes de iniciar'));});
    child.stderr.on('data',(c)=>output+=c);child.stdout.on('data',(c)=>{output+=c;if(output.includes('Backend running')){clearTimeout(timer);resolve();}});
  });
  const request=async(path,{method='GET',token,body}={})=>fetch(`http://127.0.0.1:${port}/api${path}`,{method,headers:{...(token?{Authorization:`Bearer ${token}`} : {}),...(body?{'Content-Type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{})});
  const password='Nueva Clave123!';const registration={firstName:'Ana',lastName:'Pérez',email:'ana_nueva@example.com',phone:'+5491123456789',communityId:1,membershipNumber:'123',password,confirmPassword:password};
  const login=(email,password)=>request('/login',{method:'POST',body:{email,password}});
  let adminToken,memberId;
  await t.test('public communities expose only selection data and protected admin routes require JWT',async()=>{
    assert.equal((await(await request('/registro/comunidades')).json()).length,2);
    assert.equal((await request('/solicitudes-acceso')).status,401);
  });
  await t.test('register always pending, stores an actual scrypt hash and cannot forge acceptance/admin status',async()=>{
    const response=await request('/registro',{method:'POST',body:{...registration,aceptado:true,isAdmin:true,idUsuario:1}});
    assert.equal(response.status,201);assert.equal(response.headers.get('cache-control'),'no-store');const result=await response.json();assert.equal(result.token,undefined);
    const user=users.find((u)=>u.mail===registration.email);assert.ok(user.contraseña.startsWith('scrypt$'));assert.equal(await verifyPassword(password,user.contraseña),true);
    memberId=members.find((m)=>m.idUsuario===user.id).id;assert.equal(members.find((m)=>m.id===memberId).aceptado,false);
    assert.ok(!JSON.stringify(result).includes('scrypt$'));assert.ok(!JSON.stringify(result).includes(password));
    const pending=await login(registration.email,password);assert.equal(pending.status,403);assert.equal((await pending.json()).code,'REGISTRATION_PENDING');
    assert.equal((await request('/registro',{method:'POST',body:{...registration,email:registration.email.toUpperCase()}})).status,409);
  });
  await t.test('legacy admin can log in and is upgraded without losing session fields',async()=>{
    const response=await login(' ADMIN@EXAMPLE.COM ','anterior');assert.equal(response.status,200);const data=await response.json();adminToken=data.token;
    assert.equal(data.user.idComunidadUsuario,1);assert.equal(data.user.isAdmin,true);assert.ok(users[0].contraseña.startsWith('scrypt$'));
    const payload=jwt.verify(adminToken,secret);assert.equal(payload.contraseña,undefined);assert.equal(data.user.password,undefined);
  });
  await t.test('non-admin and other-community admin cannot list/decide the selected-community request',async()=>{
    const token=(actor)=>jwt.sign({idUsuario:actor.idUsuario,idComunidad:actor.idComunidad,idComunidadUsuario:actor.id},secret);
    assert.equal((await request('/solicitudes-acceso',{token:token(members[2])})).status,403);
    const result=await request('/solicitudes-acceso',{token:token(members[1])});assert.deepEqual(await result.json(),[]);
    assert.equal((await request(`/solicitudes-acceso/${memberId}`,{method:'PATCH',token:token(members[1]),body:{action:'aprobar',idComunidad:1,idActor:1}})).status,404);
    const list=await(await request('/solicitudes-acceso',{token:adminToken})).json();assert.equal(list.length,1);assert.equal(list[0].email,registration.email);assert.ok(!JSON.stringify(list).includes('contraseña'));
  });
  await t.test('approved account can log in; duplicate decision cannot reverse approval',async()=>{
    assert.equal((await request(`/solicitudes-acceso/${memberId}`,{token:adminToken,method:'PATCH',body:{action:'aprobar'}})).status,200);
    const response=await login(registration.email,password);assert.equal(response.status,200);const data=await response.json();assert.equal(data.user.idComunidad,1);assert.equal(data.user.isAdmin,false);
    assert.equal((await request(`/solicitudes-acceso/${memberId}`,{token:adminToken,method:'PATCH',body:{action:'rechazar'}})).status,409);
  });
  await t.test('rejected and wrong-password accounts never receive access; admins are revalidated after revocation',async()=>{
    const rejectedEmail='rechazada@example.com';await request('/registro',{method:'POST',body:{...registration,email:rejectedEmail}});
    const id=members.find((m)=>m.idUsuario===users.find((u)=>u.mail===rejectedEmail).id).id;
    await request(`/solicitudes-acceso/${id}`,{token:adminToken,method:'PATCH',body:{action:'rechazar'}});
    const rejected=await login(rejectedEmail,password);assert.equal(rejected.status,403);assert.equal((await rejected.json()).code,'REGISTRATION_REJECTED');
    assert.equal((await login(registration.email,'incorrecta')).status,401);
    members[0].aceptado=false;assert.equal((await request('/solicitudes-acceso',{token:adminToken})).status,403);
    assert.ok(!output.includes(password));assert.ok(!output.includes(secret));assert.ok(!output.includes('local-stub-only'));
  });
});
