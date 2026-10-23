// UI integration only: all API traffic is intercepted; no real user or database.
import assert from 'node:assert/strict';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium', args: ['--no-sandbox', '--disable-dev-shm-usage'] });
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
const errors = [];
page.on('pageerror', (error) => errors.push(error.message));
const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jB1kAAAAASUVORK5CYII=', 'base64');
const image = `data:image/png;base64,${png.toString('base64')}`;
let nextId = 3;
let writes = 0;
let rows = [
  { id: 1, title: 'Mesa de madera', description: 'Mesa grande para el hogar', price: 150, category: 'Hogar', condition: 2, type: 'producto', availability: 1, image, sellerName: 'Vendedor Prueba', sellerPhone: '5491100000000', whatsappLink: 'https://wa.me/5491100000000?text=Hola', owner: 'seller', reservedBy: null },
  { id: 2, title: 'Libro escolar', description: 'Libro nuevo', price: 30, category: 'Libros', condition: 1, type: 'producto', availability: 1, image, sellerName: 'Comprador Prueba', sellerPhone: '5491100000001', whatsappLink: null, owner: 'buyer', reservedBy: null }
];
const seed = async (role) => {
  await page.addInitScript((role) => {
    localStorage.setItem('comuni_token', role);
    localStorage.setItem('comuni_user', JSON.stringify({ id: role === 'buyer' ? 2 : 1, fullName: 'Usuario Prueba', community: 'Comunidad Prueba', nroSocio: 10 }));
  }, role);
};
await page.route('**/api/mercado/**', async (route) => {
  const req = route.request(); const url = new URL(req.url()); const role = req.headers().authorization?.slice(7);
  const path = url.pathname.replace('/api/mercado','');
  const method = req.method();
  const shape = (row) => ({ ...row, isOwner: row.owner === role, canDelete: row.owner === role, canReserve: row.owner !== role && row.availability === 1 });
  let status = 200, data;
  if (method === 'OPTIONS') data = {};
  else if (path === '/config') data = { categories: ['Hogar','Libros','Propiedades','Otros'], isAdmin: false };
  else if (path === '/mis-publicaciones') data = rows.filter((r) => r.owner === role).map(shape);
  else if (path === '/mis-reservas') data = rows.filter((r) => r.reservedBy === role && r.availability === 2).map(shape);
  else if (path === '/productos' && method === 'GET') {
    data = rows.filter((r) => r.availability !== 3 &&
      (!url.searchParams.get('q') || `${r.title} ${r.description}`.toLowerCase().includes(url.searchParams.get('q').toLowerCase())) &&
      (!url.searchParams.get('category') || r.category === url.searchParams.get('category')) &&
      (!url.searchParams.get('condition') || r.condition === Number(url.searchParams.get('condition'))) &&
      (!url.searchParams.get('maxPrice') || r.price <= Number(url.searchParams.get('maxPrice')))).map(shape);
  } else if (path === '/productos' && method === 'POST') {
    writes++;
    await new Promise((resolve) => setTimeout(resolve,150));
    const body = req.postDataJSON();
    assert.equal(Array.isArray(body.photo),false); assert.equal(body.photo.mimeType,'image/png');
    rows.unshift({ ...body, id: nextId++, availability: 1, image, sellerName: 'Usuario Prueba', owner: role });
    data = { id: rows[0].id };
  } else {
    const [, id, action] = path.match(/^\/productos\/(\d+)(?:\/(.*))?$/) || [];
    const row = rows.find((r) => r.id === Number(id));
    if (!row) { status = 404; data = { message: 'Publicación no encontrada' }; }
    else if (method === 'GET') data = shape(row);
    else if (action === 'reservar') { row.availability = 2; row.reservedBy = role; data = { id: 100 }; }
    else if (action === 'vendido') { row.availability = 3; data = { ok: true }; }
    else if (method === 'PUT') { Object.assign(row,req.postDataJSON()); data = { id: row.id }; }
    else if (method === 'DELETE') { rows = rows.filter((r) => r !== row); data = { ok: true }; }
    else { status = 400; data = { message: 'Request inesperado' }; }
  }
  await route.fulfill({ status, contentType: 'application/json', headers: { 'Access-Control-Allow-Origin':'*', 'Access-Control-Allow-Headers':'Authorization, Content-Type', 'Access-Control-Allow-Methods':'GET,POST,PUT,PATCH,DELETE,OPTIONS' }, body: JSON.stringify(data) });
});

