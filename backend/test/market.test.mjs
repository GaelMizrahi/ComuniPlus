import test from 'node:test';
import assert from 'node:assert/strict';
import { createMarketService, validateImage, positiveId, isMarketVisible, publicationDate } from '../src/services/market.service.js';
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
    list: async () => [row()], likes: async () => [], imageUrl: (p) => `https://images.invalid/${p}`,
    setLike: async (...args) => { calls.push(['like', ...args]); return { liked: args[2] }; },
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
test('cross-community detail, likes, edits and deletes are hidden', async () => {
  const { service, calls } = fixture({ product: async () => null });
  for (const operation of [() => service.detail(member, 99), () => service.setLike(member, 99, true), () => service.save(member, 99, body), () => service.manage(member, 99, 'eliminar')]) await assert.rejects(operation(), denied(404));
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
test('hidden, future, expired and sold products cannot be liked or viewed by non-owners', async () => {
  for (const values of [{ visible:false }, { publicarDesde:'2999-01-01T00:00:00Z' }, { publicarHasta:'2000-01-01T00:00:00Z' }, { disponibilidad:3 }]) {
    const { service, calls } = fixture({ product: async () => row(values) });
    await assert.rejects(service.setLike(member, 50, true), denied(404));
    await assert.rejects(service.detail(member, 50), denied(404));
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
  await service.setLike(member, 50, true);
  assert.deepEqual(calls.at(-1), ['like', member, 50, true]);
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
  for (const [code, cleanup] of [['23514', true], ['PGRST202', true], [undefined, false]]) {
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
test('owners retain private details; Mis likes excludes hidden, future and sold products', async () => {
  await assert.rejects(fixture({ product: async () => row({ disponibilidad: 3 }) }).service.detail(member, 50), denied(404));
  assert.equal((await fixture({ product: async () => row({ disponibilidad: 3, idVendedor: member.id }) }).service.detail(member, 50)).availability, 3);
  const { service } = fixture({ likes: async () => [{ idProducto:50 },{ idProducto:51 },{ idProducto:52 },{ idProducto:53 }], list: async () => [row(),row({ id:51,visible:false }),row({ id:52,publicarDesde:'2999-01-01T00:00:00Z' }),row({ id:53,disponibilidad:3 }),row({ id:54 })] });
  const likes = await service.list(member, 'likes');
  assert.deepEqual(likes.map((item) => item.id),[50]);
  assert.equal(likes[0].liked,true);
  assert.equal((await service.list(member, 'mine')).length,5);
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
  calls.length = 0; await repo.likes(member);
  assert.ok(calls.some((c) => c[0] === 'from' && c[1] === 'ProductoLike'));
  assert.ok(calls.some((c) => c[0] === 'eq' && c[1] === 'idComunidadUsuario' && c[2] === 10));
  calls.length=0; await repo.list(member,'public');
  assert.ok(calls.some((c) => c[0]==='eq' && c[1]==='visible' && c[2]===true));
  assert.equal(calls.filter((c) => c[0]==='or').length,2);
});

test('effective visibility supports all optional-date combinations and exact boundaries', () => {
  const now=Date.parse('2026-10-23T15:00:00Z');
  const cases=[
    [{},true], [{visible:false},false],
    [{publicarDesde:'2026-10-23T15:00:00Z'},true],
    [{publicarDesde:'2026-10-23T15:00:00.001Z'},false],
    [{publicarHasta:'2026-10-23T15:00:00Z'},false],
    [{publicarHasta:'2026-10-23T15:00:00.001Z'},true],
    [{publicarDesde:'2026-10-23T14:00:00Z',publicarHasta:'2026-10-23T16:00:00Z'},true],
    [{visible:false,publicarDesde:'2026-10-23T14:00:00Z',publicarHasta:'2026-10-23T16:00:00Z'},false]
  ];
  for(const [changes,expected] of cases) assert.equal(isMarketVisible(row(changes),now),expected);
});
test('schedule dates are optional, validated and converted from timezone offsets to UTC', async () => {
  assert.equal(publicationDate('2026-10-23T12:00:00-03:00'),'2026-10-23T15:00:00.000Z');
  assert.equal(publicationDate('2026-10-23T12:00:00.123456-03:00'),'2026-10-23T15:00:00.123Z');
  assert.equal(publicationDate(''),null); assert.equal(publicationDate(null),null);
  for(const value of ['2026-02-30T12:00:00Z','2026-13-01T12:00:00Z','2026-10-23T25:00:00Z','2026-10-23T12:00',true]) assert.throws(()=>publicationDate(value),denied(400));
  for(const changes of [{visible:'false'},{publishFrom:'2026-10-24T12:00:00Z',publishUntil:'2026-10-23T12:00:00Z'},{publishFrom:'2026-10-24T12:00:00Z',publishUntil:'2026-10-24T12:00:00Z'}]) {
    const {service,calls}=fixture();
    await assert.rejects(service.save(member,null,{...body,...changes}),denied(400)); assert.equal(calls.length,0);
  }
  for(const dates of [{publishFrom:null,publishUntil:null},{publishFrom:'2026-10-23T12:00:00-03:00'},{publishUntil:'2026-10-23T12:00:00-03:00'}]) {
    const {service,calls}=fixture(); await service.save(member,null,{...body,visible:false,...dates});
    const data=calls.find((c)=>c[0]==='save')[3]; assert.equal(data.visible,false);
  }
});
test('likes can be removed idempotently after hiding; body must supply an explicit boolean', async () => {
  const {service,calls}=fixture({product:async()=>null});
  assert.deepEqual(await service.setLike(member,50,false),{liked:false});
  assert.deepEqual(calls.at(-1),['like',member,50,false]);
  await assert.rejects(service.setLike(member,50,'false'),denied(400));
});
test('editing without schedule fields preserves them, while null clears either bound', async () => {
  const previous=row({idVendedor:member.id,visible:false,publicarDesde:'2026-10-23T15:00:00Z',publicarHasta:'2026-10-24T15:00:00Z'});
  const {service,calls}=fixture({product:async()=>previous});
  const {photo,...edit}=body;
  await service.save(member,50,edit);
  let data=calls.find((c)=>c[0]==='save')[3];
  assert.equal(data.visible,false); assert.equal(data.publicarDesde,'2026-10-23T15:00:00.000Z');
  calls.length=0;
  await service.save(member,50,{...edit,publishFrom:null,publishUntil:null});
  data=calls.find((c)=>c[0]==='save')[3]; assert.equal(data.publicarDesde,null); assert.equal(data.publicarHasta,null);
});
