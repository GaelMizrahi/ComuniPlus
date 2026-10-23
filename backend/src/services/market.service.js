import { randomUUID } from 'node:crypto';
import { getFullName, buildWhatsAppLink } from '../utils/helpers.js';

export const CATEGORIES = {
  escuela: ['Útiles', 'Uniformes', 'Libros', 'Tecnología', 'Otros'],
  country: ['Hogar', 'Deportes', 'Tecnología', 'Vehículos', 'Propiedades', 'Otros'],
  otro: ['Hogar', 'Deportes', 'Tecnología', 'Ropa', 'Libros', 'Propiedades', 'Otros']
};
export function fail(statusCode, message) {
  throw Object.assign(new Error(message), { statusCode });
}
export function positiveId(value) {
  const text = String(value ?? '');
  if (!/^[1-9]\d*$/.test(text) || !Number.isSafeInteger(Number(text))) fail(400, 'Identificador inválido');
  return Number(text);
}

export function validateImage(photo) {
  if (!photo || typeof photo !== 'object' || Array.isArray(photo)) fail(400, 'Se requiere una única foto');
  const { mimeType, data } = photo;
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(mimeType) || typeof data !== 'string' ||
      data.length > Math.ceil(5 * 1024 * 1024 / 3) * 4 || data.length % 4 !== 0 || !/^[A-Za-z0-9+/]*={0,2}$/.test(data)) {
    fail(400, 'La foto debe ser JPEG, PNG o WebP de hasta 5 MB');
  }
  const bytes = Buffer.from(data, 'base64');
  const png = bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  const jpeg = bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255;
  const webp = bytes.toString('ascii', 0, 4) === 'RIFF' && bytes.toString('ascii', 8, 12) === 'WEBP';
  if (!bytes.length || bytes.length > 5 * 1024 * 1024 || bytes.toString('base64') !== data ||
      !(mimeType === 'image/png' ? png : mimeType === 'image/jpeg' ? jpeg : webp)) fail(400, 'Contenido de imagen inválido');
  return { bytes, mimeType, extension: { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' }[mimeType] };
}

export function createMarketService(repo) {
  const authorize = async (claims) => {
    positiveId(claims?.idUsuario); positiveId(claims?.idComunidad); positiveId(claims?.idComunidadUsuario);
    const member = await repo.membership(claims);
    if (!member) fail(403, 'Tu membresía en esta comunidad no está activa');
    return member;
  };
  const config = async (member) => {
    const community = await repo.community(member.idComunidad);
    return { categories: CATEGORIES[community.tipo] ?? CATEGORIES.otro, isAdmin: await repo.isAdmin(member) };
  };
  const shape = (row, member, admin = false) => {
    const seller = row.vendedor?.usuario;
    const title = row.titulo;
    const owner = Number(row.idVendedor) === Number(member.id);
    return {
      id: row.id, title, description: row.descripcion, price: Number(row.precio), category: row.categoria,
      condition: Number(row.estado), type: row.tipo, availability: Number(row.disponibilidad),
      image: repo.imageUrl(row.fotoPath), createdAt: row.fechaDeAlta,
      sellerName: getFullName(seller), sellerPhone: seller?.telefono ?? '',
      whatsappLink: buildWhatsAppLink(seller?.telefono, `Hola, vi tu publicación '${title}' en Comuni+ y estoy interesado/a.`),
      isOwner: owner, canDelete: owner || admin, canReserve: !owner && Number(row.disponibilidad) === 1
    };
  };
  const product = async (member, id) => {
    const row = await repo.product(member, positiveId(id));
    if (!row) fail(404, 'Publicación no encontrada');
    return row;
  };
  const cleanImage = async (path, member) => {
    // Never remove arbitrary pre-existing paths. New paths are exclusively backend-generated.
    if (!path?.startsWith(`${member.idComunidad}/`)) return;
    try { await repo.removeImage(path); } catch { console.warn('Mercado: pendiente limpieza de una imagen de Storage'); }
  };
  return {
    authorize,
    config,
    list: async (member, mode, filters = {}) => {
      const { isAdmin } = await config(member);
      const search = String(filters.q ?? '').trim().toLocaleLowerCase('es');
      if (search.length > 150) fail(400, 'La búsqueda es demasiado larga');
      const maximum = filters.maxPrice === undefined || filters.maxPrice === '' ? Infinity : Number(filters.maxPrice);
      if ((filters.maxPrice !== undefined && filters.maxPrice !== '' && !Number.isFinite(maximum)) || maximum < 0) fail(400, 'Precio máximo inválido');
      if (filters.condition && !['1', '2'].includes(String(filters.condition))) fail(400, 'Condición inválida');
      const rows = await repo.list(member, mode);
      return rows.map((row) => shape(row, member, isAdmin)).filter((row) =>
        (!search || `${row.title} ${row.description}`.toLocaleLowerCase('es').includes(search)) &&
        (!filters.category || row.category === filters.category) && row.price <= maximum &&
        (!filters.condition || row.condition === Number(filters.condition)));
    },
    detail: async (member, id) => {
      const row = await product(member, id);
      const admin = await repo.isAdmin(member);
      if (Number(row.disponibilidad) === 3 && Number(row.idVendedor) !== Number(member.id) && !admin) fail(404, 'Publicación no encontrada');
      return shape(row, member, admin);
    },
    reservations: async (member) => {
      const reservations = await repo.reservations(member);
      const items = await Promise.all(reservations.map(async (reservation) => {
        const row = await repo.product(member, reservation.idProducto);
        return row && Number(row.disponibilidad) === 2 ? { ...shape(row, member), reservationId: reservation.id } : null;
      }));
      return items.filter(Boolean);
    },
    save: async (member, id, body) => {
      if (!body || typeof body !== 'object' || Array.isArray(body)) fail(400, 'Publicación inválida');
      const previous = id ? await product(member, id) : null;
      if (previous && Number(previous.idVendedor) !== Number(member.id)) fail(403, 'Solo el vendedor puede editar');
      if (previous && Number(previous.disponibilidad) === 3) fail(409, 'Una publicación vendida no se puede editar');
      const { categories } = await config(member);
      const text = (value, name, limit) => {
        if (typeof value !== 'string' || !value.trim() || value.trim().length > limit) fail(400, `${name} inválido`);
        return value.trim();
      };
      const data = {
        titulo: text(body.title, 'Título', 120), descripcion: text(body.description, 'Descripción', 4000),
        categoria: text(body.category, 'Categoría', 80), precio: body.price, estado: Number(body.condition), tipo: body.type
      };
      if ((typeof body.price !== 'number' && typeof body.price !== 'string') || String(body.price).trim() === '' ||
          !Number.isFinite(Number(body.price)) || Number(body.price) < 0 || Number(body.price) > 999999999999.99) fail(400, 'Precio inválido');
      data.precio = Number(body.price);
      if (Math.abs(data.precio * 100 - Math.round(data.precio * 100)) > 0.01) fail(400, 'El precio admite hasta dos decimales');
      if ((!categories.includes(data.categoria) && data.categoria !== previous?.categoria) || ![1, 2, '1', '2'].includes(body.condition) || !['producto', 'propiedad'].includes(data.tipo)) fail(400, 'Categoría, condición o tipo inválido');
      if (!previous?.fotoPath && !body.photo) fail(400, 'La foto es obligatoria');
      let uploaded;
      if (body.photo !== undefined) {
        const image = validateImage(body.photo);
        uploaded = `${member.idComunidad}/${member.id}/${randomUUID()}.${image.extension}`;
        await repo.upload(uploaded, image.bytes, image.mimeType);
        data.fotoPath = uploaded;
      }
      try {
        const savedId = await repo.save(member, previous?.id ?? null, data);
        // A concurrent edit may have changed the old photo. The RPC returns the
        // actual previous path while holding the product lock, for safe cleanup.
        if (uploaded && savedId.previousPhoto && savedId.previousPhoto !== uploaded) await cleanImage(savedId.previousPhoto, member);
        return { id: savedId.id };
      } catch (error) {
        // On a lost response the transaction may already have committed. Only
        // delete the upload when PostgreSQL explicitly rejected the mutation.
        if (uploaded && (/^(22|23|42|P0)/.test(error.code ?? '') || ['PGRST202','PGRST204'].includes(error.code))) await cleanImage(uploaded, member);
        throw error;
      }
    },
    reserve: async (member, id) => {
      const row = await product(member, id);
      if (Number(row.idVendedor) === Number(member.id)) fail(409, 'No podés reservar tu propia publicación');
      if (Number(row.disponibilidad) !== 1) fail(409, 'La publicación no está disponible');
      return repo.reserve(member, row.id);
    },
    manage: async (member, id, action) => {
      // Scoped read prevents revealing existence of a product in another community.
      const row = await product(member, id);
      const owner = Number(row.idVendedor) === Number(member.id);
      if (!owner && (action !== 'eliminar' || !(await repo.isAdmin(member)))) fail(403, 'No tenés permiso para esta acción');
      const result = await repo.manage(member, row.id, action);
      if (action === 'eliminar') await cleanImage(result.previousPhoto, member);
      return { ok: true };
    }
  };
}