try {
  await seed('buyer');
  await page.goto('http://127.0.0.1:5173/home');
  await page.getByRole('heading', { name:'Hola, Usuario', exact:true }).waitFor();
  await page.locator('a[href="/mercado"]').first().click();
  assert.equal(new URL(page.url()).pathname,'/mercado');
  await page.getByRole('heading', { name:'Mesa de madera', exact:true }).waitFor();
  assert.equal(await page.locator('.market-card').count(),2);
  assert.ok(await page.getByText('Comunidad Prueba', { exact:true }).count());
  await page.getByLabel('Buscar en título y descripción').fill('grande');
  await page.getByRole('heading', { name:'Libro escolar', exact:true }).waitFor({ state:'detached' });
  await page.getByRole('heading', { name:'Mesa de madera', exact:true }).waitFor();
  assert.equal(await page.locator('.market-card').count(),1);
  await page.getByLabel('Buscar en título y descripción').fill('');
  await page.getByLabel('Precio máximo', { exact:true }).fill('40');
  await page.getByRole('heading', { name:'Libro escolar', exact:true }).waitFor();
  assert.equal(await page.locator('.market-card').count(),1);
  await page.getByLabel('Precio máximo', { exact:true }).fill('');
  await page.getByLabel('Condición', { exact:true }).selectOption('2');
  await page.getByRole('heading', { name:'Mesa de madera', exact:true }).waitFor();
  assert.equal(await page.locator('.market-card').count(),1);
  await page.getByLabel('Condición', { exact:true }).selectOption('');
  await page.getByRole('heading', { name:'Mesa de madera', exact:true }).click();
  await page.getByRole('dialog').getByRole('link', { name:'Contactar por WhatsApp' }).waitFor();
  assert.match(await page.getByRole('link', { name:'Contactar por WhatsApp' }).getAttribute('href'),/^https:\/\/wa.me\//);
  await page.getByRole('button', { name:'Reservar', exact:true }).click();
  await page.getByRole('dialog').getByText('Reservado', { exact:true }).waitFor();
  assert.equal(await page.getByRole('button', { name:'Reservar', exact:true }).count(),0);
  await page.getByRole('button', { name:'Cerrar', exact:true }).click();
  await page.getByRole('button', { name:'Mis reservas', exact:true }).click();
  await page.getByRole('heading', { name:'Mesa de madera', exact:true }).waitFor();
  assert.equal(await page.locator('.market-card').count(),1);
  console.log('PASS búsqueda, filtros, detalle, WhatsApp, reserva y Mis reservas');

  await page.getByRole('button', { name:'+ Publicar', exact:true }).click();
  const editor = page.getByRole('dialog');
  await editor.getByLabel('Título', { exact:true }).fill('Casa en venta');
  await editor.getByLabel('Descripción', { exact:true }).fill('Casa de prueba en la comunidad');
  await editor.getByLabel('Precio ($)', { exact:true }).fill('125000.50');
  await editor.getByLabel('Categoría', { exact:true }).selectOption('Propiedades');
  await editor.getByLabel('Tipo', { exact:true }).selectOption('propiedad');
  await editor.getByLabel('Condición', { exact:true }).selectOption('1');
  await editor.getByLabel('Una foto · hasta 5 MB', { exact:true }).setInputFiles({ name:'test.png', mimeType:'image/png', buffer:png });
  await editor.getByAltText('Vista previa de la publicación').waitFor();
  // Two immediate submits exercise the synchronous ref guard, before rerender.
  await editor.locator('form').evaluate((form) => { form.requestSubmit(); form.requestSubmit(); });
  await editor.waitFor({ state:'detached' });
  assert.equal(writes,1);
  await page.getByRole('button', { name:'Mis publicaciones', exact:true }).click();
  const card = page.locator('.market-card').filter({ has:page.getByRole('heading', { name:'Casa en venta', exact:true }) });
  await card.waitFor();
  await card.getByRole('button', { name:'Editar', exact:true }).click();
  await page.getByRole('dialog').getByLabel('Título', { exact:true }).fill('Casa actualizada');
  await page.getByRole('button', { name:'Guardar cambios', exact:true }).click();
  await page.getByRole('heading', { name:'Casa actualizada', exact:true }).waitFor();
  const updated = page.locator('.market-card').filter({ has:page.getByRole('heading', { name:'Casa actualizada', exact:true }) });
  page.once('dialog', (dialog) => dialog.accept());
  await updated.getByRole('button', { name:'Vendido', exact:true }).click();
  await updated.getByText('Vendido', { exact:true }).first().waitFor();
  await page.waitForFunction(() => [...document.querySelectorAll('.market-status')].some((s) => s.textContent === 'Vendido'));
  await page.getByRole('button', { name:'Mercado', exact:true }).click();
  await page.waitForFunction(() => !document.querySelector('[aria-label="Cargando publicaciones"]'));
  assert.equal(await page.getByRole('heading', { name:'Casa actualizada', exact:true }).count(),0);
  await page.getByRole('button', { name:'Mis publicaciones', exact:true }).click();
  await page.getByRole('heading', { name:'Casa actualizada', exact:true }).waitFor();
  await updated.getByRole('button', { name:'Eliminar', exact:true }).click();
  await page.getByRole('button', { name:'Confirmar eliminación', exact:true }).click();
  await page.getByRole('dialog').waitFor({ state:'detached' });
  assert.equal(rows.some((r) => r.title==='Casa actualizada'),false);
  console.log('PASS publicación con una foto, tipo Propiedad/Nuevo, doble submit, edición, venta y eliminación');

  await page.goto('http://127.0.0.1:5173/mercado/productos/999');
  await page.getByRole('dialog').getByText('Publicación no encontrada', { exact:true }).waitFor();
  await page.getByRole('button', { name:'Cerrar', exact:true }).click();
  await page.getByRole('heading', { name:'Mesa de madera', exact:true }).waitFor();
  const width = await page.evaluate(() => ({ viewport:innerWidth, content:document.documentElement.scrollWidth }));
  assert.ok(width.content<=width.viewport,JSON.stringify(width));
  assert.deepEqual(errors,[]);
  if (process.env.MARKET_SCREENSHOT) await page.screenshot({ path:process.env.MARKET_SCREENSHOT, fullPage:true });
  console.log('PASS URL inexistente, cierre de detalle, viewport móvil y ausencia de errores React');
  const loggedOut = await browser.newPage();
  for (const path of ['/mercado','/mercado/productos/1']) {
    await loggedOut.goto(`http://127.0.0.1:5173${path}`);
    await loggedOut.waitForURL('**/login');
    await loggedOut.getByRole('button', { name:'Continuar', exact:true }).waitFor();
  }
  await loggedOut.close();
  console.log('PASS navegación desde Inicio y rutas de Mercado protegidas sin sesión');
} finally { await browser.close(); }
