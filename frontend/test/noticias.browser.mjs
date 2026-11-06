import assert from 'node:assert/strict';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox','--disable-dev-shm-usage']});
const page=await browser.newPage({viewport:{width:390,height:844}}),errors=[];
page.on('pageerror',(error)=>errors.push(error.message));
let writes=0;
let rows=[1,2].flatMap((club)=>[1,2,3].map((n)=>({id:club*10+n,club,title:`Noticia ${n} del club ${club}`,text:'Este contenido de ejemplo pertenece solamente al club seleccionado. Una novedad para todos sus socios.',image:club===1?'/club-logos/ferro.jpg':'/club-logos/river-plate.png',publishedAt:'2026-11-06T12:00:00Z',isDemo:true})));
await page.route('**/api/**',async(route)=>{
 const request=route.request(),url=new URL(request.url()),method=request.method();
 const cookie=(await request.allHeaders()).cookie??'',session=cookie.match(/comuni_session=([^;]+)/)?.[1];
 const club=session?.endsWith('b')?2:1,admin=session?.startsWith('admin'),canPublish=Boolean(admin);
 let status=200,body={};
 if(method==='OPTIONS')body={};
 else if(url.pathname==='/api/session'){
  if(!session){status=401;body={};}
  else body={user:{id:1,fullName:'Socio Demo',community:club===1?'Ferro':'River Plate',communityLogo:club===1?'/club-logos/ferro.jpg':'/club-logos/river-plate.png',nroSocio:900001,isAdmin:true}}; // server permissions, not this forged flag, control UI
 }else if(url.pathname==='/api/noticias'&&method==='GET')body={items:rows.filter((row)=>row.club===club),hasMore:false,canPublish};
 else if(url.pathname==='/api/noticias'&&method==='POST'){
  if(!admin){status=403;body={message:'Solo administradores'};}
  else{writes++;await new Promise((r)=>setTimeout(r,150));const data=request.postDataJSON();assert.ok(data.photo.data);assert.equal(data.photo.mimeType,'image/png');rows.unshift({id:99,club,...data,image:club===1?'/club-logos/ferro.jpg':'/club-logos/river-plate.png',publishedAt:new Date().toISOString(),isDemo:false});status=201;body={id:99};}
 }else if(url.pathname.startsWith('/api/noticias/')){
  const row=rows.find((item)=>item.id===Number(url.pathname.split('/').at(-1))&&item.club===club);
  if(!row){status=404;body={message:'Noticia no encontrada'};}
  else if(method==='DELETE'){
   if(!admin){status=403;body={message:'Solo administradores'};}else{rows=rows.filter((item)=>item!==row);body={ok:true};}
  }else body={item:row,canPublish};
 }else{status=404;body={message:'Ruta inesperada'};}
 await route.fulfill({status,contentType:'application/json',body:JSON.stringify(body),headers:{'Access-Control-Allow-Origin':'http://127.0.0.1:5173','Access-Control-Allow-Credentials':'true','Access-Control-Allow-Methods':'GET,POST,DELETE,OPTIONS','Access-Control-Allow-Headers':'Content-Type'}});
});
const session=async(value)=>page.context().addCookies([{name:'comuni_session',value,domain:'127.0.0.1',path:'/',httpOnly:true,sameSite:'Lax'}]);
try{
 await page.goto('http://127.0.0.1:5173/noticias');await page.waitForURL('**/login');
 await session('member-a');await page.goto('http://127.0.0.1:5173/home');await page.getByRole('heading',{name:'Hola, Socio',exact:true}).waitFor();
 assert.equal(await page.getByText('Tu comunidad',{exact:true}).count(),0);assert.equal(await page.getByText('+120 vecinos',{exact:true}).count(),0);
 await page.getByRole('link',{name:/Noticias Novedades/}).click();
 await page.getByRole('heading',{name:'Noticias del club',exact:true}).waitFor();await page.locator('.news-card').nth(2).waitFor();
 assert.equal(await page.locator('.news-card').count(),3);assert.equal(await page.getByRole('button',{name:'+ Publicar noticia',exact:true}).count(),0);
 assert.equal(await page.getByRole('button',{name:'Eliminar noticia',exact:true}).count(),0);
 await page.getByRole('link',{name:'Noticia 1 del club 1',exact:true}).click();await page.getByRole('heading',{name:'Noticia 1 del club 1',exact:true}).waitFor();
 await page.goto('http://127.0.0.1:5173/noticias/21');await page.getByRole('alert').getByText('Noticia no encontrada',{exact:true}).waitFor();
 console.log('PASS Noticias está protegida, reemplaza miembros ficticios y socios leen tres ejemplos propios sin controles admin');
 await session('admin-a');await page.goto('http://127.0.0.1:5173/noticias');await page.getByRole('button',{name:'+ Publicar noticia',exact:true}).click();
 const editor=page.getByRole('region',{name:'Publicar noticia',exact:true});await editor.getByLabel('Título',{exact:true}).fill('Se inauguró una nueva cancha');
 await editor.getByLabel('Texto de la noticia',{exact:true}).fill('La nueva cancha ya está disponible para que todos los socios puedan reservar y disfrutar.');
 await editor.getByLabel('Imagen · hasta 5 MB',{exact:true}).setInputFiles('/workspace/ComuniPlus/frontend/public/club-logos/cissab.png');
 await page.getByAltText('Vista previa de la noticia',{exact:true}).waitFor();
 await editor.locator('form').evaluate((form)=>{form.requestSubmit();form.requestSubmit();});
 await editor.waitFor({state:'detached'});await page.getByRole('heading',{name:'Se inauguró una nueva cancha',exact:true}).waitFor();assert.equal(writes,1);
 const card=page.locator('article').filter({has:page.getByRole('heading',{name:'Se inauguró una nueva cancha',exact:true})});
 page.once('dialog',(dialog)=>dialog.accept());await card.getByRole('button',{name:'Eliminar noticia',exact:true}).click();await card.waitFor({state:'detached'});
 console.log('PASS administrador publica con imagen y vista previa, doble envío protegido y eliminación');
 await session('member-b');await page.goto('http://127.0.0.1:5173/noticias');await page.getByRole('heading',{name:'Noticia 1 del club 2',exact:true}).waitFor();
 assert.equal(await page.getByRole('heading',{name:'Noticia 1 del club 1',exact:true}).count(),0);
 const size=await page.evaluate(()=>({width:innerWidth,content:document.documentElement.scrollWidth}));assert.ok(size.content<=size.width);
 assert.deepEqual(errors,[]);
 console.log('PASS otro club solo muestra sus noticias, sin desbordamiento móvil ni errores React');
}finally{await browser.close();}
