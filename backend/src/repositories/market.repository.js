// All reads are scoped through Producto.idVendedor -> ComunidadUsuario.
// Writes go through service_role-only RPCs that repeat authorization under a lock.
export function createMarketRepository(db) {
  const result = async (query) => {
    const { data, error } = await query;
    if (error) throw error;
    return data;
  };
  const products = () => db.from('Producto').select(
    '*, vendedor:ComunidadUsuario!idVendedor!inner(id, idUsuario, idComunidad, aceptado, usuario:Usuario!idUsuario(id, nombre, apellido, telefono))'
  );
  const scoped = (communityId) => products()
    .eq('vendedor.idComunidad', communityId).eq('vendedor.aceptado', true).is('eliminadoEn', null);

  return {
    membership: (claims) => result(db.from('ComunidadUsuario').select('id, idUsuario, idComunidad, aceptado')
      .eq('id', claims.idComunidadUsuario).eq('idUsuario', claims.idUsuario)
      .eq('idComunidad', claims.idComunidad).eq('aceptado', true).maybeSingle()),
    community: (id) => result(db.from('Comunidad').select('id, tipo').eq('id', id).single()),
    isAdmin: async (member) => Boolean((await result(db.from('Administrador').select('id')
      .eq('idComunidadUsuario', member.id).eq('idComunidad', member.idComunidad).limit(1)))?.length),
    list: async (member, mode) => {
      let query = scoped(member.idComunidad).order('fechaDeAlta', { ascending: false }).order('id', { ascending: false });
      if (mode === 'mine') query = query.eq('idVendedor', member.id);
      else query = query.neq('disponibilidad', 3);
      // Fetch every page before applying title/description filters in the service.
      const rows = [];
      for (let offset = 0; ; offset += 500) {
        const page = await result(query.range(offset, offset + 499));
        rows.push(...page);
        if (page.length < 500) return rows;
      }
    },
    product: (member, id) => result(scoped(member.idComunidad).eq('id', id).maybeSingle()),
    reservations: (member) => result(db.from('Venta').select('id, idProducto, fecha, estado')
      .eq('idComprador', member.id).eq('idComunidad', member.idComunidad).eq('estado', 1).order('id', { ascending: false })),
    save: (member, id, data) => result(db.rpc('guardarProductoMercado', {
      p_id_producto: id, p_id_actor: member.id, p_datos: data
    })),
    reserve: (member, id) => result(db.rpc('reservarProductoMercado', { p_id_producto: id, p_id_comprador: member.id })),
    manage: (member, id, action) => result(db.rpc('gestionarProductoMercado', {
      p_id_producto: id, p_id_actor: member.id, p_accion: action
    })),
    upload: async (path, bytes, contentType) => {
      const { error } = await db.storage.from('mercado').upload(path, bytes, { contentType, upsert: false });
      if (error) throw error;
    },
    removeImage: async (path) => {
      const { error } = await db.storage.from('mercado').remove([path]);
      if (error) throw error;
    },
    imageUrl: (path) => path ? db.storage.from('mercado').getPublicUrl(path).data.publicUrl : null
  };
}
