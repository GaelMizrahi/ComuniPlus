export function createNewsRepository(db) {
  const result = async (query) => { const { data, error } = await query; if (error) throw error; return data; };
  const scoped = (member) => db.from('Noticia').select('id,titulo,texto,imagenPath,imagenUrl,fechaPublicacion,esDemo')
    .eq('idComunidad', member.idComunidad).is('eliminadoEn', null);
  return {
    isAdmin: async (member) => Boolean((await result(db.from('Administrador').select('id')
      .eq('idComunidadUsuario', member.id).eq('idComunidad', member.idComunidad).limit(1)))?.length),
    list: (member, page) => result(scoped(member).order('id', { ascending: false }).range(page * 20, page * 20 + 20)),
    detail: (member, id) => result(scoped(member).eq('id', id).maybeSingle()),
    save: (member, data, path) => result(db.rpc('publicarNoticiaClub', { p_id_actor: member.id, p_titulo: data.title, p_texto: data.text, p_imagen_path: path })),
    remove: (member, id) => result(db.rpc('eliminarNoticiaClub', { p_id_actor: member.id, p_id_noticia: id })),
    upload: async (path, bytes, mimeType) => { const { error } = await db.storage.from('noticias').upload(path, bytes, { contentType: mimeType, upsert: false }); if (error) throw error; },
    removeImage: async (path) => { const { error } = await db.storage.from('noticias').remove([path]); if (error) throw error; },
    signedImage: async (path) => (await result(db.storage.from('noticias').createSignedUrl(path, 300))).signedUrl
  };
}
