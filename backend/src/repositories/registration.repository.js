export function createRegistrationRepository(db) {
  const result = async (query) => {
    const { data, error } = await query;
    if (error) throw error;
    return data;
  };
  return {
    communities: () => result(db.from('Comunidad').select('id,nombre,tipo').order('nombre')),
    community: (id) => result(db.from('Comunidad').select('id,nombre').eq('id', id).maybeSingle()),
    userByEmail: (email) => result(db.from('Usuario').select('id,nombre,apellido,mail,telefono,contraseña').eq('mailNormalizado', email).maybeSingle()),
    userById: (id) => result(db.from('Usuario').select('id,nombre,apellido,mail,telefono').eq('id', id).maybeSingle()),
    memberships: (id) => result(db.from('ComunidadUsuario').select('id,idUsuario,idComunidad,aceptado,rechazado,nroSocio,foto').eq('idUsuario', id).order('id')),
    membership: (claims) => result(db.from('ComunidadUsuario').select('id,idUsuario,idComunidad,aceptado')
      .eq('id', claims.idComunidadUsuario).eq('idUsuario', claims.idUsuario).eq('idComunidad', claims.idComunidad).eq('aceptado', true).maybeSingle()),
    isAdmin: async (member) => Boolean((await result(db.from('Administrador').select('id')
      .eq('idComunidadUsuario', member.id).eq('idComunidad', member.idComunidad).limit(1)))?.length),
    register: (data) => result(db.rpc('registrarUsuarioComuni', {
      p_nombre: data.firstName, p_apellido: data.lastName, p_mail: data.email, p_telefono: data.phone,
      p_hash: data.passwordHash, p_id_comunidad: data.communityId, p_nro_socio: data.membershipNumber
    })),
    upgradePassword: (id, previous, passwordHash) => result(db.rpc('actualizarClaveLegacyComuni', {
      p_id_usuario: id, p_anterior: previous, p_hash: passwordHash
    })),
    pending: async (member) => {
      const all = [];
      for (let offset = 0; ; offset += 200) {
        const page = await result(db.from('ComunidadUsuario').select('id,nroSocio,fechaSolicitud,usuario:Usuario!idUsuario(id,nombre,apellido,mail,telefono)')
          .eq('idComunidad', member.idComunidad).eq('aceptado', false).eq('rechazado', false)
          .order('fechaSolicitud').order('id').range(offset, offset + 199));
        all.push(...page); if (page.length < 200) return all;
      }
    },
    decide: (member, id, approve) => result(db.rpc('resolverSolicitudComuni', {
      p_id_actor: member.id, p_id_solicitud: id, p_aprobar: approve
    }))
  };
}
