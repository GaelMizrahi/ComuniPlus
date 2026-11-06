import assert from 'node:assert/strict';
import { clubs, logoFiles } from '../../database/generar_clubes_demo.mjs';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium', args: ['--no-sandbox', '--disable-dev-shm-usage'] });
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
const errors = []; page.on('pageerror', (error) => errors.push(error.message));
const communities = clubs.map(([slug, nombre], index) => ({ id: index + 1, nombre, tipo: 'otro', logoUrl: `/club-logos/${logoFiles[slug] ?? `${slug}.png`}` }));
let activeClub = communities[0];
await page.route('https://i.pravatar.cc/**', (route) => route.abort());
await page.route('**/api/**', async (route) => {
  const req = route.request(), path = new URL(req.url()).pathname;
  const authenticated = (await req.allHeaders()).cookie?.includes('comuni_session=demo');
  let status = 200, body;
  if (path === '/api/session') {
    status = authenticated ? 200 : 401;
    body = authenticated ? { user: { id: 1, fullName: 'Socio Demo', community: activeClub.nombre, communityLogo: activeClub.logoUrl, nroSocio: 900001 } } : {};
  } else if (path === '/api/registro/comunidades') body = communities;
  else if (path === '/api/solicitudes-acceso/permisos') body = { isAdmin: false };
  else { status = 404; body = {}; }
  await route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body), headers: { 'Access-Control-Allow-Origin': 'http://127.0.0.1:5173', 'Access-Control-Allow-Credentials': 'true' } });
});
async function loaded(alt, count = 1) {
  await page.waitForFunction(({ alt, count }) => {
    const images = [...document.querySelectorAll('img')].filter((img) => img.alt === alt);
    return images.length === count && images.every((img) => img.complete && img.naturalWidth > 0);
  }, { alt, count });
}
try {
  await page.goto('http://127.0.0.1:5173/registro');
  for (const club of communities) {
    const image = await page.request.get(`http://127.0.0.1:5173${club.logoUrl}`);
    assert.equal(image.status(), 200, club.nombre);
    assert.match(image.headers()['content-type'], /image\/(png|jpeg)/);
    await page.getByLabel('Comunidad', { exact: true }).selectOption(String(club.id));
    await loaded(`Logo de ${club.nombre}`);
  }
  console.log('PASS los siete escudos originales se sirven como PNG/JPEG y aparecen al elegir el club');
  await page.context().addCookies([{ name: 'comuni_session', value: 'demo', domain: '127.0.0.1', path: '/', httpOnly: true, sameSite: 'Lax' }]);
  for (const club of communities) {
    activeClub = club;
    await page.goto('http://127.0.0.1:5173/home');
    await page.getByRole('heading', { name: 'Hola, Socio', exact: true }).waitFor();
    await loaded(`Logo de ${club.nombre}`, 2);
  }
  await page.getByRole('link', { name: 'Perfil', exact: true }).click();
  await loaded(`Logo de ${activeClub.nombre}`, 2);
  const size = await page.evaluate(() => ({ width: innerWidth, content: document.documentElement.scrollWidth }));
  assert.ok(size.content <= size.width);
  assert.deepEqual(errors, []);
  console.log('PASS cabecera, Inicio y Perfil muestran el club de la sesión en móvil sin errores React');
} finally { await browser.close(); }
