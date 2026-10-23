// UI workflow with intercepted API data. No real accounts are created.
import assert from 'node:assert/strict';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox','--disable-dev-shm-usage']});
const page=await browser.newPage({viewport:{width:390,height:844}});
const errors=[];page.on('pageerror',(error)=>errors.push(error.message));
const password='Nueva Clave123!';
const accounts=[{id:1,firstName:'Admin',lastName:'Prueba',email:'admin@example.com',password:'AdminClave123!',phone:'5491100000001',communityId:1,membershipNumber:100,accepted:true,admin:true},
  {id:2,firstName:'Pendiente',lastName:'Rechazo',email:'rechazo@example.com',password,phone:'5491100000002',communityId:1,membershipNumber:102,accepted:false,rejected:false}];
let postCount=0;
const session=(account)=>({id:account.id,idUsuario:account.id,idComunidad:account.communityId,idComunidadUsuario:account.id,nroSocio:account.membershipNumber,fullName:`${account.firstName} ${account.lastName}`,community:'Comunidad A',isAdmin:account.admin??false,foto:null});
await page.route('https://i.pravatar.cc/**',(route)=>route.fulfill({status:200,contentType:'image/png',body:Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jB1kAAAAASUVORK5CYII=','base64')}));
await page.route('**/api/**',async(route)=>{
  const req=route.request(),url=new URL(req.url());const path=url.pathname.replace('/api','');const method=req.method();
  const actor=accounts.find((a)=>`token-${a.id}`===req.headers().authorization?.slice(7));
  let status=200,data={};
  if(method==='OPTIONS')data={};
  else if(path==='/registro/comunidades')data=[{id:1,nombre:'Comunidad A'},{id:2,nombre:'Comunidad B'}];
  else if(path==='/registro'&&method==='POST'){
    postCount++;const body=req.postDataJSON();
    assert.equal(body.membershipNumber,'123');assert.equal(body.communityId,'1');
    await new Promise((r)=>setTimeout(r,150));
    accounts.push({...body,id:accounts.length+1,email:body.email.toLowerCase(),accepted:false,rejected:false});
    status=201;data={ok:true,message:'Tu cuenta fue creada y la solicitud está pendiente de aprobación. Podrás ingresar cuando el administrador te acepte.'};
  }else if(path==='/login'){
    const body=req.postDataJSON(),account=accounts.find((a)=>a.email===body.email.toLowerCase()&&a.password===body.password);
    if(!account){status=401;data={message:'Credenciales inválidas'};}
    else if(!account.accepted){status=403;data={message:account.rejected?'Tu solicitud fue rechazada. Contactá al administrador de la comunidad.':'Tu solicitud está pendiente de aprobación del administrador.'};}
    else data={token:`token-${account.id}`,user:session(account)};
  }else if(path==='/solicitudes-acceso/permisos')data={isAdmin:actor?.admin??false};
  else if(path.startsWith('/solicitudes-acceso')){
    if(!actor?.admin){status=403;data={message:'Solo los administradores de esta comunidad pueden gestionar solicitudes'};}
    else if(method==='GET')data=accounts.filter((a)=>a.communityId==1&&!a.accepted&&!a.rejected).map((a)=>({id:a.id,fullName:`${a.firstName} ${a.lastName}`,email:a.email,phone:a.phone,membershipNumber:a.membershipNumber,requestedAt:'2026-10-23T12:00:00Z'}));
    else {const target=accounts.find((a)=>a.id===Number(path.split('/').at(-1)));const {action}=req.postDataJSON();target.accepted=action==='aprobar';target.rejected=!target.accepted;data={message:target.accepted?'Solicitud aprobada. La persona ya puede iniciar sesión.':'Solicitud rechazada.'};}
  }else{status=404;data={message:'Ruta inesperada en la prueba'};}
  await route.fulfill({status,contentType:'application/json',headers:{'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'Authorization, Content-Type','Access-Control-Allow-Methods':'GET,POST,PATCH,OPTIONS'},body:JSON.stringify(data)});
});
const login=async(email,pass)=>{
  await page.getByLabel('Email',{exact:true}).fill(email);await page.getByLabel('Contraseña',{exact:true}).fill(pass);
  await page.getByRole('button',{name:'Continuar',exact:true}).click();
};
try{
  await page.goto('http://127.0.0.1:5173/login');await page.getByRole('link',{name:'Crear cuenta',exact:true}).click();
  await page.getByLabel('Nombre',{exact:true}).fill('Ana');await page.getByLabel('Apellido',{exact:true}).fill('Pérez');
  await page.getByLabel('Email',{exact:true}).fill('ana@example.com');await page.getByLabel('Teléfono',{exact:true}).fill('+5491123456789');
  await page.getByLabel('Comunidad',{exact:true}).selectOption('1');await page.getByLabel('Número de socio',{exact:true}).fill('123');
  await page.getByLabel('Contraseña',{exact:true}).fill(password);await page.getByLabel('Repetir contraseña',{exact:true}).fill('Otra Clave123!');
  await page.getByRole('button',{name:'Crear cuenta y solicitar acceso',exact:true}).click();
  await page.getByRole('alert').getByText('Las contraseñas no coinciden',{exact:true}).waitFor();assert.equal(postCount,0);
  await page.getByLabel('Repetir contraseña',{exact:true}).fill(password);
  await page.locator('form').evaluate((form)=>{form.requestSubmit();form.requestSubmit();});
  await page.getByRole('heading',{name:'Solicitud enviada',exact:true}).waitFor();assert.equal(postCount,1);
  assert.equal(await page.evaluate(()=>localStorage.getItem('comuni_token')),null);assert.equal(await page.locator('input[type=password]').count(),0);
  await page.getByRole('link',{name:'Volver al inicio de sesión',exact:true}).click();
  await login('ana@example.com',password);await page.getByText('Tu solicitud está pendiente de aprobación del administrador.',{exact:true}).waitFor();
  assert.equal(new URL(page.url()).pathname,'/login');assert.equal(await page.evaluate(()=>localStorage.getItem('comuni_token')),null);
  console.log('PASS registro con comunidad y teléfono, contraseñas coincidentes, doble submit y bloqueo mientras está pendiente');

  await login('admin@example.com','AdminClave123!');await page.getByRole('heading',{name:'Hola, Admin',exact:true}).waitFor();
  await page.getByRole('link',{name:'Perfil',exact:true}).click();await page.getByRole('link',{name:/Solicitudes de acceso/}).click();
  const accepted=page.locator('article').filter({has:page.getByRole('heading',{name:'Ana Pérez',exact:true})});await accepted.waitFor();
  page.once('dialog',(dialog)=>dialog.accept());await accepted.getByRole('button',{name:'Aprobar',exact:true}).click();
  await accepted.waitFor({state:'detached'});
  const rejected=page.locator('article').filter({has:page.getByRole('heading',{name:'Pendiente Rechazo',exact:true})});await rejected.waitFor();
  page.once('dialog',(dialog)=>dialog.accept());await rejected.getByRole('button',{name:'Rechazar',exact:true}).click();
  await page.getByText('No hay solicitudes pendientes en esta comunidad.',{exact:true}).waitFor();
  await page.getByRole('link',{name:'Perfil',exact:true}).click();await page.getByRole('button',{name:'Cerrar sesión',exact:true}).click();await page.waitForURL('**/login');
  await login('rechazo@example.com',password);await page.getByText('Tu solicitud fue rechazada. Contactá al administrador de la comunidad.',{exact:true}).waitFor();
  await login('ana@example.com',password);await page.getByRole('heading',{name:'Hola, Ana',exact:true}).waitFor();
  console.log('PASS administrador aprueba/rechaza, rechazado no entra y aprobado puede iniciar sesión');

  await page.getByRole('link',{name:'Perfil',exact:true}).click();
  await page.waitForTimeout(300);
  assert.equal(await page.getByRole('link',{name:/Solicitudes de acceso/}).count(),0);
  assert.equal(await page.locator('img').count(),0); // fallback initials, no broken profile image
  await page.goto('http://127.0.0.1:5173/solicitudes-acceso');
  await page.getByRole('alert').getByText('Solo los administradores de esta comunidad pueden gestionar solicitudes',{exact:true}).waitFor();
  assert.equal(await page.locator('article').count(),0);assert.deepEqual(errors,[]);
  if(process.env.REGISTRATION_SCREENSHOT)await page.screenshot({path:process.env.REGISTRATION_SCREENSHOT,fullPage:true});
  console.log('PASS Perfil sin controles admin para miembros y acceso directo rechazado');
}finally{await browser.close();}
