import { randomUUID } from 'node:crypto';
import { positiveId, notFound } from '../utils/community.js';
import { validateImage } from './market.service.js';

const fail = (statusCode, message) => { throw Object.assign(new Error(message), { statusCode }); };
export function newsData(body) {
  const title = typeof body?.title === 'string' ? body.title.trim() : '';
  const text = typeof body?.text === 'string' ? body.text.trim() : '';
  if (title.length < 5 || title.length > 140) fail(400, 'El título debe tener entre 5 y 140 caracteres');
  if (text.length < 20 || text.length > 8000) fail(400, 'El texto debe tener entre 20 y 8000 caracteres');
  return { title, text, image: validateImage(body.photo) };
}
export function createNewsService(repo) {
  const admin = async (member) => { if (!(await repo.isAdmin(member))) fail(403, 'Solo un administrador de este club puede publicar o eliminar noticias'); };
  const shape = async (row) => ({ id: row.id, title: row.titulo, text: row.texto,
    image: row.imagenPath ? await repo.signedImage(row.imagenPath) : row.imagenUrl,
    publishedAt: row.fechaPublicacion, isDemo: row.esDemo });
  const clean = async (member, path) => {
    if (!path?.startsWith(`${member.idComunidad}/`)) return;
    try { await repo.removeImage(path); } catch { console.warn('[Noticias] Quedó una imagen pendiente de limpieza'); }
  };
  return {
    list: async (member, rawPage = '0') => {
      if (!/^\d{1,5}$/.test(String(rawPage))) fail(400, 'Página inválida');
      const page = Number(rawPage);
      const [rows, canPublish] = await Promise.all([repo.list(member, page), repo.isAdmin(member)]);
      return { items: await Promise.all(rows.slice(0, 20).map(shape)), hasMore: rows.length > 20, canPublish };
    },
    detail: async (member, id) => {
      const row = await repo.detail(member, positiveId(id));
      if (!row) notFound('Noticia no encontrada');
      return { item: await shape(row), canPublish: await repo.isAdmin(member) };
    },
    publish: async (member, body) => {
      await admin(member);
      const data = newsData(body);
      const path = `${member.idComunidad}/${member.id}/${randomUUID()}.${data.image.extension}`;
      await repo.upload(path, data.image.bytes, data.image.mimeType);
      let saved;
      try { saved = await repo.save(member, data, path); }
      catch (error) {
        // Network loss can follow a committed transaction; preserve such images.
        if (['42501','23503','23514','22023','PGRST202'].includes(error.code)) await clean(member, path);
        throw error;
      }
      return { id: saved.id, message: 'Noticia publicada' };
    },
    remove: async (member, id) => {
      await admin(member);
      const result = await repo.remove(member, positiveId(id));
      await clean(member, result.imagenPath);
      return { ok: true };
    }
  };
}
