import test from 'node:test';
import assert from 'node:assert/strict';
import { createMarketService, validateImage, positiveId } from '../src/services/market.service.js';
import { createMarketRepository } from '../src/repositories/market.repository.js';

const member = { id: 10, idUsuario: 1, idComunidad: 100, aceptado: true };
const claims = { idUsuario: 1, idComunidad: 100, idComunidadUsuario: 10 };
const png = { mimeType: 'image/png', data: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jB1kAAAAASUVORK5CYII=' };
const body = { title: 'Mesa', description: 'Mesa de madera', price: 15.50, category: 'Hogar', condition: 2, type: 'producto', photo: png };
const row = (values = {}) => ({ id: 50, titulo: 'Mesa', descripcion: 'Madera', precio: 15.5, categoria: 'Hogar', estado: 2, tipo: 'producto', disponibilidad: 1, idVendedor: 20, fotoPath: '100/20/image.png', vendedor: { usuario: { nombre: 'Vendedor', apellido: 'Prueba', telefono: '5491100000000' } }, ...values });
function fixture(overrides = {}) {
  const calls = [];
  const repo = {
    membership: async (c) => JSON.stringify(c) === JSON.stringify(claims) ? member : null,
    community: async () => ({ tipo: 'otro' }), isAdmin: async () => false,
    product: async (m, id) => id === 50 && m.idComunidad === 100 ? row() : null,
    list: async () => [row()], reservations: async () => [], imageUrl: (p) => `https://images.invalid/${p}`,
    reserve: async (...args) => { calls.push(['reserve', ...args]); return { id: 1 }; },
    manage: async (...args) => { calls.push(['manage', ...args]); return {}; },
    save: async (...args) => { calls.push(['save', ...args]); return { id: 51 }; },
    upload: async (...args) => calls.push(['upload', ...args]), removeImage: async (...args) => calls.push(['remove', ...args]),
    ...overrides
  };
  return { service: createMarketService(repo), calls };
}
const denied = (status) => (error) => error.statusCode === status;

test('membership must match user, selected community and membership; revoked membership fails', async () => {
  const { service } = fixture();
  assert.deepEqual(await service.authorize(claims), member);
  for (const altered of [{ ...claims, idUsuario: 2 }, { ...claims, idComunidad: 200 }, { ...claims, idComunidadUsuario: 11 }]) {
    await assert.rejects(service.authorize(altered), denied(403));
  }
  await assert.rejects(fixture({ membership: async () => null }).service.authorize(claims), denied(403));
});
test('rejects ambiguous or unsafe IDs instead of parseInt truncation', () => {
  for (const id of ['1x', '-1', '0', '1.5', '', '9007199254740993']) assert.throws(() => positiveId(id), denied(400));
});
test('cross-community detail, reservation, edits and deletes are hidden', async () => {
  const { service, calls } = fixture({ product: async () => null });
  for (const operation of [() => service.detail(member, 99), () => service.reserve(member, 99), () => service.save(member, 99, body), () => service.manage(member, 99, 'eliminar')]) await assert.rejects(operation(), denied(404));
  assert.equal(calls.length, 0);
});
test('only the owner can edit or mark sold; regular non-owner cannot delete', async () => {
  const { service, calls } = fixture();
  await assert.rejects(service.save(member, 50, body), denied(403));
  await assert.rejects(service.manage(member, 50, 'vendido'), denied(403));
  await assert.rejects(service.manage(member, 50, 'eliminar'), denied(403));
  assert.equal(calls.length, 0);
});
test('same-community administrator can delete but cannot sell or edit others', async () => {
  const { service, calls } = fixture({ isAdmin: async () => true });
  await service.manage(member, 50, 'eliminar');
  await assert.rejects(service.manage(member, 50, 'vendido'), denied(403));
  await assert.rejects(service.save(member, 50, body), denied(403));
  assert.equal(calls.filter((c) => c[0] === 'manage').length, 1);
});
test('self reservation, reserved and sold products never reach reserve RPC', async () => {
  for (const values of [{ idVendedor: member.id }, { disponibilidad: 2 }, { disponibilidad: 3 }]) {
    const { service, calls } = fixture({ product: async () => row(values) });
    await assert.rejects(service.reserve(member, 50), denied(409));
    assert.equal(calls.length, 0);
  }
});
test('buyer and seller IDs come from session/RPC, not body', async () => {
  const { service, calls } = fixture();
  await service.save(member, null, { ...body, idVendedor: 999, idComunidad: 999, disponibilidad: 3 });
  const saved = calls.find((c) => c[0] === 'save');
  assert.deepEqual(saved[1], member);
  assert.equal(saved[2], null);
  assert.equal(saved[3].idVendedor, undefined);
  assert.equal(saved[3].idComunidad, undefined);
  assert.equal(saved[3].disponibilidad, undefined);
  assert.match(saved[3].fotoPath, /^100\/10\/[a-f0-9-]+\.png$/);
  await service.reserve(member, 50);
  assert.deepEqual(calls.at(-1), ['reserve', member, 50]);
});
test('required fields, finite nonnegative price, condition/type/category and single image validated', async () => {
  for (const changes of [{ title: ' ' }, { description: '' }, { price: -1 }, { price: '' }, { price: null }, { price: Infinity }, { price: 1.234 }, { category: '' }, { condition: 3 }, { condition: true }, { type: 'global' }, { photo: undefined }, { photo: [png, png] }]) {
    const { service, calls } = fixture();
    await assert.rejects(service.save(member, null, { ...body, ...changes }), denied(400));
    assert.equal(calls.length, 0);
  }
  await fixture().service.save(member, null, { ...body, price: 0, condition: 1, type: 'propiedad' });
});
test('image size, base64, MIME and file signature checked', () => {
  assert.equal(validateImage(png).extension, 'png');
  const maximum = Buffer.alloc(5 * 1024 * 1024);
  Buffer.from([137,80,78,71,13,10,26,10]).copy(maximum);
  assert.equal(validateImage({ mimeType:'image/png',data:maximum.toString('base64') }).bytes.length, maximum.length);
  for (const photo of [{ ...png, data: 'AAAA' }, { ...png, data: '?' }, { ...png, mimeType: 'text/html' }, { ...png, data: 'A'.repeat(7_000_000) }, { mimeType: 'image/jpeg', data: png.data }]) assert.throws(() => validateImage(photo), denied(400));
});
test('definite database rejection cleans upload, ambiguous network failure keeps it', async () => {
  for (const [code, cleanup] of [['23514', true], [undefined, false]]) {
    const { service, calls } = fixture({ save: async () => { throw Object.assign(new Error('failed'), { code }); } });
    await assert.rejects(service.save(member, null, body));
    assert.equal(calls.some((c) => c[0] === 'remove'), cleanup);
  }
});
test('edit preserves current image without replacement, or cleans actual previous RPC path', async () => {
  const { service, calls } = fixture({ product: async () => row({ idVendedor: member.id }), save: async (...args) => { calls.push(['save', ...args]); return { id: 50, previousPhoto: '100/10/concurrent.png' }; } });
  const { photo, ...withoutPhoto } = body;
  await service.save(member, 50, withoutPhoto);
  assert.equal(calls.find((c) => c[0] === 'save')[3].fotoPath, undefined);
  assert.equal(calls.some((c) => c[0] === 'upload'), false);
  await service.save(member, 50, body);
  assert.deepEqual(calls.at(-1), ['remove', '100/10/concurrent.png']);
  await assert.rejects(fixture({ product:async () => row({ idVendedor:member.id,fotoPath:null }) }).service.save(member,50,withoutPhoto),denied(400));
  await fixture({ product:async () => row({ idVendedor:member.id,categoria:'Categoría anterior' }) }).service.save(member,50,{ ...withoutPhoto,category:'Categoría anterior' });
});
test('search, category, maximum and condition filters apply together; WhatsApp encoded', async () => {
  const { service } = fixture({ list: async () => [row(), row({ titulo: 'Libro', categoria: 'Libros', precio: 5 })] });
  const result = await service.list(member, 'public', { q: 'madera', category: 'Hogar', maxPrice: '20', condition: '2' });
  assert.equal(result.length, 1);
  assert.match(result[0].whatsappLink, /^https:\/\/wa.me\/5491100000000\?text=/);
  assert.match(decodeURIComponent(result[0].whatsappLink), /Hola, vi tu publicación 'Mesa'/);
  assert.equal((await service.list(member, 'public', { maxPrice: '0' })).length, 0);
  await assert.rejects(service.list(member, 'public', { maxPrice: 'Infinity' }), denied(400));
});
test('sold details hidden except for owner/admin; reservations exclude missing and no-longer-reserved products', async () => {
  await assert.rejects(fixture({ product: async () => row({ disponibilidad: 3 }) }).service.detail(member, 50), denied(404));
  assert.equal((await fixture({ product: async () => row({ disponibilidad: 3, idVendedor: member.id }) }).service.detail(member, 50)).availability, 3);
  const { service } = fixture({ reservations: async () => [{ id: 1, idProducto: 50 }, { id: 2, idProducto: 51 }], product: async (_m, id) => id === 50 ? row({ disponibilidad: 2 }) : null });
  assert.equal((await service.reservations(member)).length, 1);
});
test('repository constrains membership and every product read by selected community', async () => {
  const calls = [];
  const query = new Proxy({}, { get: (_t, name) => name === 'then' ? (resolve) => resolve({ data: [], error: null }) : (...args) => { calls.push([name, ...args]); return query; } });
  const repo = createMarketRepository({ from: (...args) => { calls.push(['from', ...args]); return query; } });
  await repo.membership(claims);
  for (const pair of [['id',10], ['idUsuario',1], ['idComunidad',100], ['aceptado',true]]) assert.ok(calls.some((c) => c[0] === 'eq' && c[1] === pair[0] && c[2] === pair[1]));
  for (const operation of [() => repo.list(member, 'public'), () => repo.list(member, 'mine'), () => repo.product(member, 50)]) {
    calls.length = 0; await operation();
    assert.ok(calls.some((c) => c[0] === 'select' && c[1].includes('!idVendedor!inner')));
    assert.ok(calls.some((c) => c[0] === 'eq' && c[1] === 'vendedor.idComunidad' && c[2] === 100));
    assert.ok(calls.some((c) => c[0] === 'eq' && c[1] === 'vendedor.aceptado' && c[2] === true));
    assert.ok(calls.some((c) => c[0] === 'is' && c[1] === 'eliminadoEn' && c[2] === null));
  }
  calls.length = 0; await repo.reservations(member);
  assert.ok(calls.some((c) => c[0] === 'eq' && c[1] === 'idComprador' && c[2] === 10));
  assert.ok(calls.some((c) => c[0] === 'eq' && c[1] === 'idComunidad' && c[2] === 100));
});
