import jwt from 'jsonwebtoken';
import { jwtSecret } from '../config/index.js';
import { findUserByEmail, getAcceptedMembershipByUserId, findCommunityById } from '../repositories/user.repository.js';
import { getFullName } from '../utils/helpers.js';

export async function login(email, password) {
  if (!email || !password) {
    const err = new Error('Ingresá mail y contraseña');
    err.statusCode = 400;
    throw err;
  }

  const user = await findUserByEmail(email);
  if (!user || String(user.contraseña ?? '').trim() !== password) {
    const err = new Error('Credenciales inválidas');
    err.statusCode = 401;
    throw err;
  }

  const membership = await getAcceptedMembershipByUserId(user.id);

  const community = await findCommunityById(membership.idComunidad);
  if (!community) {
    const err = new Error('Comunidad no encontrada');
    err.statusCode = 404;
    throw err;
  }

  const tokenPayload = {
    idUsuario: user.id,
    mail: user.mail,
    nombre: user.nombre,
    apellido: user.apellido,
    telefono: user.telefono,
    idComunidad: membership.idComunidad,
    idComunidadUsuario: membership.id,
    nroSocio: membership.nroSocio
  };

  const token = jwt.sign(tokenPayload, jwtSecret, { expiresIn: '1h' });

  return {
    ok: true,
    message: 'Login correcto',
    token,
    user: {
      id: user.id,
      idUsuario: user.id,
      nombre: user.nombre,
      apellido: user.apellido,
      mail: user.mail,
      email: user.mail,
      telefono: user.telefono,
      fullName: getFullName(user),
      idComunidad: membership.idComunidad,
      communityId: membership.idComunidad,
      idComunidadUsuario: membership.id,
      comunidadUsuarioId: membership.id,
      nroSocio: membership.nroSocio,
      community: community.nombre
    }
  };
}
