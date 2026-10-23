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

export function isMarketVisible(row, now = Date.now()) {
  return row.visible !== false && !row.eliminadoEn && Number(row.disponibilidad) !== 3 &&
    (!row.publicarDesde || Date.parse(row.publicarDesde) <= now) &&
    (!row.publicarHasta || Date.parse(row.publicarHasta) > now);
}

export function publicationDate(value) {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value !== 'string' || value.length > 40) fail(400, 'Fecha de publicación inválida');
  const match = /^(\d{4})-(\d{2})-(\d{2})T(?:[01]\d|2[0-3]):[0-5]\d(?::[0-5]\d(?:\.\d{1,6})?)?(?:Z|[+-](?:0\d|1[0-4]):[0-5]\d)$/.exec(value);
  if (!match) fail(400, 'Las fechas deben incluir fecha, hora y zona horaria');
  const [, year, month, day] = match.map(Number);
  const leap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  const days = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  if (month < 1 || month > 12 || day < 1 || day > days[month - 1] || !Number.isFinite(Date.parse(value))) fail(400, 'Fecha de publicación inválida');
  return new Date(value).toISOString();
}

export function createMarketService(repo, { now = () => Date.now() } = {}) {
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
  const likedIds = async (member) => new Set((await repo.likes(member)).map((like) => Number(like.idProducto)));
  const shape = (row, member, admin = false, likes = new Set()) => {
    const seller = row.vendedor?.usuario;
    const title = row.titulo;
    const owner = Number(row.idVendedor) === Number(member.id);
    const published = isMarketVisible(row, now());
    return {
      id: row.id, title, description: row.descripcion, price: Number(row.precio), category: row.categoria,
      condition: Number(row.estado), type: row.tipo, availability: Number(row.disponibilidad),
      image: repo.imageUrl(row.fotoPath), createdAt: row.fechaDeAlta,
      visible: row.visible ?? true, publishFrom: row.publicarDesde ?? null, publishUntil: row.publicarHasta ?? null,
      isPublished: published, liked: likes.has(Number(row.id)), canLike: published,
      sellerName: getFullName(seller), sellerPhone: seller?.telefono ?? '',
      whatsappLink: buildWhatsAppLink(seller?.telefono, `Hola, vi tu publicación '${title}' en Comuni+ y estoy interesado/a.`),
      isOwner: owner, canDelete: owner || admin
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
      const rows = await repo.list(member, mode === 'mine' ? 'mine' : 'public');
      const likes = await likedIds(member);
      return rows.filter((row) => (mode === 'mine' || isMarketVisible(row, now())) &&
        (mode !== 'likes' || likes.has(Number(row.id))))
        .map((row) => shape(row, member, isAdmin, likes)).filter((row) =>
        (!search || `${row.title} ${row.description}`.toLocaleLowerCase('es').includes(search)) &&
        (!filters.category || row.category === filters.category) && row.price <= maximum &&
        (!filters.condition || row.condition === Number(filters.condition)));
    },
    detail: async (member, id) => {
      const row = await product(member, id);
      const admin = await repo.isAdmin(member);
      if (!isMarketVisible(row, now()) && Number(row.idVendedor) !== Number(member.id)) fail(404, 'Publicación no encontrada');
      return shape(row, member, admin, await likedIds(member));
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
      data.visible = body.visible === undefined ? previous?.visible ?? true : body.visible;
      if (typeof data.visible !== 'boolean') fail(400, 'La visibilidad debe ser Visible u Oculta');
      data.publicarDesde = publicationDate(body.publishFrom === undefined ? previous?.publicarDesde : body.publishFrom);
      data.publicarHasta = publicationDate(body.publishUntil === undefined ? previous?.publicarHasta : body.publishUntil);
      if (data.publicarDesde && data.publicarHasta && data.publicarDesde >= data.publicarHasta) fail(400, 'Hasta debe ser posterior a Desde');
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
    setLike: async (member, id, liked) => {
      const parsedId = positiveId(id);
      if (typeof liked !== 'boolean') fail(400, 'Indicá si querés poner o quitar el like');
      if (liked && !isMarketVisible(await product(member, parsedId), now())) fail(404, 'Publicación no encontrada');
      return repo.setLike(member, parsedId, liked);
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
