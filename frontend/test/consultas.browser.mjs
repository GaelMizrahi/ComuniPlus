import assert from 'node:assert/strict';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox','--disable-dev-shm-usage']});
const members={userA:{id:11,user:1,club:1,name:'Ana Demo',admin:false},userA2:{id:12,user:2,club:1,name:'Bruno Demo',admin:false},adminA:{id:10,user:3,club:1,name:'Admin Demo',admin:true},userB:{id:21,user:4,club:2,name:'Carla Demo',admin:false}};
const conversations=[{id:101,club:1,owner:11},{id:102,club:1,owner:12},{id:201,club:2,owner:21}];
let messages=[{id:1,conversation:102,sender:12,text:'Consulta privada de Bruno',isAdmin:false,isBroadcast:false}],writes=0,broadcasts=0;
const errors=[],now=()=>new Date().toISOString();
const meta=(c)=>({id:c.id,name:Object.values(members).find((m)=>m.id===c.owner)?.name,membershipNumber:c.owner,active:true,updatedAt:now(),preview:messages.filter((m)=>m.conversation===c.id).at(-1)?.text||''});
async function pageFor(role){
 const page=await browser.newPage({viewport:{width:390,height:844}});page.on('pageerror',(e)=>errors.push(e.message));
 if(role)await page.context().addCookies([{name:'comuni_session',value:role,domain:'127.0.0.1',path:'/',httpOnly:true,sameSite:'Lax'}]);
 await page.route('**/api/**',async(route)=>{
  const request=route.request(),url=new URL(request.url()),path=url.pathname.replace('/api/consultas',''),method=request.method();
  const role=(await request.allHeaders()).cookie?.match(/comuni_session=([^;]+)/)?.[1],actor=members[role];let status=200,data={};
  const receivers=()=>Object.values(members).filter((m)=>m.club===actor.club&&m.user!==actor.user);
  const own=(member)=>{let c=conversations.find((c)=>c.owner===member.id);if(!c){c={id:300+conversations.length,club:member.club,owner:member.id};conversations.push(c);}return c;};
  const add=(c,text,broadcast=false)=>{const m={id:messages.length+1,conversation:c.id,sender:actor.id,text,isAdmin:actor.admin,isBroadcast:broadcast,createdAt:now()};messages.push(m);return{...m,mine:true};};
  if(url.pathname==='/api/session'){
   if(!actor)status=401;else data={user:{id:actor.user,fullName:actor.name,community:actor.club===1?'Ferro':'River Plate',communityLogo:actor.club===1?'/club-logos/ferro.jpg':'/club-logos/river-plate.png',nroSocio:actor.id,isAdmin:true}};
  }else if(!actor)status=401;
  else if(path==='/contexto')data={isAdmin:actor.admin,recipientCount:actor.admin?receivers().length:0,adminAvailable:actor.club===1};
  else if(path==='/propia')data={id:own(actor).id};
  else if(path==='/conversaciones'){
   if(!actor.admin){status=403;data={message:'Solo administradores'};}else data={items:conversations.filter((c)=>c.club===actor.club).map(meta),hasMore:false};
  }else if(path==='/difusiones'){
   if(!actor.admin){status=403;data={message:'Solo administradores'};}
   else{broadcasts++;const body=request.postDataJSON();for(const member of receivers())add(own(member),body.text,true);data={id:broadcasts,recipientCount:receivers().length};}
  }else{
   const id=Number(path.split('/')[2]),c=conversations.find((c)=>c.id===id&&c.club===actor.club&&(c.owner===actor.id||actor.admin));
   if(!c){status=404;data={message:'Conversación no encontrada'};}
   else if(method==='POST'){
    writes++;await new Promise((r)=>setTimeout(r,100));data={item:add(c,request.postDataJSON().text)};
   }else{
    const after=Number(url.searchParams.get('after')),before=Number(url.searchParams.get('before'));
    const items=messages.filter((m)=>m.conversation===c.id&&(!after||m.id>after)&&(!before||m.id<before)).map((m)=>({...m,createdAt:m.createdAt||now(),mine:m.sender===actor.id}));
    data={conversation:meta(c),items,canReply:true,isAdmin:actor.admin,hasMore:false};
   }
  }
  await route.fulfill({status,contentType:'application/json',body:JSON.stringify(data),headers:{'Access-Control-Allow-Origin':'http://127.0.0.1:5173','Access-Control-Allow-Credentials':'true'}});
 });
 return page;
}
try{
 const anonymous=await pageFor();await anonymous.goto('http://127.0.0.1:5173/consultas');await anonymous.waitForURL('**/login');await anonymous.close();
 const user=await pageFor('userA');await user.goto('http://127.0.0.1:5173/home');await user.getByRole('link',{name:/Consultas Chat privado/}).click();await user.waitForURL('**/consultas/101');
 await user.getByLabel('Mensaje privado',{exact:true}).fill('Quiero consultar por una reserva');
 await user.getByRole('form',{name:'Enviar mensaje privado',exact:true}).evaluate((form)=>{form.requestSubmit();form.requestSubmit();});
 await user.getByRole('log').getByText('Quiero consultar por una reserva',{exact:true}).waitFor();assert.equal(writes,1);
 assert.equal(await user.getByRole('button',{name:'Mensaje a todos los socios',exact:true}).count(),0);
 assert.equal(await user.getByText('Consulta privada de Bruno',{exact:true}).count(),0);
 console.log('PASS acceso desde Inicio, sesión obligatoria, chat propio y doble envío protegido');
 const admin=await pageFor('adminA');await admin.goto('http://127.0.0.1:5173/consultas');await admin.getByRole('link',{name:/Ana Demo/}).click();
 await admin.getByRole('log').getByText('Quiero consultar por una reserva',{exact:true}).waitFor();await admin.getByLabel('Mensaje privado',{exact:true}).fill('Hola Ana, ya revisamos tu consulta');await admin.getByRole('button',{name:'Enviar mensaje',exact:true}).click();
 await user.getByRole('log').getByText('Hola Ana, ya revisamos tu consulta',{exact:true}).waitFor({timeout:12000});
 await user.goto('http://127.0.0.1:5173/consultas/102');await user.getByRole('alert').getByText('Conversación no encontrada',{exact:true}).waitFor();assert.equal(await user.getByText('Consulta privada de Bruno',{exact:true}).count(),0);
 await user.goto('http://127.0.0.1:5173/consultas');await user.waitForURL('**/consultas/101');
 console.log('PASS respuesta del administrador aparece automáticamente y otro socio no puede abrir la conversación');
 await admin.getByRole('link',{name:'← Todas las conversaciones',exact:true}).click();await admin.getByRole('button',{name:'Mensaje a todos los socios',exact:true}).click();
 await admin.getByLabel('Mensaje para todos los socios',{exact:true}).fill('El club abrirá el sábado a las 9');admin.once('dialog',(dialog)=>dialog.accept());await admin.getByRole('button',{name:'Enviar a todos',exact:true}).click();
 await admin.getByRole('status').getByText('Mensaje enviado a 2 socios.',{exact:true}).waitFor();assert.equal(broadcasts,1);
 await user.getByRole('log').getByText('El club abrirá el sábado a las 9',{exact:true}).waitFor({timeout:12000});
 const other=await pageFor('userA2');await other.goto('http://127.0.0.1:5173/consultas');await other.waitForURL('**/consultas/102');await other.getByRole('log').getByText('El club abrirá el sábado a las 9',{exact:true}).waitFor();
 assert.equal(await other.getByText('Quiero consultar por una reserva',{exact:true}).count(),0);assert.equal(await other.getByText('Hola Ana, ya revisamos tu consulta',{exact:true}).count(),0);
 await user.getByLabel('Mensaje privado',{exact:true}).fill('Gracias, tengo otra duda privada');await user.getByRole('button',{name:'Enviar mensaje',exact:true}).click();await user.getByRole('log').getByText('Gracias, tengo otra duda privada',{exact:true}).waitFor();
 assert.ok(!messages.some((m)=>m.conversation===102&&m.text==='Gracias, tengo otra duda privada'));
 const foreign=await pageFor('userB');await foreign.goto('http://127.0.0.1:5173/consultas');await foreign.waitForURL('**/consultas/201');await foreign.getByText('Tu club todavía no tiene un administrador asignado. Podés dejar tu consulta y quedará guardada aquí.',{exact:true}).waitFor();
 assert.equal(await foreign.getByText('El club abrirá el sábado a las 9',{exact:true}).count(),0);
 await user.reload();await user.getByRole('log').getByText('Gracias, tengo otra duda privada',{exact:true}).waitFor();
 const size=await user.evaluate(()=>({width:innerWidth,content:document.documentElement.scrollWidth}));assert.ok(size.content<=size.width);assert.deepEqual(errors,[]);
 console.log('PASS difusión en copias privadas del mismo club, respuestas privadas, persistencia y vista móvil');
}finally{await browser.close();}
