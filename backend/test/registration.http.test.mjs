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
    if(url.pathname.endsWith('/Usuario')) data=users.filter((user)=>url.searchParams.has('id') ? url.searchParams.get('id')===`eq.${user.id}` : url.searchParams.get('mailNormalizado')===`eq.${user.mail.trim().toLowerCase()}`);
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
  const child=spawn(process.execPath,['src/server.js'],{cwd:runtime,env:{...process.env,NODE_ENV:'development',APP_ORIGIN:'http://127.0.0.1:5173',PORT:String(port),SUPABASE_URL:`http://127.0.0.1:${stub.address().port}`,SUPABASE_SERVICE_ROLE_KEY:'local-stub-only',JWT_SECRET:secret},stdio:['ignore','pipe','pipe']});
  let output='';t.after(()=>child.kill());
  await new Promise((resolve,reject)=>{
    const timer=setTimeout(()=>reject(new Error('Express no inició')),10000);
    child.once('exit',()=>{clearTimeout(timer);reject(new Error('Express terminó antes de iniciar'));});
    child.stderr.on('data',(c)=>output+=c);child.stdout.on('data',(c)=>{output+=c;if(output.includes('Backend running')){clearTimeout(timer);resolve();}});
  });
  const request=async(path,{method='GET',token,body}={})=>fetch(`http://127.0.0.1:${port}/api${path}`,{method,headers:{Origin:'http://127.0.0.1:5173',...(token?{Cookie:`comuni_session=${token}`} : {}),...(body?{'Content-Type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{})});
  const password='Nueva Clave123!';const registration={firstName:'Ana',lastName:'Pérez',email:'ana_nueva@example.com',phone:'+5491123456789',communityId:1,membershipNumber:'123',password,confirmPassword:password};
  const login=(email,password)=>request('/login',{method:'POST',body:{email,password}});
  let adminToken,memberId;
  await t.test('public communities expose only selection data and protected admin routes require JWT',async()=>{
    assert.equal((await(await request('/registro/comunidades')).json()).length,2);
    assert.equal((await request('/solicitudes-acceso')).status,401);
    for(const path of ['/rides','/reservations','/deportes','/reservas/mias','/partidos','/falta-jugador/partidos']) {
      assert.equal((await request(path)).status,401,path);
    }
    for(const path of ['/rides/request','/reservations/1/cancel','/reservas','/partidos','/partidos/1/unirse']) {
      assert.equal((await request(path,{method:'POST',body:{}})).status,401,path);
    }
  });
  await t.test('cookies replace bearer auth, CORS has explicit credentials and foreign or missing origins cannot mutate',async()=>{
    const signed=jwt.sign({idUsuario:1,idComunidad:1,idComunidadUsuario:1},secret);
    const bearer=await fetch(`http://127.0.0.1:${port}/api/session`,{headers:{Authorization:`Bearer ${signed}`}});
    assert.equal(bearer.status,401);
    for(const origin of [undefined,'https://attacker.example','null']) {
      const response=await fetch(`http://127.0.0.1:${port}/api/logout`,{method:'POST',headers:{Cookie:`comuni_session=${signed}`,...(origin?{Origin:origin}:{})}});
      assert.equal(response.status,403);assert.equal(response.headers.get('set-cookie'),null);
    }
    const preflight=await fetch(`http://127.0.0.1:${port}/api/logout`,{method:'OPTIONS',headers:{Origin:'http://127.0.0.1:5173','Access-Control-Request-Method':'POST'}});
    assert.equal(preflight.status,204);assert.equal(preflight.headers.get('access-control-allow-origin'),'http://127.0.0.1:5173');
    assert.equal(preflight.headers.get('access-control-allow-credentials'),'true');
    const expired=await request('/session',{token:jwt.sign({idUsuario:1},secret,{expiresIn:-1})});
    assert.equal(expired.status,401);assert.match(expired.headers.get('set-cookie'),/Expires=Thu, 01 Jan 1970/);
    assert.equal((await request('/session',{token:jwt.sign({idUsuario:1},secret,{algorithm:'HS384'})})).status,401);
    const duplicates=await fetch(`http://127.0.0.1:${port}/api/session`,{headers:{Cookie:`comuni_session=${signed}; comuni_session=${signed}`}});
    assert.equal(duplicates.status,401);
    const crossSite=await fetch(`http://127.0.0.1:${port}/api/logout`,{method:'POST',headers:{Origin:'http://127.0.0.1:5173','Sec-Fetch-Site':'cross-site'}});
    assert.equal(crossSite.status,403);
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
    const response=await login(' ADMIN@EXAMPLE.COM ','anterior');assert.equal(response.status,200);const data=await response.json();assert.equal(data.token,undefined);adminToken=response.headers.get('set-cookie').split(';')[0].split('=').slice(1).join('=');
    assert.equal(data.user.idComunidadUsuario,1);assert.equal(data.user.isAdmin,true);assert.ok(users[0].contraseña.startsWith('scrypt$'));
    const payload=jwt.verify(adminToken,secret);assert.equal(payload.contraseña,undefined);assert.equal(data.user.password,undefined);
    assert.match(response.headers.get('set-cookie'),/HttpOnly/);assert.match(response.headers.get('set-cookie'),/SameSite=Lax/);
    assert.match(response.headers.get('set-cookie'),/Path=\//);assert.match(response.headers.get('set-cookie'),/Max-Age=3600/);
    const restored=await request('/session',{token:adminToken});assert.equal(restored.status,200);
    const profile=await restored.json();assert.equal(profile.user.id,1);assert.equal(profile.token,undefined);assert.equal(profile.user.contraseña,undefined);
    const logout=await request('/logout',{method:'POST',token:adminToken});assert.equal(logout.status,200);
    assert.match(logout.headers.get('set-cookie'),/Expires=Thu, 01 Jan 1970/);
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
  await t.test('real Chromium keeps the cookie out of JavaScript, restores after reload and clears logout', {skip: !process.env.PLAYWRIGHT_MODULE && 'Set PLAYWRIGHT_MODULE to run browser integration'}, async()=>{
    const {chromium}=await import(process.env.PLAYWRIGHT_MODULE);
    const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox','--disable-dev-shm-usage']});
    try {
      const context=await browser.newContext();const page=await context.newPage();
      const pageErrors=[];page.on('pageerror',(error)=>pageErrors.push(error.message));
      await page.addInitScript(()=>{
        localStorage.setItem('comuni_token','old-credential');localStorage.setItem('comuni_user','{"fullName":"Old user"}');
      });
      await page.route('**/api/**',async(route)=>{
        const req=route.request();const headers=await req.allHeaders();delete headers.host;delete headers['content-length'];
        const response=await fetch(`http://127.0.0.1:${port}${new URL(req.url()).pathname}`,{
          method:req.method(),headers,...(req.postData()?{body:req.postData()}:{})
        });
        await route.fulfill({status:response.status,headers:Object.fromEntries(response.headers),body:await response.text()});
      });
      await page.goto('http://127.0.0.1:5173/login');
      await page.getByLabel('Email',{exact:true}).fill(registration.email);
      await page.getByLabel('Contraseña',{exact:true}).fill(password);
      const loginResponse=page.waitForResponse((response)=>new URL(response.url()).pathname==='/api/login');
      await page.getByRole('button',{name:'Continuar',exact:true}).click();
      assert.equal((await (await loginResponse).json()).token,undefined);
      await page.getByRole('heading',{name:'Hola, Ana',exact:true}).waitFor();
      assert.deepEqual(await page.evaluate(()=>({cookie:document.cookie,token:localStorage.getItem('comuni_token'),user:localStorage.getItem('comuni_user')})),{cookie:'',token:null,user:null});
      const cookie=(await context.cookies()).find((c)=>c.name==='comuni_session');
      assert.ok(cookie?.httpOnly);assert.equal(cookie.sameSite,'Lax');
      await page.reload();await page.getByRole('heading',{name:'Hola, Ana',exact:true}).waitFor();
      await page.route('**/api/logout',(route)=>route.fulfill({status:503,contentType:'application/json',body:'{}',headers:{'Access-Control-Allow-Origin':'http://127.0.0.1:5173','Access-Control-Allow-Credentials':'true'}}));
      await page.getByRole('link',{name:'Perfil',exact:true}).click();
      await page.getByRole('button',{name:'Cerrar sesión',exact:true}).click();
      await page.getByRole('alert').getByText('No se pudo cerrar sesión. Revisá la conexión y reintentá.',{exact:true}).waitFor();
      assert.ok((await context.cookies()).some((c)=>c.name==='comuni_session'));
      await page.unroute('**/api/logout');
      await page.getByRole('button',{name:'Cerrar sesión',exact:true}).click();
      await page.waitForURL('**/login');assert.equal((await context.cookies()).filter((c)=>c.name==='comuni_session').length,0);
      await page.goto('http://127.0.0.1:5173/home');await page.waitForURL('**/login');
      assert.deepEqual(pageErrors,[]);
    } finally {await browser.close();}
  });
  await t.test('rejected and wrong-password accounts never receive access; admins are revalidated after revocation',async()=>{
    const rejectedEmail='rechazada@example.com';await request('/registro',{method:'POST',body:{...registration,email:rejectedEmail}});
    const id=members.find((m)=>m.idUsuario===users.find((u)=>u.mail===rejectedEmail).id).id;
    await request(`/solicitudes-acceso/${id}`,{token:adminToken,method:'PATCH',body:{action:'rechazar'}});
    const rejected=await login(rejectedEmail,password);assert.equal(rejected.status,403);assert.equal((await rejected.json()).code,'REGISTRATION_REJECTED');
    assert.equal((await login(registration.email,'incorrecta')).status,401);
    members[0].aceptado=false;assert.equal((await request('/solicitudes-acceso',{token:adminToken})).status,403);
    assert.equal((await request('/session',{token:adminToken})).status,401);
    assert.ok(!output.includes(password));assert.ok(!output.includes(secret));assert.ok(!output.includes('local-stub-only'));
  });
  await t.test('production serves the SPA and API together, sets host-only Secure cookies and disables debug',async()=>{
    const listener=createServer();await new Promise((r)=>listener.listen(0,'127.0.0.1',r));const productionPort=listener.address().port;await new Promise((r)=>listener.close(r));
    const production=spawn(process.execPath,['src/server.js'],{cwd:runtime,env:{...process.env,NODE_ENV:'production',APP_ORIGIN:'https://demo.example',PORT:String(productionPort),SUPABASE_URL:`http://127.0.0.1:${stub.address().port}`,SUPABASE_SERVICE_ROLE_KEY:'local-stub-only',JWT_SECRET:secret},stdio:['ignore','pipe','pipe']});
    t.after(()=>production.kill());
    await new Promise((resolve,reject)=>{
      let text='';const timer=setTimeout(()=>reject(new Error('Production failed to start')),10000);
      production.once('exit',()=>{clearTimeout(timer);reject(new Error('Production exited before startup'));});
      production.stdout.on('data',(c)=>{text+=c;if(text.includes('Backend running')){clearTimeout(timer);resolve();}});
      production.stderr.on('data',()=>{});
    });
    const base=`http://127.0.0.1:${productionPort}`;
    const response=await fetch(`${base}/api/login`,{method:'POST',headers:{Origin:'https://demo.example','Content-Type':'application/json'},body:JSON.stringify({email:registration.email,password})});
    assert.equal(response.status,200);assert.equal((await response.json()).token,undefined);
    const cookie=response.headers.get('set-cookie');assert.match(cookie,/^__Host-comuni_session=/);assert.match(cookie,/; Secure/);assert.match(cookie,/; HttpOnly/);assert.ok(!cookie.includes('Domain='));
    const restored=await fetch(`${base}/api/session`,{headers:{Cookie:cookie.split(';')[0]}});assert.equal(restored.status,200);
    const spa=await fetch(`${base}/mercado/productos/10`);assert.equal(spa.status,200);assert.match(spa.headers.get('content-type'),/text\/html/);
    assert.match(spa.headers.get('content-security-policy'),/script-src 'self'/);assert.match(spa.headers.get('strict-transport-security'),/max-age=31536000/);
    const html=await spa.text();const asset=html.match(/src="([^"]+\.js)"/)[1];assert.equal((await fetch(base+asset)).status,200);
    assert.equal((await fetch(`${base}/api/debug/supabase`)).status,404);
    const missing=await fetch(`${base}/api/missing`);assert.equal(missing.status,404);assert.match(missing.headers.get('content-type'),/application\/json/);
    const foreign=await fetch(`${base}/api/logout`,{method:'POST',headers:{Origin:'https://attacker.example',Cookie:cookie.split(';')[0]}});assert.equal(foreign.status,403);
    const logout=await fetch(`${base}/api/logout`,{method:'POST',headers:{Origin:'https://demo.example'}});
    assert.match(logout.headers.get('set-cookie'),/^__Host-comuni_session=;/);assert.match(logout.headers.get('set-cookie'),/; Secure/);
    if(process.env.PLAYWRIGHT_MODULE) {
      // Browser uses a virtual HTTPS origin routed to the production server. No
      // certificate checks are disabled and no external host receives test data.
      const {chromium}=await import(process.env.PLAYWRIGHT_MODULE);
      const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox','--disable-dev-shm-usage']});
      try {
        const page=await browser.newPage();const errors=[];page.on('pageerror',(e)=>errors.push(e.message));
        await page.route('https://fonts.googleapis.com/**',(route)=>route.fulfill({status:200,contentType:'text/css',body:''}));
        await page.route('https://demo.example/**',async(route)=>{
          const req=route.request(),url=new URL(req.url()),headers=await req.allHeaders();delete headers.host;delete headers['content-length'];
          const upstream=await fetch(base+url.pathname+url.search,{method:req.method(),headers,...(req.postData()?{body:req.postData()}:{})});
          await route.fulfill({status:upstream.status,headers:Object.fromEntries(upstream.headers),body:Buffer.from(await upstream.arrayBuffer())});
        });
        await page.goto('https://demo.example/login');await page.getByLabel('Email',{exact:true}).fill(registration.email);
        await page.getByLabel('Contraseña',{exact:true}).fill(password);await page.getByRole('button',{name:'Continuar',exact:true}).click();
        await page.getByRole('heading',{name:'Hola, Ana',exact:true}).waitFor();
        const stored=(await page.context().cookies()).find((c)=>c.name==='__Host-comuni_session');
        assert.ok(stored?.httpOnly);assert.ok(stored.secure);assert.equal(stored.sameSite,'Lax');
        assert.equal(await page.evaluate(()=>document.cookie),'');
        await page.reload();await page.getByRole('heading',{name:'Hola, Ana',exact:true}).waitFor();
        assert.deepEqual(errors,[]);
      } finally {await browser.close();}
    }
  });
});
